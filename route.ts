import { NextRequest, NextResponse } from 'next/server';
import { wixQuery, wixInsert } from '@/lib/wix';

export async function GET() {
  try {
    const bookings = await wixQuery('RentalBookings', undefined, [{ fieldName: '_createdDate', order: 'DESC' }]);
    return NextResponse.json(bookings);
  } catch (e) {
    return NextResponse.json([], { status: 200 });
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const result = await wixInsert('RentalBookings', { ...body, status: 'pending' });
  return NextResponse.json(result);
}
