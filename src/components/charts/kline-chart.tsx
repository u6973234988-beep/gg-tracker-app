'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { init, dispose, Chart } from 'klinecharts';
import { fetchOHLCBars, type MassiveTimeframe } from '@/lib/massive-service';
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
// Only two timeframes per spec: 1 minute intraday and Daily EOD.
const TIMEFRAMES: { label: string; value: MassiveTimeframe }[] = [
  { label: '1 min',        value: '1min' },
  { label: 'Giornaliero',  value: '1day' },
];

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

  // Default: 1min shows the full execution day in detail
  const [timeframe, setTimeframe] = useState<MassiveTimeframe>('1min');
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState<string | null>(null);
  const [isDark,    setIsDark]    = useState(false);

  // ── Dark mode detection ────────────────────────────────────────────────────
  useEffect(() => {
    const checkDark = () =>
      setIsDark(document.documentElement.classList.contains('dark'));
    checkDark();
    const obs = new MutationObserver(checkDark);
    obs.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });
    return () => obs.disconnect();
  }, []);

  // ── Overlay builder ────────────────────────────────────────────────────────
  const addOverlays = useCallback(
    (chart: Chart, data: { timestamp: number }[]) => {
      if (!data.length) return;
      const firstTs = data[0].timestamp;
      const lastTs  = data[data.length - 1].timestamp;

      const drawLine = (
        price: number,
        color: string,
        style: 'dashed' | 'solid' = 'dashed',
        dashes: number[] = [4, 4]
      ) => {
        chart.createOverlay({
          name: 'straightLine',
          points: [
            { value: price, timestamp: firstTs },
            { value: price, timestamp: lastTs },
          ],
          styles: {
            line: {
              style: style as any,
              size: 1.5,
              color,
              dashedValue: dashes,
            },
          },
          lock: true,
        });
      };

      const isLong       = trade.direction === 'LONG';
      const isProfit     = (trade.pnl ?? 0) >= 0;

      if (trade.entryPrice)  drawLine(trade.entryPrice,  isLong ? '#22c55e' : '#ef4444', 'dashed', [4, 4]);
      if (trade.exitPrice)   drawLine(trade.exitPrice,   isProfit ? '#22c55e' : '#ef4444', 'dashed', [2, 3]);
      if (trade.stopLoss)    drawLine(trade.stopLoss,    '#ef4444', 'dashed', [6, 3]);
      if (trade.takeProfit)  drawLine(trade.takeProfit,  '#22c55e', 'dashed', [6, 3]);
    },
    [trade]
  );

  // ── Chart loader ──────────────────────────────────────────────────────────
  const loadChart = useCallback(async () => {
    if (!containerRef.current) return;

    setLoading(true);
    setError(null);

    // Destroy any existing chart instance
    if (chartRef.current) {
      dispose(containerRef.current);
      chartRef.current = null;
    }

    try {
      // Fetch OHLC bars from Massive API
      const bars = await fetchOHLCBars(ticker, timeframe, tradeDate);

      if (!bars.length) {
        setError('Nessun dato disponibile per questo ticker.');
        setLoading(false);
        return;
      }

      // ── Theme tokens ───────────────────────────────────────────────────────
      const bgColor        = isDark ? '#161622' : '#ffffff';
      const gridColor      = isDark ? 'rgba(139,92,246,0.06)' : 'rgba(0,0,0,0.04)';
      const textColor      = isDark ? '#9ca3af' : '#6b7280';
      const crosshairColor = isDark ? 'rgba(139,92,246,0.3)' : 'rgba(0,0,0,0.1)';
      const axisLineColor  = isDark ? 'rgba(139,92,246,0.15)' : 'rgba(0,0,0,0.08)';
      const tooltipBg      = isDark ? '#7c3aed' : '#6b7280';

      // ── Init chart ─────────────────────────────────────────────────────────
      const chart = init(containerRef.current, {
        styles: {
          grid: {
            show: true,
            horizontal: { show: true, color: gridColor, size: 1, style: 'dashed' as any },
            vertical:   { show: true, color: gridColor, size: 1, style: 'dashed' as any },
          },
          candle: {
            type: 'candle_solid' as any,
            bar: {
              upColor:        '#22c55e',
              downColor:      '#ef4444',
              upBorderColor:  '#22c55e',
              downBorderColor:'#ef4444',
              upWickColor:    '#22c55e',
              downWickColor:  '#ef4444',
            },
            priceMark: {
              show: true,
              high: { show: true, color: textColor, textSize: 10 },
              low:  { show: true, color: textColor, textSize: 10 },
              last: {
                show: true,
                upColor:       '#22c55e',
                downColor:     '#ef4444',
                noChangeColor: textColor,
                line: { show: true, style: 'dash' as any, size: 1 },
                text: {
                  show: true,
                  size: 11,
                  paddingLeft: 4,
                  paddingRight: 4,
                  paddingTop: 2,
                  paddingBottom: 2,
                  borderRadius: 2,
                },
              },
            },
          },
          indicator: {
            lastValueMark: { show: false },
          },
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
              text: {
                show: true, size: 10, color: '#ffffff', borderRadius: 2,
                paddingLeft: 4, paddingRight: 4, paddingTop: 2, paddingBottom: 2,
                backgroundColor: tooltipBg,
              },
            },
            vertical: {
              show: true,
              line: { show: true, style: 'dash' as any, size: 1, color: crosshairColor },
              text: {
                show: true, size: 10, color: '#ffffff', borderRadius: 2,
                paddingLeft: 4, paddingRight: 4, paddingTop: 2, paddingBottom: 2,
                backgroundColor: tooltipBg,
              },
            },
          },
        },
      });

      if (!chart) {
        setLoading(false);
        return;
      }

      chartRef.current = chart;
      if (containerRef.current) {
        containerRef.current.style.backgroundColor = bgColor;
      }

      // Load data — KlineCharts v9 expects { timestamp, open, high, low, close, volume }
      chart.applyNewData(bars);

      // Volume pane below the main chart
      chart.createIndicator('VOL', false);

      // Draw entry / exit / SL / TP lines
      addOverlays(chart, bars);
    } catch (err: any) {
      console.error('[kline-chart] load error:', err);
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
    <div
      className={cn(
        'rounded-lg overflow-hidden border border-gray-200 dark:border-violet-500/20',
        className
      )}
    >
      {/* ── Toolbar ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-3 py-2 bg-gray-50 dark:bg-[#1e1e30] border-b border-gray-200 dark:border-violet-500/20">
        {/* Left: ticker + date */}
        <div className="flex items-center gap-2">
          <span className="font-mono font-bold text-sm text-gray-900 dark:text-white">
            {ticker}
          </span>
          <Badge variant="outline" className="text-xs">
            {tradeDate}
          </Badge>
          <Badge
            variant="outline"
            className="text-[10px] text-gray-400 dark:text-gray-500 hidden sm:inline-flex"
          >
            Massive
          </Badge>
        </div>

        {/* Right: timeframe buttons + zoom + refresh */}
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

          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleZoomIn}
            title="Zoom in">
            <ZoomIn className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleZoomOut}
            title="Zoom out">
            <ZoomOut className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={loadChart}
            title="Aggiorna">
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* ── Chart area ──────────────────────────────────────────────────────── */}
      <div className="relative" style={{ height }}>
        {/* Loading overlay */}
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/80 dark:bg-[#161622]/80 z-10">
            <div className="flex items-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin text-violet-600" />
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Caricamento dati...
              </span>
            </div>
          </div>
        )}

        {/* Error overlay */}
        {error && !loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-white dark:bg-[#161622] z-10 px-6">
            <AlertTriangle className="h-8 w-8 text-amber-500 mb-3" />
            <p className="text-sm text-gray-700 dark:text-gray-300 text-center mb-3 max-w-md">
              {error}
            </p>
            <Button variant="outline" size="sm" onClick={loadChart}>
              <RefreshCw className="h-3.5 w-3.5 mr-1" />
              Riprova
            </Button>
          </div>
        )}

        <div ref={containerRef} className="w-full h-full" />
      </div>

      {/* ── Legend ──────────────────────────────────────────────────────────── */}
      <div className="flex items-center flex-wrap gap-x-4 gap-y-1 px-3 py-1.5 bg-gray-50 dark:bg-[#1e1e30] border-t border-gray-200 dark:border-violet-500/20 text-xs">
        <LegendItem
          color={isLong ? '#22c55e' : '#ef4444'}
          label={`Entrata ${trade.entryPrice?.toFixed(2)}`}
        />
        {trade.exitPrice != null && (
          <LegendItem
            color={isProfit ? '#22c55e' : '#ef4444'}
            label={`Uscita ${trade.exitPrice.toFixed(2)}`}
          />
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

// ── Small legend line + label ─────────────────────────────────────────────────
function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <div
        className="w-4 h-0 border-t-2 border-dashed"
        style={{ borderColor: color }}
      />
      <span className="text-gray-600 dark:text-gray-400">{label}</span>
    </div>
  );
}
