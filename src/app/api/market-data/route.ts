import { NextRequest, NextResponse } from 'next/server';

/**
 * API Route proxy per Massive (Polygon.io).
 * La chiave API resta SOLO lato server, mai esposta al browser.
 *
 * GET /api/market-data?ticker=AAPL&multiplier=1&timespan=minute&from=2025-01-15&to=2025-01-15
 */

const MASSIVE_API_KEY = process.env.MASSIVE_API_KEY || '';
const BASE_URL = 'https://api.polygon.io/v2/aggs/ticker';

export async function GET(request: NextRequest) {
  // Validazione API key
  if (!MASSIVE_API_KEY) {
    return NextResponse.json(
      { error: 'API key Massive non configurata sul server. Aggiungi MASSIVE_API_KEY nelle variabili ambiente.' },
      { status: 500 }
    );
  }

  // Leggi parametri dalla query
  const { searchParams } = new URL(request.url);
  const ticker = searchParams.get('ticker')?.trim().toUpperCase();
  const multiplier = searchParams.get('multiplier') || '1';
  const timespan = searchParams.get('timespan') || 'day';
  const from = searchParams.get('from');
  const to = searchParams.get('to');

  // Validazione parametri
  if (!ticker) {
    return NextResponse.json({ error: 'Parametro "ticker" mancante.' }, { status: 400 });
  }
  if (!from || !to) {
    return NextResponse.json({ error: 'Parametri "from" e "to" obbligatori.' }, { status: 400 });
  }

  // Sanitizza: solo lettere, numeri, punti per ticker
  if (!/^[A-Z0-9.]{1,10}$/.test(ticker)) {
    return NextResponse.json({ error: 'Ticker non valido.' }, { status: 400 });
  }

  // Sanitizza multiplier e timespan
  const validTimespans = ['minute', 'hour', 'day', 'week', 'month'];
  if (!validTimespans.includes(timespan)) {
    return NextResponse.json({ error: 'Timespan non valido.' }, { status: 400 });
  }
  const mult = parseInt(multiplier);
  if (isNaN(mult) || mult < 1 || mult > 60) {
    return NextResponse.json({ error: 'Multiplier non valido.' }, { status: 400 });
  }

  // Sanitizza date (YYYY-MM-DD)
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(from) || !dateRegex.test(to)) {
    return NextResponse.json({ error: 'Formato date non valido (YYYY-MM-DD).' }, { status: 400 });
  }

  // Chiama Polygon.io
  const url = `${BASE_URL}/${ticker}/range/${mult}/${timespan}/${from}/${to}?adjusted=true&sort=asc&limit=50000&apiKey=${MASSIVE_API_KEY}`;

  try {
    const response = await fetch(url, {
      headers: { 'Accept': 'application/json' },
      next: { revalidate: 300 }, // Cache 5 min lato Next.js
    });

    if (!response.ok) {
      const status = response.status;
      if (status === 403) {
        return NextResponse.json(
          { error: 'API key Massive non valida o scaduta.' },
          { status: 403 }
        );
      }
      if (status === 429) {
        return NextResponse.json(
          { error: 'Limite API raggiunto. Riprova tra qualche minuto.' },
          { status: 429 }
        );
      }
      if (status === 404) {
        return NextResponse.json(
          { error: `Ticker "${ticker}" non trovato.` },
          { status: 404 }
        );
      }
      return NextResponse.json(
        { error: `Errore API Massive (HTTP ${status}).` },
        { status: status }
      );
    }

    const data = await response.json();

    // Ritorna solo i dati necessari (senza leak della chiave API)
    return NextResponse.json({
      status: data.status,
      resultsCount: data.resultsCount,
      results: data.results || [],
    });
  } catch {
    return NextResponse.json(
      { error: 'Errore di connessione al server Massive/Polygon.io.' },
      { status: 502 }
    );
  }
}
