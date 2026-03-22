'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from 'next-themes';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  BarChart3,
  ArrowUpRight,
  LineChart as LineChartIcon,
  AlertTriangle,
  Calendar,
  DollarSign,
  Hash,
  Clock,
  Trophy,
  Target,
  X,
} from 'lucide-react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale/it';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useDashboardData, type StrategyEquityPoint, type StrategyLineInfo } from '@/hooks/useDashboardData';
import { formatValuta, formatPercentuale, formatData, cn } from '@/lib/utils';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

/* ─── Animation Variants ─── */
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, ease: 'easeOut' as const },
  },
};

const fadeInUp = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: 'spring' as const,
      stiffness: 120,
      damping: 14,
    },
  },
};

/* ─── Date Range Filter Component ─── */
function DateRangeFilter({
  dateRange,
  onDateRangeChange,
}: {
  dateRange: { from: string | null; to: string | null };
  onDateRangeChange: (range: { from: string | null; to: string | null }) => void;
}) {
  const [fromDate, setFromDate] = useState(dateRange.from || '');
  const [toDate, setToDate] = useState(dateRange.to || '');

  const handleApply = () => {
    onDateRangeChange({
      from: fromDate || null,
      to: toDate || null,
    });
  };

  const handleReset = () => {
    setFromDate('');
    setToDate('');
    onDateRangeChange({ from: null, to: null });
  };

  const handlePreset = (days: number) => {
    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - days);
    const fromStr = from.toISOString().split('T')[0];
    const toStr = to.toISOString().split('T')[0];
    setFromDate(fromStr);
    setToDate(toStr);
    onDateRangeChange({ from: fromStr, to: toStr });
  };

  const isActive = dateRange.from || dateRange.to;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Preset buttons */}
      <div className="flex items-center gap-1.5">
        <button
          onClick={() => handlePreset(7)}
          className="px-2.5 py-1.5 text-xs font-medium rounded-lg bg-white/60 dark:bg-gray-800/60 text-violet-700 dark:text-violet-300 hover:bg-violet-100 dark:hover:bg-violet-900/30 border border-violet-200/30 dark:border-violet-700/30 transition-colors"
        >
          7G
        </button>
        <button
          onClick={() => handlePreset(30)}
          className="px-2.5 py-1.5 text-xs font-medium rounded-lg bg-white/60 dark:bg-gray-800/60 text-violet-700 dark:text-violet-300 hover:bg-violet-100 dark:hover:bg-violet-900/30 border border-violet-200/30 dark:border-violet-700/30 transition-colors"
        >
          30G
        </button>
        <button
          onClick={() => handlePreset(90)}
          className="px-2.5 py-1.5 text-xs font-medium rounded-lg bg-white/60 dark:bg-gray-800/60 text-violet-700 dark:text-violet-300 hover:bg-violet-100 dark:hover:bg-violet-900/30 border border-violet-200/30 dark:border-violet-700/30 transition-colors"
        >
          90G
        </button>
        <button
          onClick={() => handlePreset(365)}
          className="px-2.5 py-1.5 text-xs font-medium rounded-lg bg-white/60 dark:bg-gray-800/60 text-violet-700 dark:text-violet-300 hover:bg-violet-100 dark:hover:bg-violet-900/30 border border-violet-200/30 dark:border-violet-700/30 transition-colors"
        >
          1A
        </button>
      </div>

      <div className="hidden sm:block h-5 w-px bg-violet-200/40 dark:bg-violet-700/30" />

      {/* Custom date inputs */}
      <div className="flex items-center gap-1.5">
        <div className="relative">
          <Calendar className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-violet-400 dark:text-violet-500 pointer-events-none" />
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="pl-6 pr-2 py-1.5 text-xs rounded-lg bg-white/60 dark:bg-gray-800/60 text-violet-700 dark:text-violet-300 border border-violet-200/30 dark:border-violet-700/30 focus:outline-none focus:ring-1 focus:ring-violet-400 w-[120px]"
            placeholder="Da"
          />
        </div>
        <span className="text-xs text-violet-500 dark:text-violet-400">—</span>
        <div className="relative">
          <Calendar className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-violet-400 dark:text-violet-500 pointer-events-none" />
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="pl-6 pr-2 py-1.5 text-xs rounded-lg bg-white/60 dark:bg-gray-800/60 text-violet-700 dark:text-violet-300 border border-violet-200/30 dark:border-violet-700/30 focus:outline-none focus:ring-1 focus:ring-violet-400 w-[120px]"
            placeholder="A"
          />
        </div>
        <button
          onClick={handleApply}
          className="px-3 py-1.5 text-xs font-medium rounded-lg bg-violet-500 text-white hover:bg-violet-600 transition-colors shadow-sm"
        >
          Applica
        </button>
        {isActive && (
          <button
            onClick={handleReset}
            className="p-1.5 rounded-lg text-violet-500 hover:bg-violet-100 dark:hover:bg-violet-900/30 transition-colors"
            title="Rimuovi filtro"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}

/* ─── KPI Card Component ─── */
function KPICard({
  label,
  value,
  icon: Icon,
  gradientFrom,
  gradientTo,
  subtitle,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  gradientFrom: string;
  gradientTo: string;
  subtitle?: string;
}) {
  return (
    <motion.div variants={itemVariants}>
      <Card className="relative overflow-hidden border border-violet-200/40 dark:border-violet-500/20 bg-white/95 dark:bg-[#161622] backdrop-blur-md hover:shadow-lg hover:shadow-violet-500/5 transition-all duration-300 group rounded-xl h-full">
        <div className={`absolute inset-0 bg-gradient-to-br ${gradientFrom} ${gradientTo} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
        <CardContent className="relative z-10 p-4 sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-xs sm:text-sm font-medium text-violet-600/80 dark:text-violet-300/80 truncate">
                {label}
              </p>
              <p className="mt-1.5 text-xl sm:text-2xl font-bold text-violet-700 dark:text-white truncate high-contrast-text">
                {value}
              </p>
              {subtitle && (
                <p className="mt-1 text-xs text-violet-500/70 dark:text-violet-400/60">
                  {subtitle}
                </p>
              )}
            </div>
            <div className="p-2 sm:p-2.5 rounded-xl bg-violet-500/10 dark:bg-violet-500/20 shrink-0">
              {Icon}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

/* ─── Loading Skeleton ─── */
function LoadingSkeleton() {
  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex items-center justify-between">
        <div className="h-10 w-48 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse" />
        <div className="h-8 w-64 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse" />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="border border-violet-200/40 dark:border-violet-500/20">
            <CardContent className="p-4 space-y-3">
              <div className="h-3 w-20 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
              <div className="h-7 w-28 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2 border border-violet-200/40 dark:border-violet-500/20">
          <CardContent className="p-4">
            <div className="h-80 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
          </CardContent>
        </Card>
        <Card className="border border-violet-200/40 dark:border-violet-500/20">
          <CardContent className="p-4">
            <div className="h-80 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

/* ─── Empty State ─── */
function EmptyState() {
  const router = useRouter();

  return (
    <div className="space-y-8 p-4 md:p-6">
      <motion.div variants={itemVariants}>
        <h1 className="text-page-title text-violet-700 dark:text-white">Dashboard</h1>
        <p className="text-violet-600/80 dark:text-gray-300 mt-2">
          Benvenuto in GG Tracker - Il tuo nuovo compagno di trading
        </p>
      </motion.div>

      <motion.div variants={itemVariants}>
        <Card className="border-dashed border-2 border-violet-500/30 bg-gradient-to-br from-violet-500/5 to-purple-500/5 dark:from-violet-500/10 dark:to-purple-500/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-violet-700 dark:text-white">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              Nessun dato disponibile
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-violet-600/80 dark:text-gray-300">
              Non hai ancora registrato operazioni. Inizia a tracciare i tuoi trade per visualizzare
              le metriche di performance.
            </p>
            <button
              onClick={() => router.push('/registro')}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-700 dark:bg-violet-600 dark:hover:bg-violet-700 text-white font-medium transition-colors futuristic-button"
            >
              <ArrowUpRight className="w-4 h-4" />
              Vai al Registro
            </button>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}

/* ─── Equity Chart ─── */
interface EquityChartData {
  data: string;
  pnl_giorno: number | null;
  equity_cumulativa: number | null;
  operazioni_giorno: number | null;
}

function EquityChart({
  equityData,
  chartType,
  onChartTypeChange,
}: {
  equityData: EquityChartData[];
  chartType: 'line' | 'bar';
  onChartTypeChange: (type: 'line' | 'bar') => void;
}) {
  const { resolvedTheme: theme } = useTheme();

  if (!equityData || equityData.length === 0) {
    return (
      <motion.div variants={itemVariants}>
        <Card className="h-full border border-violet-200/40 dark:border-violet-500/20 bg-white/95 dark:bg-[#161622]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-violet-700 dark:text-white">
              <TrendingUp className="w-5 h-5 text-violet-600 dark:text-violet-300" />
              Equity Line
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72 flex items-center justify-center text-violet-600/80 dark:text-gray-300">
              <p>Nessun dato disponibile per il periodo selezionato.</p>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  const lineChartData = equityData
    .map((item) => ({
      date: format(new Date(item.data), 'd MMM', { locale: it }),
      equity: item.equity_cumulativa || 0,
      pnl: item.pnl_giorno || 0,
      fullDate: item.data,
    }))
    .filter((item) => item.equity !== null && !isNaN(item.equity));

  const barChartData = equityData
    .map((item) => ({
      date: format(new Date(item.data), 'd MMM', { locale: it }),
      pnl: item.pnl_giorno || 0,
      fullDate: item.data,
    }))
    .filter((item) => !isNaN(item.pnl));

  return (
    <motion.div variants={itemVariants} className="h-full">
      <Card className="h-full border border-violet-200/40 dark:border-violet-500/20 bg-white/95 dark:bg-[#161622] backdrop-blur-md hover:shadow-lg hover:shadow-violet-500/5 transition-all duration-300 overflow-hidden group relative rounded-xl">
        {/* Subtle background effects */}
        <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 via-transparent to-purple-500/5 dark:from-violet-500/10 dark:via-transparent dark:to-purple-500/10 opacity-60 group-hover:opacity-100 transition-opacity duration-500" />

        <CardHeader className="relative z-10 pb-2">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2.5">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-violet-100 dark:bg-violet-900/30">
                <TrendingUp className="h-4 w-4 text-violet-600 dark:text-violet-300" />
              </div>
              <div>
                <CardTitle className="text-base sm:text-lg font-semibold text-violet-700 dark:text-violet-300">
                  {chartType === 'line' ? 'Equity Line' : 'P&L Giornaliero'}
                </CardTitle>
                <CardDescription className="text-xs text-violet-600/70 dark:text-gray-400 mt-0.5">
                  {chartType === 'line'
                    ? 'Andamento cumulativo del P&L'
                    : 'P&L netto giornaliero'}
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm rounded-lg p-0.5 border border-violet-200/30 dark:border-violet-700/30">
                <button
                  onClick={() => onChartTypeChange('line')}
                  className={`flex items-center justify-center h-7 w-7 rounded-md text-xs transition-all duration-200 ${
                    chartType === 'line'
                      ? 'bg-violet-500 text-white shadow-md'
                      : 'text-violet-700 dark:text-violet-300 hover:bg-violet-100 dark:hover:bg-violet-800/30'
                  }`}
                  title="Equity Line"
                >
                  <LineChartIcon className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => onChartTypeChange('bar')}
                  className={`flex items-center justify-center h-7 w-7 rounded-md text-xs transition-all duration-200 ${
                    chartType === 'bar'
                      ? 'bg-violet-500 text-white shadow-md'
                      : 'text-violet-700 dark:text-violet-300 hover:bg-violet-100 dark:hover:bg-violet-800/30'
                  }`}
                  title="P&L Giornaliero"
                >
                  <BarChart3 className="h-3.5 w-3.5" />
                </button>
              </div>
              <span className="text-xs px-2 py-1 rounded-lg bg-violet-100/80 dark:bg-violet-900/50 text-violet-700 dark:text-violet-300 font-medium border border-violet-200/30 dark:border-violet-700/30">
                {lineChartData.length} giorni
              </span>
            </div>
          </div>
        </CardHeader>

        <CardContent className="relative z-10 pt-0">
          <div className="w-full h-72 sm:h-80">
            <AnimatePresence mode="wait">
              <motion.div
                key={chartType}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="w-full h-full"
              >
                <ResponsiveContainer width="100%" height="100%">
                  {chartType === 'line' ? (
                    <AreaChart data={lineChartData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                      <defs>
                        <linearGradient id="colorEquity" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(139, 92, 246, 0.08)" vertical={false} />
                      <XAxis
                        dataKey="date"
                        tick={{ fill: '#8b8b9f', fontSize: 11 }}
                        axisLine={{ stroke: 'rgba(139, 92, 246, 0.1)' }}
                        tickLine={false}
                      />
                      <YAxis
                        tick={{ fill: '#8b8b9f', fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={(value) =>
                          Math.abs(value) >= 1000 ? `€${(value / 1000).toFixed(0)}K` : `€${value}`
                        }
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: theme === 'dark' ? '#1a1a24' : '#ffffff',
                          border: '1px solid rgba(139, 92, 246, 0.3)',
                          borderRadius: '0.75rem',
                          boxShadow: '0 8px 24px rgba(139, 92, 246, 0.15)',
                          fontSize: '13px',
                        }}
                        labelStyle={{ color: theme === 'dark' ? '#a78bfa' : '#8b5cf6' }}
                        formatter={(value: any) => [formatValuta(Number(value) || 0), 'Equity']}
                        labelFormatter={(label) => `Data: ${label}`}
                      />
                      <ReferenceLine
                        y={0}
                        stroke="rgba(139, 92, 246, 0.3)"
                        strokeDasharray="3 3"
                      />
                      <Area
                        type="monotone"
                        dataKey="equity"
                        stroke="#a855f7"
                        strokeWidth={2}
                        fillOpacity={1}
                        fill="url(#colorEquity)"
                      />
                    </AreaChart>
                  ) : (
                    <BarChart data={barChartData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(139, 92, 246, 0.08)" vertical={false} />
                      <XAxis
                        dataKey="date"
                        tick={{ fill: '#8b8b9f', fontSize: 11 }}
                        axisLine={{ stroke: 'rgba(139, 92, 246, 0.1)' }}
                        tickLine={false}
                      />
                      <YAxis
                        tick={{ fill: '#8b8b9f', fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={(value) =>
                          Math.abs(value) >= 1000 ? `€${(value / 1000).toFixed(0)}K` : `€${value}`
                        }
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: theme === 'dark' ? '#1a1a24' : '#ffffff',
                          border: '1px solid rgba(139, 92, 246, 0.3)',
                          borderRadius: '0.75rem',
                          boxShadow: '0 8px 24px rgba(139, 92, 246, 0.15)',
                          fontSize: '13px',
                        }}
                        labelStyle={{ color: theme === 'dark' ? '#a78bfa' : '#8b5cf6' }}
                        formatter={(value: any) => [formatValuta(Number(value) || 0), 'P&L']}
                        labelFormatter={(label) => `Data: ${label}`}
                      />
                      <ReferenceLine y={0} stroke="rgba(139, 92, 246, 0.3)" strokeDasharray="3 3" />
                      <Bar dataKey="pnl" radius={[4, 4, 0, 0]}>
                        {barChartData.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={entry.pnl >= 0 ? '#8b5cf6' : '#ef4444'}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  )}
                </ResponsiveContainer>
              </motion.div>
            </AnimatePresence>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

/* ─── Performance Metrics Card (Win Rate + Profit Factor) ─── */
function PerformanceMetricsCard({
  data,
  metriche,
}: {
  data: any[];
  metriche?: any;
}) {
  let winRate = 0;
  let profitFactor = 0;

  if (metriche) {
    winRate = parseFloat(metriche.win_rate) || 0;
    profitFactor = parseFloat(metriche.profit_factor) || 0;
  } else if (data && data.length > 0) {
    winRate = data[0]?.win_rate || 0;
    profitFactor = data[0]?.profit_factor || 0;
  }

  if (!metriche && (!data || data.length === 0)) {
    return (
      <motion.div variants={itemVariants}>
        <Card className="h-full border border-violet-200/40 dark:border-violet-500/20 bg-white/95 dark:bg-[#161622]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-violet-700 dark:text-white">
              <BarChart3 className="w-5 h-5 text-violet-600 dark:text-violet-300" />
              Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-violet-600/80 dark:text-gray-300">
              Nessun dato di performance disponibile
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  return (
    <motion.div variants={itemVariants} className="h-full">
      <Card className="h-full border border-violet-200/40 dark:border-violet-500/20 bg-white/95 dark:bg-[#161622] backdrop-blur-md hover:shadow-lg hover:shadow-violet-500/5 transition-all duration-300 overflow-hidden group relative rounded-xl flex flex-col">
        {/* Background effects */}
        <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 via-transparent to-purple-500/5 dark:from-violet-500/10 dark:via-transparent dark:to-purple-500/10 opacity-60 group-hover:opacity-100 transition-opacity duration-500" />

        <CardHeader className="relative z-10 pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-violet-100 dark:bg-violet-900/30">
                <BarChart3 className="h-4 w-4 text-violet-500" />
              </div>
              <div>
                <CardTitle className="text-base sm:text-lg font-semibold text-violet-700 dark:text-violet-300">
                  Performance
                </CardTitle>
                <CardDescription className="text-xs text-violet-600/70 dark:text-gray-400 mt-0.5">
                  Win Rate e Profit Factor
                </CardDescription>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="relative z-10 pt-0 flex-1 flex items-center justify-center">
          <div className="w-full bg-white/30 dark:bg-gray-900/30 rounded-xl p-4 sm:p-6">
            <div className="flex flex-row gap-6 sm:gap-8 justify-center items-center">
              {/* Win Rate */}
              <div className="flex flex-col items-center">
                <span className="mb-2 px-2.5 py-0.5 bg-white dark:bg-gray-800 rounded-full text-xs font-medium text-violet-700 dark:text-violet-300 border border-violet-200/50 dark:border-violet-700/50">
                  Win Rate
                </span>
                <div className="relative w-24 h-24 sm:w-28 sm:h-28 flex items-center justify-center">
                  <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
                    <circle cx="50" cy="50" r="40" fill="none" stroke="rgba(139, 92, 246, 0.1)" strokeWidth="8" />
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      fill="none"
                      stroke="#8b5cf6"
                      strokeWidth="8"
                      strokeDasharray={`${(winRate / 100) * 251.2} 251.2`}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute flex flex-col items-center justify-center">
                    <span className="text-lg sm:text-xl font-bold text-violet-700 dark:text-violet-300">
                      {Math.round(winRate)}%
                    </span>
                  </div>
                </div>
                <div className="mt-1.5 flex items-center gap-1.5">
                  <div className={`h-2 w-2 rounded-full ${winRate > 50 ? 'bg-green-500' : 'bg-amber-500'}`} />
                  <span className="text-xs text-violet-700 dark:text-violet-300">
                    {winRate > 50 ? 'Buona' : 'Migliorabile'}
                  </span>
                </div>
              </div>

              {/* Profit Factor */}
              <div className="flex flex-col items-center">
                <span className="mb-2 px-2.5 py-0.5 bg-white dark:bg-gray-800 rounded-full text-xs font-medium text-purple-700 dark:text-purple-300 border border-purple-200/50 dark:border-purple-700/50">
                  Profit Factor
                </span>
                <div className="relative w-24 h-24 sm:w-28 sm:h-28 flex items-center justify-center">
                  <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
                    <circle cx="50" cy="50" r="40" fill="none" stroke="rgba(139, 92, 246, 0.1)" strokeWidth="8" />
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      fill="none"
                      stroke="#a855f7"
                      strokeWidth="8"
                      strokeDasharray={`${Math.min((profitFactor / 2.5) * 251.2, 251.2)} 251.2`}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute flex flex-col items-center justify-center">
                    <span className="text-lg sm:text-xl font-bold text-purple-700 dark:text-purple-300">
                      {profitFactor.toFixed(1)}x
                    </span>
                  </div>
                </div>
                <div className="mt-1.5 flex items-center gap-1.5">
                  <div className={`h-2 w-2 rounded-full ${profitFactor > 1.5 ? 'bg-green-500' : 'bg-amber-500'}`} />
                  <span className="text-xs text-purple-700 dark:text-purple-300">
                    {profitFactor > 1.5 ? 'Buona' : 'Migliorabile'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

/* ─── Unified Strategie Section: Chart + Table ─── */
function StrategieSection({
  performanceData,
  equityData,
  equityLines,
}: {
  performanceData: any[];
  equityData: StrategyEquityPoint[];
  equityLines: StrategyLineInfo[];
}) {
  const { resolvedTheme: theme } = useTheme();
  // Track which strategy lines are visible (all visible by default)
  const [visibleLines, setVisibleLines] = useState<Set<string>>(() => {
    return new Set(equityLines.map((l) => l.key));
  });

  // Sync visibleLines when equityLines change
  useEffect(() => {
    setVisibleLines(new Set(equityLines.map((l) => l.key)));
  }, [equityLines]);

  const hasEquityData = equityData && equityData.length > 0 && equityLines && equityLines.length > 0;
  const hasPerformanceData = performanceData && performanceData.length > 0;

  if (!hasPerformanceData && !hasEquityData) {
    return (
      <motion.div variants={itemVariants}>
        <Card className="border border-violet-200/40 dark:border-violet-500/20 bg-white/95 dark:bg-[#161622]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-violet-700 dark:text-white">
              <Target className="w-5 h-5 text-violet-600 dark:text-violet-300" />
              Strategie
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-violet-600/80 dark:text-gray-300">
              Nessuna strategia trovata. Associa una strategia alle tue operazioni per vederla qui.
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  // Chart date labels
  const chartData = hasEquityData
    ? equityData.map((point) => ({
        ...point,
        dateLabel: format(new Date(point.data), 'd MMM', { locale: it }),
      }))
    : [];

  // Match table strategy colors with equity lines
  const getStrategyColor = (stratId: string) => {
    const line = equityLines.find(l => l.key === `s_${stratId.slice(0, 8)}`);
    return line?.colore || '#8b5cf6';
  };

  const getStrategyKey = (stratId: string) => {
    return `s_${stratId.slice(0, 8)}`;
  };

  const toggleStrategyVisibility = (stratId: string) => {
    const key = getStrategyKey(stratId);
    setVisibleLines((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        // Don't allow hiding ALL lines
        if (next.size > 1) {
          next.delete(key);
        }
      } else {
        next.add(key);
      }
      return next;
    });
  };

  return (
    <motion.div variants={itemVariants}>
      <Card className="border border-violet-200/40 dark:border-violet-500/20 bg-white/95 dark:bg-[#161622] backdrop-blur-md hover:shadow-lg hover:shadow-violet-500/5 transition-all duration-300 overflow-hidden group relative rounded-xl">
        <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 via-transparent to-cyan-500/5 dark:from-violet-500/10 dark:via-transparent dark:to-cyan-500/10 opacity-60 group-hover:opacity-100 transition-opacity duration-500" />

        <CardHeader className="relative z-10 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500/15 to-purple-500/15 dark:from-violet-500/20 dark:to-purple-500/20">
              <Target className="h-4.5 w-4.5 text-violet-600 dark:text-violet-300" />
            </div>
            <div>
              <CardTitle className="text-base sm:text-lg font-semibold text-violet-700 dark:text-violet-300">
                Strategie
              </CardTitle>
              <CardDescription className="text-xs text-violet-600/70 dark:text-gray-400 mt-0.5">
                Equity e performance &mdash; clicca una riga per attivare/disattivare la linea
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="relative z-10 pt-0 space-y-4">
          {/* ── Equity Chart ── */}
          {hasEquityData ? (
            <div className="w-full h-56 sm:h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={chartData}
                  margin={{ top: 5, right: 10, left: -10, bottom: 5 }}
                >
                  <defs>
                    {equityLines.map((line) => (
                      <linearGradient
                        key={`grad_${line.key}`}
                        id={`grad_${line.key}`}
                        x1="0" y1="0" x2="0" y2="1"
                      >
                        <stop offset="5%" stopColor={line.colore} stopOpacity={0.15} />
                        <stop offset="95%" stopColor={line.colore} stopOpacity={0} />
                      </linearGradient>
                    ))}
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="rgba(139, 92, 246, 0.08)"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="dateLabel"
                    tick={{ fill: '#8b8b9f', fontSize: 11 }}
                    axisLine={{ stroke: 'rgba(139, 92, 246, 0.1)' }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: '#8b8b9f', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(value) =>
                      Math.abs(value) >= 1000
                        ? `€${(value / 1000).toFixed(0)}K`
                        : `€${value}`
                    }
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: theme === 'dark' ? '#1a1a24' : '#ffffff',
                      border: '1px solid rgba(139, 92, 246, 0.3)',
                      borderRadius: '0.75rem',
                      boxShadow: '0 8px 24px rgba(139, 92, 246, 0.15)',
                      fontSize: '12px',
                      padding: '10px 14px',
                    }}
                    labelStyle={{
                      color: theme === 'dark' ? '#a78bfa' : '#8b5cf6',
                      fontWeight: 600,
                      marginBottom: '6px',
                    }}
                    formatter={(value: any, name: any) => {
                      const lineInfo = equityLines.find((l) => l.key === String(name));
                      if (!lineInfo || !visibleLines.has(String(name))) return [null, null];
                      return [
                        formatValuta(Number(value) || 0),
                        lineInfo.nome,
                      ];
                    }}
                    labelFormatter={(label) => `Data: ${label}`}
                  />
                  <ReferenceLine
                    y={0}
                    stroke="rgba(139, 92, 246, 0.25)"
                    strokeDasharray="3 3"
                  />
                  {equityLines.map((line) => (
                    <Line
                      key={line.key}
                      type="monotone"
                      dataKey={line.key}
                      stroke={visibleLines.has(line.key) ? line.colore : 'transparent'}
                      strokeWidth={visibleLines.has(line.key) ? 2.5 : 0}
                      dot={false}
                      activeDot={
                        visibleLines.has(line.key)
                          ? {
                              r: 5,
                              fill: line.colore,
                              stroke: theme === 'dark' ? '#161622' : '#ffffff',
                              strokeWidth: 2,
                            }
                          : false
                      }
                      connectNulls
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-40 flex items-center justify-center text-violet-600/80 dark:text-gray-300">
              <p className="text-sm text-center">
                Servono almeno 2 operazioni per strategia per visualizzare il grafico.
              </p>
            </div>
          )}

          {/* ── Divider ── */}
          <div className="border-t border-violet-200/20 dark:border-violet-500/10" />

          {/* ── Performance Table ── */}
          {hasPerformanceData ? (
            <div className="overflow-x-auto -mx-4 sm:-mx-6">
              <div className="inline-block min-w-full px-4 sm:px-6">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-violet-200/40 dark:border-violet-500/20">
                      <th className="text-left py-2 px-3 font-semibold text-violet-600 dark:text-violet-300 text-xs uppercase tracking-wider">
                        Strategia
                      </th>
                      <th className="text-center py-2 px-3 font-semibold text-violet-600 dark:text-violet-300 text-xs uppercase tracking-wider hidden sm:table-cell">
                        Op.
                      </th>
                      <th className="text-center py-2 px-3 font-semibold text-violet-600 dark:text-violet-300 text-xs uppercase tracking-wider">
                        Win Rate
                      </th>
                      <th className="text-center py-2 px-3 font-semibold text-violet-600 dark:text-violet-300 text-xs uppercase tracking-wider hidden md:table-cell">
                        PF
                      </th>
                      <th className="text-right py-2 px-3 font-semibold text-violet-600 dark:text-violet-300 text-xs uppercase tracking-wider">
                        P&L
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {performanceData.map((row) => {
                      const pnl = row.pnl_totale || 0;
                      const isPositive = pnl >= 0;
                      const stratColor = getStrategyColor(row.strategia_id || '');
                      const stratKey = getStrategyKey(row.strategia_id || '');
                      const isVisible = visibleLines.has(stratKey);

                      return (
                        <tr
                          key={row.strategia_id}
                          onClick={() => toggleStrategyVisibility(row.strategia_id || '')}
                          className={cn(
                            'border-b border-violet-200/20 dark:border-violet-500/10 transition-all duration-200 cursor-pointer select-none',
                            isVisible
                              ? 'hover:bg-violet-50/50 dark:hover:bg-violet-900/10'
                              : 'opacity-40 hover:opacity-60'
                          )}
                        >
                          <td className="py-2.5 px-3">
                            <div className="flex items-center gap-2.5">
                              <div
                                className={cn(
                                  'w-2.5 h-2.5 rounded-full shrink-0 transition-all duration-200',
                                  isVisible ? 'scale-100' : 'scale-75 ring-1 ring-gray-400/30'
                                )}
                                style={{
                                  backgroundColor: isVisible ? stratColor : 'transparent',
                                  borderWidth: isVisible ? 0 : 2,
                                  borderColor: stratColor,
                                  borderStyle: 'solid',
                                }}
                              />
                              <span className="text-violet-700 dark:text-white text-sm font-medium truncate max-w-[140px] sm:max-w-none">
                                {row.nome_strategia || 'Senza Strategia'}
                              </span>
                              {!isVisible && (
                                <span className="text-[10px] text-gray-400 dark:text-gray-600 italic">
                                  nascosta
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="text-center py-2.5 px-3 text-violet-600/80 dark:text-gray-300 hidden sm:table-cell">
                            {row.totale_operazioni || 0}
                          </td>
                          <td className="text-center py-2.5 px-3">
                            <div className="flex items-center justify-center gap-1.5">
                              <div className={cn(
                                'h-1.5 w-1.5 rounded-full',
                                (row.win_rate || 0) >= 50 ? 'bg-emerald-500' : 'bg-red-500'
                              )} />
                              <span className={cn(
                                'font-semibold text-sm',
                                (row.win_rate || 0) >= 50 ? 'text-emerald-500' : 'text-red-500'
                              )}>
                                {row.win_rate ? formatPercentuale(row.win_rate / 100) : '0%'}
                              </span>
                            </div>
                          </td>
                          <td className="text-center py-2.5 px-3 hidden md:table-cell">
                            <span className={cn(
                              'font-semibold text-sm',
                              (row.profit_factor || 0) >= 1.5 ? 'text-emerald-500' : 'text-red-500'
                            )}>
                              {(row.profit_factor || 0).toFixed(2)}
                            </span>
                          </td>
                          <td className="text-right py-2.5 px-3">
                            <span className={cn(
                              'font-bold text-sm',
                              isPositive ? 'text-emerald-500' : 'text-red-500'
                            )}>
                              {isPositive ? '+' : ''}{formatValuta(pnl)}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="text-center py-4 text-violet-600/80 dark:text-gray-300 text-sm">
              Nessuna strategia trovata
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

/* ─── Best/Worst Trades (FIXED) ─── */
function BestWorstTrades({
  operazioniRecenti,
}: {
  operazioniRecenti: any[];
}) {
  const [activeTab, setActiveTab] = useState<'best' | 'worst'>('best');

  // All operazioni are already filtered to 'chiusa' by the hook
  const trades = operazioniRecenti;

  // Sort by PnL descending for best, ascending for worst
  const sortedByPnlDesc = useMemo(() => {
    return [...trades].sort((a, b) => {
      const aPnl = a.operazione.pnl || 0;
      const bPnl = b.operazione.pnl || 0;
      return bPnl - aPnl;
    });
  }, [trades]);

  // Best: top 5 with highest (positive) PnL
  const bestTrades = useMemo(() => {
    return sortedByPnlDesc.filter(t => (t.operazione.pnl || 0) > 0).slice(0, 5);
  }, [sortedByPnlDesc]);

  // Worst: bottom 5 with lowest (most negative) PnL
  const worstTrades = useMemo(() => {
    return [...trades]
      .filter(t => (t.operazione.pnl || 0) < 0)
      .sort((a, b) => (a.operazione.pnl || 0) - (b.operazione.pnl || 0))
      .slice(0, 5);
  }, [trades]);

  const displayTrades = activeTab === 'best' ? bestTrades : worstTrades;

  return (
    <motion.div variants={itemVariants} className="h-full">
      <Card className="h-full border border-violet-200/40 dark:border-violet-500/20 bg-white/95 dark:bg-[#161622] backdrop-blur-md hover:shadow-lg hover:shadow-violet-500/5 transition-all duration-300 overflow-hidden group relative rounded-xl flex flex-col">
        {/* Dynamic gradient */}
        <div className={`absolute inset-0 bg-gradient-to-br transition-colors duration-300 opacity-60 group-hover:opacity-100 ${
          activeTab === 'best'
            ? 'from-green-500/5 to-emerald-500/5 dark:from-green-500/10 dark:to-emerald-500/10'
            : 'from-red-500/5 to-rose-500/5 dark:from-red-500/10 dark:to-rose-500/10'
        }`} />

        <CardHeader className="relative z-10 pb-2">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2.5">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-violet-100 dark:bg-violet-900/30">
                <Trophy className="h-4 w-4 text-violet-500" />
              </div>
              <div>
                <CardTitle className="text-base sm:text-lg font-semibold text-violet-700 dark:text-violet-300">
                  Migliori e Peggiori
                </CardTitle>
                <CardDescription className="text-xs text-violet-600/70 dark:text-gray-400 mt-0.5">
                  Top e Flop per P&L
                </CardDescription>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="relative z-10 pt-0 flex-1 flex flex-col">
          <div className="flex gap-1 border-b border-violet-200/40 dark:border-violet-500/20 mb-3">
            <button
              onClick={() => setActiveTab('best')}
              className={cn(
                'px-3 py-2 font-medium text-sm border-b-2 transition-colors',
                activeTab === 'best'
                  ? 'border-emerald-400 text-emerald-500 dark:text-emerald-400'
                  : 'border-transparent text-violet-600/80 dark:text-gray-400 hover:text-violet-700 dark:hover:text-white'
              )}
            >
              Migliori ({bestTrades.length})
            </button>
            <button
              onClick={() => setActiveTab('worst')}
              className={cn(
                'px-3 py-2 font-medium text-sm border-b-2 transition-colors',
                activeTab === 'worst'
                  ? 'border-red-400 text-red-500 dark:text-red-400'
                  : 'border-transparent text-violet-600/80 dark:text-gray-400 hover:text-violet-700 dark:hover:text-white'
              )}
            >
              Peggiori ({worstTrades.length})
            </button>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="space-y-2 flex-1"
            >
              {displayTrades.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-violet-600/80 dark:text-gray-400">
                  {activeTab === 'best' ? (
                    <>
                      <TrendingUp className="h-8 w-8 mb-2 opacity-40" />
                      <p className="text-sm">Nessun trade in profitto</p>
                    </>
                  ) : (
                    <>
                      <TrendingDown className="h-8 w-8 mb-2 opacity-40" />
                      <p className="text-sm">Nessun trade in perdita</p>
                    </>
                  )}
                </div>
              ) : (
                displayTrades.map((trade) => {
                  const pnl = trade.operazione.pnl || 0;
                  const isPositive = pnl >= 0;

                  return (
                    <div
                      key={trade.operazione.id}
                      className="flex items-center justify-between p-2.5 sm:p-3 rounded-lg bg-white/50 dark:bg-gray-900/50 hover:bg-white/70 dark:hover:bg-gray-900/70 transition-colors border border-violet-200/20 dark:border-violet-500/10"
                    >
                      <div className="flex items-center gap-2.5 flex-1 min-w-0">
                        <div className={cn(
                          'w-1.5 h-8 rounded-full shrink-0',
                          isPositive ? 'bg-emerald-500' : 'bg-red-500'
                        )} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-semibold text-sm text-violet-700 dark:text-white">
                              {trade.operazione.ticker}
                            </span>
                            {trade.strategia && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-violet-500/15 text-violet-600 dark:text-violet-300 truncate max-w-[80px]">
                                {trade.strategia.nome}
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-violet-600/70 dark:text-gray-400 mt-0.5">
                            {formatData(trade.operazione.data)}
                          </div>
                        </div>
                      </div>
                      <div className={cn(
                        'text-right font-semibold text-sm shrink-0 ml-2',
                        isPositive ? 'text-emerald-500' : 'text-red-500'
                      )}>
                        {formatValuta(pnl)}
                      </div>
                    </div>
                  );
                })
              )}
            </motion.div>
          </AnimatePresence>
        </CardContent>
      </Card>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   MAIN DASHBOARD PAGE
   ═══════════════════════════════════════════════════════════════ */
export default function DashboardPage() {
  const {
    metriche,
    performanceStrategie,
    equityData,
    operazioniRecenti,
    totaleCommissioni,
    strategyEquityData,
    strategyLines,
    isLoading,
    errore,
    dateRange,
    setDateRange,
  } = useDashboardData();

  const [isLoaded, setIsLoaded] = useState(false);
  const [mainChartType, setMainChartType] = useState<'line' | 'bar'>('line');
  const [activeTab, setActiveTab] = useState('panoramica');

  useEffect(() => {
    const timer = setTimeout(() => setIsLoaded(true), 100);
    return () => clearTimeout(timer);
  }, []);

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  if (!metriche) {
    return <EmptyState />;
  }

  const totalTrades = metriche.totale_operazioni || 0;
  const netPnl = metriche.pnl_totale || 0;

  return (
    <motion.div
      className="flex flex-col gap-4 sm:gap-5 p-3 sm:p-4 md:p-6 min-h-[calc(100vh-4rem)] bg-transparent relative"
      variants={containerVariants}
      initial="hidden"
      animate={isLoaded ? 'visible' : 'hidden'}
    >
      {/* Top bar: Tabs + Date Filter */}
      <motion.div
        className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sticky top-0 z-10 py-2.5 px-3 sm:px-4 bg-white/95 dark:bg-[#161622]/95 border-gray-200/80 dark:border-violet-500/20 backdrop-blur-md rounded-xl border shadow-sm"
        variants={itemVariants}
      >
        <div className="shrink-0">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="bg-gray-50/80 dark:bg-gray-900/80 p-1 rounded-lg border border-violet-200/30 dark:border-violet-500/30">
              <TabsTrigger
                value="panoramica"
                className="data-[state=active]:bg-white dark:data-[state=active]:bg-gray-800 data-[state=active]:text-violet-600 dark:data-[state=active]:text-violet-300 rounded-md transition-all duration-200 flex items-center gap-1.5 text-sm px-3 py-1.5"
              >
                <BarChart3 className="h-3.5 w-3.5" />
                <span>Panoramica</span>
              </TabsTrigger>
              <TabsTrigger
                value="progressi"
                className="data-[state=active]:bg-white dark:data-[state=active]:bg-gray-800 data-[state=active]:text-violet-600 dark:data-[state=active]:text-violet-300 rounded-md transition-all duration-200 flex items-center gap-1.5 text-sm px-3 py-1.5"
              >
                <LineChartIcon className="h-3.5 w-3.5" />
                <span>Progressi</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <div className="hidden sm:block h-5 w-px bg-violet-200/40 dark:bg-violet-700/30 shrink-0" />

        <div className="flex-1 overflow-x-auto">
          <DateRangeFilter dateRange={dateRange} onDateRangeChange={setDateRange} />
        </div>
      </motion.div>

      {/* Content */}
      <AnimatePresence mode="wait">
        {activeTab === 'panoramica' && (
          <motion.div
            key="panoramica"
            variants={itemVariants}
            className="w-full space-y-4 sm:space-y-5"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            {/* 4 KPI Cards — Win Rate removed, Total Commissions added */}
            <motion.div
              className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4"
              variants={fadeInUp}
              initial="hidden"
              animate="visible"
              transition={{ staggerChildren: 0.08 }}
            >
              <KPICard
                label="Profitto/Perdita"
                value={formatValuta(netPnl)}
                icon={
                  netPnl >= 0
                    ? <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" />
                    : <TrendingDown className="w-4 h-4 sm:w-5 sm:h-5 text-red-500" />
                }
                gradientFrom="from-green-500/5"
                gradientTo="to-emerald-500/5 dark:from-green-500/10 dark:to-emerald-500/10"
              />

              <KPICard
                label="Commissioni Pagate"
                value={formatValuta(totaleCommissioni)}
                icon={<DollarSign className="w-4 h-4 sm:w-5 sm:h-5 text-amber-600" />}
                gradientFrom="from-amber-500/5"
                gradientTo="to-orange-500/5 dark:from-amber-500/10 dark:to-orange-500/10"
                subtitle="Totale costi"
              />

              <KPICard
                label="Trade Totali"
                value={totalTrades}
                icon={<Hash className="w-4 h-4 sm:w-5 sm:h-5 text-violet-600 dark:text-violet-400" />}
                gradientFrom="from-violet-500/5"
                gradientTo="to-purple-500/5 dark:from-violet-500/10 dark:to-purple-500/10"
              />

              <KPICard
                label="Giorni di Trading"
                value={equityData.length}
                icon={<Clock className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />}
                gradientFrom="from-blue-500/5"
                gradientTo="to-cyan-500/5 dark:from-blue-500/10 dark:to-cyan-500/10"
              />
            </motion.div>

            {/* Row 2: Equity Chart (2/3) + Performance (1/3) */}
            <motion.div
              className="grid gap-4 sm:gap-5 lg:grid-cols-3"
              variants={fadeInUp}
              initial="hidden"
              animate="visible"
              transition={{ staggerChildren: 0.06, delayChildren: 0.1 }}
            >
              <div className="lg:col-span-2">
                <EquityChart
                  equityData={equityData}
                  chartType={mainChartType}
                  onChartTypeChange={setMainChartType}
                />
              </div>

              <div className="lg:col-span-1">
                <PerformanceMetricsCard data={performanceStrategie} metriche={metriche} />
              </div>
            </motion.div>

            {/* Row 3: Strategie (chart+table unified) + Best/Worst Trades */}
            <motion.div
              className="grid gap-4 sm:gap-5 lg:grid-cols-5"
              variants={fadeInUp}
              initial="hidden"
              animate="visible"
              transition={{ staggerChildren: 0.06, delayChildren: 0.15 }}
            >
              <div className="lg:col-span-3">
                <StrategieSection
                  performanceData={performanceStrategie}
                  equityData={strategyEquityData}
                  equityLines={strategyLines}
                />
              </div>

              <div className="lg:col-span-2">
                <BestWorstTrades operazioniRecenti={operazioniRecenti} />
              </div>
            </motion.div>
          </motion.div>
        )}

        {activeTab === 'progressi' && (
          <motion.div
            key="progressi"
            variants={itemVariants}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="w-full"
          >
            <Card className="border border-violet-200/40 dark:border-violet-500/20 bg-white/95 dark:bg-[#161622] backdrop-blur-md">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-violet-700 dark:text-white">
                  <LineChartIcon className="h-5 w-5 text-violet-500" />
                  Progressi
                </CardTitle>
                <CardDescription className="text-violet-600/80 dark:text-gray-300">
                  Funzionalità in arrivo
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col items-center justify-center p-8 sm:p-12 text-center">
                  <LineChartIcon className="h-12 w-12 sm:h-16 sm:w-16 text-violet-200 dark:text-violet-800 mb-4" />
                  <h3 className="text-lg sm:text-xl font-medium mb-2 text-violet-700 dark:text-white">
                    Funzionalità in sviluppo
                  </h3>
                  <p className="text-sm text-violet-600/80 dark:text-gray-300 max-w-md">
                    Questa sezione mostrerà i tuoi progressi nel trading nel tempo. Stiamo lavorando per renderla
                    disponibile presto.
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error message */}
      {errore && (
        <motion.div
          variants={itemVariants}
          className="p-4 rounded-lg bg-red-500/10 border border-red-500/30 text-red-500 dark:text-red-400 text-sm"
        >
          {errore}
        </motion.div>
      )}
    </motion.div>
  );
}
