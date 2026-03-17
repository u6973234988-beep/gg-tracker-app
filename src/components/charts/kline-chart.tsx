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

// ─── Types (v2) ───────────────────────────────────────────────────────────────
interface TradeMarker {
  entryPrice: number;
  exitPrice: number | null;
  entryTime?: string | null;
  exitTime?: string | null;
  direction: string;           // 'LONG' | 'SHORT'
  stopLoss?: number | null;
  takeProfit?: number | null;
  pnl?: number | null;
  quantity?: number;
}

interface KlineChartProps {
  ticker: string;
  tradeDate: string;           // 'YYYY-MM-DD'
  trade: TradeMarker;
  height?: string;
  className?: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────
const TIMEFRAMES: { label: string; value: Timeframe; icon: React.ReactNode }[] = [
  { label: 'Giornaliero', value: '1day',  icon: <BarChart2 className="h-3 w-3" /> },
  { label: '1 Minuto',    value: '1min',  icon: <Clock className="h-3 w-3" /> },
];

// ─── Register custom downward-arrow overlay (once, globally) ──────────────────
let arrowDownRegistered = false;

function ensureOverlaysRegistered() {
  if (arrowDownRegistered) return;
  arrowDownRegistered = true;

  // "arrowDown": tip points downward toward the candle high (SHORT entry or LONG exit)
  // The overlay point sits ABOVE the candle; the tip of the triangle points DOWN.
  try {
    registerOverlay({
      name: 'arrowDown',
      totalStep: 2,
      needDefaultPointFigure: false,
      needDefaultXAxisFigure: false,
      needDefaultYAxisFigure: false,
      createPointFigures({ overlay, coordinates }) {
        if (!coordinates || coordinates.length === 0) return [];
        const { x, y } = coordinates[0];
        const ext = (overlay.extendData as { color: string; label: string }) ?? {
          color: '#ef4444', label: 'X',
        };
        const color = ext.color;
        const W = 9;   // half-width of triangle base
        const H = 13;  // height of triangle
        const tipY  = y + 2;        // tip pointing down, slightly past the value
        const baseY = tipY - H;     // base of triangle (above)

        return [
          {
            type: 'polygon',
            attrs: {
              coordinates: [
                { x: x,     y: tipY  },   // bottom tip
                { x: x - W, y: baseY },   // top-left
                { x: x + W, y: baseY },   // top-right
              ],
            },
            styles: { style: 'fill', color },
            ignoreEvent: true,
          },
          {
            type: 'text',
            attrs: {
              x,
              y: baseY - 3,
              text: ext.label,
              align: 'center' as CanvasTextAlign,
              baseline: 'bottom' as CanvasTextBaseline,
            },
            styles: { color, size: 10, weight: 'bold', family: 'system-ui' },
            ignoreEvent: true,
          },
        ];
      },
    });
  } catch (_) { /* already registered */ }

  // "arrowUp": tip points upward toward the candle low (LONG entry or SHORT exit)
  // The overlay point sits BELOW the candle; the tip of the triangle points UP.
  try {
    registerOverlay({
      name: 'arrowUp',
      totalStep: 2,
      needDefaultPointFigure: false,
      needDefaultXAxisFigure: false,
      needDefaultYAxisFigure: false,
      createPointFigures({ overlay, coordinates }) {
        if (!coordinates || coordinates.length === 0) return [];
        const { x, y } = coordinates[0];
        const ext = (overlay.extendData as { color: string; label: string }) ?? {
          color: '#22c55e', label: 'E',
        };
        const color = ext.color;
        const W = 9;
        const H = 13;
        const tipY  = y - 2;      // tip pointing up
        const baseY = tipY + H;   // base of triangle (below)

        return [
          {
            type: 'polygon',
            attrs: {
              coordinates: [
                { x: x,     y: tipY  },   // top tip
                { x: x - W, y: baseY },   // bottom-left
                { x: x + W, y: baseY },   // bottom-right
              ],
            },
            styles: { style: 'fill', color },
            ignoreEvent: true,
          },
          {
            type: 'text',
            attrs: {
              x,
              y: baseY + 3,
              text: ext.label,
              align: 'center' as CanvasTextAlign,
              baseline: 'top' as CanvasTextBaseline,
            },
            styles: { color, size: 10, weight: 'bold', family: 'system-ui' },
            ignoreEvent: true,
          },
        ];
      },
    });
  } catch (_) { /* already registered */ }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Parse "HH:MM:SS", "HH:MM", or full ISO/datetime string into ms timestamp.
 * Combines with dateStr (YYYY-MM-DD) when time-only.
 */
function resolveTimestampMs(timeStr: string | null | undefined, dateStr: string): number | null {
  if (!timeStr) return null;
  try {
    if (timeStr.includes('T') || /^\d{4}-\d{2}-\d{2}/.test(timeStr)) {
      const ms = new Date(timeStr).getTime();
      return isNaN(ms) ? null : ms;
    }
    // HH:MM:SS or HH:MM — treat as local time on tradeDate
    const ms = new Date(`${dateStr}T${timeStr}`).getTime();
    return isNaN(ms) ? null : ms;
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

/** Find a candle by calendar date (YYYY-MM-DD). */
function candleByDate(data: OHLCData[], dateStr: string): OHLCData | null {
  const target = new Date(dateStr + 'T12:00:00').toDateString();
  return data.find(c => new Date(c.timestamp).toDateString() === target) ?? null;
}

// ─── ChartInner: one per mount, destroyed and recreated when key changes ──────
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

        // ── Theme ──────────────────────────────────────────────────────────
        const bg            = isDark ? '#0f0f1a' : '#ffffff';
        const gridColor     = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)';
        const textColor     = isDark ? '#6b7280' : '#9ca3af';
        const axisColor     = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)';
        const crossColor    = isDark ? 'rgba(139,92,246,0.5)' : 'rgba(0,0,0,0.18)';
        const crossBg       = isDark ? '#7c3aed' : '#374151';

        // ── Init chart ────────────────────────────────────────────────────
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
                upColor:          '#22c55e',
                downColor:        '#ef4444',
                upBorderColor:    '#22c55e',
                downBorderColor:  '#ef4444',
                upWickColor:      '#4ade80',
                downWickColor:    '#f87171',
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
                  text: {
                    show: true, size: 11,
                    paddingLeft: 4, paddingRight: 4,
                    paddingTop: 2, paddingBottom: 2,
                    borderRadius: 2,
                  },
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
                text: {
                  show: true, size: 10, color: '#fff',
                  borderRadius: 2,
                  paddingLeft: 4, paddingRight: 4,
                  paddingTop: 2, paddingBottom: 2,
                  backgroundColor: crossBg,
                },
              },
              vertical: {
                show: true,
                line: { show: true, style: 'dash' as any, size: 1, color: crossColor },
                text: {
                  show: true, size: 10, color: '#fff',
                  borderRadius: 2,
                  paddingLeft: 4, paddingRight: 4,
                  paddingTop: 2, paddingBottom: 2,
                  backgroundColor: crossBg,
                },
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

        // ── Data ───────────────────────────────────────────────────────────
        chart.applyNewData(ohlcData);

        // Volume indicator in sub-pane
        try { chart.createIndicator('VOL', false); } catch (_) {}

        // ── Resolve candles for markers ───────────────────────────────────
        const isLong       = trade.direction === 'LONG';
        const isProfitable = (trade.pnl ?? 0) >= 0;

        let entryCandle: OHLCData | null = null;
        let exitCandle:  OHLCData | null = null;

        if (timeframe === '1day') {
          // Daily: pin both arrows to the trade date candle
          entryCandle = candleByDate(ohlcData, tradeDate) ?? ohlcData[Math.floor(ohlcData.length / 2)];
          exitCandle  = entryCandle;
        } else {
          // 1min: find nearest candle to entry/exit time
          const entryMs = resolveTimestampMs(trade.entryTime, tradeDate);
          const exitMs  = resolveTimestampMs(trade.exitTime,  tradeDate);
          if (entryMs != null) entryCandle = nearestCandle(ohlcData, entryMs);
          if (exitMs  != null) exitCandle  = nearestCandle(ohlcData, exitMs);
          // Fallback: if no entryTime, use first candle
          if (!entryCandle) entryCandle = ohlcData[0];
        }

        // ── Horizontal price lines using priceLine overlay ────────────────
        // priceLine: totalStep=2, 1 point with { timestamp, value }
        // It draws from that x coordinate to the right edge of the chart.
        // We place it at the leftmost candle so it spans the whole chart.
        const leftTs = ohlcData[0].timestamp;

        const addPriceLine = (price: number, color: string, dash: number[], label?: string) => {
          try {
            chart!.createOverlay({
              name: 'priceLine',
              points: [{ timestamp: leftTs, value: price }],
              styles: {
                line: { style: 'dashed' as any, size: 1, color, dashedValue: dash },
                text: { color, size: 10, family: 'system-ui', weight: 'normal', paddingLeft: 2, paddingRight: 4, paddingTop: 1, paddingBottom: 1, borderRadius: 2, borderSize: 0, borderColor: 'transparent', backgroundColor: isDark ? 'rgba(15,15,26,0.7)' : 'rgba(255,255,255,0.8)' },
              },
              lock: true,
              mode: 'weak_magnet' as any,
            });
          } catch (_) {}
        };

        if (trade.entryPrice)   addPriceLine(trade.entryPrice, isLong ? '#22c55e' : '#ef4444', [6, 4]);
        if (trade.exitPrice)    addPriceLine(trade.exitPrice,  isProfitable ? '#22c55e' : '#ef4444', [3, 4]);
        if (trade.stopLoss)     addPriceLine(trade.stopLoss,   '#f97316', [8, 5]);
        if (trade.takeProfit)   addPriceLine(trade.takeProfit, '#3b82f6', [8, 5]);

        // ── Arrow markers ─────────────────────────────────────────────────
        // Arrow semantics:
        //   LONG entry  → arrowUp below low   (green, "E")
        //   LONG exit   → arrowDown above high (green if profit, red if loss, "X")
        //   SHORT entry → arrowDown above high (red, "E")
        //   SHORT exit  → arrowUp below low   (green if profit, red if loss, "X")

        if (entryCandle) {
          const wickSpan = Math.max(entryCandle.high - entryCandle.low, trade.entryPrice * 0.002);
          const offset   = wickSpan * 0.4;

          if (isLong) {
            // LONG entry: up arrow below candle low
            try {
              chart!.createOverlay({
                name: 'arrowUp',
                points: [{ timestamp: entryCandle.timestamp, value: entryCandle.low - offset }],
                extendData: { color: '#22c55e', label: 'E' },
                lock: true,
                zLevel: 10,
              });
            } catch (_) {}
          } else {
            // SHORT entry: down arrow above candle high
            try {
              chart!.createOverlay({
                name: 'arrowDown',
                points: [{ timestamp: entryCandle.timestamp, value: entryCandle.high + offset }],
                extendData: { color: '#ef4444', label: 'E' },
                lock: true,
                zLevel: 10,
              });
            } catch (_) {}
          }
        }

        if (exitCandle && trade.exitPrice) {
          const wickSpan = Math.max(exitCandle.high - exitCandle.low, trade.exitPrice * 0.002);
          const offset   = wickSpan * 0.4;
          const exitColor = isProfitable ? '#22c55e' : '#ef4444';

          if (isLong) {
            // LONG exit: down arrow above candle high
            try {
              chart!.createOverlay({
                name: 'arrowDown',
                points: [{ timestamp: exitCandle.timestamp, value: exitCandle.high + offset }],
                extendData: { color: exitColor, label: 'X' },
                lock: true,
                zLevel: 10,
              });
            } catch (_) {}
          } else {
            // SHORT exit: up arrow below candle low
            try {
              chart!.createOverlay({
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
        const scrollTs = entryCandle?.timestamp ?? exitCandle?.timestamp ?? ohlcData[ohlcData.length - 1].timestamp;
        setTimeout(() => {
          try { (chart as any)?.scrollToTimestamp(scrollTs, 200); } catch (_) {}
        }, 80);

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

  return (
    <div
      ref={containerRef}
      style={{ width: '100%', height: '100%' }}
    />
  );
}

// ─── Tiny legend pieces ───────────────────────────────────────────────────────
function ArrowIcon({ direction, color }: { direction: 'up' | 'down'; color: string }) {
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

function DashLine({ color }: { color: string }) {
  return (
    <svg width="20" height="2" viewBox="0 0 20 2" fill="none" aria-hidden>
      <line x1="0" y1="1" x2="20" y2="1" stroke={color} strokeWidth="2" strokeDasharray="6 3" />
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
  const [timeframe, setTimeframe]         = useState<Timeframe>('1day');
  const [mountKey, setMountKey]           = useState(0);
  const [loading, setLoading]             = useState(true);
  const [error, setError]                 = useState<string | null>(null);
  const [isDark, setIsDark]               = useState(false);
  const [apiRemaining, setApiRemaining]   = useState<number | null>(null);

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

  const isLong      = trade.direction === 'LONG';
  const isProfitable = (trade.pnl ?? 0) >= 0;

  return (
    <div
      className={cn(
        'flex flex-col rounded-xl overflow-hidden',
        'border border-gray-200 dark:border-white/10',
        'bg-white dark:bg-[#0f0f1a]',
        className,
      )}
    >
      {/* ── Toolbar ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-200 dark:border-white/10 bg-gray-50/80 dark:bg-white/[0.03]">
        {/* Left: ticker + date + P&L */}
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="font-mono font-bold text-[15px] text-gray-900 dark:text-white tracking-tight shrink-0">
            {ticker}
          </span>
          <Badge
            variant="outline"
            className="text-[11px] font-mono border-gray-200 dark:border-white/15 text-gray-500 dark:text-gray-400 px-1.5 py-0 h-5"
          >
            {tradeDate}
          </Badge>
          {trade.pnl != null && (
            <span
              className={cn(
                'text-[12px] font-bold font-mono shrink-0',
                isProfitable ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400',
              )}
            >
              {isProfitable ? '+' : ''}{trade.pnl.toFixed(2)}$
            </span>
          )}
          {trade.direction && (
            <span
              className={cn(
                'text-[10px] font-bold font-mono px-1.5 py-0.5 rounded',
                isLong
                  ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                  : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
              )}
            >
              {trade.direction}
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
                  'flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold transition-colors',
                  i > 0 && 'border-l border-gray-200 dark:border-white/10',
                  timeframe === tf.value
                    ? 'bg-gray-900 dark:bg-violet-600 text-white'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5',
                  loading && 'opacity-50 cursor-not-allowed',
                )}
              >
                {tf.icon}
                {tf.label}
              </button>
            ))}
          </div>
          <button
            onClick={handleRefresh}
            disabled={loading}
            title="Aggiorna"
            className={cn(
              'p-1.5 rounded-lg border border-gray-200 dark:border-white/10',
              'text-gray-400 hover:text-gray-700 dark:hover:text-white',
              'hover:bg-gray-100 dark:hover:bg-white/5 transition-colors',
              loading && 'opacity-40 cursor-not-allowed',
            )}
          >
            <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} />
          </button>
        </div>
      </div>

      {/* ── Chart area ──────────────────────────────────────────────────── */}
      <div className="relative" style={{ height }}>
        {/* Loading overlay */}
        {loading && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-white/80 dark:bg-[#0f0f1a]/80 backdrop-blur-[2px]">
            <Loader2 className="h-8 w-8 animate-spin text-violet-500 mb-2" />
            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Caricamento dati...</p>
          </div>
        )}

        {/* Error overlay */}
        {error && !loading && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center px-8 bg-white dark:bg-[#0f0f1a]">
            <div className="max-w-xs text-center space-y-3">
              <div className="w-11 h-11 rounded-full bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center mx-auto">
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

        {/* KlineCharts — re-keyed on every load to get a fresh DOM node */}
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

      {/* ── Legend bar ──────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-2 border-t border-gray-200 dark:border-white/10 bg-gray-50/80 dark:bg-white/[0.02]">
        <div className="flex items-center gap-4 flex-wrap">
          {/* Entry arrow */}
          <div className="flex items-center gap-1.5">
            <ArrowIcon direction={isLong ? 'up' : 'down'} color={isLong ? '#22c55e' : '#ef4444'} />
            <span className="text-[11px] font-mono text-gray-500 dark:text-gray-400">
              Entrata {trade.entryPrice.toFixed(2)}
              {trade.entryTime ? ` · ${trade.entryTime.slice(0, 5)}` : ''}
            </span>
          </div>

          {/* Exit arrow */}
          {trade.exitPrice != null && (
            <div className="flex items-center gap-1.5">
              <ArrowIcon direction={isLong ? 'down' : 'up'} color={isProfitable ? '#22c55e' : '#ef4444'} />
              <span className="text-[11px] font-mono text-gray-500 dark:text-gray-400">
                Uscita {trade.exitPrice.toFixed(2)}
                {trade.exitTime ? ` · ${trade.exitTime.slice(0, 5)}` : ''}
              </span>
            </div>
          )}

          {/* SL line */}
          {trade.stopLoss != null && (
            <div className="flex items-center gap-1.5">
              <DashLine color="#f97316" />
              <span className="text-[11px] font-mono text-gray-500 dark:text-gray-400">
                SL {trade.stopLoss.toFixed(2)}
              </span>
            </div>
          )}

          {/* TP line */}
          {trade.takeProfit != null && (
            <div className="flex items-center gap-1.5">
              <DashLine color="#3b82f6" />
              <span className="text-[11px] font-mono text-gray-500 dark:text-gray-400">
                TP {trade.takeProfit.toFixed(2)}
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
