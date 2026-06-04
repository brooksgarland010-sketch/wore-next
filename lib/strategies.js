function sma(prices, period) {
  if (prices.length < period) return null;
  const slice = prices.slice(-period);
  return slice.reduce((s, p) => s + p, 0) / period;
}

function ema(prices, period) {
  if (prices.length < period) return null;
  const k = 2 / (period + 1);
  let val = prices.slice(0, period).reduce((s, p) => s + p, 0) / period;
  for (let i = period; i < prices.length; i++) val = prices[i] * k + val * (1 - k);
  return val;
}

function rsi(prices, period = 14) {
  if (prices.length <= period) return null;
  let gains = 0, losses = 0;
  for (let i = 1; i <= period; i++) {
    const d = prices[i] - prices[i - 1];
    if (d > 0) gains += d; else losses += Math.abs(d);
  }
  let avgGain = gains / period, avgLoss = losses / period;
  for (let i = period + 1; i < prices.length; i++) {
    const d = prices[i] - prices[i - 1];
    avgGain = (avgGain * (period - 1) + (d > 0 ? d : 0)) / period;
    avgLoss = (avgLoss * (period - 1) + (d < 0 ? Math.abs(d) : 0)) / period;
  }
  if (avgLoss === 0) return 100;
  return 100 - 100 / (1 + avgGain / avgLoss);
}

function bollingerBands(prices, period = 20, mult = 2) {
  if (prices.length < period) return null;
  const slice = prices.slice(-period);
  const mean = slice.reduce((s, p) => s + p, 0) / period;
  const std = Math.sqrt(slice.reduce((s, p) => s + (p - mean) ** 2, 0) / period);
  return { upper: mean + mult * std, middle: mean, lower: mean - mult * std, std };
}

export function analyzeStrategies(history, currentPrice, volume, avgVolume) {
  const closes = history.map(h => typeof h === 'number' ? h : (h.close ?? h.adjClose ?? h.regularMarketPrice));

  const sma5 = sma(closes, 5);
  const sma20 = sma(closes, 20);
  const sma50 = sma(closes, 50);
  const ema12 = ema(closes, 12);
  const ema26 = ema(closes, 26);
  const rsiVal = rsi(closes);
  const bb = bollingerBands(closes);

  const signals = [];

  if (sma5 != null && sma20 != null) {
    const bull = sma5 > sma20;
    const strength = Math.min(Math.abs((sma5 - sma20) / sma20) * 1000, 100);
    signals.push({
      name: 'MA Crossover (5/20)',
      signal: bull ? 'BUY' : 'SELL',
      strength: strength.toFixed(0),
      value: `5d $${sma5.toFixed(2)} / 20d $${sma20.toFixed(2)}`,
      description: bull ? 'Short-term MA above long-term (bullish trend)' : 'Short-term MA below long-term (bearish trend)',
    });
  }

  if (rsiVal != null) {
    const oversold = rsiVal < 30, overbought = rsiVal > 70;
    signals.push({
      name: 'RSI (14)',
      signal: oversold ? 'BUY' : overbought ? 'SELL' : 'NEUTRAL',
      strength: oversold ? ((30 - rsiVal) * 3.3).toFixed(0) : overbought ? ((rsiVal - 70) * 3.3).toFixed(0) : '20',
      value: rsiVal.toFixed(1),
      description: oversold ? `Oversold at ${rsiVal.toFixed(1)} — potential reversal` : overbought ? `Overbought at ${rsiVal.toFixed(1)} — potential reversal` : `Neutral (${rsiVal.toFixed(1)})`,
    });
  }

  if (ema12 != null && ema26 != null) {
    const macdLine = ema12 - ema26;
    signals.push({
      name: 'MACD (12/26)',
      signal: macdLine > 0 ? 'BUY' : 'SELL',
      strength: Math.min(Math.abs(macdLine / currentPrice) * 1000, 100).toFixed(0),
      value: macdLine.toFixed(3),
      description: macdLine > 0 ? 'MACD positive — bullish momentum' : 'MACD negative — bearish momentum',
    });
  }

  if (bb) {
    const below = currentPrice <= bb.lower, above = currentPrice >= bb.upper;
    signals.push({
      name: 'Bollinger Bands',
      signal: below ? 'BUY' : above ? 'SELL' : 'NEUTRAL',
      strength: below ? ((bb.middle - currentPrice) / bb.std * 33).toFixed(0) : above ? ((currentPrice - bb.middle) / bb.std * 33).toFixed(0) : '15',
      value: `L $${bb.lower.toFixed(2)} / U $${bb.upper.toFixed(2)}`,
      description: below ? 'Price at lower band — mean reversion buy' : above ? 'Price at upper band — mean reversion sell' : 'Price within bands — no edge',
    });
  }

  if (volume && avgVolume) {
    const ratio = volume / avgVolume;
    const dir = sma5 != null && sma20 != null ? (sma5 > sma20 ? 'BUY' : 'SELL') : 'NEUTRAL';
    signals.push({
      name: 'Volume Surge',
      signal: ratio > 2 ? dir : 'NEUTRAL',
      strength: Math.min((ratio - 1) * 50, 100).toFixed(0),
      value: `${ratio.toFixed(1)}× avg`,
      description: ratio > 2 ? `Volume ${ratio.toFixed(1)}× avg — strong conviction` : 'Normal volume — no confirmation',
    });
  }

  const optionStrategies = [];
  if (rsiVal != null) {
    if (rsiVal < 35) {
      optionStrategies.push({ name: 'Cash-Secured Put', risk: 'Moderate', reason: 'Collect premium while targeting a bullish entry at a discount' });
      optionStrategies.push({ name: 'Bull Call Spread', risk: 'Defined', reason: 'Defined-risk leveraged play on a bounce' });
    } else if (rsiVal > 65) {
      optionStrategies.push({ name: 'Covered Call', risk: 'Low', reason: 'Collect premium against long shares in overbought conditions' });
      optionStrategies.push({ name: 'Bear Put Spread', risk: 'Defined', reason: 'Defined-risk downside hedge on a pullback' });
    } else {
      optionStrategies.push({ name: 'Iron Condor', risk: 'Defined', reason: 'Neutral price action — sell range-bound premium' });
      optionStrategies.push({ name: 'Long Straddle', risk: 'Limited', reason: 'Anticipate a breakout without directional bias' });
    }
  }

  return { signals, optionStrategies, indicators: { sma5, sma20, sma50, rsiVal, ema12, ema26, bb } };
}
