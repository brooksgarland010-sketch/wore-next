import { NextResponse } from 'next/server';
import yahooFinance from 'yahoo-finance2';

export const runtime = 'nodejs';

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const symbol = searchParams.get('symbol');
  const type = searchParams.get('type') || 'quote';

  if (!symbol) return NextResponse.json({ error: 'Symbol required' }, { status: 400 });

  try {
    if (type === 'quote') {
      const data = await yahooFinance.quote(symbol);
      return NextResponse.json(data);
    }

    if (type === 'history') {
      const days = parseInt(searchParams.get('days') || '90', 10);
      const period1 = new Date(Date.now() - days * 86400000).toISOString().split('T')[0];
      const data = await yahooFinance.historical(symbol, { period1, interval: '1d' });
      return NextResponse.json(data);
    }

    if (type === 'search') {
      const data = await yahooFinance.search(symbol);
      return NextResponse.json(data);
    }

    return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
