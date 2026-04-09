// ═══════════════════════════════════════════════════════════════
// VELO — Dashboard Page: Booking Requests
// Page name: "Booking Requests"  |  URL: /rental-bookings
// ═══════════════════════════════════════════════════════════════
// ELEMENTS TO ADD IN EDITOR:
//   Dropdown  #dropStatus     — options: All, pending, confirmed, cancelled
//   SearchBar #searchBar      — or Input #inpSearch
//   Repeater  #repBookings
//     └─ inside each cell:
//        Text   #txtName, #txtEmail, #txtPhone
//        Text   #txtItem, #txtQty
//        Text   #txtStart, #txtEnd, #txtDays
//        Text   #txtTotal, #txtDeposit, #txtStatus
//        Text   #txtNotes
//        Text   #txtRef
//        Button #btnConfirm   — "✓ Confirm"
//        Button #btnDecline   — "✗ Decline"
//        Button #btnCancel    — "Cancel"
//   Text   #txtEmpty          — "No bookings found"
//   Text   #txtCount
// ═══════════════════════════════════════════════════════════════

import wixData from 'wix-data';

let allBookings = [];

$w.onReady(async function () {
  await loadBookings();

  // Filter controls
  $w('#dropStatus').onChange(() => applyFilter());
  $w('#inpSearch').onInput(() => applyFilter());
});

async function loadBookings() {
  try {
    const results = await wixData.query('RentalBookings')
      .descending('_createdDate')
      .limit(200)
      .find();

    allBookings = results.items;
    renderBookings(allBookings);
  } catch (e) {
    console.error('Load bookings error', e);
  }
}

function applyFilter() {
  const status = $w('#dropStatus').value;
  const q = ($w('#inpSearch').value || '').toLowerCase();

  const filtered = allBookings.filter(b => {
    const statusOk = !status || status === 'all' || b.status === status;
    const qOk = !q || [b.firstName, b.lastName, b.email, b.itemTitle]
      .some(f => f?.toLowerCase().includes(q));
    return statusOk && qOk;
  });

  renderBookings(filtered);
}

function renderBookings(bookings) {
  $w('#txtCount').text = bookings.length + ' requests';

  if (!bookings.length) {
    $w('#txtEmpty').show();
    $w('#repBookings').hide();
    return;
  }

  $w('#txtEmpty').hide();
  $w('#repBookings').show();
  $w('#repBookings').data = bookings;

  $w('#repBookings').onItemReady(($item, item) => {
    // Customer info
    $item('#txtName').text    = (item.firstName || '') + ' ' + (item.lastName || '');
    $item('#txtEmail').text   = item.email  || '—';
    $item('#txtPhone').text   = item.phone  || '—';

    // Item info
    $item('#txtItem').text    = item.itemTitle || '—';
    $item('#txtQty').text     = 'Qty: ' + (item.quantity || 1);

    // Dates
    $item('#txtStart').text   = fmtDate(item.startDate);
    $item('#txtEnd').text     = fmtDate(item.endDate);
    $item('#txtDays').text    = (item.days || '?') + ' days';

    // Pricing
    $item('#txtTotal').text   = '$' + Number(item.total   || 0).toFixed(2);
    $item('#txtDeposit').text = item.depositAmount ? '$' + Number(item.depositAmount).toFixed(2) + ' deposit' : 'No deposit';

    // Status
    $item('#txtStatus').text  = (item.status || 'pending').toUpperCase();

    // Notes & ref
    $item('#txtNotes').text   = item.notes || 'No notes';
    $item('#txtRef').text     = 'Ref: ' + (item._id || '').slice(0, 8).toUpperCase();

    // Show/hide action buttons based on current status
    if (item.status === 'pending') {
      $item('#btnConfirm').show();
      $item('#btnDecline').show();
      $item('#btnCancel').hide();
    } else if (item.status === 'confirmed') {
      $item('#btnConfirm').hide();
      $item('#btnDecline').hide();
      $item('#btnCancel').show();
    } else {
      $item('#btnConfirm').hide();
      $item('#btnDecline').hide();
      $item('#btnCancel').hide();
    }

    // Button actions
    $item('#btnConfirm').onClick(() => updateStatus(item._id, 'confirmed'));
    $item('#btnDecline').onClick(() => updateStatus(item._id, 'cancelled'));
    $item('#btnCancel').onClick(() => updateStatus(item._id, 'cancelled'));
  });
}

async function updateStatus(id, status) {
  try {
    const item = await wixData.get('RentalBookings', id);
    await wixData.update('RentalBookings', { ...item, status });

    // Update local array and re-render
    const idx = allBookings.findIndex(b => b._id === id);
    if (idx !== -1) allBookings[idx].status = status;
    applyFilter();
  } catch (e) {
    console.error('Update status error', e);
  }
}

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
