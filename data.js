// ═══════════════════════════════════════════════════════════════
// VELO BACKEND — data.js
// Place at: Backend > data.js
// This fires automatically whenever you add/update a RentalCatalog item.
// It auto-creates a Wix Bookings service for every new rental item.
// ═══════════════════════════════════════════════════════════════

import wixData from 'wix-data';
import { getSecret } from 'wix-secrets-backend';

// ── Fires automatically AFTER a new rental item is added to the CMS
export async function RentalCatalog_afterInsert(item, context) {
  // Skip if a booking service is already linked
  if (item.bookingServiceId) return item;

  try {
    const apiKey = await getSecret('RENTAL_API_KEY');
    const siteId = '790788cd-d7a3-4a0f-8a8a-73630a12e2a0';

    // Build a URL-safe slug from the item title
    const slug = (item.title || 'rental')
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .slice(0, 40);

    const price    = String(item.pricePerDay   || 100);
    const deposit  = String(item.depositAmount || 50);
    const hasDeposit = !!item.depositAmount;

    // Create a Wix Bookings appointment service for this item
    const resp = await fetch('https://www.wixapis.com/bookings/v2/services', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': apiKey,
        'wix-site-id':   siteId,
      },
      body: JSON.stringify({
        service: {
          name:        item.title       || 'Rental Item',
          description: item.description || '',
          tagLine:     `Rental: $${price}/day`,
          type:        'APPOINTMENT',
          payment: {
            rateType: 'FIXED',
            fixed: {
              price:   { value: price,   currency: 'USD' },
              deposit: hasDeposit ? { value: deposit, currency: 'USD' } : undefined,
            },
            options: {
              online:  true,
              deposit: hasDeposit,
            },
          },
          onlineBooking: { enabled: true },
        }
      }),
    });

    const data = await resp.json();
    const serviceId   = data.service?.id;
    const serviceSlug = data.service?.mainSlug?.name || slug;

    if (serviceId) {
      // Write the service ID + slug back into the CMS item
      await wixData.update('RentalCatalog', {
        _id:              item._id,
        bookingServiceId: serviceId,
        bookingSlug:      serviceSlug,
      }, { suppressAuth: true });

      console.log(`✅ Created booking service for "${item.title}": ${serviceId}`);
    }

  } catch (err) {
    console.error('Auto-booking setup failed for:', item.title, err.message);
    // Non-fatal — the item is still saved, just needs manual linking
  }

  return item;
}

// ── Fires AFTER an item is updated in the CMS
// Re-syncs price if it changed
export async function RentalCatalog_afterUpdate(item, context) {
  if (!item.bookingServiceId) return item; // no service linked yet

  try {
    const apiKey = await getSecret('RENTAL_API_KEY');
    const siteId = '790788cd-d7a3-4a0f-8a8a-73630a12e2a0';

    const price   = String(item.pricePerDay   || 100);
    const deposit = String(item.depositAmount || 50);
    const hasDeposit = !!item.depositAmount;

    await fetch(`https://www.wixapis.com/bookings/v2/services/${item.bookingServiceId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': apiKey,
        'wix-site-id':   siteId,
      },
      body: JSON.stringify({
        service: {
          name:        item.title       || 'Rental Item',
          description: item.description || '',
          payment: {
            rateType: 'FIXED',
            fixed: {
              price:   { value: price,   currency: 'USD' },
              deposit: hasDeposit ? { value: deposit, currency: 'USD' } : undefined,
            },
            options: { online: true, deposit: hasDeposit },
          },
        },
        mask: { paths: ['service.name', 'service.description', 'service.payment'] },
      }),
    });

  } catch (err) {
    console.error('Booking service sync failed for:', item.title, err.message);
  }

  return item;
}
