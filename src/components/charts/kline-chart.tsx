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
  entryTime?: string | null;  // e.g. "09:32:00" or full ISO
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
const TIMEFRAMES: { label: string; value: Timeframe }[] = [
  { label: 'Giornaliero', value: '1day' },
  { label: '1 Minuto',    value: '1min' },
];

// ─── Register custom arrow overlay (once, globally) ───────────────────────────
let overlayRegistered = false;

function ensureOverlayRegistered() {
  if (overlayRegistered) return;
  overlayRegistered = true;

  try {
    registerOverlay({
      name: 'tradeArrow',
      totalStep: 1,
      needDefaultPointFigure: false,
      needDefaultXAxisFigure: false,
      needDefaultYAxisFigure: false,
      createPointFigures({ overlay, coordinates }) {
        if (!coordinates || coordinates.length === 0) return [];
        const { x, y } = coordinates[0];
        // extendData carries { direction: 'up'|'down', color: string, label: string }
        const ext = (overlay.extendData as { direction: 'up' | 'down'; color: string; label: string }) ?? {
          direction: 'up',
          color: '#22c55e',
          label: 'E',
        };
        const isUp = ext.direction === 'up';
        const color = ext.color;
        const arrowH = 12;
        const arrowW = 8;
        // Arrow tip points at the candle; tail extends away
        const tipY = isUp ? y - 2 : y + 2;
        const tailY = isUp ? tipY - arrowH : tipY + arrowH;

        return [
          // Triangle arrow
          {
            type: 'polygon',
            attrs: {
              coordinates: isUp
                ? [
                    { x, y: tipY },
                    { x: x - arrowW / 2, y: tailY },
                    { x: x + arrowW / 2, y: tailY },
                  ]
                : [
                    { x, y: tipY },
                    { x: x - arrowW / 2, y: tailY },
                    { x: x + arrowW / 2, y: tailY },
                  ],
            },
            styles: {
              style: 'fill',
              color,
            },
          },
          // Label text above/below the arrow
          {
            type: 'text',
            attrs: {
              x,
              y: isUp ? tailY - 3 : tailY + 3,
              text: ext.label,
              align: 'center',
              baseline: isUp ? 'bottom' : 'top',
            },
            styles: {
              color,
              size: 9,
              weight: 'bold',
              family: 'Helvetica Neue',
            },
          },
        ];
      },
    });
  } catch (_) {
    // already registered or error — ignore
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Given a time string like "09:32:00" or "2024-01-15T09:32:00" and a date string "YYYY-MM-DD",
 * return the unix timestamp (ms) for that candle.
 */
function resolveTimestamp(timeStr: string | null | undefined, dateStr: string): number | null {
  if (!timeStr) return null;
  try {
    // If it's a full ISO / datetime string
    if (timeStr.includes('T') || timeStr.match(/^\d{4}-\d{2}-\d{2}/)) {
      const ms = new Date(timeStr).getTime();
      return isNaN(ms) ? null : ms;
    }
    // HH:MM:SS or HH:MM — combine with dateStr (assume ET → UTC offset -4 or -5)
    // We keep it simple: just combine date + time and parse as local; KlineCharts works with the
    // same timezone as the data from Twelve Data (which returns in exchange timezone)
    const combined = `${dateStr}T${timeStr}`;
    const ms = new Date(combined).getTime();
    return isNaN(ms) ? null : ms;
  } catch {
    return null;
  }
}

/**
 * Find the candle in ohlcData whose timestamp is closest to targetMs.
 * Returns the candle or null if list is empty or target is null.
 */
function findNearestCandle(ohlcData: OHLCData[], targetMs: number | null): OHLCData | null {
  if (!targetMs || ohlcData.length === 0) return null;
  let best = ohlcData[0];
  let bestDiff = Math.abs(ohlcData[0].timestamp - targetMs);
  for (const c of ohlcData) {
    const diff = Math.abs(c.timestamp - targetMs);
    if (diff < bestDiff) {
      bestDiff = diff;
      best = c;
    }
  }
  return best;
}

// ─── Inner chart component (re-mounted via key) ───────────────────────────────
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
    ensureOverlayRegistered();

    let cancelled = false;
    const el = containerRef.current;
    if (!el) return;

    async function load() {
      try {
        const ohlcData = await getOHLCData(ticker, timeframe, tradeDate);
        const usage = getApiUsageInfo();

        if (cancelled) return;
        if (!el) return;

        if (!ohlcData || ohlcData.length === 0) {
          onError('Nessun dato disponibile per questo ticker e periodo.', usage.remaining);
          return;
        }

        // ── Theme colours ─────────────────────────────────────────────────
        const bgColor       = isDark ? '#161622' : '#ffffff';
        const gridColor     = isDark ? 'rgba(139,92,246,0.06)' : 'rgba(0,0,0,0.04)';
        const textColor     = isDark ? '#9ca3af' : '#6b7280';
        const crosshairColor = isDark ? 'rgba(139,92,246,0.4)' : 'rgba(0,0,0,0.15)';
        const axisColor     = isDark ? 'rgba(139,92,246,0.18)' : 'rgba(0,0,0,0.08)';
        const crosshairBg   = isDark ? '#7c3aed' : '#6b7280';

        const chart = init(el, {
          styles: {
            grid: {
              show: true,
              horizontal: { show: true, color: gridColor, size: 1, style: 'dashed' as any },
              vertical: { show: false },
            },
            candle: {
              type: 'candle_solid' as any,
              bar: {
                upColor: '#22c55e',
                downColor: '#ef4444',
                upBorderColor: '#22c55e',
                downBorderColor: '#ef4444',
                upWickColor: '#22c55e',
                downWickColor: '#ef4444',
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
                line: { show: true, style: 'dash' as any, size: 1, color: crosshairColor },
                text: {
                  show: true, size: 10, color: '#ffffff',
                  borderRadius: 2,
                  paddingLeft: 4, paddingRight: 4,
                  paddingTop: 2, paddingBottom: 2,
                  backgroundColor: crosshairBg,
                },
              },
              vertical: {
                show: true,
                line: { show: true, style: 'dash' as any, size: 1, color: crosshairColor },
                text: {
                  show: true, size: 10, color: '#ffffff',
                  borderRadius: 2,
                  paddingLeft: 4, paddingRight: 4,
                  paddingTop: 2, paddingBottom: 2,
                  backgroundColor: crosshairBg,
                },
              },
            },
          },
        });

        if (!chart) {
          onError('Impossibile inizializzare il grafico.', usage.remaining);
          return;
        }
        if (cancelled) { try { dispose(el); } catch (_) {} return; }

        el.style.backgroundColor = bgColor;

        // ── Load data ─────────────────────────────────────────────────────
        chart.applyNewData(ohlcData);

        // Volume sub-pane
        try { chart.createIndicator('VOL', false); } catch (_) {}

        // ── Horizontal price lines ────────────────────────────────────────
        const firstTs = ohlcData[0].timestamp;
        const lastTs  = ohlcData[ohlcData.length - 1].timestamp;
        const isLong  = trade.direction === 'LONG';
        const isProfitable = (trade.pnl ?? 0) >= 0;

        const addPriceLine = (price: number, color: string, dash: number[]) => {
          try {
            chart.createOverlay({
              name: 'straightLine',
              points: [
                { value: price, timestamp: firstTs },
                { value: price, timestamp: lastTs },
              ],
              styles: {
                line: { style: 'dashed' as any, size: 1, color, dashedValue: dash },
              },
              lock: true,
            });
          } catch (_) {}
        };

        if (trade.entryPrice) addPriceLine(trade.entryPrice, isLong ? '#22c55e' : '#ef4444', [6, 4]);
        if (trade.exitPrice)  addPriceLine(trade.exitPrice,  isProfitable ? '#22c55e' : '#ef4444', [2, 4]);
        if (trade.stopLoss)   addPriceLine(trade.stopLoss,   '#f97316', [8, 4]);
        if (trade.takeProfit) addPriceLine(trade.takeProfit, '#3b82f6', [8, 4]);

        // ── Arrow markers on entry / exit candles ────────────────────────
        const entryMs = resolveTimestamp(trade.entryTime, tradeDate);
        const exitMs  = resolveTimestamp(trade.exitTime,  tradeDate);

        // For daily timeframe: pin to the trade date candle directly
        let entryCandle: OHLCData | null = null;
        let exitCandle:  OHLCData | null = null;

        if (timeframe === '1day') {
          // Use date-only match: find the candle whose date == tradeDate
          const targetDay = new Date(tradeDate + 'T00:00:00').toDateString();
          entryCandle = ohlcData.find(c => new Date(c.timestamp).toDateString() === targetDay) ?? ohlcData[Math.floor(ohlcData.length / 2)];
          exitCandle  = entryCandle; // same day for daily — both on the trade candle
        } else {
          // 1min: find nearest candle to entry/exit time
          entryCandle = findNearestCandle(ohlcData, entryMs);
          exitCandle  = findNearestCandle(ohlcData, exitMs);
        }

        // Entry arrow: points toward price (up arrow below for LONG, down above for SHORT)
        if (entryCandle) {
          const entryDir: 'up' | 'down' = isLong ? 'up' : 'down';
          // Place the arrow value slightly beyond the candle wick
          const arrowOffset = (entryCandle.high - entryCandle.low) * 0.3 || trade.entryPrice * 0.003;
          const arrowValue = isLong
            ? entryCandle.low  - arrowOffset
            : entryCandle.high + arrowOffset;

          try {
            chart.createOverlay({
              name: 'tradeArrow',
              points: [{ timestamp: entryCandle.timestamp, value: arrowValue }],
              extendData: {
                direction: entryDir,
                color: isLong ? '#22c55e' : '#ef4444',
                label: 'E',
              },
              lock: true,
              zLevel: 10,
            });
          } catch (_) {}
        }

        // Exit arrow: inverse direction (closing the trade)
        if (exitCandle && trade.exitPrice) {
          const exitDir: 'up' | 'down' = isLong ? 'down' : 'up';
          const arrowOffset = (exitCandle.high - exitCandle.low) * 0.3 || trade.exitPrice * 0.003;
          const arrowValue = isLong
            ? exitCandle.high + arrowOffset
            : exitCandle.low  - arrowOffset;

          try {
            chart.createOverlay({
              name: 'tradeArrow',
              points: [{ timestamp: exitCandle.timestamp, value: arrowValue }],
              extendData: {
                direction: exitDir,
                color: isProfitable ? '#22c55e' : '#ef4444',
                label: 'X',
              },
              lock: true,
              zLevel: 10,
            });
          } catch (_) {}
        }

        // ── Scroll to entry candle ────────────────────────────────────────
        // scrollToTimestamp scrolls the RIGHT EDGE of the chart to the timestamp.
        // To center the entry candle, we scroll a bit further past it.
        const scrollTarget = entryCandle?.timestamp ?? (exitCandle?.timestamp ?? lastTs);
        try {
          // Small delay to let the chart render before scrolling
          setTimeout(() => {
            try { (chart as any).scrollToTimestamp(scrollTarget, 300); } catch (_) {}
          }, 50);
        } catch (_) {}

        onLoaded(usage.remaining);
      } catch (err: any) {
        const usage = getApiUsageInfo();
        onError(err?.message || 'Errore nel caricamento del grafico', usage.remaining);
      }
    }

    load();

    return () => {
      cancelled = true;
      try { if (el) dispose(el); } catch (_) {}
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // runs once per mount

  return (
    <div
      ref={containerRef}
      className="w-full"
      style={{ height: '100%', minHeight: 300 }}
    />
  );
}

// ─── Main exported component ──────────────────────────────────────────────────
export function KlineChartComponent({
  ticker,
  tradeDate,
  trade,
  height = '500px',
  className,
}: KlineChartProps) {
  const [timeframe, setTimeframe]     = useState<Timeframe>('1day');
  const [mountKey, setMountKey]       = useState(0);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState<string | null>(null);
  const [isDark, setIsDark]           = useState(false);
  const [apiRemaining, setApiRemaining] = useState<number | null>(null);

  // Detect dark mode
  useEffect(() => {
    const checkDark = () => setIsDark(document.documentElement.classList.contains('dark'));
    checkDark();
    const observer = new MutationObserver(checkDark);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  const handleTimeframeChange = (tf: Timeframe) => {
    if (tf === timeframe || loading) return;
    setTimeframe(tf);
    setLoading(true);
    setError(null);
    setMountKey((k) => k + 1);
  };

  const handleRefresh = () => {
    setLoading(true);
    setError(null);
    setMountKey((k) => k + 1);
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

  const isPositive = (trade.pnl ?? 0) >= 0;

  return (
    <div
      className={cn(
        'rounded-xl overflow-hidden border border-gray-200 dark:border-violet-500/20 bg-white dark:bg-[#1e1e30] flex flex-col',
        className
      )}
    >
      {/* ── Toolbar ── */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-200 dark:border-violet-500/20 bg-gray-50 dark:bg-[#1e1e30]">
        {/* Left: ticker + date + pnl */}
        <div className="flex items-center gap-2.5">
          <span className="font-mono font-bold text-base text-gray-900 dark:text-white tracking-tight">
            {ticker}
          </span>
          <Badge
            variant="outline"
            className="text-xs font-mono border-gray-200 dark:border-violet-500/30 text-gray-500 dark:text-gray-400"
          >
            {tradeDate}
          </Badge>
          {trade.pnl != null && (
            <span
              className={cn(
                'text-xs font-bold font-mono',
                isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
              )}
            >
              {isPositive ? '+' : ''}{trade.pnl.toFixed(2)}$
            </span>
          )}
        </div>

        {/* Right: timeframe switcher + refresh */}
        <div className="flex items-center gap-1">
          <div className="flex items-center gap-0.5 bg-gray-100 dark:bg-[#161622] rounded-lg p-0.5 mr-2">
            {TIMEFRAMES.map((tf) => (
              <button
                key={tf.value}
                disabled={loading}
                onClick={() => handleTimeframeChange(tf.value)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-150',
                  timeframe === tf.value
                    ? 'bg-violet-600 text-white shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-200 dark:hover:bg-[#252535]',
                  loading && 'opacity-50 cursor-not-allowed'
                )}
              >
                {tf.value === '1day'
                  ? <BarChart2 className="h-3.5 w-3.5" />
                  : <Clock className="h-3.5 w-3.5" />
                }
                {tf.label}
              </button>
            ))}
          </div>

          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            onClick={handleRefresh}
            disabled={loading}
            title="Ricarica"
          >
            <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} />
          </Button>
        </div>
      </div>

      {/* ── Chart area ── */}
      <div className="relative" style={{ height }}>
        {/* Loading overlay */}
        {loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/90 dark:bg-[#161622]/90 z-10 gap-3 pointer-events-none">
            <Loader2 className="h-6 w-6 animate-spin text-violet-500" />
            <div className="text-center">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {timeframe === '1min' ? 'Caricamento dati al minuto...' : 'Caricamento dati giornalieri...'}
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                Attendere il rate limit API...
              </p>
            </div>
          </div>
        )}

        {/* Error overlay */}
        {error && !loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-white dark:bg-[#161622] z-10 px-8">
            <div className="max-w-sm text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center mx-auto">
                <AlertTriangle className="h-6 w-6 text-amber-500" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-800 dark:text-gray-200 mb-1">
                  Dati non disponibili
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">{error}</p>
              </div>
              <Button variant="outline" size="sm" onClick={handleRefresh}>
                <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                Riprova
              </Button>
            </div>
          </div>
        )}

        {/* KlineCharts — re-keyed on every load to get a fresh DOM node */}
        <div style={{ height: '100%', width: '100%' }}>
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
      </div>

      {/* ── Legend bar ── */}
      <div className="flex items-center justify-between px-4 py-2 border-t border-gray-200 dark:border-violet-500/20 bg-gray-50 dark:bg-[#1e1e30]">
        <div className="flex items-center gap-4 flex-wrap">
          {/* Arrow legend items */}
          <div className="flex items-center gap-1.5">
            <ArrowLegend direction="up" color={isLong ? '#22c55e' : '#ef4444'} />
            <span className="text-[11px] text-gray-500 dark:text-gray-400 font-mono">
              E {trade.entryPrice?.toFixed(2)}
              {trade.entryTime ? ` · ${trade.entryTime}` : ''}
            </span>
          </div>
          {trade.exitPrice && (
            <div className="flex items-center gap-1.5">
              <ArrowLegend direction="down" color={isPositive ? '#22c55e' : '#ef4444'} />
              <span className="text-[11px] text-gray-500 dark:text-gray-400 font-mono">
                X {trade.exitPrice.toFixed(2)}
                {trade.exitTime ? ` · ${trade.exitTime}` : ''}
              </span>
            </div>
          )}
          {/* Price line legend items */}
          {trade.stopLoss && (
            <LegendItem color="#f97316" label={`SL ${trade.stopLoss.toFixed(2)}`} dashStyle="8,4" />
          )}
          {trade.takeProfit && (
            <LegendItem color="#3b82f6" label={`TP ${trade.takeProfit.toFixed(2)}`} dashStyle="8,4" />
          )}
        </div>
        {apiRemaining !== null && (
          <span className="text-[10px] text-gray-400 dark:text-gray-600 tabular-nums shrink-0">
            {apiRemaining} API rimaste
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Small UI helpers ─────────────────────────────────────────────────────────
function ArrowLegend({ direction, color }: { direction: 'up' | 'down'; color: string }) {
  const isUp = direction === 'up';
  return (
    <svg width="10" height="12" viewBox="0 0 10 12" fill="none">
      {isUp ? (
        <polygon points="5,0 0,8 10,8" fill={color} />
      ) : (
        <polygon points="5,12 0,4 10,4" fill={color} />
      )}
    </svg>
  );
}

function LegendItem({ color, label, dashStyle }: { color: string; label: string; dashStyle: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <svg width="18" height="2" viewBox="0 0 18 2" fill="none">
        <line x1="0" y1="1" x2="18" y2="1" stroke={color} strokeWidth="2" strokeDasharray={dashStyle} />
      </svg>
      <span className="text-[11px] text-gray-500 dark:text-gray-400 font-mono">{label}</span>
    </div>
  );
}
