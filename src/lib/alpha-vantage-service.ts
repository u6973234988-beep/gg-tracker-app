const ALPHA_VANTAGE_API_KEY = 'DUWKUF1DX3GSHMM7';
const BASE_URL = 'https://www.alphavantage.co/query';

export interface OHLCData {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

type Timeframe = '1min' | '5min' | '15min' | '30min' | '60min' | 'daily';

// Simple in-memory cache
const dataCache: Record<string, { data: OHLCData[]; fetchedAt: number }> = {};
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

// Rate limit tracking
let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 12500; // 5 requests per minute = 12s between

async function waitForRateLimit() {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;
  if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
    await new Promise((resolve) =>
      setTimeout(resolve, MIN_REQUEST_INTERVAL - timeSinceLastRequest)
    );
  }
  lastRequestTime = Date.now();
}

function getCacheKey(ticker: string, timeframe: Timeframe): string {
  return `${ticker}_${timeframe}`;
}

export async function getOHLCData(
  ticker: string,
  timeframe: Timeframe = '5min',
  tradeDate?: string
): Promise<OHLCData[]> {
  const cacheKey = getCacheKey(ticker, timeframe);
  const cached = dataCache[cacheKey];
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL) {
    const filtered = filterByDate(cached.data, tradeDate);
    if (filtered.length === 0) {
      throw new Error(`Nessun dato disponibile per "${ticker}" nella data ${tradeDate || 'selezionata'}. I dati in cache non coprono questo periodo.`);
    }
    return filtered;
  }

  await waitForRateLimit();

  let url: string;

  if (timeframe === 'daily') {
    url = `${BASE_URL}?function=TIME_SERIES_DAILY&symbol=${encodeURIComponent(ticker)}&outputsize=compact&apikey=${ALPHA_VANTAGE_API_KEY}&datatype=json`;
  } else {
    url = `${BASE_URL}?function=TIME_SERIES_INTRADAY&symbol=${encodeURIComponent(ticker)}&interval=${timeframe}&outputsize=full&apikey=${ALPHA_VANTAGE_API_KEY}&datatype=json`;
  }

  let response: Response;
  try {
    response = await fetch(url);
  } catch (err) {
    // Network error
    if (cached) {
      return filterByDate(cached.data, tradeDate);
    }
    throw new Error(`Errore di connessione: impossibile raggiungere Alpha Vantage. Controlla la connessione internet.`);
  }

  if (!response.ok) {
    if (cached) {
      return filterByDate(cached.data, tradeDate);
    }
    throw new Error(`Errore API Alpha Vantage (${response.status}). Riprova tra qualche secondo.`);
  }

  const json = await response.json();

  // Check for API-specific errors with clear messages
  if (json['Error Message']) {
    throw new Error(`Ticker "${ticker}" non trovato su Alpha Vantage. Verifica che il simbolo sia corretto (es. AAPL, MSFT, EURUSD).`);
  }

  if (json['Note'] || json['Information']) {
    const msg = json['Note'] || json['Information'];
    if (msg.includes('call volume') || msg.includes('API call frequency')) {
      throw new Error(`Limite API raggiunto (max 25 richieste/giorno con piano gratuito). Riprova tra qualche minuto oppure attendi il reset giornaliero.`);
    }
    throw new Error(`Avviso da Alpha Vantage: ${msg}`);
  }

  const timeSeriesKey = timeframe === 'daily'
    ? 'Time Series (Daily)'
    : `Time Series (${timeframe})`;

  const timeSeries = json[timeSeriesKey];
  if (!timeSeries) {
    throw new Error(`Nessun dato disponibile per "${ticker}" con timeframe ${timeframe}. Il ticker potrebbe non supportare dati intraday oppure il mercato e chiuso.`);
  }

  const ohlcData: OHLCData[] = Object.entries(timeSeries)
    .map(([dateStr, values]: [string, any]) => ({
      timestamp: new Date(dateStr).getTime(),
      open: parseFloat(values['1. open']),
      high: parseFloat(values['2. high']),
      low: parseFloat(values['3. low']),
      close: parseFloat(values['4. close']),
      volume: parseInt(values['5. volume'], 10),
    }))
    .sort((a, b) => a.timestamp - b.timestamp);

  if (ohlcData.length === 0) {
    throw new Error(`Alpha Vantage ha risposto ma senza dati per "${ticker}". Il ticker potrebbe essere delisted o non disponibile.`);
  }

  // Cache the data
  dataCache[cacheKey] = { data: ohlcData, fetchedAt: Date.now() };

  const filtered = filterByDate(ohlcData, tradeDate);
  if (filtered.length === 0) {
    throw new Error(`Dati trovati per "${ticker}" ma nessuno corrisponde alla data ${tradeDate}. Prova con il timeframe "1D" per una visione piu ampia.`);
  }

  return filtered;
}

function filterByDate(data: OHLCData[], tradeDate?: string): OHLCData[] {
  if (!tradeDate || data.length === 0) return data;

  const targetDate = new Date(tradeDate);
  const dayStart = new Date(targetDate);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(targetDate);
  dayEnd.setHours(23, 59, 59, 999);

  // For intraday, filter to the trade day; for daily, return wider range
  const filtered = data.filter((d) => {
    const dDate = new Date(d.timestamp);
    // For intraday data, filter to specific day
    if (data.length > 100) {
      return dDate >= dayStart && dDate <= dayEnd;
    }
    // For daily data, return range around the date (±30 days)
    const diffDays = Math.abs((dDate.getTime() - targetDate.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays <= 30;
  });

  return filtered.length > 0 ? filtered : data.slice(-100);
}
