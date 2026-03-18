'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/utils/supabase/client';
import type { Database } from '@/types/database';
import { toast } from 'sonner';
import { calcolaPnl, calcolaStatoOperazione, calcolaDurataMinuti } from '@/lib/utils';
import type { OperazioneCSV } from '@/lib/csv-parser';

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
  aggiungiOperazioneCSV: (opCSV: OperazioneCSV) => Promise<void>;
  importaOperazioniCSV: (opCSVList: OperazioneCSV[]) => Promise<{ ok: number; errori: number }>;
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

  /**
   * Aggiunge una singola operazione proveniente da un CSV
   * ricalcolando P&L, stato e durata in modo corretto per LONG e SHORT.
   */
  const aggiungiOperazioneCSV = useCallback(
    async (opCSV: OperazioneCSV) => {
      try {
        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) { toast.error('Sessione non trovata'); return; }

        const exitPrice = opCSV.prezzo_uscita;
        const isClosed  = exitPrice !== null && exitPrice > 0;
        const stato     = calcolaStatoOperazione(exitPrice);

        let pnlNetto: number | null = null;
        let pnlPercentuale: number | null = null;
        if (isClosed) {
          const calc = calcolaPnl(
            opCSV.direzione,
            opCSV.prezzo_entrata,
            exitPrice!,
            opCSV.quantita,
            opCSV.commissione,
          );
          pnlNetto       = calc.pnl;
          pnlPercentuale = calc.pnlPercentuale;
        }

        const durataMinuti = calcolaDurataMinuti(
          opCSV.ora_entrata ?? null,
          opCSV.ora_uscita  ?? null,
        );

        const { error } = await (supabase as any).from('operazioni').insert({
          utente_id:       session.user.id,
          data:            opCSV.data,
          ticker:          opCSV.ticker.toUpperCase(),
          direzione:       opCSV.direzione,
          quantita:        opCSV.quantita,
          prezzo_entrata:  opCSV.prezzo_entrata,
          prezzo_uscita:   isClosed ? exitPrice : null,
          commissione:     opCSV.commissione,
          pnl:             pnlNetto,
          pnl_percentuale: pnlPercentuale,
          ora_entrata:     opCSV.ora_entrata  ?? null,
          ora_uscita:      opCSV.ora_uscita   ?? null,
          durata_minuti:   durataMinuti,
          stato,
          note:            opCSV.note ?? null,
        });

        if (error) {
          console.error('CSV import error:', JSON.stringify(error));
          throw error;
        }
      } catch (err) {
        throw err;
      }
    },
    [],
  );

  /**
   * Importa un array di OperazioneCSV in batch.
   * Restituisce { ok, errori } per feedback all'utente.
   */
  const importaOperazioniCSV = useCallback(
    async (opCSVList: OperazioneCSV[]): Promise<{ ok: number; errori: number }> => {
      let ok = 0;
      let errori = 0;
      for (const op of opCSVList) {
        try {
          await aggiungiOperazioneCSV(op);
          ok++;
        } catch {
          errori++;
        }
      }
      await fetchOperazioni();
      return { ok, errori };
    },
    [aggiungiOperazioneCSV, fetchOperazioni],
  );

  return {
    operazioni,
    isLoading,
    errore,
    filtri,
    setFiltri,
    resetFiltri: () => setFiltri({}),
    aggiungiOperazione,
    aggiungiOperazioneCSV,
    importaOperazioniCSV,
    modificaOperazione,
    eliminaOperazione,
  };
}
