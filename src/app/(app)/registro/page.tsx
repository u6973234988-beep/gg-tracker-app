'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useOperazioni } from '@/hooks/useOperazioni';
import { AggiungiOperazioneDialog } from '@/components/registro/aggiungi-operazione-dialog';
import { FiltriRegistro } from '@/components/registro/filtri-registro';
import { TabellaOperazioni } from '@/components/registro/tabella-operazioni';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
  Percent,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  BarChart2,
  Tag,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { formatValuta, formatPercentuale, stessoGiorno, cn } from '@/lib/utils';
import { format } from 'date-fns';
import { it } from 'date-fns/locale/it';

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4 },
  },
};

const statVariants = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.4 },
  },
};

interface StatCard {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  description?: string;
  color?: string;
}

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
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('tabella');
  const [operazioneInModifica, setOperazioneInModifica] = useState<
    (typeof operazioni)[0] | null
  >(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedDays, setExpandedDays] = useState<Record<string, boolean>>({});
  const [currentMonth, setCurrentMonth] = useState(new Date());

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

  // Calculate stats for today
  const todayStats = useMemo(() => {
    const today = new Date();

    const todayOps = operazioni.filter((op) =>
      stessoGiorno(new Date(op.data), today)
    );

    const totalOpsToday = todayOps.length;
    const pnlToday = todayOps.reduce((sum, op) => sum + (op.pnl || 0), 0);

    const winningTrades = todayOps.filter((op) => (op.pnl || 0) > 0).length;
    const winRate = totalOpsToday > 0 ? (winningTrades / totalOpsToday) * 100 : 0;

    return {
      totalOpsToday,
      pnlToday,
      winRate,
    };
  }, [operazioni]);

  const stats: StatCard[] = [
    {
      title: 'Operazioni Oggi',
      value: todayStats.totalOpsToday,
      icon: <Calendar className="w-5 h-5" />,
      description: 'Operazioni chiuse oggi',
      color: 'text-blue-400',
    },
    {
      title: 'P&L Oggi',
      value: formatValuta(todayStats.pnlToday),
      icon: <TrendingUp className="w-5 h-5" />,
      description: todayStats.pnlToday >= 0 ? 'Profitto' : 'Perdita',
      color: todayStats.pnlToday >= 0 ? 'text-emerald-400' : 'text-red-400',
    },
    {
      title: 'Win Rate Oggi',
      value: formatPercentuale(todayStats.winRate / 100),
      icon: <Percent className="w-5 h-5" />,
      description: `${todayStats.totalOpsToday > 0 ? Math.round(todayStats.winRate) : 0}% di successo`,
      color: todayStats.winRate >= 50 ? 'text-emerald-400' : 'text-orange-400',
    },
  ];

  const weekDays = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];

  return (
    <div className="p-4 md:p-6 space-y-5 cyber-grid-lines min-h-screen">
      {/* Main glassmorphism container */}
      <div className="enhanced-glassmorphism rounded-xl border border-violet-200/30 dark:border-violet-500/30 shadow-sm overflow-hidden">
        {/* Search bar and button header */}
        <div className="border-b border-violet-200/30 dark:border-violet-800/30 px-4 py-3 flex flex-col sm:flex-row gap-3 items-center">
          <div className="relative flex-grow w-full sm:w-auto">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-violet-500 dark:text-violet-400" />
            <Input
              placeholder="Cerca per ticker, strategia o note..."
              className="pl-9 cyber-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Button
            className="futuristic-button h-9 text-xs sm:text-sm w-full sm:w-auto"
            onClick={() => setDialogOpen(true)}
          >
            <PlusCircle className="mr-1 h-3.5 w-3.5" />
            Nuova Operazione
          </Button>
        </div>

        {/* Tabs with glassmorphism styling */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="border-b border-violet-200/30 dark:border-violet-800/30 px-4 py-2">
            <TabsList className="grid grid-cols-3 w-full sm:w-auto bg-white/30 dark:bg-gray-800/30 p-1 rounded-lg">
              <TabsTrigger
                value="giornaliero"
                className="flex items-center gap-2 data-[state=active]:enhanced-glassmorphism data-[state=active]:text-violet-700 dark:data-[state=active]:text-violet-300 data-[state=active]:shadow-sm transition-all rounded-md"
              >
                <List className="h-4 w-4" />
                <span className="hidden sm:inline">Giornaliero</span>
                <span className="sm:hidden">Giorni</span>
              </TabsTrigger>
              <TabsTrigger
                value="tabella"
                className="flex items-center gap-2 data-[state=active]:enhanced-glassmorphism data-[state=active]:text-violet-700 dark:data-[state=active]:text-violet-300 data-[state=active]:shadow-sm transition-all rounded-md"
              >
                <TableIcon className="h-4 w-4" />
                <span className="hidden sm:inline">Tabella</span>
                <span className="sm:hidden">Tab</span>
              </TabsTrigger>
              <TabsTrigger
                value="calendario"
                className="flex items-center gap-2 data-[state=active]:enhanced-glassmorphism data-[state=active]:text-violet-700 dark:data-[state=active]:text-violet-300 data-[state=active]:shadow-sm transition-all rounded-md"
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
                  className="rounded-lg border border-violet-200/30 dark:border-violet-500/30 bg-white/50 dark:bg-gray-900/50 p-12 text-center"
                >
                  <p className="text-violet-600/80 dark:text-gray-400">
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
                            <ChevronDown className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                          </motion.div>
                          <div className="text-left">
                            <p className="font-semibold text-violet-700 dark:text-white text-sm">
                              {formattedDate}
                            </p>
                            <p className="text-xs text-violet-600/60 dark:text-gray-400">
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
                          <div className="flex items-center gap-1.5 bg-white/40 dark:bg-gray-900/40 px-2 py-1 rounded-full">
                            <div
                              className={cn(
                                'h-2 w-2 rounded-full',
                                dayWinRate >= 60 ? 'bg-emerald-500' : dayWinRate >= 40 ? 'bg-amber-500' : 'bg-red-500'
                              )}
                            />
                            <span className="text-xs font-medium text-violet-700 dark:text-white">{Math.round(dayWinRate)}%</span>
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
                            className="border-t border-violet-200/20 dark:border-violet-500/20 grid grid-cols-2 gap-1 px-3 py-2"
                          >
                            <div className="flex items-center justify-center bg-white/40 dark:bg-gray-900/40 rounded-md py-1 px-2">
                              <div className="flex items-center gap-1">
                                <TrendingUp className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                                <span className="font-medium text-xs text-emerald-700 dark:text-emerald-300">{dayWins}</span>
                              </div>
                              <span className="mx-1 text-violet-600/40 dark:text-gray-500">/</span>
                              <div className="flex items-center gap-1">
                                <TrendingDown className="h-3 w-3 text-red-600 dark:text-red-400" />
                                <span className="font-medium text-xs text-red-700 dark:text-red-300">{dayLosses}</span>
                              </div>
                            </div>
                            <div className="flex items-center justify-center bg-white/40 dark:bg-gray-900/40 rounded-md py-1 px-2">
                              <Tag className="h-3 w-3 mr-1 text-violet-600 dark:text-violet-400" />
                              <span className="text-xs font-medium text-violet-700 dark:text-violet-300">{strategies.size} {strategies.size === 1 ? 'strategia' : 'strategie'}</span>
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
                            <div className="border-t border-violet-200/20 dark:border-violet-500/20 p-4 space-y-4 bg-white/30 dark:bg-gray-900/30 backdrop-blur-sm">
                              {/* Metrics Grid - 4 columns */}
                              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                                {/* Win Rate Gauge */}
                                <div className="rounded-lg border border-violet-200/30 dark:border-violet-500/30 bg-white/50 dark:bg-gray-900/50 p-3">
                                  <div className="flex items-center justify-between mb-2">
                                    <h3 className="text-xs font-medium text-violet-700 dark:text-gray-300">Win Rate</h3>
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
                                          className="text-violet-200 dark:text-violet-900/50 stroke-current"
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
                                        <span className="text-xs font-semibold text-violet-700 dark:text-white">
                                          {dayWins}/{ops.length}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                </div>

                                {/* Profit Factor Gauge */}
                                <div className="rounded-lg border border-violet-200/30 dark:border-violet-500/30 bg-white/50 dark:bg-gray-900/50 p-3">
                                  <div className="flex items-center justify-between mb-2">
                                    <h3 className="text-xs font-medium text-violet-700 dark:text-gray-300">Profit Factor</h3>
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
                                          className="text-violet-200 dark:text-violet-900/50 stroke-current"
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
                                        <span className="text-xs text-violet-700 dark:text-white font-semibold">
                                          {profitFactor >= 2 ? 'Ottimo' : profitFactor >= 1 ? 'Buono' : 'Basso'}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                </div>

                                {/* Average Trade */}
                                <div className="rounded-lg border border-violet-200/30 dark:border-violet-500/30 bg-white/50 dark:bg-gray-900/50 p-3">
                                  <div className="flex items-center justify-between mb-2">
                                    <h3 className="text-xs font-medium text-violet-700 dark:text-gray-300">Media Trade</h3>
                                    <Badge
                                      variant={avgTrade > 0 ? 'success' : avgTrade < 0 ? 'destructive' : 'outline'}
                                      className="text-xs py-0 h-5"
                                    >
                                      {formatValuta(avgTrade)}
                                    </Badge>
                                  </div>
                                  <div className="flex items-center justify-center h-16">
                                    <div className="w-full flex flex-col items-center">
                                      <div className="w-full h-2 bg-violet-200 dark:bg-violet-900/50 rounded-full overflow-hidden">
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
                                      <div className="flex justify-between w-full mt-1 text-[10px] text-violet-600/60 dark:text-gray-500">
                                        <span>-50€</span>
                                        <span>0</span>
                                        <span>+50€</span>
                                      </div>
                                    </div>
                                  </div>
                                </div>

                                {/* P&L Total */}
                                <div className="rounded-lg border border-violet-200/30 dark:border-violet-500/30 bg-white/50 dark:bg-gray-900/50 p-3">
                                  <div className="flex items-center justify-between mb-2">
                                    <h3 className="text-xs font-medium text-violet-700 dark:text-gray-300">P&L Totale</h3>
                                    <Badge variant="outline" className="text-xs py-0 h-5">
                                      {ops.length}
                                    </Badge>
                                  </div>
                                  <div className="flex items-center justify-center h-16">
                                    <div className="w-full flex flex-col items-center">
                                      <span className={cn('text-lg font-bold', dayPnl >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400')}>
                                        {dayPnl >= 0 ? '+' : ''}{formatValuta(dayPnl)}
                                      </span>
                                      <div className="mt-1 w-full h-2 bg-violet-200 dark:bg-violet-900/50 rounded-full overflow-hidden">
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
                                <div className="rounded-lg border border-violet-200/30 dark:border-violet-500/30 bg-white/50 dark:bg-gray-900/50 p-3">
                                  <h3 className="text-xs font-medium text-violet-700 dark:text-gray-300 mb-2">Operazioni Significative</h3>
                                  <div className="space-y-2">
                                    {bestOp && (bestOp.pnl || 0) > 0 ? (
                                      <div className="flex items-center justify-between p-2 bg-emerald-50/50 dark:bg-emerald-900/20 rounded-md">
                                        <div className="flex items-center gap-2">
                                          <div className="w-1.5 h-6 bg-emerald-500 rounded-sm" />
                                          <div>
                                            <p className="text-xs font-medium text-violet-700 dark:text-white">{bestOp.ticker}</p>
                                            <p className="text-[10px] text-violet-600/60 dark:text-gray-400">Miglior trade</p>
                                          </div>
                                        </div>
                                        <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">+{formatValuta(bestOp.pnl || 0)}</span>
                                      </div>
                                    ) : (
                                      <div className="flex items-center gap-2 p-2 bg-gray-100/50 dark:bg-gray-800/30 rounded-md">
                                        <div className="w-1.5 h-6 bg-gray-400 rounded-sm" />
                                        <div>
                                          <p className="text-xs font-medium text-violet-700 dark:text-white">Nessun trade in profitto</p>
                                          <p className="text-[10px] text-violet-600/60 dark:text-gray-400">Miglior trade</p>
                                        </div>
                                      </div>
                                    )}
                                    {worstOp && (worstOp.pnl || 0) < 0 ? (
                                      <div className="flex items-center justify-between p-2 bg-red-50/50 dark:bg-red-900/20 rounded-md">
                                        <div className="flex items-center gap-2">
                                          <div className="w-1.5 h-6 bg-red-500 rounded-sm" />
                                          <div>
                                            <p className="text-xs font-medium text-violet-700 dark:text-white">{worstOp.ticker}</p>
                                            <p className="text-[10px] text-violet-600/60 dark:text-gray-400">Peggior trade</p>
                                          </div>
                                        </div>
                                        <span className="text-xs font-bold text-red-600 dark:text-red-400">{formatValuta(worstOp.pnl || 0)}</span>
                                      </div>
                                    ) : (
                                      <div className="flex items-center gap-2 p-2 bg-gray-100/50 dark:bg-gray-800/30 rounded-md">
                                        <div className="w-1.5 h-6 bg-gray-400 rounded-sm" />
                                        <div>
                                          <p className="text-xs font-medium text-violet-700 dark:text-white">Nessun trade in perdita</p>
                                          <p className="text-[10px] text-violet-600/60 dark:text-gray-400">Peggior trade</p>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </div>

                                {/* Detailed Stats */}
                                <div className="rounded-lg border border-violet-200/30 dark:border-violet-500/30 bg-white/50 dark:bg-gray-900/50 p-3">
                                  <h3 className="text-xs font-medium text-violet-700 dark:text-gray-300 mb-2">Statistiche Dettagliate</h3>
                                  <div className="grid grid-cols-2 gap-2">
                                    <div className="p-2 bg-violet-50/50 dark:bg-violet-900/20 rounded-md">
                                      <p className="text-[10px] text-violet-600/60 dark:text-gray-400 mb-0.5">Media Win</p>
                                      <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                                        {avgWinAmount > 0 ? `+${formatValuta(avgWinAmount)}` : 'N/A'}
                                      </p>
                                    </div>
                                    <div className="p-2 bg-violet-50/50 dark:bg-violet-900/20 rounded-md">
                                      <p className="text-[10px] text-violet-600/60 dark:text-gray-400 mb-0.5">Media Loss</p>
                                      <p className="text-xs font-semibold text-red-600 dark:text-red-400">
                                        {avgLossAmount < 0 ? formatValuta(avgLossAmount) : 'N/A'}
                                      </p>
                                    </div>
                                    <div className="p-2 bg-violet-50/50 dark:bg-violet-900/20 rounded-md">
                                      <p className="text-[10px] text-violet-600/60 dark:text-gray-400 mb-0.5">Commissioni</p>
                                      <p className="text-xs font-semibold text-red-600 dark:text-red-400">
                                        -{formatValuta(totalCommissions)}
                                      </p>
                                    </div>
                                    <div className="p-2 bg-violet-50/50 dark:bg-violet-900/20 rounded-md">
                                      <p className="text-[10px] text-violet-600/60 dark:text-gray-400 mb-0.5">Rapporto W/L</p>
                                      <p className="text-xs font-semibold text-violet-700 dark:text-violet-300">
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
                                <div className="rounded-lg border border-violet-200/30 dark:border-violet-500/30 bg-white/50 dark:bg-gray-900/50 p-3">
                                  <h3 className="text-xs font-medium text-violet-700 dark:text-gray-300 mb-2">Strategie</h3>
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
                              <div className="rounded-lg border border-violet-200/30 dark:border-violet-500/30 bg-white/50 dark:bg-gray-900/50 overflow-hidden">
                                <div className="border-b border-violet-200/20 dark:border-violet-500/20 px-3 py-2 bg-violet-50/50 dark:bg-violet-900/10">
                                  <p className="text-xs font-medium text-violet-700 dark:text-gray-300">Operazioni ({ops.length})</p>
                                </div>
                                <div className="divide-y divide-violet-200/10 dark:divide-violet-500/10 max-h-64 overflow-y-auto">
                                  {ops.map((op) => (
                                    <div
                                      key={op.id}
                                      className="flex items-center justify-between px-3 py-2 hover:bg-violet-50/50 dark:hover:bg-violet-900/5 transition-colors cursor-pointer"
                                      onClick={() => {
                                        setOperazioneInModifica(op);
                                        setDialogOpen(true);
                                      }}
                                    >
                                      <div className="flex items-center gap-2 flex-grow min-w-0">
                                        <span className="font-mono font-semibold text-xs text-violet-700 dark:text-white min-w-[45px]">
                                          {op.ticker}
                                        </span>
                                        <Badge
                                          variant={op.direzione === 'LONG' ? 'success' : 'destructive'}
                                          className="text-[10px] px-1 py-0 h-4 flex-shrink-0"
                                        >
                                          {op.direzione}
                                        </Badge>
                                        <span className="text-xs text-violet-600/60 dark:text-gray-500 hidden sm:inline truncate">
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
                                          className="h-6 text-xs px-1.5 flex-shrink-0 text-violet-600 hover:text-violet-800 dark:text-violet-400 dark:hover:text-violet-300"
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
              />
            </motion.div>
          </TabsContent>

          {/* ============ VISTA CALENDARIO ============ */}
          <TabsContent value="calendario" className="focus-visible:outline-none focus-visible:ring-0 p-4">
            <motion.div variants={itemVariants} className="space-y-4">
              {/* Month navigation */}
              <div className="flex items-center justify-between">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))}
                  className="text-violet-600 dark:text-violet-400 hover:bg-violet-100/50 dark:hover:bg-violet-900/20"
                >
                  <ChevronLeft className="h-5 w-5" />
                </Button>
                <h3 className="text-lg font-semibold text-violet-700 dark:text-white capitalize">
                  {format(currentMonth, 'MMMM yyyy', { locale: it })}
                </h3>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))}
                  className="text-violet-600 dark:text-violet-400 hover:bg-violet-100/50 dark:hover:bg-violet-900/20"
                >
                  <ChevronRight className="h-5 w-5" />
                </Button>
              </div>

              {/* Calendar grid */}
              <div className="rounded-lg border border-violet-200/30 dark:border-violet-500/30 overflow-hidden">
                {/* Day of week headers */}
                <div className="grid grid-cols-7 bg-violet-50/50 dark:bg-violet-900/20 border-b border-violet-200/30 dark:border-violet-500/30">
                  {weekDays.map((day) => (
                    <div
                      key={day}
                      className="py-2 text-center text-xs font-semibold text-violet-600 dark:text-violet-400"
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
                          className="min-h-[80px] border-b border-r border-violet-200/10 dark:border-violet-500/10 bg-gray-50/30 dark:bg-gray-900/20"
                        />
                      );
                    }

                    const isToday =
                      cell.dateStr ===
                      format(new Date(), 'yyyy-MM-dd');
                    const hasOps = cell.ops > 0;
                    const isPositive = cell.pnl >= 0;

                    let bgClass = 'bg-white/50 dark:bg-gray-900/50';
                    if (hasOps && isPositive) {
                      bgClass = 'bg-emerald-50/50 dark:bg-emerald-900/10';
                    } else if (hasOps && !isPositive) {
                      bgClass = 'bg-red-50/50 dark:bg-red-900/10';
                    }

                    return (
                      <div
                        key={cell.dateStr}
                        className={`min-h-[80px] border-b border-r border-violet-200/10 dark:border-violet-500/10 p-1.5 ${bgClass} hover:bg-violet-50/80 dark:hover:bg-violet-900/15 transition-colors relative`}
                      >
                        <div className={`text-xs font-medium mb-1 ${
                          isToday
                            ? 'text-violet-700 dark:text-violet-300 bg-violet-500/20 rounded-full w-6 h-6 flex items-center justify-center'
                            : 'text-violet-600/70 dark:text-gray-400'
                        }`}>
                          {cell.day}
                        </div>
                        {hasOps && (
                          <div className="space-y-0.5">
                            <p className={`text-xs font-bold ${isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                              {formatValuta(cell.pnl)}
                            </p>
                            <div className="flex items-center justify-between">
                              <p className="text-[10px] text-violet-600/60 dark:text-gray-500">
                                {cell.ops} {cell.ops === 1 ? 'op' : 'ops'} · {cell.wins}W
                              </p>
                              <button
                                onClick={() => {
                                  const dayOp = filteredOperazioni.find((op) => op.data === cell.dateStr);
                                  if (dayOp) router.push(`/analisi/${dayOp.id}`);
                                }}
                                className="p-0.5 rounded hover:bg-violet-200/50 dark:hover:bg-violet-500/20 transition-colors"
                                title="Analisi"
                              >
                                <BarChart2 className="h-3 w-3 text-violet-500 dark:text-violet-400" />
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Monthly summary */}
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

                return (
                  <motion.div variants={itemVariants} className="mt-6 pt-4 border-t border-violet-200/30 dark:border-violet-500/30">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div className="rounded-lg border border-violet-200/30 dark:border-violet-500/20 bg-gradient-to-br from-white/50 to-white/30 dark:from-violet-900/20 dark:to-gray-900/50 p-4 text-center hover:shadow-md transition-all">
                        <p className="text-xs text-violet-600/60 dark:text-gray-400 mb-1 font-medium">Operazioni</p>
                        <p className="text-2xl font-bold text-violet-700 dark:text-white">{monthOps.length}</p>
                        <p className="text-[10px] text-violet-600/50 dark:text-gray-500 mt-1">del mese</p>
                      </div>
                      <div className={cn('rounded-lg border p-4 text-center hover:shadow-md transition-all', monthPnl >= 0
                        ? 'bg-gradient-to-br from-emerald-50/50 to-emerald-100/30 dark:from-emerald-950/30 dark:to-emerald-900/20 border-emerald-200/30 dark:border-emerald-500/30'
                        : 'bg-gradient-to-br from-red-50/50 to-red-100/30 dark:from-red-950/30 dark:to-red-900/20 border-red-200/30 dark:border-red-500/30'
                      )}>
                        <p className="text-xs text-violet-600/60 dark:text-gray-400 mb-1 font-medium">P&L Mese</p>
                        <p className={`text-2xl font-bold ${monthPnl >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                          {monthPnl >= 0 ? '+' : ''}{formatValuta(monthPnl)}
                        </p>
                      </div>
                      <div className="rounded-lg border border-violet-200/30 dark:border-violet-500/20 bg-gradient-to-br from-white/50 to-white/30 dark:from-violet-900/20 dark:to-gray-900/50 p-4 text-center hover:shadow-md transition-all">
                        <p className="text-xs text-violet-600/60 dark:text-gray-400 mb-1 font-medium">Win Rate</p>
                        <p className={`text-2xl font-bold ${monthWinRate >= 50 ? 'text-emerald-600 dark:text-emerald-400' : 'text-orange-500'}`}>
                          {Math.round(monthWinRate)}%
                        </p>
                        <p className="text-[10px] text-violet-600/50 dark:text-gray-500 mt-1">{monthWins}W / {monthOps.length - monthWins}L</p>
                      </div>
                      <div className="rounded-lg border border-violet-200/30 dark:border-violet-500/20 bg-gradient-to-br from-white/50 to-white/30 dark:from-violet-900/20 dark:to-gray-900/50 p-4 text-center hover:shadow-md transition-all">
                        <p className="text-xs text-violet-600/60 dark:text-gray-400 mb-1 font-medium">Giorni Trading</p>
                        <p className="text-2xl font-bold text-violet-700 dark:text-white">{tradingDays}</p>
                        <p className="text-[10px] text-violet-600/50 dark:text-gray-500 mt-1">con operazioni</p>
                      </div>
                    </div>
                  </motion.div>
                );
              })()}
            </motion.div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Stats Bar - Below the main container */}
      <motion.div
        variants={itemVariants}
        className="grid grid-cols-1 md:grid-cols-3 gap-4"
      >
        {stats.map((stat, idx) => (
          <motion.div
            key={idx}
            variants={statVariants}
            transition={{ delay: idx * 0.1 }}
          >
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-300">
                      {stat.title}
                    </CardTitle>
                    <CardDescription className="mt-1">
                      {stat.description}
                    </CardDescription>
                  </div>
                  <div className={`p-2 rounded-lg bg-gray-100 dark:bg-[#1e1e2e] ${stat.color}`}>
                    {stat.icon}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${stat.color}`}>
                  {stat.value}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </motion.div>

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
