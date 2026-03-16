'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from 'next-themes';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
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
  BarChart3,
  ArrowUpRight,
  LineChart as LineChartIcon,
  AlertTriangle,
} from 'lucide-react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale/it';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useDashboardData } from '@/hooks/useDashboardData';
import { formatValuta, formatPercentuale, formatData, cn } from '@/lib/utils';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: 'easeOut' as const },
  },
};

const fadeInUp = {
  hidden: { opacity: 0, y: 15 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: 'spring' as const,
      stiffness: 120,
      damping: 12,
    },
  },
};

function KPICard({
  label,
  value,
  icon: Icon,
  gradientFrom,
  gradientTo,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  gradientFrom: string;
  gradientTo: string;
}) {
  return (
    <motion.div variants={itemVariants}>
      <Card className="relative overflow-hidden border border-violet-200/40 dark:border-violet-500/20 bg-white/95 dark:bg-[#161622] backdrop-blur-md hover:shadow-md transition-all duration-300 group rounded-xl">
        <div className={`absolute inset-0 bg-gradient-to-br ${gradientFrom} ${gradientTo} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-violet-700 dark:text-white card-title">
            {label}
          </CardTitle>
          <div className="p-2 rounded-lg bg-violet-500/10 dark:bg-violet-500/20">
            {Icon}
          </div>
        </CardHeader>

        <CardContent className="relative z-10">
          <div className="space-y-2">
            <div className="text-2xl font-bold text-violet-700 dark:text-white high-contrast-text">
              {value}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <div className="h-10 w-48 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse" />
        <div className="h-5 w-80 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="border border-violet-200/40 dark:border-violet-500/20">
            <CardHeader className="pb-3">
              <div className="h-4 w-32 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="h-8 w-24 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
              <div className="h-4 w-40 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border border-violet-200/40 dark:border-violet-500/20">
        <CardHeader>
          <div className="h-6 w-48 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
        </CardHeader>
        <CardContent>
          <div className="h-80 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
        </CardContent>
      </Card>
    </div>
  );
}

function EmptyState() {
  const router = useRouter();

  return (
    <div className="space-y-8">
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
  const { theme } = useTheme();

  if (!equityData || equityData.length === 0) {
    return (
      <motion.div variants={itemVariants}>
        <Card className="border border-violet-200/40 dark:border-violet-500/20 bg-white/95 dark:bg-[#161622]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-violet-700 dark:text-white">
              <TrendingUp className="w-5 h-5 text-violet-600 dark:text-violet-300" />
              Equity Line
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80 flex items-center justify-center text-violet-600/80 dark:text-gray-300">
              <p>
                Nessun dato disponibile. Inizia ad aggiungere operazioni dal Registro.
              </p>
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
    <motion.div variants={itemVariants}>
      <Card className="border border-violet-200/40 dark:border-violet-500/20 bg-white/95 dark:bg-[#161622] backdrop-blur-md hover:shadow-md transition-all duration-300 overflow-hidden group relative rounded-xl">
        {/* Tech grid background */}
        <div className="absolute inset-0 bg-[length:40px_40px] bg-[linear-gradient(to_right,rgba(139,92,246,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(139,92,246,0.02)_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,rgba(139,92,246,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(139,92,246,0.03)_1px,transparent_1px)]"></div>

        {/* Particle decorations */}
        <div className="absolute inset-0 overflow-hidden opacity-20 dark:opacity-30 pointer-events-none">
          <div className="absolute h-1 w-1 rounded-full bg-violet-500 animate-pulse top-[20%] left-[30%]"></div>
          <div className="absolute h-1 w-1 rounded-full bg-violet-500 animate-pulse top-[70%] left-[80%]"></div>
          <div className="absolute h-1 w-1 rounded-full bg-violet-500 animate-pulse top-[40%] left-[60%]"></div>
        </div>

        {/* Gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 via-transparent to-purple-500/5 dark:from-violet-500/10 dark:via-transparent dark:to-purple-500/10 opacity-60 group-hover:opacity-100 transition-opacity duration-500"></div>

        {/* Glowing border effect */}
        <div className="absolute inset-0 rounded-xl border-b border-violet-200/20 dark:border-violet-500/10 group-hover:border-violet-300/30 dark:group-hover:border-violet-500/20 transition-colors duration-300"></div>

        <CardHeader className="relative z-10 pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative flex items-center justify-center w-8 h-8 rounded-full bg-violet-100 dark:bg-violet-900/30">
                <TrendingUp className="h-4 w-4 text-violet-600 dark:text-violet-300" />
              </div>
              <CardTitle className="flex items-center text-xl font-semibold text-violet-700 dark:text-violet-300">
                {chartType === 'line' ? 'Equity Line' : 'P&L Giornaliero'}
              </CardTitle>
            </div>
            <div className="flex items-center gap-2">
              {/* Chart type toggle buttons */}
              <div className="flex bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm rounded-full p-0.5 border border-violet-200/30 dark:border-violet-700/30">
                <button
                  onClick={() => onChartTypeChange('line')}
                  className={`flex items-center justify-center h-7 w-7 rounded-full text-xs transition-all duration-200 ${
                    chartType === 'line'
                      ? 'bg-violet-500 text-white shadow-md'
                      : 'text-violet-700 dark:text-violet-300 hover:bg-violet-100 dark:hover:bg-violet-800/30'
                  }`}
                  aria-label="Visualizza equity line"
                  title="Equity Line"
                >
                  <LineChartIcon className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => onChartTypeChange('bar')}
                  className={`flex items-center justify-center h-7 w-7 rounded-full text-xs transition-all duration-200 ${
                    chartType === 'bar'
                      ? 'bg-violet-500 text-white shadow-md'
                      : 'text-violet-700 dark:text-violet-300 hover:bg-violet-100 dark:hover:bg-violet-800/30'
                  }`}
                  aria-label="Visualizza istogramma"
                  title="P&L Giornaliero"
                >
                  <BarChart3 className="h-3.5 w-3.5" />
                </button>
              </div>
              <span className="text-xs px-2.5 py-1 rounded-full bg-violet-100/80 dark:bg-violet-900/50 text-violet-700 dark:text-violet-300 font-medium backdrop-blur-sm border border-violet-200/30 dark:border-violet-700/30">
                {lineChartData.length} giorni
              </span>
            </div>
          </div>
          <CardDescription className="text-violet-600/80 dark:text-gray-300 mt-1.5 ml-8">
            {chartType === 'line'
              ? 'Andamento cumulativo del P&L nel periodo selezionato'
              : 'P&L netto giornaliero nel periodo selezionato'}
          </CardDescription>
        </CardHeader>

        <CardContent className="relative z-10 pt-0">
          <div className="relative w-full h-80 overflow-hidden rounded-xl">
            <AnimatePresence mode="wait">
              <motion.div
                key={chartType}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="w-full h-80"
              >
                {chartType === 'line' ? (
                  <div className="relative w-full h-80 bg-white/30 dark:bg-gray-900/30 rounded-xl">
                    <div className="absolute inset-0 bg-[length:40px_40px] bg-[linear-gradient(to_right,rgba(139,92,246,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(139,92,246,0.03)_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,rgba(139,92,246,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(139,92,246,0.04)_1px,transparent_1px)] z-0"></div>
                    <div className="absolute inset-0 bg-gradient-to-tr from-violet-500/3 via-transparent to-violet-500/3 dark:from-violet-500/5 dark:via-transparent dark:to-violet-500/5 z-0 pointer-events-none"></div>

                    <ResponsiveContainer width="100%" height={320}>
                      <AreaChart data={lineChartData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
                        <defs>
                          <linearGradient id="colorEquity" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(139, 92, 246, 0.1)" vertical={false} />
                        <XAxis
                          dataKey="date"
                          tick={{ fill: '#8b8b9f', fontSize: 12 }}
                          axisLine={{ stroke: 'rgba(139, 92, 246, 0.1)' }}
                        />
                        <YAxis
                          tick={{ fill: '#8b8b9f', fontSize: 12 }}
                          axisLine={{ stroke: 'rgba(139, 92, 246, 0.1)' }}
                          tickFormatter={(value) => `€${(value / 1000).toFixed(0)}K`}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: theme === 'dark' ? '#1a1a24' : '#ffffff',
                            border: '1px solid rgba(139, 92, 246, 0.3)',
                            borderRadius: '0.5rem',
                            boxShadow: '0 4px 12px rgba(139, 92, 246, 0.2)',
                          }}
                          labelStyle={{ color: theme === 'dark' ? '#a78bfa' : '#8b5cf6' }}
                          formatter={(value: any) => [formatValuta(Number(value) || 0), 'Equity']}
                          labelFormatter={(label) => `Data: ${label}`}
                        />
                        <ReferenceLine
                          y={0}
                          stroke="rgba(139, 92, 246, 0.4)"
                          strokeDasharray="3 3"
                          label={{ value: 'Break-even', position: 'insideBottomRight', fill: '#8b5cf6', fontSize: 12 }}
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
                    </ResponsiveContainer>

                    {/* Glowing border */}
                    <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-violet-400/20 to-transparent"></div>
                    <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-violet-400/20 to-transparent"></div>
                  </div>
                ) : (
                  <div className="relative w-full h-80 bg-white/30 dark:bg-gray-900/30 rounded-xl">
                    <div className="absolute inset-0 bg-[length:40px_40px] bg-[linear-gradient(to_right,rgba(139,92,246,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(139,92,246,0.03)_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,rgba(139,92,246,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(139,92,246,0.04)_1px,transparent_1px)] z-0"></div>
                    <div className="absolute inset-0 bg-gradient-to-tr from-violet-500/3 via-transparent to-violet-500/3 dark:from-violet-500/5 dark:via-transparent dark:to-violet-500/5 z-0 pointer-events-none"></div>

                    <ResponsiveContainer width="100%" height={320}>
                      <BarChart data={barChartData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(139, 92, 246, 0.1)" vertical={false} />
                        <XAxis
                          dataKey="date"
                          tick={{ fill: '#8b8b9f', fontSize: 12 }}
                          axisLine={{ stroke: 'rgba(139, 92, 246, 0.1)' }}
                        />
                        <YAxis
                          tick={{ fill: '#8b8b9f', fontSize: 12 }}
                          axisLine={{ stroke: 'rgba(139, 92, 246, 0.1)' }}
                          tickFormatter={(value) => `€${(value / 1000).toFixed(0)}K`}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: theme === 'dark' ? '#1a1a24' : '#ffffff',
                            border: '1px solid rgba(139, 92, 246, 0.3)',
                            borderRadius: '0.5rem',
                            boxShadow: '0 4px 12px rgba(139, 92, 246, 0.2)',
                          }}
                          labelStyle={{ color: theme === 'dark' ? '#a78bfa' : '#8b5cf6' }}
                          formatter={(value: any) => [formatValuta(Number(value) || 0), 'P&L']
                          }
                          labelFormatter={(label) => `Data: ${label}`}
                        />
                        <ReferenceLine y={0} stroke="rgba(139, 92, 246, 0.4)" strokeDasharray="3 3" />
                        <Bar dataKey="pnl" radius={[4, 4, 0, 0]}>
                          {barChartData.map((entry, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={entry.pnl >= 0 ? '#8b5cf6' : '#ef4444'}
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>

                    {/* Glowing border */}
                    <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-violet-400/20 to-transparent"></div>
                    <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-violet-400/20 to-transparent"></div>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function PerformanceMetricsCard({
  data,
}: {
  data: any[];
}) {
  if (!data || data.length === 0) {
    return (
      <motion.div variants={itemVariants}>
        <Card className="border border-violet-200/40 dark:border-violet-500/20 bg-white/95 dark:bg-[#161622]">
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

  const winRate = data[0]?.win_rate || 0;
  const profitFactor = data[0]?.profit_factor || 0;

  return (
    <motion.div variants={itemVariants}>
      <Card className="h-full border border-violet-200/40 dark:border-violet-500/20 bg-white/95 dark:bg-[#161622] backdrop-blur-md hover:shadow-md transition-all duration-300 overflow-hidden group relative rounded-xl">
        {/* Tech grid background */}
        <div className="absolute inset-0 bg-[length:40px_40px] bg-[linear-gradient(to_right,rgba(139,92,246,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(139,92,246,0.02)_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,rgba(139,92,246,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(139,92,246,0.03)_1px,transparent_1px)]"></div>

        {/* Particle decorations */}
        <div className="absolute inset-0 overflow-hidden opacity-20 dark:opacity-30 pointer-events-none">
          <div className="absolute h-1 w-1 rounded-full bg-violet-500 animate-pulse top-[25%] left-[35%]"></div>
          <div className="absolute h-1 w-1 rounded-full bg-violet-500 animate-pulse top-[75%] left-[65%]"></div>
        </div>

        {/* Gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 via-transparent to-purple-500/5 dark:from-violet-500/10 dark:via-transparent dark:to-purple-500/10 opacity-60 group-hover:opacity-100 transition-opacity duration-500"></div>

        {/* Glowing border effect */}
        <div className="absolute inset-0 rounded-xl border-b border-violet-200/20 dark:border-violet-500/10 group-hover:border-violet-300/30 dark:group-hover:border-violet-500/20 transition-colors duration-300"></div>

        <CardHeader className="relative z-10 pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative flex items-center justify-center w-8 h-8 rounded-full bg-violet-100 dark:bg-violet-900/30">
                <BarChart3 className="h-5 w-5 text-violet-500" />
              </div>
              <CardTitle className="flex items-center text-xl font-semibold text-violet-700 dark:text-violet-300">
                Performance
              </CardTitle>
            </div>
            <span className="text-xs px-2.5 py-1 rounded-full bg-violet-100/80 dark:bg-violet-900/50 text-violet-700 dark:text-violet-300 font-medium backdrop-blur-sm border border-violet-200/30 dark:border-violet-700/30">
              Metriche
            </span>
          </div>
          <CardDescription className="text-violet-600/80 dark:text-gray-300 mt-1.5 ml-8">
            Win Rate e Profit Factor
          </CardDescription>
        </CardHeader>

        <CardContent className="relative z-10 pt-0 flex-1">
          <div className="relative w-full bg-white/50 dark:bg-gray-900/50 rounded-lg p-4">
            <div className="relative z-10 w-full flex flex-col gap-6">
              {/* Win Rate */}
              <div className="relative flex flex-col items-center justify-center group">
                <div className="mb-2 px-3 py-1 bg-white dark:bg-gray-800 rounded-full text-xs font-medium text-violet-700 dark:text-violet-300 border border-violet-200/50 dark:border-violet-700/50">
                  Win Rate
                </div>
                <div className="relative w-28 h-28 flex items-center justify-center">
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
                    <span className="text-xl font-bold text-violet-700 dark:text-violet-300">
                      {Math.round(winRate)}%
                    </span>
                  </div>
                </div>
                <div className="mt-2 flex items-center gap-1.5">
                  <div className={`h-2 w-2 rounded-full ${winRate > 50 ? 'bg-green-500' : 'bg-amber-500'}`}></div>
                  <span className="text-xs text-violet-700 dark:text-violet-300">
                    {winRate > 50 ? 'Buona' : 'Migliorabile'}
                  </span>
                </div>
              </div>

              {/* Profit Factor */}
              <div className="relative flex flex-col items-center justify-center group">
                <div className="mb-2 px-3 py-1 bg-white dark:bg-gray-800 rounded-full text-xs font-medium text-purple-700 dark:text-purple-300 border border-purple-200/50 dark:border-purple-700/50">
                  Profit Factor
                </div>
                <div className="relative w-28 h-28 flex items-center justify-center">
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
                    <span className="text-xl font-bold text-purple-700 dark:text-purple-300">
                      {profitFactor.toFixed(1)}x
                    </span>
                  </div>
                </div>
                <div className="mt-2 flex items-center gap-1.5">
                  <div className={`h-2 w-2 rounded-full ${profitFactor > 1.5 ? 'bg-green-500' : 'bg-amber-500'}`}></div>
                  <span className="text-xs text-purple-700 dark:text-purple-300">
                    {profitFactor > 1.5 ? 'Buona' : 'Migliorabile'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Glowing borders */}
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-violet-400/30 to-transparent"></div>
          <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-violet-400/30 to-transparent"></div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function PerformanceStrategieTable({
  data,
}: {
  data: any[];
}) {
  if (!data || data.length === 0) {
    return (
      <motion.div variants={itemVariants}>
        <Card className="border border-violet-200/40 dark:border-violet-500/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-violet-700 dark:text-white">
              <BarChart3 className="w-5 h-5 text-violet-600 dark:text-violet-300" />
              Performance per Strategia
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-violet-600/80 dark:text-gray-300">
              Nessuna strategia trovata
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  return (
    <motion.div variants={itemVariants}>
      <Card className="border border-violet-200/40 dark:border-violet-500/20 bg-white/95 dark:bg-[#161622] backdrop-blur-md hover:shadow-md transition-all duration-300 overflow-hidden group relative rounded-xl">
        {/* Tech grid background */}
        <div className="absolute inset-0 bg-[length:40px_40px] bg-[linear-gradient(to_right,rgba(139,92,246,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(139,92,246,0.02)_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,rgba(139,92,246,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(139,92,246,0.03)_1px,transparent_1px)]"></div>

        {/* Particle decorations */}
        <div className="absolute inset-0 overflow-hidden opacity-20 dark:opacity-30 pointer-events-none">
          <div className="absolute h-1 w-1 rounded-full bg-violet-500 animate-pulse top-[15%] left-[25%]"></div>
          <div className="absolute h-1 w-1 rounded-full bg-violet-500 animate-pulse top-[65%] left-[75%]"></div>
        </div>

        {/* Gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 via-transparent to-violet-500/5 dark:from-violet-500/10 dark:via-transparent dark:to-violet-500/10 opacity-60 group-hover:opacity-100 transition-opacity duration-500"></div>

        <CardHeader className="relative z-10 pb-2">
          <CardTitle className="flex items-center gap-2 text-violet-700 dark:text-white">
            <BarChart3 className="w-5 h-5 text-violet-600 dark:text-violet-300" />
            Performance per Strategia
          </CardTitle>
        </CardHeader>
        <CardContent className="relative z-10">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-violet-200/40 dark:border-violet-500/20">
                  <th className="text-left py-3 px-4 font-semibold text-violet-600 dark:text-violet-300">
                    Strategia
                  </th>
                  <th className="text-center py-3 px-4 font-semibold text-violet-600 dark:text-violet-300">
                    Operazioni
                  </th>
                  <th className="text-center py-3 px-4 font-semibold text-violet-600 dark:text-violet-300">
                    Win Rate
                  </th>
                  <th className="text-center py-3 px-4 font-semibold text-violet-600 dark:text-violet-300">
                    Profit Factor
                  </th>
                  <th className="text-right py-3 px-4 font-semibold text-violet-600 dark:text-violet-300">
                    P&L Totale
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.map((row) => {
                  const pnl = row.pnl_totale || 0;
                  const isPositive = pnl >= 0;

                  return (
                    <tr key={row.strategia_id} className="border-b border-violet-200/20 dark:border-violet-500/10 hover:bg-violet-50/50 dark:hover:bg-violet-900/10">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-violet-500" />
                          <span className="text-violet-700 dark:text-white">{row.nome_strategia}</span>
                        </div>
                      </td>
                      <td className="text-center py-3 px-4 text-violet-600/80 dark:text-gray-300">
                        {row.totale_operazioni || 0}
                      </td>
                      <td className="text-center py-3 px-4">
                        <span className={cn(
                          'font-medium',
                          (row.win_rate || 0) >= 50 ? 'text-emerald-500' : 'text-red-500'
                        )}>
                          {row.win_rate ? formatPercentuale(row.win_rate / 100) : '0%'}
                        </span>
                      </td>
                      <td className="text-center py-3 px-4">
                        <span className={cn(
                          'font-medium',
                          (row.profit_factor || 0) >= 1.5 ? 'text-emerald-500' : 'text-red-500'
                        )}>
                          {(row.profit_factor || 0).toFixed(2)}
                        </span>
                      </td>
                      <td className="text-right py-3 px-4">
                        <span className={cn(
                          'font-semibold',
                          isPositive ? 'text-emerald-500' : 'text-red-500'
                        )}>
                          {formatValuta(pnl)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function BestWorstTrades({
  operazioniRecenti,
}: {
  operazioniRecenti: any[];
}) {
  const [activeTab, setActiveTab] = useState<'best' | 'worst'>('best');

  const trades = operazioniRecenti.filter((op) => op.operazione.stato === 'chiusa');
  const sortedTrades = [...trades].sort((a, b) => {
    const aPnl = a.operazione.pnl || 0;
    const bPnl = b.operazione.pnl || 0;
    return bPnl - aPnl;
  });

  const bestTrades = sortedTrades.slice(0, 5);
  const worstTrades = sortedTrades.slice(-5).reverse();

  const displayTrades = activeTab === 'best' ? bestTrades : worstTrades;

  return (
    <motion.div variants={itemVariants}>
      <Card className="h-full border border-violet-200/40 dark:border-violet-500/20 bg-white/95 dark:bg-[#161622] backdrop-blur-md hover:shadow-md transition-all duration-300 overflow-hidden group relative rounded-xl">
        {/* Tech grid background */}
        <div className="absolute inset-0 bg-[length:40px_40px] bg-[linear-gradient(to_right,rgba(139,92,246,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(139,92,246,0.02)_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,rgba(139,92,246,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(139,92,246,0.03)_1px,transparent_1px)]"></div>

        {/* Particle decorations */}
        <div className="absolute inset-0 overflow-hidden opacity-20 dark:opacity-30 pointer-events-none">
          <div className="absolute h-1 w-1 rounded-full bg-violet-500 animate-pulse top-[15%] left-[25%]"></div>
          <div className="absolute h-1 w-1 rounded-full bg-violet-500 animate-pulse top-[65%] left-[75%]"></div>
        </div>

        {/* Gradient background - dynamic based on active tab */}
        <div className={`absolute inset-0 bg-gradient-to-br transition-colors duration-300 opacity-60 group-hover:opacity-100 ${
          activeTab === 'best'
            ? 'from-green-500/5 to-emerald-500/5 dark:from-green-500/10 dark:to-emerald-500/10'
            : 'from-red-500/5 to-rose-500/5 dark:from-red-500/10 dark:to-rose-500/10'
        }`}></div>

        {/* Glowing border effect */}
        <div className="absolute inset-0 rounded-xl border-b border-violet-200/20 dark:border-violet-500/10 group-hover:border-violet-300/30 dark:group-hover:border-violet-500/20 transition-colors duration-300"></div>

        <CardHeader className="relative z-10 pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative flex items-center justify-center w-8 h-8 rounded-full bg-violet-100 dark:bg-violet-900/30">
                <TrendingUp className="h-5 w-5 text-violet-500" />
              </div>
              <CardTitle className="flex items-center text-xl font-semibold text-violet-700 dark:text-violet-300">
                Migliori e Peggiori Operazioni
              </CardTitle>
            </div>
            <span className="text-xs px-2.5 py-1 rounded-full bg-violet-100/80 dark:bg-violet-900/50 text-violet-700 dark:text-violet-300 font-medium backdrop-blur-sm border border-violet-200/30 dark:border-violet-700/30">
              Top & Flop
            </span>
          </div>
          <CardDescription className="text-violet-600/80 dark:text-gray-300 mt-1.5 ml-8">
            In termini di profitto € e %
          </CardDescription>
        </CardHeader>

        <CardContent className="relative z-10 pt-0">
          <div className="space-y-4">
            <div className="flex gap-2 border-b border-violet-200/40 dark:border-violet-500/20">
              <button
                onClick={() => setActiveTab('best')}
                className={cn(
                  'px-4 py-2 font-medium text-sm border-b-2 transition-colors',
                  activeTab === 'best'
                    ? 'border-emerald-400 text-emerald-500 dark:text-emerald-400'
                    : 'border-transparent text-violet-600/80 dark:text-gray-300 hover:text-violet-700 dark:hover:text-white'
                )}
              >
                Migliori (5)
              </button>
              <button
                onClick={() => setActiveTab('worst')}
                className={cn(
                  'px-4 py-2 font-medium text-sm border-b-2 transition-colors',
                  activeTab === 'worst'
                    ? 'border-red-400 text-red-500 dark:text-red-400'
                    : 'border-transparent text-violet-600/80 dark:text-gray-300 hover:text-violet-700 dark:hover:text-white'
                )}
              >
                Peggiori (5)
              </button>
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="space-y-3"
              >
                {displayTrades.length === 0 ? (
                  <p className="text-center py-8 text-violet-600/80 dark:text-gray-300">
                    Nessun trade chiuso disponibile
                  </p>
                ) : (
                  displayTrades.map((trade) => {
                    const pnl = trade.operazione.pnl || 0;
                    const isPositive = pnl >= 0;

                    return (
                      <motion.div
                        key={trade.operazione.id}
                        variants={itemVariants}
                        className="flex items-center justify-between p-3 rounded-lg bg-white/50 dark:bg-gray-900/50 hover:bg-white/70 dark:hover:bg-gray-900/70 transition-colors border border-violet-200/20 dark:border-violet-500/10"
                      >
                        <div className="flex items-center gap-3 flex-1">
                          <div className="font-mono font-semibold text-violet-700 dark:text-white min-w-fit">
                            {trade.operazione.ticker}
                          </div>
                          <div className="flex-1">
                            <div className="text-xs text-violet-600/80 dark:text-gray-400">
                              {formatData(trade.operazione.data)}
                            </div>
                          </div>
                          {trade.strategia && (
                            <span className="text-xs px-2 py-1 rounded-full bg-violet-500/20 text-violet-700 dark:text-violet-300">
                              {trade.strategia.nome}
                            </span>
                          )}
                        </div>
                        <div className={cn(
                          'text-right font-semibold',
                          isPositive ? 'text-emerald-500' : 'text-red-500'
                        )}>
                          {formatValuta(pnl)}
                        </div>
                      </motion.div>
                    );
                  })
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Glowing borders */}
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-violet-400/30 to-transparent"></div>
          <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-violet-400/30 to-transparent"></div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export default function DashboardPage() {
  const { metriche, performanceStrategie, equityData, operazioniRecenti, isLoading, errore } =
    useDashboardData();
  const [isLoaded, setIsLoaded] = useState(false);
  const [mainChartType, setMainChartType] = useState<'line' | 'bar'>('line');
  const [activeTab, setActiveTab] = useState('panoramica');

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoaded(true);
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  if (isLoading) {
    return (
      <div className="space-y-8">
        <LoadingSkeleton />
      </div>
    );
  }

  if (!metriche) {
    return <EmptyState />;
  }

  const totalTrades = metriche.totale_operazioni || 0;
  const netPnl = metriche.pnl_totale || 0;
  const pnlPercentage = metriche.win_rate || 0;

  return (
    <motion.div
      className="flex flex-col gap-6 p-3 md:p-6 min-h-[calc(100vh-4rem)] bg-transparent relative"
      variants={containerVariants}
      initial="hidden"
      animate={isLoaded ? 'visible' : 'hidden'}
    >
      {/* Background effects */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Grid background */}
        <div className="absolute inset-0 bg-[length:50px_50px] bg-[linear-gradient(to_right,rgba(139,92,246,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(139,92,246,0.02)_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,rgba(139,92,246,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(139,92,246,0.04)_1px,transparent_1px)] opacity-70 dark:opacity-100"></div>

        {/* Radial glows */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_800px_at_50%_-100px,rgba(139,92,246,0.04),transparent_70%)] dark:bg-[radial-gradient(circle_800px_at_50%_-100px,rgba(109,40,217,0.12),transparent_70%)] animate-pulse-slow"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_600px_at_80%_60%,rgba(139,92,246,0.03),transparent_70%)] dark:bg-[radial-gradient(circle_600px_at_80%_60%,rgba(109,40,217,0.12),transparent_70%)] animate-float-slow"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_500px_at_20%_30%,rgba(139,92,246,0.02),transparent_70%)] dark:bg-[radial-gradient(circle_500px_at_20%_30%,rgba(109,40,217,0.08),transparent_70%)] animate-float-slow-delayed"></div>

        {/* Particle decorations */}
        <div className="absolute h-1 w-1 rounded-full bg-violet-500/30 dark:bg-violet-500/50 top-[20%] left-[30%] animate-pulse"></div>
        <div className="absolute h-1 w-1 rounded-full bg-violet-500/30 dark:bg-violet-500/50 top-[70%] left-[80%] animate-pulse-slow"></div>
        <div className="absolute h-1 w-1 rounded-full bg-violet-500/30 dark:bg-violet-500/50 top-[40%] left-[60%] animate-pulse"></div>
        <div className="absolute h-1 w-1 rounded-full bg-violet-500/30 dark:bg-violet-500/50 top-[80%] left-[20%] animate-pulse-slow"></div>
      </div>

      {/* Sticky tabs bar */}
      <motion.div
        className="flex items-center gap-3 sticky top-0 z-10 py-2 px-3 bg-white/95 dark:bg-[#161622] border-gray-200/80 dark:border-violet-500/20 dark:shadow-[0_0_15px_rgba(109,40,217,0.08)] backdrop-blur-md rounded-xl border shadow-sm mb-2"
        variants={itemVariants}
      >
        <div className="w-full">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="bg-gray-50/80 dark:bg-gray-900/80 backdrop-blur-sm p-1 rounded-xl shadow-sm border border-violet-200/30 dark:border-violet-500/30 w-full md:w-auto">
              <TabsTrigger
                value="panoramica"
                className="data-[state=active]:bg-white dark:data-[state=active]:bg-gray-800 data-[state=active]:text-violet-600 dark:data-[state=active]:text-violet-300 rounded-lg transition-all duration-300 flex items-center gap-2"
              >
                <BarChart3 className="h-4 w-4" />
                <span>Panoramica</span>
              </TabsTrigger>
              <TabsTrigger
                value="progressi"
                className="data-[state=active]:bg-white dark:data-[state=active]:bg-gray-800 data-[state=active]:text-violet-600 dark:data-[state=active]:text-violet-300 rounded-lg transition-all duration-300 flex items-center gap-2"
              >
                <LineChartIcon className="h-4 w-4" />
                <span>Progressi</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </motion.div>

      {/* Content */}
      <AnimatePresence mode="wait">
        {activeTab === 'panoramica' && (
          <motion.div
            variants={itemVariants}
            className="w-full space-y-6"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
          >
            {/* 4 KPI Cards */}
            <motion.div
              className="grid gap-4 md:grid-cols-2 lg:grid-cols-4"
              variants={fadeInUp}
              initial="hidden"
              animate="visible"
              transition={{ staggerChildren: 0.1 }}
            >
              <KPICard
                label="Profitto/Perdita"
                value={formatValuta(netPnl)}
                icon={<TrendingUp className="w-5 h-5 text-green-600" />}
                gradientFrom="from-green-500/5"
                gradientTo="to-emerald-500/5 dark:from-green-500/10 dark:to-emerald-500/10"
              />

              <KPICard
                label="Win Rate"
                value={`${pnlPercentage.toFixed(2)}%`}
                icon={<BarChart3 className="w-5 h-5 text-blue-600" />}
                gradientFrom="from-blue-500/5"
                gradientTo="to-cyan-500/5 dark:from-blue-500/10 dark:to-cyan-500/10"
              />

              <KPICard
                label="Trade Totali"
                value={totalTrades}
                icon={<TrendingUp className="w-5 h-5 text-violet-600 dark:text-violet-400" />}
                gradientFrom="from-violet-500/5"
                gradientTo="to-purple-500/5 dark:from-violet-500/10 dark:to-purple-500/10"
              />

              <KPICard
                label="Giorni di Trading"
                value={equityData.length}
                icon={<LineChartIcon className="w-5 h-5 text-amber-600" />}
                gradientFrom="from-amber-500/5"
                gradientTo="to-orange-500/5 dark:from-amber-500/10 dark:to-orange-500/10"
              />
            </motion.div>

            {/* Main grid layout — Equity Chart (2/3) + Performance (1/3) */}
            <motion.div
              className="grid gap-5 lg:grid-cols-3 mt-4"
              variants={fadeInUp}
              initial="hidden"
              animate="visible"
              transition={{ staggerChildren: 0.08, delayChildren: 0.15 }}
            >
              <div className="lg:col-span-2">
                <EquityChart
                  equityData={equityData}
                  chartType={mainChartType}
                  onChartTypeChange={setMainChartType}
                />
              </div>

              <div className="lg:col-span-1">
                <PerformanceMetricsCard data={performanceStrategie} />
              </div>
            </motion.div>

            {/* Second row — Strategy Table (3/5) + Best/Worst Trades (2/5) */}
            <motion.div
              className="grid gap-5 lg:grid-cols-5 mt-4"
              variants={fadeInUp}
              initial="hidden"
              animate="visible"
              transition={{ staggerChildren: 0.08, delayChildren: 0.2 }}
            >
              <div className="lg:col-span-3">
                <PerformanceStrategieTable data={performanceStrategie} />
              </div>

              <div className="lg:col-span-2">
                <BestWorstTrades operazioniRecenti={operazioniRecenti} />
              </div>
            </motion.div>
          </motion.div>
        )}

        {activeTab === 'progressi' && (
          <motion.div
            variants={itemVariants}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
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
                <div className="flex flex-col items-center justify-center p-12 text-center">
                  <LineChartIcon className="h-16 w-16 text-violet-200 dark:text-violet-800 mb-4" />
                  <h3 className="text-xl font-medium mb-2 text-violet-700 dark:text-white">
                    Funzionalità in sviluppo
                  </h3>
                  <p className="text-violet-600/80 dark:text-gray-300 max-w-md">
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
          className="p-4 rounded-lg bg-red-500/10 border border-red-500/30 text-red-500 dark:text-red-400"
        >
          {errore}
        </motion.div>
      )}

      {/* Custom animations styles */}
      <style jsx>{`
        @keyframes pulse-slow {
          0%, 100% {
            opacity: 0.3;
          }
          50% {
            opacity: 0.8;
          }
        }
        @keyframes float-slow {
          0%, 100% {
            transform: translateY(0) translateX(0);
          }
          33% {
            transform: translateY(-3px) translateX(2px);
          }
          66% {
            transform: translateY(3px) translateX(-2px);
          }
        }
        @keyframes float-slow-delayed {
          0%, 100% {
            transform: translateY(0) translateX(0);
          }
          33% {
            transform: translateY(3px) translateX(-2px);
          }
          66% {
            transform: translateY(-3px) translateX(2px);
          }
        }
        .animate-pulse-slow {
          animation: pulse-slow 3s infinite;
        }
        .animate-float-slow {
          animation: float-slow 8s ease-in-out infinite;
        }
        .animate-float-slow-delayed {
          animation: float-slow-delayed 9s ease-in-out infinite;
        }
      `}</style>
    </motion.div>
  );
}
