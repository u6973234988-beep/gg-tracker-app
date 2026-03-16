'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/utils/supabase/client';
import type { Database } from '@/types/database';
import { toast } from 'sonner';

type Operazione = Database['public']['Tables']['operazioni']['Row'];
type Strategia = Database['public']['Tables']['strategie']['Row'];

export interface OperazioneConDettagli extends Operazione {
  strategia?: Strategia | null;
  tags?: any[];
}

export interface FiltriOperazioni {
  dataInizio?: string;
  dataFine?: string;
  ticker?: string;
  strategiaId?: string;
  direzione?: 'LONG' | 'SHORT';
}

export interface UseOperazioniReturn {
  operazioni: OperazioneConDettagli[];
  isLoading: boolean;
  errore: string | null;
  filtri: FiltriOperazioni;
  setFiltri: (filtri: FiltriOperazioni) => void;
  resetFiltri: () => void;
  aggiungiOperazione: (operazione: Database['public']['Tables']['operazioni']['Insert']) => Promise<void>;
  modificaOperazione: (id: string, updates: Database['public']['Tables']['operazioni']['Update']) => Promise<void>;
  eliminaOperazione: (id: string) => Promise<void>;
}

export function useOperazioni(): UseOperazioniReturn {
  const [operazioni, setOperazioni] = useState<OperazioneConDettagli[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errore, setErrore] = useState<string | null>(null);
  const [filtri, setFiltri] = useState<FiltriOperazioni>({});

  const fetchOperazioni = useCallback(async () => {
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

      // Build query
      let query = (supabase as any)
        .from('operazioni')
        .select(
          `
          *,
          strategia:strategia_id(id, nome, colore),
          operazioni_tag(tag_id, tag:tag_id(id, nome, colore))
        `
        )
        .eq('utente_id', userId)
        .order('data', { ascending: false });

      // Apply filters
      if (filtri.ticker) {
        query = query.ilike('ticker', `%${filtri.ticker.toUpperCase()}%`);
      }

      if (filtri.strategiaId) {
        query = query.eq('strategia_id', filtri.strategiaId);
      }

      if (filtri.direzione) {
        query = query.eq('direzione', filtri.direzione);
      }

      if (filtri.dataInizio) {
        query = query.gte('data', filtri.dataInizio);
      }

      if (filtri.dataFine) {
        query = query.lte('data', filtri.dataFine);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Errore nel caricamento operazioni:', error);
        setErrore('Errore nel caricamento delle operazioni');
        setOperazioni([]);
      } else {
        const operazioniConDettagli = (data || []).map((op: any) => ({
          ...op,
          strategia: op.strategia || null,
          tags: op.operazioni_tag ? op.operazioni_tag.map((ot: any) => ot.tag) : [],
        }));
        setOperazioni(operazioniConDettagli);
      }
    } catch (error) {
      console.error('Errore nel caricamento operazioni:', error);
      setErrore('Errore sconosciuto');
    } finally {
      setIsLoading(false);
    }
  }, [filtri]);

  useEffect(() => {
    fetchOperazioni();
  }, [fetchOperazioni]);

  const aggiungiOperazione = useCallback(
    async (operazione: Database['public']['Tables']['operazioni']['Insert']) => {
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

        const { error } = await (supabase as any)
          .from('operazioni')
          .insert({
            ...operazione,
            utente_id: session.user.id,
          });

        if (error) {
          toast.error('Errore nell\'aggiunta dell\'operazione');
          console.error('Supabase error:', JSON.stringify(error, null, 2));
        } else {
          toast.success('Operazione aggiunta con successo');
          await fetchOperazioni();
        }
      } catch (error) {
        toast.error('Errore sconosciuto');
        console.error(error);
      }
    },
    [fetchOperazioni]
  );

  const modificaOperazione = useCallback(
    async (id: string, updates: Database['public']['Tables']['operazioni']['Update']) => {
      try {
        const supabase = createClient();

        const { error } = await (supabase as any)
          .from('operazioni')
          .update(updates)
          .eq('id', id);

        if (error) {
          toast.error('Errore nella modifica dell\'operazione');
          console.error('Supabase error:', JSON.stringify(error, null, 2));
        } else {
          toast.success('Operazione modificata con successo');
          await fetchOperazioni();
        }
      } catch (error) {
        toast.error('Errore sconosciuto');
        console.error(error);
      }
    },
    [fetchOperazioni]
  );

  const eliminaOperazione = useCallback(
    async (id: string) => {
      try {
        const supabase = createClient();

        const { error } = await (supabase as any)
          .from('operazioni')
          .delete()
          .eq('id', id);

        if (error) {
          toast.error('Errore nell\'eliminazione dell\'operazione');
          console.error('Supabase error:', JSON.stringify(error, null, 2));
        } else {
          toast.success('Operazione eliminata con successo');
          await fetchOperazioni();
        }
      } catch (error) {
        toast.error('Errore sconosciuto');
        console.error(error);
      }
    },
    [fetchOperazioni]
  );

  return {
    operazioni,
    isLoading,
    errore,
    filtri,
    setFiltri,
    resetFiltri: () => setFiltri({}),
    aggiungiOperazione,
    modificaOperazione,
    eliminaOperazione,
  };
}
