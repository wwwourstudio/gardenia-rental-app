// ═══════════════════════════════════════════════════════════════
// RENTAL QUOTE PAGE CODE — rental-quote-page.js
// ───────────────────────────────────────────────────────────────
// HOW TO INSTALL:
//   1. Open your "Rental Quote" page in the Wix Editor
//   2. Click the </> icon at the bottom of the screen (Dev Mode)
//   3. Click "Page Code" tab
//   4. Paste this entire file, replacing any existing content
//   5. Save
//
// This connects the HTML iFrame element (ID: #rentalQuoteEmbed)
// to the backend. The HTML component sends messages here, and
// this code calls the backend and returns results.
// ═══════════════════════════════════════════════════════════════

import { getRentalItems, createRentalBooking } from 'backend/rentals';

$w.onReady(function () {
  $w('#rentalQuoteEmbed').onMessage(async (event) => {
    const msg = typeof event.data === 'string'
      ? JSON.parse(event.data)
      : event.data;

    // HTML component loaded — send it the catalog items
    if (msg.type === 'ready') {
      try {
        const items = await getRentalItems();
        $w('#rentalQuoteEmbed').postMessage({ type: 'items', data: items });
      } catch (e) {
        console.error('Failed to load rental items:', e);
      }
    }

    // Customer submitted the form — save the booking
    if (msg.type === 'submit') {
      try {
        const result = await createRentalBooking(msg.data);
        $w('#rentalQuoteEmbed').postMessage({
          type: 'success',
          confirmationRef: result.confirmationRef,
        });
      } catch (e) {
        $w('#rentalQuoteEmbed').postMessage({
          type: 'error',
          message: e.message || 'Submission failed. Please try again.',
        });
      }
    }
  });
});
