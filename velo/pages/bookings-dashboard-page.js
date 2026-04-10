// ═══════════════════════════════════════════════════════════════
// BOOKINGS DASHBOARD PAGE CODE — bookings-dashboard-page.js
// ───────────────────────────────────────────────────────────────
// HOW TO INSTALL:
//   1. Open your "Bookings Dashboard" page in the Wix Editor
//   2. Click the </> icon at the bottom (Dev Mode)
//   3. Click "Page Code" tab
//   4. Paste this entire file, replacing any existing content
//   5. Save
//
// This connects the HTML iFrame element (ID: #dashboardEmbed)
// to the backend. The HTML sends messages here, this code
// calls the backend and sends data back.
// ═══════════════════════════════════════════════════════════════

import { getBookings, updateBookingStatus } from 'backend/rentals';

$w.onReady(function () {
  // Cast to HtmlComponent so Wix's type checker doesn't complain
  // about postMessage not existing on Section/Box types.
  const embed = /** @type {$w.HtmlComponent} */ ($w('#dashboardEmbed'));

  embed.onMessage(async (event) => {
    const msg = typeof event.data === 'string'
      ? JSON.parse(event.data)
      : event.data;

    // Dashboard loaded — send it all bookings
    if (msg.type === 'ready' || msg.type === 'refresh') {
      try {
        const bookings = await getBookings();
        embed.postMessage({ type: 'bookings', data: bookings });
      } catch (e) {
        console.error('Failed to load bookings:', e);
      }
    }

    // Update a booking status
    if (msg.type === 'updateStatus') {
      try {
        await updateBookingStatus(msg.bookingId, msg.status);
        embed.postMessage({
          type: 'statusUpdated',
          bookingId: msg.bookingId,
          status: msg.status,
        });
      } catch (e) {
        console.error('Failed to update status:', e);
      }
    }
  });
});
