'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { createClient } from '@/utils/supabase/client';
import type { Database } from '@/types/database';

type VistaMetricheUtente = Database['public']['Views']['vista_metriche_utente']['Row'];
type VistaPerformanceStrategia = Database['public']['Views']['vista_performance_strategia']['Row'];
type VistaEquityGiornaliera = Database['public']['Views']['vista_equity_giornaliera']['Row'];
type Operazione = Database['public']['Tables']['operazioni']['Row'];
type Strategia = Database['public']['Tables']['strategie']['Row'];

export interface OperazioneRecente {
  operazione: Operazione;
  strategia: Strategia | null;
}

export interface DateRange {
  from: string | null;
  to: string | null;
}

/** A single data point for the strategy equity comparison chart */
export interface StrategyEquityPoint {
  data: string; // ISO date
  [strategiaKey: string]: number | string; // dynamic keys: "strategy_<id>" = cumulative pnl
}

/** Metadata about each strategy line in the chart */
export interface StrategyLineInfo {
  key: string;     // "strategy_<id>"
  nome: string;    // display name
  colore: string;  // hex color
}

export interface DashboardData {
  metriche: VistaMetricheUtente | null;
  performanceStrategie: VistaPerformanceStrategia[];
  equityData: VistaEquityGiornaliera[];
  operazioniRecenti: OperazioneRecente[];
  totaleCommissioni: number;
  strategyEquityData: StrategyEquityPoint[];
  strategyLines: StrategyLineInfo[];
  isLoading: boolean;
  errore: string | null;
  dateRange: DateRange;
  setDateRange: (range: DateRange) => void;
}

// Palette of distinguishable colors for strategy lines
const STRATEGY_COLORS = [
  '#8b5cf6', // violet
  '#06b6d4', // cyan
  '#f59e0b', // amber
  '#ef4444', // red
  '#10b981', // emerald
  '#ec4899', // pink
  '#3b82f6', // blue
  '#f97316', // orange
];

export function useDashboardData(): DashboardData {
  const [metriche, setMetriche] = useState<VistaMetricheUtente | null>(null);
  const [performanceStrategie, setPerformanceStrategie] = useState<VistaPerformanceStrategia[]>([]);
  const [equityData, setEquityData] = useState<VistaEquityGiornaliera[]>([]);
  const [operazioniRecenti, setOperazioniRecenti] = useState<OperazioneRecente[]>([]);
  const [totaleCommissioni, setTotaleCommissioni] = useState<number>(0);
  const [rawClosedOps, setRawClosedOps] = useState<Operazione[]>([]);
  const [strategieMap, setStrategieMap] = useState<Record<string, Strategia>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [errore, setErrore] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<DateRange>({ from: null, to: null });

  // Compute strategy equity curves from raw operations (client-side aggregation)
  const { strategyEquityData, strategyLines } = useMemo(() => {
    if (rawClosedOps.length === 0) {
      return { strategyEquityData: [], strategyLines: [] };
    }

    // Group operations by strategy
    const byStrategy = new Map<string, { nome: string; colore: string; ops: Operazione[] }>();

    for (const op of rawClosedOps) {
      const sid = op.strategia_id || '__nessuna__';
      if (!byStrategy.has(sid)) {
        const strat = op.strategia_id ? strategieMap[op.strategia_id] : null;
        byStrategy.set(sid, {
          nome: strat?.nome || 'Senza Strategia',
          colore: strat?.colore || '#8b5cf6',
          ops: [],
        });
      }
      byStrategy.get(sid)!.ops.push(op);
    }

    // Only include strategies that have at least 2 trades (a line needs at least 2 points)
    const validStrategies = Array.from(byStrategy.entries()).filter(
      ([, v]) => v.ops.length >= 2
    );

    if (validStrategies.length === 0) {
      return { strategyEquityData: [], strategyLines: [] };
    }

    // Build line metadata
    const lines: StrategyLineInfo[] = validStrategies.map(([sid, info], idx) => ({
      key: `s_${sid.substring(0, 8)}`,
      nome: info.nome,
      colore: STRATEGY_COLORS[idx % STRATEGY_COLORS.length],
    }));

    // For each strategy, compute cumulative P&L by date
    // Then merge all into a single array of data points keyed by date

    // Collect all unique dates
    const allDates = new Set<string>();
    const strategyCumByDate = new Map<string, Map<string, number>>();

    for (const [sid, info] of validStrategies) {
      const key = `s_${sid.substring(0, 8)}`;
      // Sort ops by date
      const sorted = [...info.ops].sort(
        (a, b) => new Date(a.data).getTime() - new Date(b.data).getTime()
      );

      // Aggregate daily PnL
      const dailyPnl = new Map<string, number>();
      for (const op of sorted) {
        const d = op.data; // already ISO string yyyy-mm-dd
        dailyPnl.set(d, (dailyPnl.get(d) || 0) + (op.pnl || 0));
        allDates.add(d);
      }

      // Compute cumulative
      const cumMap = new Map<string, number>();
      const sortedDates = Array.from(dailyPnl.keys()).sort();
      let cumulative = 0;
      for (const d of sortedDates) {
        cumulative += dailyPnl.get(d)!;
        cumMap.set(d, cumulative);
      }

      strategyCumByDate.set(key, cumMap);
    }

    // Sort all dates
    const sortedAllDates = Array.from(allDates).sort();

    // Build merged data points, forward-filling missing values
    const dataPoints: StrategyEquityPoint[] = [];
    const lastValues: Record<string, number> = {};

    for (const key of lines.map((l) => l.key)) {
      lastValues[key] = 0;
    }

    for (const date of sortedAllDates) {
      const point: StrategyEquityPoint = { data: date };

      for (const line of lines) {
        const cumMap = strategyCumByDate.get(line.key);
        if (cumMap && cumMap.has(date)) {
          lastValues[line.key] = cumMap.get(date)!;
        }
        point[line.key] = lastValues[line.key];
      }

      dataPoints.push(point);
    }

    return { strategyEquityData: dataPoints, strategyLines: lines };
  }, [rawClosedOps, strategieMap]);

  const fetchDashboardData = useCallback(async () => {
    try {
      setIsLoading(true);
      setErrore(null);

      const supabase = createClient();

      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session) {
        setErrore('Sessione non trovata');
        setIsLoading(false);
        return;
      }

      const userId = session.user.id;

      // Fetch metrics
      const { data: metricheData, error: metricheError } = await (supabase as any)
        .from('vista_metriche_utente')
        .select('*')
        .eq('utente_id', userId)
        .maybeSingle();

      if (metricheError) {
        console.error('Errore nel caricamento metriche:', metricheError);
      }
      setMetriche(metricheData || null);

      // Fetch performance per strategia
      const { data: performanceData, error: performanceError } = await (supabase as any)
        .from('vista_performance_strategia')
        .select('*')
        .eq('utente_id', userId)
        .order('pnl_totale', { ascending: false });

      if (performanceError) {
        console.error('Errore nel caricamento performance strategia:', performanceError);
      } else {
        const { data: strategieData } = await (supabase as any)
          .from('strategie')
          .select('id')
          .eq('utente_id', userId);

        const strategieIds = strategieData?.map((s: any) => s.id) || [];
        const filteredPerformance = (performanceData || []).filter((p: any) =>
          p.strategia_id === null || strategieIds.includes(p.strategia_id)
        );
        setPerformanceStrategie(filteredPerformance);
      }

      // Fetch equity data with date filtering
      let equityQuery = (supabase as any)
        .from('vista_equity_giornaliera')
        .select('*')
        .eq('utente_id', userId);

      if (dateRange.from) equityQuery = equityQuery.gte('data', dateRange.from);
      if (dateRange.to) equityQuery = equityQuery.lte('data', dateRange.to);

      const { data: equityDataFetch, error: equityError } = await equityQuery
        .order('data', { ascending: true });

      if (equityError) {
        console.error('Errore nel caricamento equity data:', equityError);
      } else {
        setEquityData(equityDataFetch || []);
      }

      // Fetch ALL closed operazioni
      let operazioniQuery = (supabase as any)
        .from('operazioni')
        .select('*')
        .eq('utente_id', userId)
        .eq('stato', 'chiusa');

      if (dateRange.from) operazioniQuery = operazioniQuery.gte('data', dateRange.from);
      if (dateRange.to) operazioniQuery = operazioniQuery.lte('data', dateRange.to);

      const { data: operazioniData, error: operazioniError } = await operazioniQuery
        .order('data', { ascending: false });

      if (operazioniError) {
        console.error('Errore nel caricamento operazioni:', operazioniError);
        setOperazioniRecenti([]);
        setRawClosedOps([]);
        setTotaleCommissioni(0);
      } else {
        let commissioni = 0;
        const operazioniConStrategia: OperazioneRecente[] = [];

        const strategyIds = new Set<string>();
        for (const op of operazioniData || []) {
          if ((op as any).strategia_id) strategyIds.add((op as any).strategia_id);
          commissioni += (op as any).commissione || 0;
        }

        // Fetch all relevant strategies in one query
        const newStrategieMap: Record<string, Strategia> = {};
        if (strategyIds.size > 0) {
          const { data: stratData } = await (supabase as any)
            .from('strategie')
            .select('*')
            .in('id', Array.from(strategyIds));

          if (stratData) {
            for (const s of stratData) {
              newStrategieMap[s.id] = s;
            }
          }
        }

        setStrategieMap(newStrategieMap);

        for (const op of operazioniData || []) {
          const strategia = (op as any).strategia_id
            ? newStrategieMap[(op as any).strategia_id] || null
            : null;
          operazioniConStrategia.push({ operazione: op as any, strategia });
        }

        // Also fetch commissions from open operations if no date filter
        if (!dateRange.from && !dateRange.to) {
          const { data: openOps } = await (supabase as any)
            .from('operazioni')
            .select('commissione')
            .eq('utente_id', userId)
            .neq('stato', 'chiusa');

          if (openOps) {
            for (const op of openOps) {
              commissioni += (op as any).commissione || 0;
            }
          }
        }

        setTotaleCommissioni(commissioni);
        setOperazioniRecenti(operazioniConStrategia);
        setRawClosedOps((operazioniData || []) as Operazione[]);
      }
    } catch (error) {
      console.error('Errore nel caricamento dati dashboard:', error);
      setErrore('Errore nel caricamento dei dati');
    } finally {
      setIsLoading(false);
    }
  }, [dateRange]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  return {
    metriche,
    performanceStrategie,
    equityData,
    operazioniRecenti,
    totaleCommissioni,
    strategyEquityData,
    strategyLines,
    isLoading,
    errore,
    dateRange,
    setDateRange,
  };
}
