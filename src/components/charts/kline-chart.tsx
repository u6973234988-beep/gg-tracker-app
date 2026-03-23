'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { init, dispose, registerOverlay, Chart } from 'klinecharts';
import { getOHLCData, getApiUsageInfo } from '@/lib/massive-data-service';
import type { Timeframe } from '@/lib/massive-data-service';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, RefreshCw, AlertTriangle, Info, BarChart3, Calendar } from 'lucide-react';
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

// ─── Registra overlay custom per marker entry/exit ───────────────────
let overlayRegistered = false;

function registerTradeMarkerOverlay() {
  if (overlayRegistered) return;
  overlayRegistered = true;

  registerOverlay({
    name: 'tradeSignalMarker',
    totalStep: 2,
    needDefaultPointFigure: false,
    needDefaultXAxisFigure: false,
    needDefaultYAxisFigure: false,
    createPointFigures: ({ overlay, coordinates }) => {
      const extData = overlay.extendData;
      if (!coordinates[0]) return [];

      const x = coordinates[0].x;
      const y = coordinates[0].y;
      const isEntry = extData?.type === 'entry';
      const isLong = extData?.direction === 'LONG';
      const isProfitable = extData?.pnl >= 0;

      let bgColor: string;
      let label: string;
      if (isEntry) {
        bgColor = isLong ? '#16a34a' : '#dc2626';
        label = isLong ? 'LONG' : 'SHORT';
      } else {
        bgColor = isProfitable ? '#16a34a' : '#dc2626';
        label = 'EXIT';
      }

      const arrowPointsUp = isEntry ? isLong : !isProfitable;
      const arrowOffset = arrowPointsUp ? 14 : -14;
      const textOffset = arrowPointsUp ? 28 : -28;

      const figures: any[] = [
        {
          type: 'polygon',
          attrs: {
            coordinates: arrowPointsUp
              ? [
                  { x: x - 6, y: y - arrowOffset + 8 },
                  { x: x + 6, y: y - arrowOffset + 8 },
                  { x, y: y - arrowOffset - 2 },
                ]
              : [
                  { x: x - 6, y: y - arrowOffset - 8 },
                  { x: x + 6, y: y - arrowOffset - 8 },
                  { x, y: y - arrowOffset + 2 },
                ],
          },
          styles: { color: bgColor },
        },
        {
          type: 'text',
          attrs: {
            x: x,
            y: y - textOffset,
            text: label,
            align: 'center',
            baseline: 'middle',
          },
          styles: {
            color: '#ffffff',
            size: 10,
            weight: 'bold',
            paddingLeft: 4,
            paddingRight: 4,
            paddingTop: 2,
            paddingBottom: 2,
            borderRadius: 3,
            backgroundColor: bgColor,
            borderSize: 0,
          },
        },
      ];

      return figures;
    },
  });
}

// ─── Conversione orario mercato (ET) → UTC ms ──────────────────────
function getETOffsetHours(dateStr: string): number {
  const [year, month, day] = dateStr.split('-').map(Number);
  const probeUtc = new Date(Date.UTC(year, month - 1, day, 12, 0, 0, 0));
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    hour: '2-digit',
    hour12: false,
  }).formatToParts(probeUtc);
  const etHour = parseInt(parts.find((p) => p.type === 'hour')?.value || '12');
  return etHour - 12;
}

function etToUnixMs(dateStr: string, timeStr: string): number {
  const [year, month, day] = dateStr.split('-').map(Number);
  const [hours, minutes] = timeStr.split(':').map(Number);
  const offsetHours = getETOffsetHours(dateStr);
  return Date.UTC(year, month - 1, day, hours - offsetHours, minutes, 0, 0);
}

function utcMsToETMinutes(ms: number, dateStr: string): number {
  const offsetHours = getETOffsetHours(dateStr);
  const d = new Date(ms);
  const utcH = d.getUTCHours();
  const utcM = d.getUTCMinutes();
  return (utcH + offsetHours) * 60 + utcM;
}

function findBestCandleForTime(
  data: { timestamp: number }[],
  dateStr: string,
  timeStr: string | null | undefined,
  timeframe: Timeframe
): number | null {
  if (!data.length) return null;

  if (timeframe === '1day') {
    const targetMidnight = etToUnixMs(dateStr, '00:00');
    const exact = data.find((d) => d.timestamp === targetMidnight);
    if (exact) return exact.timestamp;
    let best = data[0].timestamp;
    let bestDiff = Math.abs(data[0].timestamp - targetMidnight);
    for (const d of data) {
      const diff = Math.abs(d.timestamp - targetMidnight);
      if (diff < bestDiff) {
        bestDiff = diff;
        best = d.timestamp;
      }
    }
    return best;
  }

  if (!timeStr) return null;

  const tradeET = (() => {
    const [h, m] = timeStr.split(':').map(Number);
    return h * 60 + m;
  })();

  let bestCandle: number | null = null;
  let bestDiff = Infinity;

  for (const d of data) {
    const candleET = utcMsToETMinutes(d.timestamp, dateStr);
    if (tradeET >= candleET && tradeET < candleET + 1) {
      return d.timestamp;
    }
    const diff = Math.abs(candleET - tradeET);
    if (diff < bestDiff) {
      bestDiff = diff;
      bestCandle = d.timestamp;
    }
  }

  return bestCandle;
}

function findCandleIndex(data: { timestamp: number }[], targetTs: number): number {
  let bestIdx = 0;
  let bestDiff = Math.abs(data[0].timestamp - targetTs);
  for (let i = 1; i < data.length; i++) {
    const diff = Math.abs(data[i].timestamp - targetTs);
    if (diff < bestDiff) {
      bestDiff = diff;
      bestIdx = i;
    }
  }
  return bestIdx;
}

// ─── Inner chart component (remounts on timeframe change via key) ───
function ChartInner({
  ticker,
  tradeDate,
  trade,
  timeframe,
  height,
  isDark,
  onApiInfo,
}: {
  ticker: string;
  tradeDate: string;
  trade: TradeMarker;
  timeframe: Timeframe;
  height: string;
  isDark: boolean;
  onApiInfo: (info: { daily: number; remaining: number }) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<Chart | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadChart = useCallback(async () => {
    if (!containerRef.current) return;

    setLoading(true);
    setError(null);

    if (chartRef.current) {
      dispose(containerRef.current);
      chartRef.current = null;
    }

    try {
      const ohlcData = await getOHLCData(ticker, timeframe, tradeDate);

      const usage = getApiUsageInfo();
      onApiInfo({ daily: usage.daily, remaining: usage.remaining });

      if (!ohlcData || ohlcData.length === 0) {
        setError('Nessun dato disponibile per questo ticker');
        setLoading(false);
        return;
      }

      const chartData = ohlcData.map((d) => ({
        timestamp: d.timestamp,
        open: d.open,
        high: d.high,
        low: d.low,
        close: d.close,
        volume: d.volume,
      }));

      const bgColor = isDark ? '#161622' : '#ffffff';
      const gridColor = isDark ? 'rgba(139, 92, 246, 0.06)' : 'rgba(0, 0, 0, 0.04)';
      const textColor = isDark ? '#9ca3af' : '#6b7280';
      const crosshairColor = isDark ? 'rgba(139, 92, 246, 0.3)' : 'rgba(0, 0, 0, 0.1)';
      const axisLineColor = isDark ? 'rgba(139, 92, 246, 0.15)' : 'rgba(0, 0, 0, 0.08)';

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

      if (containerRef.current) {
        containerRef.current.style.backgroundColor = bgColor;
      }

      chart.applyNewData(chartData);
      chart.createIndicator('VOL', false, { id: 'candle_pane' });

      // ── Markers ──
      let entryTs: number | null = null;

      if (trade.entryPrice) {
        entryTs = findBestCandleForTime(chartData, tradeDate, trade.entryTime, timeframe);
        if (entryTs) {
          chart.createOverlay({
            name: 'tradeSignalMarker',
            points: [{ timestamp: entryTs, value: trade.entryPrice }],
            extendData: { type: 'entry', direction: trade.direction, pnl: trade.pnl },
            lock: true,
            visible: true,
          });
        }
      }

      if (trade.exitPrice) {
        const exitTs = findBestCandleForTime(chartData, tradeDate, trade.exitTime, timeframe);
        if (exitTs) {
          chart.createOverlay({
            name: 'tradeSignalMarker',
            points: [{ timestamp: exitTs, value: trade.exitPrice }],
            extendData: { type: 'exit', direction: trade.direction, pnl: trade.pnl },
            lock: true,
            visible: true,
          });
        }
      }

      if (trade.stopLoss) {
        const firstTs = chartData[0].timestamp;
        const lastTs = chartData[chartData.length - 1].timestamp;
        chart.createOverlay({
          name: 'straightLine',
          points: [{ value: trade.stopLoss, timestamp: firstTs }, { value: trade.stopLoss, timestamp: lastTs }],
          styles: { line: { style: 'dashed' as any, size: 1, color: '#ef4444', dashedValue: [6, 3] } },
          lock: true,
        });
      }

      if (trade.takeProfit) {
        const firstTs = chartData[0].timestamp;
        const lastTs = chartData[chartData.length - 1].timestamp;
        chart.createOverlay({
          name: 'straightLine',
          points: [{ value: trade.takeProfit, timestamp: firstTs }, { value: trade.takeProfit, timestamp: lastTs }],
          styles: { line: { style: 'dashed' as any, size: 1, color: '#22c55e', dashedValue: [6, 3] } },
          lock: true,
        });
      }

      // ── Auto-scroll & zoom to trade position ──
      if (timeframe === '1min' && entryTs && chartData.length > 0) {
        // For 1-min: zoom tightly around entry/exit markers
        const entryIdx = findCandleIndex(chartData, entryTs);
        const exitTs = trade.exitPrice
          ? findBestCandleForTime(chartData, tradeDate, trade.exitTime, timeframe)
          : null;
        const exitIdx = exitTs ? findCandleIndex(chartData, exitTs) : entryIdx;

        const markerSpan = Math.abs(exitIdx - entryIdx);
        // Show padding of ~30 candles before entry and after exit, or at least 50 candles total
        const padding = Math.max(30, Math.floor(markerSpan * 0.5));
        const rangeStart = Math.max(0, Math.min(entryIdx, exitIdx) - padding);
        const rangeEnd = Math.min(chartData.length - 1, Math.max(entryIdx, exitIdx) + padding);
        const visibleCount = rangeEnd - rangeStart + 1;

        setTimeout(() => {
          if (chartRef.current) {
            // Zoom level: total candles / visible candles
            const zoomLevel = chartData.length / Math.max(visibleCount, 40);
            if (zoomLevel > 1.2) {
              chartRef.current.zoomAtDataIndex?.(zoomLevel, entryIdx, 0);
            }
            chartRef.current.scrollToDataIndex?.(rangeStart);
          }
        }, 80);
      } else if (timeframe === '1day' && chartData.length > 0) {
        const scrollTargetTs = findBestCandleForTime(chartData, tradeDate, null, '1day');
        if (scrollTargetTs) {
          const targetIdx = findCandleIndex(chartData, scrollTargetTs);
          const totalCandles = chartData.length;
          const visibleCount = 40;
          const halfVisible = Math.floor(visibleCount / 2);
          const scrollTo = Math.max(0, Math.min(targetIdx - halfVisible, totalCandles - visibleCount));
          setTimeout(() => {
            if (chartRef.current) {
              chartRef.current.scrollToDataIndex?.(scrollTo);
            }
          }, 50);
        }
      }

    } catch (err: any) {
      console.error('Chart load error:', err);
      setError(err.message || 'Errore nel caricamento del grafico');
      const usage = getApiUsageInfo();
      onApiInfo({ daily: usage.daily, remaining: usage.remaining });
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticker, tradeDate, timeframe, isDark]);

  useEffect(() => {
    registerTradeMarkerOverlay();
    loadChart();
    return () => {
      if (containerRef.current) {
        // eslint-disable-next-line react-hooks/exhaustive-deps
        dispose(containerRef.current);
        chartRef.current = null;
      }
    };
  }, [loadChart]);

  return (
    <div className="relative" style={{ height }}>
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/80 dark:bg-[#161622]/80 z-10 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <Loader2 className="h-5 w-5 animate-spin text-violet-600" />
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
              {timeframe === '1day' ? 'Caricamento giornaliero' : 'Caricamento 1 minuto'}...
            </span>
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
  );
}

// ─── Componente principale (wrapper con toolbar) ─────────────────────
export function KlineChartComponent({
  ticker,
  tradeDate,
  trade,
  height = '500px',
  className,
}: KlineChartProps) {
  const [timeframe, setTimeframe] = useState<Timeframe>('1min');
  const [isDark, setIsDark] = useState(() =>
    typeof document !== 'undefined'
      ? document.documentElement.classList.contains('dark')
      : false
  );
  const [apiInfo, setApiInfo] = useState<{ daily: number; remaining: number } | null>(null);
  // Contatore per forzare remount quando si preme refresh
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const checkDark = () => {
      setIsDark(document.documentElement.classList.contains('dark'));
    };
    checkDark();
    const observer = new MutationObserver(checkDark);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  const isLong = trade.direction === 'LONG';
  const isProfitable = (trade.pnl || 0) >= 0;

  return (
    <div className={cn('rounded-xl overflow-hidden border border-gray-200 dark:border-violet-500/20 shadow-sm', className)}>
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50/80 dark:bg-[#1e1e30]/80 border-b border-gray-200 dark:border-violet-500/20 backdrop-blur-sm">
        <div className="flex items-center gap-2.5">
          <span className="font-mono font-bold text-sm text-gray-900 dark:text-white">{ticker}</span>
          <Badge variant="outline" className="text-[10px] font-medium">{tradeDate}</Badge>
        </div>

        <div className="flex items-center gap-1">
          {/* Timeframe buttons */}
          <div className="flex items-center bg-gray-200/60 dark:bg-[#161622]/60 rounded-lg p-0.5">
            <button
              onClick={() => setTimeframe('1min')}
              className={cn(
                'flex items-center gap-1 px-3 py-1 rounded-md text-xs font-medium transition-all duration-200',
                timeframe === '1min'
                  ? 'bg-violet-600 text-white shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              )}
            >
              <BarChart3 className="h-3 w-3" />
              1m
            </button>
            <button
              onClick={() => setTimeframe('1day')}
              className={cn(
                'flex items-center gap-1 px-3 py-1 rounded-md text-xs font-medium transition-all duration-200',
                timeframe === '1day'
                  ? 'bg-violet-600 text-white shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              )}
            >
              <Calendar className="h-3 w-3" />
              1D
            </button>
          </div>

          <div className="w-px h-5 bg-gray-200 dark:bg-violet-500/20 mx-1.5" />

          <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg" onClick={() => setRefreshKey((k) => k + 1)}>
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Chart - key forces full remount on timeframe or refresh change */}
      <ChartInner
        key={`${timeframe}-${refreshKey}`}
        ticker={ticker}
        tradeDate={tradeDate}
        trade={trade}
        timeframe={timeframe}
        height={height}
        isDark={isDark}
        onApiInfo={setApiInfo}
      />

      {/* Legend */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-50/80 dark:bg-[#1e1e30]/80 border-t border-gray-200 dark:border-violet-500/20 backdrop-blur-sm text-xs">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <div className={cn(
              'w-3 h-3 rounded-sm text-[8px] font-bold text-white flex items-center justify-center',
              isLong ? 'bg-green-600' : 'bg-red-600'
            )}>
              {isLong ? 'L' : 'S'}
            </div>
            <span className="text-gray-600 dark:text-gray-400">
              Entrata {trade.entryPrice?.toFixed(2)}
            </span>
          </div>
          {trade.exitPrice && (
            <div className="flex items-center gap-1.5">
              <div className={cn(
                'w-3 h-3 rounded-sm text-[8px] font-bold text-white flex items-center justify-center',
                isProfitable ? 'bg-green-600' : 'bg-red-600'
              )}>
                E
              </div>
              <span className="text-gray-600 dark:text-gray-400">
                Uscita {trade.exitPrice?.toFixed(2)}
              </span>
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
