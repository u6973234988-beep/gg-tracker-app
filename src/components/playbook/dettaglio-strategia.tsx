'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Plus, Trash2, Edit2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { formatValuta, formatPercentuale } from '@/lib/utils';
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

const gruppiRegole = {
  ENTRY: {
    label: 'Regole di Entrata',
    icon: '📈',
    color: 'bg-blue-500/10 border-blue-500/20',
  },
  EXIT: {
    label: 'Regole di Uscita',
    icon: '📉',
    color: 'bg-red-500/10 border-red-500/20',
  },
  STOP: {
    label: 'Gestione del Rischio',
    icon: '🛑',
    color: 'bg-yellow-500/10 border-yellow-500/20',
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
  const [newRuleType, setNewRuleType] = React.useState<'ENTRY' | 'EXIT' | 'STOP'>('ENTRY');
  const [addingRule, setAddingRule] = React.useState(false);

  const rulesByType = React.useMemo(() => {
    if (!strategia) return {};
    const grouped: Record<string, typeof strategia.regole> = {};
    (strategia.regole || []).forEach((rule) => {
      if (!grouped[rule.gruppo]) {
        grouped[rule.gruppo] = [];
      }
      grouped[rule.gruppo]!.push(rule);
    });
    return grouped;
  }, [strategia]);

  if (!strategia) {
    return null;
  }

  const getStatusBadge = () => {
    const operazioni_count = strategia.operazioniCount || 0;
    const winRate = strategia.winRate || 0;
    const profitFactor = strategia.profitFactor || 0;

    if (operazioni_count === 0) {
      return { label: 'Nuova', variant: 'secondary' as const };
    }
    if (profitFactor >= 2 && winRate >= 60) {
      return { label: 'Ottima', variant: 'success' as const };
    }
    if (profitFactor >= 1.2 && winRate >= 45) {
      return { label: 'Media', variant: 'warning' as const };
    }
    return { label: 'Scarsa', variant: 'destructive' as const };
  };

  const status = getStatusBadge();
  const borderColor = strategia.colore || '#7F00FF';

  const handleAddRule = async () => {
    if (!newRuleName.trim()) return;

    setAddingRule(true);
    try {
      await onAddRule(strategia.id, {
        nome: newRuleName,
        tipo: newRuleType,
        descrizione: null,
      });
      setNewRuleName('');
    } finally {
      setAddingRule(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="space-y-6"
    >
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="icon" onClick={onBack} className="h-9 w-9">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{strategia.nome}</h1>
            <Badge variant={status.variant}>{status.label}</Badge>
          </div>
          <p className="text-gray-500 dark:text-gray-400">{strategia.descrizione || 'Nessuna descrizione'}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={() => onEdit(strategia)}>
            <Edit2 className="h-4 w-4 mr-2" />
            Modifica
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => onDelete(strategia)}
            disabled={isLoading}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Elimina
          </Button>
        </div>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Panoramica</TabsTrigger>
          <TabsTrigger value="rules">Regole</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="trades">Operazioni</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <Card className="border-l-4" style={{ borderLeftColor: borderColor }}>
            <CardHeader>
              <CardTitle>Informazioni Strategia</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Colore</p>
                  <div className="flex items-center gap-2">
                    <div
                      className="h-8 w-8 rounded border border-gray-300 dark:border-[#2a2a3e]"
                      style={{ backgroundColor: borderColor }}
                    />
                    <span className="text-gray-800 dark:text-white font-mono text-sm">{borderColor}</span>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Numero Regole</p>
                  <p className="text-gray-900 dark:text-white font-semibold text-lg">{(strategia.regole || []).length}</p>
                </div>
              </div>

              {strategia.descrizione && (
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Descrizione</p>
                  <p className="text-gray-800 dark:text-white bg-gray-50 dark:bg-[#1e1e2e] p-3 rounded">{strategia.descrizione}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rules" className="space-y-6">
          {Object.entries(gruppiRegole).map(([tipo, config]) => {
            const rules = rulesByType[tipo] || [];
            return (
              <Card key={tipo}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <span>{config.icon}</span>
                    {config.label}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {rules.length > 0 ? (
                    <div className="space-y-2">
                      {rules.map((rule) => (
                        <motion.div
                          key={rule.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          className={`flex items-center justify-between p-3 rounded border ${config.color}`}
                        >
                          <div>
                            <p className="text-gray-800 dark:text-white font-medium">{rule.descrizione}</p>
                            {rule.note && (
                              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{rule.note}</p>
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onDeleteRule(rule.id)}
                            disabled={isLoading}
                            className="text-[#FF4757] hover:text-[#FF4757] hover:bg-[#FF4757]/10"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </motion.div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 dark:text-gray-400 text-sm py-2">Nessuna regola aggiunta</p>
                  )}
                </CardContent>
              </Card>
            );
          })}

          <Card className="border-[#7F00FF]/30">
            <CardHeader>
              <CardTitle className="text-base">Aggiungi Nuova Regola</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm text-gray-600 dark:text-gray-400">Tipo Regola</label>
                <select
                  value={newRuleType}
                  onChange={(e) => setNewRuleType(e.target.value as 'ENTRY' | 'EXIT' | 'STOP')}
                  disabled={addingRule}
                  className="w-full px-3 py-2 bg-white dark:bg-[#12121a] border border-gray-300 dark:border-[#2a2a3e] text-gray-900 dark:text-white rounded focus:border-[#7F00FF] focus:ring-2 focus:ring-[#7F00FF]/20 outline-none"
                >
                  {Object.entries(gruppiRegole).map(([tipo, config]) => (
                    <option key={tipo} value={tipo}>
                      {config.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm text-gray-600 dark:text-gray-400">Descrizione Regola</label>
                <Input
                  placeholder="Descrivi la regola..."
                  value={newRuleName}
                  onChange={(e) => setNewRuleName(e.target.value)}
                  disabled={addingRule}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleAddRule();
                    }
                  }}
                  className=""
                />
              </div>

              <Button
                onClick={handleAddRule}
                disabled={!newRuleName.trim() || addingRule}
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-2" />
                Aggiungi Regola
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="space-y-6">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0 }}
            >
              <Card>
                <CardContent className="pt-6">
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Operazioni</p>
                  <p className="text-3xl font-bold text-gray-900 dark:text-white">
                    {strategia.operazioniCount || 0}
                  </p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Card>
                <CardContent className="pt-6">
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Win Rate</p>
                  <p className="text-3xl font-bold text-gray-900 dark:text-white">
                    {formatPercentuale((strategia.winRate || 0) / 100)}
                  </p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Card>
                <CardContent className="pt-6">
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Profit Factor</p>
                  <p className="text-3xl font-bold text-gray-900 dark:text-white">
                    {(strategia.profitFactor || 0).toFixed(2)}
                  </p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Card>
                <CardContent className="pt-6">
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Stato</p>
                  <Badge variant={status.variant} className="text-base py-1 px-2">
                    {status.label}
                  </Badge>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </TabsContent>

        <TabsContent value="trades" className="space-y-6">
          {operazioni && operazioni.length > 0 ? (
            <div className="space-y-2">
              {operazioni.map((op) => (
                <motion.div
                  key={op.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="p-4 bg-gray-50 dark:bg-[#1e1e2e] rounded border border-gray-200 dark:border-[#2a2a3e] hover:border-[#7F00FF]/30 transition-colors"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-gray-900 dark:text-white">{op.ticker}</span>
                    <Badge variant={op.direzione === 'LONG' ? 'success' : 'destructive'}>
                      {op.direzione}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm text-gray-500 dark:text-gray-400 mb-2">
                    <div>
                      <p>Entrata: {op.prezzo_entrata.toFixed(4)}</p>
                      <p>Uscita: {op.prezzo_uscita?.toFixed(4) || 'Aperta'}</p>
                    </div>
                    <div className="text-right">
                      <p>Quantità: {op.quantita}</p>
                      <p
                        className={`font-semibold ${
                          (op.pnl || 0) > 0 ? 'text-[#2ecc71]' : 'text-[#FF4757]'
                        }`}
                      >
                        {op.pnl ? formatValuta(op.pnl) : '-'}
                      </p>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500">
                    {new Date(op.data).toLocaleDateString('it-IT')}
                  </p>
                </motion.div>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="pt-6 text-center text-gray-400">
                <p>Nessuna operazione registrata per questa strategia</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </motion.div>
  );
}
