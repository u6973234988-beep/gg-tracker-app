'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { init, dispose } from 'klinecharts';
import type { Chart } from 'klinecharts';
import { getOHLCData, getApiUsageInfo } from '@/lib/twelve-data-service';
import type { Timeframe } from '@/lib/twelve-data-service';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, RefreshCw, ZoomIn, ZoomOut, AlertTriangle, BarChart2, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

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

// Only 2 timeframes as requested
const TIMEFRAMES: { label: string; value: Timeframe; icon: React.ReactNode }[] = [
  { label: 'Giornaliero', value: '1day', icon: <BarChart2 className="h-3.5 w-3.5" /> },
  { label: '1 Minuto', value: '1min', icon: <Clock className="h-3.5 w-3.5" /> },
];

export function KlineChartComponent({
  ticker,
  tradeDate,
  trade,
  height = '500px',
  className,
}: KlineChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<Chart | null>(null);
  const [timeframe, setTimeframe] = useState<Timeframe>('1day');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDark, setIsDark] = useState(false);
  const [apiRemaining, setApiRemaining] = useState<number | null>(null);
  const loadingRef = useRef(false);

  // Detect dark mode
  useEffect(() => {
    const checkDark = () => {
      setIsDark(document.documentElement.classList.contains('dark'));
    };
    checkDark();
    const observer = new MutationObserver(checkDark);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  const addOverlays = useCallback(
    (chart: Chart, data: { timestamp: number }[]) => {
      if (!data.length) return;
      const firstTs = data[0].timestamp;
      const lastTs = data[data.length - 1].timestamp;
      const isLong = trade.direction === 'LONG';
      const isProfitable = (trade.pnl || 0) >= 0;

      // Entry line
      if (trade.entryPrice) {
        chart.createOverlay({
          name: 'straightLine',
          points: [
            { value: trade.entryPrice, timestamp: firstTs },
            { value: trade.entryPrice, timestamp: lastTs },
          ],
          styles: {
            line: {
              style: 'dashed' as any,
              size: 2,
              color: isLong ? '#22c55e' : '#ef4444',
              dashedValue: [5, 4],
            },
          },
          lock: true,
        });
      }

      // Exit line
      if (trade.exitPrice) {
        chart.createOverlay({
          name: 'straightLine',
          points: [
            { value: trade.exitPrice, timestamp: firstTs },
            { value: trade.exitPrice, timestamp: lastTs },
          ],
          styles: {
            line: {
              style: 'dashed' as any,
              size: 2,
              color: isProfitable ? '#22c55e' : '#ef4444',
              dashedValue: [2, 4],
            },
          },
          lock: true,
        });
      }

      // Stop Loss
      if (trade.stopLoss) {
        chart.createOverlay({
          name: 'straightLine',
          points: [
            { value: trade.stopLoss, timestamp: firstTs },
            { value: trade.stopLoss, timestamp: lastTs },
          ],
          styles: {
            line: {
              style: 'dashed' as any,
              size: 1,
              color: '#f97316',
              dashedValue: [8, 4],
            },
          },
          lock: true,
        });
      }

      // Take Profit
      if (trade.takeProfit) {
        chart.createOverlay({
          name: 'straightLine',
          points: [
            { value: trade.takeProfit, timestamp: firstTs },
            { value: trade.takeProfit, timestamp: lastTs },
          ],
          styles: {
            line: {
              style: 'dashed' as any,
              size: 1,
              color: '#3b82f6',
              dashedValue: [8, 4],
            },
          },
          lock: true,
        });
      }
    },
    [trade]
  );

  const loadChart = useCallback(
    async (tf: Timeframe) => {
      if (!containerRef.current || loadingRef.current) return;
      loadingRef.current = true;
      setLoading(true);
      setError(null);

      // Destroy previous chart safely
      try {
        if (chartRef.current) {
          dispose(containerRef.current);
          chartRef.current = null;
        }
      } catch (_) {}

      try {
        const ohlcData = await getOHLCData(ticker, tf, tradeDate);

        const usage = getApiUsageInfo();
        setApiRemaining(usage.remaining);

        if (!ohlcData || ohlcData.length === 0) {
          setError('Nessun dato disponibile per questo ticker e periodo.');
          return;
        }

        if (!containerRef.current) return;

        // Theme colors
        const bgColor = isDark ? '#161622' : '#ffffff';
        const gridColor = isDark ? 'rgba(139, 92, 246, 0.06)' : 'rgba(0,0,0,0.04)';
        const textColor = isDark ? '#9ca3af' : '#6b7280';
        const crosshairColor = isDark ? 'rgba(139, 92, 246, 0.4)' : 'rgba(0,0,0,0.15)';
        const axisColor = isDark ? 'rgba(139, 92, 246, 0.18)' : 'rgba(0,0,0,0.08)';

        const chart = init(containerRef.current, {
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
                low: { show: true, color: textColor, textSize: 10 },
                last: {
                  show: true,
                  upColor: '#22c55e',
                  downColor: '#ef4444',
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
                  show: true,
                  size: 10,
                  color: '#ffffff',
                  borderRadius: 2,
                  paddingLeft: 4,
                  paddingRight: 4,
                  paddingTop: 2,
                  paddingBottom: 2,
                  backgroundColor: isDark ? '#7c3aed' : '#6b7280',
                },
              },
              vertical: {
                show: true,
                line: { show: true, style: 'dash' as any, size: 1, color: crosshairColor },
                text: {
                  show: true,
                  size: 10,
                  color: '#ffffff',
                  borderRadius: 2,
                  paddingLeft: 4,
                  paddingRight: 4,
                  paddingTop: 2,
                  paddingBottom: 2,
                  backgroundColor: isDark ? '#7c3aed' : '#6b7280',
                },
              },
            },
          },
        });

        if (!chart) {
          setError('Impossibile inizializzare il grafico.');
          return;
        }

        chartRef.current = chart;

        // Background
        if (containerRef.current) {
          containerRef.current.style.backgroundColor = bgColor;
        }

        // Load data
        chart.applyNewData(ohlcData);

        // Volume indicator
        chart.createIndicator('VOL', false);

        // Trade overlays
        addOverlays(chart, ohlcData);

        // Scroll to show the trade date area
        // For 1min: zoom in to show just the trading session
        if (tf === '1min') {
          // Show all intraday data (already just one day)
          chart.zoomAtCoordinate?.(1);
        }
      } catch (err: any) {
        console.error('[v0] Chart load error:', err);
        setError(err.message || 'Errore nel caricamento del grafico');
        const usage = getApiUsageInfo();
        setApiRemaining(usage.remaining);
      } finally {
        setLoading(false);
        loadingRef.current = false;
      }
    },
    [ticker, tradeDate, isDark, addOverlays]
  );

  // Load on mount and when timeframe changes
  useEffect(() => {
    loadChart(timeframe);
    return () => {
      try {
        if (containerRef.current) {
          dispose(containerRef.current);
          chartRef.current = null;
        }
      } catch (_) {}
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeframe, isDark, ticker, tradeDate]);

  const handleTimeframeChange = (tf: Timeframe) => {
    if (tf === timeframe || loading) return;
    setTimeframe(tf);
  };

  const handleZoomIn = () => chartRef.current?.zoomAtCoordinate?.(1.2);
  const handleZoomOut = () => chartRef.current?.zoomAtCoordinate?.(0.8);
  const handleRefresh = () => loadChart(timeframe);

  const isPositive = (trade.pnl || 0) >= 0;

  return (
    <div
      className={cn(
        'rounded-xl overflow-hidden border border-gray-200 dark:border-violet-500/20 bg-white dark:bg-[#1e1e30] flex flex-col',
        className
      )}
    >
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-200 dark:border-violet-500/20 bg-gray-50 dark:bg-[#1e1e30]">
        {/* Left: ticker + date */}
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
              {isPositive ? '+' : ''}
              {trade.pnl.toFixed(2)}$
            </span>
          )}
        </div>

        {/* Right: timeframe + controls */}
        <div className="flex items-center gap-1">
          {/* Timeframe switcher */}
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
                {tf.icon}
                {tf.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-0.5">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              onClick={handleZoomIn}
              disabled={loading}
              title="Zoom in"
            >
              <ZoomIn className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              onClick={handleZoomOut}
              disabled={loading}
              title="Zoom out"
            >
              <ZoomOut className="h-3.5 w-3.5" />
            </Button>
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
      </div>

      {/* Chart area */}
      <div className="relative flex-1" style={{ height }}>
        {/* Loading overlay */}
        {loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/90 dark:bg-[#161622]/90 z-10 gap-3">
            <Loader2 className="h-6 w-6 animate-spin text-violet-500" />
            <div className="text-center">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Caricamento {timeframe === '1min' ? 'dati 1 minuto' : 'dati giornalieri'}...
              </p>
              {timeframe === '1min' && (
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                  Prima richiesta: attesa rate limit (10s)
                </p>
              )}
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
              <Button variant="outline" size="sm" onClick={handleRefresh} className="mt-2">
                <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                Riprova
              </Button>
            </div>
          </div>
        )}

        {/* KlineCharts container */}
        <div ref={containerRef} className="w-full h-full" />
      </div>

      {/* Legend bar */}
      <div className="flex items-center justify-between px-4 py-2 border-t border-gray-200 dark:border-violet-500/20 bg-gray-50 dark:bg-[#1e1e30]">
        <div className="flex items-center gap-4 flex-wrap">
          {/* Entry */}
          <LegendItem
            color={trade.direction === 'LONG' ? '#22c55e' : '#ef4444'}
            label={`Entrata ${trade.entryPrice?.toFixed(2) ?? ''}`}
            dashStyle="5,4"
          />
          {/* Exit */}
          {trade.exitPrice && (
            <LegendItem
              color={isPositive ? '#22c55e' : '#ef4444'}
              label={`Uscita ${trade.exitPrice.toFixed(2)}`}
              dashStyle="2,4"
            />
          )}
          {/* Stop Loss */}
          {trade.stopLoss && (
            <LegendItem
              color="#f97316"
              label={`SL ${trade.stopLoss.toFixed(2)}`}
              dashStyle="8,4"
            />
          )}
          {/* Take Profit */}
          {trade.takeProfit && (
            <LegendItem
              color="#3b82f6"
              label={`TP ${trade.takeProfit.toFixed(2)}`}
              dashStyle="8,4"
            />
          )}
        </div>

        {/* API usage */}
        {apiRemaining !== null && (
          <span className="text-[10px] text-gray-400 dark:text-gray-600 tabular-nums shrink-0">
            {apiRemaining} API rimaste
          </span>
        )}
      </div>
    </div>
  );
}

// Compact legend item with SVG dashed line
function LegendItem({
  color,
  label,
  dashStyle,
}: {
  color: string;
  label: string;
  dashStyle: string;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <svg width="18" height="2" viewBox="0 0 18 2" fill="none">
        <line
          x1="0"
          y1="1"
          x2="18"
          y2="1"
          stroke={color}
          strokeWidth="2"
          strokeDasharray={dashStyle}
        />
      </svg>
      <span className="text-[11px] text-gray-500 dark:text-gray-400 font-mono">{label}</span>
    </div>
  );
}
