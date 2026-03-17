'use client';

import { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { KlineChartComponent } from '@/components/charts/trade-chart';
import { useOperazioni } from '@/hooks/useOperazioni';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Clock,
  DollarSign,
  Target,
  ShieldAlert,
  Crosshair,
  Hash,
} from 'lucide-react';
import { formatValuta, cn } from '@/lib/utils';
import { format } from 'date-fns';
import { it } from 'date-fns/locale/it';

export default function AnalisiOperazionePage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const { operazioni, modificaOperazione } = useOperazioni();
  const [note, setNote] = useState('');
  const [savingNote, setSavingNote] = useState(false);

  // Find the current operation
  const operazione = useMemo(
    () => operazioni.find((op) => op.id === id),
    [operazioni, id]
  );

  // Find same-day operations for navigation
  const sameDayOps = useMemo(() => {
    if (!operazione) return [];
    return operazioni
      .filter((op) => op.data === operazione.data)
      .sort((a, b) => (a.ora_entrata || '').localeCompare(b.ora_entrata || ''));
  }, [operazioni, operazione]);

  const currentIndex = sameDayOps.findIndex((op) => op.id === id);
  const prevOp = currentIndex > 0 ? sameDayOps[currentIndex - 1] : null;
  const nextOp = currentIndex < sameDayOps.length - 1 ? sameDayOps[currentIndex + 1] : null;

  // Set note from operation
  useEffect(() => {
    if (operazione?.note) {
      setNote(operazione.note);
    }
  }, [operazione?.note]);

  // Save note with debounce
  const saveNote = async () => {
    if (!operazione || note === operazione.note) return;
    setSavingNote(true);
    try {
      await modificaOperazione(operazione.id, { note });
    } finally {
      setSavingNote(false);
    }
  };

  if (!operazione) {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-[60vh]">
        <p className="text-gray-500 dark:text-gray-400 mb-4">Operazione non trovata</p>
        <Button variant="outline" onClick={() => router.push('/registro')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Torna al Registro
        </Button>
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

  return (
    <div className="p-4 md:p-6 space-y-4 min-h-screen cyber-grid-lines">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push('/registro')}
            className="text-violet-600 dark:text-violet-400"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">
                {operazione.ticker}
              </h1>
              <Badge variant={isLong ? 'success' : 'destructive'} className="text-xs">
                {operazione.direzione}
              </Badge>
              <span className={cn(
                'text-lg font-bold',
                isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
              )}>
                {isPositive ? '+' : ''}{formatValuta(pnl)}
              </span>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {formattedDate}
              {operazione.ora_entrata && ` · ${operazione.ora_entrata}`}
              {operazione.ora_uscita && ` → ${operazione.ora_uscita}`}
            </p>
          </div>
        </div>

        {/* Navigation between same-day trades */}
        {sameDayOps.length > 1 && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {currentIndex + 1}/{sameDayOps.length}
            </span>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              disabled={!prevOp}
              onClick={() => prevOp && router.push(`/analisi/${prevOp.id}`)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              disabled={!nextOp}
              onClick={() => nextOp && router.push(`/analisi/${nextOp.id}`)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </motion.div>

      {/* Main Content: Chart + Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Chart - takes 3/4 */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
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
            height="500px"
          />
        </motion.div>

        {/* Sidebar - takes 1/4 */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-4"
        >
          {/* Trade Details Card */}
          <Card className="border-gray-200 dark:border-violet-500/20 bg-white dark:bg-[#1e1e30]">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold text-gray-900 dark:text-white">Dettagli</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Entry/Exit */}
              <div className="grid grid-cols-2 gap-2">
                <div className="p-2 rounded-lg bg-gray-50 dark:bg-[#161622]">
                  <div className="flex items-center gap-1 mb-1">
                    <Crosshair className="h-3 w-3 text-emerald-500" />
                    <span className="text-[10px] text-gray-500 dark:text-gray-400">Entrata</span>
                  </div>
                  <p className="text-sm font-mono font-bold text-gray-900 dark:text-white">
                    {operazione.prezzo_entrata?.toFixed(2)}
                  </p>
                </div>
                <div className="p-2 rounded-lg bg-gray-50 dark:bg-[#161622]">
                  <div className="flex items-center gap-1 mb-1">
                    <Target className="h-3 w-3 text-violet-500" />
                    <span className="text-[10px] text-gray-500 dark:text-gray-400">Uscita</span>
                  </div>
                  <p className="text-sm font-mono font-bold text-gray-900 dark:text-white">
                    {operazione.prezzo_uscita?.toFixed(2) || '-'}
                  </p>
                </div>
              </div>

              {/* P&L */}
              <div className={cn(
                'p-3 rounded-lg',
                isPositive ? 'bg-emerald-50 dark:bg-emerald-900/20' : 'bg-red-50 dark:bg-red-900/20'
              )}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <DollarSign className={cn('h-4 w-4', isPositive ? 'text-emerald-600' : 'text-red-600')} />
                    <span className="text-xs text-gray-600 dark:text-gray-400">P&L</span>
                  </div>
                  <span className={cn(
                    'text-lg font-bold',
                    isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
                  )}>
                    {isPositive ? '+' : ''}{formatValuta(pnl)}
                  </span>
                </div>
                {operazione.pnl_percentuale != null && (
                  <p className={cn(
                    'text-xs mt-1 text-right',
                    isPositive ? 'text-emerald-600/70' : 'text-red-600/70'
                  )}>
                    {operazione.pnl_percentuale.toFixed(2)}%
                  </p>
                )}
              </div>

              {/* Other details */}
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400">
                    <Hash className="h-3 w-3" />
                    <span className="text-xs">Quantita</span>
                  </div>
                  <span className="font-mono font-medium text-gray-900 dark:text-white text-xs">{operazione.quantita}</span>
                </div>

                {operazione.commissione > 0 && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400">
                      <DollarSign className="h-3 w-3" />
                      <span className="text-xs">Commissione</span>
                    </div>
                    <span className="font-mono text-xs text-red-500">-{formatValuta(operazione.commissione)}</span>
                  </div>
                )}

                {operazione.stop_loss && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400">
                      <ShieldAlert className="h-3 w-3" />
                      <span className="text-xs">Stop Loss</span>
                    </div>
                    <span className="font-mono text-xs text-red-500">{operazione.stop_loss.toFixed(2)}</span>
                  </div>
                )}

                {operazione.take_profit && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400">
                      <TrendingUp className="h-3 w-3" />
                      <span className="text-xs">Take Profit</span>
                    </div>
                    <span className="font-mono text-xs text-emerald-500">{operazione.take_profit.toFixed(2)}</span>
                  </div>
                )}

                {operazione.durata_minuti && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400">
                      <Clock className="h-3 w-3" />
                      <span className="text-xs">Durata</span>
                    </div>
                    <span className="text-xs font-medium text-gray-900 dark:text-white">
                      {operazione.durata_minuti}min
                    </span>
                  </div>
                )}

                {strategia && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500 dark:text-gray-400">Strategia</span>
                    <Badge
                      variant="secondary"
                      className="text-xs"
                      style={{
                        backgroundColor: strategia.colore ? `${strategia.colore}20` : undefined,
                        color: strategia.colore || undefined,
                      }}
                    >
                      {strategia.nome}
                    </Badge>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500 dark:text-gray-400">Stato</span>
                  <Badge variant="outline" className="text-xs">{operazione.stato}</Badge>
                </div>

                {operazione.broker && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500 dark:text-gray-400">Broker</span>
                    <span className="text-xs font-medium text-gray-900 dark:text-white">{operazione.broker}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Notes Card */}
          <Card className="border-gray-200 dark:border-violet-500/20 bg-white dark:bg-[#1e1e30]">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold text-gray-900 dark:text-white">Note</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="Aggiungi note sull'operazione..."
                value={note}
                onChange={(e) => setNote(e.target.value)}
                onBlur={saveNote}
                className="min-h-[100px] text-sm bg-gray-50 dark:bg-[#161622] border-gray-200 dark:border-violet-500/20 resize-none"
              />
              {savingNote && (
                <p className="text-xs text-violet-500 mt-1">Salvando...</p>
              )}
            </CardContent>
          </Card>

          {/* Tags */}
          {operazione.tags && operazione.tags.length > 0 && (
            <Card className="border-gray-200 dark:border-violet-500/20 bg-white dark:bg-[#1e1e30]">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-bold text-gray-900 dark:text-white">Tag</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-1.5">
                  {operazione.tags.map((tag: any) => (
                    <Badge key={tag.id} variant="outline" className="text-xs">
                      {tag.nome}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </motion.div>
      </div>
    </div>
  );
}
