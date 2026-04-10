// ═══════════════════════════════════════════════════════════════
// WIX CLI PROJECT CONFIG
// ═══════════════════════════════════════════════════════════════
// Setup instructions:
//
// 1. Install the Wix CLI (once, globally):
//      npm install -g @wix/cli
//
// 2. Log in to your Wix account:
//      wix login
//
// 3. Link this project to your Wix site (one-time init):
//      npx @wix/cli@latest init
//      → This will populate appId and update this file.
//
// 4. Create the RentalItems CMS collection in Wix Dashboard
//    (fields documented in src/dashboard/pages/schema.ts)
//
// 5. (Optional) Import seed data from src/backend/data/rentalItems.json
//    via Wix Dashboard → CMS → RentalItems → Import.
//
// 6. Run locally:
//      npx @wix/cli@latest dev
//
// 7. Deploy to production:
//      npx @wix/cli@latest deploy
// ═══════════════════════════════════════════════════════════════

/** @type {import('@wix/cli').WixConfig} */
export default {
  // Replace with your App ID from Wix Dev Center (https://dev.wix.com)
  // after running `npx @wix/cli@latest init`
  appId: '<YOUR_APP_ID>',

  dashboard: {
    pages: [
      // ── New page added by this feature branch ──────────────
      {
        pageId: 'rental-admin',
        pageName: 'Rental Items',
        src: 'src/dashboard/pages/rental-admin.tsx',
      },

      // ── Pre-existing dashboard pages (already deployed) ────
      // Registered here so navigation calls (dashboard.navigate)
      // resolve correctly during local development.
      {
        pageId: 'overview',
        pageName: 'Overview',
        src: 'overview.tsx',
      },
      {
        pageId: 'rental-inventory',
        pageName: 'Inventory',
        src: 'inventory.tsx',
      },
      {
        pageId: 'add-item',
        pageName: 'Add Item',
        src: 'add-item.tsx',
      },
      {
        pageId: 'bookings',
        pageName: 'Bookings',
        src: 'bookings.tsx',
      },
      {
        pageId: 'calendar',
        pageName: 'Calendar',
        src: 'calendar.tsx',
      },
    ],
  },

  site: {
    pages: [
      // Customer-facing rental quote page embedded in the Wix site
      {
        pageId: 'rental-quote',
        pageName: 'Rental Quote',
        src: 'src/pages/rental-quote.tsx',
      },
    ],
  },
};
