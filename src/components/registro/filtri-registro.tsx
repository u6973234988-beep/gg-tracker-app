'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { X } from 'lucide-react';
import type { Database } from '@/types/database';
import type { FiltriOperazioni } from '@/hooks/useOperazioni';

type Strategia = Database['public']['Tables']['strategie']['Row'];

interface FiltriRegistroProps {
  filtri: FiltriOperazioni;
  onFiltriChange: (filtri: FiltriOperazioni) => void;
  onReset: () => void;
}

export function FiltriRegistro({ filtri, onFiltriChange, onReset }: FiltriRegistroProps) {
  const [strategie, setStrategie] = useState<Strategia[]>([]);

  useEffect(() => {
    fetchStrategie();
  }, []);

  const fetchStrategie = async () => {
    try {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session) {
        const { data } = await supabase
          .from('strategie')
          .select('*')
          .eq('utente_id', session.user.id)
          .eq('attiva', true);

        setStrategie(data || []);
      }
    } catch (error) {
      console.error('Errore nel caricamento strategie:', error);
    }
  };

  const hasFilters = Object.values(filtri).some(
    (v) => v !== undefined && v !== '' && v !== null
  );

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Ticker Search */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-600 dark:text-gray-300">Ticker</label>
          <Input
            type="text"
            placeholder="es. AAPL"
            value={filtri.ticker || ''}
            onChange={(e) =>
              onFiltriChange({
                ...filtri,
                ticker: e.target.value || undefined,
              })
            }
          />
        </div>

        {/* Data Inizio */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-600 dark:text-gray-300">Da</label>
          <Input
            type="date"
            value={filtri.dataInizio || ''}
            onChange={(e) =>
              onFiltriChange({
                ...filtri,
                dataInizio: e.target.value || undefined,
              })
            }
          />
        </div>

        {/* Data Fine */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-600 dark:text-gray-300">A</label>
          <Input
            type="date"
            value={filtri.dataFine || ''}
            onChange={(e) =>
              onFiltriChange({
                ...filtri,
                dataFine: e.target.value || undefined,
              })
            }
          />
        </div>

        {/* Direzione */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-600 dark:text-gray-300">Direzione</label>
          <Select
            value={filtri.direzione || 'all'}
            onValueChange={(value) =>
              onFiltriChange({
                ...filtri,
                direzione: (value === 'all' ? undefined : value as 'LONG' | 'SHORT') || undefined,
              })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Tutte" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tutte</SelectItem>
              <SelectItem value="LONG">LONG</SelectItem>
              <SelectItem value="SHORT">SHORT</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Strategia */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-600 dark:text-gray-300">Strategia</label>
          <Select
            value={filtri.strategiaId || 'all'}
            onValueChange={(value) =>
              onFiltriChange({
                ...filtri,
                strategiaId: value === 'all' ? undefined : value,
              })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Tutte" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tutte</SelectItem>
              {strategie.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Reset Button */}
      {hasFilters && (
        <div className="flex justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={onReset}
            className="gap-2"
          >
            <X className="w-4 h-4" />
            Ripristina Filtri
          </Button>
        </div>
      )}
    </div>
  );
}
