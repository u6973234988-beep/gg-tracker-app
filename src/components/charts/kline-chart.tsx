'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { init, dispose, registerOverlay } from 'klinecharts';
import type { Chart } from 'klinecharts';
import { getOHLCData, getApiUsageInfo } from '@/lib/twelve-data-service';
import type { Timeframe, OHLCData } from '@/lib/twelve-data-service';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, RefreshCw, AlertTriangle, BarChart2, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────
interface TradeMarker {
  entryPrice: number;
  exitPrice: number | null;
  entryTime?: string | null;  // "HH:MM:SS" stored in local/ET market time
  exitTime?: string | null;
  direction: string;
  stopLoss?: number | null;
  takeProfit?: number | null;
  pnl?: number | null;
  quantity?: number;
}

interface KlineChartProps {
  ticker: string;
  tradeDate: string;    // 'YYYY-MM-DD'
  trade: TradeMarker;
  height?: string;
  className?: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────
const TIMEFRAMES: { label: string; value: Timeframe }[] = [
  { label: 'Giornaliero', value: '1day' },
  { label: '1 Minuto',    value: '1min' },
];

// ─── Timezone helpers ─────────────────────────────────────────────────────────
// Twelve Data returns 1min candle timestamps in the exchange's local time
// (America/New_York for US stocks) serialised as epoch ms.
// When user stores "09:34:00" for ora_entrata, it means 09:34 ET.
// We convert "HH:MM:SS" + "YYYY-MM-DD" → epoch ms in ET.
function etTimeToMs(timeStr: string, dateStr: string): number | null {
  if (!timeStr || !dateStr) return null;
  try {
    // Build an ISO string that represents ET (UTC-5 standard, UTC-4 daylight).
    // We use Intl to detect the actual ET offset for that date.
    const naive = `${dateStr}T${timeStr.slice(0, 8).padEnd(8, ':00').slice(0, 8)}`;
    // Use a known ET timezone identifier
    const dt = new Date(naive + ':00');
    if (isNaN(dt.getTime())) return null;

    // Get the UTC offset for New York on that specific date (handles DST)
    const nyFormatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/New_York',
      hour: 'numeric', minute: 'numeric', second: 'numeric',
      hour12: false,
      year: 'numeric', month: '2-digit', day: '2-digit',
    });

    // Build a Date that represents dateStr HH:MM:SS in America/New_York
    // by using a trick: parse the naive string as if it were UTC, then
    // adjust by the NY offset.
    const [h, m, s] = timeStr.split(':').map(Number);
    const utcCandidate = Date.UTC(
      parseInt(dateStr.slice(0, 4)),
      parseInt(dateStr.slice(5, 7)) - 1,
      parseInt(dateStr.slice(8, 10)),
      h, m, s ?? 0,
    );

    // Get the NY offset at this approximate UTC time
    const nyParts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/New_York',
      timeZoneName: 'shortOffset',
    }).formatToParts(new Date(utcCandidate));

    const offsetPart = nyParts.find(p => p.type === 'timeZoneName')?.value ?? 'GMT-5';
    // offsetPart is like "GMT-5" or "GMT-4"
    const match = offsetPart.match(/GMT([+-])(\d+)/);
    if (!match) {
      // Fallback: assume ET = UTC-5
      return utcCandidate + 5 * 3600_000;
    }
    const sign = match[1] === '-' ? 1 : -1;
    const hours = parseInt(match[2]);
    // utcCandidate is "naive UTC" (treated the time as UTC) but time is actually ET
    // So real UTC = naive UTC + offset (converting ET → UTC)
    return utcCandidate + sign * hours * 3600_000;
  } catch {
    return null;
  }
}

/**
 * Resolve entry/exit time to epoch ms, handling multiple formats:
 * - "HH:MM:SS" or "HH:MM" → treated as America/New_York time
 * - Full ISO string → parsed directly
 */
function resolveTimestampMs(timeStr: string | null | undefined, dateStr: string): number | null {
  if (!timeStr) return null;
  try {
    // Full ISO datetime
    if (timeStr.includes('T') || /^\d{4}-\d{2}-\d{2}/.test(timeStr)) {
      const ms = new Date(timeStr).getTime();
      return isNaN(ms) ? null : ms;
    }
    // HH:MM:SS or HH:MM — treat as ET (America/New_York)
    return etTimeToMs(timeStr, dateStr);
  } catch {
    return null;
  }
}

/** Find the candle whose timestamp is closest to targetMs. */
function nearestCandle(data: OHLCData[], targetMs: number): OHLCData {
  let best = data[0];
  let bestDiff = Math.abs(data[0].timestamp - targetMs);
  for (const c of data) {
    const d = Math.abs(c.timestamp - targetMs);
    if (d < bestDiff) { bestDiff = d; best = c; }
  }
  return best;
}

/** Find a candle by calendar date (YYYY-MM-DD) in any timezone. */
function candleByDate(data: OHLCData[], dateStr: string): OHLCData | null {
  // The trade date is YYYY-MM-DD. candle timestamps are epoch ms.
  // We compare the date in ET (US market timezone).
  const [y, mo, d] = dateStr.split('-').map(Number);
  return (
    data.find(c => {
      const dt = new Date(c.timestamp);
      // Check in ET
      const etParts = new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/New_York',
        year: 'numeric', month: '2-digit', day: '2-digit',
      }).formatToParts(dt);
      const cy = parseInt(etParts.find(p => p.type === 'year')?.value ?? '0');
      const cm = parseInt(etParts.find(p => p.type === 'month')?.value ?? '0');
      const cd = parseInt(etParts.find(p => p.type === 'day')?.value ?? '0');
      return cy === y && cm === mo && cd === d;
    }) ?? null
  );
}

// ─── Register custom arrow overlays (once, globally) ─────────────────────────
let overlaysRegistered = false;

function ensureOverlaysRegistered() {
  if (overlaysRegistered) return;
  overlaysRegistered = true;

  // arrowUp: tip points UP (LONG entry below candle, or SHORT exit below candle)
  try {
    registerOverlay({
      name: 'arrowUp',
      totalStep: 2,
      needDefaultPointFigure: false,
      needDefaultXAxisFigure: false,
      needDefaultYAxisFigure: false,
      createPointFigures({ overlay, coordinates }) {
        if (!coordinates?.length) return [];
        const { x, y } = coordinates[0];
        const ext = overlay.extendData as { color: string; label: string };
        const color = ext?.color ?? '#22c55e';
        const label = ext?.label ?? 'E';
        const W = 8;
        const H = 12;
        const tipY  = y - 4;
        const baseY = tipY + H;
        return [
          {
            type: 'polygon',
            attrs: { coordinates: [{ x, y: tipY }, { x: x - W, y: baseY }, { x: x + W, y: baseY }] },
            styles: { style: 'fill', color },
            ignoreEvent: true,
          },
          {
            type: 'text',
            attrs: { x, y: baseY + 3, text: label, align: 'center' as CanvasTextAlign, baseline: 'top' as CanvasTextBaseline },
            styles: { color, size: 10, weight: 'bold', family: 'system-ui' },
            ignoreEvent: true,
          },
        ];
      },
    });
  } catch (_) {}

  // arrowDown: tip points DOWN (LONG exit above candle, or SHORT entry above candle)
  try {
    registerOverlay({
      name: 'arrowDown',
      totalStep: 2,
      needDefaultPointFigure: false,
      needDefaultXAxisFigure: false,
      needDefaultYAxisFigure: false,
      createPointFigures({ overlay, coordinates }) {
        if (!coordinates?.length) return [];
        const { x, y } = coordinates[0];
        const ext = overlay.extendData as { color: string; label: string };
        const color = ext?.color ?? '#ef4444';
        const label = ext?.label ?? 'E';
        const W = 8;
        const H = 12;
        const tipY  = y + 4;
        const baseY = tipY - H;
        return [
          {
            type: 'polygon',
            attrs: { coordinates: [{ x, y: tipY }, { x: x - W, y: baseY }, { x: x + W, y: baseY }] },
            styles: { style: 'fill', color },
            ignoreEvent: true,
          },
          {
            type: 'text',
            attrs: { x, y: baseY - 3, text: label, align: 'center' as CanvasTextAlign, baseline: 'bottom' as CanvasTextBaseline },
            styles: { color, size: 10, weight: 'bold', family: 'system-ui' },
            ignoreEvent: true,
          },
        ];
      },
    });
  } catch (_) {}
}

// ─── ChartInner — mounts once, destroyed when key changes ────────────────────
function ChartInner({
  ticker,
  tradeDate,
  trade,
  timeframe,
  isDark,
  onLoaded,
  onError,
}: {
  ticker: string;
  tradeDate: string;
  trade: TradeMarker;
  timeframe: Timeframe;
  isDark: boolean;
  onLoaded: (remaining: number) => void;
  onError: (msg: string, remaining: number) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    ensureOverlaysRegistered();
    const el = containerRef.current;
    if (!el) return;
    let cancelled = false;
    let chart: Chart | null = null;

    async function load() {
      try {
        const ohlcData = await getOHLCData(ticker, timeframe, tradeDate);
        const usage = getApiUsageInfo();
        if (cancelled) return;

        if (!ohlcData || ohlcData.length === 0) {
          onError('Nessun dato disponibile per questo ticker/periodo.', usage.remaining);
          return;
        }

        // ── Theme ─────────────────────────────────────────────────────────
        const bg         = isDark ? '#0d0d1a' : '#ffffff';
        const gridColor  = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)';
        const textColor  = isDark ? '#6b7280' : '#9ca3af';
        const axisColor  = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)';
        const crossColor = isDark ? 'rgba(139,92,246,0.5)' : 'rgba(0,0,0,0.18)';
        const crossBg    = isDark ? '#7c3aed' : '#374151';

        // ── Init ──────────────────────────────────────────────────────────
        chart = init(el, {
          styles: {
            grid: {
              show: true,
              horizontal: { show: true, color: gridColor, size: 1, style: 'dashed' as any },
              vertical:   { show: false },
            },
            candle: {
              type: 'candle_solid' as any,
              bar: {
                upColor:         '#22c55e',
                downColor:       '#ef4444',
                upBorderColor:   '#22c55e',
                downBorderColor: '#ef4444',
                upWickColor:     '#4ade80',
                downWickColor:   '#f87171',
              },
              priceMark: {
                show: true,
                high: { show: true, color: textColor, textSize: 10 },
                low:  { show: true, color: textColor, textSize: 10 },
                last: {
                  show: true,
                  upColor: '#22c55e',
                  downColor: '#ef4444',
                  noChangeColor: textColor,
                  line: { show: true, style: 'dash' as any, size: 1 },
                  text: { show: true, size: 11, paddingLeft: 4, paddingRight: 4, paddingTop: 2, paddingBottom: 2, borderRadius: 2 },
                },
              },
            },
            xAxis: {
              show: true,
              axisLine: { show: true, color: axisColor, size: 1 },
              tickLine: { show: true, color: axisColor, size: 1, length: 3 },
              tickText: { show: true, color: textColor, size: 10 },
            },
            yAxis: {
              show: true,
              axisLine: { show: true, color: axisColor, size: 1 },
              tickLine: { show: true, color: axisColor, size: 1, length: 3 },
              tickText: { show: true, color: textColor, size: 10 },
            },
            crosshair: {
              show: true,
              horizontal: {
                show: true,
                line: { show: true, style: 'dash' as any, size: 1, color: crossColor },
                text: { show: true, size: 10, color: '#fff', borderRadius: 2, paddingLeft: 4, paddingRight: 4, paddingTop: 2, paddingBottom: 2, backgroundColor: crossBg },
              },
              vertical: {
                show: true,
                line: { show: true, style: 'dash' as any, size: 1, color: crossColor },
                text: { show: true, size: 10, color: '#fff', borderRadius: 2, paddingLeft: 4, paddingRight: 4, paddingTop: 2, paddingBottom: 2, backgroundColor: crossBg },
              },
            },
            overlay: {
              point:    { color: 'transparent', borderColor: 'transparent', borderSize: 0, radius: 0 },
              line:     { color: 'transparent', size: 0 },
              text:     { color: '#fff', size: 11, weight: 'normal', family: 'system-ui', paddingLeft: 0, paddingRight: 0, paddingTop: 0, paddingBottom: 0, borderRadius: 0, borderSize: 0, borderColor: 'transparent', backgroundColor: 'transparent' },
              rectText: { color: '#fff', size: 11, weight: 'normal', family: 'system-ui', paddingLeft: 0, paddingRight: 0, paddingTop: 0, paddingBottom: 0, borderRadius: 0, borderSize: 0, borderColor: 'transparent', backgroundColor: 'transparent' },
            },
          },
        });

        if (!chart || cancelled) {
          try { if (el) dispose(el); } catch (_) {}
          return;
        }

        el.style.backgroundColor = bg;
        chart.applyNewData(ohlcData);
        try { chart.createIndicator('VOL', false); } catch (_) {}

        // ── Resolve target candles ────────────────────────────────────────
        const isLong       = trade.direction === 'LONG';
        const isProfitable = (trade.pnl ?? 0) >= 0;

        let entryCandle: OHLCData | null = null;
        let exitCandle:  OHLCData | null = null;

        if (timeframe === '1day') {
          entryCandle = candleByDate(ohlcData, tradeDate) ?? ohlcData[Math.floor(ohlcData.length / 2)];
          exitCandle  = entryCandle;
        } else {
          // 1min: use ET-aware timestamp resolution
          const entryMs = resolveTimestampMs(trade.entryTime, tradeDate);
          const exitMs  = resolveTimestampMs(trade.exitTime, tradeDate);
          if (entryMs != null) entryCandle = nearestCandle(ohlcData, entryMs);
          if (exitMs  != null) exitCandle  = nearestCandle(ohlcData, exitMs);
          if (!entryCandle) entryCandle = ohlcData[0];
        }

        // ── Place arrow overlays ──────────────────────────────────────────
        // Offset = small % of the candle range so arrow doesn't overlap the wick
        const getOffset = (candle: OHLCData, price: number) =>
          Math.max(candle.high - candle.low, price * 0.001) * 0.5;

        if (entryCandle) {
          const offset = getOffset(entryCandle, trade.entryPrice);
          if (isLong) {
            // LONG entry: green arrow UP below candle low
            try {
              chart.createOverlay({
                name: 'arrowUp',
                points: [{ timestamp: entryCandle.timestamp, value: entryCandle.low - offset }],
                extendData: { color: '#22c55e', label: 'E' },
                lock: true,
                zLevel: 10,
              });
            } catch (_) {}
          } else {
            // SHORT entry: red arrow DOWN above candle high
            try {
              chart.createOverlay({
                name: 'arrowDown',
                points: [{ timestamp: entryCandle.timestamp, value: entryCandle.high + offset }],
                extendData: { color: '#ef4444', label: 'E' },
                lock: true,
                zLevel: 10,
              });
            } catch (_) {}
          }
        }

        if (exitCandle && trade.exitPrice != null) {
          const offset = getOffset(exitCandle, trade.exitPrice);
          const exitColor = isProfitable ? '#22c55e' : '#ef4444';
          if (isLong) {
            // LONG exit: arrow DOWN above candle high
            try {
              chart.createOverlay({
                name: 'arrowDown',
                points: [{ timestamp: exitCandle.timestamp, value: exitCandle.high + offset }],
                extendData: { color: exitColor, label: 'X' },
                lock: true,
                zLevel: 10,
              });
            } catch (_) {}
          } else {
            // SHORT exit: arrow UP below candle low
            try {
              chart.createOverlay({
                name: 'arrowUp',
                points: [{ timestamp: exitCandle.timestamp, value: exitCandle.low - offset }],
                extendData: { color: exitColor, label: 'X' },
                lock: true,
                zLevel: 10,
              });
            } catch (_) {}
          }
        }

        // ── Scroll to entry candle ────────────────────────────────────────
        const scrollTs =
          entryCandle?.timestamp ??
          exitCandle?.timestamp ??
          ohlcData[ohlcData.length - 1].timestamp;

        setTimeout(() => {
          try { (chart as any)?.scrollToTimestamp(scrollTs, 300); } catch (_) {}
        }, 100);

        onLoaded(usage.remaining);
      } catch (err: any) {
        const usage = getApiUsageInfo();
        onError(err?.message ?? 'Errore nel caricamento dati', usage.remaining);
      }
    }

    load();

    return () => {
      cancelled = true;
      try { if (el) dispose(el); } catch (_) {}
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // runs exactly once per mount

  return <div ref={containerRef} style={{ width: '100%', height: '100%' }} />;
}

// ─── Legend helpers ───────────────────────────────────────────────────────────
function ArrowSvg({ direction, color }: { direction: 'up' | 'down'; color: string }) {
  return direction === 'up' ? (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden>
      <polygon points="5,0 0,10 10,10" fill={color} />
    </svg>
  ) : (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden>
      <polygon points="5,10 0,0 10,0" fill={color} />
    </svg>
  );
}

// ─── Main exported component ──────────────────────────────────────────────────
export function KlineChartComponent({
  ticker,
  tradeDate,
  trade,
  height = '520px',
  className,
}: KlineChartProps) {
  const [timeframe, setTimeframe]       = useState<Timeframe>('1day');
  const [mountKey, setMountKey]         = useState(0);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState<string | null>(null);
  const [isDark, setIsDark]             = useState(false);
  const [apiRemaining, setApiRemaining] = useState<number | null>(null);

  // Detect dark mode
  useEffect(() => {
    const check = () => setIsDark(document.documentElement.classList.contains('dark'));
    check();
    const obs = new MutationObserver(check);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => obs.disconnect();
  }, []);

  const handleTimeframeChange = (tf: Timeframe) => {
    if (tf === timeframe || loading) return;
    setTimeframe(tf);
    setLoading(true);
    setError(null);
    setMountKey(k => k + 1);
  };

  const handleRefresh = () => {
    setLoading(true);
    setError(null);
    setMountKey(k => k + 1);
  };

  const handleLoaded = useCallback((remaining: number) => {
    setLoading(false);
    setApiRemaining(remaining);
  }, []);

  const handleError = useCallback((msg: string, remaining: number) => {
    setLoading(false);
    setError(msg);
    setApiRemaining(remaining);
  }, []);

  const isLong       = trade.direction === 'LONG';
  const isProfitable = (trade.pnl ?? 0) >= 0;

  const entryTimeLabel = trade.entryTime?.slice(0, 5) ?? null;
  const exitTimeLabel  = trade.exitTime?.slice(0, 5) ?? null;

  return (
    <div
      className={cn(
        'flex flex-col rounded-xl overflow-hidden',
        'border border-gray-200 dark:border-white/10',
        'bg-white dark:bg-[#0d0d1a]',
        className,
      )}
    >
      {/* ── Toolbar ───────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-200 dark:border-white/10 bg-gray-50/80 dark:bg-white/[0.03] shrink-0">
        {/* Left: ticker · date · direction badge · P&L */}
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-mono font-bold text-[15px] text-gray-900 dark:text-white tracking-tight shrink-0">
            {ticker}
          </span>
          <Badge
            variant="outline"
            className="text-[11px] font-mono border-gray-200 dark:border-white/15 text-gray-500 dark:text-gray-400 px-1.5 py-0 h-5 shrink-0"
          >
            {tradeDate}
          </Badge>
          <span
            className={cn(
              'text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0',
              isLong
                ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
            )}
          >
            {trade.direction}
          </span>
          {trade.pnl != null && (
            <span
              className={cn(
                'text-[12px] font-bold font-mono shrink-0',
                isProfitable ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400',
              )}
            >
              {isProfitable ? '+' : ''}{trade.pnl.toFixed(2)}$
            </span>
          )}
        </div>

        {/* Right: timeframe switcher + refresh */}
        <div className="flex items-center gap-1.5 shrink-0">
          <div className="flex items-center rounded-lg border border-gray-200 dark:border-white/10 overflow-hidden">
            {TIMEFRAMES.map((tf, i) => (
              <button
                key={tf.value}
                disabled={loading}
                onClick={() => handleTimeframeChange(tf.value)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold transition-colors select-none',
                  i > 0 && 'border-l border-gray-200 dark:border-white/10',
                  timeframe === tf.value
                    ? 'bg-gray-900 dark:bg-violet-600 text-white'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5',
                  loading && 'opacity-50 cursor-not-allowed',
                )}
              >
                {tf.value === '1day' ? <BarChart2 className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                {tf.label}
              </button>
            ))}
          </div>

          <button
            onClick={handleRefresh}
            disabled={loading}
            title="Aggiorna grafico"
            className={cn(
              'p-1.5 rounded-lg border border-gray-200 dark:border-white/10 transition-colors',
              'text-gray-400 hover:text-gray-700 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5',
              loading && 'opacity-40 cursor-not-allowed',
            )}
          >
            <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} />
          </button>
        </div>
      </div>

      {/* ── Chart area ──────────────────────────────────────────────────────── */}
      <div className="relative flex-1" style={{ height }}>
        {/* Loading overlay */}
        {loading && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-white/80 dark:bg-[#0d0d1a]/80 backdrop-blur-[2px]">
            <Loader2 className="h-7 w-7 animate-spin text-violet-500 mb-2" />
            <p className="text-xs text-gray-400 font-medium">Caricamento dati...</p>
          </div>
        )}

        {/* Error overlay */}
        {error && !loading && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center px-8 bg-white dark:bg-[#0d0d1a]">
            <div className="max-w-xs text-center space-y-3">
              <div className="w-10 h-10 rounded-full bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center mx-auto">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
              </div>
              <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">Dati non disponibili</p>
              <p className="text-[12px] text-gray-500 dark:text-gray-400 leading-relaxed">{error}</p>
              <Button variant="outline" size="sm" onClick={handleRefresh} className="text-xs">
                <RefreshCw className="h-3 w-3 mr-1.5" />
                Riprova
              </Button>
            </div>
          </div>
        )}

        {/* KlineCharts — fresh DOM node on every re-key */}
        <ChartInner
          key={mountKey}
          ticker={ticker}
          tradeDate={tradeDate}
          trade={trade}
          timeframe={timeframe}
          isDark={isDark}
          onLoaded={handleLoaded}
          onError={handleError}
        />
      </div>

      {/* ── Legend bar ──────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-2 border-t border-gray-200 dark:border-white/10 bg-gray-50/80 dark:bg-white/[0.02] shrink-0">
        <div className="flex items-center gap-4 flex-wrap">
          {/* Entry */}
          <div className="flex items-center gap-1.5">
            <ArrowSvg direction={isLong ? 'up' : 'down'} color={isLong ? '#22c55e' : '#ef4444'} />
            <span className="text-[11px] font-mono text-gray-500 dark:text-gray-400">
              Entrata {trade.entryPrice.toFixed(2)}
              {entryTimeLabel ? ` · ${entryTimeLabel}` : ''}
            </span>
          </div>

          {/* Exit */}
          {trade.exitPrice != null && (
            <div className="flex items-center gap-1.5">
              <ArrowSvg direction={isLong ? 'down' : 'up'} color={isProfitable ? '#22c55e' : '#ef4444'} />
              <span className="text-[11px] font-mono text-gray-500 dark:text-gray-400">
                Uscita {trade.exitPrice.toFixed(2)}
                {exitTimeLabel ? ` · ${exitTimeLabel}` : ''}
              </span>
            </div>
          )}
        </div>

        {/* API usage */}
        {apiRemaining !== null && (
          <span className="text-[10px] tabular-nums text-gray-400 dark:text-gray-600 shrink-0 ml-4">
            {apiRemaining} req rimaste
          </span>
        )}
      </div>
    </div>
  );
}
