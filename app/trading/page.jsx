'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useUser } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';

const COLORS = {
  bg: '#0d0d0d',
  card: '#141414',
  cardHover: '#1c1c1c',
  border: '#2a2a2a',
  lime: '#c8f55a',
  limeHover: '#b8e54a',
  text: '#f5f4f0',
  muted: '#888',
  buy: '#4ade80',
  sell: '#f87171',
  neutral: '#facc15',
  red: '#f87171',
  green: '#4ade80',
};

function fmt(n, digits = 2) {
  if (n == null) return '—';
  return Number(n).toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

function fmtPct(n) {
  if (n == null) return '—';
  const v = Number(n);
  return (v > 0 ? '+' : '') + v.toFixed(2) + '%';
}

function fmtVol(n) {
  if (!n) return '—';
  if (n >= 1e9) return (n / 1e9).toFixed(1) + 'B';
  if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
  if (n >= 1e3) return (n / 1e3).toFixed(0) + 'K';
  return String(n);
}

function SignalBadge({ signal }) {
  const color = signal === 'BUY' ? COLORS.buy : signal === 'SELL' ? COLORS.sell : COLORS.neutral;
  return (
    <span style={{ background: color + '22', color, border: `1px solid ${color}44`, borderRadius: 6, padding: '2px 10px', fontSize: 12, fontWeight: 700, letterSpacing: '0.05em' }}>
      {signal}
    </span>
  );
}

function StrengthBar({ value }) {
  const pct = Math.min(Math.max(Number(value) || 0, 0), 100);
  const color = pct > 66 ? COLORS.lime : pct > 33 ? COLORS.neutral : COLORS.muted;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ flex: 1, height: 4, background: '#2a2a2a', borderRadius: 2, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 2, transition: 'width 0.5s ease' }} />
      </div>
      <span style={{ fontSize: 11, color: COLORS.muted, minWidth: 28, textAlign: 'right' }}>{pct}%</span>
    </div>
  );
}

function QuoteHeader({ quote }) {
  if (!quote) return null;
  const change = quote.regularMarketChange;
  const changePct = quote.regularMarketChangePercent;
  const isUp = change >= 0;

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24, alignItems: 'flex-end', marginBottom: 24 }}>
      <div>
        <div style={{ fontSize: 13, color: COLORS.muted, marginBottom: 4 }}>{quote.longName || quote.shortName || quote.symbol}</div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
          <span style={{ fontSize: 42, fontWeight: 800, fontFamily: 'var(--font-syne)', color: COLORS.text }}>${fmt(quote.regularMarketPrice)}</span>
          <span style={{ fontSize: 18, fontWeight: 600, color: isUp ? COLORS.green : COLORS.red }}>
            {isUp ? '+' : ''}{fmt(change)} ({fmtPct(changePct)})
          </span>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', paddingBottom: 6 }}>
        {[
          ['Open', `$${fmt(quote.regularMarketOpen)}`],
          ['High', `$${fmt(quote.regularMarketDayHigh)}`],
          ['Low', `$${fmt(quote.regularMarketDayLow)}`],
          ['Volume', fmtVol(quote.regularMarketVolume)],
          ['Avg Vol', fmtVol(quote.averageDailyVolume3Month)],
          ['52W High', `$${fmt(quote.fiftyTwoWeekHigh)}`],
          ['52W Low', `$${fmt(quote.fiftyTwoWeekLow)}`],
          ['Mkt Cap', quote.marketCap ? '$' + fmtVol(quote.marketCap) : '—'],
        ].map(([k, v]) => (
          <div key={k} style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 11, color: COLORS.muted, marginBottom: 2 }}>{k}</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: COLORS.text }}>{v}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function StrategySignals({ signals, optionStrategies }) {
  return (
    <div style={{ display: 'grid', gap: 12 }}>
      {signals.map(sig => (
        <div key={sig.name} style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: '14px 18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: COLORS.text }}>{sig.name}</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 12, color: COLORS.muted }}>{sig.value}</span>
              <SignalBadge signal={sig.signal} />
            </div>
          </div>
          <div style={{ fontSize: 12, color: COLORS.muted, marginBottom: 8 }}>{sig.description}</div>
          <StrengthBar value={sig.strength} />
        </div>
      ))}

      {optionStrategies?.length > 0 && (
        <div style={{ marginTop: 8 }}>
          <div style={{ fontSize: 13, color: COLORS.muted, marginBottom: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Suggested Options Plays</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 10 }}>
            {optionStrategies.map(s => (
              <div key={s.name} style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: '12px 16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontWeight: 700, color: COLORS.lime, fontSize: 14 }}>{s.name}</span>
                  <span style={{ fontSize: 11, color: COLORS.muted, background: '#2a2a2a', borderRadius: 4, padding: '2px 7px' }}>{s.risk} risk</span>
                </div>
                <div style={{ fontSize: 12, color: COLORS.muted, lineHeight: 1.5 }}>{s.reason}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function OptionsChain({ symbol }) {
  const [chain, setChain] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedExpiry, setSelectedExpiry] = useState(null);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all'); // all | calls | puts

  const loadChain = useCallback(async (sym) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/options-chain?symbol=${sym}${selectedExpiry ? '&date=' + selectedExpiry : ''}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setChain(data);
      if (data.expirationDates?.length && !selectedExpiry) {
        setSelectedExpiry(data.expirationDates[0]);
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [selectedExpiry]);

  useEffect(() => {
    if (symbol) loadChain(symbol);
  }, [symbol, selectedExpiry]);

  if (loading) return <div style={{ color: COLORS.muted, padding: 24, textAlign: 'center' }}>Loading options chain…</div>;
  if (error) return <div style={{ color: COLORS.red, padding: 16, background: COLORS.card, borderRadius: 10 }}>Options error: {error}</div>;
  if (!chain) return null;

  const currentOptions = chain.options?.[0];
  const calls = currentOptions?.calls || [];
  const puts = currentOptions?.puts || [];

  const thStyle = { padding: '8px 10px', fontSize: 11, color: COLORS.muted, textAlign: 'right', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' };
  const tdStyle = (highlight) => ({ padding: '7px 10px', fontSize: 13, color: highlight ? COLORS.lime : COLORS.text, textAlign: 'right', borderBottom: `1px solid ${COLORS.border}` });

  function OptionRow({ opt, type }) {
    const isITM = type === 'call' ? opt.inTheMoney : opt.inTheMoney;
    return (
      <tr style={{ background: isITM ? '#1a2500' : 'transparent', cursor: 'default' }}>
        <td style={{ ...tdStyle(false), textAlign: 'left', color: isITM ? COLORS.lime : COLORS.text }}>${fmt(opt.strike)}</td>
        <td style={tdStyle(false)}>{fmt(opt.lastPrice)}</td>
        <td style={tdStyle(false)}>{fmt(opt.bid)}</td>
        <td style={tdStyle(false)}>{fmt(opt.ask)}</td>
        <td style={tdStyle(false)}>{opt.impliedVolatility ? (opt.impliedVolatility * 100).toFixed(1) + '%' : '—'}</td>
        <td style={tdStyle(false)}>{opt.delta ? opt.delta.toFixed(3) : '—'}</td>
        <td style={tdStyle(false)}>{fmtVol(opt.openInterest)}</td>
        <td style={tdStyle(false)}>{fmtVol(opt.volume)}</td>
      </tr>
    );
  }

  const headers = ['Strike', 'Last', 'Bid', 'Ask', 'IV', 'Delta', 'OI', 'Vol'];

  return (
    <div>
      {chain.expirationDates?.length > 0 && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
          {chain.expirationDates.slice(0, 8).map(d => (
            <button key={d} onClick={() => setSelectedExpiry(d)} style={{ padding: '5px 14px', borderRadius: 6, border: `1px solid ${selectedExpiry === d ? COLORS.lime : COLORS.border}`, background: selectedExpiry === d ? COLORS.lime + '22' : 'transparent', color: selectedExpiry === d ? COLORS.lime : COLORS.muted, fontSize: 12, cursor: 'pointer', fontWeight: selectedExpiry === d ? 700 : 400 }}>
              {new Date(d * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </button>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {['all', 'calls', 'puts'].map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{ padding: '5px 16px', borderRadius: 6, border: `1px solid ${filter === f ? COLORS.lime : COLORS.border}`, background: filter === f ? COLORS.lime + '22' : 'transparent', color: filter === f ? COLORS.lime : COLORS.muted, fontSize: 12, cursor: 'pointer', textTransform: 'capitalize' }}>
            {f}
          </button>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: filter === 'all' ? '1fr 1fr' : '1fr', gap: 16 }}>
        {(filter === 'all' || filter === 'calls') && (
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: COLORS.green, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Calls</div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead><tr>{headers.map(h => <th key={h} style={thStyle}>{h}</th>)}</tr></thead>
                <tbody>{calls.slice(0, 20).map((c, i) => <OptionRow key={i} opt={c} type="call" />)}</tbody>
              </table>
            </div>
          </div>
        )}
        {(filter === 'all' || filter === 'puts') && (
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: COLORS.red, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Puts</div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead><tr>{headers.map(h => <th key={h} style={thStyle}>{h}</th>)}</tr></thead>
                <tbody>{puts.slice(0, 20).map((p, i) => <OptionRow key={i} opt={p} type="put" />)}</tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function TradePanel({ symbol, quote }) {
  const [side, setSide] = useState('buy');
  const [orderType, setOrderType] = useState('market');
  const [assetClass, setAssetClass] = useState('equity');
  const [qty, setQty] = useState('1');
  const [limitPrice, setLimitPrice] = useState('');
  const [contractSymbol, setContractSymbol] = useState('');
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [account, setAccount] = useState(null);

  useEffect(() => {
    fetch('/api/execute-trade').then(r => r.json()).then(d => {
      if (!d.error) setAccount(d);
    });
  }, []);

  async function submit(e) {
    e.preventDefault();
    setLoading(true);
    setStatus(null);
    try {
      const orderSym = assetClass === 'option' ? contractSymbol : symbol;
      const body = {
        symbol: orderSym,
        qty: Number(qty),
        side,
        type: orderType,
        time_in_force: orderType === 'market' ? 'day' : 'gtc',
        ...(orderType === 'limit' ? { limit_price: Number(limitPrice) } : {}),
        ...(assetClass === 'option' ? { asset_class: 'option' } : {}),
      };
      const res = await fetch('/api/execute-trade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setStatus({ ok: true, message: `Order submitted — ID: ${data.id}`, data });
    } catch (err) {
      setStatus({ ok: false, message: err.message });
    } finally {
      setLoading(false);
    }
  }

  const inputStyle = { background: '#1c1c1c', border: `1px solid ${COLORS.border}`, borderRadius: 8, color: COLORS.text, padding: '10px 14px', fontSize: 14, width: '100%', outline: 'none', boxSizing: 'border-box' };
  const labelStyle = { fontSize: 12, color: COLORS.muted, marginBottom: 6, display: 'block', fontWeight: 600 };

  return (
    <div style={{ maxWidth: 480 }}>
      {account && (
        <div style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: '12px 18px', marginBottom: 20 }}>
          <div style={{ fontSize: 12, color: COLORS.muted, marginBottom: 4 }}>Buying Power (Paper Account)</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: COLORS.lime, fontFamily: 'var(--font-syne)' }}>${fmt(account.buying_power)}</div>
          <div style={{ fontSize: 12, color: COLORS.muted, marginTop: 4 }}>Portfolio: ${fmt(account.portfolio_value)} · Equity: ${fmt(account.equity)}</div>
        </div>
      )}

      {!process.env.NEXT_PUBLIC_ALPACA_CONFIGURED && (
        <div style={{ background: '#1a1500', border: `1px solid #3a3000`, borderRadius: 10, padding: '12px 16px', marginBottom: 20, fontSize: 13, color: '#facc15' }}>
          Set <code style={{ background: '#2a2000', padding: '1px 6px', borderRadius: 4 }}>ALPACA_API_KEY</code> and <code style={{ background: '#2a2000', padding: '1px 6px', borderRadius: 4 }}>ALPACA_SECRET_KEY</code> in your environment to enable live trading.
        </div>
      )}

      <form onSubmit={submit} style={{ display: 'grid', gap: 16 }}>
        <div>
          <label style={labelStyle}>Asset Class</label>
          <div style={{ display: 'flex', gap: 8 }}>
            {['equity', 'option'].map(a => (
              <button type="button" key={a} onClick={() => setAssetClass(a)} style={{ flex: 1, padding: '9px 0', borderRadius: 8, border: `1px solid ${assetClass === a ? COLORS.lime : COLORS.border}`, background: assetClass === a ? COLORS.lime + '22' : 'transparent', color: assetClass === a ? COLORS.lime : COLORS.muted, fontSize: 13, cursor: 'pointer', textTransform: 'capitalize', fontWeight: assetClass === a ? 700 : 400 }}>
                {a}
              </button>
            ))}
          </div>
        </div>

        {assetClass === 'option' && (
          <div>
            <label style={labelStyle}>Option Contract Symbol</label>
            <input style={inputStyle} value={contractSymbol} onChange={e => setContractSymbol(e.target.value.toUpperCase())} placeholder="e.g. AAPL250620C00200000" />
            <div style={{ fontSize: 11, color: COLORS.muted, marginTop: 4 }}>Format: {symbol || 'TICKER'}YYMMDD[C/P]STRIKE (OCC symbol)</div>
          </div>
        )}

        <div>
          <label style={labelStyle}>Side</label>
          <div style={{ display: 'flex', gap: 8 }}>
            {['buy', 'sell'].map(s => (
              <button type="button" key={s} onClick={() => setSide(s)} style={{ flex: 1, padding: '9px 0', borderRadius: 8, border: `1px solid ${side === s ? (s === 'buy' ? COLORS.green : COLORS.red) : COLORS.border}`, background: side === s ? (s === 'buy' ? COLORS.green + '22' : COLORS.red + '22') : 'transparent', color: side === s ? (s === 'buy' ? COLORS.green : COLORS.red) : COLORS.muted, fontSize: 13, cursor: 'pointer', textTransform: 'capitalize', fontWeight: side === s ? 700 : 400 }}>
                {s.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label style={labelStyle}>Order Type</label>
          <div style={{ display: 'flex', gap: 8 }}>
            {['market', 'limit'].map(t => (
              <button type="button" key={t} onClick={() => setOrderType(t)} style={{ flex: 1, padding: '9px 0', borderRadius: 8, border: `1px solid ${orderType === t ? COLORS.lime : COLORS.border}`, background: orderType === t ? COLORS.lime + '22' : 'transparent', color: orderType === t ? COLORS.lime : COLORS.muted, fontSize: 13, cursor: 'pointer', textTransform: 'capitalize', fontWeight: orderType === t ? 700 : 400 }}>
                {t}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: orderType === 'limit' ? '1fr 1fr' : '1fr', gap: 12 }}>
          <div>
            <label style={labelStyle}>Quantity{assetClass === 'option' ? ' (contracts)' : ' (shares)'}</label>
            <input type="number" min="1" step="1" value={qty} onChange={e => setQty(e.target.value)} style={inputStyle} />
          </div>
          {orderType === 'limit' && (
            <div>
              <label style={labelStyle}>Limit Price</label>
              <input type="number" step="0.01" value={limitPrice} onChange={e => setLimitPrice(e.target.value)} placeholder={`~$${fmt(quote?.regularMarketPrice)}`} style={inputStyle} />
            </div>
          )}
        </div>

        {quote && (
          <div style={{ background: '#1c1c1c', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: COLORS.muted }}>
            Est. value: <span style={{ color: COLORS.text, fontWeight: 600 }}>${fmt((Number(qty) || 0) * (orderType === 'limit' ? Number(limitPrice) || quote.regularMarketPrice : quote.regularMarketPrice) * (assetClass === 'option' ? 100 : 1))}</span>
            {assetClass === 'option' && <span style={{ fontSize: 11 }}> (×100 multiplier)</span>}
          </div>
        )}

        <button type="submit" disabled={loading || (!symbol && assetClass !== 'option')} style={{ padding: '13px 0', borderRadius: 10, border: 'none', background: side === 'buy' ? COLORS.lime : COLORS.red, color: side === 'buy' ? '#0d0d0d' : '#fff', fontSize: 15, fontWeight: 800, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1, fontFamily: 'var(--font-syne)', letterSpacing: '0.02em' }}>
          {loading ? 'Submitting…' : `${side.toUpperCase()} ${qty} ${assetClass === 'option' ? 'contract(s)' : 'share(s)'}`}
        </button>

        {status && (
          <div style={{ padding: '12px 16px', borderRadius: 10, background: status.ok ? COLORS.green + '18' : COLORS.red + '18', border: `1px solid ${status.ok ? COLORS.green + '44' : COLORS.red + '44'}`, color: status.ok ? COLORS.green : COLORS.red, fontSize: 13 }}>
            {status.message}
          </div>
        )}
      </form>
    </div>
  );
}

function PositionsPanel() {
  const [positions, setPositions] = useState(null);
  const [orders, setOrders] = useState(null);
  const [tab, setTab] = useState('positions');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/positions').then(r => r.json()),
      fetch('/api/positions?type=orders').then(r => r.json()),
    ]).then(([pos, ord]) => {
      if (!pos.error) setPositions(pos);
      if (!ord.error) setOrders(ord);
      setLoading(false);
    });
  }, []);

  if (loading) return <div style={{ color: COLORS.muted, padding: 24, textAlign: 'center' }}>Loading…</div>;

  const thStyle = { padding: '8px 12px', fontSize: 11, color: COLORS.muted, textAlign: 'left', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: `1px solid ${COLORS.border}` };
  const tdStyle = { padding: '10px 12px', fontSize: 13, color: COLORS.text, borderBottom: `1px solid ${COLORS.border}22` };

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {['positions', 'orders'].map(t => (
          <button key={t} onClick={() => setTab(t)} style={{ padding: '6px 18px', borderRadius: 8, border: `1px solid ${tab === t ? COLORS.lime : COLORS.border}`, background: tab === t ? COLORS.lime + '22' : 'transparent', color: tab === t ? COLORS.lime : COLORS.muted, fontSize: 13, cursor: 'pointer', textTransform: 'capitalize' }}>
            {t}
          </button>
        ))}
      </div>

      {tab === 'positions' && (
        positions?.length === 0 ? (
          <div style={{ color: COLORS.muted, textAlign: 'center', padding: 32 }}>No open positions</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['Symbol', 'Qty', 'Avg Entry', 'Current', 'P&L', 'P&L %', 'Market Value'].map(h => <th key={h} style={thStyle}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {(positions || []).map(p => {
                  const pnl = Number(p.unrealized_pl);
                  const pnlPct = Number(p.unrealized_plpc) * 100;
                  const isPos = pnl >= 0;
                  return (
                    <tr key={p.asset_id}>
                      <td style={{ ...tdStyle, fontWeight: 700, color: COLORS.lime }}>{p.symbol}</td>
                      <td style={tdStyle}>{p.qty}</td>
                      <td style={tdStyle}>${fmt(p.avg_entry_price)}</td>
                      <td style={tdStyle}>${fmt(p.current_price)}</td>
                      <td style={{ ...tdStyle, color: isPos ? COLORS.green : COLORS.red }}>{isPos ? '+' : ''}${fmt(pnl)}</td>
                      <td style={{ ...tdStyle, color: isPos ? COLORS.green : COLORS.red }}>{isPos ? '+' : ''}{pnlPct.toFixed(2)}%</td>
                      <td style={tdStyle}>${fmt(p.market_value)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )
      )}

      {tab === 'orders' && (
        orders?.length === 0 ? (
          <div style={{ color: COLORS.muted, textAlign: 'center', padding: 32 }}>No recent orders</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['Symbol', 'Side', 'Type', 'Qty', 'Status', 'Submitted'].map(h => <th key={h} style={thStyle}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {(orders || []).map(o => (
                  <tr key={o.id}>
                    <td style={{ ...tdStyle, fontWeight: 700, color: COLORS.lime }}>{o.symbol}</td>
                    <td style={{ ...tdStyle, color: o.side === 'buy' ? COLORS.green : COLORS.red, fontWeight: 700, textTransform: 'uppercase' }}>{o.side}</td>
                    <td style={{ ...tdStyle, textTransform: 'capitalize' }}>{o.type}</td>
                    <td style={tdStyle}>{o.qty}</td>
                    <td style={{ ...tdStyle, color: o.status === 'filled' ? COLORS.green : o.status === 'canceled' ? COLORS.muted : COLORS.neutral, textTransform: 'capitalize' }}>{o.status}</td>
                    <td style={{ ...tdStyle, color: COLORS.muted }}>{new Date(o.submitted_at).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}
    </div>
  );
}

function AIAnalysis({ symbol, quote, analysis }) {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedStrategy, setSelectedStrategy] = useState('');

  async function analyze() {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch('/api/analyze-strategy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol, quote, analysis, selectedStrategy }),
      });
      const data = await res.json();
      const text = data.content?.[0]?.text || data.error || 'No response';
      setResult(text);
    } catch (e) {
      setResult('Error: ' + e.message);
    } finally {
      setLoading(false);
    }
  }

  const strategies = ['Iron Condor', 'Bull Call Spread', 'Bear Put Spread', 'Covered Call', 'Cash-Secured Put', 'Long Straddle', 'Long Strangle'];

  return (
    <div>
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <select value={selectedStrategy} onChange={e => setSelectedStrategy(e.target.value)} style={{ background: '#1c1c1c', border: `1px solid ${COLORS.border}`, borderRadius: 8, color: COLORS.text, padding: '8px 14px', fontSize: 13, outline: 'none' }}>
          <option value="">Any strategy (let AI decide)</option>
          {strategies.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <button onClick={analyze} disabled={loading || !quote} style={{ padding: '9px 22px', borderRadius: 8, border: 'none', background: COLORS.lime, color: '#0d0d0d', fontSize: 14, fontWeight: 700, cursor: loading || !quote ? 'not-allowed' : 'pointer', opacity: loading || !quote ? 0.6 : 1 }}>
          {loading ? 'Analyzing…' : 'Analyze with Claude AI'}
        </button>
      </div>

      {result && (
        <div style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: '20px 24px', lineHeight: 1.7, fontSize: 14, color: COLORS.text, whiteSpace: 'pre-wrap' }}>
          {result}
        </div>
      )}
    </div>
  );
}

export default function TradingPage() {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const [ticker, setTicker] = useState('');
  const [symbol, setSymbol] = useState('');
  const [tab, setTab] = useState('signals');
  const [quote, setQuote] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchRef = useRef(null);
  const debounceRef = useRef(null);

  useEffect(() => {
    if (isLoaded && !user) router.push('/sign-in');
  }, [isLoaded, user, router]);

  const fetchSuggestions = useCallback(async (q) => {
    if (q.length < 1) { setSuggestions([]); return; }
    try {
      const res = await fetch(`/api/market-data?symbol=${encodeURIComponent(q)}&type=search`);
      const data = await res.json();
      setSuggestions((data.quotes || []).slice(0, 6).filter(r => r.symbol));
    } catch { setSuggestions([]); }
  }, []);

  function onTickerChange(e) {
    const v = e.target.value.toUpperCase();
    setTicker(v);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchSuggestions(v), 300);
    setShowSuggestions(true);
  }

  async function loadSymbol(sym) {
    setSymbol(sym);
    setTicker(sym);
    setShowSuggestions(false);
    setSuggestions([]);
    setLoading(true);
    setError(null);
    setQuote(null);
    setAnalysis(null);
    try {
      const res = await fetch(`/api/strategy-signals?symbol=${sym}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setQuote(data.quote);
      setAnalysis(data.analysis);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  function onSearch(e) {
    e.preventDefault();
    if (ticker.trim()) loadSymbol(ticker.trim());
  }

  const tabs = [
    { id: 'signals', label: 'Strategy Signals' },
    { id: 'options', label: 'Options Chain' },
    { id: 'ai', label: 'AI Analysis' },
    { id: 'trade', label: 'Trade' },
    { id: 'positions', label: 'Positions' },
  ];

  const popularTickers = ['AAPL', 'TSLA', 'NVDA', 'SPY', 'QQQ', 'AMZN', 'MSFT', 'META'];

  return (
    <div style={{ minHeight: '100vh', background: COLORS.bg, color: COLORS.text, fontFamily: 'var(--font-inter), sans-serif' }}>
      {/* Header */}
      <div style={{ borderBottom: `1px solid ${COLORS.border}`, padding: '14px 24px', display: 'flex', alignItems: 'center', gap: 20, position: 'sticky', top: 0, background: COLORS.bg, zIndex: 50 }}>
        <button onClick={() => router.push('/app')} style={{ background: 'none', border: 'none', color: COLORS.muted, cursor: 'pointer', fontSize: 13, padding: '4px 0', display: 'flex', alignItems: 'center', gap: 6 }}>
          ← wore.
        </button>
        <div style={{ fontSize: 18, fontWeight: 800, color: COLORS.text, fontFamily: 'var(--font-syne)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ color: COLORS.lime }}>▲</span> Day Trade
        </div>
        <div style={{ flex: 1 }} />
        <div style={{ fontSize: 12, color: COLORS.muted, background: '#1a2500', border: `1px solid #2a3a00`, borderRadius: 6, padding: '3px 10px' }}>
          Paper Trading
        </div>
      </div>

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '24px 20px' }}>
        {/* Search */}
        <div style={{ marginBottom: 28, position: 'relative' }} ref={searchRef}>
          <form onSubmit={onSearch} style={{ display: 'flex', gap: 10 }}>
            <div style={{ flex: 1, position: 'relative' }}>
              <input
                value={ticker}
                onChange={onTickerChange}
                onFocus={() => ticker && setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                placeholder="Search ticker or company name…"
                style={{ width: '100%', padding: '13px 18px', borderRadius: 12, border: `1px solid ${COLORS.border}`, background: COLORS.card, color: COLORS.text, fontSize: 15, outline: 'none', boxSizing: 'border-box', fontWeight: 600 }}
              />
              {showSuggestions && suggestions.length > 0 && (
                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#1a1a1a', border: `1px solid ${COLORS.border}`, borderRadius: 10, marginTop: 4, zIndex: 100, overflow: 'hidden' }}>
                  {suggestions.map(s => (
                    <div key={s.symbol} onMouseDown={() => loadSymbol(s.symbol)} style={{ padding: '10px 16px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1px solid ${COLORS.border}22` }}>
                      <span style={{ fontWeight: 700, color: COLORS.lime, fontSize: 14 }}>{s.symbol}</span>
                      <span style={{ fontSize: 12, color: COLORS.muted, maxWidth: '60%', textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.shortname || s.longname}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <button type="submit" style={{ padding: '13px 24px', borderRadius: 12, border: 'none', background: COLORS.lime, color: '#0d0d0d', fontSize: 14, fontWeight: 800, cursor: 'pointer' }}>
              Load
            </button>
          </form>

          <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
            {popularTickers.map(t => (
              <button key={t} onClick={() => loadSymbol(t)} style={{ padding: '4px 12px', borderRadius: 6, border: `1px solid ${COLORS.border}`, background: 'transparent', color: COLORS.muted, fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Error */}
        {error && (
          <div style={{ background: COLORS.red + '18', border: `1px solid ${COLORS.red}44`, borderRadius: 10, padding: '12px 18px', color: COLORS.red, fontSize: 14, marginBottom: 20 }}>
            {error}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div style={{ textAlign: 'center', padding: 48, color: COLORS.muted }}>
            <div style={{ fontSize: 28, marginBottom: 10 }}>⟳</div>
            Loading {ticker}…
          </div>
        )}

        {/* Content */}
        {quote && !loading && (
          <>
            <QuoteHeader quote={quote} />

            {/* Tabs */}
            <div style={{ display: 'flex', gap: 4, marginBottom: 24, borderBottom: `1px solid ${COLORS.border}`, flexWrap: 'wrap' }}>
              {tabs.map(t => (
                <button key={t.id} onClick={() => setTab(t.id)} style={{ padding: '10px 18px', background: 'none', border: 'none', borderBottom: `2px solid ${tab === t.id ? COLORS.lime : 'transparent'}`, color: tab === t.id ? COLORS.lime : COLORS.muted, fontSize: 14, fontWeight: tab === t.id ? 700 : 400, cursor: 'pointer', marginBottom: -1 }}>
                  {t.label}
                </button>
              ))}
            </div>

            {tab === 'signals' && analysis && (
              <StrategySignals signals={analysis.signals} optionStrategies={analysis.optionStrategies} />
            )}

            {tab === 'options' && <OptionsChain symbol={symbol} />}

            {tab === 'ai' && analysis && (
              <AIAnalysis symbol={symbol} quote={quote} analysis={analysis} />
            )}

            {tab === 'trade' && <TradePanel symbol={symbol} quote={quote} />}

            {tab === 'positions' && <PositionsPanel />}
          </>
        )}

        {!symbol && !loading && (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: COLORS.muted }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>📈</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: COLORS.text, marginBottom: 8, fontFamily: 'var(--font-syne)' }}>Day Trade Dashboard</div>
            <div style={{ fontSize: 14, maxWidth: 400, margin: '0 auto', lineHeight: 1.6 }}>
              Search a ticker to load real-time quotes from Yahoo Finance, technical strategy signals, options chains, and AI-powered trade analysis.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
