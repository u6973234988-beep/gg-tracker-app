import { NextRequest, NextResponse } from 'next/server';
import { getOHLCData } from '@/lib/twelve-data-service';

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const ticker    = searchParams.get('ticker')    ?? 'DEVS';
  const tradeDate = searchParams.get('tradeDate') ?? '2026-03-13';
  const entryTime = searchParams.get('entryTime') ?? '';
  const exitTime  = searchParams.get('exitTime')  ?? '';

  try {
    const data = await getOHLCData(ticker, '1min', tradeDate);

    const first5 = data.slice(0, 5).map(c => ({ datetime: c.datetime, ts: c.timestamp }));
    const last5  = data.slice(-5).map(c => ({ datetime: c.datetime, ts: c.timestamp }));

    const entryMatch = entryTime
      ? data.find(c => c.datetime.includes(` ${entryTime}`)) ??
        data.find(c => c.datetime.includes(` ${entryTime.slice(0,5)}:`))
      : null;

    const exitMatch = exitTime
      ? data.find(c => c.datetime.includes(` ${exitTime}`)) ??
        data.find(c => c.datetime.includes(` ${exitTime.slice(0,5)}:`))
      : null;

    return NextResponse.json({
      total: data.length,
      first5,
      last5,
      entryTime,
      exitTime,
      entryMatch: entryMatch ? { datetime: entryMatch.datetime, ts: entryMatch.timestamp } : null,
      exitMatch:  exitMatch  ? { datetime: exitMatch.datetime,  ts: exitMatch.timestamp  } : null,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
