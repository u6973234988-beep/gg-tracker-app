'use client';

import { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useOperazioni } from '@/hooks/useOperazioni';
import { usePlaybook } from '@/hooks/usePlaybook';
import { AggiungiOperazioneDialog } from '@/components/registro/aggiungi-operazione-dialog';
import { FiltriRegistro } from '@/components/registro/filtri-registro';
import { TabellaOperazioni } from '@/components/registro/tabella-operazioni';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  Search,
  PlusCircle,
  Calendar,
  TableIcon,
  List,
  TrendingUp,
  TrendingDown,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  BarChart2,
  Tag,
  Target,
  X,
  Loader2,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { formatValuta, cn } from '@/lib/utils';
import { format } from 'date-fns';
import { it } from 'date-fns/locale/it';
import { toast } from 'sonner';

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4 },
  },
};


export default function RegistroPage() {
  const {
    operazioni,
    isLoading,
    filtri,
    setFiltri,
    resetFiltri,
    aggiungiOperazione,
    modificaOperazione,
    eliminaOperazione,
  } = useOperazioni();
  const { strategie, isLoading: strategieLoading } = usePlaybook();
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('tabella');
  const [operazioneInModifica, setOperazioneInModifica] = useState<
    (typeof operazioni)[0] | null
  >(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedDays, setExpandedDays] = useState<Record<string, boolean>>({});
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedCalendarDay, setSelectedCalendarDay] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isAssigning, setIsAssigning] = useState(false);
  const [showStrategyDropdown, setShowStrategyDropdown] = useState(false);

  const handleBulkAssign = useCallback(async (strategiaId: string | null) => {
    if (selectedIds.size === 0) return;
    setIsAssigning(true);
    setShowStrategyDropdown(false);
    try {
      const promises = Array.from(selectedIds).map((id) =>
        modificaOperazione(id, { strategia_id: strategiaId })
      );
      await Promise.all(promises);
      toast.success(
        strategiaId
          ? `${selectedIds.size} operazioni associate alla strategia`
          : `Strategia rimossa da ${selectedIds.size} operazioni`
      );
      setSelectedIds(new Set());
    } catch {
      toast.error('Errore nell\'associazione delle operazioni');
    } finally {
      setIsAssigning(false);
    }
  }, [selectedIds, modificaOperazione]);

  // Filter operations by search query
  const filteredOperazioni = useMemo(() => {
    if (!searchQuery.trim()) return operazioni;
    const query = searchQuery.toLowerCase();
    return operazioni.filter(
      (op) =>
        op.ticker?.toLowerCase().includes(query) ||
        (op.strategia as any)?.nome?.toLowerCase().includes(query) ||
        op.note?.toLowerCase().includes(query)
    );
  }, [operazioni, searchQuery]);

  // Group operations by date for daily view
  const operazioniPerGiorno = useMemo(() => {
    const grouped: Record<string, typeof filteredOperazioni> = {};
    filteredOperazioni.forEach((op) => {
      const date = op.data;
      if (!grouped[date]) grouped[date] = [];
      grouped[date].push(op);
    });
    return Object.entries(grouped).sort(([a], [b]) => b.localeCompare(a));
  }, [filteredOperazioni]);

  // Calendar data
  const calendarData = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startOffset = (firstDay.getDay() + 6) % 7; // Monday start

    const days: (null | { day: number; dateStr: string; ops: number; pnl: number; wins: number })[] = [];
    for (let i = 0; i < startOffset; i++) days.push(null);

    for (let d = 1; d <= lastDay.getDate(); d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const dayOps = filteredOperazioni.filter((op) => op.data === dateStr);
      const pnl = dayOps.reduce((sum, op) => sum + (op.pnl || 0), 0);
      const wins = dayOps.filter((op) => (op.pnl || 0) > 0).length;
      days.push({ day: d, dateStr, ops: dayOps.length, pnl, wins });
    }
    return days;
  }, [currentMonth, filteredOperazioni]);

  const toggleDay = (date: string) => {
    setExpandedDays((prev) => ({ ...prev, [date]: !prev[date] }));
  };

  const weekDays = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];

  return (
    <div className="p-4 md:p-6 space-y-5 min-h-screen">
      {/* Main glassmorphism container */}
      <div className="rounded-xl border border-[#2D2D32] shadow-sm overflow-hidden">
        {/* Search bar and button header */}
        <div className="border-b border-[#2D2D32] px-4 py-3 flex flex-col sm:flex-row gap-3 items-center">
          <div className="relative flex-grow w-full sm:w-auto">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-[#c4a0e8]" />
            <Input
              placeholder="Cerca per ticker, strategia o note..."
              className="pl-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Button
            className="h-9 text-xs sm:text-sm w-full sm:w-auto"
            onClick={() => setDialogOpen(true)}
          >
            <PlusCircle className="mr-1 h-3.5 w-3.5" />
            Nuova Operazione
          </Button>
        </div>

        {/* Tabs with glassmorphism styling */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="border-b border-[#2D2D32] px-4 py-2">
            <TabsList className="grid grid-cols-3 w-full sm:w-auto bg-[#1C1C1F] p-1 rounded-lg border border-[#2D2D32]">
              <TabsTrigger
                value="giornaliero"
                className="flex items-center gap-2 data-[state=active]:bg-[#1C1C1F] data-[state=active]:text-[#c4a0e8] data-[state=active]:shadow-sm transition-all rounded-md"
              >
                <List className="h-4 w-4" />
                <span className="hidden sm:inline">Giornaliero</span>
                <span className="sm:hidden">Giorni</span>
              </TabsTrigger>
              <TabsTrigger
                value="tabella"
                className="flex items-center gap-2 data-[state=active]:bg-[#1C1C1F] data-[state=active]:text-[#c4a0e8] data-[state=active]:shadow-sm transition-all rounded-md"
              >
                <TableIcon className="h-4 w-4" />
                <span className="hidden sm:inline">Tabella</span>
                <span className="sm:hidden">Tab</span>
              </TabsTrigger>
              <TabsTrigger
                value="calendario"
                className="flex items-center gap-2 data-[state=active]:bg-[#1C1C1F] data-[state=active]:text-[#c4a0e8] data-[state=active]:shadow-sm transition-all rounded-md"
              >
                <Calendar className="h-4 w-4" />
                <span className="hidden sm:inline">Calendario</span>
                <span className="sm:hidden">Cal</span>
              </TabsTrigger>
            </TabsList>
          </div>

          {/* ============ VISTA GIORNALIERA ============ */}
          <TabsContent value="giornaliero" className="focus-visible:outline-none focus-visible:ring-0 p-4">
            <div className="space-y-3">
              {operazioniPerGiorno.length === 0 ? (
                <motion.div
                  variants={itemVariants}
                  className="rounded-lg border border-[#2D2D32] bg-[#1C1C1F] p-12 text-center"
                >
                  <p className="text-[#80808A]">
                    {searchQuery ? 'Nessuna operazione trovata per la ricerca' : 'Nessuna operazione registrata'}
                  </p>
                </motion.div>
              ) : (
                operazioniPerGiorno.map(([date, ops]) => {
                  const dayPnl = ops.reduce((sum, op) => sum + (op.pnl || 0), 0);
                  const dayWins = ops.filter((op) => (op.pnl || 0) > 0).length;
                  const dayLosses = ops.length - dayWins;
                  const dayWinRate = ops.length > 0 ? (dayWins / ops.length) * 100 : 0;
                  const isExpanded = expandedDays[date] ?? false;

                  // Calculate detailed stats
                  const winningOps = ops.filter((op) => (op.pnl || 0) > 0);
                  const losingOps = ops.filter((op) => (op.pnl || 0) <= 0);
                  const avgWinAmount = winningOps.length > 0 ? winningOps.reduce((sum, op) => sum + (op.pnl || 0), 0) / winningOps.length : 0;
                  const avgLossAmount = losingOps.length > 0 ? losingOps.reduce((sum, op) => sum + (op.pnl || 0), 0) / losingOps.length : 0;
                  const totalCommissions = ops.reduce((sum, op) => sum + (op.commissione || 0), 0);
                  const profitFactor = Math.abs(avgLossAmount) > 0 ? (avgWinAmount * dayWins) / (Math.abs(avgLossAmount) * dayLosses) : dayWins > 0 ? 3 : 0;
                  const avgTrade = ops.length > 0 ? dayPnl / ops.length : 0;
                  const bestOp = ops.reduce((best, op) => (op.pnl || 0) > (best.pnl || 0) ? op : best, ops[0]);
                  const worstOp = ops.reduce((worst, op) => (op.pnl || 0) < (worst.pnl || 0) ? op : worst, ops[0]);

                  // Collect tickers, strategies
                  const tickers = new Set(ops.map((op) => op.ticker));
                  const strategies = new Set(ops.map((op) => (op.strategia as any)?.nome).filter(Boolean));

                  let formattedDate = date;
                  try {
                    formattedDate = format(new Date(date + 'T12:00:00'), 'EEEE d MMMM yyyy', { locale: it });
                    formattedDate = formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1);
                  } catch {
                    // fallback to raw date
                  }

                  return (
                    <motion.div
                      key={date}
                      variants={itemVariants}
                      initial="hidden"
                      animate="visible"
                      className={cn(
                        'rounded-lg border overflow-hidden transition-all duration-200',
                        dayPnl >= 0
                          ? 'bg-gradient-to-r from-emerald-50 to-emerald-100 dark:from-emerald-950/30 dark:to-emerald-900/20 border-emerald-200/30 dark:border-emerald-500/30'
                          : 'bg-gradient-to-r from-red-50 to-red-100 dark:from-red-950/30 dark:to-red-900/20 border-red-200/30 dark:border-red-500/30'
                      )}
                    >
                      {/* Day Header */}
                      <button
                        onClick={() => toggleDay(date)}
                        className="w-full flex items-center justify-between p-4 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <motion.div
                            animate={{ rotate: isExpanded ? 180 : 0 }}
                            transition={{ duration: 0.2 }}
                          >
                            <ChevronDown className="h-4 w-4 text-[#c4a0e8]" />
                          </motion.div>
                          <div className="text-left">
                            <p className="font-semibold text-[#F8F8FF] text-sm">
                              {formattedDate}
                            </p>
                            <p className="text-xs text-[#80808A]">
                              {ops.length} {ops.length === 1 ? 'operazione' : 'operazioni'}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          {/* Ticker badges - only visible when collapsed */}
                          {!isExpanded && (
                            <div className="flex gap-1 max-w-[150px]">
                              {Array.from(tickers)
                                .slice(0, 3)
                                .map((ticker) => (
                                  <Badge key={ticker} variant="outline" className="text-xs py-0 h-5 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-500/30">
                                    {ticker}
                                  </Badge>
                                ))}
                              {tickers.size > 3 && (
                                <Badge variant="outline" className="text-xs py-0 h-5 bg-blue-50/50 dark:bg-blue-900/10 text-blue-700/70 dark:text-blue-300/70 border-blue-200/50 dark:border-blue-500/20">
                                  +{tickers.size - 3}
                                </Badge>
                              )}
                            </div>
                          )}

                          {/* Win rate gauge */}
                          <div className="flex items-center gap-1.5 bg-[#1C1C1F]/60 px-2 py-1 rounded-full">
                            <div
                              className={cn(
                                'h-2 w-2 rounded-full',
                                dayWinRate >= 60 ? 'bg-emerald-500' : dayWinRate >= 40 ? 'bg-amber-500' : 'bg-red-500'
                              )}
                            />
                            <span className="text-xs font-medium text-[#F8F8FF]">{Math.round(dayWinRate)}%</span>
                          </div>

                          {/* P&L and count */}
                          <div className="flex flex-col items-end">
                            <p className={`font-bold text-sm ${dayPnl >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                              {dayPnl >= 0 ? '+' : ''}{formatValuta(dayPnl)}
                            </p>
                          </div>
                        </div>
                      </button>

                      {/* Collapsed view - Stats grid */}
                      <AnimatePresence>
                        {!isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="border-t border-[#2D2D32]/20 grid grid-cols-2 gap-1 px-3 py-2"
                          >
                            <div className="flex items-center justify-center bg-[#1C1C1F]/60 rounded-md py-1 px-2">
                              <div className="flex items-center gap-1">
                                <TrendingUp className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                                <span className="font-medium text-xs text-emerald-700 dark:text-emerald-300">{dayWins}</span>
                              </div>
                              <span className="mx-1 text-[#80808A]">/</span>
                              <div className="flex items-center gap-1">
                                <TrendingDown className="h-3 w-3 text-red-600 dark:text-red-400" />
                                <span className="font-medium text-xs text-red-700 dark:text-red-300">{dayLosses}</span>
                              </div>
                            </div>
                            <div className="flex items-center justify-center bg-[#1C1C1F]/60 rounded-md py-1 px-2">
                              <Tag className="h-3 w-3 mr-1 text-[#c4a0e8]" />
                              <span className="text-xs font-medium text-[#c4a0e8]">{strategies.size} {strategies.size === 1 ? 'strategia' : 'strategie'}</span>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {/* Expanded detailed view */}
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.25 }}
                            className="overflow-hidden"
                          >
                            <div className="border-t border-[#2D2D32]/20 p-4 space-y-4 bg-[#1C1C1F]/30">
                              {/* Metrics Grid - 4 columns */}
                              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                                {/* Win Rate Gauge */}
                                <div className="rounded-lg border border-[#2D2D32] bg-[#1C1C1F] p-3">
                                  <div className="flex items-center justify-between mb-2">
                                    <h3 className="text-xs font-medium text-[#c4a0e8]">Win Rate</h3>
                                    <Badge
                                      variant={dayWinRate >= 60 ? 'success' : dayWinRate >= 40 ? 'outline' : 'destructive'}
                                      className="text-xs py-0 h-5"
                                    >
                                      {Math.round(dayWinRate)}%
                                    </Badge>
                                  </div>
                                  <div className="flex items-center justify-center h-16">
                                    <div className="relative h-14 w-14">
                                      <svg className="w-full h-full" viewBox="0 0 100 100">
                                        <circle
                                          className="text-[#2D2D32] stroke-current"
                                          strokeWidth="8"
                                          cx="50"
                                          cy="50"
                                          r="40"
                                          fill="transparent"
                                        />
                                        <circle
                                          className={cn(
                                            'stroke-current transition-all duration-500 ease-in-out',
                                            dayWinRate >= 60
                                              ? 'text-emerald-500'
                                              : dayWinRate >= 40
                                                ? 'text-amber-500'
                                                : 'text-red-500'
                                          )}
                                          strokeWidth="8"
                                          strokeLinecap="round"
                                          cx="50"
                                          cy="50"
                                          r="40"
                                          fill="transparent"
                                          strokeDasharray={`${dayWinRate * 2.51} 251.2`}
                                          strokeDashoffset="0"
                                          transform="rotate(-90 50 50)"
                                        />
                                      </svg>
                                      <div className="absolute inset-0 flex items-center justify-center">
                                        <span className="text-xs font-semibold text-[#F8F8FF]">
                                          {dayWins}/{ops.length}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                </div>

                                {/* Profit Factor Gauge */}
                                <div className="rounded-lg border border-[#2D2D32] bg-[#1C1C1F] p-3">
                                  <div className="flex items-center justify-between mb-2">
                                    <h3 className="text-xs font-medium text-[#c4a0e8]">Profit Factor</h3>
                                    <Badge
                                      variant={profitFactor >= 2 ? 'success' : profitFactor >= 1 ? 'outline' : 'destructive'}
                                      className="text-xs py-0 h-5"
                                    >
                                      {profitFactor.toFixed(2)}
                                    </Badge>
                                  </div>
                                  <div className="flex items-center justify-center h-16">
                                    <div className="relative h-14 w-14">
                                      <svg className="w-full h-full" viewBox="0 0 100 100">
                                        <circle
                                          className="text-[#2D2D32] stroke-current"
                                          strokeWidth="8"
                                          cx="50"
                                          cy="50"
                                          r="40"
                                          fill="transparent"
                                        />
                                        <circle
                                          className={cn(
                                            'stroke-current transition-all duration-500 ease-in-out',
                                            profitFactor >= 2
                                              ? 'text-emerald-500'
                                              : profitFactor >= 1
                                                ? 'text-amber-500'
                                                : 'text-red-500'
                                          )}
                                          strokeWidth="8"
                                          strokeLinecap="round"
                                          cx="50"
                                          cy="50"
                                          r="40"
                                          fill="transparent"
                                          strokeDasharray={`${Math.min(profitFactor, 3) * 83.73} 251.2`}
                                          strokeDashoffset="0"
                                          transform="rotate(-90 50 50)"
                                        />
                                      </svg>
                                      <div className="absolute inset-0 flex items-center justify-center">
                                        <span className="text-xs text-[#F8F8FF] font-semibold">
                                          {profitFactor >= 2 ? 'Ottimo' : profitFactor >= 1 ? 'Buono' : 'Basso'}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                </div>

                                {/* Average Trade */}
                                <div className="rounded-lg border border-[#2D2D32] bg-[#1C1C1F] p-3">
                                  <div className="flex items-center justify-between mb-2">
                                    <h3 className="text-xs font-medium text-[#c4a0e8]">Media Trade</h3>
                                    <Badge
                                      variant={avgTrade > 0 ? 'success' : avgTrade < 0 ? 'destructive' : 'outline'}
                                      className="text-xs py-0 h-5"
                                    >
                                      {formatValuta(avgTrade)}
                                    </Badge>
                                  </div>
                                  <div className="flex items-center justify-center h-16">
                                    <div className="w-full flex flex-col items-center">
                                      <div className="w-full h-2 bg-[#46265F]/20 rounded-full overflow-hidden">
                                        {avgTrade !== 0 && (
                                          <div
                                            className={avgTrade > 0 ? 'h-full bg-emerald-500' : 'h-full bg-red-500'}
                                            style={{
                                              width: `${Math.min((Math.abs(avgTrade) / 50) * 100, 100)}%`,
                                              marginLeft: avgTrade > 0 ? '50%' : '',
                                              marginRight: avgTrade < 0 ? '50%' : '',
                                            }}
                                          />
                                        )}
                                      </div>
                                      <div className="flex justify-between w-full mt-1 text-[10px] text-[#80808A]">
                                        <span>-50€</span>
                                        <span>0</span>
                                        <span>+50€</span>
                                      </div>
                                    </div>
                                  </div>
                                </div>

                                {/* P&L Total */}
                                <div className="rounded-lg border border-[#2D2D32] bg-[#1C1C1F] p-3">
                                  <div className="flex items-center justify-between mb-2">
                                    <h3 className="text-xs font-medium text-[#c4a0e8]">P&L Totale</h3>
                                    <Badge variant="outline" className="text-xs py-0 h-5">
                                      {ops.length}
                                    </Badge>
                                  </div>
                                  <div className="flex items-center justify-center h-16">
                                    <div className="w-full flex flex-col items-center">
                                      <span className={cn('text-lg font-bold', dayPnl >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400')}>
                                        {dayPnl >= 0 ? '+' : ''}{formatValuta(dayPnl)}
                                      </span>
                                      <div className="mt-1 w-full h-2 bg-[#46265F]/20 rounded-full overflow-hidden">
                                        <div
                                          className={dayPnl >= 0 ? 'h-full bg-emerald-500' : 'h-full bg-red-500'}
                                          style={{ width: `${Math.min((Math.abs(dayPnl) / 500) * 100, 100)}%` }}
                                        />
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>

                              {/* Best/Worst Trade & Detailed Stats */}
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {/* Best/Worst Trade */}
                                <div className="rounded-lg border border-[#2D2D32] bg-[#1C1C1F] p-3">
                                  <h3 className="text-xs font-medium text-[#c4a0e8] mb-2">Operazioni Significative</h3>
                                  <div className="space-y-2">
                                    {bestOp && (bestOp.pnl || 0) > 0 ? (
                                      <div className="flex items-center justify-between p-2 bg-emerald-50/50 dark:bg-emerald-900/20 rounded-md">
                                        <div className="flex items-center gap-2">
                                          <div className="w-1.5 h-6 bg-emerald-500 rounded-sm" />
                                          <div>
                                            <p className="text-xs font-medium text-[#F8F8FF]">{bestOp.ticker}</p>
                                            <p className="text-[10px] text-[#80808A]">Miglior trade</p>
                                          </div>
                                        </div>
                                        <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">+{formatValuta(bestOp.pnl || 0)}</span>
                                      </div>
                                    ) : (
                                      <div className="flex items-center gap-2 p-2 bg-[#1C1C1F]/50 rounded-md">
                                        <div className="w-1.5 h-6 bg-[#80808A] rounded-sm" />
                                        <div>
                                          <p className="text-xs font-medium text-[#F8F8FF]">Nessun trade in profitto</p>
                                          <p className="text-[10px] text-[#80808A]">Miglior trade</p>
                                        </div>
                                      </div>
                                    )}
                                    {worstOp && (worstOp.pnl || 0) < 0 ? (
                                      <div className="flex items-center justify-between p-2 bg-red-50/50 dark:bg-red-900/20 rounded-md">
                                        <div className="flex items-center gap-2">
                                          <div className="w-1.5 h-6 bg-red-500 rounded-sm" />
                                          <div>
                                            <p className="text-xs font-medium text-[#F8F8FF]">{worstOp.ticker}</p>
                                            <p className="text-[10px] text-[#80808A]">Peggior trade</p>
                                          </div>
                                        </div>
                                        <span className="text-xs font-bold text-red-600 dark:text-red-400">{formatValuta(worstOp.pnl || 0)}</span>
                                      </div>
                                    ) : (
                                      <div className="flex items-center gap-2 p-2 bg-[#1C1C1F]/50 rounded-md">
                                        <div className="w-1.5 h-6 bg-[#80808A] rounded-sm" />
                                        <div>
                                          <p className="text-xs font-medium text-[#F8F8FF]">Nessun trade in perdita</p>
                                          <p className="text-[10px] text-[#80808A]">Peggior trade</p>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </div>

                                {/* Detailed Stats */}
                                <div className="rounded-lg border border-[#2D2D32] bg-[#1C1C1F] p-3">
                                  <h3 className="text-xs font-medium text-[#c4a0e8] mb-2">Statistiche Dettagliate</h3>
                                  <div className="grid grid-cols-2 gap-2">
                                    <div className="p-2 bg-[#46265F]/10 rounded-md">
                                      <p className="text-[10px] text-[#80808A] mb-0.5">Media Win</p>
                                      <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                                        {avgWinAmount > 0 ? `+${formatValuta(avgWinAmount)}` : 'N/A'}
                                      </p>
                                    </div>
                                    <div className="p-2 bg-[#46265F]/10 rounded-md">
                                      <p className="text-[10px] text-[#80808A] mb-0.5">Media Loss</p>
                                      <p className="text-xs font-semibold text-red-600 dark:text-red-400">
                                        {avgLossAmount < 0 ? formatValuta(avgLossAmount) : 'N/A'}
                                      </p>
                                    </div>
                                    <div className="p-2 bg-[#46265F]/10 rounded-md">
                                      <p className="text-[10px] text-[#80808A] mb-0.5">Commissioni</p>
                                      <p className="text-xs font-semibold text-red-600 dark:text-red-400">
                                        -{formatValuta(totalCommissions)}
                                      </p>
                                    </div>
                                    <div className="p-2 bg-[#46265F]/10 rounded-md">
                                      <p className="text-[10px] text-[#80808A] mb-0.5">Rapporto W/L</p>
                                      <p className="text-xs font-semibold text-[#c4a0e8]">
                                        {Math.abs(avgLossAmount) > 0 && avgWinAmount > 0
                                          ? `${(avgWinAmount / Math.abs(avgLossAmount)).toFixed(2)}`
                                          : 'N/A'}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              </div>

                              {/* Strategies section */}
                              {strategies.size > 0 && (
                                <div className="rounded-lg border border-[#2D2D32] bg-[#1C1C1F] p-3">
                                  <h3 className="text-xs font-medium text-[#c4a0e8] mb-2">Strategie</h3>
                                  <div className="flex flex-wrap gap-1">
                                    {Array.from(strategies).map((strategy) => (
                                      <Badge key={strategy} variant="outline" className="text-xs py-0 h-5 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-500/30">
                                        {strategy}
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Operations list */}
                              <div className="rounded-lg border border-[#2D2D32] bg-[#1C1C1F] overflow-hidden">
                                <div className="border-b border-[#2D2D32]/20 px-3 py-2 bg-[#46265F]/10">
                                  <p className="text-xs font-medium text-[#c4a0e8]">Operazioni ({ops.length})</p>
                                </div>
                                <div className="divide-y divide-[#2D2D32]/10 max-h-64 overflow-y-auto">
                                  {ops.map((op) => (
                                    <div
                                      key={op.id}
                                      className="flex items-center justify-between px-3 py-2 hover:bg-[#46265F]/5 transition-colors cursor-pointer"
                                      onClick={() => {
                                        setOperazioneInModifica(op);
                                        setDialogOpen(true);
                                      }}
                                    >
                                      <div className="flex items-center gap-2 flex-grow min-w-0">
                                        <span className="font-mono font-semibold text-xs text-[#F8F8FF] min-w-[45px]">
                                          {op.ticker}
                                        </span>
                                        <Badge
                                          variant={op.direzione === 'LONG' ? 'success' : 'destructive'}
                                          className="text-[10px] px-1 py-0 h-4 flex-shrink-0"
                                        >
                                          {op.direzione}
                                        </Badge>
                                        <span className="text-xs text-[#80808A] hidden sm:inline truncate">
                                          {op.quantita} @ {op.prezzo_entrata?.toFixed(2)}
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <span className={cn('text-xs font-semibold flex-shrink-0', (op.pnl || 0) >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400')}>
                                          {(op.pnl || 0) >= 0 ? '+' : ''}{formatValuta(op.pnl || 0)}
                                        </span>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="h-6 text-xs px-1.5 flex-shrink-0 text-[#c4a0e8] hover:text-[#c4a0e8]"
                                          title="Analisi"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            router.push(`/analisi/${op.id}`);
                                          }}
                                        >
                                          <BarChart2 className="h-3 w-3" />
                                        </Button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  );
                })
              )}
            </div>
          </TabsContent>

          {/* ============ VISTA TABELLA ============ */}
          <TabsContent value="tabella" className="focus-visible:outline-none focus-visible:ring-0 p-4">
            {/* Filters */}
            <motion.div variants={itemVariants} className="mb-4">
              <FiltriRegistro
                filtri={filtri}
                onFiltriChange={setFiltri}
                onReset={resetFiltri}
              />
            </motion.div>

            {/* Table */}
            <motion.div variants={itemVariants}>
              <TabellaOperazioni
                operazioni={filteredOperazioni}
                onEdit={(op) => {
                  setOperazioneInModifica(op);
                  setDialogOpen(true);
                }}
                onDelete={eliminaOperazione}
                isLoading={isLoading}
                selectedIds={selectedIds}
                onSelectionChange={setSelectedIds}
              />
            </motion.div>

            {/* Floating Action Bar */}
            <AnimatePresence>
              {selectedIds.size > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 30, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 30, scale: 0.95 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50"
                >
                  <div className="flex items-center gap-3 px-5 py-3 rounded-2xl bg-white/95 dark:bg-[#1C1C1F]/95 border border-[#2D2D32] shadow-2xl shadow-[#46265F]/10">
                    {/* Selection count */}
                    <div className="flex items-center gap-2">
                      <div className="flex items-center justify-center w-7 h-7 rounded-full bg-[#46265F] text-white text-xs font-bold">
                        {selectedIds.size}
                      </div>
                      <span className="text-sm font-medium text-[#F8F8FF] whitespace-nowrap">
                        {selectedIds.size === 1 ? 'operazione' : 'operazioni'}
                      </span>
                    </div>

                    <div className="w-px h-8 bg-[#2D2D32]/50" />

                    {/* Assign to strategy button */}
                    <div className="relative">
                      <Button
                        size="sm"
                        className="h-9 text-xs gap-1.5"
                        onClick={() => setShowStrategyDropdown(!showStrategyDropdown)}
                        disabled={isAssigning}
                      >
                        {isAssigning ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Target className="w-3.5 h-3.5" />
                        )}
                        Assegna Strategia
                      </Button>

                      {/* Strategy dropdown */}
                      <AnimatePresence>
                        {showStrategyDropdown && (
                          <motion.div
                            initial={{ opacity: 0, y: 8, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 8, scale: 0.95 }}
                            transition={{ duration: 0.15 }}
                            className="absolute bottom-full left-0 mb-2 w-64 max-h-72 overflow-y-auto rounded-xl bg-white dark:bg-[#1C1C1F] border border-[#2D2D32] shadow-xl py-1"
                          >
                            {strategieLoading ? (
                              <div className="flex items-center justify-center py-6">
                                <Loader2 className="w-5 h-5 animate-spin text-[#c4a0e8]" />
                              </div>
                            ) : strategie.length === 0 ? (
                              <div className="px-4 py-6 text-center">
                                <p className="text-sm text-[#80808A]">
                                  Nessuna strategia trovata
                                </p>
                                <p className="text-xs text-[#80808A] mt-1">
                                  Crea una strategia nel Playbook
                                </p>
                              </div>
                            ) : (
                              <>
                                {strategie.map((strat) => (
                                  <button
                                    key={strat.id}
                                    onClick={() => handleBulkAssign(strat.id)}
                                    className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-[#46265F]/10 transition-colors text-left"
                                  >
                                    <div
                                      className="w-3 h-3 rounded-full shrink-0 shadow-sm"
                                      style={{
                                        backgroundColor: strat.colore || '#6A3D8F',
                                        boxShadow: `0 0 0 2px white, 0 0 0 4px ${strat.colore || '#6A3D8F'}40`,
                                      }}
                                    />
                                    <div className="min-w-0 flex-1">
                                      <p className="text-sm font-medium text-[#F8F8FF] truncate">
                                        {strat.nome}
                                      </p>
                                      <p className="text-[10px] text-[#80808A]">
                                        {strat.operazioniCount || 0} ops · WR {(strat.winRate || 0).toFixed(0)}%
                                      </p>
                                    </div>
                                  </button>
                                ))}
                                <div className="border-t border-[#2D2D32]/20 mt-1 pt-1">
                                  <button
                                    onClick={() => handleBulkAssign(null)}
                                    className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors text-left"
                                  >
                                    <div className="w-3 h-3 rounded-full shrink-0 border-2 border-dashed border-gray-300 dark:border-gray-600" />
                                    <p className="text-sm font-medium text-[#80808A]">
                                      Rimuovi strategia
                                    </p>
                                  </button>
                                </div>
                              </>
                            )}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* Clear selection */}
                    <button
                      onClick={() => {
                        setSelectedIds(new Set());
                        setShowStrategyDropdown(false);
                      }}
                      className="flex items-center justify-center w-8 h-8 rounded-lg text-[#80808A] hover:text-[#c4a0e8] hover:bg-[#46265F]/10 transition-colors"
                      title="Deseleziona tutto"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </TabsContent>

          {/* ============ VISTA CALENDARIO ============ */}
          <TabsContent value="calendario" className="focus-visible:outline-none focus-visible:ring-0 p-4">
            <motion.div variants={itemVariants} className="space-y-4">
              {/* Month navigation */}
              <div className="flex items-center justify-between">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => { setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1)); setSelectedCalendarDay(null); }}
                  className="h-8 w-8 text-[#c4a0e8] hover:bg-[#46265F]/10"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <div className="text-center">
                  <h3 className="text-base font-bold text-[#F8F8FF] capitalize">
                    {format(currentMonth, 'MMMM yyyy', { locale: it })}
                  </h3>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => { setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1)); setSelectedCalendarDay(null); }}
                  className="h-8 w-8 text-[#c4a0e8] hover:bg-[#46265F]/10"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>

              {/* Monthly summary - ABOVE the calendar grid */}
              {(() => {
                const monthOps = filteredOperazioni.filter((op) => {
                  const opDate = new Date(op.data);
                  return (
                    opDate.getFullYear() === currentMonth.getFullYear() &&
                    opDate.getMonth() === currentMonth.getMonth()
                  );
                });
                const monthPnl = monthOps.reduce((sum, op) => sum + (op.pnl || 0), 0);
                const monthWins = monthOps.filter((op) => (op.pnl || 0) > 0).length;
                const monthWinRate = monthOps.length > 0 ? (monthWins / monthOps.length) * 100 : 0;
                const tradingDays = new Set(monthOps.map((op) => op.data)).size;
                const avgPnlPerDay = tradingDays > 0 ? monthPnl / tradingDays : 0;
                const monthComm = monthOps.reduce((sum, op) => sum + (op.commissione || 0), 0);

                return (
                  <div className="rounded-xl border border-[#2D2D32] bg-[#1C1C1F] overflow-hidden">
                    {/* Top: P&L totale e barra */}
                    <div className="flex items-center gap-4 px-4 py-3 border-b border-[#2D2D32]/20">
                      <div className="flex-1">
                        <div className="flex items-baseline gap-2">
                          <span className={cn('text-xl font-bold', monthOps.length === 0 ? 'text-[#80808A]' : monthPnl >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400')}>
                            {monthOps.length === 0 ? '€0,00' : `${monthPnl >= 0 ? '+' : ''}${formatValuta(monthPnl)}`}
                          </span>
                          <span className="text-[10px] text-[#80808A] font-medium uppercase tracking-wider">P&L mese</span>
                        </div>
                        {monthOps.length > 0 && (
                          <div className="w-full h-1.5 bg-[#2D2D32] rounded-full mt-1.5 overflow-hidden">
                            <div
                              className={cn('h-full rounded-full transition-all duration-500', monthPnl >= 0 ? 'bg-emerald-500' : 'bg-red-500')}
                              style={{ width: `${Math.min(Math.abs(monthPnl) / Math.max(Math.abs(monthPnl), 500) * 100, 100)}%` }}
                            />
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Bottom: Stats row */}
                    <div className="grid grid-cols-5 divide-x divide-[#2D2D32]/20">
                      <div className="px-3 py-2.5 text-center">
                        <p className="text-[10px] text-[#80808A] font-medium mb-0.5">Operazioni</p>
                        <p className="text-sm font-bold text-[#F8F8FF]">{monthOps.length}</p>
                      </div>
                      <div className="px-3 py-2.5 text-center">
                        <p className="text-[10px] text-[#80808A] font-medium mb-0.5">Win Rate</p>
                        <p className={cn('text-sm font-bold', monthOps.length === 0 ? 'text-[#80808A]' : monthWinRate >= 50 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400')}>
                          {monthOps.length === 0 ? '—' : `${Math.round(monthWinRate)}%`}
                        </p>
                      </div>
                      <div className="px-3 py-2.5 text-center">
                        <p className="text-[10px] text-[#80808A] font-medium mb-0.5">Giorni</p>
                        <p className="text-sm font-bold text-[#F8F8FF]">{tradingDays}</p>
                      </div>
                      <div className="px-3 py-2.5 text-center">
                        <p className="text-[10px] text-[#80808A] font-medium mb-0.5">Media/Giorno</p>
                        <p className={cn('text-sm font-bold', monthOps.length === 0 ? 'text-[#80808A]' : avgPnlPerDay >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400')}>
                          {monthOps.length === 0 ? '—' : `${avgPnlPerDay >= 0 ? '+' : ''}${formatValuta(avgPnlPerDay)}`}
                        </p>
                      </div>
                      <div className="px-3 py-2.5 text-center">
                        <p className="text-[10px] text-[#80808A] font-medium mb-0.5">Commissioni</p>
                        <p className="text-sm font-bold text-red-500 dark:text-red-400">
                          {monthOps.length === 0 ? '—' : `-${formatValuta(monthComm)}`}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Calendar grid */}
              <div className="rounded-xl border border-[#2D2D32] overflow-hidden">
                {/* Day of week headers */}
                <div className="grid grid-cols-7 bg-[#46265F]/10">
                  {weekDays.map((day, i) => (
                    <div
                      key={day}
                      className={cn(
                        'py-2.5 text-center text-[10px] font-bold uppercase tracking-wider',
                        i >= 5
                          ? 'text-[#80808A]/60'
                          : 'text-[#c4a0e8]'
                      )}
                    >
                      {day}
                    </div>
                  ))}
                </div>

                {/* Calendar cells */}
                <div className="grid grid-cols-7">
                  {calendarData.map((cell, idx) => {
                    if (cell === null) {
                      return (
                        <div
                          key={`empty-${idx}`}
                          className="min-h-[90px] border-t border-r border-[#2D2D32]/5 bg-[#1C1C1F]/10 last:border-r-0"
                        />
                      );
                    }

                    const isToday = cell.dateStr === format(new Date(), 'yyyy-MM-dd');
                    const hasOps = cell.ops > 0;
                    const isPositive = cell.pnl >= 0;
                    const winRate = cell.ops > 0 ? Math.round((cell.wins / cell.ops) * 100) : 0;
                    const isSelectedDay = selectedCalendarDay === cell.dateStr;

                    return (
                      <div
                        key={cell.dateStr}
                        onClick={() => {
                          if (hasOps) {
                            setSelectedCalendarDay(isSelectedDay ? null : cell.dateStr);
                          }
                        }}
                        className={cn(
                          'min-h-[90px] border-t border-r border-[#2D2D32]/5 p-1.5 transition-all duration-150 relative group/cell',
                          hasOps && 'cursor-pointer',
                          hasOps && isPositive && !isSelectedDay && 'bg-emerald-50/30 dark:bg-emerald-500/[0.03]',
                          hasOps && !isPositive && !isSelectedDay && 'bg-red-50/30 dark:bg-red-500/[0.03]',
                          !hasOps && 'bg-[#0F0F11]/30',
                          hasOps && !isSelectedDay && 'hover:bg-[#46265F]/10',
                          isToday && !isSelectedDay && 'ring-1 ring-inset ring-[#6A3D8F]/30',
                          isSelectedDay && 'ring-2 ring-inset ring-[#6A3D8F] bg-[#46265F]/10'
                        )}
                      >
                        {/* Day number */}
                        <div className="flex items-center justify-between mb-0.5">
                          <div className={cn(
                            'text-[11px] font-semibold leading-none',
                            isToday
                              ? 'text-white bg-[#46265F] rounded-full w-5 h-5 flex items-center justify-center text-[10px]'
                              : hasOps
                                ? 'text-[#F8F8FF]'
                                : 'text-[#80808A]'
                          )}>
                            {cell.day}
                          </div>
                          {hasOps && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                const dayOp = filteredOperazioni.find((op) => op.data === cell.dateStr);
                                if (dayOp) router.push(`/analisi/${dayOp.id}`);
                              }}
                              className="opacity-0 group-hover/cell:opacity-100 p-0.5 rounded hover:bg-[#46265F]/20 transition-all"
                              title="Vai all'analisi"
                            >
                              <BarChart2 className="h-3 w-3 text-[#c4a0e8]" />
                            </button>
                          )}
                        </div>

                        {hasOps && (
                          <div className="space-y-1">
                            {/* P&L */}
                            <p className={cn(
                              'text-xs font-bold leading-none',
                              isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
                            )}>
                              {isPositive ? '+' : ''}{formatValuta(cell.pnl)}
                            </p>

                            {/* Mini bar: win/loss ratio */}
                            <div className="flex items-center gap-1">
                              <div className="flex-1 h-1 bg-[#2D2D32]/50 rounded-full overflow-hidden">
                                <div
                                  className={cn(
                                    'h-full rounded-full transition-all',
                                    winRate >= 60 ? 'bg-emerald-400' : winRate >= 40 ? 'bg-amber-400' : 'bg-red-400'
                                  )}
                                  style={{ width: `${winRate}%` }}
                                />
                              </div>
                            </div>

                            {/* Count + wins */}
                            <p className="text-[9px] text-[#80808A] leading-none">
                              {cell.ops} ops · {cell.wins}W/{cell.ops - cell.wins}L
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Selected day operations panel */}
              <AnimatePresence>
                {selectedCalendarDay && (() => {
                  const dayOps = filteredOperazioni.filter((op) => op.data === selectedCalendarDay);
                  if (dayOps.length === 0) return null;

                  const dayPnl = dayOps.reduce((sum, op) => sum + (op.pnl || 0), 0);
                  const dayWins = dayOps.filter((op) => (op.pnl || 0) > 0).length;
                  const dayWinRate = dayOps.length > 0 ? (dayWins / dayOps.length) * 100 : 0;
                  const dayComm = dayOps.reduce((sum, op) => sum + (op.commissione || 0), 0);

                  let formattedDate = selectedCalendarDay;
                  try {
                    formattedDate = format(new Date(selectedCalendarDay + 'T12:00:00'), 'EEEE d MMMM yyyy', { locale: it });
                    formattedDate = formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1);
                  } catch { /* fallback */ }

                  return (
                    <motion.div
                      key={selectedCalendarDay}
                      initial={{ opacity: 0, y: -10, height: 0 }}
                      animate={{ opacity: 1, y: 0, height: 'auto' }}
                      exit={{ opacity: 0, y: -10, height: 0 }}
                      transition={{ duration: 0.25 }}
                      className="rounded-xl border border-[#2D2D32] bg-[#1C1C1F] overflow-hidden"
                    >
                      {/* Day header */}
                      <div className="flex items-center justify-between px-4 py-3 border-b border-[#2D2D32]/20 bg-[#46265F]/10">
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            'w-2 h-8 rounded-full',
                            dayPnl >= 0 ? 'bg-emerald-500' : 'bg-red-500'
                          )} />
                          <div>
                            <h4 className="text-sm font-bold text-[#F8F8FF]">{formattedDate}</h4>
                            <div className="flex items-center gap-3 mt-0.5">
                              <span className={cn('text-xs font-bold', dayPnl >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400')}>
                                {dayPnl >= 0 ? '+' : ''}{formatValuta(dayPnl)}
                              </span>
                              <span className="text-[10px] text-[#80808A]">
                                {dayOps.length} {dayOps.length === 1 ? 'operazione' : 'operazioni'}
                              </span>
                              <span className="text-[10px] text-[#80808A]">
                                WR {Math.round(dayWinRate)}%
                              </span>
                              {dayComm > 0 && (
                                <span className="text-[10px] text-red-400 dark:text-red-500">
                                  Comm. -{formatValuta(dayComm)}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => setSelectedCalendarDay(null)}
                          className="p-1.5 rounded-lg hover:bg-[#46265F]/10 transition-colors text-[#80808A] hover:text-[#F8F8FF]"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>

                      {/* Operations list */}
                      <div className="divide-y divide-[#2D2D32]/10 max-h-80 overflow-y-auto">
                        {dayOps.map((op) => {
                          const pnl = op.pnl || 0;
                          const isLong = op.direzione === 'LONG';

                          return (
                            <div
                              key={op.id}
                              className="flex items-center justify-between px-4 py-2.5 hover:bg-[#46265F]/5 transition-colors cursor-pointer group"
                              onClick={() => router.push(`/analisi/${op.id}`)}
                            >
                              <div className="flex items-center gap-3 flex-grow min-w-0">
                                <span className={cn(
                                  'inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider flex-shrink-0',
                                  isLong
                                    ? 'bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                                    : 'bg-red-100 dark:bg-red-500/10 text-red-700 dark:text-red-400'
                                )}>
                                  {isLong ? 'L' : 'S'}
                                </span>
                                <span className="font-mono font-bold text-xs text-[#F8F8FF] flex-shrink-0">
                                  {op.ticker}
                                </span>
                                <span className="text-[11px] text-[#80808A] hidden sm:inline">
                                  {op.quantita} @ {op.prezzo_entrata?.toFixed(2)} → {op.prezzo_uscita?.toFixed(2) || '—'}
                                </span>
                                {op.strategia && (
                                  <span
                                    className="hidden md:inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold flex-shrink-0"
                                    style={{
                                      backgroundColor: op.strategia.colore ? `${op.strategia.colore}15` : 'rgba(70, 38, 95, 0.08)',
                                      color: op.strategia.colore || '#6A3D8F',
                                    }}
                                  >
                                    <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: op.strategia.colore || '#6A3D8F' }} />
                                    {op.strategia.nome}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                {(op.ora_entrata || op.ora_uscita) && (
                                  <span className="text-[10px] text-[#80808A] hidden sm:inline">
                                    {op.ora_entrata || ''}{op.ora_entrata && op.ora_uscita ? ' → ' : ''}{op.ora_uscita || ''}
                                  </span>
                                )}
                                <span className={cn('text-xs font-bold flex-shrink-0', pnl >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400')}>
                                  {pnl >= 0 ? '+' : ''}{formatValuta(pnl)}
                                </span>
                                <BarChart2 className="h-3.5 w-3.5 text-[#c4a0e8] opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </motion.div>
                  );
                })()}
              </AnimatePresence>
            </motion.div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Dialog */}
      <AggiungiOperazioneDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) {
            setOperazioneInModifica(null);
          }
        }}
        onAggiungi={aggiungiOperazione}
        operazioneModifica={operazioneInModifica}
        onModifica={modificaOperazione}
      />
    </div>
  );
}
