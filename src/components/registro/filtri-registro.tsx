'use client';

import { useEffect, useState, useMemo } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { X, SlidersHorizontal, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
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
  const [showFilters, setShowFilters] = useState(false);

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
          .eq('attiva', true)
          .order('nome', { ascending: true });

        setStrategie(data || []);
      }
    } catch (error) {
      console.error('Errore nel caricamento strategie:', error);
    }
  };

  const hasFilters = Object.values(filtri).some(
    (v) => v !== undefined && v !== '' && v !== null
  );

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filtri.ticker) count++;
    if (filtri.dataInizio) count++;
    if (filtri.dataFine) count++;
    if (filtri.direzione) count++;
    if (filtri.strategiaId) count++;
    return count;
  }, [filtri]);

  // Find the currently selected strategy for display
  const selectedStrategia = useMemo(
    () => strategie.find((s) => s.id === filtri.strategiaId),
    [strategie, filtri.strategiaId]
  );

  return (
    <div className="space-y-3">
      {/* Compact filter toggle bar */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={cn(
            'flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all border',
            showFilters || hasFilters
              ? 'bg-[#46265F]/10 border-[#6A3D8F]/20 text-[#c4a0e8]'
              : 'bg-[#1C1C1F] border-[#2D2D32] text-[#80808A] hover:text-[#c4a0e8] hover:border-[#6A3D8F]/20'
          )}
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
          Filtri
          {activeFilterCount > 0 && (
            <span className="flex items-center justify-center w-4 h-4 rounded-full bg-[#46265F] text-white text-[10px] font-bold">
              {activeFilterCount}
            </span>
          )}
          <ChevronDown className={cn('w-3 h-3 transition-transform', showFilters && 'rotate-180')} />
        </button>

        {/* Active filter pills - show when collapsed */}
        {!showFilters && hasFilters && (
          <div className="flex items-center gap-1.5 flex-wrap">
            {filtri.ticker && (
              <Badge variant="outline" className="text-[10px] h-6 gap-1 px-2 bg-[#46265F]/5 border-[#6A3D8F]/20 text-[#c4a0e8]">
                {filtri.ticker}
                <button onClick={() => onFiltriChange({ ...filtri, ticker: undefined })} className="hover:text-red-500 transition-colors">
                  <X className="w-2.5 h-2.5" />
                </button>
              </Badge>
            )}
            {filtri.direzione && (
              <Badge variant="outline" className={cn(
                'text-[10px] h-6 gap-1 px-2',
                filtri.direzione === 'LONG'
                  ? 'bg-emerald-50 dark:bg-emerald-500/5 border-emerald-200/50 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-300'
                  : 'bg-red-50 dark:bg-red-500/5 border-red-200/50 dark:border-red-500/20 text-red-700 dark:text-red-300'
              )}>
                {filtri.direzione}
                <button onClick={() => onFiltriChange({ ...filtri, direzione: undefined })} className="hover:text-red-500 transition-colors">
                  <X className="w-2.5 h-2.5" />
                </button>
              </Badge>
            )}
            {selectedStrategia && (
              <Badge variant="outline" className="text-[10px] h-6 gap-1 px-2 bg-[#46265F]/5 border-[#6A3D8F]/20 text-[#c4a0e8]">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: selectedStrategia.colore || '#6A3D8F' }} />
                {selectedStrategia.nome}
                <button onClick={() => onFiltriChange({ ...filtri, strategiaId: undefined })} className="hover:text-red-500 transition-colors">
                  <X className="w-2.5 h-2.5" />
                </button>
              </Badge>
            )}
            {(filtri.dataInizio || filtri.dataFine) && (
              <Badge variant="outline" className="text-[10px] h-6 gap-1 px-2 bg-[#46265F]/5 border-[#6A3D8F]/20 text-[#c4a0e8]">
                {filtri.dataInizio || '...'} → {filtri.dataFine || '...'}
                <button onClick={() => onFiltriChange({ ...filtri, dataInizio: undefined, dataFine: undefined })} className="hover:text-red-500 transition-colors">
                  <X className="w-2.5 h-2.5" />
                </button>
              </Badge>
            )}
            <button
              onClick={onReset}
              className="text-[10px] text-red-400 hover:text-red-500 dark:text-red-400/60 dark:hover:text-red-400 transition-colors font-medium ml-1"
            >
              Azzera tutto
            </button>
          </div>
        )}
      </div>

      {/* Expanded filter panel */}
      {showFilters && (
        <div className="rounded-xl border border-[#2D2D32] bg-[#1C1C1F] p-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {/* Ticker Search */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-[#c4a0e8]">Ticker</label>
              <Input
                type="text"
                placeholder="es. AAPL"
                className="h-9 text-xs"
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
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-[#c4a0e8]">Da</label>
              <Input
                type="date"
                className="h-9 text-xs"
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
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-[#c4a0e8]">A</label>
              <Input
                type="date"
                className="h-9 text-xs"
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
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-[#c4a0e8]">Direzione</label>
              <Select
                value={filtri.direzione || 'all'}
                onValueChange={(value) =>
                  onFiltriChange({
                    ...filtri,
                    direzione: (value === 'all' ? undefined : value as 'LONG' | 'SHORT') || undefined,
                  })
                }
              >
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Tutte" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tutte</SelectItem>
                  <SelectItem value="LONG">
                    <span className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      LONG
                    </span>
                  </SelectItem>
                  <SelectItem value="SHORT">
                    <span className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-red-500" />
                      SHORT
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Strategia */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-[#c4a0e8]">Strategia</label>
              <Select
                value={filtri.strategiaId || 'all'}
                onValueChange={(value) =>
                  onFiltriChange({
                    ...filtri,
                    strategiaId: value === 'all' ? undefined : value,
                  })
                }
              >
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Tutte">
                    {selectedStrategia ? (
                      <span className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: selectedStrategia.colore || '#6A3D8F' }} />
                        {selectedStrategia.nome}
                      </span>
                    ) : (
                      'Tutte'
                    )}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tutte le strategie</SelectItem>
                  {strategie.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      <span className="flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                          style={{ backgroundColor: s.colore || '#6A3D8F' }}
                        />
                        {s.nome}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Reset Button */}
          {hasFilters && (
            <div className="flex justify-end pt-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={onReset}
                className="gap-1.5 h-7 text-xs text-red-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/5"
              >
                <X className="w-3 h-3" />
                Azzera filtri
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
