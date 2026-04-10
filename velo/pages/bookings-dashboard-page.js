// ═══════════════════════════════════════════════════════════════
// BOOKINGS DASHBOARD PAGE CODE — bookings-dashboard-page.js
// ───────────────────────────────────────────────────────────────
// HOW TO INSTALL:
//   1. Create a new page in Wix: "Bookings Dashboard"
//   2. Set page permissions to "Members Only" or "Password Protected"
//      so only you can access it
//   3. Add these elements to the page in the Editor:
//
//   STAT BOXES (Text elements):
//     #statTotal      — total booking count
//     #statPending    — pending booking count
//     #statConfirmed  — confirmed booking count
//     #statRevenue    — total revenue (e.g. "$3,450")
//
//   REPEATER (element ID: #bookingsRepeater):
//     Inside the repeater item, add Text elements with these IDs:
//       #bookingRef     — confirmation reference (GRD-XXXXXX)
//       #bookingName    — customer name
//       #bookingEmail   — customer email
//       #bookingDate    — event start date
//       #bookingItems   — item count summary
//       #bookingPrice   — total price
//       #bookingStatus  — status badge
//     And Buttons:
//       #btnConfirm     — "Confirm" button
//       #btnComplete    — "Complete" button
//       #btnCancel      — "Cancel" button
//
//   OTHER:
//     #loadingText     — text element shown while loading
//     #noResults       — text/box shown when no bookings match
//
//   4. Open the page code panel (</> icon) and paste this file
// ═══════════════════════════════════════════════════════════════

import { getBookings, updateBookingStatus } from 'backend/rentals';

let allBookings = [];
let activeFilter = 'all';

$w.onReady(async function () {
  await loadDashboard();

  // Wire up filter buttons if you add them to the page
  // $w('#filterAll').onClick(()       => setFilter('all'));
  // $w('#filterPending').onClick(()   => setFilter('pending'));
  // $w('#filterConfirmed').onClick(() => setFilter('confirmed'));
  // $w('#filterCompleted').onClick(() => setFilter('completed'));
});

// ── Load & display ─────────────────────────────────────────────
async function loadDashboard() {
  try {
    $w('#loadingText').show();
  } catch (e) { /* element may not exist */ }

  allBookings = await getBookings();
  renderStats();
  renderBookings(activeFilter);

  try {
    $w('#loadingText').hide();
  } catch (e) { /* element may not exist */ }
}

// ── Stats ───────────────────────────────────────────────────────
function renderStats() {
  const pending   = allBookings.filter(b => b.status === 'pending').length;
  const confirmed = allBookings.filter(b => b.status === 'confirmed').length;
  const revenue   = allBookings.reduce((s, b) => s + (b.totalPrice || 0), 0);

  try { $w('#statTotal').text     = String(allBookings.length); }   catch (e) {}
  try { $w('#statPending').text   = String(pending); }              catch (e) {}
  try { $w('#statConfirmed').text = String(confirmed); }            catch (e) {}
  try { $w('#statRevenue').text   = '$' + revenue.toLocaleString(); } catch (e) {}
}

// ── Bookings repeater ───────────────────────────────────────────
function renderBookings(filter) {
  const list = filter === 'all'
    ? allBookings
    : allBookings.filter(b => b.status === filter);

  try {
    $w('#noResults').show(list.length === 0);
  } catch (e) {}

  $w('#bookingsRepeater').data = list.map(b => ({
    _id:       b._id,
    ref:       b.confirmationRef || '—',
    name:      b.customerName || '—',
    email:     b.email || '—',
    date:      b.eventStart
                 ? new Date(b.eventStart).toLocaleDateString('en-US',
                     { month: 'short', day: 'numeric', year: 'numeric' })
                 : '—',
    items:     (() => {
                 try {
                   const arr = JSON.parse(b.selectedItems || '[]');
                   return arr.length + ' item' + (arr.length !== 1 ? 's' : '');
                 } catch { return '—'; }
               })(),
    price:     '$' + (b.totalPrice || 0).toLocaleString(),
    status:    b.status || 'pending',
    rawId:     b._id,
  }));

  $w('#bookingsRepeater').onItemReady(($item, data) => {
    try { $item('#bookingRef').text   = data.ref;    } catch (e) {}
    try { $item('#bookingName').text  = data.name;   } catch (e) {}
    try { $item('#bookingEmail').text = data.email;  } catch (e) {}
    try { $item('#bookingDate').text  = data.date;   } catch (e) {}
    try { $item('#bookingItems').text = data.items;  } catch (e) {}
    try { $item('#bookingPrice').text = data.price;  } catch (e) {}

    // Status badge with colour
    try {
      $item('#bookingStatus').text = capitalise(data.status);
      const colours = {
        pending:   '#e8a020',
        confirmed: '#4a7c59',
        completed: '#7a7a7a',
        cancelled: '#c0392b',
      };
      $item('#bookingStatus').style.color = colours[data.status] || '#7a7a7a';
    } catch (e) {}

    // Action buttons
    try {
      $item('#btnConfirm').onClick(async () => {
        await updateBookingStatus(data.rawId, 'confirmed');
        await loadDashboard();
      });
    } catch (e) {}

    try {
      $item('#btnComplete').onClick(async () => {
        await updateBookingStatus(data.rawId, 'completed');
        await loadDashboard();
      });
    } catch (e) {}

    try {
      $item('#btnCancel').onClick(async () => {
        const ok = await wixWindow.openLightbox('ConfirmCancel');
        if (ok) {
          await updateBookingStatus(data.rawId, 'cancelled');
          await loadDashboard();
        }
      });
    } catch (e) {
      // If no lightbox, just cancel directly
      $item('#btnCancel').onClick(async () => {
        await updateBookingStatus(data.rawId, 'cancelled');
        await loadDashboard();
      });
    }
  });
}

// ── Filter helper ───────────────────────────────────────────────
function setFilter(f) {
  activeFilter = f;
  renderBookings(f);
}

// ── Utility ─────────────────────────────────────────────────────
function capitalise(s) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : '—';
}
