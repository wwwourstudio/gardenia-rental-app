// ═══════════════════════════════════════════════════════════════
// VELO BACKEND — http-functions.js  (full replacement)
// Backend > http-functions.js
// ═══════════════════════════════════════════════════════════════

import { ok, badRequest, serverError } from 'wix-http-functions';
import wixData from 'wix-data';

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type':                 'application/json',
};

const SITE = '790788cd-d7a3-4a0f-8a8a-73630a12e2a0';

// ── OPTIONS preflight
export function options_rentalCatalog()  { return ok({ headers: CORS, body: '' }); }
export function options_rentalBooking()  { return ok({ headers: CORS, body: '' }); }
export function options_rentalItems()    { return ok({ headers: CORS, body: '' }); }
export function options_rentalProducts() { return ok({ headers: CORS, body: '' }); }
export function options_bookedDates()    { return ok({ headers: CORS, body: '' }); }

// ── GET /_functions/rentalCatalog
// Returns all rental items from the RentalCatalog collection
export async function get_rentalCatalog(request) {
  try {
    const { items } = await wixData
      .query('RentalCatalog')
      .eq('available', true)
      .ascending('title')
      .limit(100)
      .find({ suppressAuth: true });

    return ok({
      headers: CORS,
      body: JSON.stringify({ items }),
    });
  } catch (err) {
    return serverError({ headers: CORS, body: JSON.stringify({ error: err.message }) });
  }
}

// Alias for backwards compat
export async function get_rentalItems(request)    { return get_rentalCatalog(request); }
export async function get_rentalProducts(request) { return get_rentalCatalog(request); }

// ── GET /_functions/bookedDates?itemId=xxx
// Returns all booked date ranges for a given item so the calendar can block them
export async function get_bookedDates(request) {
  try {
    const itemId = request.query?.itemId;
    if (!itemId) return badRequest({ headers: CORS, body: JSON.stringify({ error: 'itemId required' }) });

    const { items } = await wixData
      .query('RentalBookings')
      .eq('itemId', itemId)
      .ne('status', 'cancelled')
      .find({ suppressAuth: true });

    const ranges = items.map(b => ({
      start: b.startDate,
      end:   b.endDate,
    }));

    return ok({ headers: CORS, body: JSON.stringify({ ranges }) });
  } catch (err) {
    return serverError({ headers: CORS, body: JSON.stringify({ error: err.message }) });
  }
}

// ── POST /_functions/rentalBooking
// Saves a rental quote/booking request to the CMS
export async function post_rentalBooking(request) {
  try {
    const body = await request.body.json();
    const {
      firstName, lastName, email, phone,
      itemId, itemTitle, pricePerDay,
      startDate, endDate, days, quantity, total,
      depositAmount, notes,
    } = body;

    if (!firstName || !lastName || !email || !startDate || !endDate || !itemId) {
      return badRequest({ headers: CORS, body: JSON.stringify({ error: 'Missing required fields' }) });
    }

    const booking = await wixData.insert('RentalBookings', {
      firstName,
      lastName,
      email,
      phone:        phone         || '',
      itemId,
      itemTitle:    itemTitle     || '',
      pricePerDay:  Number(pricePerDay)   || 0,
      startDate:    new Date(startDate),
      endDate:      new Date(endDate),
      days:         Number(days)          || 1,
      quantity:     Number(quantity)      || 1,
      total:        Number(total)         || 0,
      depositAmount:Number(depositAmount) || 0,
      notes:        notes         || '',
      status:       'pending',
      submittedAt:  new Date(),
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
    return serverError({ headers: CORS, body: JSON.stringify({ error: err.message }) });
  }
}
