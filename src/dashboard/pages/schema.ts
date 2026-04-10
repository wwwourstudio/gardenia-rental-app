// ═══════════════════════════════════════════════════════════════
// CMS SCHEMA — RentalItems Collection
// ═══════════════════════════════════════════════════════════════
// This file is the TypeScript source-of-truth for the RentalItems
// Wix CMS collection. The collection must be created manually in:
//   Wix Dashboard → CMS → + New Collection → ID: "RentalItems"
// Then add the fields listed in RENTAL_ITEMS_SCHEMA below.
// ═══════════════════════════════════════════════════════════════

export type RentalCategory =
  | 'Arches & Backdrops'
  | 'Linens & Draping'
  | 'Centerpieces'
  | 'Charger Plates & Tableware'
  | 'Lighting'
  | 'Floral'
  | 'Furniture'
  | 'Miscellaneous';

export const CATEGORIES: RentalCategory[] = [
  'Arches & Backdrops',
  'Linens & Draping',
  'Centerpieces',
  'Charger Plates & Tableware',
  'Lighting',
  'Floral',
  'Furniture',
  'Miscellaneous',
];

export interface RentalItem {
  _id: string;
  _createdDate?: string;
  _updatedDate?: string;
  /** Item display name — required */
  name: string;
  /** One of the 8 fixed category values */
  category: RentalCategory;
  /** Short description shown on the quote form */
  description?: string;
  /** Daily rental rate in USD — required */
  pricePerDay: number;
  /** Wix media URL or external image URL */
  image?: string;
  /** If false the item is hidden from the customer quote form — default true */
  available: boolean;
  /** Surfaced first in the item grid — default false */
  featured: boolean;
}

// ── Schema definition for manual collection setup ──────────────
// Use this as a reference when creating the CMS collection fields.
export const RENTAL_ITEMS_SCHEMA = {
  collectionId: 'RentalItems',
  displayName: 'Rental Items',
  fields: [
    {
      key: 'name',
      label: 'Item Name',
      type: 'TEXT' as const,
      required: true,
    },
    {
      key: 'category',
      label: 'Category',
      type: 'TEXT' as const,
      required: false,
      enum: CATEGORIES,
      note: 'Use one of the 8 fixed values in the CATEGORIES array',
    },
    {
      key: 'description',
      label: 'Description',
      type: 'TEXT' as const,
      required: false,
    },
    {
      key: 'pricePerDay',
      label: 'Price Per Day ($)',
      type: 'NUMBER' as const,
      required: true,
    },
    {
      key: 'image',
      label: 'Item Image',
      type: 'IMAGE' as const,
      required: false,
    },
    {
      key: 'available',
      label: 'Available for Rental',
      type: 'BOOLEAN' as const,
      required: false,
      defaultValue: true,
    },
    {
      key: 'featured',
      label: 'Featured Item',
      type: 'BOOLEAN' as const,
      required: false,
      defaultValue: false,
    },
  ],
} as const;

// ── Utility ────────────────────────────────────────────────────
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}
