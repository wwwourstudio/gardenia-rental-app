import { NextResponse } from 'next/server';
import { wixQuery } from '@/wix';

export async function GET() {
  try {
    const items = await wixQuery('RentalCatalog', undefined, [{ fieldName: 'title', order: 'ASC' }]);
    return NextResponse.json(items);
  } catch {
    return NextResponse.json([]);
  }
}
