'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { init, dispose, Chart, registerOverlay } from 'klinecharts';
import { fetchOHLCBars, type MassiveTimeframe, type OHLCBar } from '@/lib/massive-service';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, RefreshCw, ZoomIn, ZoomOut, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────

interface TradeMarker {
  entryPrice: number;
  exitPrice: number | null;
  entryTime?: string | null;
  exitTime?: string | null;
  direction: string;
  stopLoss?: number | null;
  takeProfit?: number | null;
  pnl?: number | null;
  quantity?: number;
}

interface KlineChartProps {
  ticker: string;
  tradeDate: string;
  trade: TradeMarker;
  height?: string;
  className?: string;
}

// ─── Timeframes ───────────────────────────────────────────────────────────────
const TIMEFRAMES: { label: string; value: MassiveTimeframe }[] = [
  { label: '1 min',       value: '1min' },
  { label: 'Giornaliero', value: '1day' },
];

// ─── Chart styles (extracted to avoid 140kiB webpack serialization warning) ──
function buildChartStyles(isDark: boolean) {
  const gridColor      = isDark ? 'rgba(139,92,246,0.06)' : 'rgba(0,0,0,0.04)';
  const textColor      = isDark ? '#9ca3af' : '#6b7280';
  const crosshairColor = isDark ? 'rgba(139,92,246,0.3)' : 'rgba(0,0,0,0.1)';
  const axisLineColor  = isDark ? 'rgba(139,92,246,0.15)' : 'rgba(0,0,0,0.08)';
  const tooltipBg      = isDark ? '#7c3aed' : '#6b7280';

  return {
    grid: {
      show: true,
      horizontal: { show: true, color: gridColor, size: 1, style: 'dashed' as any },
      vertical:   { show: true, color: gridColor, size: 1, style: 'dashed' as any },
    },
    candle: {
      type: 'candle_solid' as any,
      bar: {
        upColor:         '#22c55e',
        downColor:       '#ef4444',
        upBorderColor:   '#22c55e',
        downBorderColor: '#ef4444',
        upWickColor:     '#22c55e',
        downWickColor:   '#ef4444',
      },
      priceMark: {
        show: true,
        high: { show: true, color: textColor, textSize: 10 },
        low:  { show: true, color: textColor, textSize: 10 },
        last: {
          show: true,
          upColor: '#22c55e', downColor: '#ef4444', noChangeColor: textColor,
          line: { show: true, style: 'dash' as any, size: 1 },
          text: { show: true, size: 11, paddingLeft: 4, paddingRight: 4, paddingTop: 2, paddingBottom: 2, borderRadius: 2 },
        },
      },
    },
    indicator: { lastValueMark: { show: false } },
    xAxis: {
      show: true,
      axisLine: { show: true, color: axisLineColor, size: 1 },
      tickLine: { show: true, color: axisLineColor, size: 1, length: 3 },
      tickText: { show: true, color: textColor, size: 10 },
    },
    yAxis: {
      show: true,
      axisLine: { show: true, color: axisLineColor, size: 1 },
      tickLine: { show: true, color: axisLineColor, size: 1, length: 3 },
      tickText: { show: true, color: textColor, size: 10 },
    },
    crosshair: {
      show: true,
      horizontal: {
        show: true,
        line: { show: true, style: 'dash' as any, size: 1, color: crosshairColor },
        text: { show: true, size: 10, color: '#ffffff', borderRadius: 2, paddingLeft: 4, paddingRight: 4, paddingTop: 2, paddingBottom: 2, backgroundColor: tooltipBg },
      },
      vertical: {
        show: true,
        line: { show: true, style: 'dash' as any, size: 1, color: crosshairColor },
        text: { show: true, size: 10, color: '#ffffff', borderRadius: 2, paddingLeft: 4, paddingRight: 4, paddingTop: 2, paddingBottom: 2, backgroundColor: tooltipBg },
      },
    },
  };
}

// ─── Register custom arrow overlay (once at module load) ─────────────────────
// 'tradeArrow' draws a filled triangle pointing UP (buy/entry-long) or DOWN
// (sell/entry-short / exit) on the exact candle bar. The point[0] carries:
//   { timestamp, value }  — the candle price level to pin to
// Extra data passed via extendData: { direction: 'up' | 'down', color: string, label: string }

let arrowOverlayRegistered = false;

function ensureArrowOverlay() {
  if (arrowOverlayRegistered) return;
  arrowOverlayRegistered = true;

  registerOverlay({
    name: 'tradeArrow',
    totalStep: 1,
    needDefaultPointFigure: false,
    needDefaultXAxisFigure: false,
    needDefaultYAxisFigure: false,
    createPointFigures: ({ overlay, coordinates }) => {
      if (!coordinates?.length) return [];
      const coord = coordinates[0];
      const x = coord.x;
      const y = coord.y;
      const ext = (overlay as any).extendData as {
        direction: 'up' | 'down';
        color: string;
        label: string;
      };
      if (!ext) return [];

      const isUp = ext.direction === 'up';
      const size = 10; // half-width of triangle base
      const height = 14; // triangle height
      // Offset so the tip touches the candle price line
      const tipY  = isUp ? y + 2  : y - 2;
      const baseY = isUp ? y + 2 + height : y - 2 - height;

      return [
        // Triangle (filled arrow)
        {
          type: 'polygon',
          attrs: {
            coordinates: isUp
              ? [
                  { x: x - size, y: baseY },
                  { x: x + size, y: baseY },
                  { x, y: tipY },
                ]
              : [
                  { x: x - size, y: baseY },
                  { x: x + size, y: baseY },
                  { x, y: tipY },
                ],
          },
          styles: {
            style: 'fill',
            color: ext.color,
          },
        },
        // Label text below/above the arrow
        {
          type: 'text',
          attrs: {
            x,
            y: isUp ? baseY + 14 : baseY - 6,
            text: ext.label,
            align: 'center',
            baseline: isUp ? 'top' : 'bottom',
          },
          styles: {
            color: ext.color,
            size: 10,
            weight: 'bold',
          },
        },
      ];
    },
  });
}

// ─── Helper: find the closest bar timestamp to a given ISO datetime ──────────
function findClosestTimestamp(
  bars: OHLCBar[],
  isoTime: string | null | undefined,
  fallbackPrice: number
): number | null {
  if (!bars.length) return null;
  // If we have a time, find the bar closest to it
  if (isoTime) {
    const target = new Date(isoTime).getTime();
    let best = bars[0];
    let bestDiff = Math.abs(bars[0].timestamp - target);
    for (const b of bars) {
      const diff = Math.abs(b.timestamp - target);
      if (diff < bestDiff) { bestDiff = diff; best = b; }
    }
    return best.timestamp;
  }
  // Fallback: find bar whose range contains the price (closest high/low match)
  let best = bars[0];
  let bestDiff = Math.abs((bars[0].high + bars[0].low) / 2 - fallbackPrice);
  for (const b of bars) {
    const mid = (b.high + b.low) / 2;
    const diff = Math.abs(mid - fallbackPrice);
    if (diff < bestDiff) { bestDiff = diff; best = b; }
  }
  return best.timestamp;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function KlineChartComponent({
  ticker,
  tradeDate,
  trade,
  height = '500px',
  className,
}: KlineChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef     = useRef<Chart | null>(null);

  const [timeframe, setTimeframe] = useState<MassiveTimeframe>('1min');
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState<string | null>(null);
  const [isDark,    setIsDark]    = useState(false);

  // Register the custom arrow overlay on first render
  useEffect(() => { ensureArrowOverlay(); }, []);

  // Dark mode detection
  useEffect(() => {
    const checkDark = () => setIsDark(document.documentElement.classList.contains('dark'));
    checkDark();
    const obs = new MutationObserver(checkDark);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => obs.disconnect();
  }, []);

  // ── Draw overlays: horizontal lines + arrow markers ───────────────────────
  const addOverlays = useCallback(
    (chart: Chart, bars: OHLCBar[]) => {
      if (!bars.length) return;
      const firstTs = bars[0].timestamp;
      const lastTs  = bars[bars.length - 1].timestamp;
      const isLong  = trade.direction === 'LONG';
      const isProfit = (trade.pnl ?? 0) >= 0;

      // ── Horizontal dashed price lines ──────────────────────────────────────
      const drawLine = (price: number, color: string, dashes: number[]) => {
        chart.createOverlay({
          name: 'straightLine',
          points: [
            { value: price, timestamp: firstTs },
            { value: price, timestamp: lastTs },
          ],
          styles: {
            line: { style: 'dashed' as any, size: 1.5, color, dashedValue: dashes },
          },
          lock: true,
        });
      };

      if (trade.entryPrice) drawLine(trade.entryPrice, isLong ? '#22c55e' : '#ef4444', [4, 4]);
      if (trade.exitPrice)  drawLine(trade.exitPrice,  isProfit ? '#22c55e' : '#ef4444', [2, 3]);
      if (trade.stopLoss)   drawLine(trade.stopLoss,   '#ef4444', [6, 3]);
      if (trade.takeProfit) drawLine(trade.takeProfit, '#22c55e', [6, 3]);

      // ── Arrow markers on the exact entry / exit candle ────────────────────
      // Entry arrow
      const entryTs = findClosestTimestamp(bars, trade.entryTime, trade.entryPrice);
      if (entryTs !== null && trade.entryPrice) {
        // LONG → green arrow UP below the candle; SHORT → red arrow DOWN above the candle
        const entryDir  = isLong ? 'up' : 'down';
        const entryBar  = bars.find(b => b.timestamp === entryTs) ?? bars[0];
        // Pin the arrow tip to the low (for UP) or high (for DOWN) of the candle
        const entryPinY = isLong ? entryBar.low : entryBar.high;

        chart.createOverlay({
          name: 'tradeArrow',
          points: [{ value: entryPinY, timestamp: entryTs }],
          lock: true,
          extendData: {
            direction: entryDir,
            color: isLong ? '#22c55e' : '#ef4444',
            label: isLong ? 'BUY' : 'SELL',
          },
        } as any);
      }

      // Exit arrow
      if (trade.exitPrice) {
        const exitTs = findClosestTimestamp(bars, trade.exitTime, trade.exitPrice);
        if (exitTs !== null) {
          // Exit of a LONG → arrow DOWN (selling); Exit of a SHORT → arrow UP (buying back)
          const exitDir   = isLong ? 'down' : 'up';
          const exitColor = isProfit ? '#22c55e' : '#ef4444';
          const exitBar   = bars.find(b => b.timestamp === exitTs) ?? bars[0];
          const exitPinY  = isLong ? exitBar.high : exitBar.low;

          chart.createOverlay({
            name: 'tradeArrow',
            points: [{ value: exitPinY, timestamp: exitTs }],
            lock: true,
            extendData: {
              direction: exitDir,
              color: exitColor,
              label: isLong ? 'SELL' : 'BUY',
            },
          } as any);
        }
      }
    },
    [trade]
  );

  // ── Chart loader ──────────────────────────────────────────────────────────
  const loadChart = useCallback(async () => {
    if (!containerRef.current) return;
    setLoading(true);
    setError(null);

    if (chartRef.current) {
      dispose(containerRef.current);
      chartRef.current = null;
    }

    try {
      const bars = await fetchOHLCBars(ticker, timeframe, tradeDate);

      if (!bars.length) {
        setError('Nessun dato disponibile per questo ticker.');
        setLoading(false);
        return;
      }

      const bgColor = isDark ? '#161622' : '#ffffff';
      const chart   = init(containerRef.current, { styles: buildChartStyles(isDark) });

      if (!chart) { setLoading(false); return; }

      chartRef.current = chart;
      if (containerRef.current) containerRef.current.style.backgroundColor = bgColor;

      chart.applyNewData(bars);
      chart.createIndicator('VOL', false);
      addOverlays(chart, bars);
    } catch (err: any) {
      setError(err.message || 'Errore nel caricamento del grafico.');
    } finally {
      setLoading(false);
    }
  }, [ticker, timeframe, tradeDate, isDark, addOverlays]);

  useEffect(() => {
    loadChart();
    return () => {
      if (containerRef.current) {
        // eslint-disable-next-line react-hooks/exhaustive-deps
        dispose(containerRef.current);
        chartRef.current = null;
      }
    };
  }, [loadChart]);

  const handleZoomIn  = () => chartRef.current?.zoomAtCoordinate?.(1.2);
  const handleZoomOut = () => chartRef.current?.zoomAtCoordinate?.(0.8);

  const isLong   = trade.direction === 'LONG';
  const isProfit = (trade.pnl ?? 0) >= 0;

  return (
    <div className={cn('rounded-lg overflow-hidden border border-gray-200 dark:border-violet-500/20', className)}>
      {/* Toolbar */}
      <div className="flex items-center justify-between px-3 py-2 bg-gray-50 dark:bg-[#1e1e30] border-b border-gray-200 dark:border-violet-500/20">
        <div className="flex items-center gap-2">
          <span className="font-mono font-bold text-sm text-gray-900 dark:text-white">{ticker}</span>
          <Badge variant="outline" className="text-xs">{tradeDate}</Badge>
          <Badge variant="outline" className="text-[10px] text-gray-400 dark:text-gray-500 hidden sm:inline-flex">Massive</Badge>
        </div>

        <div className="flex items-center gap-1">
          {TIMEFRAMES.map((tf) => (
            <Button
              key={tf.value}
              variant={timeframe === tf.value ? 'default' : 'ghost'}
              size="sm"
              className={cn(
                'h-7 px-2.5 text-xs font-semibold',
                timeframe === tf.value
                  ? 'bg-violet-600 hover:bg-violet-700 text-white'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              )}
              onClick={() => setTimeframe(tf.value)}
            >
              {tf.label}
            </Button>
          ))}

          <div className="w-px h-5 bg-gray-200 dark:bg-violet-500/20 mx-1" />

          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleZoomIn} title="Zoom in">
            <ZoomIn className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleZoomOut} title="Zoom out">
            <ZoomOut className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={loadChart} title="Aggiorna">
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Chart area */}
      <div className="relative" style={{ height }}>
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/80 dark:bg-[#161622]/80 z-10">
            <div className="flex items-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin text-violet-600" />
              <span className="text-sm text-gray-600 dark:text-gray-400">Caricamento dati...</span>
            </div>
          </div>
        )}

        {error && !loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-white dark:bg-[#161622] z-10 px-6">
            <AlertTriangle className="h-8 w-8 text-amber-500 mb-3" />
            <p className="text-sm text-gray-700 dark:text-gray-300 text-center mb-3 max-w-md">{error}</p>
            <Button variant="outline" size="sm" onClick={loadChart}>
              <RefreshCw className="h-3.5 w-3.5 mr-1" />
              Riprova
            </Button>
          </div>
        )}

        <div ref={containerRef} className="w-full h-full" />
      </div>

      {/* Legend */}
      <div className="flex items-center flex-wrap gap-x-4 gap-y-1 px-3 py-1.5 bg-gray-50 dark:bg-[#1e1e30] border-t border-gray-200 dark:border-violet-500/20 text-xs">
        <LegendItem color={isLong ? '#22c55e' : '#ef4444'} label={`Entrata ${trade.entryPrice?.toFixed(2)}`} arrow={isLong ? 'up' : 'down'} />
        {trade.exitPrice != null && (
          <LegendItem color={isProfit ? '#22c55e' : '#ef4444'} label={`Uscita ${trade.exitPrice.toFixed(2)}`} arrow={isLong ? 'down' : 'up'} />
        )}
        {trade.stopLoss != null && (
          <LegendItem color="#ef4444" label={`SL ${trade.stopLoss.toFixed(2)}`} />
        )}
        {trade.takeProfit != null && (
          <LegendItem color="#22c55e" label={`TP ${trade.takeProfit.toFixed(2)}`} />
        )}
      </div>
    </div>
  );
}

// ─── Legend item ──────────────────────────────────────────────────────────────
function LegendItem({
  color,
  label,
  arrow,
}: {
  color: string;
  label: string;
  arrow?: 'up' | 'down';
}) {
  return (
    <div className="flex items-center gap-1.5">
      {arrow ? (
        // Small inline SVG triangle to match the chart arrows
        <svg width="10" height="10" viewBox="0 0 10 10" fill={color}>
          {arrow === 'up'
            ? <polygon points="5,0 10,10 0,10" />
            : <polygon points="0,0 10,0 5,10" />}
        </svg>
      ) : (
        <div className="w-4 h-0 border-t-2 border-dashed" style={{ borderColor: color }} />
      )}
      <span className="text-gray-600 dark:text-gray-400">{label}</span>
    </div>
  );
}
