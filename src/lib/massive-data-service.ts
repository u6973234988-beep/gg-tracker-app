/**
 * Massive (ex Polygon.io) Market Data Service - Client Side
 *
 * Chiama l'API route interna /api/market-data che fa da proxy sicuro.
 * La chiave API resta SOLO sul server, mai esposta al browser.
 *
 * Rate limiting (free tier):
 * - 5 API calls per minute
 * - Max 50000 data points per request
 *
 * Cache 24h lato client per evitare chiamate ripetute.
 */

// ─── Types ───────────────────────────────────────────────────────────
export interface OHLCData {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export type Timeframe = '1min' | '2min' | '1day';

// ─── Cache ───────────────────────────────────────────────────────────
const dataCache: Record<string, { data: OHLCData[]; fetchedAt: number }> = {};
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 ore

// ─── Rate Limiting (client-side) ────────────────────────────────────
let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 13_000; // 13s tra richieste (5/min free tier)
let dailyRequestCount = 0;
let dailyResetDate = new Date().toDateString();
const MAX_DAILY_REQUESTS = 400;

function resetDailyCounterIfNeeded() {
  const today = new Date().toDateString();
  if (today !== dailyResetDate) {
    dailyRequestCount = 0;
    dailyResetDate = today;
  }
}

async function waitForRateLimit(): Promise<void> {
  resetDailyCounterIfNeeded();

  if (dailyRequestCount >= MAX_DAILY_REQUESTS) {
    throw new Error(
      `Limite giornaliero raggiunto (${MAX_DAILY_REQUESTS} richieste). Riprova domani.`
    );
  }

  const now = Date.now();
  const elapsed = now - lastRequestTime;
  if (elapsed < MIN_REQUEST_INTERVAL) {
    await new Promise((r) => setTimeout(r, MIN_REQUEST_INTERVAL - elapsed));
  }
  lastRequestTime = Date.now();
  dailyRequestCount++;
}

// ─── Cache Key ───────────────────────────────────────────────────────
function getCacheKey(ticker: string, timeframe: Timeframe, dateRange: string): string {
  return `${ticker}_${timeframe}_${dateRange}`;
}

// ─── Timeframe to Polygon params ─────────────────────────────────────
function getPolygonParams(tf: Timeframe): { multiplier: number; timespan: string } {
  switch (tf) {
    case '1min': return { multiplier: 1, timespan: 'minute' };
    case '2min': return { multiplier: 2, timespan: 'minute' };
    case '1day': return { multiplier: 1, timespan: 'day' };
  }
}

// ─── Date range calc ────────────────────────────────────────────────
function getDateRange(tradeDate: string | undefined, timeframe: Timeframe): { start: string; end: string } {
  const target = tradeDate ? new Date(tradeDate + 'T12:00:00') : new Date();

  if (timeframe === '1day') {
    const start = new Date(target);
    start.setDate(start.getDate() - 60);
    const end = new Date(target);
    end.setDate(end.getDate() + 30);
    const today = new Date();
    if (end > today) end.setTime(today.getTime());
    return {
      start: formatDate(start),
      end: formatDate(end),
    };
  } else {
    // Per intraday: giorno esatto dell'operazione
    const dateStr = tradeDate || formatDate(target);
    return { start: dateStr, end: dateStr };
  }
}

function formatDate(d: Date): string {
  return d.toISOString().split('T')[0];
}

// ─── Main fetch function ─────────────────────────────────────────────
export async function getOHLCData(
  ticker: string,
  timeframe: Timeframe = '1day',
  tradeDate?: string
): Promise<OHLCData[]> {
  const cleanTicker = ticker.trim().toUpperCase();

  if (!cleanTicker) {
    throw new Error('Ticker non specificato. Inserisci un simbolo valido (es. AAPL, MSFT).');
  }

  // Calcola date range
  const { start, end } = getDateRange(tradeDate, timeframe);
  const cacheKey = getCacheKey(cleanTicker, timeframe, `${start}_${end}`);

  // Check cache
  const cached = dataCache[cacheKey];
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL) {
    if (cached.data.length === 0) {
      throw new Error(
        `Nessun dato disponibile per "${cleanTicker}" nel periodo selezionato (dati in cache).`
      );
    }
    return cached.data;
  }

  // Rate limit
  await waitForRateLimit();

  // Build URL per API route interna (la chiave API resta sul server)
  const { multiplier, timespan } = getPolygonParams(timeframe);
  const params = new URLSearchParams({
    ticker: cleanTicker,
    multiplier: String(multiplier),
    timespan,
    from: start,
    to: end,
  });
  const url = `/api/market-data?${params.toString()}`;

  // Fetch tramite API route proxy
  let response: Response;
  try {
    response = await fetch(url);
  } catch {
    throw new Error(
      'Errore di connessione: impossibile raggiungere il server. Controlla la connessione internet.'
    );
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const errorMsg = errorData?.error || `Errore HTTP ${response.status}`;

    if (response.status === 500 && errorMsg.includes('non configurata')) {
      throw new Error('API key Massive non configurata sul server. Contatta l\'amministratore.');
    }
    if (response.status === 403) {
      throw new Error('API key Massive non valida o scaduta.');
    }
    if (response.status === 429) {
      throw new Error('Limite API raggiunto. Riprova tra qualche minuto.');
    }
    if (response.status === 404) {
      throw new Error(`Ticker "${cleanTicker}" non trovato su Massive/Polygon.io.`);
    }
    throw new Error(errorMsg);
  }

  const json = await response.json();

  // Check API status
  if (json.status === 'ERROR' || json.status === 'NOT_FOUND') {
    throw new Error(`Errore Massive: ${json.message || json.error || 'ticker non trovato'}`);
  }

  // Parse results
  const results = json.results;

  if (!results || !Array.isArray(results) || results.length === 0) {
    dataCache[cacheKey] = { data: [], fetchedAt: Date.now() };

    if (timeframe !== '1day') {
      throw new Error(
        `Nessun dato intraday (${timeframe}) trovato per "${cleanTicker}" nella data ${tradeDate || 'selezionata'}. ` +
        `Possibili cause: mercato chiuso, ticker non supportato per intraday, o dati non disponibili. ` +
        `Prova con il timeframe "1D" (giornaliero).`
      );
    }

    throw new Error(
      `Nessun dato giornaliero trovato per "${cleanTicker}" nel periodo selezionato. ` +
      `Il ticker potrebbe essere delisted o non supportato.`
    );
  }

  // Converti: Polygon {o,h,l,c,v,t} -> OHLCData {open,high,low,close,volume,timestamp}
  const ohlcData: OHLCData[] = results.map((r: any) => ({
    timestamp: r.t,  // gia in millisecondi Unix
    open: r.o,
    high: r.h,
    low: r.l,
    close: r.c,
    volume: r.v || 0,
  }));

  // Salva in cache
  dataCache[cacheKey] = { data: ohlcData, fetchedAt: Date.now() };

  return ohlcData;
}

// ─── Utility: info sulle chiamate rimaste ─────────────────────────
export function getApiUsageInfo(): { daily: number; remaining: number; limit: number } {
  resetDailyCounterIfNeeded();
  return {
    daily: dailyRequestCount,
    remaining: MAX_DAILY_REQUESTS - dailyRequestCount,
    limit: MAX_DAILY_REQUESTS,
  };
}
