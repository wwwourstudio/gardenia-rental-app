// ═══════════════════════════════════════════════════════════════
// VELO BACKEND — http-functions.js  (REPLACE your existing file)
// Backend > http-functions.js
// ═══════════════════════════════════════════════════════════════

import { ok, badRequest, serverError } from 'wix-http-functions';
import wixData from 'wix-data';
import { products as storeProducts } from 'wix-stores-backend';

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type':                 'application/json',
};

// Preflight handlers
export function options_rentalProducts() { return ok({ headers: CORS, body: '' }); }
export function options_rentalBooking()  { return ok({ headers: CORS, body: '' }); }
export function options_rentalItems()    { return ok({ headers: CORS, body: '' }); }

// ── GET /_functions/rentalProducts
// Returns Wix Store products formatted for the rental system
export async function get_rentalProducts(request) {
  try {
    const result = await storeProducts.queryProducts()
      .ascending('name')
      .limit(100)
      .find();

    const items = result.items.map(p => ({
      id:           p._id,
      title:        p.name,
      description:  p.description || '',
      price:        p.price?.price || 0,
      currency:     p.price?.currency || 'USD',
      image:        p.media?.mainMedia?.image?.url || '',
      images:       (p.media?.items || []).map(m => m.image?.url).filter(Boolean),
      available:    p.visible !== false && (p.stock?.inventoryStatus !== 'out_of_stock'),
      category:     (p.collections || [])[0]?.name || '',
      sku:          p.sku || '',
      // bookingUrl stored in product description custom field or ribbon
      // Convention: add "BOOKING_URL:/booking-calendar/your-service" in product notes
      bookingSlug:  extractBookingSlug(p.additionalInfoSections, p.ribbon),
      productUrl:   p.productPageUrl?.base + p.productPageUrl?.path || '',
    }));

    return ok({ headers: CORS, body: JSON.stringify({ items }) });
  } catch (err) {
    console.error('rentalProducts error:', err);
    return serverError({ headers: CORS, body: JSON.stringify({ error: err.message }) });
  }
}

// Helper: extract booking slug from product ribbon or additional info
function extractBookingSlug(infoSections, ribbon) {
  // Check ribbon text for booking slug e.g. "BOOK:service-one"
  if (ribbon && ribbon.startsWith('BOOK:')) {
    return ribbon.replace('BOOK:', '').trim();
  }
  // Check additional info sections
  if (infoSections) {
    for (const section of infoSections) {
      if (section.title === 'Booking' || section.title === 'booking') {
        return section.description?.trim() || '';
      }
    }
  }
  return '';
}

// ── GET /_functions/rentalItems  (legacy — kept for backwards compatibility)
export async function get_rentalItems(request) {
  return get_rentalProducts(request);
}

// ── POST /_functions/rentalBooking
// Saves quote request to CMS + returns confirmation
export async function post_rentalBooking(request) {
  try {
    const body = await request.body.json();
    const {
      firstName, lastName, email, phone,
      itemId, itemTitle, itemPrice,
      startDate, endDate, quantity, total, notes,
    } = body;

    if (!firstName || !lastName || !email || !startDate || !endDate || !itemId) {
      return badRequest({ headers: CORS, body: JSON.stringify({ error: 'Missing required fields' }) });
    }

    const booking = await wixData.insert('RentalBookings', {
      firstName,
      lastName,
      email,
      phone:       phone    || '',
      itemId,
      itemTitle:   itemTitle|| '',
      itemPrice:   Number(itemPrice) || 0,
      startDate:   new Date(startDate),
      endDate:     new Date(endDate),
      quantity:    Number(quantity) || 1,
      total:       Number(total)    || 0,
      notes:       notes    || '',
      status:      'pending',
      submittedAt: new Date(),
    }, { suppressAuth: true });

    return ok({
      headers: CORS,
      body: JSON.stringify({
        success:   true,
        bookingId: booking._id,
        ref:       'GRD-' + booking._id.slice(0, 6).toUpperCase(),
      }),
    });
  } catch (err) {
    console.error('rentalBooking error:', err);
    return serverError({ headers: CORS, body: JSON.stringify({ error: err.message }) });
  }
}
