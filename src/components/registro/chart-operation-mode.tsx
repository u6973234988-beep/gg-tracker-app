'use client';

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { init, dispose, registerOverlay, registerIndicator, Chart, ActionType } from 'klinecharts';
import { getOHLCData } from '@/lib/massive-data-service';
import type { OHLCData } from '@/lib/massive-data-service';
import type { Database } from '@/types/database';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, Plus, Trash2, Info, AlertTriangle, BarChart3, Search } from 'lucide-react';
import { toast } from 'sonner';

type Strategia = Database['public']['Tables']['strategie']['Row'];
type TipoEsecuzione = 'LONG' | 'SHORT' | 'SELL' | 'COVER' | 'ADD';

export interface EsecuzioneForm {
  id: string;
  ora: string;
  prezzo: string;
  quantita: string;
  tipo: TipoEsecuzione;
}

interface FormData {
  data: string;
  ticker: string;
  direzione: string;
  quantita: string;
  prezzo_entrata: string;
  prezzo_uscita: string;
  commissione: string;
  strategia_id: string;
  note: string;
  ora_entrata: string;
  ora_uscita: string;
}

export interface ChartOperationModeProps {
  formData: FormData;
  esecuzioni: EsecuzioneForm[];
  setFormData: React.Dispatch<React.SetStateAction<FormData>>;
  setEsecuzioni: React.Dispatch<React.SetStateAction<EsecuzioneForm[]>>;
  strategie: Strategia[];
  onSubmit: (e: React.FormEvent) => Promise<void>;
  isLoading: boolean;
  onClose: () => void;
  onCreaStrategia: () => void;
  creandoStrategia: boolean;
  nuovoNomeStrategia: string;
  setNuovoNomeStrategia: (s: string) => void;
  isSavingStrategia: boolean;
  handleCreaStrategia: () => Promise<void>;
  pnl: number | null;
}

// ─── Utility functions (from kline-chart.tsx) ──────────────────────────

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

function timestampToETTime(ms: number, dateStr: string): string {
  const offset = getETOffsetHours(dateStr);
  const d = new Date(ms);
  const h = d.getUTCHours() + offset;
  const m = d.getUTCMinutes();
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function utcMsToETMinutes(ms: number, dateStr: string): number {
  const offsetHours = getETOffsetHours(dateStr);
  const d = new Date(ms);
  const utcH = d.getUTCHours();
  const utcM = d.getUTCMinutes();
  return (utcH + offsetHours) * 60 + utcM;
}

function findBestCandleTs(
  data: { timestamp: number }[],
  dateStr: string,
  timeStr: string
): number | null {
  if (!data.length || !timeStr) return null;

  const [h, m] = timeStr.split(':').map(Number);
  const tradeET = h * 60 + m;

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

// ─── Register chart overlays (global, idempotent) ──────────────────────

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
      const label: string = extData?.label || 'ENTRY';
      const direction = extData?.direction || 'LONG';

      // Color logic:
      //   LONG  = green (opening bullish)
      //   SHORT = red   (opening bearish)
      //   ADD   = green if LONG direction, red if SHORT direction (adding same direction)
      //   SELL  = red   (closing long = selling)
      //   COVER = green (closing short = buying back)
      let bgColor: string;
      if (label === 'LONG') bgColor = '#16a34a';
      else if (label === 'SHORT') bgColor = '#dc2626';
      else if (label === 'ADD') bgColor = direction === 'LONG' ? '#16a34a' : '#dc2626';
      else if (label === 'SELL') bgColor = '#dc2626';
      else if (label === 'COVER') bgColor = '#16a34a';
      else bgColor = '#6b7280';

      // Arrow direction: up for buying actions, down for selling actions
      //   LONG/COVER = up (you're buying)
      //   SHORT/SELL = down (you're selling)
      //   ADD = up if LONG direction, down if SHORT direction
      const isBuyAction = label === 'LONG' || label === 'COVER' || (label === 'ADD' && direction === 'LONG');
      const arrowPointsUp = isBuyAction;
      const arrowOffset = arrowPointsUp ? 14 : -14;
      const textOffset = arrowPointsUp ? 28 : -28;

      return [
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
            x,
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
    },
  });
}

let volRegistered = false;

function registerCleanVolume() {
  if (volRegistered) return;
  volRegistered = true;

  registerIndicator({
    name: 'CLEAN_VOL_CHART_MODE',
    shortName: 'Vol',
    precision: 0,
    calcParams: [],
    shouldOhlc: false,
    shouldFormatBigNumber: true,
    series: 'volume' as any,
    figures: [
      {
        key: 'volume',
        title: 'VOL: ',
        type: 'bar',
        baseValue: 0,
        styles: (data: any) => {
          const kLineData = data.current?.kLineData;
          if (kLineData) {
            const isUp = kLineData.close >= kLineData.open;
            return {
              color: isUp ? 'rgba(34, 197, 94, 0.35)' : 'rgba(239, 68, 68, 0.35)',
            };
          }
          return { color: 'rgba(150, 150, 150, 0.25)' };
        },
      },
    ],
    calc: (kLineDataList: any[]) => {
      return kLineDataList.map((kLineData) => ({
        volume: kLineData.volume,
      }));
    },
  });
}

// ─── Esecuzione ID counter ──────────────────────────────────────────

let esecuzioneCounter = 1000;
function newEsecuzioneId() {
  return `chart-es-${++esecuzioneCounter}-${Date.now()}`;
}

// ═══════════════════════════════════════════════════════════════════════
// ChartOperationMode Component
// ═══════════════════════════════════════════════════════════════════════

export function ChartOperationMode({
  formData,
  esecuzioni,
  setFormData,
  setEsecuzioni,
  strategie,
  onSubmit,
  isLoading,
  onClose,
  onCreaStrategia,
  creandoStrategia,
  nuovoNomeStrategia,
  setNuovoNomeStrategia,
  isSavingStrategia,
  handleCreaStrategia,
  pnl,
}: ChartOperationModeProps) {
  // ── Chart state ──
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<Chart | null>(null);
  const [ohlcData, setOhlcData] = useState<OHLCData[]>([]);
  const [chartLoading, setChartLoading] = useState(false);
  const [chartError, setChartError] = useState<string | null>(null);
  const [chartLoaded, setChartLoaded] = useState(false);

  // ── Selected candle state ──
  const [selectedCandle, setSelectedCandle] = useState<{
    price: number;
    time: string;
    timestamp: number;
  } | null>(null);
  const [qtyInput, setQtyInput] = useState('');
  const [tipoInput, setTipoInput] = useState<TipoEsecuzione>(
    formData.direzione === 'LONG' ? 'LONG' : 'SHORT'
  );

  // ── Dark mode detect ──
  const [isDark, setIsDark] = useState(() =>
    typeof document !== 'undefined'
      ? document.documentElement.classList.contains('dark')
      : false
  );

  useEffect(() => {
    const checkDark = () => {
      setIsDark(document.documentElement.classList.contains('dark'));
    };
    checkDark();
    const observer = new MutationObserver(checkDark);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  // ── Derived: has at least one opening execution? ──
  const hasOpeningExec = esecuzioni.some((e) =>
    ['LONG', 'SHORT', 'ADD'].includes(e.tipo)
  );

  // ── Update default tipo when direction changes or esecuzioni change ──
  useEffect(() => {
    if (!hasOpeningExec) {
      // First execution must be LONG or SHORT
      setTipoInput(formData.direzione === 'LONG' ? 'LONG' : 'SHORT');
    } else {
      // After opening, default to ADD
      setTipoInput('ADD');
    }
  }, [formData.direzione, hasOpeningExec]);

  // ── Calcolo medie ponderate dalle esecuzioni ──
  const calcoloEsecuzioni = useMemo(() => {
    if (esecuzioni.length === 0) return null;

    const opening = esecuzioni.filter(
      (e) => ['LONG', 'SHORT', 'ADD'].includes(e.tipo) && e.prezzo && e.quantita
    );
    const closing = esecuzioni.filter(
      (e) => ['SELL', 'COVER'].includes(e.tipo) && e.prezzo && e.quantita
    );

    const totalQtyOpening = opening.reduce((s, e) => s + parseFloat(e.quantita || '0'), 0);
    const totalQtyClosing = closing.reduce((s, e) => s + parseFloat(e.quantita || '0'), 0);

    const prezzoEntrata =
      totalQtyOpening > 0
        ? opening.reduce(
            (s, e) => s + parseFloat(e.prezzo || '0') * parseFloat(e.quantita || '0'),
            0
          ) / totalQtyOpening
        : 0;

    const prezzoUscita =
      totalQtyClosing > 0
        ? closing.reduce(
            (s, e) => s + parseFloat(e.prezzo || '0') * parseFloat(e.quantita || '0'),
            0
          ) / totalQtyClosing
        : null;

    // Determine first entry and last exit times
    const sortedOpening = [...opening].sort((a, b) => a.ora.localeCompare(b.ora));
    const sortedClosing = [...closing].sort((a, b) => a.ora.localeCompare(b.ora));
    const oraEntrata = sortedOpening.length > 0 ? sortedOpening[0].ora : '';
    const oraUscita = sortedClosing.length > 0 ? sortedClosing[sortedClosing.length - 1].ora : '';

    return {
      prezzoEntrata,
      prezzoUscita,
      quantita: totalQtyOpening,
      hasClosing: closing.length > 0,
      oraEntrata,
      oraUscita,
    };
  }, [esecuzioni]);

  // ── Sync calcoloEsecuzioni → formData ──
  useEffect(() => {
    if (calcoloEsecuzioni && esecuzioni.length > 0) {
      setFormData((prev) => ({
        ...prev,
        prezzo_entrata: calcoloEsecuzioni.prezzoEntrata
          ? calcoloEsecuzioni.prezzoEntrata.toFixed(4)
          : prev.prezzo_entrata,
        prezzo_uscita: calcoloEsecuzioni.prezzoUscita
          ? calcoloEsecuzioni.prezzoUscita.toFixed(4)
          : '',
        quantita: calcoloEsecuzioni.quantita
          ? calcoloEsecuzioni.quantita.toString()
          : prev.quantita,
        ora_entrata: calcoloEsecuzioni.oraEntrata || prev.ora_entrata,
        ora_uscita: calcoloEsecuzioni.oraUscita || prev.ora_uscita,
      }));
    }
  }, [calcoloEsecuzioni, esecuzioni.length, setFormData]);

  // ── Load chart ──
  const handleLoadChart = useCallback(async () => {
    if (!formData.ticker || !formData.data) {
      toast.error('Inserisci ticker e data');
      return;
    }

    setChartLoading(true);
    setChartError(null);
    setChartLoaded(false);

    // Dispose previous chart
    if (containerRef.current && chartRef.current) {
      dispose(containerRef.current);
      chartRef.current = null;
    }

    try {
      const data = await getOHLCData(formData.ticker.toUpperCase(), '1min', formData.data);
      if (!data || data.length === 0) {
        setChartError('Nessun dato disponibile per questo ticker/data');
        return;
      }
      setOhlcData(data);
      setChartLoaded(true);
    } catch (err: any) {
      setChartError(err.message || 'Errore nel caricamento dati');
    } finally {
      setChartLoading(false);
    }
  }, [formData.ticker, formData.data]);

  // ── Initialize chart when data is loaded ──
  useEffect(() => {
    if (!chartLoaded || ohlcData.length === 0 || !containerRef.current) return;

    registerCleanVolume();
    registerTradeMarkerOverlay();

    // Dispose previous
    if (chartRef.current && containerRef.current) {
      dispose(containerRef.current);
      chartRef.current = null;
    }

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
        separator: {
          size: 1,
          color: axisLineColor,
          activeBackgroundColor: isDark ? 'rgba(139, 92, 246, 0.2)' : 'rgba(0, 0, 0, 0.06)',
        } as any,
        indicator: {
          lastValueMark: { show: false },
          tooltip: {
            showName: false,
            showParams: false,
          },
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

    if (!chart) return;

    chartRef.current = chart;

    if (containerRef.current) {
      containerRef.current.style.backgroundColor = bgColor;
    }

    const chartData = ohlcData.map((d) => ({
      timestamp: d.timestamp,
      open: d.open,
      high: d.high,
      low: d.low,
      close: d.close,
      volume: d.volume,
    }));

    chart.applyNewData(chartData);

    // Volume indicator
    chart.createIndicator('CLEAN_VOL_CHART_MODE', false, {
      height: 50,
      minHeight: 35,
    } as any);

    // Subscribe to candle bar click
    // klinecharts visibleDataList item: { dataIndex, x, data: KLineData }
    // So the actual candle data is at data.data (not data.kLineData)
    chart.subscribeAction(ActionType.OnCandleBarClick, (params: any) => {
      const kLineData = params?.data;
      if (kLineData && kLineData.timestamp) {
        const etTime = timestampToETTime(kLineData.timestamp, formData.data);
        setSelectedCandle({
          price: kLineData.close,
          time: etTime,
          timestamp: kLineData.timestamp,
        });
      }
    });

    return () => {
      if (containerRef.current) {
        dispose(containerRef.current);
        chartRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chartLoaded, ohlcData, isDark, formData.data]);

  // ── Update markers when esecuzioni change ──
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart || ohlcData.length === 0) return;

    // Remove all existing overlays
    chart.removeOverlay({ name: 'tradeSignalMarker' });

    // Re-add markers for each esecuzione
    const chartData = ohlcData;
    let firstEntrataRendered = false;

    esecuzioni.forEach((exec) => {
      if (!exec.prezzo || !exec.ora) return;

      const isEntrata = ['LONG', 'SHORT', 'ADD'].includes(exec.tipo);
      if (isEntrata && !firstEntrataRendered) firstEntrataRendered = true;

      const label = exec.tipo; // Already UI label (LONG/SHORT/ADD/SELL/COVER)
      const ts = findBestCandleTs(chartData, formData.data, exec.ora);

      if (ts) {
        chart.createOverlay({
          name: 'tradeSignalMarker',
          points: [{ timestamp: ts, value: parseFloat(exec.prezzo) }],
          extendData: { label, direction: formData.direzione, pnl: pnl },
          lock: true,
          visible: true,
        });
      }
    });
  }, [esecuzioni, ohlcData, formData.data, formData.direzione, pnl]);

  // ── Add execution from selected candle ──
  const handleAddEsecuzione = () => {
    if (!selectedCandle) {
      toast.error('Seleziona una candela sul grafico');
      return;
    }
    if (!qtyInput || parseFloat(qtyInput) <= 0) {
      toast.error('Inserisci una quantità valida');
      return;
    }

    const newExec: EsecuzioneForm = {
      id: newEsecuzioneId(),
      ora: selectedCandle.time,
      prezzo: selectedCandle.price.toFixed(4),
      quantita: qtyInput,
      tipo: tipoInput,
    };

    setEsecuzioni((prev) => [...prev, newExec]);
    setSelectedCandle(null);
    setQtyInput('');

    // Smart tipo switch:
    // After first opening (LONG/SHORT) → suggest ADD
    // After an ADD → keep ADD (can keep scaling)
    // After a SELL/COVER → suggest ADD (might add more closing)
    if (['LONG', 'SHORT'].includes(tipoInput)) {
      setTipoInput('ADD');
    }
    // Otherwise keep current tipo (ADD stays ADD, SELL/COVER stays)
  };

  // ── Remove execution ──
  const handleRemoveEsecuzione = (id: string) => {
    setEsecuzioni((prev) => prev.filter((e) => e.id !== id));
  };

  // ── Form field handler ──
  const handleChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // ── Tipo color helpers (consistent with chart markers) ──
  // LONG = green, SHORT = red, ADD = same as direction, SELL = red, COVER = green
  const getTipoColor = (tipo: TipoEsecuzione) => {
    switch (tipo) {
      case 'LONG': return 'text-green-600 dark:text-green-400';
      case 'SHORT': return 'text-red-600 dark:text-red-400';
      case 'ADD': return formData.direzione === 'LONG'
        ? 'text-green-600 dark:text-green-400'
        : 'text-red-600 dark:text-red-400';
      case 'SELL': return 'text-red-600 dark:text-red-400';
      case 'COVER': return 'text-green-600 dark:text-green-400';
    }
  };

  const getTipoBg = (tipo: TipoEsecuzione) => {
    switch (tipo) {
      case 'LONG': return 'bg-green-500/10 border-green-500/20';
      case 'SHORT': return 'bg-red-500/10 border-red-500/20';
      case 'ADD': return formData.direzione === 'LONG'
        ? 'bg-green-500/10 border-green-500/20'
        : 'bg-red-500/10 border-red-500/20';
      case 'SELL': return 'bg-red-500/10 border-red-500/20';
      case 'COVER': return 'bg-green-500/10 border-green-500/20';
    }
  };

  return (
    <div className="flex h-full gap-0 overflow-hidden">
      {/* ═══ LEFT: Chart Area ═══ */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Chart container */}
        <div className="flex-1 relative">
          {!chartLoaded && !chartLoading && !chartError && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400 dark:text-gray-500">
              <BarChart3 className="h-16 w-16 mb-4 opacity-20" />
              <p className="text-sm font-medium">Inserisci ticker e data, poi clicca &quot;Carica Grafico&quot;</p>
              <p className="text-xs mt-1 opacity-60">Il grafico 1 minuto apparirà qui</p>
            </div>
          )}

          {chartLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/80 dark:bg-[#161622]/80 z-10 backdrop-blur-sm">
              <div className="flex items-center gap-3">
                <Loader2 className="h-5 w-5 animate-spin text-violet-600" />
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Caricamento 1 minuto...
                </span>
              </div>
            </div>
          )}

          {chartError && !chartLoading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-white dark:bg-[#161622] z-10 px-6">
              <AlertTriangle className="h-8 w-8 text-amber-500 mb-3" />
              <p className="text-sm text-gray-700 dark:text-gray-300 text-center mb-3 max-w-md">
                {chartError}
              </p>
              <Button variant="outline" size="sm" onClick={handleLoadChart}>
                Riprova
              </Button>
            </div>
          )}

          <div
            ref={containerRef}
            className="w-full h-full"
            style={{ minHeight: '400px' }}
          />
        </div>

        {/* Bottom hint */}
        {chartLoaded && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-violet-50/50 dark:bg-violet-500/5 border-t border-gray-200 dark:border-violet-500/20">
            <Info className="h-3 w-3 text-violet-500 flex-shrink-0" />
            <span className="text-[11px] text-gray-500 dark:text-gray-400">
              Clicca su una candela per selezionare prezzo e orario → poi aggiungi l&apos;esecuzione dalla sidebar
            </span>
          </div>
        )}
      </div>

      {/* ═══ RIGHT: Sidebar ═══ */}
      <div className="w-[340px] flex-shrink-0 border-l border-gray-200 dark:border-violet-500/20 flex flex-col overflow-y-auto bg-gray-50/50 dark:bg-[#0e0e16]">
        <div className="p-4 space-y-4 flex-1">
          {/* ── Ticker + Data + Direzione ── */}
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">Ticker</Label>
                <Input
                  type="text"
                  placeholder="AAPL"
                  value={formData.ticker}
                  onChange={(e) => handleChange('ticker', e.target.value.toUpperCase())}
                  className="h-8 text-sm font-mono"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Data</Label>
                <Input
                  type="date"
                  value={formData.data}
                  onChange={(e) => handleChange('data', e.target.value)}
                  className="h-8 text-xs"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Direzione</Label>
              <Select
                value={formData.direzione}
                onValueChange={(v) => handleChange('direzione', v)}
              >
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="LONG">LONG</SelectItem>
                  <SelectItem value="SHORT">SHORT</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button
              type="button"
              size="sm"
              className="w-full h-8 text-xs bg-violet-600 hover:bg-violet-700 text-white"
              onClick={handleLoadChart}
              disabled={chartLoading || !formData.ticker || !formData.data}
            >
              {chartLoading ? (
                <Loader2 className="h-3 w-3 animate-spin mr-1" />
              ) : (
                <Search className="h-3 w-3 mr-1" />
              )}
              Carica Grafico
            </Button>
          </div>

          {/* ── Divider ── */}
          <div className="h-px bg-gray-200 dark:bg-violet-500/15" />

          {/* ── Selected Candle ── */}
          {selectedCandle ? (
            <div className="space-y-3">
              <div className="p-3 rounded-lg bg-violet-100/60 dark:bg-violet-500/10 border border-violet-200/50 dark:border-violet-500/20">
                <p className="text-[10px] font-medium text-gray-500 dark:text-gray-400 mb-1">
                  Candela Selezionata
                </p>
                <div className="flex items-baseline gap-2">
                  <span className="text-lg font-bold text-violet-700 dark:text-violet-300 font-mono">
                    ${selectedCandle.price.toFixed(4)}
                  </span>
                  <span className="text-sm text-gray-600 dark:text-gray-400 font-mono">
                    {selectedCandle.time}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">Quantità</Label>
                  <Input
                    type="number"
                    step="1"
                    min="1"
                    placeholder="100"
                    value={qtyInput}
                    onChange={(e) => setQtyInput(e.target.value)}
                    className="h-8 text-sm"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddEsecuzione();
                      }
                    }}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Tipo</Label>
                  <Select value={tipoInput} onValueChange={(v) => setTipoInput(v as TipoEsecuzione)}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {!hasOpeningExec ? (
                        /* Prima esecuzione: solo LONG o SHORT */
                        formData.direzione === 'LONG' ? (
                          <SelectItem value="LONG">LONG</SelectItem>
                        ) : (
                          <SelectItem value="SHORT">SHORT</SelectItem>
                        )
                      ) : (
                        /* Dopo apertura: ADD + SELL/COVER */
                        formData.direzione === 'LONG' ? (
                          <>
                            <SelectItem value="ADD">ADD</SelectItem>
                            <SelectItem value="SELL">SELL</SelectItem>
                          </>
                        ) : (
                          <>
                            <SelectItem value="ADD">ADD</SelectItem>
                            <SelectItem value="COVER">COVER</SelectItem>
                          </>
                        )
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button
                type="button"
                size="sm"
                className="w-full h-8 text-xs bg-violet-600 hover:bg-violet-700 text-white"
                onClick={handleAddEsecuzione}
              >
                <Plus className="h-3 w-3 mr-1" />
                Aggiungi Esecuzione
              </Button>
            </div>
          ) : chartLoaded ? (
            <div className="py-4 text-center">
              <p className="text-xs text-gray-400 dark:text-gray-500">
                Clicca su una candela nel grafico
              </p>
            </div>
          ) : null}

          {/* ── Divider ── */}
          {esecuzioni.length > 0 && (
            <div className="h-px bg-gray-200 dark:bg-violet-500/15" />
          )}

          {/* ── Esecuzioni List ── */}
          {esecuzioni.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                Esecuzioni ({esecuzioni.length})
              </p>
              <div className="space-y-1.5 max-h-[180px] overflow-y-auto">
                {esecuzioni.map((exec) => (
                  <div
                    key={exec.id}
                    className={`flex items-center justify-between p-2 rounded-md border text-xs ${getTipoBg(exec.tipo)}`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={`font-bold ${getTipoColor(exec.tipo)}`}>
                        {exec.tipo}
                      </span>
                      <span className="font-mono text-gray-700 dark:text-gray-300">
                        @{parseFloat(exec.prezzo).toFixed(2)}
                      </span>
                      <span className="text-gray-500">x{exec.quantita}</span>
                      <span className="text-gray-400 font-mono text-[10px]">{exec.ora}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveEsecuzione(exec.id)}
                      className="text-red-400 hover:text-red-600 p-0.5 flex-shrink-0"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Summary ── */}
          {calcoloEsecuzioni && calcoloEsecuzioni.quantita > 0 && (
            <>
              <div className="h-px bg-gray-200 dark:bg-violet-500/15" />
              <div className="p-2.5 rounded-md bg-violet-100/50 dark:bg-violet-900/20 border border-violet-200/40 dark:border-violet-500/15">
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Entrata</span>
                    <p className="font-semibold text-violet-700 dark:text-white font-mono">
                      ${calcoloEsecuzioni.prezzoEntrata.toFixed(4)}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Uscita</span>
                    <p className="font-semibold text-violet-700 dark:text-white font-mono">
                      {calcoloEsecuzioni.prezzoUscita
                        ? `$${calcoloEsecuzioni.prezzoUscita.toFixed(4)}`
                        : '—'}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Quantità</span>
                    <p className="font-semibold text-violet-700 dark:text-white">
                      {calcoloEsecuzioni.quantita}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Orari</span>
                    <p className="font-semibold text-violet-700 dark:text-white font-mono text-[10px]">
                      {calcoloEsecuzioni.oraEntrata || '--:--'} → {calcoloEsecuzioni.oraUscita || '--:--'}
                    </p>
                  </div>
                </div>

                {/* P&L Preview */}
                {pnl !== null && calcoloEsecuzioni.prezzoUscita && (
                  <div className={`mt-2 pt-2 border-t ${pnl >= 0 ? 'border-emerald-500/20' : 'border-red-500/20'}`}>
                    <p className={`text-sm font-bold ${pnl >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                      P&L: {pnl >= 0 ? '+' : ''}{pnl.toFixed(2)}$
                    </p>
                  </div>
                )}
              </div>
            </>
          )}

          {/* ── Divider ── */}
          <div className="h-px bg-gray-200 dark:bg-violet-500/15" />

          {/* ── Strategia ── */}
          <div className="space-y-2">
            <Label className="text-xs">Strategia</Label>
            <Select
              value={formData.strategia_id}
              onValueChange={(v) => handleChange('strategia_id', v)}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Seleziona..." />
              </SelectTrigger>
              <SelectContent>
                {strategie.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {!creandoStrategia ? (
              <button
                type="button"
                onClick={onCreaStrategia}
                className="text-[10px] text-violet-600 dark:text-violet-400 hover:text-violet-800 dark:hover:text-violet-300 font-medium"
              >
                + Crea nuova strategia
              </button>
            ) : (
              <div className="flex items-center gap-1.5">
                <Input
                  type="text"
                  placeholder="Nome..."
                  value={nuovoNomeStrategia}
                  onChange={(e) => setNuovoNomeStrategia(e.target.value)}
                  className="h-7 text-xs flex-grow"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleCreaStrategia();
                    }
                  }}
                  autoFocus
                />
                <Button
                  type="button"
                  size="sm"
                  className="h-7 text-[10px] px-2"
                  onClick={handleCreaStrategia}
                  disabled={isSavingStrategia}
                >
                  {isSavingStrategia ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Crea'}
                </Button>
              </div>
            )}
          </div>

          {/* ── Commissione ── */}
          <div className="space-y-1">
            <Label className="text-xs">Commissione ($)</Label>
            <Input
              type="number"
              step="0.01"
              placeholder="0.00"
              value={formData.commissione}
              onChange={(e) => handleChange('commissione', e.target.value)}
              className="h-8 text-xs"
            />
          </div>

          {/* ── Note ── */}
          <div className="space-y-1">
            <Label className="text-xs">Note</Label>
            <textarea
              className="flex h-16 w-full rounded-md border border-gray-300 dark:border-[#1e1e2e] bg-white dark:bg-[#12121a] px-2 py-1.5 text-xs text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:border-[#7F00FF] focus:outline-none focus:ring-2 focus:ring-[#7F00FF] focus:ring-opacity-50"
              placeholder="Commenti..."
              value={formData.note}
              onChange={(e) => handleChange('note', e.target.value)}
            />
          </div>
        </div>

        {/* ── Footer: Actions ── */}
        <div className="p-4 border-t border-gray-200 dark:border-violet-500/20 space-y-2 bg-white/50 dark:bg-[#12121a]/50">
          <Button
            type="button"
            className="w-full h-9 text-sm bg-violet-600 hover:bg-violet-700 text-white"
            onClick={onSubmit as any}
            disabled={isLoading || esecuzioni.length === 0}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" />
                Salvataggio...
              </>
            ) : (
              'Salva Operazione'
            )}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="w-full h-7 text-xs text-gray-500"
            onClick={onClose}
          >
            Annulla
          </Button>
        </div>
      </div>
    </div>
  );
}
