import { NextResponse } from 'next/server';
import { wixQuery } from '@/wix';

const DEFAULTS = {
  centerLat: 32.7767,
  centerLng: -96.7970,
  centerAddress: 'Dallas, TX',
  maxDistanceMiles: 50,
};

export async function GET() {
  try {
    const items = await wixQuery('RentalSettings');
    if (items && items.length > 0) {
      const s = items[0];
      return NextResponse.json({
        centerLat: s.centerLat ?? DEFAULTS.centerLat,
        centerLng: s.centerLng ?? DEFAULTS.centerLng,
        centerAddress: s.centerAddress ?? DEFAULTS.centerAddress,
        maxDistanceMiles: s.maxDistanceMiles ?? DEFAULTS.maxDistanceMiles,
      });
    }
  } catch {
    // fall through to defaults
  }
  return NextResponse.json(DEFAULTS);
}
