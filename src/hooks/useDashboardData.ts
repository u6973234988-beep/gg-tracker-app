'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import type { Database } from '@/types/database';

type VistaMetricheUtente = Database['public']['Views']['vista_metriche_utente']['Row'];
type VistaPerformanceStrategia = Database['public']['Views']['vista_performance_strategia']['Row'];
type VistaEquityGiornaliera = Database['public']['Views']['vista_equity_giornaliera']['Row'];
type Operazione = Database['public']['Tables']['operazione']['Row'];
type Strategia = Database['public']['Tables']['strategia']['Row'];

export interface OperazioneRecente {
  operazione: Operazione;
  strategia: Strategia | null;
}

export interface DashboardData {
  metriche: VistaMetricheUtente | null;
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
          .eq('profilo_id', userId)
          .single();

        if (metricheError && metricheError.code !== 'PGRST116') {
          console.error('Errore nel caricamento metriche:', metricheError);
        }

        setMetriche(metricheData || null);

        // Fetch performance per strategia
        const { data: performanceData, error: performanceError } = await (supabase as any)
          .from('vista_performance_strategia')
          .select('*')
          .eq('strategia_id', userId)
          .order('net_pnl', { ascending: false });

        if (performanceError) {
          console.error('Errore nel caricamento performance strategia:', performanceError);
        } else {
          // Filter to only strategies belonging to this user
          const { data: strategieData } = await (supabase as any)
            .from('strategia')
            .select('id')
            .eq('profilo_id', userId);

          const strategieIds = strategieData?.map((s: any) => s.id) || [];
          const filteredPerformance = (performanceData || []).filter((p: any) =>
            strategieIds.includes(p.strategia_id)
          );
          setPerformanceStrategie(filteredPerformance);
        }

        // Fetch equity data
        const { data: equityDataFetch, error: equityError } = await (supabase as any)
          .from('vista_equity_giornaliera')
          .select('*')
          .eq('profilo_id', userId)
          .order('data', { ascending: true });

        if (equityError) {
          console.error('Errore nel caricamento equity data:', equityError);
        } else {
          setEquityData(equityDataFetch || []);
        }

        // Fetch recent operazioni (last 10) with strategia info
        const { data: operazioniData, error: operazioniError } = await (supabase as any)
          .from('operazione')
          .select('*')
          .eq('profilo_id', userId)
          .order('data_apertura', { ascending: false })
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
                .from('strategia')
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

  return {
    metriche,
    performanceStrategie,
    equityData,
    operazioniRecenti,
    isLoading,
    errore,
  };
}
