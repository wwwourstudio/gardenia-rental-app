// ═══════════════════════════════════════════════════════════════
// VELO — Gardenia Rental Admin (Native Wix Components)
// Page: "Rental Admin" — hidden from menu, members only
//
// ── ELEMENTS TO ADD IN WIX EDITOR ────────────────────────────
// All elements use default Wix styling. Add them from the panel.
//
// TAB BUTTONS (Wix Button elements):
//   #btnTabDashboard  "📊 Dashboard"
//   #btnTabBookings   "📋 Bookings"
//   #btnTabCalendar   "📅 Calendar"
//   #btnTabInventory  "🗂 Inventory"
//   #btnTabAddItem    "➕ Add Item"
//
// MULTI-STATE BOX: #msb1 (5 states named exactly):
//   State: "dashboard"
//   State: "bookings"
//   State: "calendar"
//   State: "inventory"
//   State: "additem"
//
// ── STATE: dashboard ─────────────────────────────────────────
//   Text #txtPending      (stat number)
//   Text #txtConfirmed    (stat number)
//   Text #txtItems        (stat number)
//   Text #txtRevenue      (stat number)
//   Repeater #repDashBookings
//     Cell contains: Text #txtDBName #txtDBItem #txtDBDates #txtDBTotal #txtDBStatus
//   Button #btnDashViewAll    "View All Bookings →"
//   Button #btnDashManage     "Manage Inventory →"
//
// ── STATE: bookings ──────────────────────────────────────────
//   Dropdown #dropBkStatus   options: All|pending|confirmed|cancelled
//   TextInput #inpBkSearch   placeholder: "Search name or item…"
//   Button #btnBkSearch      "Search"
//   Repeater #repBookings
//     Cell contains:
//       Text #txtBkName #txtBkEmail #txtBkPhone
//       Text #txtBkItem #txtBkQty
//       Text #txtBkStart #txtBkEnd #txtBkDays
//       Text #txtBkTotal #txtBkDeposit #txtBkStatus #txtBkNotes #txtBkRef
//       Button #btnBkConfirm  "✓ Confirm"
//       Button #btnBkDecline  "✗ Decline"
//       Button #btnBkCancel   "Cancel"
//   Text #txtBkEmpty  "No booking requests yet"
//   Text #txtBkCount
//
// ── STATE: calendar ──────────────────────────────────────────
//   Button #btnCalPrev   "‹ Prev"
//   Button #btnCalNext   "Next ›"
//   Text   #txtCalHead   (month/year display)
//   Repeater #repCalDays
//     Cell contains: Text #txtCalDay, Text #txtCalBookings
//
// ── STATE: inventory ─────────────────────────────────────────
//   Dropdown #dropInvCat   (category filter)
//   TextInput #inpInvSearch
//   Button #btnInvSearch   "Search"
//   Button #btnInvAdd      "+ Add Item"
//   Text   #txtInvCount
//   Repeater #repInventory
//     Cell contains:
//       Image  #imgInvItem
//       Text   #txtInvTitle #txtInvCat #txtInvPrice
//       Text   #txtInvDeposit #txtInvQty #txtInvMin #txtInvStatus #txtInvNotes
//       Button #btnInvEdit    "Edit"
//       Button #btnInvToggle  "Enable/Disable"
//
// ── STATE: additem ────────────────────────────────────────────
//   Text      #txtFormTitle   "Add Rental Item"
//   TextInput #fTitle         placeholder: "Item Name *"
//   TextInput #fCat           placeholder: "Category *"
//   TextInput #fPrice         placeholder: "Price Per Day ($) *"
//   TextInput #fDeposit       placeholder: "Deposit Amount ($)"
//   TextInput #fQty           placeholder: "Quantity"
//   TextInput #fMinDays       placeholder: "Min Rental Days"
//   TextInput #fImage         placeholder: "Main Image URL"
//   TextBox   #fDesc          placeholder: "Description"
//   TextBox   #fImages        placeholder: "Additional image URLs (comma-separated)"
//   TextInput #fNotes         placeholder: "Internal Notes"
//   Toggle    #fAvail         (Available for Rental)
//   Button    #btnSaveItem    "Save Item"
//   Button    #btnCancelForm  "Cancel"
//   Text      #txtSaveMsg     (save confirmation message)
//   Image     #fImgPreview    (image preview — initially hidden)
// ═══════════════════════════════════════════════════════════════

import wixData from 'wix-data';
import wixLocation from 'wix-location';

let allItems    = [];
let allBookings = [];
let editingId   = null;
let calYear, calMonth;

const now = new Date();
calYear  = now.getFullYear();
calMonth = now.getMonth();

const MONTHS = ['January','February','March','April','May','June',
  'July','August','September','October','November','December'];

$w.onReady(async function () {
  setupTabs();
  setupFormHandlers();
  await loadAll();
  showTab('dashboard');
});

// ── TABS ──────────────────────────────────────────────────────
function setupTabs() {
  $w('#btnTabDashboard').onClick(() => showTab('dashboard'));
  $w('#btnTabBookings').onClick(()  => showTab('bookings'));
  $w('#btnTabCalendar').onClick(()  => showTab('calendar'));
  $w('#btnTabInventory').onClick(() => showTab('inventory'));
  $w('#btnTabAddItem').onClick(()   => openAddForm());

  $w('#btnDashViewAll').onClick(() => showTab('bookings'));
  $w('#btnDashManage').onClick(()  => showTab('inventory'));
  $w('#btnInvAdd').onClick(()      => openAddForm());
  $w('#btnCalPrev').onClick(()     => calNav(-1));
  $w('#btnCalNext').onClick(()     => calNav(1));
  $w('#btnBkSearch').onClick(()    => filterBookings());
  $w('#btnInvSearch').onClick(()   => filterInventory());
}

function showTab(name) {
  $w('#msb1').changeState(name);
  if (name === 'calendar') renderCalendar();
}

// ── LOAD DATA ─────────────────────────────────────────────────
async function loadAll() {
  await Promise.all([loadItems(), loadBookings()]);
  renderDashboard();
}

async function loadItems() {
  try {
    const r = await wixData.query('RentalCatalog').ascending('title').limit(200).find();
    allItems = r.items;
    renderInventory(allItems);
    buildCatDropdown();
    $w('#txtInvCount').text = allItems.length + ' items';
  } catch (e) { console.error('Items error', e); }
}

async function loadBookings() {
  try {
    const r = await wixData.query('RentalBookings').descending('_createdDate').limit(200).find();
    allBookings = r.items;
    renderBookings(allBookings);
    $w('#txtBkCount').text = allBookings.length + ' requests';
  } catch (e) { console.error('Bookings error', e); }
}

// ── DASHBOARD ─────────────────────────────────────────────────
function renderDashboard() {
  const pending   = allBookings.filter(b => b.status === 'pending').length;
  const confirmed = allBookings.filter(b => b.status === 'confirmed').length;
  const revenue   = allBookings
    .filter(b => b.status === 'confirmed')
    .reduce((s, b) => s + (b.total || 0), 0);

  $w('#txtPending').text   = String(pending);
  $w('#txtConfirmed').text = String(confirmed);
  $w('#txtItems').text     = String(allItems.length);
  $w('#txtRevenue').text   = '$' + revenue.toFixed(0);

  // Recent 5 bookings in dashboard repeater
  const recent = allBookings.slice(0, 5);
  if (recent.length) {
    $w('#repDashBookings').data = recent;
    $w('#repDashBookings').onItemReady(($item, item) => {
      $item('#txtDBName').text   = (item.firstName || '') + ' ' + (item.lastName || '');
      $item('#txtDBItem').text   = item.itemTitle || '—';
      $item('#txtDBDates').text  = fd(item.startDate) + ' → ' + fd(item.endDate);
      $item('#txtDBTotal').text  = '$' + Number(item.total || 0).toFixed(0);
      $item('#txtDBStatus').text = (item.status || 'pending').toUpperCase();
    });
    $w('#repDashBookings').show();
  } else {
    $w('#repDashBookings').hide();
  }
}

// ── BOOKINGS ──────────────────────────────────────────────────
function renderBookings(bks) {
  if (!bks.length) {
    $w('#txtBkEmpty').show();
    $w('#repBookings').hide();
    return;
  }
  $w('#txtBkEmpty').hide();
  $w('#repBookings').show();
  $w('#repBookings').data = bks;

  $w('#repBookings').onItemReady(($item, item) => {
    $item('#txtBkName').text    = (item.firstName || '') + ' ' + (item.lastName || '');
    $item('#txtBkEmail').text   = item.email || '—';
    $item('#txtBkPhone').text   = item.phone || '—';
    $item('#txtBkItem').text    = item.itemTitle || '—';
    $item('#txtBkQty').text     = 'Qty: ' + (item.quantity || 1);
    $item('#txtBkStart').text   = fd(item.startDate);
    $item('#txtBkEnd').text     = fd(item.endDate);
    $item('#txtBkDays').text    = (item.days || '?') + ' days';
    $item('#txtBkTotal').text   = '$' + Number(item.total || 0).toFixed(2);
    $item('#txtBkDeposit').text = item.depositAmount ? '$' + Number(item.depositAmount).toFixed(2) : 'No deposit';
    $item('#txtBkStatus').text  = (item.status || 'pending').toUpperCase();
    $item('#txtBkNotes').text   = item.notes || 'No notes';
    $item('#txtBkRef').text     = 'Ref: ' + (item._id || '').slice(0, 8).toUpperCase();

    // Show/hide buttons based on status
    if (item.status === 'pending') {
      $item('#btnBkConfirm').show();
      $item('#btnBkDecline').show();
      $item('#btnBkCancel').hide();
    } else if (item.status === 'confirmed') {
      $item('#btnBkConfirm').hide();
      $item('#btnBkDecline').hide();
      $item('#btnBkCancel').show();
    } else {
      $item('#btnBkConfirm').hide();
      $item('#btnBkDecline').hide();
      $item('#btnBkCancel').hide();
    }

    $item('#btnBkConfirm').onClick(() => updateBookingStatus(item._id, 'confirmed'));
    $item('#btnBkDecline').onClick(()  => updateBookingStatus(item._id, 'cancelled'));
    $item('#btnBkCancel').onClick(()   => updateBookingStatus(item._id, 'cancelled'));
  });
}

function filterBookings() {
  const status = $w('#dropBkStatus').value;
  const q = ($w('#inpBkSearch').value || '').toLowerCase();
  const fil = allBookings.filter(b => {
    const sOk = !status || status === 'all' || b.status === status;
    const qOk = !q || [b.firstName, b.lastName, b.email, b.itemTitle].some(f => f?.toLowerCase().includes(q));
    return sOk && qOk;
  });
  $w('#txtBkCount').text = fil.length + ' requests';
  renderBookings(fil);
}

async function updateBookingStatus(id, status) {
  try {
    const item = await wixData.get('RentalBookings', id);
    await wixData.update('RentalBookings', { ...item, status });
    const idx = allBookings.findIndex(b => b._id === id);
    if (idx !== -1) allBookings[idx].status = status;
    filterBookings();
    renderDashboard();
  } catch (e) { console.error('Update status error', e); }
}

// ── CALENDAR ──────────────────────────────────────────────────
function calNav(d) {
  calMonth += d;
  if (calMonth < 0)  { calMonth = 11; calYear--; }
  if (calMonth > 11) { calMonth = 0;  calYear++; }
  renderCalendar();
}

function renderCalendar() {
  $w('#txtCalHead').text = MONTHS[calMonth] + ' ' + calYear;

  const firstDay    = new Date(calYear, calMonth, 1).getDay();
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const today       = new Date(); today.setHours(0, 0, 0, 0);

  // Build booking map for this month
  const bkMap = {};
  allBookings.filter(b => b.status !== 'cancelled').forEach(b => {
    if (!b.startDate || !b.endDate) return;
    let d   = new Date(b.startDate);
    const e = new Date(b.endDate);
    while (d <= e) {
      const k = d.toISOString().split('T')[0];
      if (!bkMap[k]) bkMap[k] = [];
      bkMap[k].push(b.itemTitle || 'Rental');
      d.setDate(d.getDate() + 1);
    }
  });

  // Build calendar data array for repeater
  const calData = [];
  // Empty padding cells
  for (let i = 0; i < firstDay; i++) {
    calData.push({ _id: 'pad-' + i, day: '', bookings: '' });
  }
  // Actual days
  for (let d = 1; d <= daysInMonth; d++) {
    const date  = new Date(calYear, calMonth, d);
    const k     = date.toISOString().split('T')[0];
    const bks   = bkMap[k] || [];
    const isToday = date.toDateString() === today.toDateString();
    calData.push({
      _id:      k,
      day:      isToday ? d + ' ●' : String(d),
      bookings: bks.length ? bks.join(', ') : '',
    });
  }

  $w('#repCalDays').data = calData;
  $w('#repCalDays').onItemReady(($item, item) => {
    $item('#txtCalDay').text      = item.day;
    $item('#txtCalBookings').text = item.bookings;
  });
}

// ── INVENTORY ─────────────────────────────────────────────────
function buildCatDropdown() {
  const cats = [...new Set(allItems.map(i => i.category).filter(Boolean))];
  $w('#dropInvCat').options = [
    { label: 'All Categories', value: 'all' },
    ...cats.map(c => ({ label: c, value: c }))
  ];
}

function filterInventory() {
  const cat = $w('#dropInvCat').value || 'all';
  const q   = ($w('#inpInvSearch').value || '').toLowerCase();
  const fil = allItems.filter(i =>
    (cat === 'all' || i.category === cat) &&
    (!q || [i.title, i.description, i.category].some(f => f?.toLowerCase().includes(q)))
  );
  $w('#txtInvCount').text = fil.length + ' items';
  renderInventory(fil);
}

function renderInventory(items) {
  if (!items.length) {
    $w('#repInventory').hide();
    return;
  }
  $w('#repInventory').show();
  $w('#repInventory').data = items;

  $w('#repInventory').onItemReady(($item, item) => {
    if (item.image) {
      $item('#imgInvItem').src = item.image;
      $item('#imgInvItem').show();
    } else {
      $item('#imgInvItem').hide();
    }

    $item('#txtInvTitle').text   = item.title    || '—';
    $item('#txtInvCat').text     = item.category || '—';
    $item('#txtInvPrice').text   = '$' + Number(item.pricePerDay  || 0).toFixed(0) + '/day';
    $item('#txtInvDeposit').text = item.depositAmount ? '$' + Number(item.depositAmount).toFixed(0) + ' deposit' : 'No deposit';
    $item('#txtInvQty').text     = (item.quantity || 1) + ' available';
    $item('#txtInvMin').text     = 'Min: ' + (item.minDays || 1) + ' day(s)';
    $item('#txtInvStatus').text  = item.available !== false ? 'AVAILABLE' : 'UNAVAILABLE';
    $item('#txtInvNotes').text   = item.notes || '';
    $item('#btnInvToggle').label = item.available !== false ? 'Disable' : 'Enable';

    $item('#btnInvEdit').onClick(()   => openEditForm(item._id));
    $item('#btnInvToggle').onClick(() => toggleItem(item._id));
  });
}

async function toggleItem(id) {
  try {
    const item = await wixData.get('RentalCatalog', id);
    await wixData.update('RentalCatalog', { ...item, available: !(item.available !== false) });
    await loadItems();
    renderDashboard();
  } catch (e) { console.error('Toggle error', e); }
}

// ── ADD / EDIT FORM ───────────────────────────────────────────
function setupFormHandlers() {
  $w('#btnSaveItem').onClick(()   => saveItem());
  $w('#btnCancelForm').onClick(() => showTab('inventory'));
  $w('#fImage').onInput(()        => previewImage());
}

function openAddForm() {
  editingId = null;
  clearForm();
  $w('#txtFormTitle').text = 'Add Rental Item';
  $w('#txtSaveMsg').hide();
  showTab('additem');
}

function openEditForm(id) {
  const item = allItems.find(i => i._id === id);
  if (!item) return;
  editingId = id;
  $w('#txtFormTitle').text = 'Edit: ' + item.title;
  $w('#fTitle').value    = item.title        || '';
  $w('#fCat').value      = item.category     || '';
  $w('#fPrice').value    = String(item.pricePerDay   || '');
  $w('#fDeposit').value  = String(item.depositAmount || '');
  $w('#fQty').value      = String(item.quantity      || 1);
  $w('#fMinDays').value  = String(item.minDays       || 1);
  $w('#fDesc').value     = item.description  || '';
  $w('#fImage').value    = item.image        || '';
  $w('#fImages').value   = item.images       || '';
  $w('#fNotes').value    = item.notes        || '';
  $w('#fAvail').checked  = item.available !== false;
  $w('#txtSaveMsg').hide();
  if (item.image) previewImage();
  showTab('additem');
}

function clearForm() {
  ['fTitle','fCat','fPrice','fDeposit','fQty','fMinDays','fDesc','fImage','fImages','fNotes']
    .forEach(id => { $w('#'+id).value = ''; });
  $w('#fAvail').checked = true;
  $w('#fImgPreview').hide();
}

function previewImage() {
  const url = $w('#fImage').value;
  if (url && url.startsWith('http')) {
    $w('#fImgPreview').src = url;
    $w('#fImgPreview').show();
  } else {
    $w('#fImgPreview').hide();
  }
}

async function saveItem() {
  const title = $w('#fTitle').value.trim();
  const price = $w('#fPrice').value;

  if (!title) { showSaveMsg('⚠ Item name is required'); return; }
  if (!price)  { showSaveMsg('⚠ Price per day is required'); return; }

  $w('#btnSaveItem').disable();
  $w('#btnSaveItem').label = 'Saving…';

  const data = {
    title,
    category:      $w('#fCat').value.trim(),
    pricePerDay:   Number(price),
    depositAmount: Number($w('#fDeposit').value)  || 0,
    quantity:      Number($w('#fQty').value)      || 1,
    minDays:       Number($w('#fMinDays').value)  || 1,
    description:   $w('#fDesc').value.trim(),
    image:         $w('#fImage').value.trim(),
    images:        $w('#fImages').value.trim(),
    notes:         $w('#fNotes').value.trim(),
    available:     $w('#fAvail').checked,
  };

  try {
    if (editingId) {
      await wixData.update('RentalCatalog', { ...data, _id: editingId });
      showSaveMsg('✓ Item updated successfully!');
    } else {
      await wixData.insert('RentalCatalog', data);
      showSaveMsg('✓ Item added! Wix Booking service is being created automatically…');
      clearForm();
      editingId = null;
      $w('#txtFormTitle').text = 'Add Rental Item';
    }
    await loadItems();
    renderDashboard();
  } catch (e) {
    showSaveMsg('⚠ Error: ' + e.message);
  } finally {
    $w('#btnSaveItem').enable();
    $w('#btnSaveItem').label = 'Save Item';
  }
}

function showSaveMsg(msg) {
  $w('#txtSaveMsg').text = msg;
  $w('#txtSaveMsg').show();
}

// ── HELPERS ───────────────────────────────────────────────────
function fd(d) {
  if (!d) return '—';
  try { return new Date(d).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}); }
  catch (e) { return '—'; }
}
