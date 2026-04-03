'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/utils/supabase/client';
import type { Database } from '@/types/database';
import { toast } from 'sonner';

type Operazione = Database['public']['Tables']['operazioni']['Row'];
type Strategia = Database['public']['Tables']['strategie']['Row'];

export interface EsecuzioneRow {
  id: string;
  operazione_id: string;
  ora: string | null;
  prezzo: number;
  quantita: number;
  tipo: string;
  creato_il: string;
}

export interface OperazioneConDettagli extends Operazione {
  strategia?: Strategia | null;
  tags?: any[];
  esecuzioni?: EsecuzioneRow[];
}

export interface FiltriOperazioni {
  dataInizio?: string;
  dataFine?: string;
  ticker?: string;
  strategiaId?: string;
  direzione?: 'LONG' | 'SHORT';
}

export interface EsecuzionePayload {
  ora?: string;
  prezzo: number;
  quantita: number;
  tipo: string;
}

export interface UseOperazioniReturn {
  operazioni: OperazioneConDettagli[];
  isLoading: boolean;
  errore: string | null;
  filtri: FiltriOperazioni;
  setFiltri: (filtri: FiltriOperazioni) => void;
  resetFiltri: () => void;
  aggiungiOperazione: (
    operazione: Database['public']['Tables']['operazioni']['Insert'],
    esecuzioni?: EsecuzionePayload[]
  ) => Promise<void>;
  importaOperazioniCSV: (operazioni: Database['public']['Tables']['operazioni']['Insert'][]) => Promise<{ importati: number; duplicati: number }>;
  modificaOperazione: (
    id: string,
    updates: Database['public']['Tables']['operazioni']['Update'],
    esecuzioni?: EsecuzionePayload[]
  ) => Promise<void>;
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
          operazioni_tag(tag_id, tag:tag_id(id, nome, colore)),
          esecuzioni(id, operazione_id, ora, prezzo, quantita, tipo, creato_il)
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
          esecuzioni: op.esecuzioni || [],
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
    async (
      operazione: Database['public']['Tables']['operazioni']['Insert'],
      esecuzioni?: EsecuzionePayload[]
    ) => {
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

        // Insert operazione and get back the ID
        const { data: insertedOp, error } = await (supabase as any)
          .from('operazioni')
          .insert({
            ...operazione,
            utente_id: session.user.id,
          })
          .select('id')
          .single();

        if (error) {
          toast.error('Errore nell\'aggiunta dell\'operazione');
          console.error('Supabase error:', JSON.stringify(error, null, 2));
        } else {
          // Insert esecuzioni if present
          if (esecuzioni && esecuzioni.length > 0 && insertedOp?.id) {
            const esecuzioniData = esecuzioni.map((e) => ({
              operazione_id: insertedOp.id,
              ora: e.ora || null,
              prezzo: e.prezzo,
              quantita: e.quantita,
              tipo: e.tipo,
            }));

            const { error: esError } = await (supabase as any)
              .from('esecuzioni')
              .insert(esecuzioniData);

            if (esError) {
              console.error('Errore inserimento esecuzioni:', JSON.stringify(esError, null, 2));
              toast.warning('Operazione salvata, ma errore nelle esecuzioni');
            }
          }

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

  const importaOperazioniCSV = useCallback(
    async (operazioniCSV: Database['public']['Tables']['operazioni']['Insert'][]): Promise<{ importati: number; duplicati: number }> => {
      const supabase = createClient();

      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session) {
        toast.error('Sessione non trovata');
        return { importati: 0, duplicati: 0 };
      }

      const userId = session.user.id;

      // Recupera operazioni esistenti dell'utente per check duplicati
      const { data: esistenti } = await (supabase as any)
        .from('operazioni')
        .select('ticker, data, direzione, quantita, prezzo_entrata')
        .eq('utente_id', userId);

      const esistentiSet = new Set(
        (esistenti || []).map((op: any) =>
          `${op.ticker}|${op.data}|${op.direzione}|${op.quantita}|${op.prezzo_entrata}`
        )
      );

      const nuove: Database['public']['Tables']['operazioni']['Insert'][] = [];
      let duplicati = 0;

      for (const op of operazioniCSV) {
        const chiave = `${op.ticker}|${op.data}|${op.direzione}|${op.quantita}|${op.prezzo_entrata}`;
        if (esistentiSet.has(chiave)) {
          duplicati++;
        } else {
          nuove.push({ ...op, utente_id: userId });
          esistentiSet.add(chiave); // Evita duplicati anche dentro lo stesso batch
        }
      }

      if (nuove.length > 0) {
        const { error } = await (supabase as any)
          .from('operazioni')
          .insert(nuove);

        if (error) {
          toast.error('Errore nell\'importazione');
          console.error('Supabase error:', JSON.stringify(error, null, 2));
          return { importati: 0, duplicati };
        }
      }

      if (duplicati > 0) {
        toast.info(`${nuove.length} operazioni importate, ${duplicati} duplicati saltati`);
      } else {
        toast.success(`${nuove.length} operazioni importate con successo`);
      }

      await fetchOperazioni();
      return { importati: nuove.length, duplicati };
    },
    [fetchOperazioni]
  );

  const modificaOperazione = useCallback(
    async (
      id: string,
      updates: Database['public']['Tables']['operazioni']['Update'],
      esecuzioni?: EsecuzionePayload[]
    ) => {
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
          // Replace esecuzioni if provided
          if (esecuzioni && esecuzioni.length > 0) {
            // Delete old esecuzioni
            await (supabase as any)
              .from('esecuzioni')
              .delete()
              .eq('operazione_id', id);

            // Insert new
            const esecuzioniData = esecuzioni.map((e) => ({
              operazione_id: id,
              ora: e.ora || null,
              prezzo: e.prezzo,
              quantita: e.quantita,
              tipo: e.tipo,
            }));

            const { error: esError } = await (supabase as any)
              .from('esecuzioni')
              .insert(esecuzioniData);

            if (esError) {
              console.error('Errore aggiornamento esecuzioni:', JSON.stringify(esError, null, 2));
            }
          }

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
    importaOperazioniCSV,
    modificaOperazione,
    eliminaOperazione,
  };
}
