'use client';

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useOperazioni } from '@/hooks/useOperazioni';
import { AggiungiOperazioneDialog } from '@/components/registro/aggiungi-operazione-dialog';
import { FiltriRegistro } from '@/components/registro/filtri-registro';
import { TabellaOperazioni } from '@/components/registro/tabella-operazioni';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, TrendingUp, Calendar, Percent } from 'lucide-react';
import { formatValuta, formatPercentuale, stessoGiorno } from '@/lib/utils';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1,
    },
  },
};

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

  // Calculate stats for today
  const todayStats = useMemo(() => {
    const today = new Date();

    const todayOps = operazioni.filter((op) =>
      stessoGiorno(new Date(op.data_apertura), today)
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

  return (
    <motion.div
      className="space-y-8"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Header */}
      <motion.div variants={itemVariants} className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Registro Operazioni</h1>
          <p className="text-gray-400 mt-2">
            Gestisci e traccia tutte le tue operazioni di trading
          </p>
        </div>
        <Badge variant="secondary" className="text-lg px-4 py-2 h-fit">
          {operazioni.length} operazioni
        </Badge>
      </motion.div>

      {/* Stats Bar */}
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
                    <CardTitle className="text-sm font-medium text-gray-300">
                      {stat.title}
                    </CardTitle>
                    <CardDescription className="mt-1">
                      {stat.description}
                    </CardDescription>
                  </div>
                  <div className={`p-2 rounded-lg bg-[#1e1e2e] ${stat.color}`}>
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

      {/* Action Button */}
      <motion.div variants={itemVariants}>
        <Button
          onClick={() => setDialogOpen(true)}
          className="gap-2"
          size="lg"
        >
          <Plus className="w-5 h-5" />
          Nuova Operazione
        </Button>
      </motion.div>

      {/* Tabs */}
      <motion.div variants={itemVariants}>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList>
            <TabsTrigger value="tabella">Tabella</TabsTrigger>
            <TabsTrigger value="calendario">Calendario</TabsTrigger>
          </TabsList>

          {/* Tabella Tab */}
          <TabsContent value="tabella" className="space-y-4 mt-4">
            {/* Filters */}
            <motion.div variants={itemVariants}>
              <FiltriRegistro
                filtri={filtri}
                onFiltriChange={setFiltri}
                onReset={resetFiltri}
              />
            </motion.div>

            {/* Table */}
            <motion.div variants={itemVariants}>
              <TabellaOperazioni
                operazioni={operazioni}
                onEdit={(op) => {
                  setOperazioneInModifica(op);
                  setDialogOpen(true);
                }}
                onDelete={eliminaOperazione}
                isLoading={isLoading}
              />
            </motion.div>
          </TabsContent>

          {/* Calendario Tab */}
          <TabsContent value="calendario" className="mt-4">
            <motion.div
              variants={itemVariants}
              className="rounded-lg border border-[#1e1e2e] bg-[#12121a]/80 backdrop-blur-md p-12 text-center"
            >
              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-white">
                  Vista Calendario
                </h3>
                <p className="text-gray-400">
                  La visualizzazione calendario è in arrivo. Continua a monitorare le operazioni
                  nella vista tabella.
                </p>
              </div>
            </motion.div>
          </TabsContent>
        </Tabs>
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
    </motion.div>
  );
}
