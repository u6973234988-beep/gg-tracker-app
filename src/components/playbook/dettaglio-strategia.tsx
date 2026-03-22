'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ArrowLeft,
  Plus,
  Trash2,
  Edit2,
  BookOpen,
  TrendingUp,
  BarChart2,
  Activity,
  ChevronDown,
  ChevronUp,
  Shield,
  Target,
  DollarSign,
  Percent,
  Search,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
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
import { useTheme } from 'next-themes';
import { formatValuta } from '@/lib/utils';
import { cn } from '@/lib/cn';
import { KlineChartComponent } from '@/components/charts/kline-chart';
import type { StrategiaConDettagli } from '@/hooks/usePlaybook';
import { useConformitaRegole } from '@/hooks/useConformitaRegole';

interface DettaglioStrategiaProps {
  strategia: StrategiaConDettagli | null;
  operazioni: any[];
  onBack: () => void;
  onEdit: (strategia: StrategiaConDettagli) => void;
  onAddRule: (strategiaId: string, regola: any) => Promise<void>;
  onDeleteRule: (regolaId: string) => Promise<void>;
  onDelete: (strategia: StrategiaConDettagli) => void;
  isLoading?: boolean;
}

// ─── Preset di gruppi regole/condizioni ────────────────────────
// Questi sono i gruppi preset che l'utente può aggiungere alla strategia.
// L'utente può anche creare gruppi personalizzati.
const PRESET_GRUPPI: { key: string; label: string; icon: React.ReactNode; color: string; bgColor: string }[] = [
  { key: 'entry', label: 'Condizioni di Ingresso', icon: <TrendingUp className="h-4 w-4" />, color: 'text-blue-600 dark:text-blue-400', bgColor: 'bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/20' },
  { key: 'stop_loss', label: 'Stop Loss', icon: <Shield className="h-4 w-4" />, color: 'text-red-600 dark:text-red-400', bgColor: 'bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/20' },
  { key: 'take_profit', label: 'Take Profit', icon: <Target className="h-4 w-4" />, color: 'text-green-600 dark:text-green-400', bgColor: 'bg-green-50 dark:bg-green-500/10 border-green-200 dark:border-green-500/20' },
  { key: 'condizioni_mercato', label: 'Condizioni di Mercato', icon: <BarChart2 className="h-4 w-4" />, color: 'text-violet-600 dark:text-violet-400', bgColor: 'bg-violet-50 dark:bg-violet-500/10 border-violet-200 dark:border-violet-500/20' },
];

// Lookup veloce per stile gruppo (preset + custom fallback)
const getGroupConfig = (groupKey: string) => {
  const preset = PRESET_GRUPPI.find((p) => p.key === groupKey);
  if (preset) return preset;
  // Gruppo personalizzato — stile neutro
  return {
    key: groupKey,
    label: groupKey.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
    icon: <BookOpen className="h-4 w-4" />,
    color: 'text-gray-600 dark:text-gray-400',
    bgColor: 'bg-gray-50 dark:bg-gray-500/10 border-gray-200 dark:border-gray-500/20',
  };
};

type DistributionView = 'oraria' | 'giornaliera' | 'mensile';
type ChartView = 'equity' | 'distribuzione';

export function DettaglioStrategia({
  strategia,
  operazioni,
  onBack,
  onEdit,
  onAddRule,
  onDeleteRule,
  onDelete,
  isLoading = false,
}: DettaglioStrategiaProps) {
  const { resolvedTheme } = useTheme();
  const theme = resolvedTheme;
  const [addingRule, setAddingRule] = React.useState(false);
  const [expandedGroups, setExpandedGroups] = React.useState<Set<string>>(new Set());
  const [ruleSearchQuery, setRuleSearchQuery] = React.useState('');
  const [ruleFilter, setRuleFilter] = React.useState('');
  const [showAddGroupMenu, setShowAddGroupMenu] = React.useState(false);
  const [newCustomGroupName, setNewCustomGroupName] = React.useState('');
  const [checkedRules, setCheckedRules] = React.useState<Set<string>>(new Set());
  const [addingRuleToGroup, setAddingRuleToGroup] = React.useState<string | null>(null);
  const [newRuleInGroupText, setNewRuleInGroupText] = React.useState('');
  // Gruppi aggiunti localmente (possono essere vuoti, senza regole nel DB)
  const [localGroups, setLocalGroups] = React.useState<string[]>([]);

  // Performance state
  const [chartView, setChartView] = React.useState<ChartView>('equity');
  const [distributionView, setDistributionView] = React.useState<DistributionView>('giornaliera');

  // Operations state
  const [opSearchQuery, setOpSearchQuery] = React.useState('');
  const [opDirectionFilter, setOpDirectionFilter] = React.useState<string>('');
  const [opResultFilter, setOpResultFilter] = React.useState<string>('');
  const [selectedOp, setSelectedOp] = React.useState<any | null>(null);

  // ─── Computazioni regole ────────────────────────────────────
  const rulesByGroup = React.useMemo(() => {
    if (!strategia) return {};
    const grouped: Record<string, any[]> = {};
    (strategia.regole || []).forEach((rule) => {
      const gruppo = rule.gruppo || 'entry';
      if (!grouped[gruppo]) grouped[gruppo] = [];
      grouped[gruppo].push(rule);
    });
    return grouped;
  }, [strategia]);

  // Gruppi attivi nella strategia (DB + locali vuoti, ordine: preset first, poi custom)
  const activeGroups = React.useMemo(() => {
    const dbKeys = Object.keys(rulesByGroup);
    const allKeys = [...new Set([...dbKeys, ...localGroups])];
    const presetKeys = PRESET_GRUPPI.map((p) => p.key);
    const sorted = [
      ...presetKeys.filter((k) => allKeys.includes(k)),
      ...allKeys.filter((k) => !presetKeys.includes(k)),
    ];
    return sorted;
  }, [rulesByGroup, localGroups]);

  // Inizializza expanded groups quando cambiano
  React.useEffect(() => {
    if (activeGroups.length > 0 && expandedGroups.size === 0) {
      setExpandedGroups(new Set(activeGroups));
    }
  }, [activeGroups]);

  // Inizializza checkedRules da tutte le regole (tutte attive di default)
  React.useEffect(() => {
    if (strategia?.regole && checkedRules.size === 0 && strategia.regole.length > 0) {
      setCheckedRules(new Set(strategia.regole.map((r: any) => r.id)));
    }
  }, [strategia?.regole]);

  // Gruppi preset non ancora aggiunti
  const availablePresetGroups = React.useMemo(() => {
    return PRESET_GRUPPI.filter((p) => !activeGroups.includes(p.key));
  }, [activeGroups]);

  const filteredRulesByGroup = React.useMemo(() => {
    const filtered: Record<string, any[]> = {};
    activeGroups.forEach((gruppo) => {
      if (ruleFilter && gruppo !== ruleFilter) return;
      let rules = rulesByGroup[gruppo] || [];
      if (ruleSearchQuery) {
        const query = ruleSearchQuery.toLowerCase();
        rules = rules.filter((r: any) =>
          r.descrizione.toLowerCase().includes(query)
        );
      }
      filtered[gruppo] = rules;
    });
    return filtered;
  }, [rulesByGroup, activeGroups, ruleSearchQuery, ruleFilter]);

  const totalRules = (strategia?.regole || []).length;

  // ─── Computazioni performance ──────────────────────────────
  const performanceData = React.useMemo(() => {
    if (!operazioni || operazioni.length === 0) return null;

    const winningTrades = operazioni.filter((op) => (op.pnl || 0) > 0);
    const losingTrades = operazioni.filter((op) => (op.pnl || 0) < 0);
    const totalPnl = operazioni.reduce((sum: number, op: any) => sum + (op.pnl || 0), 0);
    const avgWin = winningTrades.length > 0
      ? winningTrades.reduce((sum: number, op: any) => sum + (op.pnl || 0), 0) / winningTrades.length : 0;
    const avgLoss = losingTrades.length > 0
      ? Math.abs(losingTrades.reduce((sum: number, op: any) => sum + (op.pnl || 0), 0)) / losingTrades.length : 0;
    const expectancy = operazioni.length > 0
      ? totalPnl / operazioni.length : 0;
    const bestTrade = Math.max(...operazioni.map((op: any) => op.pnl || 0));
    const worstTrade = Math.min(...operazioni.map((op: any) => op.pnl || 0));

    return { winningTrades, losingTrades, totalPnl, avgWin, avgLoss, expectancy, bestTrade, worstTrade };
  }, [operazioni]);

  // ─── Equity curve data ─────────────────────────────────────
  const equityChartData = React.useMemo(() => {
    if (!operazioni || operazioni.length === 0) return [];

    const sorted = [...operazioni].sort(
      (a, b) => new Date(a.data).getTime() - new Date(b.data).getTime()
    );

    // Raggruppa per data
    const dailyMap = new Map<string, number>();
    sorted.forEach((op) => {
      const dateKey = op.data?.split('T')[0] || op.data;
      dailyMap.set(dateKey, (dailyMap.get(dateKey) || 0) + (op.pnl || 0));
    });

    let cumulative = 0;
    return Array.from(dailyMap.entries()).map(([data, pnl]) => {
      cumulative += pnl;
      const d = new Date(data);
      return {
        date: d.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' }),
        fullDate: data,
        pnl,
        equity: cumulative,
      };
    });
  }, [operazioni]);

  // ─── Distribution histogram data ──────────────────────────
  const distributionData = React.useMemo(() => {
    if (!operazioni || operazioni.length === 0) return [];

    if (distributionView === 'oraria') {
      const hourCounts = new Array(24).fill(0);
      operazioni.forEach((op) => {
        const ora = op.ora_entrata || op.ora || '12:00';
        const hour = parseInt(ora.split(':')[0], 10);
        if (!isNaN(hour) && hour >= 0 && hour < 24) hourCounts[hour]++;
      });
      return hourCounts.map((count, hour) => ({
        label: `${hour.toString().padStart(2, '0')}:00`,
        trades: count,
      })).filter((d) => d.trades > 0 || (parseInt(d.label) >= 8 && parseInt(d.label) <= 22));
    }

    if (distributionView === 'giornaliera') {
      const dayNames = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'];
      const dayCounts = new Array(7).fill(0);
      operazioni.forEach((op) => {
        const d = new Date(op.data);
        dayCounts[d.getDay()]++;
      });
      return dayCounts.map((count, day) => ({
        label: dayNames[day],
        trades: count,
      }));
    }

    // mensile
    const monthNames = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'];
    const monthCounts = new Array(12).fill(0);
    operazioni.forEach((op) => {
      const d = new Date(op.data);
      monthCounts[d.getMonth()]++;
    });
    return monthCounts.map((count, month) => ({
      label: monthNames[month],
      trades: count,
    }));
  }, [operazioni, distributionView]);

  // ─── Operazioni filtrate ──────────────────────────────────
  const filteredOperazioni = React.useMemo(() => {
    let filtered = [...operazioni];

    if (opSearchQuery) {
      const query = opSearchQuery.toLowerCase();
      filtered = filtered.filter((op) =>
        op.ticker?.toLowerCase().includes(query) ||
        op.note?.toLowerCase().includes(query)
      );
    }
    if (opDirectionFilter) {
      filtered = filtered.filter((op) => op.direzione === opDirectionFilter);
    }
    if (opResultFilter === 'win') {
      filtered = filtered.filter((op) => (op.pnl || 0) > 0);
    } else if (opResultFilter === 'loss') {
      filtered = filtered.filter((op) => (op.pnl || 0) < 0);
    }

    return filtered;
  }, [operazioni, opSearchQuery, opDirectionFilter, opResultFilter]);

  if (!strategia) return null;

  const borderColor = strategia.colore || '#7F00FF';
  const opCount = strategia.operazioniCount || 0;
  const winRate = strategia.winRate || 0;
  const profitFactor = strategia.profitFactor || 0;

  const toggleGroup = (group: string) => {
    setExpandedGroups((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(group)) newSet.delete(group);
      else newSet.add(group);
      return newSet;
    });
  };

  // Aggiunge una regola inline dentro un gruppo
  const handleAddRuleToGroup = async (gruppo: string) => {
    if (!newRuleInGroupText.trim()) return;
    setAddingRule(true);
    try {
      await onAddRule(strategia.id, { descrizione: newRuleInGroupText.trim(), gruppo });
      setNewRuleInGroupText('');
      setAddingRuleToGroup(null);
    } finally {
      setAddingRule(false);
    }
  };

  // Aggiunge un gruppo preset (vuoto — l'utente aggiungerà le regole dentro)
  const handleAddPresetGroup = (groupKey: string) => {
    setLocalGroups((prev) => [...prev, groupKey]);
    setExpandedGroups((prev) => new Set([...prev, groupKey]));
    setShowAddGroupMenu(false);
  };

  // Crea un gruppo personalizzato (vuoto)
  const handleCreateCustomGroup = () => {
    if (!newCustomGroupName.trim()) return;
    const groupKey = newCustomGroupName.trim().toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
    if (!groupKey) return;
    setLocalGroups((prev) => [...prev, groupKey]);
    setExpandedGroups((prev) => new Set([...prev, groupKey]));
    setNewCustomGroupName('');
    setShowAddGroupMenu(false);
  };

  // Rimuovi un intero gruppo (elimina tutte le regole del gruppo + rimuovi da locali)
  const handleRemoveGroup = async (gruppo: string) => {
    const rulesInGroup = rulesByGroup[gruppo] || [];
    for (const rule of rulesInGroup) {
      await onDeleteRule(rule.id);
    }
    setLocalGroups((prev) => prev.filter((g) => g !== gruppo));
    setExpandedGroups((prev) => {
      const newSet = new Set(prev);
      newSet.delete(gruppo);
      return newSet;
    });
  };

  // Toggle checkbox per una regola
  const toggleRuleCheck = (ruleId: string) => {
    setCheckedRules((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(ruleId)) newSet.delete(ruleId);
      else newSet.add(ruleId);
      return newSet;
    });
  };

  const tooltipStyle = {
    backgroundColor: theme === 'dark' ? '#1a1a24' : '#ffffff',
    border: '1px solid rgba(139, 92, 246, 0.3)',
    borderRadius: '0.75rem',
    boxShadow: '0 8px 24px rgba(139, 92, 246, 0.15)',
    fontSize: '13px',
  };

  return (
    <div className="space-y-0">
      {/* Strategy header */}
      <div className="p-6 border-b border-gray-200 dark:border-violet-500/15">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <button onClick={onBack} className="mt-1 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-violet-500/10 transition-colors">
              <ArrowLeft className="h-5 w-5 text-gray-500 dark:text-gray-400" />
            </button>
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-4 h-4 rounded-full ring-2 ring-offset-2 ring-offset-white dark:ring-offset-[#1e1e30]" style={{ backgroundColor: borderColor }} />
                <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">{strategia.nome}</h1>
                <Badge variant="outline" className={cn('text-xs font-bold', opCount === 0 ? 'border-gray-300 text-gray-500 dark:border-gray-600 dark:text-gray-400' : winRate >= 60 ? 'border-green-200 text-green-700 bg-green-50 dark:bg-green-500/10 dark:text-green-400 dark:border-green-500/20' : winRate >= 45 ? 'border-amber-200 text-amber-700 bg-amber-50 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20' : 'border-red-200 text-red-700 bg-red-50 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20')}>
                  {opCount === 0 ? 'Nuova' : winRate >= 60 ? 'Ottima' : winRate >= 45 ? 'Media' : 'Da Migliorare'}
                </Badge>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 max-w-2xl">{strategia.descrizione || 'Nessuna descrizione disponibile.'}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => onEdit(strategia)} className="border-gray-200 dark:border-violet-500/30 hover:border-violet-400 text-gray-700 dark:text-gray-300 font-medium">
              <Edit2 className="h-4 w-4 mr-2" />Modifica
            </Button>
            <Button variant="outline" size="sm" onClick={() => onDelete(strategia)} disabled={isLoading} className="border-red-200 dark:border-red-500/30 hover:border-red-400 text-red-600 dark:text-red-400 hover:text-red-700 font-medium">
              <Trash2 className="h-4 w-4 mr-2" />Elimina
            </Button>
          </div>
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6">
          {[
            { label: 'Operazioni', value: opCount.toString(), icon: <BarChart2 className="h-4 w-4" />, color: 'text-violet-600 dark:text-violet-400', bg: 'bg-violet-50 dark:bg-violet-500/10 border-violet-200 dark:border-violet-500/20' },
            { label: 'Win Rate', value: `${winRate.toFixed(1)}%`, icon: <Activity className="h-4 w-4" />, color: winRate >= 50 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400', bg: winRate >= 50 ? 'bg-green-50 dark:bg-green-500/10 border-green-200 dark:border-green-500/20' : 'bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/20' },
            { label: 'Profit Factor', value: profitFactor.toFixed(2), icon: <TrendingUp className="h-4 w-4" />, color: profitFactor >= 1 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400', bg: profitFactor >= 1 ? 'bg-green-50 dark:bg-green-500/10 border-green-200 dark:border-green-500/20' : 'bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/20' },
            { label: 'Regole', value: totalRules.toString(), icon: <BookOpen className="h-4 w-4" />, color: 'text-indigo-600 dark:text-indigo-400', bg: 'bg-indigo-50 dark:bg-indigo-500/10 border-indigo-200 dark:border-indigo-500/20' },
          ].map((stat, idx) => (
            <motion.div key={idx} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }} className={cn('rounded-xl p-3 border', stat.bg)}>
              <div className="flex items-center gap-2 mb-1">
                <span className={stat.color}>{stat.icon}</span>
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400">{stat.label}</span>
              </div>
              <div className={cn('text-xl font-bold tracking-tight', stat.color)}>{stat.value}</div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="performance" className="w-full">
        <div className="px-6 pt-4 border-b border-gray-100 dark:border-violet-500/15">
          <TabsList className="bg-gray-100 dark:bg-gray-800/60 p-1 border border-gray-200 dark:border-violet-500/20">
            <TabsTrigger value="performance" className="data-[state=active]:bg-white dark:data-[state=active]:bg-[#161622] data-[state=active]:shadow-sm data-[state=active]:text-violet-600 dark:data-[state=active]:text-violet-400 font-medium">
              <BarChart2 className="h-4 w-4 mr-2" />Performance
            </TabsTrigger>
            <TabsTrigger value="rules" className="data-[state=active]:bg-white dark:data-[state=active]:bg-[#161622] data-[state=active]:shadow-sm data-[state=active]:text-violet-600 dark:data-[state=active]:text-violet-400 font-medium">
              <BookOpen className="h-4 w-4 mr-2" />Regole / Condizioni ({totalRules})
            </TabsTrigger>
            <TabsTrigger value="trades" className="data-[state=active]:bg-white dark:data-[state=active]:bg-[#161622] data-[state=active]:shadow-sm data-[state=active]:text-violet-600 dark:data-[state=active]:text-violet-400 font-medium">
              <Activity className="h-4 w-4 mr-2" />Operazioni ({operazioni.length})
            </TabsTrigger>
            <TabsTrigger value="description" className="data-[state=active]:bg-white dark:data-[state=active]:bg-[#161622] data-[state=active]:shadow-sm data-[state=active]:text-violet-600 dark:data-[state=active]:text-violet-400 font-medium">
              <Edit2 className="h-4 w-4 mr-2" />Descrizione
            </TabsTrigger>
          </TabsList>
        </div>

        {/* ═══════════════════════════════════════════════════════════
            TAB PERFORMANCE
            ═══════════════════════════════════════════════════════════ */}
        <TabsContent value="performance" className="px-6 py-5 space-y-5">
          {/* Stats grid */}
          {performanceData && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'P&L Totale', value: formatValuta(performanceData.totalPnl), positive: performanceData.totalPnl >= 0 },
                { label: 'Win Rate', value: `${winRate.toFixed(1)}%`, positive: winRate >= 50 },
                { label: 'Profit Factor', value: profitFactor.toFixed(2), positive: profitFactor >= 1 },
                { label: 'Expectancy', value: formatValuta(performanceData.expectancy), positive: performanceData.expectancy >= 0 },
                { label: 'Media Vincita', value: formatValuta(performanceData.avgWin), positive: true },
                { label: 'Media Perdita', value: formatValuta(performanceData.avgLoss), positive: false },
                { label: 'Miglior Trade', value: formatValuta(performanceData.bestTrade), positive: performanceData.bestTrade >= 0 },
                { label: 'Peggior Trade', value: formatValuta(performanceData.worstTrade), positive: performanceData.worstTrade >= 0 },
              ].map((stat, idx) => (
                <motion.div key={idx} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }}>
                  <Card className="border-gray-200 dark:border-violet-500/15 bg-white dark:bg-[#161622]">
                    <CardContent className="p-4">
                      <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">{stat.label}</p>
                      <p className={cn('text-lg font-bold tracking-tight', stat.positive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400')}>{stat.value}</p>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}

          {/* Win/Loss bar */}
          {opCount > 0 && performanceData && (
            <Card className="border-gray-200 dark:border-violet-500/15 bg-white dark:bg-[#161622]">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="text-sm text-green-600 dark:text-green-400 font-bold w-16">{performanceData.winningTrades.length} win</div>
                  <div className="flex-1 h-6 bg-gray-100 dark:bg-gray-800/60 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-green-400 to-green-500 rounded-full transition-all duration-500" style={{ width: `${winRate}%` }} />
                  </div>
                  <div className="text-sm text-red-600 dark:text-red-400 font-bold w-16 text-right">{performanceData.losingTrades.length} loss</div>
                </div>
                <p className="text-center text-sm text-gray-500 dark:text-gray-400 font-medium">{winRate.toFixed(1)}% tasso di vincita su {operazioni.length} operazioni</p>
              </CardContent>
            </Card>
          )}

          {/* Chart view toggle */}
          {equityChartData.length > 0 && (
            <>
              <div className="flex items-center justify-between">
                <div className="bg-gray-100 dark:bg-gray-800/60 p-1 rounded-lg border border-gray-200 dark:border-violet-500/20 flex">
                  <button
                    onClick={() => setChartView('equity')}
                    className={cn('flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-all duration-200',
                      chartView === 'equity'
                        ? 'bg-white dark:bg-[#161622] text-violet-600 dark:text-violet-400 shadow-sm'
                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'
                    )}
                  >
                    <TrendingUp className="h-3.5 w-3.5" />
                    Curva Equity
                  </button>
                  <button
                    onClick={() => setChartView('distribuzione')}
                    className={cn('flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-all duration-200',
                      chartView === 'distribuzione'
                        ? 'bg-white dark:bg-[#161622] text-violet-600 dark:text-violet-400 shadow-sm'
                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'
                    )}
                  >
                    <BarChart2 className="h-3.5 w-3.5" />
                    Distribuzione Trade
                  </button>
                </div>

                {chartView === 'distribuzione' && (
                  <div className="bg-gray-100 dark:bg-gray-800/60 p-1 rounded-lg border border-gray-200 dark:border-violet-500/20 flex">
                    {(['oraria', 'giornaliera', 'mensile'] as DistributionView[]).map((view) => (
                      <button
                        key={view}
                        onClick={() => setDistributionView(view)}
                        className={cn('rounded-md px-3 py-1.5 text-xs font-medium transition-all duration-200',
                          distributionView === view
                            ? 'bg-white dark:bg-[#161622] text-violet-600 dark:text-violet-400 shadow-sm'
                            : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'
                        )}
                      >
                        {view.charAt(0).toUpperCase() + view.slice(1)}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Equity Curve Chart */}
              {chartView === 'equity' && (
                <Card className="border-gray-200 dark:border-violet-500/15 bg-white dark:bg-[#161622]">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base font-bold tracking-tight text-gray-900 dark:text-white flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                      Curva Equity — {strategia.nome}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-72 md:h-80">
                      <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                        <AreaChart data={equityChartData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                          <defs>
                            <linearGradient id={`colorEquityStrat-${strategia.id}`} x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor={borderColor} stopOpacity={0.3} />
                              <stop offset="95%" stopColor={borderColor} stopOpacity={0} />
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
                            contentStyle={tooltipStyle}
                            labelStyle={{ color: theme === 'dark' ? '#a78bfa' : '#8b5cf6' }}
                            formatter={(value: any) => [formatValuta(Number(value) || 0), 'Equity']}
                            labelFormatter={(label) => `Data: ${label}`}
                          />
                          <ReferenceLine y={0} stroke="rgba(139, 92, 246, 0.3)" strokeDasharray="3 3" />
                          <Area
                            type="monotone"
                            dataKey="equity"
                            stroke={borderColor}
                            strokeWidth={2.5}
                            fillOpacity={1}
                            fill={`url(#colorEquityStrat-${strategia.id})`}
                            animationDuration={1200}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Distribution Histogram */}
              {chartView === 'distribuzione' && (
                <Card className="border-gray-200 dark:border-violet-500/15 bg-white dark:bg-[#161622]">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base font-bold tracking-tight text-gray-900 dark:text-white flex items-center gap-2">
                      <BarChart2 className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                      Distribuzione Trade — Frequenza {distributionView}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-72 md:h-80">
                      <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                        <BarChart data={distributionData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(139, 92, 246, 0.08)" vertical={false} />
                          <XAxis
                            dataKey="label"
                            tick={{ fill: '#8b8b9f', fontSize: 11 }}
                            axisLine={{ stroke: 'rgba(139, 92, 246, 0.1)' }}
                            tickLine={false}
                          />
                          <YAxis
                            tick={{ fill: '#8b8b9f', fontSize: 11 }}
                            axisLine={false}
                            tickLine={false}
                            allowDecimals={false}
                          />
                          <Tooltip
                            contentStyle={tooltipStyle}
                            labelStyle={{ color: theme === 'dark' ? '#a78bfa' : '#8b5cf6' }}
                            formatter={(value: any) => [`${value} trade`, 'Frequenza']}
                          />
                          <Bar dataKey="trades" radius={[6, 6, 0, 0]} animationDuration={800}>
                            {distributionData.map((entry, index) => (
                              <Cell
                                key={`cell-${index}`}
                                fill={entry.trades > 0 ? borderColor : 'rgba(139, 92, 246, 0.1)'}
                                fillOpacity={0.7 + (entry.trades / Math.max(...distributionData.map(d => d.trades), 1)) * 0.3}
                              />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}

          {/* Empty state */}
          {opCount === 0 && (
            <Card className="border-gray-200 dark:border-violet-500/15 bg-white dark:bg-[#161622]">
              <CardContent className="py-12 text-center">
                <BarChart2 className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                <p className="text-gray-500 dark:text-gray-400 font-medium">Nessun dato di performance disponibile</p>
                <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Assegna operazioni chiuse a questa strategia per visualizzare le statistiche</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ═══════════════════════════════════════════════════════════
            TAB REGOLE / CONDIZIONI
            ═══════════════════════════════════════════════════════════ */}
        <TabsContent value="rules" className="px-6 py-5 space-y-5">
          {/* ─── Barra superiore: ricerca + filtro ─── */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400 dark:text-violet-400" />
              <Input placeholder="Cerca nelle regole..." value={ruleSearchQuery} onChange={(e) => setRuleSearchQuery(e.target.value)} className="pl-10 border-gray-200 dark:border-violet-500/30 bg-white dark:bg-[#161622] text-gray-900 dark:text-white focus:ring-2 focus:ring-violet-500/10" />
            </div>
            {activeGroups.length > 1 && (
              <select value={ruleFilter} onChange={(e) => setRuleFilter(e.target.value)} className="px-3 py-2 bg-white dark:bg-[#161622] border border-gray-200 dark:border-violet-500/30 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium focus:border-violet-400 outline-none">
                <option value="">Tutti i gruppi</option>
                {activeGroups.map((g) => {
                  const cfg = getGroupConfig(g);
                  return <option key={g} value={g}>{cfg.label}</option>;
                })}
              </select>
            )}
          </div>

          {/* ─── Info + azioni ─── */}
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">
              {totalRules} {totalRules === 1 ? 'regola' : 'regole'} in {activeGroups.length} {activeGroups.length === 1 ? 'gruppo' : 'gruppi'}
            </p>
            <div className="flex items-center gap-2">
              {activeGroups.length > 0 && (
                <>
                  <button onClick={() => setExpandedGroups(new Set(activeGroups))} className="text-xs font-medium text-violet-600 dark:text-violet-400 hover:text-violet-700 transition-colors">
                    Espandi tutti
                  </button>
                  <span className="text-gray-300 dark:text-gray-600">|</span>
                  <button onClick={() => setExpandedGroups(new Set())} className="text-xs font-medium text-violet-600 dark:text-violet-400 hover:text-violet-700 transition-colors">
                    Comprimi tutti
                  </button>
                </>
              )}
            </div>
          </div>

          {/* ─── Gruppi attivi con regole ─── */}
          {activeGroups.map((gruppo) => {
            if (ruleFilter && gruppo !== ruleFilter) return null;
            const config = getGroupConfig(gruppo);
            const rules = filteredRulesByGroup[gruppo] || [];
            const allRulesInGroup = rulesByGroup[gruppo] || [];
            const isExpanded = expandedGroups.has(gruppo);
            const checkedCount = allRulesInGroup.filter((r: any) => checkedRules.has(r.id)).length;

            return (
              <motion.div key={gruppo} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl overflow-hidden border border-gray-200 dark:border-violet-500/15">
                {/* Header del gruppo */}
                <div
                  role="button" tabIndex={0}
                  onClick={() => toggleGroup(gruppo)}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') toggleGroup(gruppo); }}
                  className="w-full flex items-center justify-between p-4 transition-colors bg-gray-50 dark:bg-[#161622]/60 hover:bg-gray-100 dark:hover:bg-[#161622] cursor-pointer select-none"
                >
                  <div className="flex items-center gap-3">
                    <div className={cn('p-2 rounded-lg border', config.bgColor)}>
                      <span className={config.color}>{config.icon}</span>
                    </div>
                    <div className="text-left">
                      <span className="font-bold text-gray-900 dark:text-white">{config.label}</span>
                      <Badge variant="outline" className="ml-2 text-xs font-bold border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400">
                        {checkedCount}/{allRulesInGroup.length}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {/* Rimuovi gruppo */}
                    <button
                      onClick={(e) => { e.stopPropagation(); handleRemoveGroup(gruppo); }}
                      className="p-1.5 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all opacity-0 group-hover:opacity-100"
                      style={{ opacity: 1 }}
                      title="Rimuovi gruppo"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                    {isExpanded ? <ChevronUp className="h-5 w-5 text-gray-400" /> : <ChevronDown className="h-5 w-5 text-gray-400" />}
                  </div>
                </div>

                {/* Contenuto espanso — regole con checkbox */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
                      <div className="p-4 space-y-1.5 bg-white dark:bg-[#1e1e30]/50">
                        {rules.length > 0 ? rules.map((rule: any, idx: number) => {
                          const isChecked = checkedRules.has(rule.id);
                          return (
                            <motion.div
                              key={rule.id}
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: idx * 0.03 }}
                              className={cn(
                                'flex items-center gap-3 p-3 rounded-lg border transition-all',
                                isChecked
                                  ? cn(config.bgColor, 'shadow-sm')
                                  : 'border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-[#161622]/30 opacity-60'
                              )}
                            >
                              {/* Checkbox */}
                              <button
                                onClick={() => toggleRuleCheck(rule.id)}
                                className={cn(
                                  'w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all',
                                  isChecked
                                    ? 'bg-violet-600 border-violet-600 text-white'
                                    : 'border-gray-300 dark:border-gray-600 hover:border-violet-400'
                                )}
                              >
                                {isChecked && (
                                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                  </svg>
                                )}
                              </button>

                              {/* Testo regola */}
                              <div className="flex-1 min-w-0">
                                <p className={cn('text-sm font-medium', isChecked ? 'text-gray-800 dark:text-white' : 'text-gray-400 dark:text-gray-500 line-through')}>
                                  {rule.descrizione}
                                </p>
                                {rule.note && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{rule.note}</p>}
                              </div>

                              {/* Elimina singola regola */}
                              <Button variant="ghost" size="sm" onClick={() => onDeleteRule(rule.id)} disabled={isLoading} className="text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 shrink-0 h-7 w-7 p-0">
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </motion.div>
                          );
                        }) : (
                          <p className="text-sm text-gray-400 dark:text-gray-500 py-3 text-center">
                            {ruleSearchQuery ? 'Nessuna regola trovata' : 'Nessuna regola — aggiungine una qui sotto'}
                          </p>
                        )}

                        {/* Aggiungi regola inline */}
                        {addingRuleToGroup === gruppo ? (
                          <div className="flex items-center gap-2 pt-2">
                            <Input
                              placeholder="Descrivi la condizione..."
                              value={newRuleInGroupText}
                              onChange={(e) => setNewRuleInGroupText(e.target.value)}
                              onKeyDown={(e) => { if (e.key === 'Enter') handleAddRuleToGroup(gruppo); if (e.key === 'Escape') { setAddingRuleToGroup(null); setNewRuleInGroupText(''); } }}
                              disabled={addingRule}
                              autoFocus
                              className="flex-1 h-9 text-sm border-gray-200 dark:border-violet-500/30 bg-white dark:bg-[#161622] text-gray-900 dark:text-white focus:ring-2 focus:ring-violet-500/10"
                            />
                            <Button size="sm" onClick={() => handleAddRuleToGroup(gruppo)} disabled={!newRuleInGroupText.trim() || addingRule} className="h-9 bg-violet-600 hover:bg-violet-700 text-white border-0 font-bold text-xs px-3">
                              {addingRule ? '...' : 'Aggiungi'}
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => { setAddingRuleToGroup(null); setNewRuleInGroupText(''); }} className="h-9 text-gray-400 hover:text-gray-600 px-2">
                              ✕
                            </Button>
                          </div>
                        ) : (
                          <button
                            onClick={() => { setAddingRuleToGroup(gruppo); setNewRuleInGroupText(''); }}
                            className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-lg border border-dashed border-gray-200 dark:border-violet-500/20 text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-violet-600 dark:hover:text-violet-400 hover:border-violet-300 dark:hover:border-violet-500/40 transition-all mt-1"
                          >
                            <Plus className="h-3.5 w-3.5" />
                            Aggiungi regola
                          </button>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}

          {/* ─── Aggiungi nuovo gruppo ─── */}
          <Button
            onClick={() => setShowAddGroupMenu(!showAddGroupMenu)}
            variant="outline"
            className={cn(
              'w-full border-dashed border-2 font-bold py-6 transition-all',
              showAddGroupMenu
                ? 'border-violet-300 dark:border-violet-500/40 text-violet-600 dark:text-violet-400 bg-violet-50/50 dark:bg-violet-500/5'
                : 'border-gray-200 dark:border-violet-500/20 hover:border-violet-300 dark:hover:border-violet-500/40 text-gray-600 dark:text-gray-400 hover:text-violet-600 dark:hover:text-violet-400'
            )}
          >
            {showAddGroupMenu ? <ChevronUp className="h-5 w-5 mr-2" /> : <Plus className="h-5 w-5 mr-2" />}
            {showAddGroupMenu ? 'Chiudi' : 'Aggiungi Gruppo'}
          </Button>

          {/* ─── Menu inline per aggiungere gruppi (NON absolute/dropdown) ─── */}
          <AnimatePresence>
            {showAddGroupMenu && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <Card className="border-gray-200 dark:border-violet-500/20 bg-white dark:bg-[#1e1e30]">
                  <CardContent className="p-4 space-y-4">
                    {/* Gruppi preset disponibili */}
                    {availablePresetGroups.length > 0 && (
                      <div>
                        <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
                          Gruppi Preset Disponibili
                        </p>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                          {availablePresetGroups.map((preset) => (
                            <button
                              key={preset.key}
                              onClick={() => handleAddPresetGroup(preset.key)}
                              disabled={addingRule}
                              className={cn(
                                'flex items-center gap-2.5 p-3 rounded-xl border text-left transition-all hover:shadow-md hover:scale-[1.02]',
                                preset.bgColor,
                                'cursor-pointer'
                              )}
                            >
                              <div className={cn('p-1.5 rounded-lg', preset.bgColor)}>
                                <span className={preset.color}>{preset.icon}</span>
                              </div>
                              <span className={cn('text-sm font-bold', preset.color)}>{preset.label}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {availablePresetGroups.length === 0 && (
                      <div className="text-center py-2">
                        <p className="text-sm text-gray-500 dark:text-gray-400">Tutti i gruppi preset sono già stati aggiunti</p>
                      </div>
                    )}

                    {/* Separatore */}
                    <div className="border-t border-gray-100 dark:border-violet-500/10" />

                    {/* Crea gruppo personalizzato */}
                    <div>
                      <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                        Nuovo Gruppo Personalizzato
                      </p>
                      <div className="flex gap-2">
                        <Input
                          placeholder="Nome del gruppo..."
                          value={newCustomGroupName}
                          onChange={(e) => setNewCustomGroupName(e.target.value)}
                          onKeyDown={(e) => { if (e.key === 'Enter') handleCreateCustomGroup(); }}
                          disabled={addingRule}
                          className="flex-1 h-10 text-sm border-gray-200 dark:border-violet-500/30 bg-gray-50 dark:bg-[#161622] text-gray-900 dark:text-white"
                        />
                        <Button
                          onClick={handleCreateCustomGroup}
                          disabled={!newCustomGroupName.trim() || addingRule}
                          className="h-10 bg-violet-600 hover:bg-violet-700 text-white border-0 font-bold text-sm px-5"
                        >
                          <Plus className="h-4 w-4 mr-1.5" />Crea
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Empty state se nessun gruppo e menu chiuso */}
          {activeGroups.length === 0 && !showAddGroupMenu && (
            <Card className="border-gray-200 dark:border-violet-500/15 bg-white dark:bg-[#161622]">
              <CardContent className="py-10 text-center">
                <BookOpen className="h-10 w-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                <p className="text-gray-500 dark:text-gray-400 font-medium">Nessun gruppo di regole</p>
                <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Clicca &quot;Aggiungi Gruppo&quot; per iniziare</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ═══════════════════════════════════════════════════════════
            TAB OPERAZIONI — Layout affiancato (lista + grafico kline)
            ═══════════════════════════════════════════════════════════ */}
        <TabsContent value="trades" className="px-6 py-5">
          {operazioni.length > 0 ? (
            <div className="flex gap-5 min-h-[600px]">
              {/* ─── Colonna sinistra: Lista operazioni ─── */}
              <div className="w-[420px] shrink-0 flex flex-col">
                {/* Header + filtri */}
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <Activity className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                    Operazioni
                  </h3>
                  <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                    {filteredOperazioni.length !== operazioni.length
                      ? `${filteredOperazioni.length}/${operazioni.length}`
                      : `${operazioni.length} totali`}
                  </span>
                </div>

                {/* Filtri compatti */}
                <div className="flex gap-2 mb-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-gray-400 dark:text-violet-400" />
                    <Input
                      placeholder="Cerca ticker..."
                      value={opSearchQuery}
                      onChange={(e) => setOpSearchQuery(e.target.value)}
                      className="pl-8 h-8 text-xs border-gray-200 dark:border-violet-500/30 bg-white dark:bg-[#161622] text-gray-900 dark:text-white"
                    />
                  </div>
                  <select
                    value={opDirectionFilter}
                    onChange={(e) => setOpDirectionFilter(e.target.value)}
                    className="px-2 py-1 bg-white dark:bg-[#161622] border border-gray-200 dark:border-violet-500/30 text-gray-700 dark:text-gray-300 rounded-lg text-xs font-medium focus:border-violet-400 outline-none"
                  >
                    <option value="">Tutte</option>
                    <option value="LONG">Long</option>
                    <option value="SHORT">Short</option>
                  </select>
                  <select
                    value={opResultFilter}
                    onChange={(e) => setOpResultFilter(e.target.value)}
                    className="px-2 py-1 bg-white dark:bg-[#161622] border border-gray-200 dark:border-violet-500/30 text-gray-700 dark:text-gray-300 rounded-lg text-xs font-medium focus:border-violet-400 outline-none"
                  >
                    <option value="">Tutti</option>
                    <option value="win">Win</option>
                    <option value="loss">Loss</option>
                  </select>
                </div>

                {/* Lista scrollabile */}
                <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 custom-scrollbar">
                  {filteredOperazioni.map((op: any, idx: number) => {
                    const pnl = op.pnl || 0;
                    const isWin = pnl > 0;
                    const isSelected = selectedOp?.id === op.id;

                    return (
                      <motion.div
                        key={op.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: Math.min(idx * 0.02, 0.2) }}
                        onClick={() => setSelectedOp(op)}
                        className={cn(
                          'px-3 py-2.5 rounded-lg border cursor-pointer transition-all duration-200 group',
                          isSelected
                            ? 'bg-violet-50 dark:bg-violet-500/10 border-violet-300 dark:border-violet-500/40 shadow-sm'
                            : 'bg-white dark:bg-[#161622]/50 border-gray-200 dark:border-violet-500/10 hover:border-violet-200 dark:hover:border-violet-500/25 hover:bg-gray-50 dark:hover:bg-violet-500/5'
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            <span className="text-xs text-gray-400 dark:text-gray-500 font-medium w-[70px]">
                              {new Date(op.data).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                            </span>
                            <span className="font-bold text-sm text-gray-900 dark:text-white tracking-tight">{op.ticker}</span>
                            <Badge variant="outline" className={cn('text-[10px] px-1.5 py-0 font-bold',
                              isWin
                                ? 'bg-green-50 text-green-700 border-green-200 dark:bg-green-500/10 dark:text-green-400 dark:border-green-500/20'
                                : 'bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20'
                            )}>
                              {isWin ? 'Win' : 'Loss'}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={cn('text-sm font-bold tracking-tight', isWin ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400')}>
                              {pnl !== 0 ? formatValuta(pnl) : '-'}
                            </span>
                            <BarChart2 className={cn('h-3.5 w-3.5 transition-colors', isSelected ? 'text-violet-500' : 'text-gray-300 dark:text-gray-600 group-hover:text-violet-400')} />
                            <ChevronDown className={cn('h-3.5 w-3.5 -rotate-90 transition-colors', isSelected ? 'text-violet-500' : 'text-gray-300 dark:text-gray-600')} />
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>

              {/* ─── Colonna destra: Grafico Kline + Aderenza ─── */}
              <div className="flex-1 min-w-0 space-y-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                    Grafico
                  </h3>
                  {selectedOp && (
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {selectedOp.ticker} — {new Date(selectedOp.data).toLocaleDateString('it-IT')}
                    </span>
                  )}
                </div>

                {selectedOp ? (
                  <>
                    <KlineChartComponent
                      ticker={selectedOp.ticker}
                      tradeDate={selectedOp.data?.split('T')[0] || selectedOp.data}
                      trade={{
                        entryPrice: selectedOp.prezzo_entrata,
                        exitPrice: selectedOp.prezzo_uscita,
                        entryTime: selectedOp.ora_entrata || selectedOp.ora,
                        exitTime: selectedOp.ora_uscita,
                        direction: selectedOp.direzione,
                        stopLoss: selectedOp.stop_loss,
                        takeProfit: selectedOp.take_profit,
                        pnl: selectedOp.pnl,
                        quantity: selectedOp.quantita,
                      }}
                      height="520px"
                    />
                    {/* Aderenza Regole per l'operazione selezionata */}
                    <PlaybookAderenzaPanel
                      operazioneId={selectedOp.id}
                      strategiaId={strategia.id}
                    />
                  </>
                ) : (
                  <div className="h-[520px] rounded-xl border border-gray-200 dark:border-violet-500/15 bg-white dark:bg-[#161622] flex flex-col items-center justify-center">
                    <BarChart2 className="h-12 w-12 text-gray-200 dark:text-gray-700 mb-4" />
                    <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Seleziona un&apos;operazione dalla lista per visualizzare il grafico</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <Card className="border-gray-200 dark:border-violet-500/15 bg-white dark:bg-[#161622]">
              <CardContent className="py-12 text-center">
                <Activity className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                <p className="text-gray-500 dark:text-gray-400 font-medium">Nessuna operazione chiusa registrata per questa strategia</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ═══════════════════════════════════════════════════════════
            TAB DESCRIZIONE
            ═══════════════════════════════════════════════════════════ */}
        <TabsContent value="description" className="px-6 py-5 space-y-5">
          <Card className="border-gray-200 dark:border-violet-500/15 bg-white dark:bg-[#161622]">
            <CardHeader><CardTitle className="text-base font-bold tracking-tight text-gray-900 dark:text-white flex items-center gap-2"><BookOpen className="h-4 w-4 text-violet-600 dark:text-violet-400" />Informazioni Strategia</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Colore</p>
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-lg border border-gray-200 dark:border-violet-500/30" style={{ backgroundColor: borderColor }} />
                    <span className="text-gray-800 dark:text-white font-mono font-bold text-sm">{borderColor}</span>
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Stato</p>
                  <Badge variant="outline" className={strategia.attiva ? 'border-green-200 text-green-700 bg-green-50 dark:bg-green-500/10 dark:text-green-400 dark:border-green-500/20 font-bold' : 'border-gray-200 text-gray-500 dark:border-gray-600 dark:text-gray-400 font-bold'}>
                    {strategia.attiva ? 'Attiva' : 'Inattiva'}
                  </Badge>
                </div>
              </div>

              {strategia.descrizione && (
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Descrizione</p>
                  <p className="text-gray-800 dark:text-white bg-gray-50 dark:bg-[#161622]/80 p-4 rounded-xl border border-gray-200 dark:border-violet-500/15">{strategia.descrizione}</p>
                </div>
              )}

              {strategia.descrizione_dettagliata && (
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Descrizione Dettagliata</p>
                  <div className="text-gray-800 dark:text-white bg-gray-50 dark:bg-[#161622]/80 p-4 rounded-xl border border-gray-200 dark:border-violet-500/15 prose prose-sm dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: strategia.descrizione_dettagliata }} />
                </div>
              )}

              {(strategia.rischio_max_importo || strategia.rischio_max_percentuale) && (
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Impostazioni Rischio</p>
                  <div className="grid grid-cols-2 gap-4">
                    {strategia.rischio_max_importo && (
                      <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20">
                        <div className="flex items-center gap-2 mb-1">
                          <DollarSign className="h-4 w-4 text-amber-600 dark:text-amber-400" /><span className="text-xs font-bold text-amber-600 dark:text-amber-400">Rischio Max</span>
                        </div>
                        <span className="text-lg font-bold tracking-tight text-amber-700 dark:text-amber-400">{formatValuta(strategia.rischio_max_importo)}</span>
                      </div>
                    )}
                    {strategia.rischio_max_percentuale && (
                      <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20">
                        <div className="flex items-center gap-2 mb-1">
                          <Percent className="h-4 w-4 text-amber-600 dark:text-amber-400" /><span className="text-xs font-bold text-amber-600 dark:text-amber-400">Rischio Max %</span>
                        </div>
                        <span className="text-lg font-bold tracking-tight text-amber-700 dark:text-amber-400">{strategia.rischio_max_percentuale}%</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ─── Aderenza Regole Panel (nel tab Operazioni) ─────────────────────────
function PlaybookAderenzaPanel({ operazioneId, strategiaId }: { operazioneId: string; strategiaId: string }) {
  const { aderenza, loading, toggleRegola } = useConformitaRegole(operazioneId, strategiaId);
  const [expanded, setExpanded] = React.useState(true);

  if (loading && !aderenza) {
    return (
      <Card className="border-gray-200 dark:border-violet-500/15 bg-white dark:bg-[#161622]">
        <CardContent className="p-4">
          <p className="text-xs text-gray-400 animate-pulse text-center">Caricamento regole...</p>
        </CardContent>
      </Card>
    );
  }

  if (!aderenza || aderenza.totali === 0) return null;

  // Raggruppa per gruppo
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
    <Card className="border-gray-200 dark:border-violet-500/15 bg-white dark:bg-[#161622]">
      <CardHeader className="pb-2 pt-3 px-4">
        <div
          className="flex items-center justify-between cursor-pointer"
          onClick={() => setExpanded(!expanded)}
        >
          <CardTitle className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
            <BookOpen className="h-3.5 w-3.5 text-violet-500" />
            Aderenza Regole
          </CardTitle>
          <div className="flex items-center gap-2">
            <span className={cn('text-sm font-bold tabular-nums', pctColor)}>
              {pct}%
            </span>
            <span className="text-[10px] text-gray-400">
              {aderenza.rispettate}/{aderenza.totali}
            </span>
            {expanded ? <ChevronUp className="h-3.5 w-3.5 text-gray-400" /> : <ChevronDown className="h-3.5 w-3.5 text-gray-400" />}
          </div>
        </div>
        {/* Barra progressione */}
        <div className="w-full h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full mt-2 overflow-hidden">
          <div
            className={cn('h-full rounded-full transition-all duration-500', barColor)}
            style={{ width: `${pct}%` }}
          />
        </div>
      </CardHeader>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <CardContent className="px-4 pb-4 pt-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {Object.entries(regoleByGruppo).map(([gruppo, regole]) => {
                  const preset = PRESET_GRUPPI.find((p) => p.key === gruppo);
                  const gLabel = preset?.label || gruppo.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
                  const gColor = preset?.color || 'text-gray-600 dark:text-gray-400';

                  return (
                    <div key={gruppo}>
                      <p className={cn('text-[10px] font-bold uppercase tracking-wider mb-1.5', gColor)}>
                        {gLabel}
                      </p>
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
                                'text-xs font-medium',
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
              </div>
            </CardContent>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}
