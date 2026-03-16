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
  Percent,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { formatValuta, formatPercentuale, stessoGiorno } from '@/lib/utils';
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
                  const dayWinRate = ops.length > 0 ? (dayWins / ops.length) * 100 : 0;
                  const isExpanded = expandedDays[date] ?? false;

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
                      className="rounded-lg border border-violet-200/30 dark:border-violet-500/30 bg-white/50 dark:bg-gray-900/50 overflow-hidden"
                    >
                      {/* Day Header */}
                      <button
                        onClick={() => toggleDay(date)}
                        className="w-full flex items-center justify-between p-4 hover:bg-violet-50/50 dark:hover:bg-violet-900/10 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <motion.div
                            animate={{ rotate: isExpanded ? 180 : 0 }}
                            transition={{ duration: 0.2 }}
                          >
                            <ChevronDown className="h-4 w-4 text-violet-500 dark:text-violet-400" />
                          </motion.div>
                          <div className="text-left">
                            <p className="font-semibold text-violet-700 dark:text-white text-sm">
                              {formattedDate}
                            </p>
                            <p className="text-xs text-violet-600/60 dark:text-gray-500">
                              {ops.length} {ops.length === 1 ? 'operazione' : 'operazioni'}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className={`font-bold text-sm ${dayPnl >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                              {formatValuta(dayPnl)}
                            </p>
                          </div>
                          <Badge
                            variant={dayWinRate >= 50 ? 'success' : 'destructive'}
                            className="text-xs"
                          >
                            {Math.round(dayWinRate)}% WR
                          </Badge>
                        </div>
                      </button>

                      {/* Expanded trades list */}
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.25 }}
                            className="overflow-hidden"
                          >
                            <div className="border-t border-violet-200/20 dark:border-violet-500/20 divide-y divide-violet-200/10 dark:divide-violet-500/10">
                              {ops.map((op) => (
                                <div
                                  key={op.id}
                                  className="flex items-center justify-between px-4 py-3 hover:bg-violet-50/30 dark:hover:bg-violet-900/5 transition-colors cursor-pointer"
                                  onClick={() => {
                                    setOperazioneInModifica(op);
                                    setDialogOpen(true);
                                  }}
                                >
                                  <div className="flex items-center gap-3">
                                    <span className="font-mono font-semibold text-sm text-violet-700 dark:text-white min-w-[60px]">
                                      {op.ticker}
                                    </span>
                                    <Badge
                                      variant={op.direzione === 'LONG' ? 'success' : 'destructive'}
                                      className="text-[10px] px-1.5 py-0"
                                    >
                                      {op.direzione}
                                    </Badge>
                                    <span className="text-xs text-violet-600/60 dark:text-gray-500 hidden sm:inline">
                                      {op.quantita} @ {op.prezzo_entrata?.toFixed(2)} → {op.prezzo_uscita?.toFixed(2) || '-'}
                                    </span>
                                    {(op.strategia as any)?.nome && (
                                      <span className="text-xs px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-600 dark:text-violet-300">
                                        {(op.strategia as any).nome}
                                      </span>
                                    )}
                                  </div>
                                  <span className={`font-semibold text-sm ${(op.pnl || 0) >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                                    {formatValuta(op.pnl || 0)}
                                  </span>
                                </div>
                              ))}
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
                            <p className="text-[10px] text-violet-600/60 dark:text-gray-500">
                              {cell.ops} {cell.ops === 1 ? 'op' : 'ops'} · {cell.wins}W
                            </p>
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
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="rounded-lg border border-violet-200/30 dark:border-violet-500/20 bg-white/50 dark:bg-gray-900/50 p-3 text-center">
                      <p className="text-xs text-violet-600/60 dark:text-gray-400 mb-1">Operazioni</p>
                      <p className="text-lg font-bold text-violet-700 dark:text-white">{monthOps.length}</p>
                    </div>
                    <div className="rounded-lg border border-violet-200/30 dark:border-violet-500/20 bg-white/50 dark:bg-gray-900/50 p-3 text-center">
                      <p className="text-xs text-violet-600/60 dark:text-gray-400 mb-1">P&L Mese</p>
                      <p className={`text-lg font-bold ${monthPnl >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                        {formatValuta(monthPnl)}
                      </p>
                    </div>
                    <div className="rounded-lg border border-violet-200/30 dark:border-violet-500/20 bg-white/50 dark:bg-gray-900/50 p-3 text-center">
                      <p className="text-xs text-violet-600/60 dark:text-gray-400 mb-1">Win Rate</p>
                      <p className={`text-lg font-bold ${monthWinRate >= 50 ? 'text-emerald-500' : 'text-orange-400'}`}>
                        {Math.round(monthWinRate)}%
                      </p>
                    </div>
                    <div className="rounded-lg border border-violet-200/30 dark:border-violet-500/20 bg-white/50 dark:bg-gray-900/50 p-3 text-center">
                      <p className="text-xs text-violet-600/60 dark:text-gray-400 mb-1">Giorni Trading</p>
                      <p className="text-lg font-bold text-violet-700 dark:text-white">{tradingDays}</p>
                    </div>
                  </div>
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
