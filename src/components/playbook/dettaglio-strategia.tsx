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
import { formatValuta } from '@/lib/utils';
import { cn } from '@/lib/cn';
import type { StrategiaConDettagli } from '@/hooks/usePlaybook';

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

const gruppiRegole: Record<string, { label: string; icon: React.ReactNode; color: string; bgColor: string }> = {
  entry: {
    label: 'Regole di Entrata',
    icon: <TrendingUp className="h-4 w-4" />,
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/20',
  },
  exit: {
    label: 'Regole di Uscita',
    icon: <Target className="h-4 w-4" />,
    color: 'text-red-600 dark:text-red-400',
    bgColor: 'bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/20',
  },
  gestione_rischio: {
    label: 'Gestione del Rischio',
    icon: <Shield className="h-4 w-4" />,
    color: 'text-amber-600 dark:text-amber-400',
    bgColor: 'bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/20',
  },
  condizioni_mercato: {
    label: 'Condizioni di Mercato',
    icon: <BarChart2 className="h-4 w-4" />,
    color: 'text-green-600 dark:text-green-400',
    bgColor: 'bg-green-50 dark:bg-green-500/10 border-green-200 dark:border-green-500/20',
  },
};

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
  const [newRuleName, setNewRuleName] = React.useState('');
  const [newRuleType, setNewRuleType] = React.useState<string>('entry');
  const [addingRule, setAddingRule] = React.useState(false);
  const [expandedGroups, setExpandedGroups] = React.useState<Set<string>>(
    new Set(Object.keys(gruppiRegole))
  );
  const [ruleSearchQuery, setRuleSearchQuery] = React.useState('');
  const [ruleFilter, setRuleFilter] = React.useState('');

  const rulesByType = React.useMemo(() => {
    if (!strategia) return {};
    const grouped: Record<string, any[]> = {};
    (strategia.regole || []).forEach((rule) => {
      const gruppo = rule.gruppo || 'entry';
      if (!grouped[gruppo]) grouped[gruppo] = [];
      grouped[gruppo].push(rule);
    });
    return grouped;
  }, [strategia]);

  const filteredRulesByType = React.useMemo(() => {
    const filtered: Record<string, any[]> = {};
    Object.entries(rulesByType).forEach(([tipo, rules]) => {
      if (ruleFilter && tipo !== ruleFilter) return;
      let filteredRules = rules || [];
      if (ruleSearchQuery) {
        const query = ruleSearchQuery.toLowerCase();
        filteredRules = filteredRules.filter((r: any) =>
          r.descrizione.toLowerCase().includes(query)
        );
      }
      if (filteredRules.length > 0) filtered[tipo] = filteredRules;
    });
    return filtered;
  }, [rulesByType, ruleSearchQuery, ruleFilter]);

  const totalRules = (strategia?.regole || []).length;

  if (!strategia) return null;

  const borderColor = strategia.colore || '#7F00FF';
  const opCount = strategia.operazioniCount || 0;
  const winRate = strategia.winRate || 0;
  const profitFactor = strategia.profitFactor || 0;

  const winningTrades = operazioni.filter((op) => (op.pnl || 0) > 0);
  const losingTrades = operazioni.filter((op) => (op.pnl || 0) < 0);
  const totalPnl = operazioni.reduce((sum, op) => sum + (op.pnl || 0), 0);
  const avgWin = winningTrades.length > 0
    ? winningTrades.reduce((sum, op) => sum + (op.pnl || 0), 0) / winningTrades.length : 0;
  const avgLoss = losingTrades.length > 0
    ? Math.abs(losingTrades.reduce((sum, op) => sum + (op.pnl || 0), 0)) / losingTrades.length : 0;
  const expectancy = operazioni.length > 0
    ? operazioni.reduce((sum, op) => sum + (op.pnl || 0), 0) / operazioni.length : 0;
  const bestTrade = operazioni.length > 0 ? Math.max(...operazioni.map((op) => op.pnl || 0)) : 0;
  const worstTrade = operazioni.length > 0 ? Math.min(...operazioni.map((op) => op.pnl || 0)) : 0;

  const toggleGroup = (group: string) => {
    setExpandedGroups((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(group)) newSet.delete(group);
      else newSet.add(group);
      return newSet;
    });
  };

  const handleAddRule = async () => {
    if (!newRuleName.trim()) return;
    setAddingRule(true);
    try {
      await onAddRule(strategia.id, { descrizione: newRuleName, gruppo: newRuleType });
      setNewRuleName('');
    } finally {
      setAddingRule(false);
    }
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
      <Tabs defaultValue="rules" className="w-full">
        <div className="px-6 pt-4 border-b border-gray-100 dark:border-violet-500/15">
          <TabsList className="bg-gray-100 dark:bg-gray-800/60 p-1 border border-gray-200 dark:border-violet-500/20">
            <TabsTrigger value="rules" className="data-[state=active]:bg-white dark:data-[state=active]:bg-[#161622] data-[state=active]:shadow-sm data-[state=active]:text-violet-600 dark:data-[state=active]:text-violet-400 font-medium">
              <BookOpen className="h-4 w-4 mr-2" />Regole ({totalRules})
            </TabsTrigger>
            <TabsTrigger value="performance" className="data-[state=active]:bg-white dark:data-[state=active]:bg-[#161622] data-[state=active]:shadow-sm data-[state=active]:text-violet-600 dark:data-[state=active]:text-violet-400 font-medium">
              <BarChart2 className="h-4 w-4 mr-2" />Performance
            </TabsTrigger>
            <TabsTrigger value="trades" className="data-[state=active]:bg-white dark:data-[state=active]:bg-[#161622] data-[state=active]:shadow-sm data-[state=active]:text-violet-600 dark:data-[state=active]:text-violet-400 font-medium">
              <Activity className="h-4 w-4 mr-2" />Operazioni ({operazioni.length})
            </TabsTrigger>
            <TabsTrigger value="description" className="data-[state=active]:bg-white dark:data-[state=active]:bg-[#161622] data-[state=active]:shadow-sm data-[state=active]:text-violet-600 dark:data-[state=active]:text-violet-400 font-medium">
              <Edit2 className="h-4 w-4 mr-2" />Descrizione
            </TabsTrigger>
          </TabsList>
        </div>

        {/* TAB REGOLE */}
        <TabsContent value="rules" className="px-6 py-5 space-y-5">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400 dark:text-violet-400" />
              <Input placeholder="Cerca nelle regole..." value={ruleSearchQuery} onChange={(e) => setRuleSearchQuery(e.target.value)} className="pl-10 border-gray-200 dark:border-violet-500/30 bg-white dark:bg-[#161622] text-gray-900 dark:text-white focus:ring-2 focus:ring-violet-500/10" />
            </div>
            <select value={ruleFilter} onChange={(e) => setRuleFilter(e.target.value)} className="px-3 py-2 bg-white dark:bg-[#161622] border border-gray-200 dark:border-violet-500/30 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium focus:border-violet-400 outline-none">
              <option value="">Tutti i gruppi</option>
              {Object.entries(gruppiRegole).map(([tipo, config]) => (
                <option key={tipo} value={tipo}>{config.label}</option>
              ))}
            </select>
          </div>

          {Object.entries(gruppiRegole).map(([tipo, config]) => {
            const rules = filteredRulesByType[tipo] || [];
            const allRulesInGroup = rulesByType[tipo] || [];
            const isExpanded = expandedGroups.has(tipo);
            if (ruleFilter && tipo !== ruleFilter) return null;

            return (
              <motion.div key={tipo} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl overflow-hidden border border-gray-200 dark:border-violet-500/15">
                <button onClick={() => toggleGroup(tipo)} className="w-full flex items-center justify-between p-4 transition-colors bg-gray-50 dark:bg-[#161622]/60 hover:bg-gray-100 dark:hover:bg-[#161622]">
                  <div className="flex items-center gap-3">
                    <div className={cn('p-2 rounded-lg border', config.bgColor)}>
                      <span className={config.color}>{config.icon}</span>
                    </div>
                    <div className="text-left">
                      <span className="font-bold text-gray-900 dark:text-white">{config.label}</span>
                      <span className="text-sm text-gray-500 dark:text-gray-400 ml-2">({allRulesInGroup.length} regole)</span>
                    </div>
                  </div>
                  {isExpanded ? <ChevronUp className="h-5 w-5 text-gray-400" /> : <ChevronDown className="h-5 w-5 text-gray-400" />}
                </button>
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
                      <div className="p-4 space-y-2 bg-white dark:bg-[#1e1e30]/50">
                        {rules.length > 0 ? rules.map((rule: any, idx: number) => (
                          <motion.div key={rule.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.03 }} className={cn('flex items-center justify-between p-3 rounded-lg border transition-colors hover:shadow-sm', config.bgColor)}>
                            <div className="flex-1">
                              <p className="text-sm font-medium text-gray-800 dark:text-white">{rule.descrizione}</p>
                              {rule.note && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{rule.note}</p>}
                            </div>
                            <Button variant="ghost" size="sm" onClick={() => onDeleteRule(rule.id)} disabled={isLoading} className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 ml-2">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </motion.div>
                        )) : (
                          <p className="text-sm text-gray-400 dark:text-gray-500 py-3 text-center">{ruleSearchQuery ? 'Nessuna regola trovata con questi criteri' : 'Nessuna regola in questa categoria'}</p>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}

          {/* Add rule */}
          <Card className="border-gray-200 dark:border-violet-500/20 bg-gray-50 dark:bg-[#161622]/60">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2 font-bold tracking-tight text-gray-900 dark:text-white">
                <Plus className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                Aggiungi Nuova Regola
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700 dark:text-gray-300">Tipo Regola</label>
                <select value={newRuleType} onChange={(e) => setNewRuleType(e.target.value)} disabled={addingRule} className="w-full px-3 py-2 bg-white dark:bg-[#161622] border border-gray-200 dark:border-violet-500/30 text-gray-900 dark:text-white rounded-lg font-medium focus:border-violet-400 focus:ring-2 focus:ring-violet-500/10 outline-none">
                  {Object.entries(gruppiRegole).map(([tipo, config]) => (
                    <option key={tipo} value={tipo}>{config.label}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700 dark:text-gray-300">Descrizione Regola</label>
                <Input placeholder="Descrivi la regola..." value={newRuleName} onChange={(e) => setNewRuleName(e.target.value)} disabled={addingRule} onKeyDown={(e) => { if (e.key === 'Enter') handleAddRule(); }} className="border-gray-200 dark:border-violet-500/30 bg-white dark:bg-[#161622] text-gray-900 dark:text-white font-medium focus:ring-2 focus:ring-violet-500/10" />
              </div>
              <Button onClick={handleAddRule} disabled={!newRuleName.trim() || addingRule} className="w-full bg-violet-600 hover:bg-violet-700 text-white border-0 shadow-lg shadow-violet-500/25 font-bold">
                <Plus className="h-4 w-4 mr-2" />{addingRule ? 'Aggiungendo...' : 'Aggiungi Regola'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB PERFORMANCE */}
        <TabsContent value="performance" className="px-6 py-5 space-y-5">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'P&L Totale', value: formatValuta(totalPnl), positive: totalPnl >= 0 },
              { label: 'Win Rate', value: `${winRate.toFixed(1)}%`, positive: winRate >= 50 },
              { label: 'Profit Factor', value: profitFactor.toFixed(2), positive: profitFactor >= 1 },
              { label: 'Expectancy', value: formatValuta(expectancy), positive: expectancy >= 0 },
              { label: 'Media Vincita', value: formatValuta(avgWin), positive: true },
              { label: 'Media Perdita', value: formatValuta(avgLoss), positive: false },
              { label: 'Miglior Trade', value: formatValuta(bestTrade), positive: bestTrade >= 0 },
              { label: 'Peggior Trade', value: formatValuta(worstTrade), positive: worstTrade >= 0 },
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

          {opCount > 0 && (
            <Card className="border-gray-200 dark:border-violet-500/15 bg-white dark:bg-[#161622]">
              <CardHeader><CardTitle className="text-base font-bold tracking-tight text-gray-900 dark:text-white">Distribuzione Win/Loss</CardTitle></CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 mb-2">
                  <div className="text-sm text-green-600 dark:text-green-400 font-bold w-16">{winningTrades.length} win</div>
                  <div className="flex-1 h-6 bg-gray-100 dark:bg-gray-800/60 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-green-400 to-green-500 rounded-full transition-all duration-500" style={{ width: `${winRate}%` }} />
                  </div>
                  <div className="text-sm text-red-600 dark:text-red-400 font-bold w-16 text-right">{losingTrades.length} loss</div>
                </div>
                <p className="text-center text-sm text-gray-500 dark:text-gray-400 font-medium">{winRate.toFixed(1)}% tasso di vincita su {operazioni.length} operazioni</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* TAB OPERAZIONI */}
        <TabsContent value="trades" className="px-6 py-5 space-y-3">
          {operazioni && operazioni.length > 0 ? operazioni.map((op: any, idx: number) => (
            <motion.div key={op.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.03 }} className="p-4 bg-white dark:bg-[#161622]/50 rounded-xl border border-gray-200 dark:border-violet-500/15 hover:border-violet-300 dark:hover:border-violet-500/30 hover:shadow-sm transition-all">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <span className="font-bold text-gray-900 dark:text-white text-lg tracking-tight">{op.ticker}</span>
                  <Badge variant="outline" className={op.direzione === 'LONG' ? 'bg-green-50 text-green-700 border-green-200 dark:bg-green-500/10 dark:text-green-400 dark:border-green-500/20 font-bold text-xs' : 'bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20 font-bold text-xs'}>{op.direzione}</Badge>
                </div>
                <span className={cn('text-lg font-bold tracking-tight', (op.pnl || 0) > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400')}>{op.pnl ? formatValuta(op.pnl) : '-'}</span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                <div><span className="text-xs font-medium text-gray-400 dark:text-gray-500">Entrata</span><div className="font-bold text-gray-700 dark:text-gray-300">{op.prezzo_entrata?.toFixed(4)}</div></div>
                <div><span className="text-xs font-medium text-gray-400 dark:text-gray-500">Uscita</span><div className="font-bold text-gray-700 dark:text-gray-300">{op.prezzo_uscita?.toFixed(4) || 'Aperta'}</div></div>
                <div><span className="text-xs font-medium text-gray-400 dark:text-gray-500">Quantità</span><div className="font-bold text-gray-700 dark:text-gray-300">{op.quantita}</div></div>
                <div><span className="text-xs font-medium text-gray-400 dark:text-gray-500">Data</span><div className="font-bold text-gray-700 dark:text-gray-300">{new Date(op.data).toLocaleDateString('it-IT')}</div></div>
              </div>
            </motion.div>
          )) : (
            <Card className="border-gray-200 dark:border-violet-500/15 bg-white dark:bg-[#161622]">
              <CardContent className="py-12 text-center">
                <Activity className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                <p className="text-gray-500 dark:text-gray-400 font-medium">Nessuna operazione chiusa registrata per questa strategia</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* TAB DESCRIZIONE */}
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
