// ═══════════════════════════════════════════════════════════════
// VELO BACKEND — http-functions.js
// Place this file at: Backend > http-functions.js
// in your Wix Editor (Velo must be enabled on your site)
// ═══════════════════════════════════════════════════════════════

import { ok, badRequest, serverError } from 'wix-http-functions';
import wixData from 'wix-data';

const COLLECTION = 'RentalItems';

// CORS headers — required so the iframe can call these endpoints
const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type':                 'application/json',
};

// ── OPTIONS preflight (browser sends this before every request)
export function options_rentalItems()  { return ok({ headers: CORS, body: '' }); }
export function options_rentalBooking(){ return ok({ headers: CORS, body: '' }); }

// ── GET /_functions/rentalItems
// Returns all items from the RentalItems CMS collection
export async function get_rentalItems(request) {
  try {
    const { items } = await wixData
      .query(COLLECTION)
      .ascending('title')
      .limit(100)
      .find({ suppressAuth: true });

    return ok({
      headers: CORS,
      body: JSON.stringify({ items }),
    });
  } catch (err) {
    return serverError({
      headers: CORS,
      body: JSON.stringify({ error: err.message }),
    });
  }
}

// ── POST /_functions/rentalBooking
// Creates a booking/inquiry record in the Bookings collection
export async function post_rentalBooking(request) {
  try {
    const body = await request.body.json();

    const {
      firstName, lastName, email, phone,
      itemId, itemTitle, startDate, endDate,
      quantity, total, notes,
    } = body;

    // Validate required fields
    if (!firstName || !lastName || !email || !startDate || !endDate || !itemId) {
      return badRequest({
        headers: CORS,
        body: JSON.stringify({ error: 'Missing required fields' }),
      });
    }

    // Save inquiry to a "RentalBookings" collection for your records
    const booking = await wixData.insert('RentalBookings', {
      firstName,
      lastName,
      email,
      phone:      phone    || '',
      itemId,
      itemTitle:  itemTitle|| '',
      startDate:  new Date(startDate),
      endDate:    new Date(endDate),
      quantity:   Number(quantity) || 1,
      total:      Number(total)    || 0,
      notes:      notes    || '',
      status:     'pending',
      submittedAt: new Date(),
    }, { suppressAuth: true });

    return ok({
      headers: CORS,
      body: JSON.stringify({
        success: true,
        bookingId: booking._id,
        ref: 'GRD-' + booking._id.slice(0, 6).toUpperCase(),
      }),
    });
  } catch (err) {
    return serverError({
      headers: CORS,
      body: JSON.stringify({ error: err.message }),
    });
  }
}
