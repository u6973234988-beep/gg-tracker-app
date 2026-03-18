'use client';

import { useEffect, useState, useMemo } from 'react';
import { createClient } from '@/utils/supabase/client';
import type { Database } from '@/types/database';
import { calcolaPnl } from '@/lib/utils';

type VistaMetricheUtente = Database['public']['Views']['vista_metriche_utente']['Row'];
type VistaPerformanceStrategia = Database['public']['Views']['vista_performance_strategia']['Row'];
type VistaEquityGiornaliera = Database['public']['Views']['vista_equity_giornaliera']['Row'];
type Operazione = Database['public']['Tables']['operazioni']['Row'];
type Strategia = Database['public']['Tables']['strategie']['Row'];

export interface OperazioneRecente {
  operazione: Operazione;
  strategia: Strategia | null;
}

export interface MetricheDerivate {
  winRate: number;              // % operazioni vincenti (chiuse)
  avgWin: number;               // P&L medio delle vincenti
  avgLoss: number;              // P&L medio delle perdenti (valore assoluto)
  profitFactor: number;         // sumWin / sumLoss
  maxWin: number;               // trade migliore
  maxLoss: number;              // trade peggiore (valore assoluto)
  avgRR: number | null;         // R/R medio (solo se SL presente)
  totalCommissioni: number;     // costo totale commissioni
  operazioniChiuse: number;     // numero operazioni chiuse
  operazioniAperte: number;     // numero operazioni aperte
}

export interface DashboardData {
  metriche: VistaMetricheUtente | null;
  metricheDerivate: MetricheDerivate | null;
  performanceStrategie: VistaPerformanceStrategia[];
  equityData: VistaEquityGiornaliera[];
  operazioniRecenti: OperazioneRecente[];
  isLoading: boolean;
  errore: string | null;
}

export function useDashboardData(): DashboardData {
  const [metriche, setMetriche] = useState<VistaMetricheUtente | null>(null);
  const [performanceStrategie, setPerformanceStrategie] = useState<VistaPerformanceStrategia[]>([]);
  const [equityData, setEquityData] = useState<VistaEquityGiornaliera[]>([]);
  const [operazioniRecenti, setOperazioniRecenti] = useState<OperazioneRecente[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errore, setErrore] = useState<string | null>(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setIsLoading(true);
        setErrore(null);

        const supabase = createClient();

        // Get current user session
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
          // Filter to only strategies belonging to this user
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

        // Fetch equity data
        const { data: equityDataFetch, error: equityError } = await (supabase as any)
          .from('vista_equity_giornaliera')
          .select('*')
          .eq('utente_id', userId)
          .order('data', { ascending: true });

        if (equityError) {
          console.error('Errore nel caricamento equity data:', equityError);
        } else {
          setEquityData(equityDataFetch || []);
        }

        // Fetch recent operazioni (last 10) with strategia info
        const { data: operazioniData, error: operazioniError } = await (supabase as any)
          .from('operazioni')
          .select('*')
          .eq('utente_id', userId)
          .order('data', { ascending: false })
          .limit(10);

        if (operazioniError) {
          console.error('Errore nel caricamento operazioni:', operazioniError);
          setOperazioniRecenti([]);
        } else {
          // Fetch strategia info for each operazione
          const operazioniConStrategia: OperazioneRecente[] = [];

          for (const op of operazioniData || []) {
            let strategia: Strategia | null = null;

            if ((op as any).strategia_id) {
              const { data: stratData } = await (supabase as any)
                .from('strategie')
                .select('*')
                .eq('id', (op as any).strategia_id)
                .single();

              strategia = stratData || null;
            }

            operazioniConStrategia.push({
              operazione: op as any,
              strategia,
            });
          }

          setOperazioniRecenti(operazioniConStrategia);
        }
      } catch (error) {
        console.error('Errore nel caricamento dati dashboard:', error);
        setErrore('Errore nel caricamento dei dati');
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  // Calcola metriche derivate lato client a partire dalle operazioni recenti
  const metricheDerivate = useMemo<MetricheDerivate | null>(() => {
    const ops = operazioniRecenti.map((r) => r.operazione);
    if (ops.length === 0) return null;

    const chiuse = ops.filter(
      (op) => op.stato === 'chiusa' && op.prezzo_uscita != null && op.prezzo_uscita > 0,
    );
    const aperte = ops.filter((op) => op.stato === 'aperta');

    if (chiuse.length === 0) return null;

    const pnlList = chiuse.map((op) => {
      // Usa il P&L già salvato nel DB se disponibile, altrimenti ricalcola
      if (op.pnl != null) return op.pnl;
      const calc = calcolaPnl(
        (op.direzione as 'LONG' | 'SHORT') ?? 'LONG',
        op.prezzo_entrata,
        op.prezzo_uscita!,
        op.quantita,
        op.commissione ?? 0,
      );
      return calc.pnl;
    });

    const vincenti = pnlList.filter((p) => p > 0);
    const perdenti = pnlList.filter((p) => p < 0);

    const sumWin  = vincenti.reduce((s, v) => s + v, 0);
    const sumLoss = Math.abs(perdenti.reduce((s, v) => s + v, 0));

    const avgRRList = chiuse
      .map((op) => {
        if (!op.stop_loss || !op.prezzo_uscita) return null;
        const calc = calcolaPnl(
          (op.direzione as 'LONG' | 'SHORT') ?? 'LONG',
          op.prezzo_entrata,
          op.prezzo_uscita,
          op.quantita,
          op.commissione ?? 0,
          op.stop_loss,
        );
        return calc.rr;
      })
      .filter((r): r is number => r !== null);

    return {
      winRate: (vincenti.length / chiuse.length) * 100,
      avgWin: vincenti.length > 0 ? sumWin / vincenti.length : 0,
      avgLoss: perdenti.length > 0 ? sumLoss / perdenti.length : 0,
      profitFactor: sumLoss > 0 ? sumWin / sumLoss : sumWin > 0 ? Infinity : 0,
      maxWin: vincenti.length > 0 ? Math.max(...vincenti) : 0,
      maxLoss: perdenti.length > 0 ? Math.max(...perdenti.map(Math.abs)) : 0,
      avgRR: avgRRList.length > 0 ? avgRRList.reduce((s, v) => s + v, 0) / avgRRList.length : null,
      totalCommissioni: chiuse.reduce((s, op) => s + (op.commissione ?? 0), 0),
      operazioniChiuse: chiuse.length,
      operazioniAperte: aperte.length,
    };
  }, [operazioniRecenti]);

  return {
    metriche,
    metricheDerivate,
    performanceStrategie,
    equityData,
    operazioniRecenti,
    isLoading,
    errore,
  };
}
