import { NextRequest, NextResponse } from 'next/server';
import { wixQuery } from '@/wix';

const DEFAULTS = {
  centerLat: 32.7767,
  centerLng: -96.7970,
  maxDistanceMiles: 50,
};

function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 3958.8; // Earth radius in miles
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export async function POST(req: NextRequest) {
  const { lat, lng } = await req.json();

  let centerLat = DEFAULTS.centerLat;
  let centerLng = DEFAULTS.centerLng;
  let maxDistanceMiles = DEFAULTS.maxDistanceMiles;

  try {
    const items = await wixQuery('RentalSettings');
    if (items && items.length > 0) {
      const s = items[0];
      centerLat = s.centerLat ?? centerLat;
      centerLng = s.centerLng ?? centerLng;
      maxDistanceMiles = s.maxDistanceMiles ?? maxDistanceMiles;
    }
  } catch {
    // use defaults
  }

  const distanceMiles = haversineDistance(lat, lng, centerLat, centerLng);
  return NextResponse.json({ valid: distanceMiles <= maxDistanceMiles, distanceMiles });
}
