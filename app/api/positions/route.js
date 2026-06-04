import { NextResponse } from 'next/server';
import { getPositions, getOrders } from '@/lib/alpaca';

export const runtime = 'nodejs';

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get('type') || 'positions';

  try {
    if (type === 'orders') {
      const data = await getOrders('all', 50);
      return NextResponse.json(data);
    }
    const data = await getPositions();
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
