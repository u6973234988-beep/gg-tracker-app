/**
 * Massive (Polygon.io) Market Data Service
 *
 * API: https://api.massive.com
 * Endpoints used:
 *   - GET /v2/aggs/ticker/{ticker}/range/{multiplier}/{timespan}/{from}/{to}
 *     → stocks custom bars (OHLC)
 *
 * Free plan notes:
 *   - EOD (daily) data: unlimited history
 *   - 1-minute intraday: available (per free plan)
 *   - Results in Eastern Time (ET)
 */

const MASSIVE_API_KEY =
  process.env.NEXT_PUBLIC_MASSIVE_API_KEY || 'epQfueTpEXQqyfaW7asLXKJHOWXduQ9J';
const BASE_URL = 'https://api.massive.com';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface OHLCBar {
  timestamp: number; // Unix ms — start of the bar
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export type MassiveTimeframe = '1min' | '1day';

// ─── Cache ───────────────────────────────────────────────────────────────────

const dataCache = new Map<string, { data: OHLCBar[]; fetchedAt: number }>();
const CACHE_TTL_INTRADAY = 5 * 60 * 1000;  // 5 min for 1-min data
const CACHE_TTL_DAILY    = 24 * 60 * 60 * 1000; // 24h for daily data

// ─── Helpers ─────────────────────────────────────────────────────────────────

function cacheKey(ticker: string, tf: MassiveTimeframe, from: string, to: string) {
  return `${ticker}|${tf}|${from}|${to}`;
}

function formatDate(d: Date): string {
  return d.toISOString().split('T')[0]; // YYYY-MM-DD
}

/**
 * Calculate the date range to fetch based on timeframe and trade date.
 *
 * - 1min  → exactly the trade execution day (from 00:00 to 23:59 ET)
 * - 1day  → 90 calendar days before the trade date up to the trade date (inclusive)
 *           so the chart ends on the trade day (no future candles)
 */
function getDateRange(
  tradeDate: string,
  tf: MassiveTimeframe
): { from: string; to: string } {
  const tradeDateObj = new Date(`${tradeDate}T12:00:00`);

  if (tf === '1min') {
    // Only show that specific trading day
    return { from: tradeDate, to: tradeDate };
  }

  // Daily: last ~90 days up to the trade execution date (no future data)
  const from = new Date(tradeDateObj);
  from.setDate(from.getDate() - 90);
  return { from: formatDate(from), to: tradeDate };
}

// ─── Main fetch ───────────────────────────────────────────────────────────────

export async function fetchOHLCBars(
  ticker: string,
  tf: MassiveTimeframe,
  tradeDate: string
): Promise<OHLCBar[]> {
  const clean = ticker.trim().toUpperCase();
  if (!clean) throw new Error('Ticker non specificato.');

  const { from, to } = getDateRange(tradeDate, tf);
  const key = cacheKey(clean, tf, from, to);

  // Check cache
  const cached = dataCache.get(key);
  const ttl = tf === '1min' ? CACHE_TTL_INTRADAY : CACHE_TTL_DAILY;
  if (cached && Date.now() - cached.fetchedAt < ttl) {
    if (cached.data.length === 0) {
      throw new Error(`Nessun dato disponibile per "${clean}" in cache.`);
    }
    return cached.data;
  }

  // Build Massive API URL
  // timespan: 'minute' or 'day'
  const multiplier = 1;
  const timespan   = tf === '1min' ? 'minute' : 'day';

  const params = new URLSearchParams({
    adjusted: 'true',
    sort:     'asc',
    limit:    '50000',
    apiKey:   MASSIVE_API_KEY,
  });

  const url = `${BASE_URL}/v2/aggs/ticker/${clean}/range/${multiplier}/${timespan}/${from}/${to}?${params.toString()}`;

  let response: Response;
  try {
    response = await fetch(url);
  } catch {
    throw new Error(
      'Errore di connessione: impossibile raggiungere Massive API. Controlla la connessione internet.'
    );
  }

  if (!response.ok) {
    if (response.status === 403) {
      throw new Error('API key Massive non valida o non autorizzata (HTTP 403).');
    }
    if (response.status === 429) {
      throw new Error('Limite richieste Massive raggiunto (HTTP 429). Riprova tra qualche secondo.');
    }
    throw new Error(`Errore Massive API: HTTP ${response.status}.`);
  }

  const json = await response.json();

  if (json.status === 'ERROR' || json.error) {
    throw new Error(`Errore Massive API: ${json.error || json.message || 'Errore sconosciuto.'}`);
  }

  const results: any[] = json.results || [];

  if (results.length === 0) {
    dataCache.set(key, { data: [], fetchedAt: Date.now() });

    if (tf === '1min') {
      throw new Error(
        `Nessun dato 1 minuto trovato per "${clean}" in data ${tradeDate}. ` +
        `Il mercato potrebbe essere chiuso quel giorno. Prova con la vista Giornaliera.`
      );
    }
    throw new Error(
      `Nessun dato giornaliero trovato per "${clean}". ` +
      `Il ticker potrebbe essere non supportato o delisted.`
    );
  }

  const bars: OHLCBar[] = results.map((r: any) => ({
    timestamp: r.t,          // already Unix ms
    open:      r.o,
    high:      r.h,
    low:       r.l,
    close:     r.c,
    volume:    r.v ?? 0,
  }));

  dataCache.set(key, { data: bars, fetchedAt: Date.now() });
  return bars;
}

// ─── Polygon-compatible Datafeed for KLineChart Pro ──────────────────────────
// KLineChart Pro's DefaultDatafeed expects a Polygon.io-compatible API.
// Massive uses the exact same REST schema as Polygon.io, so we can pass the
// API key directly to DefaultDatafeed with the Massive base URL.
export { MASSIVE_API_KEY };
