'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  TrendingUp,
  Target,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale/it';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useDashboardData } from '@/hooks/useDashboardData';
import { formatValuta, formatPercentuale, formatData, cn } from '@/lib/utils';

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

function KPICard({
  label,
  value,
  icon: Icon,
  trend,
  isPositive,
  format: formatType = 'text',
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: number | null;
  isPositive?: boolean;
  format?: 'text' | 'currency' | 'percentage';
}) {
  return (
    <motion.div variants={itemVariants}>
      <Card className="relative overflow-hidden">
        <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/5 rounded-full -mr-12 -mt-12" />

        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium text-text-secondary">
              {label}
            </CardTitle>
            <div className="p-2 rounded-lg bg-purple-500/10">{Icon}</div>
          </div>
        </CardHeader>

        <CardContent>
          <div className="space-y-2">
            <div
              className={cn(
                'text-2xl font-bold',
                formatType === 'currency' && isPositive
                  ? 'text-emerald-400'
                  : formatType === 'currency' && !isPositive && isPositive !== undefined
                    ? 'text-red-400'
                    : 'text-text-primary'
              )}
            >
              {value}
            </div>

            {trend !== null && trend !== undefined && (
              <div className="flex items-center gap-1 text-xs">
                {trend > 0 ? (
                  <>
                    <ArrowUpRight className="w-3 h-3 text-emerald-400" />
                    <span className="text-emerald-400">+{trend.toFixed(1)}%</span>
                  </>
                ) : trend < 0 ? (
                  <>
                    <ArrowDownRight className="w-3 h-3 text-red-400" />
                    <span className="text-red-400">{trend.toFixed(1)}%</span>
                  </>
                ) : (
                  <span className="text-text-secondary">No change</span>
                )}
              </div>
            )}
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
        <div className="h-10 w-48 bg-gray-800 rounded-lg animate-pulse" />
        <div className="h-5 w-80 bg-gray-800 rounded animate-pulse" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-3">
              <div className="h-4 w-32 bg-gray-800 rounded animate-pulse" />
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="h-8 w-24 bg-gray-800 rounded animate-pulse" />
              <div className="h-4 w-40 bg-gray-800 rounded animate-pulse" />
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <div className="h-6 w-48 bg-gray-800 rounded animate-pulse" />
        </CardHeader>
        <CardContent>
          <div className="h-80 bg-gray-800 rounded animate-pulse" />
        </CardContent>
      </Card>
    </div>
  );
}

function EmptyState() {
  const router = useRouter();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-page-title text-text-primary">Dashboard</h1>
        <p className="text-text-secondary mt-2">
          Benvenuto in GG Tracker - Il tuo nuovo compagno di trading
        </p>
      </div>

      <Card className="border-dashed border-2 border-purple-500/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5 text-purple-400" />
            Nessun dato disponibile
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-text-secondary">
            Non hai ancora registrato operazioni. Inizia a tracciare i tuoi trade per visualizzare
            le metriche di performance.
          </p>
          <button
            onClick={() => router.push('/registro')}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-medium transition-colors"
          >
            <ArrowUpRight className="w-4 h-4" />
            Vai al Registro
          </button>
        </CardContent>
      </Card>
    </div>
  );
}

interface EquityChartData {
  data: string;
  pnl_giornaliero: number | null;
  equity_cumulative: number | null;
  trades_count: number | null;
}

function EquityChart({ equityData }: { equityData: EquityChartData[] }) {
  if (!equityData || equityData.length === 0) {
    return (
      <motion.div variants={itemVariants}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-purple-400" />
              Equity Line
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80 flex items-center justify-center text-text-secondary">
              <p>
                Nessun dato disponibile. Inizia ad aggiungere operazioni dal Registro.
              </p>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  const chartData = equityData
    .map((item) => ({
      date: format(new Date(item.data), 'd MMM', { locale: it }),
      equity: item.equity_cumulative || 0,
      pnl: item.pnl_giornaliero || 0,
      fullDate: item.data,
    }))
    .filter((item) => item.equity !== null && !isNaN(item.equity));

  return (
    <motion.div variants={itemVariants}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-purple-400" />
            Equity Line
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="w-full h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
                <defs>
                  <linearGradient id="colorEquity" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#2a2a3e" vertical={false} />
                <XAxis
                  dataKey="date"
                  tick={{ fill: '#8b8b9f', fontSize: 12 }}
                  axisLine={{ stroke: '#2a2a3e' }}
                />
                <YAxis
                  tick={{ fill: '#8b8b9f', fontSize: 12 }}
                  axisLine={{ stroke: '#2a2a3e' }}
                  tickFormatter={(value) => `€${(value / 1000).toFixed(0)}K`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1a1a24',
                    border: '1px solid #2a2a3e',
                    borderRadius: '0.5rem',
                  }}
                  labelStyle={{ color: '#e5e7eb' }}
                  formatter={(value: any) => [formatValuta(Number(value) || 0), 'Equity']}
                  labelFormatter={(label) => `Data: ${label}`}
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
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function PerformanceStrategieTable({
  data,
}: {
  data: any[];
  strategieMap?: Map<string, string>;
}) {
  if (!data || data.length === 0) {
    return (
      <motion.div variants={itemVariants}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-purple-400" />
              Performance per Strategia
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-text-secondary">
              Nessuna strategia trovata
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  const getStatusBadge = (profitFactor: number | null, winRate: number | null) => {
    if (!profitFactor || !winRate) return { text: 'N/A', color: 'bg-gray-700' };

    if (profitFactor >= 2 && winRate >= 60) {
      return { text: 'Ottima', color: 'bg-emerald-500/20 text-emerald-400' };
    }
    if (profitFactor >= 1.5 || winRate >= 50) {
      return { text: 'Media', color: 'bg-blue-500/20 text-blue-400' };
    }
    return { text: 'Scarsa', color: 'bg-red-500/20 text-red-400' };
  };

  return (
    <motion.div variants={itemVariants}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-purple-400" />
            Performance per Strategia
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="text-left py-3 px-4 font-semibold text-text-secondary">
                    Strategia
                  </th>
                  <th className="text-center py-3 px-4 font-semibold text-text-secondary">
                    Operazioni
                  </th>
                  <th className="text-center py-3 px-4 font-semibold text-text-secondary">
                    Win Rate
                  </th>
                  <th className="text-center py-3 px-4 font-semibold text-text-secondary">
                    Profit Factor
                  </th>
                  <th className="text-right py-3 px-4 font-semibold text-text-secondary">
                    P&L Totale
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.map((row) => {
                  const status = getStatusBadge(row.profit_factor, row.win_rate);
                  const pnl = row.net_pnl || 0;
                  const isPositive = pnl >= 0;

                  return (
                    <tr key={row.strategia_id} className="border-b border-gray-900 hover:bg-gray-900/50">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-purple-500" />
                          <span className="text-text-primary">{row.strategia_nome}</span>
                        </div>
                      </td>
                      <td className="text-center py-3 px-4 text-text-secondary">
                        {row.total_trades || 0}
                      </td>
                      <td className="text-center py-3 px-4">
                        <span
                          className={cn(
                            'font-medium',
                            (row.win_rate || 0) >= 50 ? 'text-emerald-400' : 'text-red-400'
                          )}
                        >
                          {row.win_rate ? formatPercentuale(row.win_rate / 100) : '0%'}
                        </span>
                      </td>
                      <td className="text-center py-3 px-4">
                        <span
                          className={cn(
                            'font-medium',
                            (row.profit_factor || 0) >= 1.5 ? 'text-emerald-400' : 'text-red-400'
                          )}
                        >
                          {(row.profit_factor || 0).toFixed(2)}
                        </span>
                      </td>
                      <td className="text-right py-3 px-4">
                        <div className="flex flex-col items-end gap-1">
                          <span
                            className={cn(
                              'font-semibold',
                              isPositive ? 'text-emerald-400' : 'text-red-400'
                            )}
                          >
                            {formatValuta(pnl)}
                          </span>
                          <span
                            className={cn(
                              'text-xs',
                              status.color
                            )}
                          >
                            {status.text}
                          </span>
                        </div>
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

function MiglioriPeggioriTrade({
  operazioniRecenti,
}: {
  operazioniRecenti: any[];
}) {
  const [activeTab, setActiveTab] = useState<'best' | 'worst'>('best');

  const trades = operazioniRecenti.filter((op) => op.operazione.stato === 'CHIUSA');
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
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5 text-purple-400" />
            Migliori e Peggiori Trade
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex gap-2 border-b border-gray-800">
              <button
                onClick={() => setActiveTab('best')}
                className={cn(
                  'px-4 py-2 font-medium text-sm border-b-2 transition-colors',
                  activeTab === 'best'
                    ? 'border-emerald-400 text-emerald-400'
                    : 'border-transparent text-text-secondary hover:text-text-primary'
                )}
              >
                Migliori (5)
              </button>
              <button
                onClick={() => setActiveTab('worst')}
                className={cn(
                  'px-4 py-2 font-medium text-sm border-b-2 transition-colors',
                  activeTab === 'worst'
                    ? 'border-red-400 text-red-400'
                    : 'border-transparent text-text-secondary hover:text-text-primary'
                )}
              >
                Peggiori (5)
              </button>
            </div>

            <div className="space-y-3">
              {displayTrades.length === 0 ? (
                <p className="text-center py-8 text-text-secondary">
                  Nessun trade chiuso disponibile
                </p>
              ) : (
                displayTrades.map((trade) => {
                  const pnl = trade.operazione.pnl || 0;
                  const isPositive = pnl >= 0;

                  return (
                    <div
                      key={trade.operazione.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-gray-900/50 hover:bg-gray-900"
                    >
                      <div className="flex items-center gap-3 flex-1">
                        <div className="font-mono font-semibold text-text-primary min-w-fit">
                          {trade.operazione.simbolo}
                        </div>
                        <div className="flex-1">
                          <div className="text-xs text-text-secondary">
                            {formatData(trade.operazione.data_apertura)}
                          </div>
                        </div>
                        {trade.strategia && (
                          <span className="text-xs px-2 py-1 rounded-full bg-purple-500/20 text-purple-400">
                            {trade.strategia.nome}
                          </span>
                        )}
                      </div>
                      <div
                        className={cn(
                          'text-right font-semibold',
                          isPositive ? 'text-emerald-400' : 'text-red-400'
                        )}
                      >
                        {formatValuta(pnl)}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function AttivitaRecente({
  operazioniRecenti,
}: {
  operazioniRecenti: any[];
}) {
  const recentTrades = operazioniRecenti.slice(0, 5);

  return (
    <motion.div variants={itemVariants}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-purple-400" />
            Attività Recente
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {recentTrades.length === 0 ? (
              <p className="text-center py-8 text-text-secondary">
                Nessuna operazione registrata
              </p>
            ) : (
              recentTrades.map((trade) => {
                const pnl = trade.operazione.pnl || 0;
                const isPositive = pnl >= 0;
                const isLong = trade.operazione.direzione === 'LONG';

                return (
                  <div
                    key={trade.operazione.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-gray-900/50 hover:bg-gray-900 transition-colors"
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <div className="font-mono font-semibold text-text-primary w-12">
                        {trade.operazione.simbolo}
                      </div>
                      <div className="text-xs text-text-secondary">
                        {formatData(trade.operazione.data_apertura)}
                      </div>
                      <div
                        className={cn(
                          'px-2 py-1 rounded text-xs font-medium',
                          isLong
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : 'bg-red-500/20 text-red-400'
                        )}
                      >
                        {isLong ? 'LONG' : 'SHORT'}
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      {trade.strategia && (
                        <span className="text-xs px-2 py-1 rounded-full bg-purple-500/20 text-purple-400">
                          {trade.strategia.nome}
                        </span>
                      )}
                      <div
                        className={cn(
                          'text-right font-semibold min-w-fit',
                          isPositive ? 'text-emerald-400' : 'text-red-400'
                        )}
                      >
                        {formatValuta(pnl)}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export default function DashboardPage() {
  const { metriche, performanceStrategie, equityData, operazioniRecenti, isLoading, errore } =
    useDashboardData();

  if (isLoading) {
    return (
      <div className="space-y-8">
        <LoadingSkeleton />
      </div>
    );
  }

  if (!metriche || !equityData || equityData.length === 0) {
    return <EmptyState />;
  }

  const totalTrades = metriche.total_trades || 0;
  const winRate = metriche.win_rate ? (metriche.win_rate / 100) : 0;
  const profitFactor = metriche.profit_factor || 0;
  const netPnl = metriche.net_pnl || 0;

  return (
    <motion.div
      className="space-y-8"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Header */}
      <motion.div variants={itemVariants}>
        <h1 className="text-page-title text-text-primary">Dashboard</h1>
        <p className="text-text-secondary mt-2">
          Visualizza il riepilogo delle tue performance di trading
        </p>
      </motion.div>

      {/* KPI Cards */}
      <motion.div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          label="P&L Totale"
          value={formatValuta(netPnl)}
          icon={<TrendingUp className="w-5 h-5 text-purple-400" />}
          isPositive={netPnl >= 0}
          format="currency"
        />

        <KPICard
          label="Win Rate"
          value={formatPercentuale(winRate)}
          icon={<Target className="w-5 h-5 text-purple-400" />}
          trend={winRate * 100 >= 50 ? (winRate * 100) - 50 : 50 - (winRate * 100)}
        />

        <KPICard
          label="Profit Factor"
          value={profitFactor.toFixed(2)}
          icon={<BarChart3 className="w-5 h-5 text-purple-400" />}
          trend={profitFactor > 1.5 ? 10 : profitFactor < 1 ? -10 : 0}
        />

        <KPICard
          label="Totale Operazioni"
          value={totalTrades}
          icon={<ArrowUpRight className="w-5 h-5 text-purple-400" />}
          trend={totalTrades > 0 ? (totalTrades > 20 ? 20 : totalTrades) : 0}
        />
      </motion.div>

      {/* Equity Chart */}
      <EquityChart equityData={equityData} />

      {/* Performance and Best/Worst Trades */}
      <motion.div className="grid grid-cols-1 lg:grid-cols-3 gap-6" variants={containerVariants}>
        <div className="lg:col-span-2">
          <PerformanceStrategieTable
            data={performanceStrategie}
            strategieMap={new Map()}
          />
        </div>

        <div className="lg:col-span-1">
          <MiglioriPeggioriTrade operazioniRecenti={operazioniRecenti} />
        </div>
      </motion.div>

      {/* Recent Activity */}
      <AttivitaRecente operazioniRecenti={operazioniRecenti} />

      {errore && (
        <motion.div
          variants={itemVariants}
          className="p-4 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400"
        >
          {errore}
        </motion.div>
      )}
    </motion.div>
  );
}
