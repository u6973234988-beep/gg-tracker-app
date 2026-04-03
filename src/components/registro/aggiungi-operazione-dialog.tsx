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
import type { Database } from '@/types/database';
import { ChevronDown, ChevronUp, Plus, Trash2, Loader2, BarChart3, PenLine } from 'lucide-react';
import { cn } from '@/lib/utils';
import dynamic from 'next/dynamic';

// Lazy load the chart component (heavy dependency: klinecharts)
const ChartOperationMode = dynamic(
  () => import('./chart-operation-mode').then((m) => ({ default: m.ChartOperationMode })),
  { ssr: false, loading: () => (
    <div className="flex items-center justify-center h-full">
      <Loader2 className="h-6 w-6 animate-spin text-violet-600" />
    </div>
  )}
);

type Strategia = Database['public']['Tables']['strategie']['Row'];

type TipoEsecuzione = 'LONG' | 'SHORT' | 'SELL' | 'COVER' | 'ADD';
type DialogMode = 'manuale' | 'grafico';

interface EsecuzioneForm {
  id: string;
  ora: string;
  prezzo: string;
  quantita: string;
  tipo: TipoEsecuzione;
}

/** Mappa il tipo UI al tipo DB (il constraint accetta solo 'entrata'|'uscita') */
function mapTipoToDb(uiType: TipoEsecuzione): 'entrata' | 'uscita' {
  if (uiType === 'SELL' || uiType === 'COVER') return 'uscita';
  return 'entrata'; // LONG, SHORT, ADD
}

interface AggiungiOperazioneDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAggiungi: (
    operazione: any,
    esecuzioni?: Array<{ ora?: string; prezzo: number; quantita: number; tipo: string }>
  ) => Promise<void>;
  commissioneDefault?: number;
  operazioneModifica?: any | null;
  onModifica?: (
    id: string,
    data: any,
    esecuzioni?: Array<{ ora?: string; prezzo: number; quantita: number; tipo: string }>
  ) => Promise<void>;
}

let esecuzioneCounter = 0;
function newEsecuzioneId() {
  return `es-${++esecuzioneCounter}-${Date.now()}`;
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
  const [mode, setMode] = useState<DialogMode>('manuale');
  const isEditMode = operazioneModifica !== null;

  // ── Form Data ──
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
    ora_entrata: '',
    ora_uscita: '',
  });
  const [pnl, setPnl] = useState<number | null>(null);

  // ── Esecuzioni Multiple ──
  const [esecuzioni, setEsecuzioni] = useState<EsecuzioneForm[]>([]);
  const [showEsecuzioni, setShowEsecuzioni] = useState(false);

  // ── Creazione Rapida Strategia ──
  const [creandoStrategia, setCreandoStrategia] = useState(false);
  const [nuovoNomeStrategia, setNuovoNomeStrategia] = useState('');
  const [isSavingStrategia, setIsSavingStrategia] = useState(false);

  // ── Calcolo medie ponderate dalle esecuzioni ──
  const calcoloEsecuzioni = useMemo(() => {
    if (esecuzioni.length === 0) return null;

    // Opening: LONG, SHORT, ADD (entrata)
    // Closing: SELL, COVER (uscita)
    const opening = esecuzioni.filter(
      (e) => ['LONG', 'SHORT', 'ADD'].includes(e.tipo) && e.prezzo && e.quantita
    );
    const closing = esecuzioni.filter(
      (e) => ['SELL', 'COVER'].includes(e.tipo) && e.prezzo && e.quantita
    );

    const totalQtyOpening = opening.reduce((s, e) => s + parseFloat(e.quantita || '0'), 0);
    const totalQtyClosing = closing.reduce((s, e) => s + parseFloat(e.quantita || '0'), 0);

    const prezzoEntrata =
      totalQtyOpening > 0
        ? opening.reduce((s, e) => s + parseFloat(e.prezzo || '0') * parseFloat(e.quantita || '0'), 0) /
          totalQtyOpening
        : 0;

    const prezzoUscita =
      totalQtyClosing > 0
        ? closing.reduce((s, e) => s + parseFloat(e.prezzo || '0') * parseFloat(e.quantita || '0'), 0) /
          totalQtyClosing
        : null;

    return {
      prezzoEntrata,
      prezzoUscita,
      quantita: totalQtyOpening,
      hasClosing: closing.length > 0,
    };
  }, [esecuzioni, formData.direzione]);

  // ── Sync calcoloEsecuzioni → formData ──
  useEffect(() => {
    if (calcoloEsecuzioni && esecuzioni.length > 0) {
      setFormData((prev) => ({
        ...prev,
        prezzo_entrata: calcoloEsecuzioni.prezzoEntrata
          ? calcoloEsecuzioni.prezzoEntrata.toFixed(4)
          : prev.prezzo_entrata,
        prezzo_uscita: calcoloEsecuzioni.prezzoUscita
          ? calcoloEsecuzioni.prezzoUscita.toFixed(4)
          : '',
        quantita: calcoloEsecuzioni.quantita
          ? calcoloEsecuzioni.quantita.toString()
          : prev.quantita,
      }));
    }
  }, [calcoloEsecuzioni, esecuzioni.length]);

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
          ora_entrata: operazioneModifica.ora_entrata || '',
          ora_uscita: operazioneModifica.ora_uscita || '',
        });
        // Reset esecuzioni on edit mode (could load from DB in future)
        setEsecuzioni([]);
        setShowEsecuzioni(false);
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
          ora_entrata: '',
          ora_uscita: '',
        });
        setEsecuzioni([]);
        setShowEsecuzioni(false);
      }
      setCreandoStrategia(false);
      setNuovoNomeStrategia('');
      setMode('manuale');
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

  // Recalculate PnL when relevant fields change
  useEffect(() => {
    calculatePnL();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    formData.prezzo_entrata,
    formData.prezzo_uscita,
    formData.quantita,
    formData.commissione,
    formData.direzione,
  ]);

  const handleChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // ── Esecuzioni handlers ──
  const addEsecuzione = () => {
    const defaultTipo: TipoEsecuzione =
      formData.direzione === 'LONG' ? 'LONG' : 'SHORT';
    setEsecuzioni((prev) => [
      ...prev,
      { id: newEsecuzioneId(), ora: '', prezzo: '', quantita: '', tipo: defaultTipo },
    ]);
  };

  const removeEsecuzione = (id: string) => {
    setEsecuzioni((prev) => prev.filter((e) => e.id !== id));
  };

  const updateEsecuzione = (id: string, field: keyof EsecuzioneForm, value: string) => {
    setEsecuzioni((prev) =>
      prev.map((e) => (e.id === id ? { ...e, [field]: value } : e))
    );
  };

  // ── Creazione rapida strategia ──
  const handleCreaStrategia = async () => {
    if (!nuovoNomeStrategia.trim()) {
      toast.error('Inserisci un nome per la strategia');
      return;
    }

    setIsSavingStrategia(true);
    try {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        toast.error('Sessione non trovata');
        return;
      }

      const { data, error } = await (supabase as any)
        .from('strategie')
        .insert({
          nome: nuovoNomeStrategia.trim(),
          utente_id: session.user.id,
          colore: '#7F00FF',
          attiva: true,
        })
        .select()
        .single();

      if (error) {
        toast.error('Errore nella creazione della strategia');
        console.error('Supabase error:', JSON.stringify(error, null, 2));
      } else {
        toast.success(`Strategia "${data.nome}" creata`);
        // Refresh list and auto-select
        await fetchStrategie();
        setFormData((prev) => ({ ...prev, strategia_id: data.id }));
        setCreandoStrategia(false);
        setNuovoNomeStrategia('');
      }
    } catch (error) {
      toast.error('Errore sconosciuto');
      console.error(error);
    } finally {
      setIsSavingStrategia(false);
    }
  };

  // ── Calcolo durata minuti ──
  const calcolaDurataMinuti = (oraEntrata: string, oraUscita: string): number | null => {
    if (!oraEntrata || !oraUscita) return null;
    const [hE, mE] = oraEntrata.split(':').map(Number);
    const [hU, mU] = oraUscita.split(':').map(Number);
    const minEntrata = hE * 60 + mE;
    const minUscita = hU * 60 + mU;
    const diff = minUscita - minEntrata;
    return diff >= 0 ? diff : diff + 1440; // handle overnight
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      // Validazione manuale
      if (!formData.data || !formData.ticker || !formData.prezzo_entrata || !formData.quantita) {
        toast.error('Compila tutti i campi obbligatori');
        return;
      }

      const hasEsecuzioni = esecuzioni.length > 0;

      const validated = {
        data: formData.data,
        ticker: formData.ticker.toUpperCase(),
        direzione: formData.direzione,
        quantita: parseFloat(formData.quantita),
        prezzo_entrata: parseFloat(formData.prezzo_entrata),
        prezzo_uscita: formData.prezzo_uscita ? parseFloat(formData.prezzo_uscita) : null,
        commissione: parseFloat(formData.commissione || '0'),
        strategia_id: formData.strategia_id || undefined,
        note: formData.note || undefined,
        ora_entrata: formData.ora_entrata || null,
        ora_uscita: formData.ora_uscita || null,
        durata_minuti: calcolaDurataMinuti(formData.ora_entrata, formData.ora_uscita),
      };

      setIsLoading(true);

      // Determine stato
      const isAperta = validated.prezzo_uscita === null || validated.prezzo_uscita === 0;

      // Calculate final PnL
      let pnlNetto = 0;
      let pnlPercentuale = 0;
      if (validated.prezzo_uscita && validated.prezzo_uscita > 0) {
        let pnlLordo: number;
        if (validated.direzione === 'LONG') {
          pnlLordo = (validated.prezzo_uscita - validated.prezzo_entrata) * validated.quantita;
        } else {
          pnlLordo = (validated.prezzo_entrata - validated.prezzo_uscita) * validated.quantita;
        }
        pnlNetto = pnlLordo - validated.commissione;
        pnlPercentuale = (pnlNetto / (validated.prezzo_entrata * validated.quantita)) * 100;
      }

      // Build esecuzioni payload — mappiamo UI tipo → DB tipo
      const esecuzioniPayload = hasEsecuzioni
        ? esecuzioni
            .filter((e) => e.prezzo && e.quantita)
            .map((e) => ({
              ora: e.ora || undefined,
              prezzo: parseFloat(e.prezzo),
              quantita: parseFloat(e.quantita),
              tipo: mapTipoToDb(e.tipo),
            }))
        : undefined;

      if (isEditMode && operazioneModifica && onModifica) {
        // Update existing operation
        await onModifica(
          operazioneModifica.id,
          {
            data: validated.data,
            ticker: validated.ticker,
            direzione: validated.direzione,
            quantita: validated.quantita,
            prezzo_entrata: validated.prezzo_entrata,
            prezzo_uscita: validated.prezzo_uscita,
            commissione: validated.commissione,
            note: validated.note || null,
            strategia_id: validated.strategia_id || null,
            ora_entrata: validated.ora_entrata,
            ora_uscita: validated.ora_uscita,
            durata_minuti: validated.durata_minuti,
            pnl: isAperta ? null : pnlNetto,
            pnl_percentuale: isAperta ? null : pnlPercentuale,
            stato: isAperta ? 'aperta' : 'chiusa',
          },
          esecuzioniPayload
        );
      } else {
        // Create new operation
        await onAggiungi(
          {
            data: validated.data,
            ticker: validated.ticker,
            direzione: validated.direzione,
            quantita: validated.quantita,
            prezzo_entrata: validated.prezzo_entrata,
            prezzo_uscita: validated.prezzo_uscita,
            commissione: validated.commissione,
            note: validated.note || null,
            strategia_id: validated.strategia_id || null,
            ora_entrata: validated.ora_entrata,
            ora_uscita: validated.ora_uscita,
            durata_minuti: validated.durata_minuti,
            stato: isAperta ? 'aperta' : 'chiusa',
            pnl: isAperta ? null : pnlNetto,
            pnl_percentuale: isAperta ? null : pnlPercentuale,
          },
          esecuzioniPayload
        );
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
        ora_entrata: '',
        ora_uscita: '',
      });
      setPnl(null);
      setEsecuzioni([]);
      setShowEsecuzioni(false);
      onOpenChange(false);
    } catch (error) {
      toast.error('Errore nel salvataggio operazione');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const hasEsecuzioniData = esecuzioni.length > 0;

  const isGrafico = mode === 'grafico';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          isGrafico
            ? 'max-w-7xl w-[95vw] h-[90vh] overflow-hidden flex flex-col'
            : 'max-w-2xl max-h-[90vh] overflow-y-auto'
        )}
      >
        <DialogHeader className={isGrafico ? 'flex-shrink-0' : ''}>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle>
                {isEditMode ? 'Modifica Operazione' : 'Nuova Operazione'}
              </DialogTitle>
              <DialogDescription>
                {isEditMode
                  ? 'Modifica i dettagli dell&apos;operazione selezionata.'
                  : isGrafico
                    ? 'Clicca sulle candele per aggiungere esecuzioni.'
                    : 'Inserisci i dettagli della nuova operazione di trading.'}
              </DialogDescription>
            </div>

            {/* Mode Toggle - only show for new operations */}
            {!isEditMode && (
              <div className="flex items-center bg-gray-100 dark:bg-[#1e1e2e] rounded-lg p-0.5 mr-8">
                <button
                  type="button"
                  onClick={() => setMode('manuale')}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200',
                    mode === 'manuale'
                      ? 'bg-violet-600 text-white shadow-sm'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                  )}
                >
                  <PenLine className="h-3 w-3" />
                  Manuale
                </button>
                <button
                  type="button"
                  onClick={() => setMode('grafico')}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200',
                    mode === 'grafico'
                      ? 'bg-violet-600 text-white shadow-sm'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                  )}
                >
                  <BarChart3 className="h-3 w-3" />
                  Grafico
                </button>
              </div>
            )}
          </div>
        </DialogHeader>

        {/* ═══ GRAFICO MODE ═══ */}
        {isGrafico && !isEditMode ? (
          <div className="flex-1 min-h-0 overflow-hidden">
            <ChartOperationMode
              formData={formData}
              esecuzioni={esecuzioni}
              setFormData={setFormData}
              setEsecuzioni={setEsecuzioni}
              strategie={strategie}
              onSubmit={handleSubmit}
              isLoading={isLoading}
              onClose={() => onOpenChange(false)}
              onCreaStrategia={() => setCreandoStrategia(true)}
              creandoStrategia={creandoStrategia}
              nuovoNomeStrategia={nuovoNomeStrategia}
              setNuovoNomeStrategia={setNuovoNomeStrategia}
              isSavingStrategia={isSavingStrategia}
              handleCreaStrategia={handleCreaStrategia}
              pnl={pnl}
            />
          </div>
        ) : (
        /* ═══ MANUALE MODE (original form) ═══ */
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* ── Riga 1: Data e Ticker ── */}
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

          {/* ── Riga 2: Orari Entry/Exit ── */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="ora_entrata">Ora Entrata</Label>
              <Input
                id="ora_entrata"
                type="time"
                value={formData.ora_entrata}
                onChange={(e) => handleChange('ora_entrata', e.target.value)}
                className="text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ora_uscita">Ora Uscita</Label>
              <Input
                id="ora_uscita"
                type="time"
                value={formData.ora_uscita}
                onChange={(e) => handleChange('ora_uscita', e.target.value)}
                className="text-sm"
              />
            </div>
          </div>

          {/* ── Direzione ── */}
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

          {/* ── Prezzi e Quantità ── */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="prezzo_entrata">
                Prezzo Entrata
                {hasEsecuzioniData && (
                  <span className="ml-1 text-[10px] text-violet-500 font-normal">(auto)</span>
                )}
              </Label>
              <Input
                id="prezzo_entrata"
                type="number"
                step="0.0001"
                placeholder="0.00"
                value={formData.prezzo_entrata}
                onChange={(e) => handleChange('prezzo_entrata', e.target.value)}
                readOnly={hasEsecuzioniData}
                className={hasEsecuzioniData ? 'bg-violet-50 dark:bg-violet-900/20 cursor-not-allowed' : ''}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="prezzo_uscita">
                Prezzo Uscita
                {hasEsecuzioniData && (
                  <span className="ml-1 text-[10px] text-violet-500 font-normal">(auto)</span>
                )}
              </Label>
              <Input
                id="prezzo_uscita"
                type="number"
                step="0.0001"
                placeholder="0.00"
                value={formData.prezzo_uscita}
                onChange={(e) => handleChange('prezzo_uscita', e.target.value)}
                readOnly={hasEsecuzioniData}
                className={hasEsecuzioniData ? 'bg-violet-50 dark:bg-violet-900/20 cursor-not-allowed' : ''}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="quantita">
                Quantità
                {hasEsecuzioniData && (
                  <span className="ml-1 text-[10px] text-violet-500 font-normal">(auto)</span>
                )}
              </Label>
              <Input
                id="quantita"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={formData.quantita}
                onChange={(e) => handleChange('quantita', e.target.value)}
                readOnly={hasEsecuzioniData}
                className={hasEsecuzioniData ? 'bg-violet-50 dark:bg-violet-900/20 cursor-not-allowed' : ''}
                required
              />
            </div>
          </div>

          {/* ── Sezione Esecuzioni Multiple (collapsible) ── */}
          <div className="border border-violet-200/40 dark:border-violet-500/20 rounded-lg overflow-hidden">
            <button
              type="button"
              onClick={() => setShowEsecuzioni(!showEsecuzioni)}
              className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-violet-50/50 dark:hover:bg-violet-900/10 transition-colors"
            >
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-violet-700 dark:text-violet-300">
                  Esecuzioni Multiple
                </span>
                {esecuzioni.length > 0 && (
                  <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-violet-500 text-white text-[10px] font-bold">
                    {esecuzioni.length}
                  </span>
                )}
              </div>
              {showEsecuzioni ? (
                <ChevronUp className="h-4 w-4 text-violet-500" />
              ) : (
                <ChevronDown className="h-4 w-4 text-violet-500" />
              )}
            </button>

            {showEsecuzioni && (
              <div className="border-t border-violet-200/30 dark:border-violet-500/15 px-4 py-3 space-y-3 bg-violet-50/20 dark:bg-violet-900/5">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Aggiungi singole esecuzioni (scaling in/out). I prezzi medi e la quantità si calcoleranno automaticamente.
                </p>

                {/* Esecuzioni list */}
                {esecuzioni.map((es, idx) => (
                  <div
                    key={es.id}
                    className="grid grid-cols-[70px_1fr_1fr_90px_32px] gap-2 items-end"
                  >
                    <div className="space-y-1">
                      {idx === 0 && <Label className="text-[10px]">Ora</Label>}
                      <Input
                        type="time"
                        value={es.ora}
                        onChange={(e) => updateEsecuzione(es.id, 'ora', e.target.value)}
                        className="text-xs h-8 px-1.5"
                      />
                    </div>
                    <div className="space-y-1">
                      {idx === 0 && <Label className="text-[10px]">Prezzo</Label>}
                      <Input
                        type="number"
                        step="0.0001"
                        placeholder="0.00"
                        value={es.prezzo}
                        onChange={(e) => updateEsecuzione(es.id, 'prezzo', e.target.value)}
                        className="text-xs h-8"
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      {idx === 0 && <Label className="text-[10px]">Quantità</Label>}
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0"
                        value={es.quantita}
                        onChange={(e) => updateEsecuzione(es.id, 'quantita', e.target.value)}
                        className="text-xs h-8"
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      {idx === 0 && <Label className="text-[10px]">Tipo</Label>}
                      <Select
                        value={es.tipo}
                        onValueChange={(v) => updateEsecuzione(es.id, 'tipo', v)}
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {formData.direzione === 'LONG' ? (
                            <>
                              <SelectItem value="LONG">LONG</SelectItem>
                              <SelectItem value="ADD">ADD</SelectItem>
                              <SelectItem value="SELL">SELL</SelectItem>
                            </>
                          ) : (
                            <>
                              <SelectItem value="SHORT">SHORT</SelectItem>
                              <SelectItem value="ADD">ADD</SelectItem>
                              <SelectItem value="COVER">COVER</SelectItem>
                            </>
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      {idx === 0 && <Label className="text-[10px] invisible">X</Label>}
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                        onClick={() => removeEsecuzione(es.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full h-8 text-xs border-dashed border-violet-300 dark:border-violet-600 text-violet-600 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/20"
                  onClick={addEsecuzione}
                >
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  Aggiungi Esecuzione
                </Button>

                {/* Summary */}
                {calcoloEsecuzioni && calcoloEsecuzioni.quantita > 0 && (
                  <div className="p-2.5 rounded-md bg-violet-100/50 dark:bg-violet-900/20 border border-violet-200/40 dark:border-violet-500/15">
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">Prezzo Entrata</span>
                        <p className="font-semibold text-violet-700 dark:text-white">
                          ${calcoloEsecuzioni.prezzoEntrata.toFixed(4)}
                        </p>
                      </div>
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">Prezzo Uscita</span>
                        <p className="font-semibold text-violet-700 dark:text-white">
                          {calcoloEsecuzioni.prezzoUscita
                            ? `$${calcoloEsecuzioni.prezzoUscita.toFixed(4)}`
                            : '—'}
                        </p>
                      </div>
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">Quantità Totale</span>
                        <p className="font-semibold text-violet-700 dark:text-white">
                          {calcoloEsecuzioni.quantita}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── Commissione ── */}
          <div className="space-y-2">
            <Label htmlFor="commissione">Commissione ($)</Label>
            <Input
              id="commissione"
              type="number"
              step="0.01"
              placeholder="0.00"
              value={formData.commissione}
              onChange={(e) => handleChange('commissione', e.target.value)}
            />
          </div>

          {/* ── Strategia con creazione rapida ── */}
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

            {/* Creazione rapida inline */}
            {!creandoStrategia ? (
              <button
                type="button"
                onClick={() => setCreandoStrategia(true)}
                className="text-xs text-violet-600 dark:text-violet-400 hover:text-violet-800 dark:hover:text-violet-300 font-medium transition-colors"
              >
                + Crea nuova strategia
              </button>
            ) : (
              <div className="flex items-center gap-2 mt-1">
                <Input
                  type="text"
                  placeholder="Nome strategia..."
                  value={nuovoNomeStrategia}
                  onChange={(e) => setNuovoNomeStrategia(e.target.value)}
                  className="h-8 text-sm flex-grow"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleCreaStrategia();
                    }
                  }}
                  autoFocus
                />
                <Button
                  type="button"
                  size="sm"
                  className="h-8 text-xs px-3"
                  onClick={handleCreaStrategia}
                  disabled={isSavingStrategia}
                >
                  {isSavingStrategia ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    'Crea'
                  )}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 text-xs px-2"
                  onClick={() => {
                    setCreandoStrategia(false);
                    setNuovoNomeStrategia('');
                  }}
                >
                  Annulla
                </Button>
              </div>
            )}
          </div>

          {/* ── Note ── */}
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

          {/* ── P&L Preview ── */}
          {pnl !== null && formData.prezzo_uscita && (
            <div className={`p-3 rounded-lg ${pnl >= 0 ? 'bg-emerald-500/10' : 'bg-red-500/10'}`}>
              <p className={`text-sm font-semibold ${pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                P&L stimato: {pnl >= 0 ? '+' : ''}{pnl.toFixed(2)}$
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
        )}
      </DialogContent>
    </Dialog>
  );
}
