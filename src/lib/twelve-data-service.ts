/**
 * Twelve Data Market Data Service
 *
 * Free tier limits:
 * - 8 API calls per minute
 * - 800 calls per day
 * - Max 5000 data points per request
 * - 1min data available from Feb 10, 2020
 *
 * Rate limiting conservativo per sviluppo:
 * - Min 10s tra richieste
 * - Cache 24h per evitare chiamate ripetute
 * - Counter giornaliero per non superare 800/day
 */

const TWELVE_DATA_API_KEY = '7500a6baac884aa3a18f820fa0add6b8';
const BASE_URL = 'https://api.twelvedata.com';

// ─── Types ───────────────────────────────────────────────────────────
export interface OHLCData {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export type Timeframe = '1min' | '5min' | '15min' | '30min' | '1h' | '1day';

// ─── Cache ───────────────────────────────────────────────────────────
const dataCache: Record<string, { data: OHLCData[]; fetchedAt: number }> = {};
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 ore

// ─── Rate Limiting (conservativo per sviluppo) ───────────────────────
let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 8_000; // 8 secondi tra richieste (max 7/min, sotto il limite di 8/min)
let dailyRequestCount = 0;
let dailyResetDate = new Date().toDateString();
const MAX_DAILY_REQUESTS = 600; // Margine sicuro sotto 800

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
      `Limite giornaliero raggiunto (${MAX_DAILY_REQUESTS} richieste). ` +
      `Le richieste si resettano a mezzanotte UTC. Riprova domani.`
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

// ─── Twelve Data interval mapping ────────────────────────────────────
function getInterval(tf: Timeframe): string {
  const map: Record<Timeframe, string> = {
    '1min': '1min',
    '5min': '5min',
    '15min': '15min',
    '30min': '30min',
    '1h': '1h',
    '1day': '1day',
  };
  return map[tf];
}

// ─── Date range calc ────────────────────────────────────────────────
function getDateRange(tradeDate: string | undefined, timeframe: Timeframe): { start: string; end: string } {
  const target = tradeDate ? new Date(tradeDate + 'T12:00:00') : new Date();

  if (timeframe === '1day') {
    // Per daily: ±90 giorni dalla data dell'operazione per avere contesto sufficiente
    const start = new Date(target);
    start.setDate(start.getDate() - 90);
    const end = new Date(target);
    end.setDate(end.getDate() + 30);
    // Non andare oltre oggi
    const today = new Date();
    if (end > today) end.setTime(today.getTime());
    return {
      start: formatDate(start),
      end: formatDate(end),
    };
  } else {
    // Per intraday (1min): giorno esatto dell'operazione
    // Usiamo orari di mercato ampi per catturare pre/after-market se disponibili
    const dateStr = tradeDate || formatDate(target);
    return {
      start: `${dateStr} 00:00:00`,
      end: `${dateStr} 23:59:59`,
    };
  }
}

function formatDate(d: Date): string {
  return d.toISOString().split('T')[0];
}

// ET offset: EDT=4 (2nd Sun Mar – 1st Sun Nov), EST=5 (rest of year)
function etOffsetForDate(dateStr: string): number {
  const y  = +dateStr.slice(0, 4);
  const mo = +dateStr.slice(5, 7);
  const d  = +dateStr.slice(8, 10);
  let dstStart = 8;
  let sun = 0;
  for (let day = 1; day <= 31; day++) {
    if (new Date(y, 2, day).getDay() === 0) { sun++; if (sun === 2) { dstStart = day; break; } }
  }
  let dstEnd = 1;
  for (let day = 1; day <= 7; day++) {
    if (new Date(y, 10, day).getDay() === 0) { dstEnd = day; break; }
  }
  const inDST = (mo > 3 && mo < 11) || (mo === 3 && d >= dstStart) || (mo === 11 && d < dstEnd);
  return inDST ? 4 : 5;
}

// Twelve Data restituisce "YYYY-MM-DD HH:MM:SS" in America/New_York → epoch ms (UTC)
function parseTwelveDataDatetime(dt: string): number {
  if (!dt.includes(' ')) dt = dt + ' 12:00:00';
  const [datePart, timePart] = dt.split(' ');
  const [y, mo, d] = datePart.split('-').map(Number);
  const [h, m, s]  = timePart.split(':').map(Number);
  const offset = etOffsetForDate(datePart);
  return Date.UTC(y, mo - 1, d, h + offset, m, s);
}

// ─── Main fetch function ─────────────────────────────────────────────
export async function getOHLCData(
  ticker: string,
  timeframe: Timeframe = '1day',
  tradeDate?: string
): Promise<OHLCData[]> {
  // Pulisci il ticker (rimuovi spazi, uppercase)
  const cleanTicker = ticker.trim().toUpperCase();

  if (!cleanTicker) {
    throw new Error('Ticker non specificato. Inserisci un simbolo valido (es. AAPL, MSFT).');
  }

  // Calcola date range
  const { start, end } = getDateRange(tradeDate, timeframe);
  const cacheKey = getCacheKey(cleanTicker, timeframe, `${start}_${end}`);

  // Check cache prima
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

  // Costruisci URL
  const interval = getInterval(timeframe);
  const params = new URLSearchParams({
    symbol: cleanTicker,
    interval,
    start_date: start,
    end_date: end,
    outputsize: '5000',
    order: 'ASC', // Ordine cronologico
    apikey: TWELVE_DATA_API_KEY,
  });

  const url = `${BASE_URL}/time_series?${params.toString()}`;

  // Fetch
  let response: Response;
  try {
    response = await fetch(url);
  } catch {
    throw new Error(
      'Errore di connessione: impossibile raggiungere Twelve Data. Controlla la connessione internet.'
    );
  }

  if (!response.ok) {
    throw new Error(
      `Errore API Twelve Data (HTTP ${response.status}). Riprova tra qualche secondo.`
    );
  }

  const json = await response.json();

  // ─── Gestione errori API ─────────────────────────────────────────
  if (json.status === 'error') {
    const code = json.code || 0;
    const msg = json.message || '';

    // Errore: ticker non trovato
    if (code === 400 || msg.includes('not found') || msg.includes('not available')) {
      throw new Error(
        `Ticker "${cleanTicker}" non trovato su Twelve Data. ` +
        `Verifica che il simbolo sia corretto (es. AAPL, MSFT, EURUSD).`
      );
    }

    // Errore: rate limit
    if (code === 429 || msg.includes('exceeded') || msg.includes('limit')) {
      throw new Error(
        `Limite API raggiunto. Con il piano gratuito hai 8 richieste al minuto e 800 al giorno. ` +
        `Riprova tra qualche minuto.`
      );
    }

    // Errore: endpoint premium
    if (msg.includes('premium') || msg.includes('upgrade') || msg.includes('subscription')) {
      throw new Error(
        `Questo tipo di dati richiede un piano premium su Twelve Data. ` +
        `Prova con il timeframe "1D" (giornaliero) che e disponibile nel piano gratuito.`
      );
    }

    // Errore generico
    throw new Error(
      `Errore Twelve Data: ${msg || 'errore sconosciuto'}. Codice: ${code}`
    );
  }

  // ─── Parse dei dati ─────────────────────────────────────────────
  const values = json.values;

  if (!values || !Array.isArray(values) || values.length === 0) {
    // Cache anche il risultato vuoto per evitare chiamate ripetute
    dataCache[cacheKey] = { data: [], fetchedAt: Date.now() };

    if (timeframe !== '1day') {
      throw new Error(
        `Nessun dato al minuto trovato per "${cleanTicker}" nella data ${tradeDate || 'selezionata'}. ` +
        `Possibili cause: mercato chiuso (weekend/festivo), ticker non disponibile in intraday, ` +
        `o dati storici non coperti dal piano gratuito (disponibile dal 10 Feb 2020). ` +
        `Prova con la vista Giornaliera per verificare che il ticker esista.`
      );
    }

    throw new Error(
      `Nessun dato giornaliero trovato per "${cleanTicker}" nel periodo selezionato. ` +
      `Il ticker potrebbe essere delisted o non supportato.`
    );
  }

  // Converti in formato OHLCData
  // IMPORTANTE: Twelve Data restituisce datetime come "YYYY-MM-DD HH:MM:SS" in America/New_York (ET).
  // Non usare new Date() direttamente perché interpreta la stringa come ora locale del browser.
  // Convertiamo manualmente: appendo 'T' e '-05:00' (EST) o '-04:00' (EDT) secondo DST.
  const ohlcData: OHLCData[] = values.map((v: any) => ({
    timestamp: parseTwelveDataDatetime(v.datetime),
    open: parseFloat(v.open),
    high: parseFloat(v.high),
    low: parseFloat(v.low),
    close: parseFloat(v.close),
    volume: parseInt(v.volume || '0', 10),
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
