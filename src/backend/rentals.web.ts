// ═══════════════════════════════════════════════════════════════
// BACKEND WEB METHODS — rentals.web.ts
// Wix web module: functions callable from frontend pages via:
//   import { getRentalItems, createRentalBooking } from '../../backend/rentals.web';
// ═══════════════════════════════════════════════════════════════
//
// REQUIRED ONE-TIME SETUP IN WIX DASHBOARD before full functionality:
//
// 1. CMS Collection "RentalItems"
//    CMS → + New Collection → ID: "RentalItems"
//    Add fields from src/dashboard/pages/schema.ts
//
// 2. Triggered Email template (for confirmation emails)
//    CRM → Triggered Emails → + New Template → ID: "rentalConfirmation"
//    Template variables: firstName, confirmationRef, eventStart,
//    eventEnd, location, totalPrice, itemList, rentalDays
//
// 3. Wix Bookings service (optional — for Bookings calendar integration)
//    Bookings → Services → + New Service → Name: "Event Rental Quote"
//    Set to Manual Confirmation. If not set up, bookings are still
//    stored in CMS and the function returns a warning (not an error).
//
// ═══════════════════════════════════════════════════════════════

import { webMethod, Permissions } from 'wix-web-module';
import wixData from 'wix-data';
import type { RentalItem } from '../dashboard/pages/schema';

// ── ID of the triggered email template in Wix CRM
const CONFIRMATION_EMAIL_TEMPLATE = 'rentalConfirmation';

// ── Types ──────────────────────────────────────────────────────

export interface SelectedItem {
  itemId: string;
  name: string;
  qty: number;
  pricePerDay: number;
}

export interface BookingFormData {
  customerName: string;
  email: string;
  phone: string;
  /** ISO date string YYYY-MM-DD */
  eventStart: string;
  /** ISO date string YYYY-MM-DD */
  eventEnd: string;
  location: string;
  selectedItems: SelectedItem[];
  totalPrice: number;
}

export interface BookingResult {
  bookingId: string;
  orderId: string | null;
  emailSent: boolean;
  confirmationRef: string;
  warnings: string[];
}

// ── Helpers ────────────────────────────────────────────────────

function generateRef(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

function countDays(start: string, end: string): number {
  const s = new Date(start).getTime();
  const e = new Date(end).getTime();
  return Math.max(1, Math.ceil((e - s) / 86400000) + 1);
}

// ── Web Methods ────────────────────────────────────────────────

/**
 * Returns all available rental items sorted by category ascending.
 * Called from the customer quote form (Step 3).
 */
export const getRentalItems = webMethod(
  Permissions.Anyone,
  async (): Promise<RentalItem[]> => {
    const result = await wixData
      .query('RentalItems')
      .eq('available', true)
      .ascending('category')
      .limit(100)
      .find({ suppressAuth: true });
    return result.items as RentalItem[];
  }
);

/**
 * Creates a rental booking from the quote form submission.
 *
 * Step 1 — Saves a record to the RentalBookings CMS collection (always runs).
 *           This is the canonical record; a bookingId is always returned.
 * Step 2 — Creates a Wix Booking (requires "Event Rental Quote" service).
 * Step 3 — Creates a Wix eCommerce order (requires eCommerce to be enabled).
 * Step 4 — Sends a triggered confirmation email via Wix CRM.
 *
 * Steps 2–4 are each wrapped in try/catch. Partial failures are surfaced
 * in the `warnings` array rather than throwing, so the customer always
 * receives a confirmation reference number.
 */
export const createRentalBooking = webMethod(
  Permissions.Anyone,
  async (formData: BookingFormData): Promise<BookingResult> => {
    const warnings: string[] = [];
    const confirmationRef = 'GRD-' + generateRef();
    const days = countDays(formData.eventStart, formData.eventEnd);

    const itemList = formData.selectedItems
      .map(i => `${i.name} ×${i.qty} @ $${i.pricePerDay}/day`)
      .join(', ');

    // ── Step 1: CMS record — source of truth ──────────────────
    const bookingRecord = await wixData.insert('RentalBookings', {
      customerName:  formData.customerName,
      email:         formData.email,
      phone:         formData.phone,
      eventStart:    new Date(formData.eventStart),
      eventEnd:      new Date(formData.eventEnd),
      rentalDays:    days,
      location:      formData.location,
      selectedItems: JSON.stringify(formData.selectedItems),
      itemList,
      totalPrice:    formData.totalPrice,
      status:        'pending',
      confirmationRef,
      submittedAt:   new Date(),
    });

    let orderId: string | null = null;
    let emailSent = false;

    // ── Step 2: Wix Booking (optional) ───────────────────────
    try {
      const { bookings } = await import('wix-bookings-backend');

      // Look up the "Event Rental Quote" service
      const servicesResult = await wixData
        .query('Services')
        .eq('name', 'Event Rental Quote')
        .limit(1)
        .find({ suppressAuth: true });

      if (servicesResult.items.length > 0) {
        const serviceId = servicesResult.items[0]._id as string;
        const [firstName, ...lastParts] = formData.customerName.split(' ');
        await (bookings as any).createBooking({
          serviceId,
          startDateTime: new Date(formData.eventStart),
          endDateTime:   new Date(formData.eventEnd),
          contactDetails: {
            firstName,
            lastName: lastParts.join(' ') || '',
            email:    formData.email,
            phone:    formData.phone,
          },
          formFields: [
            { fieldId: 'location',   value: formData.location },
            { fieldId: 'itemList',   value: itemList },
            { fieldId: 'totalPrice', value: `$${formData.totalPrice.toFixed(2)}` },
          ],
        });
      } else {
        warnings.push(
          'Wix Booking skipped: "Event Rental Quote" service not found. ' +
          'Create it in Wix Dashboard → Bookings → Services.'
        );
      }
    } catch (e: any) {
      warnings.push(`Wix Booking creation skipped: ${e?.message ?? 'unknown error'}`);
    }

    // ── Step 3: eCommerce order (optional) ────────────────────
    try {
      const { orders } = await import('wix-ecom-backend');
      const orderResult = await (orders as any).createOrder({
        order: {
          buyerInfo: { email: formData.email },
          lineItems: formData.selectedItems.map(item => ({
            productName: { original: item.name },
            quantity: item.qty,
            price: {
              amount: String((item.pricePerDay * item.qty * days).toFixed(2)),
              formattedAmount: `$${(item.pricePerDay * item.qty * days).toFixed(2)}`,
            },
          })),
          priceSummary: {
            subtotal: {
              amount: formData.totalPrice.toFixed(2),
              formattedAmount: `$${formData.totalPrice.toFixed(2)}`,
            },
            total: {
              amount: formData.totalPrice.toFixed(2),
              formattedAmount: `$${formData.totalPrice.toFixed(2)}`,
            },
          },
        },
      });
      orderId = orderResult?.order?._id ?? null;
    } catch (e: any) {
      warnings.push(`eCommerce order creation skipped: ${e?.message ?? 'unknown error'}`);
    }

    // ── Step 4: Triggered confirmation email (optional) ───────
    try {
      const { triggeredEmails, contacts } = await import('wix-crm-backend');

      // Find or create CRM contact by email address
      let contactId: string;
      const contactsResult = await (contacts as any)
        .queryContacts()
        .eq('info.emails.email', formData.email)
        .limit(1)
        .find();

      if (contactsResult?.items?.length > 0) {
        contactId = contactsResult.items[0]._id;
      } else {
        const [firstName, ...lastParts] = formData.customerName.split(' ');
        const newContact = await (contacts as any).createContact({
          info: {
            name:   { first: firstName, last: lastParts.join(' ') || '' },
            emails: [{ email: formData.email }],
            phones: formData.phone ? [{ phone: formData.phone }] : [],
          },
        });
        contactId = newContact._id;
      }

      await (triggeredEmails as any).emailContact(
        CONFIRMATION_EMAIL_TEMPLATE,
        contactId,
        {
          variables: {
            firstName:       formData.customerName.split(' ')[0],
            confirmationRef,
            eventStart:      formData.eventStart,
            eventEnd:        formData.eventEnd,
            location:        formData.location,
            totalPrice:      `$${formData.totalPrice.toFixed(2)}`,
            itemList,
            rentalDays:      String(days),
          },
        }
      );
      emailSent = true;
    } catch (e: any) {
      warnings.push(`Confirmation email skipped: ${e?.message ?? 'unknown error'}`);
    }

    return {
      bookingId: bookingRecord._id as string,
      orderId,
      emailSent,
      confirmationRef,
      warnings,
    };
  }
);
