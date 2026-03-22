'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/utils/supabase/client';
import type { Database } from '@/types/database';

type ConformitaRegola = Database['public']['Tables']['conformita_regole']['Row'];
type RegolaStrategia = Database['public']['Tables']['regole_strategia']['Row'];

export interface ConformitaConRegola extends ConformitaRegola {
  regola?: RegolaStrategia;
}

export interface AderenzaData {
  regole: RegolaStrategia[];
  conformita: ConformitaConRegola[];
  percentuale: number; // 0-100
  rispettate: number;
  totali: number;
}

export function useConformitaRegole(operazioneId: string | undefined, strategiaId: string | null | undefined) {
  const [aderenza, setAderenza] = useState<AderenzaData | null>(null);
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  // Carica le regole della strategia e la conformità per l'operazione
  const fetchAderenza = useCallback(async () => {
    if (!operazioneId || !strategiaId) {
      setAderenza(null);
      return;
    }

    setLoading(true);
    try {
      // Fetch regole della strategia
      const { data: regoleRaw, error: errRegole } = await supabase
        .from('regole_strategia')
        .select('*')
        .eq('strategia_id', strategiaId)
        .order('ordine', { ascending: true });

      if (errRegole) throw errRegole;
      const regole = (regoleRaw || []) as RegolaStrategia[];

      if (regole.length === 0) {
        setAderenza({ regole: [], conformita: [], percentuale: 0, rispettate: 0, totali: 0 });
        return;
      }

      // Fetch conformità esistente per questa operazione
      const { data: conformitaRaw, error: errConf } = await supabase
        .from('conformita_regole')
        .select('*')
        .eq('operazione_id', operazioneId);

      if (errConf) throw errConf;
      const conformita = (conformitaRaw || []) as ConformitaRegola[];

      // Unisci regole con conformità
      const conformitaConRegola: ConformitaConRegola[] = conformita.map((c) => ({
        ...c,
        regola: regole.find((r) => r.id === c.regola_id),
      }));

      const rispettate = conformita.filter((c) => c.rispettata).length;
      const totali = regole.length;
      const percentuale = totali > 0 ? Math.round((rispettate / totali) * 100) : 0;

      setAderenza({
        regole,
        conformita: conformitaConRegola,
        percentuale,
        rispettate,
        totali,
      });
    } catch (err) {
      console.error('Errore caricamento aderenza:', err);
    } finally {
      setLoading(false);
    }
  }, [operazioneId, strategiaId]);

  useEffect(() => {
    fetchAderenza();
  }, [fetchAderenza]);

  // Toggle una regola come rispettata/non rispettata
  const toggleRegola = useCallback(
    async (regolaId: string, rispettata: boolean) => {
      if (!operazioneId) return;

      try {
        // Cerca se esiste già un record per questa coppia operazione-regola
        const { data: existingRaw } = await supabase
          .from('conformita_regole')
          .select('id')
          .eq('operazione_id', operazioneId)
          .eq('regola_id', regolaId)
          .single();

        const existing = existingRaw as { id: string } | null;

        if (existing) {
          // Aggiorna
          await (supabase
            .from('conformita_regole') as any)
            .update({ rispettata })
            .eq('id', existing.id);
        } else {
          // Inserisci
          await (supabase
            .from('conformita_regole') as any)
            .insert({
              operazione_id: operazioneId,
              regola_id: regolaId,
              rispettata,
            });
        }

        // Aggiorna stato locale
        await fetchAderenza();
      } catch (err) {
        console.error('Errore toggle conformità:', err);
      }
    },
    [operazioneId, fetchAderenza]
  );

  return { aderenza, loading, toggleRegola, refetch: fetchAderenza };
}
