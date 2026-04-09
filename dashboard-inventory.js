// ═══════════════════════════════════════════════════════════════
// VELO — Dashboard Page: Inventory
// Page name: "Rental Inventory"  |  URL: /rental-inventory
// ═══════════════════════════════════════════════════════════════
// ELEMENTS TO ADD IN EDITOR:
//   Button    #btnAdd        — "+ Add Item"
//   Dropdown  #dropCategory
//   Input     #inpSearch
//   Repeater  #repItems
//     └─ inside each cell:
//        Image  #imgItem
//        Text   #txtTitle, #txtCategory, #txtPrice, #txtDeposit
//        Text   #txtQty, #txtMinDays, #txtStatus, #txtNotes
//        Button #btnEdit     — "Edit"
//        Button #btnToggle   — "Enable / Disable"
//        Button #btnDelete   — "Delete"
//   Text   #txtEmpty
//   Text   #txtCount
//
//   — LIGHTBOX or Section for the form: "addEditForm"
//   Input  #inpTitle, #inpCategory, #inpQuantity
//   Input  #inpPrice, #inpDeposit, #inpMinDays, #inpMaxDays
//   TextInput #inpImage, #inpImages
//   TextBox #taDesc, #taNotes
//   Toggle  #togAvailable
//   Button  #btnSave, #btnFormCancel
//   Text   #txtFormTitle
// ═══════════════════════════════════════════════════════════════

import wixData from 'wix-data';

let allItems   = [];
let editingId  = null;

$w.onReady(async function () {
  $w('#addEditForm').hide();
  await loadItems();

  $w('#btnAdd').onClick(() => openForm(null));
  $w('#dropCategory').onChange(() => applyFilter());
  $w('#inpSearch').onInput(() => applyFilter());
  $w('#btnSave').onClick(() => saveItem());
  $w('#btnFormCancel').onClick(() => $w('#addEditForm').hide());
});

async function loadItems() {
  try {
    const results = await wixData.query('RentalCatalog')
      .ascending('title')
      .find();

    allItems = results.items;
    buildCategoryDropdown();
    renderItems(allItems);
  } catch (e) {
    console.error('Load items error', e);
  }
}

function buildCategoryDropdown() {
  const cats = [...new Set(allItems.map(i => i.category).filter(Boolean))];
  $w('#dropCategory').options = [
    { label: 'All Categories', value: 'all' },
    ...cats.map(c => ({ label: c, value: c }))
  ];
}

function applyFilter() {
  const cat = $w('#dropCategory').value;
  const q   = ($w('#inpSearch').value || '').toLowerCase();

  const filtered = allItems.filter(i => {
    const catOk = !cat || cat === 'all' || i.category === cat;
    const qOk   = !q || [i.title, i.description, i.category]
      .some(f => f?.toLowerCase().includes(q));
    return catOk && qOk;
  });

  renderItems(filtered);
}

function renderItems(items) {
  $w('#txtCount').text = items.length + ' items';

  if (!items.length) {
    $w('#txtEmpty').show();
    $w('#repItems').hide();
    return;
  }

  $w('#txtEmpty').hide();
  $w('#repItems').show();
  $w('#repItems').data = items;

  $w('#repItems').onItemReady(($item, item) => {
    // Image
    if (item.image) {
      $item('#imgItem').src = item.image;
      $item('#imgItem').show();
    } else {
      $item('#imgItem').hide();
    }

    // Details
    $item('#txtTitle').text    = item.title      || '—';
    $item('#txtCategory').text = item.category   || '—';
    $item('#txtPrice').text    = '$' + Number(item.pricePerDay || 0).toFixed(0) + '/day';
    $item('#txtDeposit').text  = item.depositAmount ? '$' + Number(item.depositAmount).toFixed(0) + ' deposit' : 'No deposit';
    $item('#txtQty').text      = (item.quantity || 1) + ' available';
    $item('#txtMinDays').text  = 'Min: ' + (item.minDays || 1) + ' day(s)';
    $item('#txtStatus').text   = item.available !== false ? 'AVAILABLE' : 'UNAVAILABLE';
    $item('#txtNotes').text    = item.notes || '';

    // Toggle button label
    $item('#btnToggle').label  = item.available !== false ? 'Disable' : 'Enable';

    // Actions
    $item('#btnEdit').onClick(()   => openForm(item._id));
    $item('#btnToggle').onClick(() => toggleAvailability(item._id));
    $item('#btnDelete').onClick(() => deleteItem(item._id));
  });
}

// ── FORM ──────────────────────────────────────────────
function openForm(id) {
  editingId = id;

  if (id) {
    const item = allItems.find(i => i._id === id);
    if (!item) return;
    $w('#txtFormTitle').text    = 'Edit: ' + item.title;
    $w('#inpTitle').value       = item.title       || '';
    $w('#inpCategory').value    = item.category    || '';
    $w('#inpQuantity').value    = String(item.quantity  || 1);
    $w('#inpPrice').value       = String(item.pricePerDay || '');
    $w('#inpDeposit').value     = String(item.depositAmount || '');
    $w('#inpMinDays').value     = String(item.minDays  || 1);
    $w('#inpMaxDays').value     = String(item.maxDays  || '');
    $w('#taDesc').value         = item.description  || '';
    $w('#inpImage').value       = item.image        || '';
    $w('#inpImages').value      = item.images       || '';
    $w('#taNotes').value        = item.notes        || '';
    $w('#togAvailable').checked = item.available !== false;
  } else {
    $w('#txtFormTitle').text    = 'Add New Rental Item';
    $w('#inpTitle').value       = '';
    $w('#inpCategory').value    = '';
    $w('#inpQuantity').value    = '1';
    $w('#inpPrice').value       = '';
    $w('#inpDeposit').value     = '';
    $w('#inpMinDays').value     = '1';
    $w('#inpMaxDays').value     = '';
    $w('#taDesc').value         = '';
    $w('#inpImage').value       = '';
    $w('#inpImages').value      = '';
    $w('#taNotes').value        = '';
    $w('#togAvailable').checked = true;
  }

  $w('#addEditForm').show();
}

async function saveItem() {
  const title = $w('#inpTitle').value.trim();
  const price = $w('#inpPrice').value;

  if (!title) { console.warn('Title required'); return; }
  if (!price)  { console.warn('Price required'); return; }

  $w('#btnSave').disable();
  $w('#btnSave').label = 'Saving…';

  const data = {
    title,
    category:      $w('#inpCategory').value.trim(),
    quantity:      Number($w('#inpQuantity').value) || 1,
    pricePerDay:   Number(price),
    depositAmount: Number($w('#inpDeposit').value)  || 0,
    minDays:       Number($w('#inpMinDays').value)  || 1,
    maxDays:       Number($w('#inpMaxDays').value)  || undefined,
    description:   $w('#taDesc').value.trim(),
    image:         $w('#inpImage').value.trim(),
    images:        $w('#inpImages').value.trim(),
    notes:         $w('#taNotes').value.trim(),
    available:     $w('#togAvailable').checked,
  };

  try {
    if (editingId) {
      await wixData.update('RentalCatalog', { ...data, _id: editingId });
    } else {
      await wixData.insert('RentalCatalog', data);
      // Note: data.js hook will auto-create the Wix Bookings service
    }

    $w('#addEditForm').hide();
    await loadItems();
  } catch (e) {
    console.error('Save error', e);
  } finally {
    $w('#btnSave').enable();
    $w('#btnSave').label = 'Save Item';
  }
}

async function toggleAvailability(id) {
  try {
    const item = await wixData.get('RentalCatalog', id);
    const updated = { ...item, available: !(item.available !== false) };
    await wixData.update('RentalCatalog', updated);
    await loadItems();
  } catch (e) {
    console.error('Toggle error', e);
  }
}

async function deleteItem(id) {
  // Simple confirm via Wix
  try {
    await wixData.remove('RentalCatalog', id);
    allItems = allItems.filter(i => i._id !== id);
    renderItems(allItems);
  } catch (e) {
    console.error('Delete error', e);
  }
}
