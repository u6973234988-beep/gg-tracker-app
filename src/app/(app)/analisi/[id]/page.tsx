'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { KlineChartComponent } from '@/components/charts/kline-chart';
import { useOperazioni } from '@/hooks/useOperazioni';
import { usePlaybook } from '@/hooks/usePlaybook';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Clock,
  DollarSign,
  Target,
  ShieldAlert,
  Crosshair,
  Hash,
  BookOpen,
  Check,
  Save,
  X,
  Shield,
  BarChart2,
  ChevronDown,
  ChevronUp,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import { useConformitaRegole } from '@/hooks/useConformitaRegole';
import { formatValuta, cn } from '@/lib/utils';
import { format } from 'date-fns';
import { it } from 'date-fns/locale/it';
import { toast } from 'sonner';

// ─── Animations ──────────────────────────────────────────────────────
const fadeUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
};

const fadeRight = {
  initial: { opacity: 0, x: 16 },
  animate: { opacity: 1, x: 0 },
};

const stagger = {
  animate: { transition: { staggerChildren: 0.06 } },
};

export default function AnalisiOperazionePage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const { operazioni, modificaOperazione } = useOperazioni();
  const { strategie, isLoading: loadingStrategie } = usePlaybook();
  const [note, setNote] = useState('');
  const [savingNote, setSavingNote] = useState(false);
  const [noteSaved, setNoteSaved] = useState(false);
  const [showStrategiaSelector, setShowStrategiaSelector] = useState(false);
  const [savingStrategia, setSavingStrategia] = useState(false);

  const operazione = useMemo(
    () => operazioni.find((op) => op.id === id),
    [operazioni, id]
  );

  const sameDayOps = useMemo(() => {
    if (!operazione) return [];
    return operazioni
      .filter((op) => op.data === operazione.data)
      .sort((a, b) => (a.ora_entrata || '').localeCompare(b.ora_entrata || ''));
  }, [operazioni, operazione]);

  const currentIndex = sameDayOps.findIndex((op) => op.id === id);
  const prevOp = currentIndex > 0 ? sameDayOps[currentIndex - 1] : null;
  const nextOp = currentIndex < sameDayOps.length - 1 ? sameDayOps[currentIndex + 1] : null;

  useEffect(() => {
    if (operazione?.note) {
      setNote(operazione.note);
    } else {
      setNote('');
    }
  }, [operazione?.note, operazione?.id]);

  const saveNote = async () => {
    if (!operazione || note === (operazione.note || '')) return;
    setSavingNote(true);
    try {
      await modificaOperazione(operazione.id, { note });
      setNoteSaved(true);
      setTimeout(() => setNoteSaved(false), 2000);
    } finally {
      setSavingNote(false);
    }
  };

  const handleAssociaStrategia = async (strategiaId: string | null) => {
    if (!operazione) return;
    setSavingStrategia(true);
    try {
      await modificaOperazione(operazione.id, { strategia_id: strategiaId });
      toast.success(strategiaId ? 'Strategia associata' : 'Strategia rimossa');
      setShowStrategiaSelector(false);
    } catch {
      toast.error('Errore nel salvataggio della strategia');
    } finally {
      setSavingStrategia(false);
    }
  };

  if (!operazione) {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-[60vh]">
        <motion.div {...fadeUp} className="text-center">
          <p className="text-gray-500 dark:text-gray-400 mb-4">Operazione non trovata</p>
          <Button variant="outline" onClick={() => router.push('/registro')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Torna al Registro
          </Button>
        </motion.div>
      </div>
    );
  }

  const pnl = operazione.pnl || 0;
  const isPositive = pnl >= 0;
  const isLong = operazione.direzione === 'LONG';
  const strategia = operazione.strategia as any;

  let formattedDate = operazione.data;
  try {
    formattedDate = format(new Date(operazione.data + 'T12:00:00'), 'EEEE d MMMM yyyy', { locale: it });
    formattedDate = formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1);
  } catch { /* fallback */ }

  // Calcolo R:R se disponibili SL e TP
  const riskReward = operazione.stop_loss && operazione.take_profit && operazione.prezzo_entrata
    ? Math.abs(operazione.take_profit - operazione.prezzo_entrata) / Math.abs(operazione.prezzo_entrata - operazione.stop_loss)
    : null;

  // Price movement calculation
  const priceChange = operazione.prezzo_entrata && operazione.prezzo_uscita
    ? operazione.prezzo_uscita - operazione.prezzo_entrata
    : null;
  const priceChangePct = priceChange && operazione.prezzo_entrata
    ? (priceChange / operazione.prezzo_entrata) * 100
    : null;

  return (
    <div className="p-4 md:p-6 space-y-4 min-h-screen relative">
      {/* Compact Header */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push('/registro')}
            className="text-violet-600 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-500/10 rounded-xl h-9 w-9"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>

          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">
                {operazione.ticker}
              </h1>
              <Badge
                className={cn(
                  'text-[10px] font-bold px-1.5 py-0.5 rounded-md',
                  isLong
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                    : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                )}
              >
                {isLong ? <TrendingUp className="h-3 w-3 mr-0.5 inline" /> : <TrendingDown className="h-3 w-3 mr-0.5 inline" />}
                {operazione.direzione}
              </Badge>
              <span className={cn(
                'text-lg font-bold tabular-nums',
                isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
              )}>
                {isPositive ? '+' : ''}{formatValuta(pnl)}
              </span>
              {operazione.pnl_percentuale != null && (
                <span className={cn(
                  'text-xs font-semibold tabular-nums',
                  isPositive ? 'text-emerald-500/70 dark:text-emerald-400/60' : 'text-red-500/70 dark:text-red-400/60'
                )}>
                  ({isPositive ? '+' : ''}{operazione.pnl_percentuale.toFixed(2)}%)
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              {formattedDate}
              {operazione.ora_entrata && (
                <span className="font-mono ml-2 text-gray-400 dark:text-gray-500">
                  {operazione.ora_entrata}
                  {operazione.ora_uscita && ` → ${operazione.ora_uscita}`}
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Navigation */}
        {sameDayOps.length > 1 && (
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-gray-400 dark:text-gray-500 font-medium tabular-nums hidden sm:inline">
              {currentIndex + 1}/{sameDayOps.length} oggi
            </span>
            <div className="flex items-center bg-gray-100 dark:bg-[#1e1e30] rounded-lg p-0.5">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 rounded-md"
                disabled={!prevOp}
                onClick={() => prevOp && router.push(`/analisi/${prevOp.id}`)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 rounded-md"
                disabled={!nextOp}
                onClick={() => nextOp && router.push(`/analisi/${nextOp.id}`)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </motion.div>

      {/* Main Content: Chart + Sidebar */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] lg:grid-cols-[1fr_280px] gap-4">
        {/* Chart — prende tutto lo spazio disponibile */}
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="min-w-0"
        >
          <KlineChartComponent
            ticker={operazione.ticker}
            tradeDate={operazione.data}
            trade={{
              entryPrice: operazione.prezzo_entrata,
              exitPrice: operazione.prezzo_uscita,
              entryTime: operazione.ora_entrata,
              exitTime: operazione.ora_uscita,
              direction: operazione.direzione,
              stopLoss: operazione.stop_loss,
              takeProfit: operazione.take_profit,
              pnl: operazione.pnl,
              quantity: operazione.quantita,
            }}
            height="500px"
          />
        </motion.div>

        {/* Sidebar */}
        <motion.div
          variants={stagger}
          initial="initial"
          animate="animate"
          className="space-y-3"
        >
          {/* P&L Summary mini card */}
          <motion.div variants={fadeRight}>
            <div className={cn(
              'rounded-xl border shadow-sm overflow-hidden p-3',
              isPositive
                ? 'bg-gradient-to-br from-emerald-50 to-emerald-50/30 dark:from-emerald-900/15 dark:to-emerald-900/5 border-emerald-200/60 dark:border-emerald-500/20'
                : 'bg-gradient-to-br from-red-50 to-red-50/30 dark:from-red-900/15 dark:to-red-900/5 border-red-200/60 dark:border-red-500/20'
            )}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Risultato</p>
                  <p className={cn(
                    'text-2xl font-bold tabular-nums tracking-tight mt-0.5',
                    isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
                  )}>
                    {isPositive ? '+' : ''}{formatValuta(pnl)}
                  </p>
                </div>
                <div className={cn(
                  'flex items-center justify-center w-10 h-10 rounded-xl',
                  isPositive
                    ? 'bg-emerald-100 dark:bg-emerald-500/15'
                    : 'bg-red-100 dark:bg-red-500/15'
                )}>
                  {isPositive
                    ? <ArrowUpRight className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                    : <ArrowDownRight className="h-5 w-5 text-red-600 dark:text-red-400" />
                  }
                </div>
              </div>
              {(operazione.pnl_percentuale != null || priceChangePct != null) && (
                <div className="flex items-center gap-3 mt-2 pt-2 border-t border-gray-200/50 dark:border-white/5">
                  {operazione.pnl_percentuale != null && (
                    <span className={cn(
                      'text-xs font-semibold tabular-nums',
                      isPositive ? 'text-emerald-600/80 dark:text-emerald-400/70' : 'text-red-600/80 dark:text-red-400/70'
                    )}>
                      {isPositive ? '+' : ''}{operazione.pnl_percentuale.toFixed(2)}% portafoglio
                    </span>
                  )}
                  {priceChangePct != null && (
                    <span className="text-[10px] text-gray-400 dark:text-gray-500 tabular-nums">
                      {priceChangePct >= 0 ? '+' : ''}{priceChangePct.toFixed(2)}% prezzo
                    </span>
                  )}
                </div>
              )}
            </div>
          </motion.div>

          {/* Trade Details — compact grid */}
          <motion.div variants={fadeRight}>
            <div className="rounded-xl border border-gray-200 dark:border-violet-500/20 bg-white dark:bg-[#1e1e30] shadow-sm overflow-hidden">
              <div className="px-4 pt-3 pb-2">
                <h3 className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Dettagli Trade</h3>
              </div>
              <div className="px-4 pb-3 space-y-2">
                {/* Entry/Exit prices side-by-side */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2.5 rounded-lg bg-gray-50 dark:bg-[#161622] border border-gray-100 dark:border-violet-500/10">
                    <div className="flex items-center gap-1 mb-1">
                      <Crosshair className="h-3 w-3 text-emerald-500" />
                      <span className="text-[10px] font-medium text-gray-400">Entrata</span>
                    </div>
                    <p className="text-sm font-mono font-bold text-gray-900 dark:text-white">
                      ${operazione.prezzo_entrata?.toFixed(2)}
                    </p>
                    {operazione.ora_entrata && (
                      <p className="text-[9px] font-mono text-gray-400 mt-0.5">{operazione.ora_entrata}</p>
                    )}
                  </div>
                  <div className="p-2.5 rounded-lg bg-gray-50 dark:bg-[#161622] border border-gray-100 dark:border-violet-500/10">
                    <div className="flex items-center gap-1 mb-1">
                      <Target className="h-3 w-3 text-violet-500" />
                      <span className="text-[10px] font-medium text-gray-400">Uscita</span>
                    </div>
                    <p className="text-sm font-mono font-bold text-gray-900 dark:text-white">
                      {operazione.prezzo_uscita ? `$${operazione.prezzo_uscita.toFixed(2)}` : '—'}
                    </p>
                    {operazione.ora_uscita && (
                      <p className="text-[9px] font-mono text-gray-400 mt-0.5">{operazione.ora_uscita}</p>
                    )}
                  </div>
                </div>

                {/* Key metrics row */}
                <div className="grid grid-cols-2 gap-2">
                  {/* Quantity */}
                  <div className="flex items-center justify-between py-1.5 px-2 rounded-lg bg-gray-50/50 dark:bg-[#161622]/50">
                    <div className="flex items-center gap-1.5 text-gray-400 dark:text-gray-500">
                      <Hash className="h-3 w-3" />
                      <span className="text-[10px]">Qty</span>
                    </div>
                    <span className="text-[11px] font-mono font-semibold text-gray-900 dark:text-white">{operazione.quantita}</span>
                  </div>

                  {/* Duration */}
                  {operazione.durata_minuti != null && operazione.durata_minuti > 0 && (
                    <div className="flex items-center justify-between py-1.5 px-2 rounded-lg bg-gray-50/50 dark:bg-[#161622]/50">
                      <div className="flex items-center gap-1.5 text-gray-400 dark:text-gray-500">
                        <Clock className="h-3 w-3" />
                        <span className="text-[10px]">Durata</span>
                      </div>
                      <span className="text-[11px] font-mono font-semibold text-gray-900 dark:text-white">
                        {operazione.durata_minuti >= 60
                          ? `${Math.floor(operazione.durata_minuti / 60)}h ${operazione.durata_minuti % 60}m`
                          : `${operazione.durata_minuti}m`
                        }
                      </span>
                    </div>
                  )}
                </div>

                {/* SL / TP / R:R / Commissions */}
                <div className="space-y-0.5 pt-1 border-t border-gray-100 dark:border-violet-500/10">
                  {operazione.stop_loss && (
                    <div className="flex items-center justify-between py-1.5">
                      <div className="flex items-center gap-1.5 text-gray-400 dark:text-gray-500">
                        <ShieldAlert className="h-3 w-3 text-red-400" />
                        <span className="text-[10px]">Stop Loss</span>
                      </div>
                      <span className="text-[11px] font-mono font-medium text-red-500">${operazione.stop_loss.toFixed(2)}</span>
                    </div>
                  )}
                  {operazione.take_profit && (
                    <div className="flex items-center justify-between py-1.5">
                      <div className="flex items-center gap-1.5 text-gray-400 dark:text-gray-500">
                        <TrendingUp className="h-3 w-3 text-emerald-400" />
                        <span className="text-[10px]">Take Profit</span>
                      </div>
                      <span className="text-[11px] font-mono font-medium text-emerald-500">${operazione.take_profit.toFixed(2)}</span>
                    </div>
                  )}
                  {riskReward && (
                    <div className="flex items-center justify-between py-1.5">
                      <div className="flex items-center gap-1.5 text-gray-400 dark:text-gray-500">
                        <Target className="h-3 w-3 text-violet-400" />
                        <span className="text-[10px]">Risk/Reward</span>
                      </div>
                      <Badge variant="outline" className="text-[10px] font-mono font-bold px-1.5 h-5 text-violet-600 dark:text-violet-400 border-violet-200 dark:border-violet-500/30">
                        {riskReward.toFixed(1)}:1
                      </Badge>
                    </div>
                  )}
                  {operazione.commissione > 0 && (
                    <div className="flex items-center justify-between py-1.5">
                      <div className="flex items-center gap-1.5 text-gray-400 dark:text-gray-500">
                        <DollarSign className="h-3 w-3 text-amber-400" />
                        <span className="text-[10px]">Commissioni</span>
                      </div>
                      <span className="text-[11px] font-mono font-medium text-amber-600 dark:text-amber-400">-{formatValuta(operazione.commissione)}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between py-1.5">
                    <span className="text-[10px] text-gray-400 dark:text-gray-500">Stato</span>
                    <Badge variant="outline" className="text-[9px] h-5 px-1.5 font-medium">{operazione.stato}</Badge>
                  </div>
                  {operazione.broker && (
                    <div className="flex items-center justify-between py-1.5">
                      <span className="text-[10px] text-gray-400 dark:text-gray-500">Broker</span>
                      <span className="text-[11px] font-medium text-gray-700 dark:text-gray-300">{operazione.broker}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>

          {/* Unified Strategia + Regole/Condizioni Card */}
          <motion.div variants={fadeRight}>
            <div className="rounded-xl border border-gray-200 dark:border-violet-500/20 bg-white dark:bg-[#1e1e30] shadow-sm overflow-hidden">
              {/* Strategy header + selector */}
              <div className="px-4 pt-3 pb-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                    Strategia & Regole
                  </h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-[10px] text-violet-600 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-500/10"
                    onClick={() => setShowStrategiaSelector(!showStrategiaSelector)}
                  >
                    {showStrategiaSelector ? <X className="h-3 w-3" /> : <BookOpen className="h-3 w-3" />}
                    <span className="ml-1">{showStrategiaSelector ? 'Chiudi' : strategia ? 'Cambia' : 'Associa'}</span>
                  </Button>
                </div>
              </div>

              <div className="px-4 pb-3 space-y-2">
                {/* Current strategia display */}
                {strategia && !showStrategiaSelector && (
                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-gray-50 dark:bg-[#161622] border border-gray-100 dark:border-violet-500/10">
                    <div className="flex items-center gap-2.5">
                      <div
                        className="w-3 h-3 rounded-full shadow-sm"
                        style={{
                          backgroundColor: strategia.colore || '#8b5cf6',
                          boxShadow: `0 0 0 2px white, 0 0 0 3px ${strategia.colore || '#8b5cf6'}40`,
                        }}
                      />
                      <span className="text-sm font-semibold text-gray-900 dark:text-white">{strategia.nome}</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-gray-400 hover:text-red-500"
                      onClick={() => handleAssociaStrategia(null)}
                      disabled={savingStrategia}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                )}

                {!strategia && !showStrategiaSelector && (
                  <p className="text-xs text-gray-400 dark:text-gray-500 italic py-1">
                    Nessuna strategia associata
                  </p>
                )}

                {/* Strategy selector dropdown */}
                <AnimatePresence>
                  {showStrategiaSelector && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="space-y-1 max-h-48 overflow-y-auto">
                        {loadingStrategie ? (
                          <p className="text-xs text-gray-400 py-2 text-center">Caricamento...</p>
                        ) : strategie.length === 0 ? (
                          <div className="text-center py-3">
                            <p className="text-xs text-gray-400 mb-2">Nessuna strategia nel playbook</p>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-xs h-7"
                              onClick={() => router.push('/playbook')}
                            >
                              Vai al Playbook
                            </Button>
                          </div>
                        ) : (
                          <>
                            {strategie.map((strat) => {
                              const isSelected = operazione.strategia_id === strat.id;
                              return (
                                <button
                                  key={strat.id}
                                  onClick={() => handleAssociaStrategia(strat.id)}
                                  disabled={savingStrategia}
                                  className={cn(
                                    'w-full flex items-center justify-between p-2 rounded-lg text-left transition-all duration-150',
                                    isSelected
                                      ? 'bg-violet-50 dark:bg-violet-500/10 border border-violet-200 dark:border-violet-500/30'
                                      : 'hover:bg-gray-50 dark:hover:bg-[#161622] border border-transparent'
                                  )}
                                >
                                  <div className="flex items-center gap-2">
                                    <div
                                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                                      style={{ backgroundColor: strat.colore || '#8b5cf6' }}
                                    />
                                    <span className="text-xs font-medium text-gray-900 dark:text-white">
                                      {strat.nome}
                                    </span>
                                    {strat.winRate != null && (
                                      <span className="text-[10px] text-gray-400">
                                        {strat.winRate.toFixed(0)}% WR
                                      </span>
                                    )}
                                  </div>
                                  {isSelected && <Check className="h-3.5 w-3.5 text-violet-600" />}
                                </button>
                              );
                            })}
                            {operazione.strategia_id && (
                              <button
                                onClick={() => handleAssociaStrategia(null)}
                                disabled={savingStrategia}
                                className="w-full flex items-center gap-2 p-2 rounded-lg text-left hover:bg-red-50 dark:hover:bg-red-900/10 border border-transparent transition-all duration-150"
                              >
                                <X className="h-3 w-3 text-red-500" />
                                <span className="text-xs text-red-500 font-medium">Rimuovi strategia</span>
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Divider + Rules section (if strategy is set) */}
                {operazione.strategia_id && !showStrategiaSelector && (
                  <>
                    <div className="border-t border-gray-100 dark:border-violet-500/10 my-1" />
                    <AderenzaRegoleInline
                      operazioneId={operazione.id}
                      strategiaId={operazione.strategia_id}
                    />
                  </>
                )}
              </div>
            </div>
          </motion.div>

          {/* Notes Card — below strategy */}
          <motion.div variants={fadeRight}>
            <div className="rounded-xl border border-gray-200 dark:border-violet-500/20 bg-white dark:bg-[#1e1e30] shadow-sm overflow-hidden">
              <div className="px-4 pt-3 pb-2 flex items-center justify-between">
                <h3 className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Note</h3>
                <AnimatePresence mode="wait">
                  {savingNote && (
                    <motion.span
                      key="saving"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="text-[10px] text-violet-500 flex items-center gap-1"
                    >
                      <Save className="h-3 w-3 animate-pulse" /> Salvando...
                    </motion.span>
                  )}
                  {noteSaved && !savingNote && (
                    <motion.span
                      key="saved"
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0 }}
                      className="text-[10px] text-emerald-500 flex items-center gap-1"
                    >
                      <Check className="h-3 w-3" /> Salvato
                    </motion.span>
                  )}
                  {!savingNote && !noteSaved && note !== (operazione.note || '') && (
                    <motion.span
                      key="unsaved"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="text-[10px] text-amber-500 dark:text-amber-400/70"
                    >
                      Non salvato
                    </motion.span>
                  )}
                </AnimatePresence>
              </div>
              <div className="px-4 pb-3 space-y-1.5">
                <Textarea
                  placeholder="Cosa hai fatto bene? Cosa puoi migliorare?"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  onBlur={saveNote}
                  onKeyDown={(e) => {
                    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                      e.preventDefault();
                      saveNote();
                    }
                  }}
                  className="min-h-[100px] text-xs bg-gray-50 dark:bg-[#161622] border-gray-200 dark:border-violet-500/10 resize-none rounded-lg focus:ring-violet-500/30 placeholder:text-gray-300 dark:placeholder:text-gray-600"
                />
                <p className="text-[9px] text-gray-300 dark:text-gray-600">
                  Salvataggio automatico al click fuori, oppure <kbd className="px-1 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 font-mono">Ctrl+Enter</kbd>
                </p>
              </div>
            </div>
          </motion.div>

          {/* Tags */}
          {operazione.tags && operazione.tags.length > 0 && (
            <motion.div variants={fadeRight}>
              <div className="rounded-xl border border-gray-200 dark:border-violet-500/20 bg-white dark:bg-[#1e1e30] shadow-sm overflow-hidden">
                <div className="px-4 pt-3 pb-2">
                  <h3 className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Tag</h3>
                </div>
                <div className="px-4 pb-3">
                  <div className="flex flex-wrap gap-1.5">
                    {operazione.tags.map((tag: any) => (
                      <Badge
                        key={tag.id}
                        variant="outline"
                        className="text-[10px] font-medium rounded-md"
                        style={{
                          borderColor: tag.colore ? `${tag.colore}40` : undefined,
                          color: tag.colore || undefined,
                          backgroundColor: tag.colore ? `${tag.colore}10` : undefined,
                        }}
                      >
                        {tag.nome}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </motion.div>
      </div>
    </div>
  );
}

// ─── Inline Aderenza Regole (no Card wrapper — lives inside Strategia card) ──
const GROUP_CONFIG: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  entry: { label: 'Condizioni di Ingresso', icon: <TrendingUp className="h-3 w-3" />, color: 'text-blue-600 dark:text-blue-400' },
  stop_loss: { label: 'Stop Loss', icon: <Shield className="h-3 w-3" />, color: 'text-red-600 dark:text-red-400' },
  take_profit: { label: 'Take Profit', icon: <Target className="h-3 w-3" />, color: 'text-green-600 dark:text-green-400' },
  condizioni_mercato: { label: 'Condizioni di Mercato', icon: <BarChart2 className="h-3 w-3" />, color: 'text-violet-600 dark:text-violet-400' },
};

function getGroupLabel(groupKey: string) {
  const cfg = GROUP_CONFIG[groupKey];
  if (cfg) return cfg;
  return {
    label: groupKey.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
    icon: <BookOpen className="h-3 w-3" />,
    color: 'text-gray-600 dark:text-gray-400',
  };
}

function AderenzaRegoleInline({ operazioneId, strategiaId }: { operazioneId: string; strategiaId: string }) {
  const { aderenza, loading, toggleRegola } = useConformitaRegole(operazioneId, strategiaId);
  const [expanded, setExpanded] = React.useState(true);

  if (loading && !aderenza) {
    return <p className="text-xs text-gray-400 animate-pulse text-center py-2">Caricamento regole...</p>;
  }

  if (!aderenza || aderenza.totali === 0) {
    return <p className="text-xs text-gray-400 dark:text-gray-500 italic py-1">Nessuna regola definita</p>;
  }

  const regoleByGruppo: Record<string, typeof aderenza.regole> = {};
  aderenza.regole.forEach((r) => {
    const g = r.gruppo || 'entry';
    if (!regoleByGruppo[g]) regoleByGruppo[g] = [];
    regoleByGruppo[g].push(r);
  });

  const confMap = new Map(aderenza.conformita.map((c) => [c.regola_id, c]));

  const pct = aderenza.percentuale;
  const pctColor = pct >= 80 ? 'text-emerald-600 dark:text-emerald-400' : pct >= 50 ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400';
  const barColor = pct >= 80 ? 'bg-emerald-500' : pct >= 50 ? 'bg-amber-500' : 'bg-red-500';

  return (
    <div className="space-y-2">
      {/* Adherence header */}
      <div
        className="flex items-center justify-between cursor-pointer py-1"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-1.5">
          <BookOpen className="h-3 w-3 text-violet-500" />
          <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Aderenza Regole</span>
        </div>
        <div className="flex items-center gap-2">
          <span className={cn('text-xs font-bold tabular-nums', pctColor)}>
            {pct}%
          </span>
          <span className="text-[10px] text-gray-400">
            {aderenza.rispettate}/{aderenza.totali}
          </span>
          {expanded ? <ChevronUp className="h-3 w-3 text-gray-400" /> : <ChevronDown className="h-3 w-3 text-gray-400" />}
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-full h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all duration-500', barColor)}
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* Expandable rules list */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden space-y-2.5"
          >
            {Object.entries(regoleByGruppo).map(([gruppo, regole]) => {
              const cfg = getGroupLabel(gruppo);
              return (
                <div key={gruppo}>
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className={cfg.color}>{cfg.icon}</span>
                    <span className={cn('text-[10px] font-bold uppercase tracking-wider', cfg.color)}>
                      {cfg.label}
                    </span>
                  </div>
                  <div className="space-y-1">
                    {regole.map((regola) => {
                      const conf = confMap.get(regola.id);
                      const isChecked = conf?.rispettata === true;

                      return (
                        <button
                          key={regola.id}
                          onClick={() => toggleRegola(regola.id, !isChecked)}
                          className={cn(
                            'w-full flex items-center gap-2 p-2 rounded-lg border text-left transition-all duration-150',
                            isChecked
                              ? 'bg-emerald-50/50 dark:bg-emerald-500/5 border-emerald-200 dark:border-emerald-500/20'
                              : 'bg-gray-50/50 dark:bg-[#161622]/30 border-gray-100 dark:border-gray-800 hover:border-gray-200 dark:hover:border-gray-700'
                          )}
                        >
                          <div className={cn(
                            'w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-all',
                            isChecked
                              ? 'bg-emerald-500 border-emerald-500 text-white'
                              : 'border-gray-300 dark:border-gray-600'
                          )}>
                            {isChecked && (
                              <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </div>
                          <span className={cn(
                            'text-xs font-medium flex-1',
                            isChecked ? 'text-gray-800 dark:text-white' : 'text-gray-500 dark:text-gray-400'
                          )}>
                            {regola.descrizione}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
