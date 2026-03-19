'use client';

import { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { KlineChartComponent } from '@/components/charts/kline-chart';
import { useOperazioni } from '@/hooks/useOperazioni';
import { usePlaybook } from '@/hooks/usePlaybook';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
} from 'lucide-react';
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
  } catch {}

  // Calcolo R:R se disponibili SL e TP
  const riskReward = operazione.stop_loss && operazione.take_profit && operazione.prezzo_entrata
    ? Math.abs(operazione.take_profit - operazione.prezzo_entrata) / Math.abs(operazione.prezzo_entrata - operazione.stop_loss)
    : null;

  return (
    <div className="p-4 md:p-6 space-y-5 min-h-screen">
      {/* Header */}
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
            className="text-violet-600 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-500/10 rounded-xl"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>

          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
                {operazione.ticker}
              </h1>
              <Badge
                className={cn(
                  'text-xs font-bold px-2 py-0.5 rounded-md',
                  isLong
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                    : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                )}
              >
                {isLong ? <TrendingUp className="h-3 w-3 mr-1 inline" /> : <TrendingDown className="h-3 w-3 mr-1 inline" />}
                {operazione.direzione}
              </Badge>
              <span className={cn(
                'text-xl font-bold tabular-nums',
                isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
              )}>
                {isPositive ? '+' : ''}{formatValuta(pnl)}
              </span>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
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
            <span className="text-xs text-gray-500 dark:text-gray-400 font-medium tabular-nums">
              {currentIndex + 1} / {sameDayOps.length}
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
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
        {/* Chart */}
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="lg:col-span-3"
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
            height="520px"
          />
        </motion.div>

        {/* Sidebar */}
        <motion.div
          variants={stagger}
          initial="initial"
          animate="animate"
          className="space-y-4"
        >
          {/* P&L Hero Card */}
          <motion.div variants={fadeRight}>
            <Card className={cn(
              'border-0 shadow-md overflow-hidden',
              isPositive
                ? 'bg-gradient-to-br from-emerald-50 to-emerald-100/50 dark:from-emerald-900/20 dark:to-emerald-900/5'
                : 'bg-gradient-to-br from-red-50 to-red-100/50 dark:from-red-900/20 dark:to-red-900/5'
            )}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">P&L</span>
                  {operazione.pnl_percentuale != null && (
                    <Badge className={cn(
                      'text-[10px] font-bold rounded-md',
                      isPositive
                        ? 'bg-emerald-200/60 text-emerald-700 dark:bg-emerald-800/40 dark:text-emerald-300'
                        : 'bg-red-200/60 text-red-700 dark:bg-red-800/40 dark:text-red-300'
                    )}>
                      {isPositive ? '+' : ''}{operazione.pnl_percentuale.toFixed(2)}%
                    </Badge>
                  )}
                </div>
                <p className={cn(
                  'text-2xl font-bold tabular-nums',
                  isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
                )}>
                  {isPositive ? '+' : ''}{formatValuta(pnl)}
                </p>
                {riskReward && (
                  <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-1">
                    R:R {riskReward.toFixed(1)}:1
                  </p>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Trade Details */}
          <motion.div variants={fadeRight}>
            <Card className="border-gray-200 dark:border-violet-500/20 bg-white dark:bg-[#1e1e30] shadow-sm">
              <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Dettagli Trade
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 px-4 pb-4">
                {/* Entry/Exit prices */}
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

                {/* Stats list */}
                <div className="space-y-2">
                  <DetailRow icon={Hash} label="Quantita" value={String(operazione.quantita)} />

                  {operazione.commissione > 0 && (
                    <DetailRow
                      icon={DollarSign}
                      label="Commissioni"
                      value={`-${formatValuta(operazione.commissione)}`}
                      valueColor="text-red-500"
                    />
                  )}

                  {operazione.stop_loss && (
                    <DetailRow
                      icon={ShieldAlert}
                      label="Stop Loss"
                      value={`$${operazione.stop_loss.toFixed(2)}`}
                      valueColor="text-red-500"
                    />
                  )}

                  {operazione.take_profit && (
                    <DetailRow
                      icon={TrendingUp}
                      label="Take Profit"
                      value={`$${operazione.take_profit.toFixed(2)}`}
                      valueColor="text-emerald-500"
                    />
                  )}

                  {operazione.durata_minuti != null && operazione.durata_minuti > 0 && (
                    <DetailRow
                      icon={Clock}
                      label="Durata"
                      value={operazione.durata_minuti >= 60
                        ? `${Math.floor(operazione.durata_minuti / 60)}h ${operazione.durata_minuti % 60}m`
                        : `${operazione.durata_minuti}m`
                      }
                    />
                  )}

                  <DetailRow label="Stato" value={operazione.stato} />

                  {operazione.broker && (
                    <DetailRow label="Broker" value={operazione.broker} />
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Strategia Card */}
          <motion.div variants={fadeRight}>
            <Card className="border-gray-200 dark:border-violet-500/20 bg-white dark:bg-[#1e1e30] shadow-sm">
              <CardHeader className="pb-2 pt-4 px-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Strategia
                  </CardTitle>
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
              </CardHeader>
              <CardContent className="px-4 pb-4">
                {/* Current strategia */}
                {strategia && !showStrategiaSelector && (
                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-gray-50 dark:bg-[#161622] border border-gray-100 dark:border-violet-500/10">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: strategia.colore || '#8b5cf6' }}
                      />
                      <span className="text-sm font-medium text-gray-900 dark:text-white">{strategia.nome}</span>
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
                  <p className="text-xs text-gray-400 dark:text-gray-500 italic">
                    Nessuna strategia associata
                  </p>
                )}

                {/* Selector */}
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

                            {/* Remove strategy option */}
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
              </CardContent>
            </Card>
          </motion.div>

          {/* Notes Card */}
          <motion.div variants={fadeRight}>
            <Card className="border-gray-200 dark:border-violet-500/20 bg-white dark:bg-[#1e1e30] shadow-sm">
              <CardHeader className="pb-2 pt-4 px-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Note
                  </CardTitle>
                  <AnimatePresence mode="wait">
                    {savingNote && (
                      <motion.span
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
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0 }}
                        className="text-[10px] text-emerald-500 flex items-center gap-1"
                      >
                        <Check className="h-3 w-3" /> Salvato
                      </motion.span>
                    )}
                  </AnimatePresence>
                </div>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <Textarea
                  placeholder="Aggiungi note sull'operazione... Cosa hai fatto bene? Cosa puoi migliorare?"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  onBlur={saveNote}
                  className="min-h-[90px] text-sm bg-gray-50 dark:bg-[#161622] border-gray-200 dark:border-violet-500/10 resize-none rounded-lg focus:ring-violet-500/30"
                />
              </CardContent>
            </Card>
          </motion.div>

          {/* Tags */}
          {operazione.tags && operazione.tags.length > 0 && (
            <motion.div variants={fadeRight}>
              <Card className="border-gray-200 dark:border-violet-500/20 bg-white dark:bg-[#1e1e30] shadow-sm">
                <CardHeader className="pb-2 pt-4 px-4">
                  <CardTitle className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Tag
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4">
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
                </CardContent>
              </Card>
            </motion.div>
          )}
        </motion.div>
      </div>
    </div>
  );
}

// ─── Detail Row Component ────────────────────────────────────────────
function DetailRow({
  icon: Icon,
  label,
  value,
  valueColor,
}: {
  icon?: any;
  label: string;
  value: string;
  valueColor?: string;
}) {
  return (
    <div className="flex items-center justify-between py-1">
      <div className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400">
        {Icon && <Icon className="h-3 w-3" />}
        <span className="text-[11px]">{label}</span>
      </div>
      <span className={cn('text-[11px] font-mono font-medium text-gray-900 dark:text-white', valueColor)}>
        {value}
      </span>
    </div>
  );
}
