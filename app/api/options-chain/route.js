import { NextResponse } from 'next/server';
import yahooFinance from 'yahoo-finance2';

export const runtime = 'nodejs';

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const symbol = searchParams.get('symbol');
  const date = searchParams.get('date');

  if (!symbol) return NextResponse.json({ error: 'Symbol required' }, { status: 400 });

  try {
    const queryOptions = date ? { date: new Date(date) } : undefined;
    const data = await yahooFinance.options(symbol, queryOptions);
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
