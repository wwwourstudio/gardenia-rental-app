// ═══════════════════════════════════════════════════════════════
// WIX VELO — Event Item Rental System (Page Code)
// Paste this into your Wix Page's Velo editor (Page Code tab)
// ═══════════════════════════════════════════════════════════════

// ── SETUP ──────────────────────────────────────────────────────
// 1. Add an HTML iframe element to your Wix page (Insert > HTML iframe)
//    and give it the ID: "rentalFrame"
// 2. In Wix Editor, set the iframe src to the URL where you deployed
//    the rental-system.html file (e.g. a CDN, Vercel, GitHub Pages, etc.)
// 3. In your Wix Secrets Manager, store:
//    - "RENTAL_API_KEY"  → Your Wix API Key (starts with IST.ey...)
//    - "RENTAL_SITE_ID"  → Your Wix site ID
// 4. Your Wix CMS collection must be named "RentalItems" (or configure below)
//    with these fields:
//      title         (Text)
//      description   (Text)
//      category      (Text)
//      pricePerDay   (Number)
//      quantity      (Number)
//      available     (Boolean)
//      image         (Image)
//      bookingServiceId  (Text) — ID of the matching Wix Booking service
// ──────────────────────────────────────────────────────────────

import wixSecretsBackend from 'wix-secrets-backend';
import { getSecret } from 'wix-secrets-backend';

// ── The hosted URL of rental-system.html ──────────────────────
const RENTAL_APP_URL = 'https://YOUR-HOSTED-URL/rental-system.html';
const COLLECTION_ID  = 'RentalItems';

// ══════════════════════════════════════════════════════════════
// PAGE READY
// ══════════════════════════════════════════════════════════════
$w.onReady(async function () {

  // ── 1. Fetch secrets from Wix backend ──────────────────────
  let apiKey  = '';
  let siteId  = '';
  try {
    apiKey = await getSecret('RENTAL_API_KEY');
    siteId = await getSecret('RENTAL_SITE_ID');
  } catch(e) {
    console.error('Could not load secrets:', e);
  }

  // ── 2. Build the iframe src with params ────────────────────
  const iframeSrc = buildIframeUrl({
    siteId,
    apiKey,
    collection: COLLECTION_ID,
  });

  // ── 3. Set the iframe src dynamically ──────────────────────
  $w('#rentalFrame').src = iframeSrc;

  // ── 4. Listen for messages from the iframe ─────────────────
  $w('#rentalFrame').onMessage((event) => {
    handleIframeMessage(event.data);
  });

  // ── 5. (Optional) Wire up category filter buttons ──────────
  // If you have repeater buttons on the Wix page for categories,
  // wire them to send filter commands to the iframe:
  //
  // $w('#categoryRepeater').onItemReady(($item, itemData) => {
  //   $item('#categoryBtn').onClick(() => {
  //     sendToIframe({ type: 'RENTAL_FILTER', category: itemData.name });
  //   });
  // });

  // ── 6. (Optional) Wire up a search input on the Wix page ──
  // $w('#searchBox').onInput((e) => {
  //   sendToIframe({ type: 'RENTAL_FILTER', search: e.target.value });
  // });
});


// ══════════════════════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════════════════════

/**
 * Build the iframe URL with config params embedded.
 * This is the dynamic injection — the iframe reads these at load time.
 */
function buildIframeUrl({ siteId, apiKey, collection }) {
  const params = new URLSearchParams({
    siteId:     siteId,
    apiKey:     apiKey,
    collection: collection,
  });
  return `${RENTAL_APP_URL}?${params.toString()}`;
}

/**
 * Send a message to the embedded rental iframe.
 */
function sendToIframe(data) {
  $w('#rentalFrame').postMessage(data);
}

/**
 * Handle incoming messages from the rental iframe.
 */
function handleIframeMessage(data) {
  if (!data || !data.type) return;

  switch (data.type) {

    // ── Iframe is loaded and ready ────────────────────────────
    case 'RENTAL_READY':
      console.log('Rental system ready');
      break;

    // ── Items were loaded from CMS ────────────────────────────
    case 'RENTAL_ITEMS_LOADED':
      console.log(`Rental catalog loaded: ${data.count} items`);
      // Optionally update a counter element on the page:
      // $w('#itemCountText').text = `${data.count} items available`;
      break;

    // ── User selected an item ─────────────────────────────────
    case 'RENTAL_ITEM_SELECTED':
      console.log('Selected:', data.itemTitle);
      // You could update a breadcrumb or side panel here
      break;

    // ── Auto-resize the iframe to match content height ────────
    case 'RENTAL_HEIGHT':
      try {
        $w('#rentalFrame').height = data.height;
      } catch(e) {}
      break;

    // ── A booking was successfully created ────────────────────
    case 'RENTAL_BOOKING_CREATED':
      console.log('Booking created:', data.bookingId);
      // Optionally show a Wix lightbox confirmation:
      // wixWindow.openLightbox('BookingConfirmed', {
      //   bookingId:  data.bookingId,
      //   itemTitle:  data.itemTitle,
      //   total:      data.total,
      //   startDate:  data.startDate,
      //   endDate:    data.endDate,
      // });
      break;
  }
}


// ══════════════════════════════════════════════════════════════
// BACKEND FILE: backend/rentalSecrets.jsw
// (Create this file in Wix Editor → Backend → New .jsw file)
// This exposes secrets to page code securely.
// ══════════════════════════════════════════════════════════════

/*
// backend/rentalSecrets.jsw

import { getSecret } from 'wix-secrets-backend';

export async function getRentalConfig() {
  const apiKey = await getSecret('RENTAL_API_KEY');
  const siteId = await getSecret('RENTAL_SITE_ID');
  return { apiKey, siteId };
}
*/


// ══════════════════════════════════════════════════════════════
// WIX CMS COLLECTION SETUP
// ══════════════════════════════════════════════════════════════
/*
Collection ID: RentalItems

Fields to create:
┌──────────────────────┬────────────┬──────────────────────────────────────────────┐
│ Field Name           │ Type       │ Notes                                        │
├──────────────────────┼────────────┼──────────────────────────────────────────────┤
│ title                │ Text       │ Required — item display name                 │
│ description          │ Rich Text  │ Full description of the rental item          │
│ category             │ Text       │ e.g. Furniture, Lighting, AV Equipment       │
│ pricePerDay          │ Number     │ Daily rental rate in USD                     │
│ quantity             │ Number     │ Available units in stock                     │
│ available            │ Boolean    │ Toggle on/off availability                   │
│ image                │ Image      │ Primary product image                        │
│ bookingServiceId     │ Text       │ Matching Wix Bookings service ID             │
└──────────────────────┴────────────┴──────────────────────────────────────────────┘

Permissions:
  - Read: Anyone (Public)
  - Create/Update/Delete: Site member (Admin only)
*/


// ══════════════════════════════════════════════════════════════
// WIX BOOKINGS SETUP
// ══════════════════════════════════════════════════════════════
/*
For each rental item that needs calendar-based booking:
1. Go to Wix Dashboard → Bookings → Add New Service
2. Create a "Class" or "Appointment" service for the item
3. Set availability (days/hours)
4. Copy the Service ID from the URL or API
5. Paste the Service ID into the CMS item's "bookingServiceId" field

If no bookingServiceId is set, the rental system will still create
a booking record with full contact details and dates — but without
calendar slot integration. This is fine for date-based rentals
that don't need time-slot scheduling.
*/
