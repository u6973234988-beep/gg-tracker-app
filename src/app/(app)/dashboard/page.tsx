'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
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
        {['7G', '30G', '90G', '1A'].map((label, i) => (
          <button
            key={label}
            onClick={() => handlePreset([7, 30, 90, 365][i])}
            className="px-2.5 py-1.5 text-xs font-medium rounded-lg bg-[#1C1C1F] text-[#c4a0e8] hover:bg-[#46265F]/20 border border-[#2D2D32] transition-colors"
          >
            {label}
          </button>
        ))}
      </div>

      <div className="hidden sm:block h-5 w-px bg-[#2D2D32]" />

      {/* Custom date inputs */}
      <div className="flex items-center gap-1.5">
        <div className="relative">
          <Calendar className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-[#80808A] pointer-events-none" />
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="pl-6 pr-2 py-1.5 text-xs rounded-lg bg-[#1C1C1F] text-[#c4a0e8] border border-[#2D2D32] focus:outline-none focus:ring-1 focus:ring-[#6A3D8F] w-[120px]"
            placeholder="Da"
          />
        </div>
        <span className="text-xs text-[#80808A]">—</span>
        <div className="relative">
          <Calendar className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-[#80808A] pointer-events-none" />
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="pl-6 pr-2 py-1.5 text-xs rounded-lg bg-[#1C1C1F] text-[#c4a0e8] border border-[#2D2D32] focus:outline-none focus:ring-1 focus:ring-[#6A3D8F] w-[120px]"
            placeholder="A"
          />
        </div>
        <button
          onClick={handleApply}
          className="px-3 py-1.5 text-xs font-medium rounded-lg bg-[#46265F] text-[#F8F8FF] hover:bg-[#6A3D8F] transition-colors"
        >
          Applica
        </button>
        {isActive && (
          <button
            onClick={handleReset}
            className="p-1.5 rounded-lg text-[#80808A] hover:bg-[#46265F]/20 transition-colors"
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
  subtitle,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  gradientFrom?: string;
  gradientTo?: string;
  subtitle?: string;
}) {
  return (
    <motion.div variants={itemVariants}>
      <Card className="relative overflow-hidden border border-[#2D2D32] bg-[#1C1C1F] hover:border-[#6A3D8F]/40 transition-all duration-300 rounded-xl h-full">
        <CardContent className="p-4 sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-xs sm:text-sm font-medium text-[#80808A] truncate">
                {label}
              </p>
              <p className="mt-1.5 text-xl sm:text-2xl font-bold text-[#F8F8FF] truncate">
                {value}
              </p>
              {subtitle && (
                <p className="mt-1 text-xs text-[#80808A]">
                  {subtitle}
                </p>
              )}
            </div>
            <div className="p-2 sm:p-2.5 rounded-xl bg-[#46265F]/20 shrink-0">
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
        <div className="h-10 w-48 bg-[#2D2D32] rounded-lg animate-pulse" />
        <div className="h-8 w-64 bg-[#2D2D32] rounded-lg animate-pulse" />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="border border-[#2D2D32] bg-[#1C1C1F]">
            <CardContent className="p-4 space-y-3">
              <div className="h-3 w-20 bg-[#2D2D32] rounded animate-pulse" />
              <div className="h-7 w-28 bg-[#2D2D32] rounded animate-pulse" />
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2 border border-[#2D2D32] bg-[#1C1C1F]">
          <CardContent className="p-4">
            <div className="h-80 bg-[#2D2D32] rounded animate-pulse" />
          </CardContent>
        </Card>
        <Card className="border border-[#2D2D32] bg-[#1C1C1F]">
          <CardContent className="p-4">
            <div className="h-80 bg-[#2D2D32] rounded animate-pulse" />
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
        <h1 className="text-2xl font-bold text-[#F8F8FF] font-mono uppercase tracking-widest">Dashboard</h1>
        <p className="text-[#80808A] mt-2">
          Benvenuto in GG Tracker - Il tuo nuovo compagno di trading
        </p>
      </motion.div>

      <motion.div variants={itemVariants}>
        <Card className="border-dashed border-2 border-[#6A3D8F]/30 bg-[#46265F]/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-[#F8F8FF]">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              Nessun dato disponibile
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-[#80808A]">
              Non hai ancora registrato operazioni. Inizia a tracciare i tuoi trade per visualizzare
              le metriche di performance.
            </p>
            <button
              onClick={() => router.push('/registro')}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#46265F] hover:bg-[#6A3D8F] text-[#F8F8FF] font-medium transition-colors"
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
  if (!equityData || equityData.length === 0) {
    return (
      <motion.div variants={itemVariants}>
        <Card className="h-full border border-[#2D2D32] bg-[#1C1C1F]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-[#F8F8FF]">
              <TrendingUp className="w-5 h-5 text-[#c4a0e8]" />
              Equity Line
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72 flex items-center justify-center text-[#80808A]">
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
      <Card className="h-full border border-[#2D2D32] bg-[#1C1C1F] hover:border-[#6A3D8F]/30 transition-all duration-300 overflow-hidden rounded-xl">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2.5">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#46265F]/20">
                <TrendingUp className="h-4 w-4 text-[#c4a0e8]" />
              </div>
              <div>
                <CardTitle className="text-base sm:text-lg font-semibold text-[#c4a0e8]">
                  {chartType === 'line' ? 'Equity Line' : 'P&L Giornaliero'}
                </CardTitle>
                <CardDescription className="text-xs text-[#80808A] mt-0.5">
                  {chartType === 'line'
                    ? 'Andamento cumulativo del P&L'
                    : 'P&L netto giornaliero'}
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex bg-[#0F0F11] rounded-lg p-0.5 border border-[#2D2D32]">
                <button
                  onClick={() => onChartTypeChange('line')}
                  className={`flex items-center justify-center h-7 w-7 rounded-md text-xs transition-all duration-200 ${
                    chartType === 'line'
                      ? 'bg-[#46265F] text-[#F8F8FF]'
                      : 'text-[#80808A] hover:bg-[#46265F]/20 hover:text-[#c4a0e8]'
                  }`}
                  title="Equity Line"
                >
                  <LineChartIcon className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => onChartTypeChange('bar')}
                  className={`flex items-center justify-center h-7 w-7 rounded-md text-xs transition-all duration-200 ${
                    chartType === 'bar'
                      ? 'bg-[#46265F] text-[#F8F8FF]'
                      : 'text-[#80808A] hover:bg-[#46265F]/20 hover:text-[#c4a0e8]'
                  }`}
                  title="P&L Giornaliero"
                >
                  <BarChart3 className="h-3.5 w-3.5" />
                </button>
              </div>
              <span className="text-xs px-2 py-1 rounded-lg bg-[#46265F]/20 text-[#c4a0e8] font-medium border border-[#2D2D32]">
                {lineChartData.length} giorni
              </span>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-0">
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
                          <stop offset="5%" stopColor="#6A3D8F" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#6A3D8F" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(106, 61, 143, 0.08)" vertical={false} />
                      <XAxis
                        dataKey="date"
                        tick={{ fill: '#80808A', fontSize: 11 }}
                        axisLine={{ stroke: 'rgba(106, 61, 143, 0.1)' }}
                        tickLine={false}
                      />
                      <YAxis
                        tick={{ fill: '#80808A', fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={(value) =>
                          Math.abs(value) >= 1000 ? `€${(value / 1000).toFixed(0)}K` : `€${value}`
                        }
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#1C1C1F',
                          border: '1px solid rgba(106, 61, 143, 0.3)',
                          borderRadius: '0.75rem',
                          boxShadow: '0 8px 24px rgba(106, 61, 143, 0.15)',
                          fontSize: '13px',
                        }}
                        labelStyle={{ color: '#c4a0e8' }}
                        formatter={(value: any) => [formatValuta(Number(value) || 0), 'Equity']}
                        labelFormatter={(label) => `Data: ${label}`}
                      />
                      <ReferenceLine
                        y={0}
                        stroke="rgba(106, 61, 143, 0.3)"
                        strokeDasharray="3 3"
                      />
                      <Area
                        type="monotone"
                        dataKey="equity"
                        stroke="#6A3D8F"
                        strokeWidth={2}
                        fillOpacity={1}
                        fill="url(#colorEquity)"
                      />
                    </AreaChart>
                  ) : (
                    <BarChart data={barChartData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(106, 61, 143, 0.08)" vertical={false} />
                      <XAxis
                        dataKey="date"
                        tick={{ fill: '#80808A', fontSize: 11 }}
                        axisLine={{ stroke: 'rgba(106, 61, 143, 0.1)' }}
                        tickLine={false}
                      />
                      <YAxis
                        tick={{ fill: '#80808A', fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={(value) =>
                          Math.abs(value) >= 1000 ? `€${(value / 1000).toFixed(0)}K` : `€${value}`
                        }
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#1C1C1F',
                          border: '1px solid rgba(106, 61, 143, 0.3)',
                          borderRadius: '0.75rem',
                          boxShadow: '0 8px 24px rgba(106, 61, 143, 0.15)',
                          fontSize: '13px',
                        }}
                        labelStyle={{ color: '#c4a0e8' }}
                        formatter={(value: any) => [formatValuta(Number(value) || 0), 'P&L']}
                        labelFormatter={(label) => `Data: ${label}`}
                      />
                      <ReferenceLine y={0} stroke="rgba(106, 61, 143, 0.3)" strokeDasharray="3 3" />
                      <Bar dataKey="pnl" radius={[4, 4, 0, 0]}>
                        {barChartData.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={entry.pnl >= 0 ? '#6A3D8F' : '#DC2626'}
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
        <Card className="h-full border border-[#2D2D32] bg-[#1C1C1F]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-[#F8F8FF]">
              <BarChart3 className="w-5 h-5 text-[#c4a0e8]" />
              Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-[#80808A]">
              Nessun dato di performance disponibile
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  return (
    <motion.div variants={itemVariants} className="h-full">
      <Card className="h-full border border-[#2D2D32] bg-[#1C1C1F] hover:border-[#6A3D8F]/30 transition-all duration-300 overflow-hidden rounded-xl flex flex-col">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#46265F]/20">
                <BarChart3 className="h-4 w-4 text-[#c4a0e8]" />
              </div>
              <div>
                <CardTitle className="text-base sm:text-lg font-semibold text-[#c4a0e8]">
                  Performance
                </CardTitle>
                <CardDescription className="text-xs text-[#80808A] mt-0.5">
                  Win Rate e Profit Factor
                </CardDescription>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-0 flex-1 flex items-center justify-center">
          <div className="w-full rounded-xl p-4 sm:p-6">
            <div className="flex flex-row gap-6 sm:gap-8 justify-center items-center">
              {/* Win Rate */}
              <div className="flex flex-col items-center">
                <span className="mb-2 px-2.5 py-0.5 bg-[#1C1C1F] rounded-full text-xs font-medium text-[#c4a0e8] border border-[#2D2D32]">
                  Win Rate
                </span>
                <div className="relative w-24 h-24 sm:w-28 sm:h-28 flex items-center justify-center">
                  <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
                    <circle cx="50" cy="50" r="40" fill="none" stroke="rgba(106, 61, 143, 0.15)" strokeWidth="8" />
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      fill="none"
                      stroke="#6A3D8F"
                      strokeWidth="8"
                      strokeDasharray={`${(winRate / 100) * 251.2} 251.2`}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute flex flex-col items-center justify-center">
                    <span className="text-lg sm:text-xl font-bold text-[#c4a0e8]">
                      {Math.round(winRate)}%
                    </span>
                  </div>
                </div>
                <div className="mt-1.5 flex items-center gap-1.5">
                  <div className={`h-2 w-2 rounded-full ${winRate > 50 ? 'bg-[#22C55E]' : 'bg-amber-500'}`} />
                  <span className="text-xs text-[#80808A]">
                    {winRate > 50 ? 'Buona' : 'Migliorabile'}
                  </span>
                </div>
              </div>

              {/* Profit Factor */}
              <div className="flex flex-col items-center">
                <span className="mb-2 px-2.5 py-0.5 bg-[#1C1C1F] rounded-full text-xs font-medium text-[#c4a0e8] border border-[#2D2D32]">
                  Profit Factor
                </span>
                <div className="relative w-24 h-24 sm:w-28 sm:h-28 flex items-center justify-center">
                  <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
                    <circle cx="50" cy="50" r="40" fill="none" stroke="rgba(106, 61, 143, 0.15)" strokeWidth="8" />
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      fill="none"
                      stroke="#6A3D8F"
                      strokeWidth="8"
                      strokeDasharray={`${Math.min((profitFactor / 2.5) * 251.2, 251.2)} 251.2`}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute flex flex-col items-center justify-center">
                    <span className="text-lg sm:text-xl font-bold text-[#c4a0e8]">
                      {profitFactor.toFixed(1)}x
                    </span>
                  </div>
                </div>
                <div className="mt-1.5 flex items-center gap-1.5">
                  <div className={`h-2 w-2 rounded-full ${profitFactor > 1.5 ? 'bg-[#22C55E]' : 'bg-amber-500'}`} />
                  <span className="text-xs text-[#80808A]">
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
        <Card className="border border-[#2D2D32] bg-[#1C1C1F]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-[#F8F8FF]">
              <Target className="w-5 h-5 text-[#c4a0e8]" />
              Strategie
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-[#80808A]">
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
    return line?.colore || '#6A3D8F';
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
      <Card className="border border-[#2D2D32] bg-[#1C1C1F] hover:border-[#6A3D8F]/30 transition-all duration-300 overflow-hidden rounded-xl">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-[#46265F]/20">
              <Target className="h-4 w-4 text-[#c4a0e8]" />
            </div>
            <div>
              <CardTitle className="text-base sm:text-lg font-semibold text-[#c4a0e8]">
                Strategie
              </CardTitle>
              <CardDescription className="text-xs text-[#80808A] mt-0.5">
                Equity e performance &mdash; clicca una riga per attivare/disattivare la linea
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-0 space-y-4">
          {/* ── Equity Chart ── */}
          {hasEquityData ? (
            <div className="w-full h-56 sm:h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={chartData}
                  margin={{ top: 5, right: 10, left: -10, bottom: 5 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="rgba(106, 61, 143, 0.08)"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="dateLabel"
                    tick={{ fill: '#80808A', fontSize: 11 }}
                    axisLine={{ stroke: 'rgba(106, 61, 143, 0.1)' }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: '#80808A', fontSize: 11 }}
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
                      backgroundColor: '#1C1C1F',
                      border: '1px solid rgba(106, 61, 143, 0.3)',
                      borderRadius: '0.75rem',
                      boxShadow: '0 8px 24px rgba(106, 61, 143, 0.15)',
                      fontSize: '12px',
                      padding: '10px 14px',
                    }}
                    labelStyle={{
                      color: '#c4a0e8',
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
                    stroke="rgba(106, 61, 143, 0.25)"
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
                              stroke: '#1C1C1F',
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
            <div className="h-40 flex items-center justify-center text-[#80808A]">
              <p className="text-sm text-center">
                Servono almeno 2 operazioni per strategia per visualizzare il grafico.
              </p>
            </div>
          )}

          {/* ── Divider ── */}
          <div className="border-t border-[#2D2D32]" />

          {/* ── Performance Table ── */}
          {hasPerformanceData ? (
            <div className="overflow-x-auto -mx-4 sm:-mx-6">
              <div className="inline-block min-w-full px-4 sm:px-6">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[#2D2D32]">
                      <th className="text-left py-2 px-3 font-semibold text-[#80808A] text-xs uppercase tracking-wider">
                        Strategia
                      </th>
                      <th className="text-center py-2 px-3 font-semibold text-[#80808A] text-xs uppercase tracking-wider hidden sm:table-cell">
                        Op.
                      </th>
                      <th className="text-center py-2 px-3 font-semibold text-[#80808A] text-xs uppercase tracking-wider">
                        Win Rate
                      </th>
                      <th className="text-center py-2 px-3 font-semibold text-[#80808A] text-xs uppercase tracking-wider hidden md:table-cell">
                        PF
                      </th>
                      <th className="text-right py-2 px-3 font-semibold text-[#80808A] text-xs uppercase tracking-wider">
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
                            'border-b border-[#2D2D32]/30 transition-all duration-200 cursor-pointer select-none',
                            isVisible
                              ? 'hover:bg-[#46265F]/10'
                              : 'opacity-40 hover:opacity-60'
                          )}
                        >
                          <td className="py-2.5 px-3">
                            <div className="flex items-center gap-2.5">
                              <div
                                className={cn(
                                  'w-2.5 h-2.5 rounded-full shrink-0 transition-all duration-200',
                                  isVisible ? 'scale-100' : 'scale-75'
                                )}
                                style={{
                                  backgroundColor: isVisible ? stratColor : 'transparent',
                                  borderWidth: isVisible ? 0 : 2,
                                  borderColor: stratColor,
                                  borderStyle: 'solid',
                                }}
                              />
                              <span className="text-[#F8F8FF] text-sm font-medium truncate max-w-[140px] sm:max-w-none">
                                {row.nome_strategia || 'Senza Strategia'}
                              </span>
                              {!isVisible && (
                                <span className="text-[10px] text-[#80808A] italic">
                                  nascosta
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="text-center py-2.5 px-3 text-[#80808A] hidden sm:table-cell">
                            {row.totale_operazioni || 0}
                          </td>
                          <td className="text-center py-2.5 px-3">
                            <div className="flex items-center justify-center gap-1.5">
                              <div className={cn(
                                'h-1.5 w-1.5 rounded-full',
                                (row.win_rate || 0) >= 50 ? 'bg-[#22C55E]' : 'bg-[#DC2626]'
                              )} />
                              <span className={cn(
                                'font-semibold text-sm',
                                (row.win_rate || 0) >= 50 ? 'text-[#22C55E]' : 'text-[#DC2626]'
                              )}>
                                {row.win_rate ? formatPercentuale(row.win_rate / 100) : '0%'}
                              </span>
                            </div>
                          </td>
                          <td className="text-center py-2.5 px-3 hidden md:table-cell">
                            <span className={cn(
                              'font-semibold text-sm',
                              (row.profit_factor || 0) >= 1.5 ? 'text-[#22C55E]' : 'text-[#DC2626]'
                            )}>
                              {(row.profit_factor || 0).toFixed(2)}
                            </span>
                          </td>
                          <td className="text-right py-2.5 px-3">
                            <span className={cn(
                              'font-bold text-sm',
                              isPositive ? 'text-[#22C55E]' : 'text-[#DC2626]'
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
            <div className="text-center py-4 text-[#80808A] text-sm">
              Nessuna strategia trovata
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

/* ─── Best/Worst Trades ─── */
function BestWorstTrades({
  operazioniRecenti,
}: {
  operazioniRecenti: any[];
}) {
  const [activeTab, setActiveTab] = useState<'best' | 'worst'>('best');

  const trades = operazioniRecenti;

  const sortedByPnlDesc = useMemo(() => {
    return [...trades].sort((a, b) => {
      const aPnl = a.operazione.pnl || 0;
      const bPnl = b.operazione.pnl || 0;
      return bPnl - aPnl;
    });
  }, [trades]);

  const bestTrades = useMemo(() => {
    return sortedByPnlDesc.filter(t => (t.operazione.pnl || 0) > 0).slice(0, 5);
  }, [sortedByPnlDesc]);

  const worstTrades = useMemo(() => {
    return [...trades]
      .filter(t => (t.operazione.pnl || 0) < 0)
      .sort((a, b) => (a.operazione.pnl || 0) - (b.operazione.pnl || 0))
      .slice(0, 5);
  }, [trades]);

  const displayTrades = activeTab === 'best' ? bestTrades : worstTrades;

  return (
    <motion.div variants={itemVariants} className="h-full">
      <Card className="h-full border border-[#2D2D32] bg-[#1C1C1F] hover:border-[#6A3D8F]/30 transition-all duration-300 overflow-hidden rounded-xl flex flex-col">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2.5">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#46265F]/20">
                <Trophy className="h-4 w-4 text-[#c4a0e8]" />
              </div>
              <div>
                <CardTitle className="text-base sm:text-lg font-semibold text-[#c4a0e8]">
                  Migliori e Peggiori
                </CardTitle>
                <CardDescription className="text-xs text-[#80808A] mt-0.5">
                  Top e Flop per P&L
                </CardDescription>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-0 flex-1 flex flex-col">
          <div className="flex gap-1 border-b border-[#2D2D32] mb-3">
            <button
              onClick={() => setActiveTab('best')}
              className={cn(
                'px-3 py-2 font-medium text-sm border-b-2 transition-colors',
                activeTab === 'best'
                  ? 'border-[#22C55E] text-[#22C55E]'
                  : 'border-transparent text-[#80808A] hover:text-[#F8F8FF]'
              )}
            >
              Migliori ({bestTrades.length})
            </button>
            <button
              onClick={() => setActiveTab('worst')}
              className={cn(
                'px-3 py-2 font-medium text-sm border-b-2 transition-colors',
                activeTab === 'worst'
                  ? 'border-[#DC2626] text-[#DC2626]'
                  : 'border-transparent text-[#80808A] hover:text-[#F8F8FF]'
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
                <div className="flex flex-col items-center justify-center py-8 text-[#80808A]">
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
                      className="flex items-center justify-between p-2.5 sm:p-3 rounded-lg bg-[#0F0F11]/50 hover:bg-[#0F0F11]/80 transition-colors border border-[#2D2D32]/40"
                    >
                      <div className="flex items-center gap-2.5 flex-1 min-w-0">
                        <div className={cn(
                          'w-1.5 h-8 rounded-full shrink-0',
                          isPositive ? 'bg-[#22C55E]' : 'bg-[#DC2626]'
                        )} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-semibold text-sm text-[#F8F8FF]">
                              {trade.operazione.ticker}
                            </span>
                            {trade.strategia && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-[#46265F]/15 text-[#c4a0e8] truncate max-w-[80px]">
                                {trade.strategia.nome}
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-[#80808A] mt-0.5">
                            {formatData(trade.operazione.data)}
                          </div>
                        </div>
                      </div>
                      <div className={cn(
                        'text-right font-semibold text-sm shrink-0 ml-2',
                        isPositive ? 'text-[#22C55E]' : 'text-[#DC2626]'
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
        className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sticky top-0 z-10 py-2.5 px-3 sm:px-4 bg-[#1C1C1F] border border-[#2D2D32] rounded-xl"
        variants={itemVariants}
      >

        <div className="flex-1 overflow-x-auto">
          <DateRangeFilter dateRange={dateRange} onDateRangeChange={setDateRange} />
        </div>
      </motion.div>

      {/* Content */}
      <AnimatePresence mode="wait">
          <motion.div
            key="panoramica"
            variants={itemVariants}
            className="w-full space-y-4 sm:space-y-5"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            {/* 4 KPI Cards */}
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
                    ? <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-[#22C55E]" />
                    : <TrendingDown className="w-4 h-4 sm:w-5 sm:h-5 text-[#DC2626]" />
                }
              />

              <KPICard
                label="Commissioni Pagate"
                value={formatValuta(totaleCommissioni)}
                icon={<DollarSign className="w-4 h-4 sm:w-5 sm:h-5 text-amber-500" />}
                subtitle="Totale costi"
              />

              <KPICard
                label="Trade Totali"
                value={totalTrades}
                icon={<Hash className="w-4 h-4 sm:w-5 sm:h-5 text-[#c4a0e8]" />}
              />

              <KPICard
                label="Giorni di Trading"
                value={equityData.length}
                icon={<Clock className="w-4 h-4 sm:w-5 sm:h-5 text-blue-400" />}
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

            {/* Row 3: Strategie + Best/Worst Trades */}
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
      </AnimatePresence>

      {/* Error message */}
      {errore && (
        <motion.div
          variants={itemVariants}
          className="p-4 rounded-lg bg-[#DC2626]/10 border border-[#DC2626]/30 text-[#DC2626] text-sm"
        >
          {errore}
        </motion.div>
      )}
    </motion.div>
  );
}
