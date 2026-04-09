// ═══════════════════════════════════════════════════════════════
// VELO BACKEND — http-functions.js  (FULL REPLACEMENT — v4)
// Backend > http-functions.js
// ═══════════════════════════════════════════════════════════════

import { ok, badRequest, serverError, forbidden } from 'wix-http-functions';
import wixData from 'wix-data';

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, x-admin-key',
  'Content-Type':                 'application/json',
};

// ── OPTIONS preflight (all endpoints)
export function options_rentalCatalog()   { return ok({ headers: CORS, body: '' }); }
export function options_rentalBooking()   { return ok({ headers: CORS, body: '' }); }
export function options_rentalItems()     { return ok({ headers: CORS, body: '' }); }
export function options_rentalProducts()  { return ok({ headers: CORS, body: '' }); }
export function options_bookedDates()     { return ok({ headers: CORS, body: '' }); }
export function options_adminItems()      { return ok({ headers: CORS, body: '' }); }
export function options_adminBookings()   { return ok({ headers: CORS, body: '' }); }
export function options_adminStats()      { return ok({ headers: CORS, body: '' }); }
export function options_adminUpdateItem() { return ok({ headers: CORS, body: '' }); }
export function options_adminDeleteItem() { return ok({ headers: CORS, body: '' }); }
export function options_adminUpdateBooking(){ return ok({ headers: CORS, body: '' }); }

// ══════════════════════════════════════════════════════════════
// PUBLIC ENDPOINTS (used by the customer-facing rental iframe)
// ══════════════════════════════════════════════════════════════

// GET /_functions/rentalCatalog — all available items
export async function get_rentalCatalog(request) {
  try {
    const { items } = await wixData
      .query('RentalCatalog')
      .eq('available', true)
      .ascending('title')
      .limit(100)
      .find({ suppressAuth: true });
    return ok({ headers: CORS, body: JSON.stringify({ items }) });
  } catch (err) {
    return serverError({ headers: CORS, body: JSON.stringify({ error: err.message }) });
  }
}
export async function get_rentalItems(request)    { return get_rentalCatalog(request); }
export async function get_rentalProducts(request) { return get_rentalCatalog(request); }

// GET /_functions/bookedDates?itemId=xxx — blocked dates for calendar
export async function get_bookedDates(request) {
  try {
    const itemId = request.query && request.query.itemId;
    if (!itemId) return badRequest({ headers: CORS, body: JSON.stringify({ error: 'itemId required' }) });
    const { items } = await wixData
      .query('RentalBookings')
      .eq('itemId', itemId)
      .ne('status', 'cancelled')
      .find({ suppressAuth: true });
    const ranges = items.map(b => ({ start: b.startDate, end: b.endDate }));
    return ok({ headers: CORS, body: JSON.stringify({ ranges }) });
  } catch (err) {
    return serverError({ headers: CORS, body: JSON.stringify({ error: err.message }) });
  }
}

// POST /_functions/rentalBooking — save customer quote request
export async function post_rentalBooking(request) {
  try {
    const body = await request.body.json();
    const { firstName, lastName, email, phone, itemId, itemTitle, pricePerDay,
            startDate, endDate, days, quantity, total, depositAmount, notes } = body;
    if (!firstName || !lastName || !email || !startDate || !endDate || !itemId) {
      return badRequest({ headers: CORS, body: JSON.stringify({ error: 'Missing required fields' }) });
    }
    const booking = await wixData.insert('RentalBookings', {
      firstName, lastName, email,
      phone:         phone         || '',
      itemId,
      itemTitle:     itemTitle     || '',
      pricePerDay:   Number(pricePerDay)   || 0,
      startDate:     new Date(startDate),
      endDate:       new Date(endDate),
      days:          Number(days)          || 1,
      quantity:      Number(quantity)      || 1,
      total:         Number(total)         || 0,
      depositAmount: Number(depositAmount) || 0,
      notes:         notes         || '',
      status:        'pending',
      submittedAt:   new Date(),
    }, { suppressAuth: true });
    return ok({ headers: CORS, body: JSON.stringify({
      success: true,
      bookingId: booking._id,
      ref: 'GRD-' + booking._id.slice(0, 6).toUpperCase(),
    })});
  } catch (err) {
    return serverError({ headers: CORS, body: JSON.stringify({ error: err.message }) });
  }
}

// ══════════════════════════════════════════════════════════════
// ADMIN ENDPOINTS (used by the owner dashboard)
// ══════════════════════════════════════════════════════════════

// GET /_functions/adminStats — dashboard overview numbers
export async function get_adminStats(request) {
  try {
    const [catalogRes, bookingsRes, pendingRes] = await Promise.all([
      wixData.query('RentalCatalog').limit(1000).find({ suppressAuth: true }),
      wixData.query('RentalBookings').limit(1000).find({ suppressAuth: true }),
      wixData.query('RentalBookings').eq('status','pending').limit(1000).find({ suppressAuth: true }),
    ]);
    const totalRevenue = bookingsRes.items
      .filter(b => b.status === 'confirmed')
      .reduce((sum, b) => sum + (Number(b.total) || 0), 0);
    return ok({ headers: CORS, body: JSON.stringify({
      totalItems:     catalogRes.totalCount,
      availableItems: catalogRes.items.filter(i => i.available).length,
      totalBookings:  bookingsRes.totalCount,
      pendingBookings:pendingRes.totalCount,
      totalRevenue,
    })});
  } catch (err) {
    return serverError({ headers: CORS, body: JSON.stringify({ error: err.message }) });
  }
}

// GET /_functions/adminItems — ALL items (including unavailable)
export async function get_adminItems(request) {
  try {
    const { items } = await wixData
      .query('RentalCatalog')
      .ascending('title')
      .limit(100)
      .find({ suppressAuth: true });
    return ok({ headers: CORS, body: JSON.stringify({ items }) });
  } catch (err) {
    return serverError({ headers: CORS, body: JSON.stringify({ error: err.message }) });
  }
}

// POST /_functions/adminItems — add a new rental item
export async function post_adminItems(request) {
  try {
    const body = await request.body.json();
    const { title, category, description, pricePerDay, depositAmount,
            minDays, quantity, available, image, images, notes } = body;
    if (!title || !pricePerDay) {
      return badRequest({ headers: CORS, body: JSON.stringify({ error: 'Title and price are required' }) });
    }
    const item = await wixData.insert('RentalCatalog', {
      title,
      category:      category      || '',
      description:   description   || '',
      pricePerDay:   Number(pricePerDay)   || 0,
      depositAmount: Number(depositAmount) || 0,
      minDays:       Number(minDays)       || 1,
      quantity:      Number(quantity)      || 1,
      available:     available !== false,
      image:         image         || '',
      images:        images        || '',
      notes:         notes         || '',
    }, { suppressAuth: true });
    return ok({ headers: CORS, body: JSON.stringify({ success: true, item }) });
  } catch (err) {
    return serverError({ headers: CORS, body: JSON.stringify({ error: err.message }) });
  }
}

// PATCH /_functions/adminUpdateItem — update an existing item
export async function patch_adminUpdateItem(request) {
  try {
    const body = await request.body.json();
    if (!body._id) return badRequest({ headers: CORS, body: JSON.stringify({ error: '_id required' }) });
    const updated = await wixData.update('RentalCatalog', {
      ...body,
      pricePerDay:   Number(body.pricePerDay)   || 0,
      depositAmount: Number(body.depositAmount) || 0,
      minDays:       Number(body.minDays)       || 1,
      quantity:      Number(body.quantity)      || 1,
    }, { suppressAuth: true });
    return ok({ headers: CORS, body: JSON.stringify({ success: true, item: updated }) });
  } catch (err) {
    return serverError({ headers: CORS, body: JSON.stringify({ error: err.message }) });
  }
}

// DELETE /_functions/adminDeleteItem?id=xxx
export async function delete_adminDeleteItem(request) {
  try {
    const id = request.query && request.query.id;
    if (!id) return badRequest({ headers: CORS, body: JSON.stringify({ error: 'id required' }) });
    await wixData.remove('RentalCatalog', id, { suppressAuth: true });
    return ok({ headers: CORS, body: JSON.stringify({ success: true }) });
  } catch (err) {
    return serverError({ headers: CORS, body: JSON.stringify({ error: err.message }) });
  }
}

// GET /_functions/adminBookings?status=pending — all bookings
export async function get_adminBookings(request) {
  try {
    const status = request.query && request.query.status;
    let query = wixData.query('RentalBookings').descending('submittedAt').limit(100);
    if (status && status !== 'all') query = query.eq('status', status);
    const { items } = await query.find({ suppressAuth: true });
    return ok({ headers: CORS, body: JSON.stringify({ items }) });
  } catch (err) {
    return serverError({ headers: CORS, body: JSON.stringify({ error: err.message }) });
  }
}

// PATCH /_functions/adminUpdateBooking — update booking status
export async function patch_adminUpdateBooking(request) {
  try {
    const body = await request.body.json();
    if (!body._id || !body.status) {
      return badRequest({ headers: CORS, body: JSON.stringify({ error: '_id and status required' }) });
    }
    const existing = await wixData.get('RentalBookings', body._id, { suppressAuth: true });
    if (!existing) return badRequest({ headers: CORS, body: JSON.stringify({ error: 'Booking not found' }) });
    const updated = await wixData.update('RentalBookings', {
      ...existing,
      status: body.status,
      adminNotes: body.adminNotes || existing.adminNotes || '',
    }, { suppressAuth: true });
    return ok({ headers: CORS, body: JSON.stringify({ success: true, booking: updated }) });
  } catch (err) {
    return serverError({ headers: CORS, body: JSON.stringify({ error: err.message }) });
  }
}
// ═══════════════════════════════════════════════════════════════
// ADD THESE TWO FUNCTIONS to the bottom of your existing
// http-functions.js in Velo Backend (do not replace, just append)
// ═══════════════════════════════════════════════════════════════

// ── GET /_functions/adminBookings
// Returns ALL bookings for the admin dashboard (no auth filter)
export async function get_adminBookings(request) {
  try {
    const { items } = await wixData
      .query('RentalBookings')
      .descending('submittedAt')
      .limit(200)
      .find({ suppressAuth: true });

    return ok({
      headers: CORS,
      body: JSON.stringify({ bookings: items }),
    });
  } catch (err) {
    return serverError({ headers: CORS, body: JSON.stringify({ error: err.message }) });
  }
}

// ── POST /_functions/updateBooking
// Updates the status of a booking (confirmed / cancelled / completed)
export async function post_updateBooking(request) {
  try {
    const body  = await request.body.json();
    const { bookingId, status } = body;

    if (!bookingId || !status) {
      return badRequest({ headers: CORS, body: JSON.stringify({ error: 'bookingId and status required' }) });
    }

    const validStatuses = ['pending', 'confirmed', 'cancelled', 'completed'];
    if (!validStatuses.includes(status)) {
      return badRequest({ headers: CORS, body: JSON.stringify({ error: 'Invalid status' }) });
    }

    const existing = await wixData.get('RentalBookings', bookingId, { suppressAuth: true });
    if (!existing) {
      return badRequest({ headers: CORS, body: JSON.stringify({ error: 'Booking not found' }) });
    }

    await wixData.update('RentalBookings', {
      ...existing,
      status,
      updatedAt: new Date(),
    }, { suppressAuth: true });

    return ok({
      headers: CORS,
      body: JSON.stringify({ success: true, bookingId, status }),
    });
  } catch (err) {
    return serverError({ headers: CORS, body: JSON.stringify({ error: err.message }) });
  }
}

export function options_adminBookings() { return ok({ headers: CORS, body: '' }); }
export function options_updateBooking() { return ok({ headers: CORS, body: '' }); }
// ═══════════════════════════════════════════════════════════════
// ADD THESE FUNCTIONS to the BOTTOM of your http-functions.js
// Do not replace the whole file — just paste these at the end
// ═══════════════════════════════════════════════════════════════

// ── OPTIONS for admin routes
export function options_adminBookings()     { return ok({ headers: CORS, body: '' }); }
export function options_adminUpdateBooking(){ return ok({ headers: CORS, body: '' }); }
export function options_adminToggleItem()   { return ok({ headers: CORS, body: '' }); }
export function options_adminAddItem()      { return ok({ headers: CORS, body: '' }); }

// ── GET /_functions/adminBookings
// Returns ALL bookings (all statuses) for the admin dashboard
export async function get_adminBookings(request) {
  try {
    const { items } = await wixData
      .query('RentalBookings')
      .descending('submittedAt')
      .limit(200)
      .find({ suppressAuth: true });

    return ok({ headers: CORS, body: JSON.stringify({ bookings: items }) });
  } catch (err) {
    return serverError({ headers: CORS, body: JSON.stringify({ error: err.message }) });
  }
}

// ── POST /_functions/adminUpdateBooking
// Update a booking status (confirmed / cancelled)
export async function post_adminUpdateBooking(request) {
  try {
    const body = await request.body.json();
    const { bookingId, status } = body;

    if (!bookingId || !status) {
      return badRequest({ headers: CORS, body: JSON.stringify({ error: 'bookingId and status required' }) });
    }

    const existing = await wixData.get('RentalBookings', bookingId, { suppressAuth: true });
    if (!existing) {
      return badRequest({ headers: CORS, body: JSON.stringify({ error: 'Booking not found' }) });
    }

    await wixData.update('RentalBookings', {
      ...existing,
      status,
      updatedAt: new Date(),
    }, { suppressAuth: true });

    return ok({ headers: CORS, body: JSON.stringify({ success: true, status }) });
  } catch (err) {
    return serverError({ headers: CORS, body: JSON.stringify({ error: err.message }) });
  }
}

// ── POST /_functions/adminToggleItem
// Toggle an item available/unavailable
export async function post_adminToggleItem(request) {
  try {
    const body = await request.body.json();
    const { itemId, available } = body;

    if (!itemId) {
      return badRequest({ headers: CORS, body: JSON.stringify({ error: 'itemId required' }) });
    }

    const existing = await wixData.get('RentalCatalog', itemId, { suppressAuth: true });
    if (!existing) {
      return badRequest({ headers: CORS, body: JSON.stringify({ error: 'Item not found' }) });
    }

    await wixData.update('RentalCatalog', {
      ...existing,
      available: !!available,
    }, { suppressAuth: true });

    return ok({ headers: CORS, body: JSON.stringify({ success: true, available: !!available }) });
  } catch (err) {
    return serverError({ headers: CORS, body: JSON.stringify({ error: err.message }) });
  }
}

// ── POST /_functions/adminAddItem
// Add a new item to RentalCatalog (data.js hook will auto-create Bookings service)
export async function post_adminAddItem(request) {
  try {
    const body = await request.body.json();
    const { title, category, description, pricePerDay, depositAmount, minDays, quantity, image, images, available } = body;

    if (!title) {
      return badRequest({ headers: CORS, body: JSON.stringify({ error: 'title is required' }) });
    }

    const item = await wixData.insert('RentalCatalog', {
      title,
      category:      category     || '',
      description:   description  || '',
      pricePerDay:   Number(pricePerDay)   || 0,
      depositAmount: Number(depositAmount) || 0,
      minDays:       Number(minDays)       || 1,
      quantity:      Number(quantity)      || 1,
      image:         image        || '',
      images:        images       || '',
      available:     available !== false,
    }, { suppressAuth: true });
    // Note: data.js afterInsert hook will auto-create the Wix Bookings service

    return ok({
      headers: CORS,
      body: JSON.stringify({ success: true, itemId: item._id }),
    });
  } catch (err) {
    return serverError({ headers: CORS, body: JSON.stringify({ error: err.message }) });
  }
}
