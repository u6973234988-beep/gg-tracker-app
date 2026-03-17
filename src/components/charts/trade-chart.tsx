'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { init, dispose, registerOverlay } from 'klinecharts';
import type { Chart } from 'klinecharts';
import { getOHLCData, getApiUsageInfo } from '@/lib/twelve-data-service';
import type { Timeframe, OHLCData } from '@/lib/twelve-data-service';
import { Button } from '@/components/ui/button';
import { Loader2, RefreshCw, AlertTriangle, BarChart2, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────
interface TradeMarker {
  entryPrice: number;
  exitPrice: number | null;
  entryTime?: string | null;
  exitTime?: string | null;
  direction: string;
  pnl?: number | null;
  stopLoss?: number | null;
  takeProfit?: number | null;
  quantity?: number;
}

interface TradeChartProps {
  ticker: string;
  tradeDate: string;
  trade: TradeMarker;
  height?: string;
  className?: string;
}

const TIMEFRAMES: { label: string; value: Timeframe; icon: 'bar' | 'clock' }[] = [
  { label: 'Giornaliero', value: '1day', icon: 'bar' },
  { label: '1 Minuto',    value: '1min', icon: 'clock' },
];

// ─── Candle lookup — no timezone math needed ──────────────────────────────────
// Twelve Data returns datetime as "YYYY-MM-DD HH:MM:SS".
// ora_entrata / ora_uscita are stored as "HH:MM:SS".
// Strategy: match the time part of the candle's raw datetime string directly.
// This works regardless of timezone because both sides use the same clock.

// Find candle whose raw datetime contains the given time string "HH:MM:SS"
function candleByTime(data: OHLCData[], timeStr: string): OHLCData | null {
  if (!timeStr) return null;
  // Exact match: datetime includes " HH:MM:SS"
  const exact = data.find(c => c.datetime.includes(` ${timeStr}`));
  if (exact) return exact;
  // Fallback: match HH:MM only (ignore seconds)
  const targetHHMM = timeStr.slice(0, 5);
  const approx = data.find(c => c.datetime.includes(` ${targetHHMM}:`));
  if (approx) return approx;
  return data[0] ?? null;
}

// For daily chart: find candle matching the date string "YYYY-MM-DD"
function candleForDate(data: OHLCData[], dateStr: string): OHLCData | null {
  return data.find(c => c.datetime.startsWith(dateStr)) ?? null;
}

// ─── Register custom arrow overlays once ─────────────────────────────────────
let _overlaysReady = false;
function registerArrows() {
  if (_overlaysReady) return;
  _overlaysReady = true;

  const makeArrow = (name: string, pointsUp: boolean) => ({
    name,
    totalStep: 2,
    needDefaultPointFigure: false,
    needDefaultXAxisFigure: false,
    needDefaultYAxisFigure: false,
    createPointFigures({ overlay, coordinates }: any) {
      if (!coordinates?.length) return [];
      const { x, y } = coordinates[0];
      const ext   = (overlay.extendData ?? {}) as { color: string; label: string };
      const color = ext.color ?? '#22c55e';
      const label = ext.label ?? '';
      const W = 7, H = 11;
      const tip  = pointsUp ? y - 3 : y + 3;
      const base = pointsUp ? tip + H : tip - H;
      return [
        {
          type: 'polygon',
          attrs: {
            coordinates: [
              { x, y: tip },
              { x: x - W, y: base },
              { x: x + W, y: base },
            ],
          },
          styles: { style: 'fill', color },
          ignoreEvent: true,
        },
        {
          type: 'text',
          attrs: {
            x,
            y: pointsUp ? base + 2 : base - 2,
            text: label,
            align: 'center' as CanvasTextAlign,
            baseline: (pointsUp ? 'top' : 'bottom') as CanvasTextBaseline,
          },
          styles: { color, size: 10, weight: 'bold', family: 'system-ui' },
          ignoreEvent: true,
        },
      ];
    },
  });

  try { registerOverlay(makeArrow('tradeArrowUp',   true));  } catch (_) {}
  try { registerOverlay(makeArrow('tradeArrowDown', false)); } catch (_) {}
}

// ─── ChartCore — one per mount ────────────────────────────────────────────────
function ChartCore({
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
  onLoaded: (rem: number) => void;
  onError: (msg: string, rem: number) => void;
}) {
  const elRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    registerArrows();
    const el = elRef.current;
    if (!el) return;
    let dead = false;
    let chart: Chart | null = null;

    (async () => {
      try {
        const data  = await getOHLCData(ticker, timeframe, tradeDate);
        const usage = getApiUsageInfo();
        if (dead) return;

        if (!data?.length) {
          onError('Nessun dato per questo ticker/periodo.', usage.remaining);
          return;
        }

        // ── Colours ──────────────────────────────────────────────────────
        const bg      = isDark ? '#0d0d1a' : '#ffffff';
        const grid    = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.05)';
        const txt     = isDark ? '#6b7280' : '#9ca3af';
        const axis    = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)';
        const cross   = isDark ? 'rgba(139,92,246,0.5)' : 'rgba(0,0,0,0.18)';
        const crossBg = isDark ? '#7c3aed' : '#374151';

        chart = init(el, {
          styles: {
            grid: {
              show: true,
              horizontal: { show: true, color: grid, size: 1, style: 'dashed' as any },
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
                high: { show: true, color: txt, textSize: 10 },
                low:  { show: true, color: txt, textSize: 10 },
                last: {
                  show: true,
                  upColor:      '#22c55e',
                  downColor:    '#ef4444',
                  noChangeColor: txt,
                  line: { show: true, style: 'dash' as any, size: 1 },
                  text: { show: true, size: 11, paddingLeft: 4, paddingRight: 4, paddingTop: 2, paddingBottom: 2, borderRadius: 2 },
                },
              },
            },
            xAxis: {
              show: true,
              axisLine: { show: true, color: axis, size: 1 },
              tickLine: { show: true, color: axis, size: 1, length: 3 },
              tickText: { show: true, color: txt,  size: 10 },
            },
            yAxis: {
              show: true,
              axisLine: { show: true, color: axis, size: 1 },
              tickLine: { show: true, color: axis, size: 1, length: 3 },
              tickText: { show: true, color: txt,  size: 10 },
            },
            crosshair: {
              show: true,
              horizontal: {
                show: true,
                line: { show: true, style: 'dash' as any, size: 1, color: cross },
                text: { show: true, size: 10, color: '#fff', borderRadius: 2, paddingLeft: 4, paddingRight: 4, paddingTop: 2, paddingBottom: 2, backgroundColor: crossBg },
              },
              vertical: {
                show: true,
                line: { show: true, style: 'dash' as any, size: 1, color: cross },
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

        if (!chart || dead) { try { if (el) dispose(el); } catch (_) {} return; }

        el.style.backgroundColor = bg;
        chart.applyNewData(data);
        try { chart.createIndicator('VOL', false); } catch (_) {}

        // ── Find target candles ───────────────────────────────────────────
        const isLong = trade.direction === 'LONG';
        const isPnlOk = (trade.pnl ?? 0) >= 0;

        let entryC: OHLCData | null = null;
        let exitC:  OHLCData | null = null;

        if (timeframe === '1day') {
          entryC = candleForDate(data, tradeDate) ?? data[Math.floor(data.length / 2)];
          exitC  = entryC;
        } else {
          // Direct string match: ora_entrata "09:34:00" vs candle datetime "2024-03-13 09:34:00"
          // No timezone conversion — both sides use the same clock source
          entryC = trade.entryTime ? candleByTime(data, trade.entryTime) : data[0];
          exitC  = trade.exitTime  ? candleByTime(data, trade.exitTime)  : null;
        }

        // ── Draw arrows after chart has rendered (wait for scale calibration) ──
        const scrollTs =
          entryC?.timestamp ?? exitC?.timestamp ?? data[data.length - 1].timestamp;

        // Scroll immediately so the entry candle is visible
        try { (chart as any)?.scrollToTimestamp(scrollTs, 0); } catch (_) {}

        // Draw arrows after a delay so KlineCharts has fully rendered the scale
        setTimeout(() => {
          if (dead || !chart) return;

          // Use the actual trade price as the value — KlineCharts maps it on the Y axis
          // For arrow UP (below candle): subtract a small % of price to place below
          // For arrow DOWN (above candle): add a small % of price to place above
          const pct = 0.005; // 0.5% offset from the trade price

          if (entryC) {
            const value = isLong
              ? trade.entryPrice * (1 - pct)   // below: arrow UP pointing at price
              : trade.entryPrice * (1 + pct);  // above: arrow DOWN pointing at price
            try {
              chart.createOverlay({
                name:       isLong ? 'tradeArrowUp' : 'tradeArrowDown',
                points:     [{ timestamp: entryC.timestamp, value }],
                extendData: { color: '#22c55e', label: 'E' },
                lock: true,
                zLevel: 10,
              });
            } catch (_) {}
          }

          if (exitC && trade.exitPrice != null) {
            const col = isPnlOk ? '#22c55e' : '#ef4444';
            const value = isLong
              ? trade.exitPrice * (1 + pct)    // above: arrow DOWN
              : trade.exitPrice * (1 - pct);   // below: arrow UP
            try {
              chart.createOverlay({
                name:       isLong ? 'tradeArrowDown' : 'tradeArrowUp',
                points:     [{ timestamp: exitC.timestamp, value }],
                extendData: { color: col, label: 'X' },
                lock: true,
                zLevel: 10,
              });
            } catch (_) {}
          }
        }, 500);

        onLoaded(usage.remaining);
      } catch (err: any) {
        const usage = getApiUsageInfo();
        onError(err?.message ?? 'Errore nel caricamento dati', usage.remaining);
      }
    })();

    return () => {
      dead = true;
      try { if (el) dispose(el); } catch (_) {}
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <div ref={elRef} style={{ width: '100%', height: '100%' }} />;
}

// ─── ArrowDot legend icon ─────────────────────────────────────────────────────
function ArrowDot({ up, color }: { up: boolean; color: string }) {
  return up ? (
    <svg width="9" height="9" viewBox="0 0 9 9" aria-hidden><polygon points="4.5,0 0,9 9,9" fill={color} /></svg>
  ) : (
    <svg width="9" height="9" viewBox="0 0 9 9" aria-hidden><polygon points="4.5,9 0,0 9,0" fill={color} /></svg>
  );
}

// ─── Exported component ───────────────────────────────────────────────────────
export function KlineChartComponent({
  ticker,
  tradeDate,
  trade,
  height = '520px',
  className,
}: TradeChartProps) {
  const [timeframe, setTimeframe]   = useState<Timeframe>('1day');
  const [mountKey,  setMountKey]    = useState(0);
  const [loading,   setLoading]     = useState(true);
  const [error,     setError]       = useState<string | null>(null);
  const [isDark,    setIsDark]      = useState(false);
  const [apiRem,    setApiRem]      = useState<number | null>(null);

  useEffect(() => {
    const check = () => setIsDark(document.documentElement.classList.contains('dark'));
    check();
    const obs = new MutationObserver(check);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => obs.disconnect();
  }, []);

  const switchTf = (tf: Timeframe) => {
    if (tf === timeframe || loading) return;
    setTimeframe(tf);
    setLoading(true);
    setError(null);
    setMountKey(k => k + 1);
  };

  const refresh = () => {
    setLoading(true);
    setError(null);
    setMountKey(k => k + 1);
  };

  const onLoaded = useCallback((rem: number) => { setLoading(false); setApiRem(rem); }, []);
  const onError  = useCallback((msg: string, rem: number) => { setLoading(false); setError(msg); setApiRem(rem); }, []);

  const isLong  = trade.direction === 'LONG';
  const isPnlOk = (trade.pnl ?? 0) >= 0;
  const entryLabel = trade.entryTime?.slice(0, 5) ?? null;
  const exitLabel  = trade.exitTime?.slice(0, 5)  ?? null;

  return (
    <div className={cn(
      'flex flex-col rounded-xl overflow-hidden',
      'border border-gray-200 dark:border-white/10',
      'bg-white dark:bg-[#0d0d1a]',
      className,
    )}>
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-200 dark:border-white/10 bg-gray-50/80 dark:bg-white/[0.03] shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-mono font-bold text-[15px] text-gray-900 dark:text-white tracking-tight shrink-0">
            {ticker}
          </span>
          <span className="text-[11px] font-mono text-gray-400 dark:text-gray-500 shrink-0">{tradeDate}</span>
          <span className={cn(
            'text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0',
            isLong
              ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
              : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
          )}>
            {trade.direction}
          </span>
          {trade.pnl != null && (
            <span className={cn(
              'text-[12px] font-bold font-mono shrink-0',
              isPnlOk ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400',
            )}>
              {isPnlOk ? '+' : ''}{trade.pnl.toFixed(2)}$
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <div className="flex items-center rounded-lg border border-gray-200 dark:border-white/10 overflow-hidden">
            {TIMEFRAMES.map((tf, i) => (
              <button
                key={tf.value}
                disabled={loading}
                onClick={() => switchTf(tf.value)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold transition-colors select-none',
                  i > 0 && 'border-l border-gray-200 dark:border-white/10',
                  timeframe === tf.value
                    ? 'bg-gray-900 dark:bg-violet-600 text-white'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5',
                  loading && 'opacity-50 cursor-not-allowed',
                )}
              >
                {tf.icon === 'bar'
                  ? <BarChart2 className="h-3 w-3" />
                  : <Clock     className="h-3 w-3" />}
                {tf.label}
              </button>
            ))}
          </div>
          <button
            onClick={refresh}
            disabled={loading}
            title="Aggiorna"
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

      {/* Chart area */}
      <div className="relative" style={{ height }}>
        {loading && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-white/80 dark:bg-[#0d0d1a]/80 backdrop-blur-[2px]">
            <Loader2 className="h-7 w-7 animate-spin text-violet-500 mb-2" />
            <p className="text-xs text-gray-400 font-medium">Caricamento dati...</p>
          </div>
        )}
        {error && !loading && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center px-8 bg-white dark:bg-[#0d0d1a]">
            <div className="max-w-xs text-center space-y-3">
              <div className="w-10 h-10 rounded-full bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center mx-auto">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
              </div>
              <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">Dati non disponibili</p>
              <p className="text-[12px] text-gray-500 dark:text-gray-400 leading-relaxed">{error}</p>
              <Button variant="outline" size="sm" onClick={refresh} className="text-xs">
                <RefreshCw className="h-3 w-3 mr-1.5" /> Riprova
              </Button>
            </div>
          </div>
        )}
        <ChartCore
          key={mountKey}
          ticker={ticker}
          tradeDate={tradeDate}
          trade={trade}
          timeframe={timeframe}
          isDark={isDark}
          onLoaded={onLoaded}
          onError={onError}
        />
      </div>

      {/* Legend */}
      <div className="flex items-center justify-between px-4 py-2 border-t border-gray-200 dark:border-white/10 bg-gray-50/80 dark:bg-white/[0.02] shrink-0">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-1.5">
            <ArrowDot up={isLong} color={isLong ? '#22c55e' : '#ef4444'} />
            <span className="text-[11px] font-mono text-gray-500 dark:text-gray-400">
              Entrata {trade.entryPrice.toFixed(2)}{entryLabel ? ` · ${entryLabel}` : ''}
            </span>
          </div>
          {trade.exitPrice != null && (
            <div className="flex items-center gap-1.5">
              <ArrowDot up={!isLong} color={isPnlOk ? '#22c55e' : '#ef4444'} />
              <span className="text-[11px] font-mono text-gray-500 dark:text-gray-400">
                Uscita {trade.exitPrice.toFixed(2)}{exitLabel ? ` · ${exitLabel}` : ''}
              </span>
            </div>
          )}
        </div>
        {apiRem !== null && (
          <span className="text-[10px] tabular-nums text-gray-400 dark:text-gray-600 shrink-0 ml-4">
            {apiRem} req rimaste
          </span>
        )}
      </div>
    </div>
  );
}
