'use client';

import { useState, useEffect } from 'react';
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
  const [formData, setFormData] = useState({
    data: new Date().toISOString().split('T')[0],
    ticker: '',
    direzione: 'LONG' as string,
    quantita: '',
    prezzo_entrata: '',
    prezzo_uscita: '',
    commissione: commissioneDefault.toString(),
    strategia_id: '',
    note: '',
  });
  const [pnl, setPnl] = useState<number | null>(null);

  useEffect(() => {
    if (open) {
      fetchStrategie();
      if (isEditMode && operazioneModifica) {
        setFormData({
          data: operazioneModifica.data,
          ticker: operazioneModifica.ticker,
          direzione: operazioneModifica.direzione as string,
          quantita: operazioneModifica.quantita.toString(),
          prezzo_entrata: operazioneModifica.prezzo_entrata.toString(),
          prezzo_uscita: operazioneModifica.prezzo_uscita?.toString() || '',
          commissione: operazioneModifica.commissione.toString(),
          strategia_id: operazioneModifica.strategia_id || '',
          note: operazioneModifica.note || '',
        });
      } else {
        setFormData({
          data: new Date().toISOString().split('T')[0],
          ticker: '',
          direzione: 'LONG',
          quantita: '',
          prezzo_entrata: '',
          prezzo_uscita: '',
          commissione: commissioneDefault.toString(),
          strategia_id: '',
          note: '',
        });
      }
    }
  }, [open, isEditMode, operazioneModifica, commissioneDefault]);

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

  const calculatePnL = () => {
    if (
      formData.prezzo_entrata &&
      formData.prezzo_uscita &&
      formData.quantita
    ) {
      let pnlLordo: number;
      const entrata = parseFloat(formData.prezzo_entrata);
      const uscita = parseFloat(formData.prezzo_uscita);
      const qty = parseFloat(formData.quantita);
      const comm = parseFloat(formData.commissione) || 0;

      if (formData.direzione === 'LONG') {
        pnlLordo = (uscita - entrata) * qty;
      } else {
        pnlLordo = (entrata - uscita) * qty;
      }

      const pnlNetto = pnlLordo - comm;
      setPnl(pnlNetto);
    }
  };

  const handleChange = (field: string, value: any) => {
    setFormData((prev) => {
      const updated = { ...prev, [field]: value };
      // Trigger PnL calculation for numeric fields
      if (
        ['prezzo_entrata', 'prezzo_uscita', 'quantita', 'commissione', 'direzione'].includes(
          field
        )
      ) {
        setTimeout(() => calculatePnL(), 0);
      }
      return updated;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      // Validazione manuale
      if (!formData.data || !formData.ticker || !formData.prezzo_entrata || !formData.quantita) {
        toast.error('Compila tutti i campi obbligatori');
        return;
      }
      const validated = {
        data: formData.data,
        ticker: formData.ticker.toUpperCase(),
        direzione: formData.direzione,
        quantita: parseFloat(formData.quantita),
        prezzo_entrata: parseFloat(formData.prezzo_entrata),
        prezzo_uscita: parseFloat(formData.prezzo_uscita || '0'),
        commissione: parseFloat(formData.commissione || '0'),
        strategia_id: formData.strategia_id || undefined,
        note: formData.note || undefined,
      };

      setIsLoading(true);

      // Calculate final PnL
      let pnlLordo: number;
      if (validated.direzione === 'LONG') {
        pnlLordo = (validated.prezzo_uscita - validated.prezzo_entrata) * validated.quantita;
      } else {
        pnlLordo = (validated.prezzo_entrata - validated.prezzo_uscita) * validated.quantita;
      }
      const pnlNetto = pnlLordo - validated.commissione;
      const pnlPercentuale = (pnlNetto / (validated.prezzo_entrata * validated.quantita)) * 100;

      if (isEditMode && operazioneModifica && onModifica) {
        // Update existing operation
        await onModifica(operazioneModifica.id, {
          data: validated.data,
          ticker: validated.ticker,
          direzione: validated.direzione,
          quantita: validated.quantita,
          prezzo_entrata: validated.prezzo_entrata,
          prezzo_uscita: validated.prezzo_uscita,
          commissione: validated.commissione,
          note: validated.note || null,
          strategia_id: validated.strategia_id || null,
          pnl: pnlNetto,
          pnl_percentuale: pnlPercentuale,
        });
      } else {
        // Create new operation
        await onAggiungi({
          data: validated.data,
          ticker: validated.ticker,
          direzione: validated.direzione,
          quantita: validated.quantita,
          prezzo_entrata: validated.prezzo_entrata,
          prezzo_uscita: validated.prezzo_uscita,
          commissione: validated.commissione,
          note: validated.note || null,
          strategia_id: validated.strategia_id || null,
          stato: 'chiusa',
          pnl: pnlNetto,
          pnl_percentuale: pnlPercentuale,
        });
      }

      // Reset form
      setFormData({
        data: new Date().toISOString().split('T')[0],
        ticker: '',
        direzione: 'LONG',
        quantita: '',
        prezzo_entrata: '',
        prezzo_uscita: '',
        commissione: commissioneDefault.toString(),
        strategia_id: '',
        note: '',
      });
      setPnl(null);
      onOpenChange(false);
    } catch (error) {
      toast.error('Errore nel salvataggio operazione');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {isEditMode ? 'Modifica Operazione' : 'Nuova Operazione'}
          </DialogTitle>
          <DialogDescription>
            {isEditMode ? 'Modifica i dettagli dell&apos;operazione selezionata.' : 'Inserisci i dettagli della nuova operazione di trading.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Data e Ora */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="data">Data Operazione</Label>
              <Input
                id="data"
                type="date"
                value={formData.data}
                onChange={(e) => handleChange('data', e.target.value)}
                required
              />
            </div>

            {/* Ticker */}
            <div className="space-y-2">
              <Label htmlFor="ticker">Ticker</Label>
              <Input
                id="ticker"
                type="text"
                placeholder="es. AAPL"
                value={formData.ticker}
                onChange={(e) => handleChange('ticker', e.target.value.toUpperCase())}
                required
              />
            </div>
          </div>

          {/* Direzione */}
          <div className="space-y-2">
            <Label htmlFor="direzione">Direzione</Label>
            <Select value={formData.direzione} onValueChange={(value) => handleChange('direzione', value as 'LONG' | 'SHORT')}>
              <SelectTrigger id="direzione">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="LONG">LONG (Rialzista)</SelectItem>
                <SelectItem value="SHORT">SHORT (Ribassista)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Prezzi e Quantità */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="prezzo_entrata">Prezzo Entrata</Label>
              <Input
                id="prezzo_entrata"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={formData.prezzo_entrata}
                onChange={(e) => handleChange('prezzo_entrata', e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="prezzo_uscita">Prezzo Uscita</Label>
              <Input
                id="prezzo_uscita"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={formData.prezzo_uscita}
                onChange={(e) => handleChange('prezzo_uscita', e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="quantita">Quantità</Label>
              <Input
                id="quantita"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={formData.quantita}
                onChange={(e) => handleChange('quantita', e.target.value)}
                required
              />
            </div>
          </div>

          {/* Commissione */}
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

          {/* Strategia */}
          <div className="space-y-2">
            <Label htmlFor="strategia_id">Strategia (Opzionale)</Label>
            <Select
              value={formData.strategia_id}
              onValueChange={(value) => handleChange('strategia_id', value)}
            >
              <SelectTrigger id="strategia_id">
                <SelectValue placeholder="Seleziona una strategia" />
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
              className="flex h-24 w-full rounded-md border border-gray-300 dark:border-[#1e1e2e] bg-white dark:bg-[#12121a] px-3 py-2 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:border-[#7F00FF] focus:outline-none focus:ring-2 focus:ring-[#7F00FF] focus:ring-opacity-50 disabled:cursor-not-allowed disabled:opacity-50"
              placeholder="Commenti sull'operazione..."
              value={formData.note}
              onChange={(e) => handleChange('note', e.target.value)}
            />
          </div>

          {/* P&L Preview */}
          {pnl !== null && (
            <div className={`p-3 rounded-lg ${pnl >= 0 ? 'bg-emerald-500/10' : 'bg-red-500/10'}`}>
              <p className={`text-sm font-semibold ${pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                P&L stimato: {pnl >= 0 ? '+' : ''}{pnl.toFixed(2)}€
              </p>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
              Annulla
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading
                ? isEditMode
                  ? 'Modifica in corso...'
                  : 'Aggiunta in corso...'
                : isEditMode
                  ? 'Salva Modifiche'
                  : 'Aggiungi Operazione'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
