'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { init, dispose, registerOverlay, Chart } from 'klinecharts';
import { getOHLCData, getApiUsageInfo } from '@/lib/massive-data-service';
import type { Timeframe } from '@/lib/massive-data-service';
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
  { label: '1m', value: '1min' },
  { label: '2m', value: '2min' },
  { label: '1D', value: '1day' },
];

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

      // Colori
      let bgColor: string;
      let label: string;
      if (isEntry) {
        bgColor = isLong ? '#16a34a' : '#dc2626';
        label = isLong ? 'LONG' : 'SHORT';
      } else {
        bgColor = isProfitable ? '#16a34a' : '#dc2626';
        label = 'EXIT';
      }

      // Direzione freccia: per SHORT entry la freccia punta giu (dall'alto), per LONG entry punta su (dal basso)
      const arrowPointsUp = isEntry ? isLong : !isProfitable;
      const arrowOffset = arrowPointsUp ? 14 : -14;
      const textOffset = arrowPointsUp ? 28 : -28;

      const figures: any[] = [
        // Freccia triangolare
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
        // Label con testo
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
// Polygon.io: timestamp `t` = Unix ms UTC, candele allineate in Eastern Time.
// TradeZero + import manuale: orari in ET (orario reale mercato US).
//
// Approccio: calcolo offset ET dinamico via Intl (gestisce EST/EDT automaticamente),
// poi cerco tra le candele reali ricevute dall'API quella che contiene il trade.
// Questo funziona da qualsiasi timezone del browser (Italia, Giappone, ovunque).

function getETOffsetHours(dateStr: string): number {
  const [year, month, day] = dateStr.split('-').map(Number);
  // Probe a mezzogiorno UTC: sempre stesso giorno calendario in ET
  const probeUtc = new Date(Date.UTC(year, month - 1, day, 12, 0, 0, 0));
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    hour: '2-digit',
    hour12: false,
  }).formatToParts(probeUtc);
  const etHour = parseInt(parts.find((p) => p.type === 'hour')?.value || '12');
  // EDT (estate): noon UTC = 8 AM ET → offset = 8-12 = -4
  // EST (inverno): noon UTC = 7 AM ET → offset = 7-12 = -5
  return etHour - 12;
}

function etToUnixMs(dateStr: string, timeStr: string): number {
  const [year, month, day] = dateStr.split('-').map(Number);
  const [hours, minutes] = timeStr.split(':').map(Number);
  const offsetHours = getETOffsetHours(dateStr);
  // ET → UTC: sottrai l'offset (offset e negativo, quindi aggiunge ore)
  return Date.UTC(year, month - 1, day, hours - offsetHours, minutes, 0, 0);
}

// Converte un timestamp UTC in ore:minuti ET (per comparare con le candele)
function utcMsToETMinutes(ms: number, dateStr: string): number {
  const offsetHours = getETOffsetHours(dateStr);
  const d = new Date(ms);
  // Ore e minuti in UTC, poi aggiungi offset per ottenere ET
  const utcH = d.getUTCHours();
  const utcM = d.getUTCMinutes();
  return (utcH + offsetHours) * 60 + utcM;
}

// Trova la candela che CONTIENE il momento del trade.
// Per 1min: candela 09:31 contiene trade 09:31:xx
// Per 2min: candela 09:30 contiene trade 09:30:00-09:31:59
// Per daily: candela del giorno del trade
function findBestCandleForTime(
  data: { timestamp: number }[],
  dateStr: string,
  timeStr: string | null | undefined,
  timeframe: Timeframe
): number | null {
  if (!data.length) return null;

  // ── Daily: cerca la candela del giorno del trade ──
  if (timeframe === '1day') {
    const targetMidnight = etToUnixMs(dateStr, '00:00');
    // Match esatto
    const exact = data.find((d) => d.timestamp === targetMidnight);
    if (exact) return exact.timestamp;
    // Fallback: candela piu vicina (entro 48h per gestire weekend/holiday)
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

  // ── Intraday: serve l'orario ──
  if (!timeStr) return null;

  const candleMins = timeframe === '2min' ? 2 : 1;
  const tradeET = (() => {
    const [h, m] = timeStr.split(':').map(Number);
    return h * 60 + m; // minuti totali dalla mezzanotte ET
  })();

  // Per ogni candela, calcolo l'orario ET e verifico se il trade cade dentro
  let bestCandle: number | null = null;
  let bestDiff = Infinity;

  for (const d of data) {
    const candleET = utcMsToETMinutes(d.timestamp, dateStr);
    // Il trade cade in questa candela se:
    // candleET <= tradeET < candleET + candleMins
    if (tradeET >= candleET && tradeET < candleET + candleMins) {
      return d.timestamp; // Match perfetto: il trade e dentro questa candela
    }
    // Traccia la candela piu vicina come fallback
    const diff = Math.abs(candleET - tradeET);
    if (diff < bestDiff) {
      bestDiff = diff;
      bestCandle = d.timestamp;
    }
  }

  // Fallback: candela piu vicina (in caso di gap, pre/post market, ecc.)
  return bestCandle;
}

// ─── Componente principale ──────────────────────────────────────────
export function KlineChartComponent({
  ticker,
  tradeDate,
  trade,
  height = '500px',
  className,
}: KlineChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<Chart | null>(null);
  const [timeframe, setTimeframe] = useState<Timeframe>('1min');
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

  // Registra overlay al mount
  useEffect(() => {
    registerTradeMarkerOverlay();
  }, []);

  const addTradeMarkers = useCallback((chart: Chart, data: any[]) => {
    if (!data.length) return;

    // Entry marker
    if (trade.entryPrice) {
      const entryTs = findBestCandleForTime(data, tradeDate, trade.entryTime, timeframe);
      if (entryTs) {
        chart.createOverlay({
          name: 'tradeSignalMarker',
          points: [{ timestamp: entryTs, value: trade.entryPrice }],
          extendData: {
            type: 'entry',
            direction: trade.direction,
            pnl: trade.pnl,
          },
          lock: true,
          visible: true,
        });
      }
    }

    // Exit marker
    if (trade.exitPrice) {
      const exitTs = findBestCandleForTime(data, tradeDate, trade.exitTime, timeframe);
      if (exitTs) {
        chart.createOverlay({
          name: 'tradeSignalMarker',
          points: [{ timestamp: exitTs, value: trade.exitPrice }],
          extendData: {
            type: 'exit',
            direction: trade.direction,
            pnl: trade.pnl,
          },
          lock: true,
          visible: true,
        });
      }
    }

    // Stop Loss line
    if (trade.stopLoss) {
      const firstTs = data[0].timestamp;
      const lastTs = data[data.length - 1].timestamp;
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

    // Take Profit line
    if (trade.takeProfit) {
      const firstTs = data[0].timestamp;
      const lastTs = data[data.length - 1].timestamp;
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
  }, [trade, tradeDate, timeframe]);

  const loadChart = useCallback(async () => {
    if (!containerRef.current) return;

    setLoading(true);
    setError(null);

    // Dispose previous chart
    if (chartRef.current) {
      dispose(containerRef.current);
      chartRef.current = null;
    }

    try {
      const ohlcData = await getOHLCData(ticker, timeframe, tradeDate);

      const usage = getApiUsageInfo();
      setApiInfo({ daily: usage.daily, remaining: usage.remaining });

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

      // Colori tema
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
      chart.createIndicator('VOL', false);

      // Aggiungi marker entry/exit e linee SL/TP
      addTradeMarkers(chart, chartData);

    } catch (err: any) {
      console.error('Chart load error:', err);
      setError(err.message || 'Errore nel caricamento del grafico');
      const usage = getApiUsageInfo();
      setApiInfo({ daily: usage.daily, remaining: usage.remaining });
    } finally {
      setLoading(false);
    }
  }, [ticker, timeframe, tradeDate, isDark, addTradeMarkers]);

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

  const isLong = trade.direction === 'LONG';
  const isProfitable = (trade.pnl || 0) >= 0;

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

      {/* Legend */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-gray-50 dark:bg-[#1e1e30] border-t border-gray-200 dark:border-violet-500/20 text-xs">
        <div className="flex items-center gap-4">
          {/* Entry */}
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
          {/* Exit */}
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
