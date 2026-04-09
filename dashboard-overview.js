// ═══════════════════════════════════════════════════════════════
// VELO — Dashboard Page: Rental Overview
// Page name: "Rental Overview"  |  URL: /rental-overview
// ═══════════════════════════════════════════════════════════════
// ELEMENTS TO ADD IN EDITOR (drag from Add panel):
//   Text  #txtPending   — "0"
//   Text  #txtConfirmed — "0"
//   Text  #txtItems     — "0"
//   Text  #txtRevenue   — "$0"
//   Text  #txtPageDate
//   Repeater #repRecentBookings
//     └─ inside each cell:
//        Text #txtBName, #txtBItem, #txtBDates, #txtBTotal, #txtBStatus
//   Button #btnGoBookings  — "View All Bookings"
//   Button #btnGoInventory — "Manage Inventory"
//   Button #btnAddItem     — "+ Add Rental Item"
// ═══════════════════════════════════════════════════════════════

import wixData from 'wix-data';
import wixLocation from 'wix-location';

$w.onReady(async function () {
  // Set page date
  $w('#txtPageDate').text = new Date().toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });

  // Wire buttons
  $w('#btnGoBookings').onClick(() => wixLocation.to('/rental-bookings'));
  $w('#btnGoInventory').onClick(() => wixLocation.to('/rental-inventory'));
  $w('#btnAddItem').onClick(() => wixLocation.to('/rental-inventory'));

  // Load data
  await Promise.all([loadStats(), loadRecentBookings()]);
});

async function loadStats() {
  try {
    // Bookings stats
    const bookings = await wixData.query('RentalBookings').find();
    const all = bookings.items;
    const pending   = all.filter(b => b.status === 'pending').length;
    const confirmed = all.filter(b => b.status === 'confirmed').length;
    const revenue   = all
      .filter(b => b.status === 'confirmed')
      .reduce((sum, b) => sum + (b.total || 0), 0);

    $w('#txtPending').text   = String(pending);
    $w('#txtConfirmed').text = String(confirmed);
    $w('#txtRevenue').text   = '$' + revenue.toFixed(0);

    // Catalog stats
    const catalog = await wixData.query('RentalCatalog').find();
    $w('#txtItems').text = String(catalog.items.length);
  } catch (e) {
    console.error('Stats error', e);
  }
}

async function loadRecentBookings() {
  try {
    const results = await wixData.query('RentalBookings')
      .descending('_createdDate')
      .limit(5)
      .find();

    if (!results.items.length) {
      $w('#repRecentBookings').hide();
      return;
    }

    $w('#repRecentBookings').data = results.items;
    $w('#repRecentBookings').onItemReady(($item, item) => {
      $item('#txtBName').text   = (item.firstName || '') + ' ' + (item.lastName || '');
      $item('#txtBItem').text   = item.itemTitle  || '—';
      $item('#txtBDates').text  = fmtDate(item.startDate) + ' → ' + fmtDate(item.endDate);
      $item('#txtBTotal').text  = '$' + Number(item.total || 0).toFixed(2);
      $item('#txtBStatus').text = (item.status || 'pending').toUpperCase();
    });
  } catch (e) {
    console.error('Recent bookings error', e);
  }
}

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
