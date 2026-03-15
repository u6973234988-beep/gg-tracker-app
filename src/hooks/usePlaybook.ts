'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/utils/supabase/client';
import type { Database } from '@/types/database';
import { toast } from 'sonner';

type Strategia = Database['public']['Tables']['strategia']['Row'];
type RegolaStrategia = Database['public']['Tables']['regola_strategia']['Row'];

export interface StrategiaConDettagli extends Strategia {
  regole?: RegolaStrategia[];
  operazioniCount?: number;
  winRate?: number;
  profitFactor?: number;
}

export interface UsePlaybookReturn {
  strategie: StrategiaConDettagli[];
  isLoading: boolean;
  errore: string | null;
  creaStrategia: (
    strategia: Database['public']['Tables']['strategia']['Insert']
  ) => Promise<void>;
  modificaStrategia: (
    id: string,
    updates: Database['public']['Tables']['strategia']['Update']
  ) => Promise<void>;
  eliminaStrategia: (id: string) => Promise<void>;
  aggiungiRegola: (
    strategiaId: string,
    regola: Database['public']['Tables']['regola_strategia']['Insert']
  ) => Promise<void>;
  eliminaRegola: (regolaId: string) => Promise<void>;
}

export function usePlaybook(): UsePlaybookReturn {
  const [strategie, setStrategie] = useState<StrategiaConDettagli[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errore, setErrore] = useState<string | null>(null);

  const fetchStrategie = useCallback(async () => {
    try {
      setIsLoading(true);
      setErrore(null);

      const supabase = createClient();

      // Get current user
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

      // Fetch strategies with rules
      const { data: strategieData, error: strategieError } = await (supabase as any)
        .from('strategia')
        .select(
          `
          *,
          regole_strategia:regola_strategia(*)
        `
        )
        .eq('profilo_id', userId)
        .order('created_at', { ascending: false });

      if (strategieError) {
        console.error('Errore nel caricamento strategie:', strategieError);
        setErrore('Errore nel caricamento delle strategie');
        setStrategie([]);
      } else {
        // Fetch operazioni count and win rate for each strategy
        const strategieConDettagli = await Promise.all(
          (strategieData || []).map(async (strat: any) => {
            const { data: operazioni } = await (supabase as any)
              .from('operazione')
              .select('pnl, stato')
              .eq('strategia_id', strat.id)
              .eq('stato', 'CHIUSA');

            const opCount = operazioni?.length || 0;
            const winningOps = operazioni?.filter((op: any) => (op.pnl || 0) > 0).length || 0;
            const totalPnlWins = operazioni
              ?.filter((op: any) => (op.pnl || 0) > 0)
              .reduce((sum: number, op: any) => sum + (op.pnl || 0), 0) || 0;
            const totalPnlLosses = Math.abs(
              operazioni
                ?.filter((op: any) => (op.pnl || 0) < 0)
                .reduce((sum: number, op: any) => sum + (op.pnl || 0), 0) || 0
            );

            return {
              ...strat,
              operazioniCount: opCount,
              winRate: opCount > 0 ? (winningOps / opCount) * 100 : 0,
              profitFactor:
                totalPnlLosses > 0 ? totalPnlWins / totalPnlLosses : totalPnlWins > 0 ? 999 : 0,
              regole: strat.regola_strategia || [],
            };
          })
        );

        setStrategie(strategieConDettagli);
      }
    } catch (error) {
      console.error('Errore nel caricamento strategie:', error);
      setErrore('Errore sconosciuto');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStrategie();
  }, [fetchStrategie]);

  const creaStrategia = useCallback(
    async (strategia: Database['public']['Tables']['strategia']['Insert']) => {
      try {
        const supabase = createClient();

        // Get current user
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError || !session) {
          toast.error('Sessione non trovata');
          return;
        }

        const { error } = await (supabase as any).from('strategia').insert({
          ...strategia,
          profilo_id: session.user.id,
        });

        if (error) {
          toast.error('Errore nella creazione della strategia');
          console.error(error);
        } else {
          toast.success('Strategia creata con successo');
          await fetchStrategie();
        }
      } catch (error) {
        toast.error('Errore sconosciuto');
        console.error(error);
      }
    },
    [fetchStrategie]
  );

  const modificaStrategia = useCallback(
    async (id: string, updates: Database['public']['Tables']['strategia']['Update']) => {
      try {
        const supabase = createClient();

        const { error } = await (supabase as any)
          .from('strategia')
          .update(updates)
          .eq('id', id);

        if (error) {
          toast.error('Errore nella modifica della strategia');
          console.error(error);
        } else {
          toast.success('Strategia modificata con successo');
          await fetchStrategie();
        }
      } catch (error) {
        toast.error('Errore sconosciuto');
        console.error(error);
      }
    },
    [fetchStrategie]
  );

  const eliminaStrategia = useCallback(
    async (id: string) => {
      try {
        const supabase = createClient();

        const { error } = await (supabase as any)
          .from('strategia')
          .delete()
          .eq('id', id);

        if (error) {
          toast.error('Errore nell\'eliminazione della strategia');
          console.error(error);
        } else {
          toast.success('Strategia eliminata con successo');
          await fetchStrategie();
        }
      } catch (error) {
        toast.error('Errore sconosciuto');
        console.error(error);
      }
    },
    [fetchStrategie]
  );

  const aggiungiRegola = useCallback(
    async (strategiaId: string, regola: Database['public']['Tables']['regola_strategia']['Insert']) => {
      try {
        const supabase = createClient();

        const { error } = await (supabase as any).from('regola_strategia').insert({
          ...regola,
          strategia_id: strategiaId,
        });

        if (error) {
          toast.error('Errore nell\'aggiunta della regola');
          console.error(error);
        } else {
          toast.success('Regola aggiunta con successo');
          await fetchStrategie();
        }
      } catch (error) {
        toast.error('Errore sconosciuto');
        console.error(error);
      }
    },
    [fetchStrategie]
  );

  const eliminaRegola = useCallback(
    async (regolaId: string) => {
      try {
        const supabase = createClient();

        const { error } = await (supabase as any)
          .from('regola_strategia')
          .delete()
          .eq('id', regolaId);

        if (error) {
          toast.error('Errore nell\'eliminazione della regola');
          console.error(error);
        } else {
          toast.success('Regola eliminata con successo');
          await fetchStrategie();
        }
      } catch (error) {
        toast.error('Errore sconosciuto');
        console.error(error);
      }
    },
    [fetchStrategie]
  );

  return {
    strategie,
    isLoading,
    errore,
    creaStrategia,
    modificaStrategia,
    eliminaStrategia,
    aggiungiRegola,
    eliminaRegola,
  };
}
