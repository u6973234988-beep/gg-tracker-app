'use client';

import { useState, useEffect, useMemo } from 'react';
import { createClient } from '@/utils/supabase/client';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn, calcolaPnl, calcolaStatoOperazione, calcolaDurataMinuti } from '@/lib/utils';
import type { Database } from '@/types/database';

type Strategia = Database['public']['Tables']['strategie']['Row'];

interface AggiungiOperazioneDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAggiungi: (operazione: any) => Promise<void>;
  commissioneDefault?: number;
  operazioneModifica?: any | null;
  onModifica?: (id: string, data: any) => Promise<void>;
}

const emptyForm = (commissioneDefault = 0) => ({
  data: new Date().toISOString().split('T')[0],
  ticker: '',
  direzione: 'LONG' as 'LONG' | 'SHORT',
  quantita: '',
  prezzo_entrata: '',
  prezzo_uscita: '',
  commissione: commissioneDefault.toString(),
  stop_loss: '',
  take_profit: '',
  ora_entrata: '',
  ora_uscita: '',
  strategia_id: '',
  note: '',
});

export function AggiungiOperazioneDialog({
  open,
  onOpenChange,
  onAggiungi,
  commissioneDefault = 0,
  operazioneModifica = null,
  onModifica,
}: AggiungiOperazioneDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [strategie, setStrategie] = useState<Strategia[]>([]);
  const isEditMode = operazioneModifica !== null;

  const [formData, setFormData] = useState(emptyForm(commissioneDefault));

  useEffect(() => {
    if (!open) return;
    fetchStrategie();
    if (isEditMode && operazioneModifica) {
      setFormData({
        data: operazioneModifica.data ?? '',
        ticker: operazioneModifica.ticker ?? '',
        direzione: (operazioneModifica.direzione as 'LONG' | 'SHORT') ?? 'LONG',
        quantita: operazioneModifica.quantita?.toString() ?? '',
        prezzo_entrata: operazioneModifica.prezzo_entrata?.toString() ?? '',
        prezzo_uscita: operazioneModifica.prezzo_uscita?.toString() ?? '',
        commissione: operazioneModifica.commissione?.toString() ?? '0',
        stop_loss: operazioneModifica.stop_loss?.toString() ?? '',
        take_profit: operazioneModifica.take_profit?.toString() ?? '',
        ora_entrata: operazioneModifica.ora_entrata ?? '',
        ora_uscita: operazioneModifica.ora_uscita ?? '',
        strategia_id: operazioneModifica.strategia_id ?? '',
        note: operazioneModifica.note ?? '',
      });
    } else {
      setFormData(emptyForm(commissioneDefault));
    }
  }, [open, isEditMode, operazioneModifica, commissioneDefault]);

  const fetchStrategie = async () => {
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
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

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // Preview P&L calcolato in tempo reale
  const preview = useMemo(() => {
    const entrata = parseFloat(formData.prezzo_entrata);
    const uscita = parseFloat(formData.prezzo_uscita);
    const qty = parseFloat(formData.quantita);
    const comm = parseFloat(formData.commissione) || 0;
    const sl = parseFloat(formData.stop_loss) || null;

    if (!entrata || !qty || !uscita) return null;

    return calcolaPnl(formData.direzione, entrata, uscita, qty, comm, sl);
  }, [
    formData.prezzo_entrata,
    formData.prezzo_uscita,
    formData.quantita,
    formData.commissione,
    formData.direzione,
    formData.stop_loss,
  ]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.data || !formData.ticker || !formData.prezzo_entrata || !formData.quantita) {
      toast.error('Compila tutti i campi obbligatori');
      return;
    }

    const entryPrice  = parseFloat(formData.prezzo_entrata);
    const exitPriceRaw = formData.prezzo_uscita.trim();
    const exitPrice   = exitPriceRaw && parseFloat(exitPriceRaw) > 0 ? parseFloat(exitPriceRaw) : null;
    const qty         = parseFloat(formData.quantita);
    const comm        = parseFloat(formData.commissione) || 0;
    const sl          = formData.stop_loss.trim() ? parseFloat(formData.stop_loss) : null;
    const tp          = formData.take_profit.trim() ? parseFloat(formData.take_profit) : null;

    // Stato automatico: chiusa solo se c'è un prezzo di uscita valido
    const stato = calcolaStatoOperazione(exitPrice);

    // P&L solo se chiusa
    let pnlNetto: number | null = null;
    let pnlPercentuale: number | null = null;
    if (exitPrice !== null) {
      const calc = calcolaPnl(formData.direzione, entryPrice, exitPrice, qty, comm, sl);
      pnlNetto = calc.pnl;
      pnlPercentuale = calc.pnlPercentuale;
    }

    // Durata in minuti
    const durataMinuti = calcolaDurataMinuti(
      formData.ora_entrata || null,
      formData.ora_uscita || null,
    );

    const payload: any = {
      data: formData.data,
      ticker: formData.ticker.toUpperCase(),
      direzione: formData.direzione,
      quantita: qty,
      prezzo_entrata: entryPrice,
      prezzo_uscita: exitPrice,
      commissione: comm,
      stop_loss: sl,
      take_profit: tp,
      ora_entrata: formData.ora_entrata || null,
      ora_uscita: formData.ora_uscita || null,
      durata_minuti: durataMinuti,
      note: formData.note || null,
      strategia_id: formData.strategia_id || null,
      stato,
      pnl: pnlNetto,
      pnl_percentuale: pnlPercentuale,
    };

    try {
      setIsLoading(true);
      if (isEditMode && operazioneModifica && onModifica) {
        await onModifica(operazioneModifica.id, payload);
      } else {
        await onAggiungi(payload);
      }
      setFormData(emptyForm(commissioneDefault));
      onOpenChange(false);
    } catch (error) {
      toast.error('Errore nel salvataggio operazione');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const isLong = formData.direzione === 'LONG';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditMode ? 'Modifica Operazione' : 'Nuova Operazione'}
          </DialogTitle>
          <DialogDescription>
            {isEditMode
              ? 'Modifica i dettagli dell\'operazione selezionata.'
              : 'Inserisci i dettagli della nuova operazione di trading.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">

          {/* Riga 1: Data + Ticker */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="data">Data *</Label>
              <Input
                id="data"
                type="date"
                value={formData.data}
                onChange={(e) => handleChange('data', e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ticker">Ticker *</Label>
              <Input
                id="ticker"
                placeholder="es. AAPL"
                value={formData.ticker}
                onChange={(e) => handleChange('ticker', e.target.value.toUpperCase())}
                required
              />
            </div>
          </div>

          {/* Direzione */}
          <div className="space-y-2">
            <Label>Direzione *</Label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => handleChange('direzione', 'LONG')}
                className={cn(
                  'flex-1 py-2 rounded-lg text-sm font-semibold border transition-all',
                  isLong
                    ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400'
                    : 'border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:border-emerald-400',
                )}
              >
                LONG (BUY)
              </button>
              <button
                type="button"
                onClick={() => handleChange('direzione', 'SHORT')}
                className={cn(
                  'flex-1 py-2 rounded-lg text-sm font-semibold border transition-all',
                  !isLong
                    ? 'bg-red-500/20 border-red-500 text-red-400'
                    : 'border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:border-red-400',
                )}
              >
                SHORT (SELL)
              </button>
            </div>
            {!isLong && (
              <p className="text-xs text-gray-400">
                SHORT: profitto = (entrata - uscita) × qty — commissioni
              </p>
            )}
            {isLong && (
              <p className="text-xs text-gray-400">
                LONG: profitto = (uscita - entrata) × qty — commissioni
              </p>
            )}
          </div>

          {/* Riga 2: Entrata, Uscita, Qty */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="prezzo_entrata">Prezzo Entrata *</Label>
              <Input
                id="prezzo_entrata"
                type="number"
                step="0.0001"
                placeholder="0.00"
                value={formData.prezzo_entrata}
                onChange={(e) => handleChange('prezzo_entrata', e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="prezzo_uscita">
                Prezzo Uscita{' '}
                <span className="text-xs text-gray-400 font-normal">(vuoto = aperta)</span>
              </Label>
              <Input
                id="prezzo_uscita"
                type="number"
                step="0.0001"
                placeholder="0.00"
                value={formData.prezzo_uscita}
                onChange={(e) => handleChange('prezzo_uscita', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="quantita">Quantita *</Label>
              <Input
                id="quantita"
                type="number"
                step="1"
                placeholder="100"
                value={formData.quantita}
                onChange={(e) => handleChange('quantita', e.target.value)}
                required
              />
            </div>
          </div>

          {/* Riga 3: Ora Entrata + Uscita */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="ora_entrata">Ora Entrata</Label>
              <Input
                id="ora_entrata"
                type="time"
                value={formData.ora_entrata}
                onChange={(e) => handleChange('ora_entrata', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ora_uscita">Ora Uscita</Label>
              <Input
                id="ora_uscita"
                type="time"
                value={formData.ora_uscita}
                onChange={(e) => handleChange('ora_uscita', e.target.value)}
              />
            </div>
          </div>

          {/* Riga 4: Stop Loss + Take Profit + Commissione */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="stop_loss">
                Stop Loss{' '}
                <span className="text-xs text-gray-400 font-normal">(per R/R)</span>
              </Label>
              <Input
                id="stop_loss"
                type="number"
                step="0.0001"
                placeholder="0.00"
                value={formData.stop_loss}
                onChange={(e) => handleChange('stop_loss', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="take_profit">Take Profit</Label>
              <Input
                id="take_profit"
                type="number"
                step="0.0001"
                placeholder="0.00"
                value={formData.take_profit}
                onChange={(e) => handleChange('take_profit', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="commissione">Commissione (€)</Label>
              <Input
                id="commissione"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={formData.commissione}
                onChange={(e) => handleChange('commissione', e.target.value)}
              />
            </div>
          </div>

          {/* Preview P&L */}
          {preview && (
            <div
              className={cn(
                'rounded-lg p-4 border',
                preview.pnl >= 0
                  ? 'bg-emerald-500/10 border-emerald-500/30'
                  : 'bg-red-500/10 border-red-500/30',
              )}
            >
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                Preview P&L
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">P&L lordo</p>
                  <p className={cn('text-sm font-bold', preview.pnlLordo >= 0 ? 'text-emerald-400' : 'text-red-400')}>
                    {preview.pnlLordo >= 0 ? '+' : ''}{preview.pnlLordo.toFixed(2)}€
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">P&L netto</p>
                  <p className={cn('text-sm font-bold', preview.pnl >= 0 ? 'text-emerald-400' : 'text-red-400')}>
                    {preview.pnl >= 0 ? '+' : ''}{preview.pnl.toFixed(2)}€
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">P&L %</p>
                  <p className={cn('text-sm font-bold', preview.pnlPercentuale >= 0 ? 'text-emerald-400' : 'text-red-400')}>
                    {preview.pnlPercentuale >= 0 ? '+' : ''}{preview.pnlPercentuale.toFixed(2)}%
                  </p>
                </div>
                {preview.rr !== null && (
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">R/R</p>
                    <p className="text-sm font-bold text-gray-200">
                      {preview.rr.toFixed(2)}R
                    </p>
                  </div>
                )}
              </div>
              {preview.rischio !== null && (
                <p className="text-xs text-gray-400 mt-2">
                  Rischio SL: {Math.abs(preview.rischio).toFixed(2)}€
                  {preview.rischioPct !== null && ` (${preview.rischioPct.toFixed(2)}% capitale)`}
                </p>
              )}
            </div>
          )}

          {/* Strategia */}
          <div className="space-y-2">
            <Label htmlFor="strategia_id">Strategia</Label>
            <Select
              value={formData.strategia_id}
              onValueChange={(v) => handleChange('strategia_id', v)}
            >
              <SelectTrigger id="strategia_id">
                <SelectValue placeholder="Seleziona strategia (opzionale)" />
              </SelectTrigger>
              <SelectContent>
                {strategie.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Note */}
          <div className="space-y-2">
            <Label htmlFor="note">Note</Label>
            <textarea
              id="note"
              className="flex h-20 w-full rounded-md border border-gray-300 dark:border-[#1e1e2e] bg-white dark:bg-[#12121a] px-3 py-2 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
              placeholder="Commenti sull'operazione..."
              value={formData.note}
              onChange={(e) => handleChange('note', e.target.value)}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
              Annulla
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading
                ? isEditMode ? 'Salvataggio...' : 'Aggiunta...'
                : isEditMode ? 'Salva Modifiche' : 'Aggiungi Operazione'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
