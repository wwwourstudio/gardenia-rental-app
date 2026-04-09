// ═══════════════════════════════════════════════════════════════
// VELO BACKEND — data.js
// Place at: Backend > data.js
// ═══════════════════════════════════════════════════════════════

import wixData from 'wix-data';
import { getSecret } from 'wix-secrets-backend';
import { fetch } from 'wix-fetch'; // ← REQUIRED in Velo backend

const SITE_ID = '790788cd-d7a3-4a0f-8a8a-73630a12e2a0';

// ── Auto-fires when a new item is saved to RentalCatalog
export async function RentalCatalog_afterInsert(item, context) {
  if (item.bookingServiceId) return item; // already linked, skip

  try {
    const apiKey    = await getSecret('RENTAL_API_KEY');
    const priceVal  = String(Number(item.pricePerDay)   || 100);
    const depVal    = String(Number(item.depositAmount) || 0);
    const hasDep    = Number(item.depositAmount) > 0;

    const resp = await fetch('https://www.wixapis.com/bookings/v2/services', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': apiKey,
        'wix-site-id':   SITE_ID,
      },
      body: JSON.stringify({
        service: {
          name:        item.title       || 'Rental Item',
          description: item.description || '',
          tagLine:     '$' + priceVal + '/day rental',
          type:        'APPOINTMENT',
          payment: {
            rateType: 'FIXED',
            fixed: {
              price:   { value: priceVal, currency: 'USD' },
              deposit: hasDep ? { value: depVal, currency: 'USD' } : undefined,
            },
            options: { online: true, deposit: hasDep },
          },
          onlineBooking: { enabled: true },
        }
      }),
    });

    // Cast to any — avoids Velo TypeScript "unknown" type error
    const json = /** @type {any} */ (await resp.json());

    const serviceId   = json && json.service ? json.service.id : null;
    const serviceSlug = json && json.service && json.service.mainSlug
      ? json.service.mainSlug.name
      : (item.title || 'rental').toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40);

    if (serviceId) {
      await wixData.update('RentalCatalog', {
        _id:              item._id,
        bookingServiceId: serviceId,
        bookingSlug:      serviceSlug,
      }, { suppressAuth: true });

      console.log('✅ Booking service created for: ' + item.title + ' → ' + serviceId);
    } else {
      console.error('❌ No service ID in response:', JSON.stringify(json));
    }

  } catch (err) {
    console.error('❌ Auto-booking failed for: ' + (item.title || 'unknown'), err.message || err);
  }

  return item;
}

// ── Auto-fires when an item is updated — keeps price/name in sync
export async function RentalCatalog_afterUpdate(item, context) {
  if (!item.bookingServiceId) return item; // no service linked, skip

  try {
    const apiKey   = await getSecret('RENTAL_API_KEY');
    const priceVal = String(Number(item.pricePerDay)   || 100);
    const depVal   = String(Number(item.depositAmount) || 0);
    const hasDep   = Number(item.depositAmount) > 0;

    await fetch('https://www.wixapis.com/bookings/v2/services/' + item.bookingServiceId, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': apiKey,
        'wix-site-id':   SITE_ID,
      },
      body: JSON.stringify({
        service: {
          name:        item.title       || 'Rental Item',
          description: item.description || '',
          payment: {
            rateType: 'FIXED',
            fixed: {
              price:   { value: priceVal, currency: 'USD' },
              deposit: hasDep ? { value: depVal, currency: 'USD' } : undefined,
            },
            options: { online: true, deposit: hasDep },
          },
        },
        mask: { paths: ['service.name', 'service.description', 'service.payment'] },
      }),
    });

    console.log('✅ Booking service synced for: ' + item.title);

  } catch (err) {
    console.error('❌ Booking sync failed for: ' + (item.title || 'unknown'), err.message || err);
  }

  return item;
}
