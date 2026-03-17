'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { init, dispose, Chart } from 'klinecharts';
import { getOHLCData, getApiUsageInfo } from '@/lib/twelve-data-service';
import type { Timeframe } from '@/lib/twelve-data-service';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, RefreshCw, ZoomIn, ZoomOut, AlertTriangle, Info } from 'lucide-react';
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

const TIMEFRAMES: { label: string; value: Timeframe }[] = [
  { label: '1D', value: '1day' },
  { label: '1h', value: '1h' },
  { label: '30m', value: '30min' },
  { label: '15m', value: '15min' },
  { label: '5m', value: '5min' },
  { label: '1m', value: '1min' },
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
  const [apiInfo, setApiInfo] = useState<{ daily: number; remaining: number } | null>(null);

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

  const addOverlays = useCallback((chart: Chart, data: any[]) => {
    if (!data.length) return;

    const firstTs = data[0].timestamp;
    const lastTs = data[data.length - 1].timestamp;

    // Entry price line (verde = LONG, rossa = SHORT)
    if (trade.entryPrice) {
      const isLong = trade.direction === 'LONG';
      chart.createOverlay({
        name: 'straightLine',
        points: [
          { value: trade.entryPrice, timestamp: firstTs },
          { value: trade.entryPrice, timestamp: lastTs },
        ],
        styles: {
          line: {
            style: 'dashed' as any,
            size: 1.5,
            color: isLong ? '#22c55e' : '#ef4444',
            dashedValue: [4, 4],
          },
        },
        lock: true,
      });
    }

    // Exit price line
    if (trade.exitPrice) {
      const isProfitable = (trade.pnl || 0) >= 0;
      chart.createOverlay({
        name: 'straightLine',
        points: [
          { value: trade.exitPrice, timestamp: firstTs },
          { value: trade.exitPrice, timestamp: lastTs },
        ],
        styles: {
          line: {
            style: 'dashed' as any,
            size: 1.5,
            color: isProfitable ? '#22c55e' : '#ef4444',
            dashedValue: [2, 3],
          },
        },
        lock: true,
      });
    }

    // Stop loss line
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
            color: '#ef4444',
            dashedValue: [6, 3],
          },
        },
        lock: true,
      });
    }

    // Take profit line
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
            color: '#22c55e',
            dashedValue: [6, 3],
          },
        },
        lock: true,
      });
    }
  }, [trade]);

  const loadChart = useCallback(async () => {
    if (!containerRef.current) return;

    setLoading(true);
    setError(null);

    // Dispose previous chart instance
    if (chartRef.current) {
      dispose(containerRef.current);
      chartRef.current = null;
    }

    try {
      // Fetch dati reali da Twelve Data
      const ohlcData = await getOHLCData(ticker, timeframe, tradeDate);

      // Aggiorna contatore API
      const usage = getApiUsageInfo();
      setApiInfo({ daily: usage.daily, remaining: usage.remaining });

      if (!ohlcData || ohlcData.length === 0) {
        setError('Nessun dato disponibile per questo ticker');
        setLoading(false);
        return;
      }

      // Formato KlineCharts v9: { timestamp, open, high, low, close, volume }
      const chartData = ohlcData.map((d) => ({
        timestamp: d.timestamp,
        open: d.open,
        high: d.high,
        low: d.low,
        close: d.close,
        volume: d.volume,
      }));

      // Colori in base al tema
      const bgColor = isDark ? '#161622' : '#ffffff';
      const gridColor = isDark ? 'rgba(139, 92, 246, 0.06)' : 'rgba(0, 0, 0, 0.04)';
      const textColor = isDark ? '#9ca3af' : '#6b7280';
      const crosshairColor = isDark ? 'rgba(139, 92, 246, 0.3)' : 'rgba(0, 0, 0, 0.1)';
      const axisLineColor = isDark ? 'rgba(139, 92, 246, 0.15)' : 'rgba(0, 0, 0, 0.08)';

      // Init chart - KlineCharts v9 API
      const chart = init(containerRef.current, {
        styles: {
          grid: {
            show: true,
            horizontal: { show: true, color: gridColor, size: 1, style: 'dashed' as any },
            vertical: { show: true, color: gridColor, size: 1, style: 'dashed' as any },
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
        setLoading(false);
        return;
      }

      chartRef.current = chart;

      // Background
      if (containerRef.current) {
        containerRef.current.style.backgroundColor = bgColor;
      }

      // KlineCharts v9: carica dati con applyNewData
      chart.applyNewData(chartData);

      // Aggiungi indicatore Volume in un pannello separato sotto il grafico
      chart.createIndicator('VOL', false);

      // Aggiungi overlay per entrata/uscita/SL/TP
      addOverlays(chart, chartData);

    } catch (err: any) {
      console.error('Chart load error:', err);
      setError(err.message || 'Errore nel caricamento del grafico');
      // Aggiorna info API anche in errore
      const usage = getApiUsageInfo();
      setApiInfo({ daily: usage.daily, remaining: usage.remaining });
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

  const handleZoomIn = () => {
    chartRef.current?.zoomAtCoordinate?.(1.2);
  };

  const handleZoomOut = () => {
    chartRef.current?.zoomAtCoordinate?.(0.8);
  };

  return (
    <div className={cn('rounded-lg overflow-hidden border border-gray-200 dark:border-violet-500/20', className)}>
      {/* Toolbar */}
      <div className="flex items-center justify-between px-3 py-2 bg-gray-50 dark:bg-[#1e1e30] border-b border-gray-200 dark:border-violet-500/20">
        <div className="flex items-center gap-2">
          <span className="font-mono font-bold text-sm text-gray-900 dark:text-white">{ticker}</span>
          <Badge variant="outline" className="text-xs">{tradeDate}</Badge>
        </div>

        <div className="flex items-center gap-1">
          {TIMEFRAMES.map((tf) => (
            <Button
              key={tf.value}
              variant={timeframe === tf.value ? 'default' : 'ghost'}
              size="sm"
              className={cn(
                'h-7 px-2 text-xs',
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

          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleZoomIn}>
            <ZoomIn className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleZoomOut}>
            <ZoomOut className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={loadChart}>
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Chart */}
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

      {/* Legend + API usage */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-gray-50 dark:bg-[#1e1e30] border-t border-gray-200 dark:border-violet-500/20 text-xs">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-0 border-t-2 border-dashed border-emerald-500" />
            <span className="text-gray-600 dark:text-gray-400">Entrata {trade.entryPrice?.toFixed(2)}</span>
          </div>
          {trade.exitPrice && (
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-0 border-t-2 border-dashed" style={{ borderColor: (trade.pnl || 0) >= 0 ? '#22c55e' : '#ef4444' }} />
              <span className="text-gray-600 dark:text-gray-400">Uscita {trade.exitPrice?.toFixed(2)}</span>
            </div>
          )}
          {trade.stopLoss && (
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-0 border-t-2 border-dashed border-red-500" />
              <span className="text-gray-600 dark:text-gray-400">SL {trade.stopLoss?.toFixed(2)}</span>
            </div>
          )}
          {trade.takeProfit && (
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-0 border-t-2 border-dashed border-green-500" />
              <span className="text-gray-600 dark:text-gray-400">TP {trade.takeProfit?.toFixed(2)}</span>
            </div>
          )}
        </div>

        {apiInfo && (
          <div className="flex items-center gap-1 text-gray-400 dark:text-gray-500">
            <Info className="h-3 w-3" />
            <span>API: {apiInfo.remaining} rimaste</span>
          </div>
        )}
      </div>
    </div>
  );
}
