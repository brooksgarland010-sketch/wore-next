import { NextResponse } from 'next/server';
import { placeOrder, getAccount } from '@/lib/alpaca';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const account = await getAccount();
    return NextResponse.json(account);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const order = await req.json();

    // Require explicit fields to prevent partial orders
    if (!order.symbol || !order.qty || !order.side || !order.type) {
      return NextResponse.json({ error: 'symbol, qty, side, and type are required' }, { status: 400 });
    }

    const result = await placeOrder(order);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
