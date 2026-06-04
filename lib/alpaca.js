const BASE_URL = process.env.ALPACA_BASE_URL || 'https://paper-api.alpaca.markets';
const DATA_URL = 'https://data.alpaca.markets';

function authHeaders() {
  return {
    'APCA-API-KEY-ID': process.env.ALPACA_API_KEY || '',
    'APCA-API-SECRET-KEY': process.env.ALPACA_SECRET_KEY || '',
    'Content-Type': 'application/json',
  };
}

async function alpacaFetch(url, options = {}) {
  const res = await fetch(url, { ...options, headers: { ...authHeaders(), ...(options.headers || {}) } });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || `Alpaca error ${res.status}`);
  return data;
}

export function getAccount() {
  return alpacaFetch(`${BASE_URL}/v2/account`);
}

export function getPositions() {
  return alpacaFetch(`${BASE_URL}/v2/positions`);
}

export function getOrders(status = 'all', limit = 50) {
  return alpacaFetch(`${BASE_URL}/v2/orders?status=${status}&limit=${limit}`);
}

export function placeOrder(order) {
  return alpacaFetch(`${BASE_URL}/v2/orders`, {
    method: 'POST',
    body: JSON.stringify(order),
  });
}

export function getOptionsContracts({ symbol, expiration_date_gte, expiration_date_lte, strike_price_gte, strike_price_lte, option_type, limit = 100 }) {
  const p = new URLSearchParams({ underlying_symbols: symbol, limit: String(limit) });
  if (expiration_date_gte) p.set('expiration_date_gte', expiration_date_gte);
  if (expiration_date_lte) p.set('expiration_date_lte', expiration_date_lte);
  if (strike_price_gte) p.set('strike_price_gte', String(strike_price_gte));
  if (strike_price_lte) p.set('strike_price_lte', String(strike_price_lte));
  if (option_type) p.set('type', option_type);
  return alpacaFetch(`${BASE_URL}/v2/options/contracts?${p}`);
}

export function getOptionsSnapshot(symbol) {
  return alpacaFetch(`${DATA_URL}/v1beta1/options/snapshots/${symbol}?feed=indicative`);
}
