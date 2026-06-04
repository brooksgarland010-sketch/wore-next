import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const maxDuration = 30;

export async function POST(req) {
  try {
    const { symbol, quote, analysis, selectedStrategy } = await req.json();

    const prompt = `You are an expert options trader and technical analyst. Analyze ${symbol} and give a concise, actionable recommendation.

Current Price: $${quote.regularMarketPrice?.toFixed(2)}
Day Change: ${quote.regularMarketChangePercent?.toFixed(2)}%
Volume: ${((quote.regularMarketVolume || 0) / 1e6).toFixed(2)}M (${((quote.regularMarketVolume || 0) / (quote.averageDailyVolume3Month || 1)).toFixed(1)}x avg)
52-Week Range: $${quote.fiftyTwoWeekLow} – $${quote.fiftyTwoWeekHigh}
Market Cap: ${quote.marketCap ? '$' + (quote.marketCap / 1e9).toFixed(1) + 'B' : 'N/A'}

Technical Signals:
${analysis.signals.map(s => `- ${s.name}: ${s.signal} — ${s.description}`).join('\n')}

Suggested Options Strategies:
${analysis.optionStrategies.map(s => `- ${s.name} (${s.risk} risk): ${s.reason}`).join('\n')}
${selectedStrategy ? `\nUser is focused on: ${selectedStrategy}` : ''}

Respond with:
1. Overall bias (Bullish/Bearish/Neutral) and confidence %
2. Best options play for current conditions with specific reasoning
3. Key support and resistance levels
4. Risk management (stop loss %, position size suggestion)
5. One specific trade idea: strategy, strike/expiry guidance, entry trigger

Be direct, skip preamble, no financial advice disclaimers.`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 900,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
