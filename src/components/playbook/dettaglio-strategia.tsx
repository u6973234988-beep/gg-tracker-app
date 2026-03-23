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
  FileText,
  Save,
  Check,
  Download,
  Image as ImageIcon,
  X,
  Camera,
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
import { KlineChartComponent, type ScreenshotData } from '@/components/charts/kline-chart';
import type { StrategiaConDettagli } from '@/hooks/usePlaybook';
import { useConformitaRegole } from '@/hooks/useConformitaRegole';
import { RichTextEditor, RichTextViewer } from '@/components/editor/rich-text-editor';

interface DettaglioStrategiaProps {
  strategia: StrategiaConDettagli | null;
  operazioni: any[];
  onBack: () => void;
  onEdit: (strategia: StrategiaConDettagli) => void;
  onEditSave: (id: string, updates: any) => Promise<void>;
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
  onEditSave,
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

  // PDF export state
  const [exportingPdf, setExportingPdf] = React.useState(false);

  // Description editing state
  const [editingDescription, setEditingDescription] = React.useState(false);
  const [descriptionText, setDescriptionText] = React.useState(strategia?.descrizione_dettagliata || '');
  const [savingDescription, setSavingDescription] = React.useState(false);
  const [descriptionSaved, setDescriptionSaved] = React.useState(false);

  // Screenshots state
  const [screenshots, setScreenshots] = React.useState<ScreenshotData[]>(() => {
    try {
      const raw = (strategia as any)?.screenshots;
      return Array.isArray(raw) ? raw : [];
    } catch { return []; }
  });
  const [editingScreenshot, setEditingScreenshot] = React.useState<string | null>(null);
  const [savingScreenshots, setSavingScreenshots] = React.useState(false);
  const [screenshotsSaved, setScreenshotsSaved] = React.useState(false);

  React.useEffect(() => {
    setDescriptionText(strategia?.descrizione_dettagliata || '');
    try {
      const raw = (strategia as any)?.screenshots;
      setScreenshots(Array.isArray(raw) ? raw : []);
    } catch { setScreenshots([]); }
  }, [strategia?.id, strategia?.descrizione_dettagliata]);

  const handleSaveDescription = async () => {
    if (!strategia) return;
    setSavingDescription(true);
    try {
      await onEditSave(strategia.id, { descrizione_dettagliata: descriptionText });
      setDescriptionSaved(true);
      setEditingDescription(false);
      setTimeout(() => setDescriptionSaved(false), 2000);
    } finally {
      setSavingDescription(false);
    }
  };

  // Screenshot handlers
  const handleAddScreenshot = React.useCallback((screenshot: ScreenshotData) => {
    setScreenshots((prev) => [screenshot, ...prev]);
    // Auto-save after adding
    (async () => {
      if (!strategia) return;
      setSavingScreenshots(true);
      try {
        const updated = [screenshot, ...screenshots];
        await onEditSave(strategia.id, { screenshots: updated });
        setScreenshotsSaved(true);
        setTimeout(() => setScreenshotsSaved(false), 2000);
      } finally {
        setSavingScreenshots(false);
      }
    })();
  }, [strategia, screenshots, onEditSave]);

  const handleDeleteScreenshot = async (id: string) => {
    if (!strategia) return;
    const updated = screenshots.filter((s) => s.id !== id);
    setScreenshots(updated);
    setSavingScreenshots(true);
    try {
      await onEditSave(strategia.id, { screenshots: updated });
    } finally {
      setSavingScreenshots(false);
    }
  };

  const handleUpdateScreenshotMeta = async (id: string, field: keyof ScreenshotData, value: string) => {
    const updated = screenshots.map((s) => s.id === id ? { ...s, [field]: value } : s);
    setScreenshots(updated);
  };

  const handleSaveScreenshotMeta = async (_id: string) => {
    if (!strategia) return;
    setSavingScreenshots(true);
    try {
      await onEditSave(strategia.id, { screenshots });
      setEditingScreenshot(null);
      setScreenshotsSaved(true);
      setTimeout(() => setScreenshotsSaved(false), 2000);
    } finally {
      setSavingScreenshots(false);
    }
  };

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

    // Calcolo R:R medio (Risk/Reward) basato su prezzo entrata, stop loss, take profit
    const rrValues: number[] = [];
    operazioni.forEach((op: any) => {
      const entry = op.prezzo_entrata;
      const sl = op.stop_loss;
      const tp = op.take_profit;
      if (entry && sl && tp) {
        const risk = Math.abs(entry - sl);
        const reward = Math.abs(tp - entry);
        if (risk > 0) rrValues.push(reward / risk);
      }
    });
    const avgRR = rrValues.length > 0 ? rrValues.reduce((s, v) => s + v, 0) / rrValues.length : 0;

    return { winningTrades, losingTrades, totalPnl, avgWin, avgLoss, expectancy, bestTrade, worstTrade, avgRR, rrCount: rrValues.length };
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
            <Button
              variant="outline"
              size="sm"
              disabled={exportingPdf}
              onClick={async () => {
                setExportingPdf(true);
                try {
                  const { generatePlaybookPdf } = await import('@/lib/pdf-export');
                  await generatePlaybookPdf(strategia, screenshots);
                } catch (err) {
                  console.error('Errore export PDF:', err);
                } finally {
                  setExportingPdf(false);
                }
              }}
              className="border-violet-200 dark:border-violet-500/30 hover:border-violet-400 text-violet-600 dark:text-violet-400 font-medium"
            >
              {exportingPdf ? (
                <><span className="animate-spin mr-2">⏳</span>Generazione...</>
              ) : (
                <><Download className="h-4 w-4 mr-2" />Esporta PDF</>
              )}
            </Button>
            <Button variant="outline" size="sm" onClick={() => onEdit(strategia)} className="border-gray-200 dark:border-violet-500/30 hover:border-violet-400 text-gray-700 dark:text-gray-300 font-medium">
              <Edit2 className="h-4 w-4 mr-2" />Modifica
            </Button>
            <Button variant="outline" size="sm" onClick={() => onDelete(strategia)} disabled={isLoading} className="border-red-200 dark:border-red-500/30 hover:border-red-400 text-red-600 dark:text-red-400 hover:text-red-700 font-medium">
              <Trash2 className="h-4 w-4 mr-2" />Elimina
            </Button>
          </div>
        </div>

      </div>

      {/* Tabs — Ordine: Descrizione → Regole → Performance → Operazioni */}
      <Tabs defaultValue="description" className="w-full">
        <div className="px-6 pt-4 border-b border-gray-100 dark:border-violet-500/15">
          <TabsList className="bg-gray-100 dark:bg-gray-800/60 p-1 border border-gray-200 dark:border-violet-500/20">
            <TabsTrigger value="description" className="data-[state=active]:bg-white dark:data-[state=active]:bg-[#161622] data-[state=active]:shadow-sm data-[state=active]:text-violet-600 dark:data-[state=active]:text-violet-400 font-medium">
              <Edit2 className="h-4 w-4 mr-2" />Descrizione
            </TabsTrigger>
            <TabsTrigger value="rules" className="data-[state=active]:bg-white dark:data-[state=active]:bg-[#161622] data-[state=active]:shadow-sm data-[state=active]:text-violet-600 dark:data-[state=active]:text-violet-400 font-medium">
              <BookOpen className="h-4 w-4 mr-2" />Regole / Condizioni ({totalRules})
            </TabsTrigger>
            <TabsTrigger value="performance" className="data-[state=active]:bg-white dark:data-[state=active]:bg-[#161622] data-[state=active]:shadow-sm data-[state=active]:text-violet-600 dark:data-[state=active]:text-violet-400 font-medium">
              <BarChart2 className="h-4 w-4 mr-2" />Performance
            </TabsTrigger>
            <TabsTrigger value="trades" className="data-[state=active]:bg-white dark:data-[state=active]:bg-[#161622] data-[state=active]:shadow-sm data-[state=active]:text-violet-600 dark:data-[state=active]:text-violet-400 font-medium">
              <Activity className="h-4 w-4 mr-2" />Operazioni ({operazioni.length})
            </TabsTrigger>
          </TabsList>
        </div>

        {/* ═══════════════════════════════════════════════════════════
            TAB PERFORMANCE
            ═══════════════════════════════════════════════════════════ */}
        <TabsContent value="performance" className="px-6 py-5">
          {opCount > 0 && performanceData ? (
            <div className="flex gap-5">
              {/* ═══ COLONNA SINISTRA — Grafici ═══ */}
              <div className="flex-1 min-w-0 space-y-4">
                {/* Win/Loss bar compatta */}
                <div className="rounded-xl border border-gray-200 dark:border-violet-500/15 bg-white dark:bg-[#161622] p-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-green-600 dark:text-green-400 font-bold w-14">{performanceData.winningTrades.length} win</span>
                    <div className="flex-1 h-4 bg-gray-100 dark:bg-gray-800/60 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-green-400 to-green-500 rounded-full transition-all duration-500" style={{ width: `${winRate}%` }} />
                    </div>
                    <span className="text-xs text-red-600 dark:text-red-400 font-bold w-14 text-right">{performanceData.losingTrades.length} loss</span>
                  </div>
                </div>

                {/* Chart toggle */}
                {equityChartData.length > 0 && (
                  <>
                    <div className="flex items-center justify-between">
                      <div className="bg-gray-100 dark:bg-gray-800/60 p-0.5 rounded-lg border border-gray-200 dark:border-violet-500/20 flex">
                        <button onClick={() => setChartView('equity')} className={cn('flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium transition-all', chartView === 'equity' ? 'bg-white dark:bg-[#161622] text-violet-600 dark:text-violet-400 shadow-sm' : 'text-gray-500 dark:text-gray-400')}>
                          <TrendingUp className="h-3 w-3" /> Equity
                        </button>
                        <button onClick={() => setChartView('distribuzione')} className={cn('flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium transition-all', chartView === 'distribuzione' ? 'bg-white dark:bg-[#161622] text-violet-600 dark:text-violet-400 shadow-sm' : 'text-gray-500 dark:text-gray-400')}>
                          <BarChart2 className="h-3 w-3" /> Distribuzione
                        </button>
                      </div>
                      {chartView === 'distribuzione' && (
                        <div className="bg-gray-100 dark:bg-gray-800/60 p-0.5 rounded-lg border border-gray-200 dark:border-violet-500/20 flex">
                          {(['oraria', 'giornaliera', 'mensile'] as DistributionView[]).map((view) => (
                            <button key={view} onClick={() => setDistributionView(view)} className={cn('rounded-md px-2 py-1 text-[11px] font-medium transition-all', distributionView === view ? 'bg-white dark:bg-[#161622] text-violet-600 dark:text-violet-400 shadow-sm' : 'text-gray-500 dark:text-gray-400')}>
                              {view.charAt(0).toUpperCase() + view.slice(1)}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Equity Chart */}
                    {chartView === 'equity' && (
                      <div className="rounded-xl border border-gray-200 dark:border-violet-500/15 bg-white dark:bg-[#161622] p-4">
                        <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                          <TrendingUp className="h-3.5 w-3.5 text-violet-500" /> Curva Equity
                        </p>
                        <div className="h-[280px]">
                          <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                            <AreaChart data={equityChartData} margin={{ top: 5, right: 5, left: -15, bottom: 5 }}>
                              <defs>
                                <linearGradient id={`colorEquityStrat-${strategia.id}`} x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor={borderColor} stopOpacity={0.3} />
                                  <stop offset="95%" stopColor={borderColor} stopOpacity={0} />
                                </linearGradient>
                              </defs>
                              <CartesianGrid strokeDasharray="3 3" stroke="rgba(139, 92, 246, 0.08)" vertical={false} />
                              <XAxis dataKey="date" tick={{ fill: '#8b8b9f', fontSize: 10 }} axisLine={{ stroke: 'rgba(139, 92, 246, 0.1)' }} tickLine={false} />
                              <YAxis tick={{ fill: '#8b8b9f', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => Math.abs(v) >= 1000 ? `€${(v / 1000).toFixed(0)}K` : `€${v}`} />
                              <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: theme === 'dark' ? '#a78bfa' : '#8b5cf6' }} formatter={(value: any) => [formatValuta(Number(value) || 0), 'Equity']} labelFormatter={(l) => `Data: ${l}`} />
                              <ReferenceLine y={0} stroke="rgba(139, 92, 246, 0.3)" strokeDasharray="3 3" />
                              <Area type="monotone" dataKey="equity" stroke={borderColor} strokeWidth={2.5} fillOpacity={1} fill={`url(#colorEquityStrat-${strategia.id})`} animationDuration={1200} />
                            </AreaChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    )}

                    {/* Distribution Chart */}
                    {chartView === 'distribuzione' && (
                      <div className="rounded-xl border border-gray-200 dark:border-violet-500/15 bg-white dark:bg-[#161622] p-4">
                        <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                          <BarChart2 className="h-3.5 w-3.5 text-violet-500" /> Distribuzione — {distributionView}
                        </p>
                        <div className="h-[280px]">
                          <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                            <BarChart data={distributionData} margin={{ top: 5, right: 5, left: -15, bottom: 5 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="rgba(139, 92, 246, 0.08)" vertical={false} />
                              <XAxis dataKey="label" tick={{ fill: '#8b8b9f', fontSize: 10 }} axisLine={{ stroke: 'rgba(139, 92, 246, 0.1)' }} tickLine={false} />
                              <YAxis tick={{ fill: '#8b8b9f', fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} />
                              <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: theme === 'dark' ? '#a78bfa' : '#8b5cf6' }} formatter={(value: any) => [`${value} trade`, 'Frequenza']} />
                              <Bar dataKey="trades" radius={[6, 6, 0, 0]} animationDuration={800}>
                                {distributionData.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={entry.trades > 0 ? borderColor : 'rgba(139, 92, 246, 0.1)'} fillOpacity={0.7 + (entry.trades / Math.max(...distributionData.map(d => d.trades), 1)) * 0.3} />
                                ))}
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    )}
                  </>
                )}

                {/* Aderenza Media Regole */}
                <PlaybookAderenzaMediaCard strategiaId={strategia.id} operazioni={operazioni} />
              </div>

              {/* ═══ COLONNA DESTRA — Metriche ═══ */}
              <div className="w-[280px] shrink-0 space-y-2.5">
                {/* P&L Totale — Hero card */}
                <div className={cn(
                  'rounded-xl p-4 border',
                  performanceData.totalPnl >= 0
                    ? 'bg-gradient-to-br from-green-50 to-emerald-50/50 dark:from-green-500/10 dark:to-emerald-500/5 border-green-200 dark:border-green-500/20'
                    : 'bg-gradient-to-br from-red-50 to-rose-50/50 dark:from-red-500/10 dark:to-rose-500/5 border-red-200 dark:border-red-500/20'
                )}>
                  <p className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">P&L Totale</p>
                  <p className={cn('text-2xl font-bold tracking-tight', performanceData.totalPnl >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400')}>
                    {formatValuta(performanceData.totalPnl)}
                  </p>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">{operazioni.length} operazioni totali</p>
                </div>

                {/* Metriche griglia compatta */}
                {[
                  { label: 'Win Rate', value: `${winRate.toFixed(1)}%`, positive: winRate >= 50, icon: <Percent className="h-3 w-3" /> },
                  { label: 'Profit Factor', value: profitFactor.toFixed(2), positive: profitFactor >= 1, icon: <TrendingUp className="h-3 w-3" /> },
                  { label: 'R:R Medio', value: performanceData.rrCount > 0 ? performanceData.avgRR.toFixed(2) : 'N/A', positive: performanceData.avgRR >= 1, icon: <Target className="h-3 w-3" /> },
                  { label: 'Expectancy', value: formatValuta(performanceData.expectancy), positive: performanceData.expectancy >= 0, icon: <DollarSign className="h-3 w-3" /> },
                ].map((stat, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 rounded-xl border border-gray-200 dark:border-violet-500/15 bg-white dark:bg-[#161622]">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-400 dark:text-gray-500">{stat.icon}</span>
                      <span className="text-xs font-medium text-gray-500 dark:text-gray-400">{stat.label}</span>
                    </div>
                    <span className={cn('text-sm font-bold tracking-tight tabular-nums', stat.positive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400')}>
                      {stat.value}
                    </span>
                  </div>
                ))}

                {/* Separatore */}
                <div className="border-t border-gray-100 dark:border-violet-500/10 my-1" />

                {/* Media Win/Loss */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2.5 rounded-xl border border-gray-200 dark:border-violet-500/15 bg-white dark:bg-[#161622]">
                    <p className="text-[10px] font-medium text-gray-400 dark:text-gray-500 mb-1">Media Win</p>
                    <p className="text-sm font-bold text-green-600 dark:text-green-400 tracking-tight">{formatValuta(performanceData.avgWin)}</p>
                  </div>
                  <div className="p-2.5 rounded-xl border border-gray-200 dark:border-violet-500/15 bg-white dark:bg-[#161622]">
                    <p className="text-[10px] font-medium text-gray-400 dark:text-gray-500 mb-1">Media Loss</p>
                    <p className="text-sm font-bold text-red-600 dark:text-red-400 tracking-tight">{formatValuta(performanceData.avgLoss)}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2.5 rounded-xl border border-gray-200 dark:border-violet-500/15 bg-white dark:bg-[#161622]">
                    <p className="text-[10px] font-medium text-gray-400 dark:text-gray-500 mb-1">Best Trade</p>
                    <p className={cn('text-sm font-bold tracking-tight', performanceData.bestTrade >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400')}>{formatValuta(performanceData.bestTrade)}</p>
                  </div>
                  <div className="p-2.5 rounded-xl border border-gray-200 dark:border-violet-500/15 bg-white dark:bg-[#161622]">
                    <p className="text-[10px] font-medium text-gray-400 dark:text-gray-500 mb-1">Worst Trade</p>
                    <p className={cn('text-sm font-bold tracking-tight', performanceData.worstTrade >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400')}>{formatValuta(performanceData.worstTrade)}</p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Empty state */
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
                      onScreenshotToStrategy={handleAddScreenshot}
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
            TAB DESCRIZIONE — Rich Text Editor
            ═══════════════════════════════════════════════════════════ */}
        <TabsContent value="description" className="px-6 py-5 space-y-5">
          {/* Info strip compatta */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-50 dark:bg-[#161622]/80 border border-gray-200 dark:border-violet-500/15">
              <div className="h-4 w-4 rounded-md border border-gray-200 dark:border-violet-500/30" style={{ backgroundColor: borderColor }} />
              <span className="text-xs font-bold text-gray-600 dark:text-gray-300">{strategia.nome}</span>
            </div>
            <Badge variant="outline" className={cn('text-xs font-bold', strategia.attiva ? 'border-green-200 text-green-700 bg-green-50 dark:bg-green-500/10 dark:text-green-400 dark:border-green-500/20' : 'border-gray-200 text-gray-500 dark:border-gray-600 dark:text-gray-400')}>
              {strategia.attiva ? 'Attiva' : 'Inattiva'}
            </Badge>
            {strategia.rischio_max_importo && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20">
                <DollarSign className="h-3 w-3 text-amber-600 dark:text-amber-400" />
                <span className="text-xs font-bold text-amber-700 dark:text-amber-400">Max {formatValuta(strategia.rischio_max_importo)}</span>
              </div>
            )}
            {strategia.rischio_max_percentuale && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20">
                <Percent className="h-3 w-3 text-amber-600 dark:text-amber-400" />
                <span className="text-xs font-bold text-amber-700 dark:text-amber-400">Max {strategia.rischio_max_percentuale}%</span>
              </div>
            )}
          </div>

          {/* Sommario breve (solo se presente) */}
          {strategia.descrizione && (
            <div className="px-4 py-3 rounded-xl bg-violet-50/50 dark:bg-violet-500/5 border border-violet-100 dark:border-violet-500/10">
              <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{strategia.descrizione}</p>
            </div>
          )}

          {/* Rich Text Editor */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <FileText className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                Documento Strategia
              </h3>
              <div className="flex items-center gap-2">
                {descriptionSaved && (
                  <motion.span initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="flex items-center gap-1 text-xs font-bold text-green-600 dark:text-green-400">
                    <Check className="h-3.5 w-3.5" /> Salvato
                  </motion.span>
                )}
                {editingDescription ? (
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" onClick={() => { setEditingDescription(false); setDescriptionText(strategia.descrizione_dettagliata || ''); }} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 h-8 text-xs px-3">
                      Annulla
                    </Button>
                    <Button size="sm" onClick={handleSaveDescription} disabled={savingDescription} className="h-8 bg-violet-600 hover:bg-violet-700 text-white border-0 font-bold text-xs px-4">
                      <Save className="h-3.5 w-3.5 mr-1.5" />
                      {savingDescription ? 'Salvataggio...' : 'Salva'}
                    </Button>
                  </div>
                ) : (
                  <Button variant="outline" size="sm" onClick={() => setEditingDescription(true)} className="h-8 text-xs px-3 border-gray-200 dark:border-violet-500/30 hover:border-violet-400 text-gray-600 dark:text-gray-300">
                    <Edit2 className="h-3.5 w-3.5 mr-1.5" />
                    Modifica
                  </Button>
                )}
              </div>
            </div>

            {editingDescription ? (
              <RichTextEditor
                content={descriptionText}
                onChange={setDescriptionText}
                placeholder="Descrivi la tua strategia in dettaglio... Setup, condizioni di mercato, timeframe, indicatori, logica entry/exit, gestione del rischio..."
                editable={true}
                minHeight="300px"
              />
            ) : descriptionText && descriptionText !== '<p></p>' ? (
              <div
                className="rounded-xl border border-gray-200 dark:border-violet-500/20 bg-white dark:bg-[#161622] p-5 cursor-pointer hover:border-violet-300 dark:hover:border-violet-500/30 transition-colors"
                onClick={() => setEditingDescription(true)}
                title="Clicca per modificare"
              >
                <RichTextViewer content={descriptionText} />
              </div>
            ) : (
              <div
                className="rounded-xl border-2 border-dashed border-gray-200 dark:border-violet-500/15 bg-gray-50/50 dark:bg-[#161622]/50 p-8 text-center cursor-pointer hover:border-violet-300 dark:hover:border-violet-500/30 transition-all"
                onClick={() => setEditingDescription(true)}
              >
                <FileText className="h-10 w-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Clicca per creare il documento della strategia</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Usa titoli, liste, immagini e formattazione per strutturare il tuo playbook</p>
              </div>
            )}
          </div>

          {/* ─── Screenshot Gallery ─── */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Camera className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                Immagini dal Grafico
                {screenshots.length > 0 && (
                  <Badge variant="outline" className="text-[10px] font-bold border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400">
                    {screenshots.length}
                  </Badge>
                )}
              </h3>
              <div className="flex items-center gap-2">
                {screenshotsSaved && (
                  <motion.span initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="flex items-center gap-1 text-xs font-bold text-green-600 dark:text-green-400">
                    <Check className="h-3.5 w-3.5" /> Salvato
                  </motion.span>
                )}
                {savingScreenshots && (
                  <span className="text-xs text-gray-400 animate-pulse">Salvataggio...</span>
                )}
              </div>
            </div>

            {screenshots.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {screenshots.map((shot) => {
                  const isEditing = editingScreenshot === shot.id;
                  return (
                    <motion.div
                      key={shot.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="rounded-xl border border-gray-200 dark:border-violet-500/15 bg-white dark:bg-[#161622] overflow-hidden group"
                    >
                      {/* Screenshot image */}
                      <div className="relative aspect-video bg-gray-100 dark:bg-[#0e0e1a] overflow-hidden">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={shot.imageData} alt={`${shot.asset} ${shot.data}`} className="w-full h-full object-contain" />
                        {/* Overlay actions */}
                        <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => {
                              const link = document.createElement('a');
                              link.download = `chart-${shot.asset}-${shot.data}.png`;
                              link.href = shot.imageData;
                              link.click();
                            }}
                            className="p-1.5 rounded-lg bg-black/50 text-white hover:bg-black/70 transition-colors"
                            title="Scarica"
                          >
                            <Download className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteScreenshot(shot.id)}
                            className="p-1.5 rounded-lg bg-red-500/80 text-white hover:bg-red-600 transition-colors"
                            title="Elimina"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Metadata */}
                      <div className="p-3 space-y-2">
                        {isEditing ? (
                          <>
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase">Data</label>
                                <Input
                                  value={shot.data}
                                  onChange={(e) => handleUpdateScreenshotMeta(shot.id, 'data', e.target.value)}
                                  className="h-7 text-xs border-gray-200 dark:border-violet-500/30 bg-white dark:bg-[#161622]"
                                />
                              </div>
                              <div>
                                <label className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase">Asset</label>
                                <Input
                                  value={shot.asset}
                                  onChange={(e) => handleUpdateScreenshotMeta(shot.id, 'asset', e.target.value)}
                                  className="h-7 text-xs border-gray-200 dark:border-violet-500/30 bg-white dark:bg-[#161622]"
                                />
                              </div>
                              <div>
                                <label className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase">Entrata</label>
                                <Input
                                  value={shot.entrata}
                                  onChange={(e) => handleUpdateScreenshotMeta(shot.id, 'entrata', e.target.value)}
                                  className="h-7 text-xs border-gray-200 dark:border-violet-500/30 bg-white dark:bg-[#161622]"
                                />
                              </div>
                              <div>
                                <label className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase">Uscita</label>
                                <Input
                                  value={shot.uscita}
                                  onChange={(e) => handleUpdateScreenshotMeta(shot.id, 'uscita', e.target.value)}
                                  className="h-7 text-xs border-gray-200 dark:border-violet-500/30 bg-white dark:bg-[#161622]"
                                />
                              </div>
                            </div>
                            <div className="flex justify-end gap-2 pt-1">
                              <Button variant="ghost" size="sm" onClick={() => setEditingScreenshot(null)} className="h-7 text-xs text-gray-400">
                                Annulla
                              </Button>
                              <Button size="sm" onClick={() => handleSaveScreenshotMeta(shot.id)} className="h-7 text-xs bg-violet-600 hover:bg-violet-700 text-white border-0 font-bold px-3">
                                <Save className="h-3 w-3 mr-1" /> Salva
                              </Button>
                            </div>
                          </>
                        ) : (
                          <div
                            className="flex items-center justify-between cursor-pointer hover:bg-gray-50 dark:hover:bg-violet-500/5 -mx-3 -my-2 p-3 rounded-b-xl transition-colors"
                            onClick={() => setEditingScreenshot(shot.id)}
                            title="Clicca per modificare i dettagli"
                          >
                            <div className="flex items-center gap-3 flex-wrap">
                              <span className="text-xs font-bold text-gray-900 dark:text-white">{shot.asset}</span>
                              <Badge variant="outline" className={cn('text-[10px] px-1.5 py-0 font-bold', shot.direzione === 'LONG' ? 'bg-green-50 text-green-700 border-green-200 dark:bg-green-500/10 dark:text-green-400 dark:border-green-500/20' : 'bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20')}>
                                {shot.direzione}
                              </Badge>
                              <span className="text-[10px] text-gray-400 dark:text-gray-500">{shot.data}</span>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                              <span>E: {shot.entrata ? `$${parseFloat(shot.entrata).toFixed(2)}` : '-'}</span>
                              <span>U: {shot.uscita ? `$${parseFloat(shot.uscita).toFixed(2)}` : '-'}</span>
                              <Edit2 className="h-3 w-3 text-gray-300 dark:text-gray-600" />
                            </div>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-xl border-2 border-dashed border-gray-200 dark:border-violet-500/15 bg-gray-50/50 dark:bg-[#161622]/50 p-6 text-center">
                <ImageIcon className="h-8 w-8 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Nessuno screenshot</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                  Vai nella tab Operazioni, seleziona un trade e clicca <Camera className="h-3 w-3 inline-block mx-0.5" /> per catturare il grafico
                </p>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* No more export modal — direct export with screenshots */}
    </div>
  );
}

// ─── Aderenza Media Card (nel tab Performance) ─────────────────────────
function PlaybookAderenzaMediaCard({ strategiaId, operazioni }: { strategiaId: string; operazioni: any[] }) {
  const [aderenzaMedia, setAderenzaMedia] = React.useState<number | null>(null);
  const [aderenzaLoading, setAderenzaLoading] = React.useState(true);
  const [aderenzaDettagli, setAderenzaDettagli] = React.useState<{ totOp: number; opConAderenza: number }>({ totOp: 0, opConAderenza: 0 });

  React.useEffect(() => {
    const fetchMedia = async () => {
      setAderenzaLoading(true);
      try {
        const supabase = (await import('@/utils/supabase/client')).createClient();
        // Fetch regole della strategia
        const { data: regole } = await (supabase as any).from('regole_strategia').select('id').eq('strategia_id', strategiaId);
        if (!regole || regole.length === 0) { setAderenzaMedia(null); setAderenzaLoading(false); return; }
        const regolaIds = new Set(regole.map((r: any) => r.id));
        const totalRegole = regole.length;

        // Per ogni operazione, calcola percentuale aderenza
        const percentuali: number[] = [];
        for (const op of operazioni) {
          const { data: conf } = await (supabase as any).from('conformita_regole').select('regola_id, rispettata').eq('operazione_id', op.id);
          if (conf && conf.length > 0) {
            const relevantConf = conf.filter((c: any) => regolaIds.has(c.regola_id));
            if (relevantConf.length > 0) {
              const rispettate = relevantConf.filter((c: any) => c.rispettata).length;
              percentuali.push(Math.round((rispettate / totalRegole) * 100));
            }
          }
        }

        if (percentuali.length > 0) {
          setAderenzaMedia(Math.round(percentuali.reduce((s, v) => s + v, 0) / percentuali.length));
          setAderenzaDettagli({ totOp: operazioni.length, opConAderenza: percentuali.length });
        } else {
          setAderenzaMedia(null);
        }
      } catch (err) {
        console.error('Errore calcolo aderenza media:', err);
      } finally {
        setAderenzaLoading(false);
      }
    };
    if (operazioni.length > 0 && strategiaId) fetchMedia();
    else { setAderenzaMedia(null); setAderenzaLoading(false); }
  }, [strategiaId, operazioni]);

  if (aderenzaLoading) {
    return (
      <Card className="border-gray-200 dark:border-violet-500/15 bg-white dark:bg-[#161622]">
        <CardContent className="p-4 text-center">
          <p className="text-xs text-gray-400 animate-pulse">Calcolo aderenza media...</p>
        </CardContent>
      </Card>
    );
  }

  if (aderenzaMedia === null) return null;

  const pctColor = aderenzaMedia >= 80 ? 'text-emerald-600 dark:text-emerald-400' : aderenzaMedia >= 50 ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400';
  const barColor = aderenzaMedia >= 80 ? 'bg-emerald-500' : aderenzaMedia >= 50 ? 'bg-amber-500' : 'bg-red-500';
  const bgGlow = aderenzaMedia >= 80 ? 'from-emerald-500/5 to-transparent' : aderenzaMedia >= 50 ? 'from-amber-500/5 to-transparent' : 'from-red-500/5 to-transparent';

  return (
    <Card className="border-gray-200 dark:border-violet-500/15 bg-white dark:bg-[#161622] overflow-hidden">
      <div className={`absolute inset-0 bg-gradient-to-br ${bgGlow} pointer-events-none`} />
      <CardContent className="p-4 relative">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-violet-600 dark:text-violet-400" />
            <span className="text-sm font-bold text-gray-900 dark:text-white">Aderenza Media alle Regole</span>
          </div>
          <div className="flex items-center gap-2">
            <span className={cn('text-2xl font-bold tabular-nums', pctColor)}>
              {aderenzaMedia}%
            </span>
          </div>
        </div>
        <div className="w-full h-2.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden mb-2">
          <div
            className={cn('h-full rounded-full transition-all duration-700', barColor)}
            style={{ width: `${aderenzaMedia}%` }}
          />
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Basato su {aderenzaDettagli.opConAderenza} operazioni con aderenza registrata su {aderenzaDettagli.totOp} totali
        </p>
      </CardContent>
    </Card>
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
