import { NextResponse } from 'next/server';
import yahooFinance from 'yahoo-finance2';
import { analyzeStrategies } from '@/lib/strategies';

export const runtime = 'nodejs';

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const symbol = searchParams.get('symbol');

  if (!symbol) return NextResponse.json({ error: 'Symbol required' }, { status: 400 });

  try {
    const period1 = new Date(Date.now() - 180 * 86400000).toISOString().split('T')[0];
    const [quote, history] = await Promise.all([
      yahooFinance.quote(symbol),
      yahooFinance.historical(symbol, { period1, interval: '1d' }),
    ]);

    const analysis = analyzeStrategies(
      history,
      quote.regularMarketPrice,
      quote.regularMarketVolume,
      quote.averageDailyVolume3Month,
    );

    return NextResponse.json({ quote, analysis });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
