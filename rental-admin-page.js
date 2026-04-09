// ═══════════════════════════════════════════════════════════════
// VELO — Rental Admin App (Single Dashboard Page)
// HOW TO INSTALL (3 steps):
//  1. Wix Editor → Pages → + → Dashboard Page → name it "Rental Admin"
//  2. Click the page code icon { } → paste this entire file
//  3. Publish
// That's it. The app renders itself — no extra elements needed.
// ═══════════════════════════════════════════════════════════════

import wixData from 'wix-data';
import wixWindow from 'wix-window';

// ── RENDER THE FULL APP INTO THE PAGE ─────────────────────────
$w.onReady(function () {
  injectStyles();
  renderApp();
});

function renderApp() {
  // Wix dashboard pages allow injecting into the body
  const root = document.createElement('div');
  root.id = 'gRentalAdmin';
  document.body.appendChild(root);
  root.innerHTML = appShell();
  bindNav();
  loadAll();
}

// ── HTML SHELL ────────────────────────────────────────────────
function appShell() {
  return `
  <div class="ga-layout">
    <aside class="ga-sidebar">
      <div class="ga-logo">
        <div class="ga-logo-name">Gardenia</div>
        <div class="ga-logo-sub">Rental Admin</div>
      </div>
      <nav class="ga-nav">
        <div class="ga-nav-section">Overview</div>
        <a class="ga-nav-link active" data-page="overview">📊 Dashboard</a>
        <div class="ga-nav-section">Rentals</div>
        <a class="ga-nav-link" data-page="bookings">📋 Bookings <span class="ga-badge" id="pendingBadge"></span></a>
        <a class="ga-nav-link" data-page="calendar">📅 Calendar</a>
        <div class="ga-nav-section">Catalog</div>
        <a class="ga-nav-link" data-page="inventory">🗂 Inventory</a>
        <a class="ga-nav-link" id="navAddItem" data-page="additem">➕ Add Item</a>
        <div class="ga-nav-section">Quick Links</div>
        <a class="ga-nav-ext" href="https://manage.wix.com/dashboard/790788cd-d7a3-4a0f-8a8a-73630a12e2a0/cms/RentalCatalog" target="_blank">🗃 CMS Catalog ↗</a>
        <a class="ga-nav-ext" href="https://manage.wix.com/dashboard/790788cd-d7a3-4a0f-8a8a-73630a12e2a0/bookings-app" target="_blank">📆 Wix Bookings ↗</a>
        <a class="ga-nav-ext" href="https://www.gardeniaeventdecor.com" target="_blank">🌐 Live Site ↗</a>
      </nav>
    </aside>

    <main class="ga-main">

      <!-- OVERVIEW -->
      <div class="ga-page" id="page-overview">
        <div class="ga-topbar">
          <div><div class="ga-page-title">Dashboard</div><div class="ga-page-sub" id="dashDate"></div></div>
          <button class="ga-btn ga-btn-primary" onclick="showPage('additem')">+ Add Rental Item</button>
        </div>
        <div class="ga-stats" id="statsRow">
          <div class="ga-stat"><div class="ga-stat-lbl">Pending</div><div class="ga-stat-val amber" id="sPending">—</div><div class="ga-stat-sub">awaiting response</div></div>
          <div class="ga-stat"><div class="ga-stat-lbl">Confirmed</div><div class="ga-stat-val green" id="sConfirmed">—</div><div class="ga-stat-sub">this month</div></div>
          <div class="ga-stat"><div class="ga-stat-lbl">Catalog Items</div><div class="ga-stat-val" id="sItems">—</div><div class="ga-stat-sub">in inventory</div></div>
          <div class="ga-stat"><div class="ga-stat-lbl">Revenue</div><div class="ga-stat-val green" id="sRevenue">—</div><div class="ga-stat-sub">confirmed bookings</div></div>
        </div>
        <div class="ga-panel">
          <div class="ga-panel-head"><span class="ga-panel-title">Recent Requests</span><button class="ga-btn ga-btn-sm ga-btn-outline" onclick="showPage('bookings')">View All</button></div>
          <div id="dashBookings"><div class="ga-loading"><div class="ga-spin"></div> Loading…</div></div>
        </div>
        <div class="ga-panel">
          <div class="ga-panel-head"><span class="ga-panel-title">Inventory</span><button class="ga-btn ga-btn-sm ga-btn-outline" onclick="showPage('inventory')">Manage</button></div>
          <div id="dashInventory"><div class="ga-loading"><div class="ga-spin"></div> Loading…</div></div>
        </div>
      </div>

      <!-- BOOKINGS -->
      <div class="ga-page" id="page-bookings" style="display:none">
        <div class="ga-topbar">
          <div><div class="ga-page-title">Booking Requests</div><div class="ga-page-sub" id="bookingCount"></div></div>
          <div class="ga-filters">
            <select class="ga-sel" id="bkStatus" onchange="filterBookings()">
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="cancelled">Cancelled</option>
            </select>
            <input class="ga-inp" type="text" id="bkSearch" placeholder="Search…" oninput="filterBookings()">
          </div>
        </div>
        <div class="ga-panel">
          <div id="bookingsTable"><div class="ga-loading"><div class="ga-spin"></div> Loading…</div></div>
        </div>
      </div>

      <!-- CALENDAR -->
      <div class="ga-page" id="page-calendar" style="display:none">
        <div class="ga-topbar">
          <div><div class="ga-page-title">Rental Calendar</div></div>
          <div style="display:flex;gap:8px;align-items:center">
            <button class="ga-btn ga-btn-sm ga-btn-outline" onclick="calNav(-1)">‹</button>
            <span id="calHead" style="font-weight:600;min-width:140px;text-align:center"></span>
            <button class="ga-btn ga-btn-sm ga-btn-outline" onclick="calNav(1)">›</button>
          </div>
        </div>
        <div class="ga-panel"><div class="ga-panel-body" id="calGrid"></div></div>
      </div>

      <!-- INVENTORY -->
      <div class="ga-page" id="page-inventory" style="display:none">
        <div class="ga-topbar">
          <div><div class="ga-page-title">Inventory</div><div class="ga-page-sub" id="invCount"></div></div>
          <div class="ga-filters">
            <select class="ga-sel" id="invCat" onchange="filterInv()"><option value="all">All Categories</option></select>
            <input class="ga-inp" type="text" id="invSearch" placeholder="Search…" oninput="filterInv()">
            <button class="ga-btn ga-btn-primary" onclick="showPage('additem')">+ Add Item</button>
          </div>
        </div>
        <div class="ga-panel">
          <div id="invTable"><div class="ga-loading"><div class="ga-spin"></div> Loading…</div></div>
        </div>
      </div>

      <!-- ADD / EDIT ITEM -->
      <div class="ga-page" id="page-additem" style="display:none">
        <div class="ga-topbar">
          <div><div class="ga-page-title" id="formPageTitle">Add Rental Item</div><div class="ga-page-sub">Fill in the details and save — a Wix Booking service is created automatically</div></div>
          <button class="ga-btn ga-btn-outline" onclick="showPage('inventory')">← Back</button>
        </div>
        <div class="ga-panel" style="max-width:640px">
          <div class="ga-panel-body">
            <input type="hidden" id="editId">
            <div class="ga-form-2">
              <div class="ga-form-row"><label class="ga-lbl">Item Name *</label><input class="ga-inp" id="fTitle" placeholder="e.g. Gold Arch, Crystal Candelabra"></div>
              <div class="ga-form-row"><label class="ga-lbl">Category *</label><input class="ga-inp" id="fCat" placeholder="Arches, Lighting, Furniture…"></div>
            </div>
            <div class="ga-form-2">
              <div class="ga-form-row"><label class="ga-lbl">Price Per Day ($) *</label><input class="ga-inp" id="fPrice" type="number" placeholder="150"></div>
              <div class="ga-form-row"><label class="ga-lbl">Deposit Amount ($)</label><input class="ga-inp" id="fDeposit" type="number" placeholder="50"></div>
            </div>
            <div class="ga-form-2">
              <div class="ga-form-row"><label class="ga-lbl">Quantity Available</label><input class="ga-inp" id="fQty" type="number" placeholder="1" min="1"></div>
              <div class="ga-form-row"><label class="ga-lbl">Minimum Rental Days</label><input class="ga-inp" id="fMinDays" type="number" placeholder="1" min="1"></div>
            </div>
            <div class="ga-form-row"><label class="ga-lbl">Description</label><textarea class="ga-ta" id="fDesc" placeholder="Describe the item — dimensions, style, what's included…"></textarea></div>
            <div class="ga-form-row"><label class="ga-lbl">Main Image URL</label><input class="ga-inp" id="fImage" type="url" placeholder="https://…" oninput="previewFImg()"><img id="fImgPreview" style="display:none;width:100%;height:140px;object-fit:cover;border-radius:4px;margin-top:6px;border:1px solid #e4e4e4"></div>
            <div class="ga-form-row"><label class="ga-lbl">Additional Images <span style="font-weight:300;text-transform:none">(comma-separated URLs)</span></label><textarea class="ga-ta" id="fImages" placeholder="https://…, https://…" style="min-height:50px"></textarea></div>
            <div class="ga-form-row"><label class="ga-lbl">Internal Notes</label><input class="ga-inp" id="fNotes" placeholder="Storage, fragile, setup notes…"></div>
            <div class="ga-toggle-row">
              <span class="ga-toggle-lbl">Available for Rental</span>
              <label class="ga-toggle"><input type="checkbox" id="fAvail" checked><span class="ga-toggle-slider"></span></label>
            </div>
            <div style="display:flex;gap:10px;margin-top:20px">
              <button class="ga-btn ga-btn-outline" onclick="showPage('inventory')">Cancel</button>
              <button class="ga-btn ga-btn-primary" id="saveBtn" onclick="saveItem()">Save Item</button>
            </div>
            <div id="saveMsg" style="margin-top:10px;font-size:11px;display:none"></div>
          </div>
        </div>
      </div>

    </main>
  </div>

  <!-- BOOKING DETAIL OVERLAY -->
  <div class="ga-overlay" id="bkOverlay" onclick="closeBkDetail(event)">
    <div class="ga-drawer">
      <div class="ga-drawer-head">
        <span style="font-size:14px;font-weight:600">Booking Detail</span>
        <button class="ga-btn ga-btn-sm ga-btn-outline" onclick="closeBkDetail()">✕</button>
      </div>
      <div class="ga-drawer-body" id="bkDetailBody"></div>
      <div class="ga-drawer-foot" id="bkDetailFoot"></div>
    </div>
  </div>
  `;
}

// ── DATA ──────────────────────────────────────────────
let allItems = [], allBookings = [];
let calYear, calMonth;
const now = new Date();
calYear = now.getFullYear(); calMonth = now.getMonth();

async function loadAll() {
  document.getElementById('dashDate').textContent = now.toLocaleDateString('en-US',{weekday:'long',year:'numeric',month:'long',day:'numeric'});
  await Promise.all([loadItems(), loadBookings()]);
  renderStats();
  renderDashPanels();
}

async function loadItems() {
  try {
    const r = await wixData.query('RentalCatalog').ascending('title').limit(200).find();
    allItems = r.items;
    renderInvTable(allItems);
    buildInvCatFilter();
    document.getElementById('invCount').textContent = allItems.length + ' items';
  } catch(e) { console.error(e); }
}

async function loadBookings() {
  try {
    const r = await wixData.query('RentalBookings').descending('_createdDate').limit(200).find();
    allBookings = r.items;
    renderBookingsTable(allBookings);
    updatePendingBadge();
    document.getElementById('bookingCount').textContent = allBookings.length + ' total requests';
  } catch(e) { console.error(e); }
}

// ── STATS ─────────────────────────────────────────────
function renderStats() {
  const pending   = allBookings.filter(b=>b.status==='pending').length;
  const confirmed = allBookings.filter(b=>b.status==='confirmed').length;
  const revenue   = allBookings.filter(b=>b.status==='confirmed').reduce((s,b)=>s+(b.total||0),0);
  document.getElementById('sPending').textContent   = pending;
  document.getElementById('sConfirmed').textContent = confirmed;
  document.getElementById('sItems').textContent     = allItems.length;
  document.getElementById('sRevenue').textContent   = '$'+revenue.toFixed(0);
}

function updatePendingBadge() {
  const n = allBookings.filter(b=>b.status==='pending').length;
  const el = document.getElementById('pendingBadge');
  if(el){ el.textContent = n||''; el.style.display = n ? '' : 'none'; }
}

function renderDashPanels() {
  // Recent bookings
  const recent = allBookings.slice(0,5);
  document.getElementById('dashBookings').innerHTML = recent.length
    ? bookingTableHtml(recent, true)
    : emptyHtml('No booking requests yet','Requests will appear here when customers submit the form');

  // Inventory summary
  document.getElementById('dashInventory').innerHTML = allItems.length
    ? `<table class="ga-tbl"><thead><tr><th>Item</th><th>Category</th><th>Rate</th><th>Status</th></tr></thead><tbody>`+
      allItems.slice(0,6).map(i=>`<tr><td><b>${i.title||'—'}</b></td><td>${i.category||'—'}</td><td>$${Number(i.pricePerDay||0).toFixed(0)}/day</td><td><span class="ga-pill ${i.available!==false?'pill-ok':'pill-off'}">${i.available!==false?'Available':'Off'}</span></td></tr>`).join('')
      +`</tbody></table>`
    : emptyHtml('No items in catalog','Click "+ Add Item" to create your first rental');
}

// ── BOOKINGS ──────────────────────────────────────────
function renderBookingsTable(bks) {
  document.getElementById('bookingsTable').innerHTML = bks.length
    ? bookingTableHtml(bks, false)
    : emptyHtml('No booking requests','They will appear here when customers submit the rental form');
}

function bookingTableHtml(bks, compact) {
  return `<div style="overflow-x:auto"><table class="ga-tbl">
    <thead><tr><th>Submitted</th><th>Customer</th><th>Item</th><th>Dates</th><th>Total</th><th>Status</th><th></th></tr></thead>
    <tbody>${bks.map(b=>`<tr>
      <td style="white-space:nowrap;font-size:11px">${fd(b._createdDate||b.submittedAt)}</td>
      <td><div style="font-weight:500">${b.firstName||''} ${b.lastName||''}</div><div style="font-size:11px;color:#777">${b.email||''}</div></td>
      <td><div style="font-weight:500">${b.itemTitle||'—'}</div><div style="font-size:11px;color:#777">Qty: ${b.quantity||1}</div></td>
      <td style="white-space:nowrap;font-size:11px">${fd(b.startDate)}<br>→ ${fd(b.endDate)}</td>
      <td><b>$${Number(b.total||0).toFixed(0)}</b></td>
      <td><span class="ga-pill pill-${b.status||'pending'}">${(b.status||'pending').toUpperCase()}</span></td>
      <td><button class="ga-btn ga-btn-sm ga-btn-outline" onclick="openBkDetail('${b._id}')">View</button></td>
    </tr>`).join('')}</tbody>
  </table></div>`;
}

function filterBookings() {
  const status = document.getElementById('bkStatus').value;
  const q = document.getElementById('bkSearch').value.toLowerCase();
  const fil = allBookings.filter(b=>{
    const sOk = status==='all'||b.status===status;
    const qOk = !q||[b.firstName,b.lastName,b.email,b.itemTitle].some(f=>f?.toLowerCase().includes(q));
    return sOk&&qOk;
  });
  document.getElementById('bookingsTable').innerHTML = fil.length ? bookingTableHtml(fil,false) : emptyHtml('No results','Try different filters');
  document.getElementById('bookingCount').textContent = fil.length + ' requests';
}

function openBkDetail(id) {
  const b = allBookings.find(x=>x._id===id); if(!b)return;
  document.getElementById('bkDetailBody').innerHTML = `
    <div class="ga-detail-grid">
      <div><div class="ga-lbl">Customer</div><div style="font-weight:500">${b.firstName} ${b.lastName}</div><div style="color:#777;font-size:11px">${b.email}</div>${b.phone?`<div style="color:#777;font-size:11px">${b.phone}</div>`:''}</div>
      <div><div class="ga-lbl">Status</div><span class="ga-pill pill-${b.status||'pending'}">${(b.status||'pending').toUpperCase()}</span></div>
      <div><div class="ga-lbl">Item</div><div style="font-weight:500">${b.itemTitle||'—'}</div><div style="font-size:11px;color:#777">Qty: ${b.quantity||1}</div></div>
      <div><div class="ga-lbl">Rental Dates</div><div>${fd(b.startDate)} → ${fd(b.endDate)}</div><div style="font-size:11px;color:#777">${b.days||'?'} days</div></div>
      <div><div class="ga-lbl">Total</div><div style="font-size:22px;font-weight:600">$${Number(b.total||0).toFixed(2)}</div></div>
      <div><div class="ga-lbl">Deposit</div><div>${b.depositAmount?'$'+Number(b.depositAmount).toFixed(2):'—'}</div></div>
    </div>
    ${b.notes?`<div style="margin-top:12px"><div class="ga-lbl">Event Notes</div><div style="background:#f8f8f8;padding:10px;border-radius:4px;font-size:12px">${b.notes}</div></div>`:''}
    <div style="font-size:10px;color:#bbb;margin-top:12px">Ref: ${(b._id||'').slice(0,8).toUpperCase()} · Submitted: ${fd(b.submittedAt||b._createdDate)}</div>`;
  document.getElementById('bkDetailFoot').innerHTML = `
    <button class="ga-btn ga-btn-outline" onclick="closeBkDetail()">Close</button>
    ${b.status==='pending'?`<button class="ga-btn" style="background:#943030;color:#fff" onclick="updateBkStatus('${b._id}','cancelled')">✗ Decline</button><button class="ga-btn" style="background:#2e6e4a;color:#fff" onclick="updateBkStatus('${b._id}','confirmed')">✓ Confirm</button>`:''}
    ${b.status==='confirmed'?`<button class="ga-btn" style="background:#943030;color:#fff" onclick="updateBkStatus('${b._id}','cancelled')">Cancel Booking</button>`:''}`;
  document.getElementById('bkOverlay').style.opacity='1';
  document.getElementById('bkOverlay').style.pointerEvents='all';
}

function closeBkDetail(e) {
  if(e&&e.target!==document.getElementById('bkOverlay'))return;
  document.getElementById('bkOverlay').style.opacity='0';
  document.getElementById('bkOverlay').style.pointerEvents='none';
}

async function updateBkStatus(id, status) {
  try {
    const item = await wixData.get('RentalBookings', id);
    await wixData.update('RentalBookings', {...item, status});
    const idx = allBookings.findIndex(b=>b._id===id);
    if(idx!==-1) allBookings[idx].status = status;
    document.getElementById('bkOverlay').style.opacity='0';
    document.getElementById('bkOverlay').style.pointerEvents='none';
    renderBookingsTable(allBookings);
    renderStats();
    updatePendingBadge();
    renderDashPanels();
    toast('Status updated: '+status);
  } catch(e) { toast('Error: '+e.message, true); }
}

// ── CALENDAR ──────────────────────────────────────────
const MONTHS=['January','February','March','April','May','June','July','August','September','October','November','December'];
const WDAYS=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

function calNav(d){ calMonth+=d; if(calMonth<0){calMonth=11;calYear--;} if(calMonth>11){calMonth=0;calYear++;} renderCalendar(); }

function renderCalendar() {
  document.getElementById('calHead').textContent = MONTHS[calMonth]+' '+calYear;
  const firstDay = new Date(calYear,calMonth,1).getDay();
  const daysInMonth = new Date(calYear,calMonth+1,0).getDate();
  const today = new Date(); today.setHours(0,0,0,0);

  // Build booking map
  const bkMap = {};
  allBookings.filter(b=>b.status!=='cancelled').forEach(b=>{
    if(!b.startDate||!b.endDate)return;
    let d = new Date(b.startDate);
    const end = new Date(b.endDate);
    while(d<=end){ const k=d.toISOString().split('T')[0]; if(!bkMap[k])bkMap[k]=[]; bkMap[k].push(b); d.setDate(d.getDate()+1); }
  });

  let html = `<div style="display:grid;grid-template-columns:repeat(7,1fr);gap:3px">`;
  WDAYS.forEach(d=>{ html+=`<div style="font-size:9px;font-weight:600;text-align:center;color:#bbb;padding:4px 0;text-transform:uppercase">${d}</div>`; });
  for(let i=0;i<firstDay;i++) html+=`<div></div>`;
  for(let d=1;d<=daysInMonth;d++){
    const date=new Date(calYear,calMonth,d);
    const k=date.toISOString().split('T')[0];
    const bks=bkMap[k]||[];
    const isToday=date.toDateString()===today.toDateString();
    const isPast=date<today;
    html+=`<div style="border:1px solid ${isToday?'#111':bks.length?'#2e6e4a':'#e4e4e4'};border-radius:4px;padding:5px;min-height:60px;background:${bks.length?'#f0f7f4':isPast?'#fafafa':'#fff'}">
      <div style="font-size:11px;font-weight:${isToday?700:400};margin-bottom:3px">${d}</div>
      ${bks.map(b=>`<div style="font-size:9px;background:#2e6e4a;color:#fff;border-radius:2px;padding:1px 4px;margin-bottom:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${b.itemTitle||'Rental'}</div>`).join('')}
    </div>`;
  }
  html+=`</div>`;
  document.getElementById('calGrid').innerHTML=html;
}

// ── INVENTORY ─────────────────────────────────────────
function buildInvCatFilter() {
  const cats=[...new Set(allItems.map(i=>i.category).filter(Boolean))];
  const sel=document.getElementById('invCat');
  if(sel) sel.innerHTML='<option value="all">All Categories</option>'+cats.map(c=>`<option value="${c}">${c}</option>`).join('');
}

function filterInv() {
  const cat = document.getElementById('invCat').value;
  const q = document.getElementById('invSearch').value.toLowerCase();
  const fil = allItems.filter(i=>(cat==='all'||i.category===cat)&&(!q||[i.title,i.description,i.category].some(f=>f?.toLowerCase().includes(q))));
  renderInvTable(fil);
  document.getElementById('invCount').textContent = fil.length+' items';
}

function renderInvTable(items) {
  document.getElementById('invTable').innerHTML = items.length
    ? `<div style="overflow-x:auto"><table class="ga-tbl">
        <thead><tr><th>Item</th><th>Category</th><th>Rate/Day</th><th>Deposit</th><th>Min Days</th><th>Qty</th><th>Status</th><th></th></tr></thead>
        <tbody>${items.map(i=>`<tr>
          <td>
            <div style="display:flex;align-items:center;gap:9px">
              ${i.image?`<img src="${i.image}" style="width:36px;height:36px;object-fit:cover;border-radius:4px;border:1px solid #e4e4e4" onerror="this.style.display='none'">`:''}
              <div><div style="font-weight:500">${i.title||'—'}</div>${i.notes?`<div style="font-size:10px;color:#bbb">${i.notes}</div>`:''}</div>
            </div>
          </td>
          <td>${i.category||'—'}</td>
          <td>$${Number(i.pricePerDay||0).toFixed(0)}</td>
          <td>${i.depositAmount?'$'+Number(i.depositAmount).toFixed(0):'—'}</td>
          <td>${i.minDays||1}</td>
          <td>${i.quantity||1}</td>
          <td><span class="ga-pill ${i.available!==false?'pill-ok':'pill-off'}">${i.available!==false?'Available':'Off'}</span></td>
          <td style="white-space:nowrap">
            <button class="ga-btn ga-btn-sm ga-btn-outline" onclick="editItem('${i._id}')">Edit</button>
            <button class="ga-btn ga-btn-sm ga-btn-outline" style="margin-left:4px" onclick="toggleItem('${i._id}')">${i.available!==false?'Disable':'Enable'}</button>
          </td>
        </tr>`).join('')}</tbody>
      </table></div>`
    : emptyHtml('No items found','Try adjusting filters or add a new item');
}

// ── ITEM FORM ─────────────────────────────────────────
function clearForm() {
  ['editId','fTitle','fCat','fPrice','fDeposit','fQty','fMinDays','fDesc','fImage','fImages','fNotes'].forEach(id=>{ const el=document.getElementById(id); if(el)el.value=''; });
  const av=document.getElementById('fAvail'); if(av)av.checked=true;
  const pr=document.getElementById('fImgPreview'); if(pr)pr.style.display='none';
  const msg=document.getElementById('saveMsg'); if(msg)msg.style.display='none';
}

function editItem(id) {
  const item = allItems.find(i=>i._id===id); if(!item)return;
  clearForm();
  document.getElementById('editId').value     = item._id||'';
  document.getElementById('fTitle').value     = item.title||'';
  document.getElementById('fCat').value       = item.category||'';
  document.getElementById('fPrice').value     = item.pricePerDay||'';
  document.getElementById('fDeposit').value   = item.depositAmount||'';
  document.getElementById('fQty').value       = item.quantity||1;
  document.getElementById('fMinDays').value   = item.minDays||1;
  document.getElementById('fDesc').value      = item.description||'';
  document.getElementById('fImage').value     = item.image||'';
  document.getElementById('fImages').value    = item.images||'';
  document.getElementById('fNotes').value     = item.notes||'';
  document.getElementById('fAvail').checked   = item.available!==false;
  if(item.image) previewFImg();
  document.getElementById('formPageTitle').textContent = 'Edit: '+item.title;
  showPage('additem');
}

function previewFImg() {
  const url = document.getElementById('fImage').value;
  const pr  = document.getElementById('fImgPreview');
  if(url && url.startsWith('http')){ pr.src=url; pr.style.display='block'; }
  else pr.style.display='none';
}

async function saveItem() {
  const title = document.getElementById('fTitle').value.trim();
  const price = document.getElementById('fPrice').value;
  if(!title){ showSaveMsg('Item name is required','red'); return; }
  if(!price){ showSaveMsg('Price per day is required','red'); return; }

  const btn = document.getElementById('saveBtn');
  btn.textContent='Saving…'; btn.disabled=true;

  const id = document.getElementById('editId').value;
  const data = {
    title,
    category:      document.getElementById('fCat').value.trim(),
    pricePerDay:   Number(price),
    depositAmount: Number(document.getElementById('fDeposit').value)||0,
    quantity:      Number(document.getElementById('fQty').value)||1,
    minDays:       Number(document.getElementById('fMinDays').value)||1,
    description:   document.getElementById('fDesc').value.trim(),
    image:         document.getElementById('fImage').value.trim(),
    images:        document.getElementById('fImages').value.trim(),
    notes:         document.getElementById('fNotes').value.trim(),
    available:     document.getElementById('fAvail').checked,
  };

  try {
    if(id) {
      await wixData.update('RentalCatalog', {...data, _id: id});
      showSaveMsg('✓ Item updated!','green');
    } else {
      await wixData.insert('RentalCatalog', data);
      showSaveMsg('✓ Item added! Wix Booking service is being created automatically…','green');
      clearForm();
      document.getElementById('formPageTitle').textContent='Add Rental Item';
    }
    await loadItems();
    renderStats();
    renderDashPanels();
  } catch(e) {
    showSaveMsg('Error: '+e.message,'red');
  } finally {
    btn.textContent='Save Item'; btn.disabled=false;
  }
}

function showSaveMsg(msg, color) {
  const el = document.getElementById('saveMsg');
  el.textContent = msg;
  el.style.color = color==='green'?'#2e6e4a':'#943030';
  el.style.display = 'block';
}

async function toggleItem(id) {
  try {
    const item = await wixData.get('RentalCatalog', id);
    await wixData.update('RentalCatalog', {...item, available: !(item.available!==false)});
    await loadItems();
    renderDashPanels();
    renderStats();
    toast('Item updated');
  } catch(e) { toast('Error: '+e.message, true); }
}

// ── NAVIGATION ────────────────────────────────────────
function showPage(p) {
  document.querySelectorAll('.ga-page').forEach(el=>el.style.display='none');
  document.getElementById('page-'+p).style.display='block';
  document.querySelectorAll('.ga-nav-link').forEach(el=>el.classList.remove('active'));
  const link = document.querySelector(`[data-page="${p}"]`);
  if(link) link.classList.add('active');
  if(p==='calendar') renderCalendar();
  if(p==='additem'&&!document.getElementById('editId').value){
    clearForm();
    document.getElementById('formPageTitle').textContent='Add Rental Item';
  }
}

function bindNav() {
  document.querySelectorAll('.ga-nav-link').forEach(el=>{
    el.addEventListener('click', ()=>showPage(el.dataset.page));
  });
}

// ── HELPERS ───────────────────────────────────────────
function fd(d){ if(!d)return '—'; try{ return new Date(d).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}); }catch(e){return '—';} }
function emptyHtml(t,m){ return `<div class="ga-empty"><div style="font-size:28px">🌸</div><div style="font-size:18px;font-weight:500">${t}</div><div style="font-size:12px;color:#777;max-width:240px">${m}</div></div>`; }
function toast(msg, isErr) {
  const t = document.createElement('div');
  t.className = 'ga-toast'+(isErr?' ga-toast-err':'');
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(()=>{ t.style.opacity='0'; setTimeout(()=>t.remove(),300); }, 3000);
}

// ── STYLES ────────────────────────────────────────────
function injectStyles() {
  const s = document.createElement('style');
  s.textContent = `
  #gRentalAdmin *{box-sizing:border-box;margin:0;padding:0;font-family:'Montserrat',sans-serif}
  @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;500;600&display=swap');
  .ga-layout{display:flex;min-height:100vh;background:#f4f4f4}
  .ga-sidebar{width:210px;background:#111;flex-shrink:0;display:flex;flex-direction:column;position:fixed;top:0;left:0;height:100vh;overflow-y:auto;z-index:50}
  .ga-main{margin-left:210px;flex:1;padding:22px;overflow-y:auto}
  .ga-logo{padding:18px 16px 14px;border-bottom:1px solid rgba(255,255,255,.1)}
  .ga-logo-name{font-size:20px;font-weight:600;color:#fff;letter-spacing:.02em}
  .ga-logo-sub{font-size:9px;font-weight:500;letter-spacing:.14em;text-transform:uppercase;color:rgba(255,255,255,.4);margin-top:2px}
  .ga-nav{padding:8px 0}
  .ga-nav-section{font-size:8px;font-weight:600;letter-spacing:.16em;text-transform:uppercase;color:rgba(255,255,255,.3);padding:10px 16px 4px}
  .ga-nav-link{display:flex;align-items:center;gap:8px;padding:8px 16px;font-size:11px;font-weight:500;color:rgba(255,255,255,.6);cursor:pointer;transition:all .12s;border-radius:4px;margin:1px 6px;text-decoration:none}
  .ga-nav-link:hover{background:rgba(255,255,255,.08);color:#fff}
  .ga-nav-link.active{background:rgba(255,255,255,.12);color:#fff}
  .ga-badge{margin-left:auto;background:#943030;color:#fff;font-size:9px;font-weight:600;padding:2px 6px;border-radius:100px}
  .ga-nav-ext{display:flex;align-items:center;gap:8px;padding:6px 16px;font-size:10px;color:rgba(255,255,255,.4);cursor:pointer;text-decoration:none;transition:all .12s}
  .ga-nav-ext:hover{color:rgba(255,255,255,.7)}
  .ga-topbar{display:flex;align-items:center;justify-content:space-between;margin-bottom:18px;flex-wrap:wrap;gap:12px}
  .ga-page-title{font-size:22px;font-weight:600;color:#111}
  .ga-page-sub{font-size:11px;color:#777;margin-top:2px}
  .ga-stats{display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:12px;margin-bottom:18px}
  .ga-stat{background:#fff;border:1px solid #e4e4e4;border-radius:4px;padding:14px 16px}
  .ga-stat-lbl{font-size:9px;font-weight:600;letter-spacing:.1em;text-transform:uppercase;color:#777;margin-bottom:5px}
  .ga-stat-val{font-size:28px;font-weight:700;color:#111;line-height:1}
  .ga-stat-val.amber{color:#8a6200}.ga-stat-val.green{color:#2e6e4a}
  .ga-stat-sub{font-size:10px;color:#bbb;margin-top:3px}
  .ga-panel{background:#fff;border:1px solid #e4e4e4;border-radius:4px;overflow:hidden;margin-bottom:16px}
  .ga-panel-head{padding:12px 16px;border-bottom:1px solid #e4e4e4;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px}
  .ga-panel-title{font-size:13px;font-weight:600;color:#111}
  .ga-panel-body{padding:16px}
  .ga-tbl{width:100%;border-collapse:collapse;font-size:12px}
  .ga-tbl th{font-size:9px;font-weight:600;letter-spacing:.1em;text-transform:uppercase;color:#777;text-align:left;padding:8px 12px;border-bottom:1px solid #e4e4e4;background:#fafafa;white-space:nowrap}
  .ga-tbl td{padding:10px 12px;border-bottom:1px solid #f0f0f0;vertical-align:middle}
  .ga-tbl tr:last-child td{border-bottom:none}
  .ga-tbl tr:hover td{background:#fafafa}
  .ga-pill{display:inline-block;padding:3px 8px;border-radius:100px;font-size:9px;font-weight:600;letter-spacing:.08em;text-transform:uppercase}
  .pill-ok{background:#f0f7f4;color:#2e6e4a}.pill-off{background:#f3f3f3;color:#999}
  .pill-pending{background:#fdf8ee;color:#8a6200}.pill-confirmed{background:#f0f7f4;color:#2e6e4a}.pill-cancelled{background:#f3f3f3;color:#999}
  .ga-btn{padding:7px 14px;border-radius:4px;font-size:11px;font-weight:600;letter-spacing:.04em;text-transform:uppercase;cursor:pointer;transition:all .12s;border:none;display:inline-flex;align-items:center;gap:5px}
  .ga-btn-primary{background:#111;color:#fff}.ga-btn-primary:hover{opacity:.82}
  .ga-btn-outline{background:transparent;color:#111;border:1px solid #c0c0c0}.ga-btn-outline:hover{border-color:#111}
  .ga-btn-sm{padding:4px 10px;font-size:10px}
  .ga-btn:disabled{opacity:.4;cursor:not-allowed}
  .ga-filters{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
  .ga-sel,.ga-inp{background:#f8f8f8;border:1px solid #e4e4e4;border-radius:4px;padding:6px 10px;font-size:11px;color:#111;outline:none;font-family:inherit}
  .ga-lbl{font-size:9px;font-weight:600;text-transform:uppercase;letter-spacing:.1em;color:#777;margin-bottom:5px;display:block}
  .ga-form-2{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:14px}
  .ga-form-row{margin-bottom:14px}
  .ga-inp{width:100%;transition:border-color .12s}.ga-inp:focus{border-color:#999}
  .ga-ta{width:100%;background:#f8f8f8;border:1px solid #e4e4e4;border-radius:4px;padding:8px 10px;font-size:12px;color:#111;outline:none;resize:vertical;min-height:72px;font-family:inherit}
  .ga-toggle-row{display:flex;align-items:center;justify-content:space-between;padding:10px 0;border-top:1px solid #f0f0f0}
  .ga-toggle-lbl{font-size:12px;color:#111}
  .ga-toggle{position:relative;width:38px;height:20px}
  .ga-toggle input{opacity:0;width:0;height:0}
  .ga-toggle-slider{position:absolute;inset:0;background:#ddd;border-radius:100px;cursor:pointer;transition:background .2s}
  .ga-toggle-slider::before{content:'';position:absolute;width:14px;height:14px;background:#fff;border-radius:50%;top:3px;left:3px;transition:transform .2s}
  .ga-toggle input:checked + .ga-toggle-slider{background:#2e6e4a}
  .ga-toggle input:checked + .ga-toggle-slider::before{transform:translateX(18px)}
  .ga-empty{display:flex;flex-direction:column;align-items:center;justify-content:center;padding:48px 20px;gap:8px;color:#777;text-align:center}
  .ga-loading{display:flex;align-items:center;justify-content:center;padding:32px;gap:10px;color:#999;font-size:12px}
  .ga-spin{width:18px;height:18px;border:2px solid #e4e4e4;border-top-color:#111;border-radius:50%;animation:gaspin .7s linear infinite}
  @keyframes gaspin{to{transform:rotate(360deg)}}
  .ga-overlay{position:fixed;inset:0;background:rgba(0,0,0,.38);z-index:200;display:flex;justify-content:flex-end;opacity:0;pointer-events:none;transition:opacity .2s}
  .ga-drawer{width:420px;max-width:96vw;height:100%;overflow-y:auto;background:#fff;border-left:1px solid #e4e4e4;display:flex;flex-direction:column}
  .ga-drawer-head{padding:14px 18px;border-bottom:1px solid #e4e4e4;display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;background:#fff;z-index:10}
  .ga-drawer-body{padding:18px;flex:1}
  .ga-drawer-foot{padding:12px 18px;border-top:1px solid #e4e4e4;display:flex;gap:8px;justify-content:flex-end}
  .ga-detail-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px}
  .ga-toast{position:fixed;bottom:18px;right:18px;background:#111;color:#fff;padding:10px 16px;border-radius:4px;font-size:11px;font-weight:500;z-index:999;animation:gati .2s ease;transition:opacity .25s}
  .ga-toast-err{background:#943030}
  @keyframes gati{from{opacity:0;transform:translateY(5px)}to{opacity:1;transform:translateY(0)}}
  .ga-page{display:block}
  `;
  document.head.appendChild(s);
}
