'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/utils/supabase/client';
import type { Database } from '@/types/database';
import { toast } from 'sonner';
import { parseCSV } from '@/lib/csv-parser';

type Profilo = Database['public']['Tables']['profili']['Row'];
type ProfiloUpdate = Database['public']['Tables']['profili']['Update'];
type Operazione = Database['public']['Tables']['operazioni']['Insert'];

export interface UseImpostazioniReturn {
  profilo: Profilo | null;
  isLoading: boolean;
  isSaving: boolean;
  aggiornaProfilo: (data: ProfiloUpdate) => Promise<void>;
  importaCSV: (csvContent: string, brokerType: string) => Promise<number>;
  esportaCSV: () => Promise<string>;
  eliminaTuttiDati: () => Promise<void>;
  logout: () => Promise<void>;
}

export function useImpostazioni(): UseImpostazioniReturn {
  const [profilo, setProfilo] = useState<Profilo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const fetchProfilo = useCallback(async () => {
    try {
      setIsLoading(true);
      const supabase = createClient();

      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session) {
        toast.error('Sessione non trovata');
        setIsLoading(false);
        return;
      }

      const userId = session.user.id;

      const { data, error } = await (supabase as any)
        .from('profili')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Errore nel caricamento profilo:', error);
        toast.error('Errore nel caricamento del profilo');
      } else if (data) {
        setProfilo(data);
      }
    } catch (error) {
      console.error('Errore nel caricamento profilo:', error);
      toast.error('Errore sconosciuto');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfilo();
  }, [fetchProfilo]);

  const aggiornaProfilo = useCallback(
    async (data: ProfiloUpdate) => {
      try {
        setIsSaving(true);
        const supabase = createClient();

        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError || !session) {
          toast.error('Sessione non trovata');
          return;
        }

        const userId = session.user.id;

        const { error } = await (supabase as any)
          .from('profili')
          .update(data)
          .eq('id', userId);

        if (error) {
          console.error('Errore nell\'aggiornamento profilo:', error);
          toast.error('Errore nell\'aggiornamento del profilo');
        } else {
          toast.success('Profilo aggiornato con successo');
          await fetchProfilo();
        }
      } catch (error) {
        console.error('Errore nell\'aggiornamento profilo:', error);
        toast.error('Errore sconosciuto');
      } finally {
        setIsSaving(false);
      }
    },
    [fetchProfilo]
  );

  const importaCSV = useCallback(
    async (csvContent: string, brokerType: string): Promise<number> => {
      try {
        setIsSaving(true);
        const supabase = createClient();

        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError || !session) {
          toast.error('Sessione non trovata');
          return 0;
        }

        const userId = session.user.id;

        // Parse CSV
        let operazioni: Operazione[] = [];
        try {
          operazioni = parseCSV(csvContent, brokerType) as any;
        } catch (parseError) {
          toast.error('Errore nel parsing del CSV: ' + (parseError as Error).message);
          return 0;
        }

        if (operazioni.length === 0) {
          toast.error('Nessuna operazione trovata nel file');
          return 0;
        }

        // Funzione helper per convertire valori NaN/undefined in null
        const safeNum = (val: any): number | null => {
          if (val === undefined || val === null) return null;
          const n = Number(val);
          return isNaN(n) ? null : n;
        };

        // Prepara le operazioni con tutti i campi espliciti e puliti
        const operazioniConUtente = operazioni.map((op: any) => {
          const prezzoUscita = safeNum(op.prezzo_uscita);
          const quantita = safeNum(op.quantita) ?? 0;
          const prezzoEntrata = safeNum(op.prezzo_entrata) ?? 0;
          const commissione = safeNum(op.commissione) ?? 0;

          // Usa PnL dal parser se disponibile (calcolato correttamente dal broker's Net Proceeds)
          // Altrimenti ricalcola solo per formati che non forniscono PnL
          let pnl: number | null = safeNum(op.pnl);
          let pnlPercentuale: number | null = safeNum(op.pnl_percentuale);

          // Ricalcola solo se il parser non ha fornito un PnL e abbiamo prezzo di uscita
          if (pnl === null && prezzoUscita !== null && prezzoUscita > 0) {
            const dir = op.direzione === 'LONG' ? 1 : -1;
            const pnlLordo = (prezzoUscita - prezzoEntrata) * quantita * dir;
            pnl = pnlLordo - commissione;
            pnlPercentuale = prezzoEntrata > 0
              ? (pnl / (prezzoEntrata * quantita)) * 100
              : 0;
          }

          return {
            ticker: String(op.ticker || ''),
            direzione: String(op.direzione || 'LONG'),
            quantita: quantita,
            prezzo_entrata: prezzoEntrata,
            prezzo_uscita: prezzoUscita,
            commissione: commissione,
            data: String(op.data || new Date().toISOString().split('T')[0]),
            utente_id: userId,
            stato: prezzoUscita !== null && prezzoUscita > 0 ? 'chiusa' : 'aperta',
            note: op.note ? String(op.note) : null,
            pnl: pnl,
            pnl_percentuale: pnlPercentuale,
            ora_entrata: op.ora_entrata ? String(op.ora_entrata) : null,
            ora_uscita: op.ora_uscita ? String(op.ora_uscita) : null,
          };
        });

        // Inserisci le operazioni una alla volta per evitare problemi con bulk insert
        let successCount = 0;
        let firstError: any = null;

        for (const op of operazioniConUtente) {
          const { error: insertError } = await (supabase as any)
            .from('operazioni')
            .insert(op);

          if (insertError) {
            console.error('Errore inserimento singola operazione:', JSON.stringify(insertError, null, 2), 'Dati:', JSON.stringify(op, null, 2));
            if (!firstError) firstError = insertError;
          } else {
            successCount++;
          }
        }

        if (successCount === 0) {
          console.error('Nessuna operazione inserita. Primo errore:', JSON.stringify(firstError, null, 2));
          toast.error('Errore nell\'importazione: ' + (firstError?.message || 'controlla la console'));
          return 0;
        }

        if (successCount < operazioniConUtente.length) {
          toast.success(`${successCount}/${operazioniConUtente.length} operazioni importate (alcune con errore)`);
        } else {
          toast.success(`${successCount} operazioni importate con successo`);
        }
        return successCount;
      } catch (error) {
        console.error('Errore nell\'importazione:', error);
        toast.error('Errore sconosciuto');
        return 0;
      } finally {
        setIsSaving(false);
      }
    },
    []
  );

  const esportaCSV = useCallback(async (): Promise<string> => {
    try {
      setIsSaving(true);
      const supabase = createClient();

      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session) {
        toast.error('Sessione non trovata');
        return '';
      }

      const userId = session.user.id;

      const { data, error } = await (supabase as any)
        .from('operazioni')
        .select('*')
        .eq('utente_id', userId)
        .order('data', { ascending: true });

      if (error) {
        console.error('Errore nell\'esportazione:', error);
        toast.error('Errore nell\'esportazione dei dati');
        return '';
      }

      if (!data || data.length === 0) {
        toast.error('Nessuna operazione da esportare');
        return '';
      }

      // Convert to CSV
      const headers = [
        'Data',
        'Ticker',
        'Direzione',
        'Quantita',
        'Prezzo Entrata',
        'Prezzo Uscita',
        'Commissione',
        'P&L',
        'P&L %',
        'Stato',
        'Note',
      ];

      const rows = data.map((op: any) => [
        op.data || '',
        op.ticker || '',
        op.direzione || '',
        op.quantita?.toString() || '',
        op.prezzo_entrata?.toString() || '',
        op.prezzo_uscita?.toString() || '',
        op.commissione?.toString() || '0',
        op.pnl?.toString() || '',
        op.pnl_percentuale?.toString() || '',
        op.stato || '',
        op.note || '',
      ]);

      // Escape CSV fields
      const escapedRows = rows.map((row: any) =>
        row.map((field: any) => {
          if (typeof field === 'string' && (field.includes(',') || field.includes('"') || field.includes('\n'))) {
            return `"${field.replace(/"/g, '""')}"`;
          }
          return field;
        })
      );

      const csv = [headers, ...escapedRows].map((row) => row.join(',')).join('\n');

      // Download
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `gg-tracker-export-${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success('Dati esportati con successo');
      return csv;
    } catch (error) {
      console.error('Errore nell\'esportazione:', error);
      toast.error('Errore sconosciuto');
      return '';
    } finally {
      setIsSaving(false);
    }
  }, []);

  const eliminaTuttiDati = useCallback(async () => {
    try {
      setIsSaving(true);
      const supabase = createClient();

      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session) {
        toast.error('Sessione non trovata');
        return;
      }

      const userId = session.user.id;

      // Elimina operazioni
      const { error: deleteOpError } = await (supabase as any)
        .from('operazioni')
        .delete()
        .eq('utente_id', userId);

      if (deleteOpError) throw deleteOpError;

      // Elimina strategie
      const { error: deleteStratError } = await (supabase as any)
        .from('strategie')
        .delete()
        .eq('utente_id', userId);

      if (deleteStratError) throw deleteStratError;

      // Elimina tag e categorie tag (non-system)
      const { error: deleteTagError } = await (supabase as any)
        .from('categorie_tag')
        .delete()
        .eq('utente_id', userId);

      if (deleteTagError) throw deleteTagError;

      // Elimina obiettivi
      const { error: deleteObjError } = await (supabase as any)
        .from('obiettivi')
        .delete()
        .eq('utente_id', userId);

      if (deleteObjError) throw deleteObjError;

      // Elimina routine
      const { error: deleteRoutineError } = await (supabase as any)
        .from('routine')
        .delete()
        .eq('utente_id', userId);

      if (deleteRoutineError) throw deleteRoutineError;

      toast.success('Tutti i dati sono stati eliminati con successo');
    } catch (error) {
      console.error('Errore nell\'eliminazione dei dati:', error);
      toast.error('Errore nell\'eliminazione dei dati');
    } finally {
      setIsSaving(false);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      const supabase = createClient();

      const { error } = await supabase.auth.signOut();

      if (error) {
        toast.error('Errore nel logout');
        console.error(error);
      } else {
        toast.success('Logout effettuato con successo');
        // Redirect to login
        window.location.href = '/login';
      }
    } catch (error) {
      console.error('Errore nel logout:', error);
      toast.error('Errore sconosciuto');
    }
  }, []);

  return {
    profilo,
    isLoading,
    isSaving,
    aggiornaProfilo,
    importaCSV,
    esportaCSV,
    eliminaTuttiDati,
    logout,
  };
}
