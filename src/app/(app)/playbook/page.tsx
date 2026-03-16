'use client';

import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Plus, Loader, Grid3x3, List, Search, BookOpen } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { CardStrategia } from '@/components/playbook/card-strategia';
import { DialogStrategia } from '@/components/playbook/dialog-strategia';
import { DettaglioStrategia } from '@/components/playbook/dettaglio-strategia';
import { usePlaybook, type StrategiaConDettagli } from '@/hooks/usePlaybook';
import type { Database } from '@/types/database';

type ViewType = 'grid' | 'list';
type SortType = 'name' | 'trades' | 'winrate';
type SortDirection = 'asc' | 'desc';

export default function PlaybookPage() {
  const {
    strategie,
    isLoading,
    errore,
    creaStrategia,
    modificaStrategia,
    eliminaStrategia,
    aggiungiRegola,
    eliminaRegola,
  } = usePlaybook();

  const [viewType, setViewType] = useState<ViewType>('grid');
  const [searchTerm, setSearchTerm] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedStrategiaDetail, setSelectedStrategiaDetail] = useState<StrategiaConDettagli | null>(null);
  const [strategiaEdit, setStrategiaEdit] = useState<StrategiaConDettagli | null>(null);
  const [operazioniDetail, setOperazioniDetail] = useState<any[]>([]);
  const [sortType, setSortType] = useState<SortType>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const filteredAndSortedStrategie = useMemo(() => {
    let filtered = strategie.filter((s) =>
      s.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.descrizione || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    filtered.sort((a, b) => {
      let compareValue = 0;

      if (sortType === 'name') {
        compareValue = a.nome.localeCompare(b.nome);
      } else if (sortType === 'trades') {
        compareValue = (a.operazioniCount || 0) - (b.operazioniCount || 0);
      } else if (sortType === 'winrate') {
        compareValue = (a.winRate || 0) - (b.winRate || 0);
      }

      return sortDirection === 'asc' ? compareValue : -compareValue;
    });

    return filtered;
  }, [strategie, searchTerm, sortType, sortDirection]);

  const handleCreateNew = () => {
    setStrategiaEdit(null);
    setDialogOpen(true);
  };

  const handleEditStrategia = (strategia: StrategiaConDettagli) => {
    setStrategiaEdit(strategia);
    setDialogOpen(true);
  };

  const handleDeleteStrategia = async (strategia: StrategiaConDettagli) => {
    if (window.confirm(`Sei sicuro di voler eliminare la strategia "${strategia.nome}"?`)) {
      await eliminaStrategia(strategia.id);
      handleBackFromDetail();
    }
  };

  const fetchOperazioniStrategia = async (strategiaId: string) => {
    try {
      const supabase = (await import('@/utils/supabase/client')).createClient();
      const { data, error } = await (supabase as any)
        .from('operazioni')
        .select('*')
        .eq('strategia_id', strategiaId)
        .eq('stato', 'chiusa')
        .order('data', { ascending: false });
      
      if (error) {
        console.error('Errore nel caricamento operazioni:', error);
        return;
      }
      setOperazioniDetail(data || []);
    } catch (error) {
      console.error('Errore:', error);
    }
  };

  const handleSelectDetail = async (strategia: StrategiaConDettagli) => {
    setSelectedStrategiaDetail(strategia);
    setOperazioniDetail([]);
    await fetchOperazioniStrategia(strategia.id);
  };

  const handleBackFromDetail = () => {
    setSelectedStrategiaDetail(null);
    setOperazioniDetail([]);
  };

  const handleAddRule = async (strategiaId: string, regola: any) => {
    await aggiungiRegola(strategiaId, regola);
    if (selectedStrategiaDetail) {
      const updatedStrategia = strategie.find((s) => s.id === strategiaId);
      if (updatedStrategia) {
        setSelectedStrategiaDetail(updatedStrategia);
      }
    }
  };

  const handleDeleteRule = async (regolaId: string) => {
    if (window.confirm('Sei sicuro di voler eliminare questa regola?')) {
      await eliminaRegola(regolaId);
      if (selectedStrategiaDetail) {
        const updatedStrategia = strategie.find((s) => s.id === selectedStrategiaDetail.id);
        if (updatedStrategia) {
          setSelectedStrategiaDetail(updatedStrategia);
        }
      }
    }
  };

  const handleSaveStrategia = async (
    data: Database['public']['Tables']['strategie']['Insert']
  ) => {
    await creaStrategia(data);
  };

  const handleEditSaveStrategia = async (
    id: string,
    data: Database['public']['Tables']['strategie']['Update']
  ) => {
    await modificaStrategia(id, data);
  };

  const totalOperazioni = strategie.reduce((sum, s) => sum + (s.operazioniCount || 0), 0);

  if (selectedStrategiaDetail) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="min-h-screen space-y-6"
      >
        <DettaglioStrategia
          strategia={selectedStrategiaDetail}
          operazioni={operazioniDetail}
          onBack={handleBackFromDetail}
          onEdit={handleEditStrategia}
          onAddRule={handleAddRule}
          onDeleteRule={handleDeleteRule}
          onDelete={handleDeleteStrategia}
          isLoading={isLoading}
        />
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen space-y-6"
    >
      {/* Background decorative elements */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-10 w-72 h-72 bg-[#7F00FF]/5 rounded-full blur-3xl" />
        <div className="absolute top-40 right-10 w-96 h-96 bg-[#00D4FF]/5 rounded-full blur-3xl" />
        <div className="absolute bottom-20 left-1/2 w-80 h-80 bg-[#FF6B9D]/5 rounded-full blur-3xl" />
      </div>

      {/* Sticky Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="sticky top-0 z-40 bg-white/80 dark:bg-[#0A0A0F]/80 backdrop-blur-xl border-b border-gray-200/60 dark:border-[#2a2a3e]/30 py-4 -mx-6 px-6"
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary-100 dark:bg-[#7F00FF]/20 flex items-center justify-center">
              <BookOpen className="h-5 w-5 text-primary-700 dark:text-[#7F00FF]" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-800 dark:text-white">
                <span className="bg-gradient-to-r from-[#7F00FF] via-[#00D4FF] to-[#FF6B9D] bg-clip-text text-transparent">
                  Trading Playbook
                </span>
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button
              onClick={handleCreateNew}
              className="gap-2 bg-gradient-to-r from-[#7F00FF] to-[#6B00D4] hover:from-[#6B00D4] hover:to-[#5A00B8] text-white border-0 shadow-lg shadow-[#7F00FF]/20"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Nuovo Playbook</span>
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto space-y-6">
        {/* View Toggle & Controls */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between"
        >
          <div className="flex gap-2 bg-gray-100/80 dark:bg-[#1e1e2e]/60 backdrop-blur-sm p-1 rounded-lg border border-gray-200 dark:border-[#2a2a3e]/50">
            <Button
              variant={viewType === 'grid' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewType('grid')}
              className="gap-2"
            >
              <Grid3x3 className="h-4 w-4" />
              <span className="hidden sm:inline">Griglia</span>
            </Button>
            <Button
              variant={viewType === 'list' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewType('list')}
              className="gap-2"
            >
              <List className="h-4 w-4" />
              <span className="hidden sm:inline">Lista</span>
            </Button>
          </div>

          <div className="flex gap-2 items-center w-full sm:w-auto">
            <select
              value={sortType}
              onChange={(e) => setSortType(e.target.value as SortType)}
              className="px-3 py-2 bg-gray-100/80 dark:bg-[#1e1e2e]/60 border border-gray-200 dark:border-[#2a2a3e]/50 text-gray-600 dark:text-gray-300 rounded-lg text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none backdrop-blur-sm"
            >
              <option value="name">Nome</option>
              <option value="trades">Trade</option>
              <option value="winrate">Win Rate</option>
            </select>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')}
              className="text-gray-500 dark:text-gray-400 hover:text-white"
              title={sortDirection === 'asc' ? 'Crescente' : 'Decrescente'}
            >
              {sortDirection === 'asc' ? '↑' : '↓'}
            </Button>
          </div>
        </motion.div>

        {/* Search Bar */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="relative"
        >
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-primary-700 dark:text-[#7F00FF]/50" />
          <Input
            placeholder="Cerca strategie per nome o descrizione..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-gray-100/80 dark:bg-[#1e1e2e]/60 border border-gray-200 dark:border-[#2a2a3e]/50 text-gray-800 dark:text-white placeholder-gray-500 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 backdrop-blur-sm"
          />
        </motion.div>

        {/* Error Message */}
        {errore && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 bg-[#FF4757]/10 border border-[#FF4757]/30 rounded-lg text-[#FF4757] text-sm"
          >
            Errore: {errore}
          </motion.div>
        )}

        {/* Loading State */}
        {isLoading && !strategie.length ? (
          <div className="flex items-center justify-center py-24">
            <div className="text-center space-y-4">
              <Loader className="h-10 w-10 animate-spin text-primary-700 dark:text-[#7F00FF] mx-auto" />
              <p className="text-gray-500 dark:text-gray-400">Caricamento strategie...</p>
            </div>
          </div>
        ) : filteredAndSortedStrategie.length === 0 ? (
          /* Empty State */
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="space-y-6"
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                { icon: '📋', title: 'Regole di Trading', desc: 'Definisci entry, exit e stop loss' },
                { icon: '📊', title: 'Statistiche Dettagliate', desc: 'Win rate, profit factor, drawdown' },
                { icon: '📈', title: 'Operazioni', desc: 'Traccia tutti i tuoi trade' },
              ].map((feature, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1 }}
                >
                  <Card className="border border-gray-200 dark:border-[#2a2a3e]/50 bg-white/80 dark:bg-[#1e1e2e]/40 backdrop-blur-sm hover:border-[#7F00FF]/30 transition-colors">
                    <CardContent className="p-6 text-center">
                      <div className="text-4xl mb-3">{feature.icon}</div>
                      <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-2">{feature.title}</h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{feature.desc}</p>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>

            <Card className="border-dashed border-gray-200 dark:border-[#2a2a3e]/50 bg-white/80 dark:bg-[#1e1e2e]/40 backdrop-blur-sm">
              <CardContent className="flex flex-col items-center justify-center py-20 text-center">
                <div className="h-16 w-16 rounded-lg bg-primary-50 dark:bg-[#7F00FF]/10 flex items-center justify-center mb-4">
                  <Plus className="h-8 w-8 text-primary-700 dark:text-[#7F00FF]" />
                </div>
                <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-2">
                  {searchTerm ? 'Nessuna strategia trovata' : 'Nessuna strategia creata'}
                </h3>
                <p className="text-gray-500 dark:text-gray-400 max-w-sm mb-6">
                  {searchTerm
                    ? 'Prova a modificare i termini di ricerca'
                    : 'Crea il tuo primo playbook per iniziare a tracciare le tue strategie di trading'}
                </p>
                {!searchTerm && (
                  <Button
                    onClick={handleCreateNew}
                    className="gap-2 bg-gradient-to-r from-[#7F00FF] to-[#6B00D4] hover:from-[#6B00D4] hover:to-[#5A00B8] text-white border-0 shadow-lg shadow-[#7F00FF]/20"
                  >
                    <Plus className="h-4 w-4" />
                    Crea la tua prima strategia
                  </Button>
                )}
              </CardContent>
            </Card>
          </motion.div>
        ) : (
          /* Strategies Container */
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="border border-gray-200 dark:border-[#2a2a3e]/50 bg-white/80 dark:bg-[#1e1e2e]/40 backdrop-blur-sm overflow-hidden">
              <CardHeader className="border-b border-gray-200 dark:border-[#2a2a3e]/50 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-[#1e1e2e] dark:to-[#1a1a24]">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold text-gray-800 dark:text-white">Le Tue Strategie di Trading</h2>
                  <div className="inline-flex items-center gap-2 bg-primary-50 dark:bg-[#7F00FF]/10 px-3 py-1 rounded-lg border border-[#7F00FF]/20">
                    <span className="text-sm font-semibold text-primary-700 dark:text-[#7F00FF]">
                      {filteredAndSortedStrategie.length}
                    </span>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="p-6">
                <motion.div
                  layout
                  className={
                    viewType === 'grid'
                      ? 'grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
                      : 'space-y-4'
                  }
                >
                  <AnimatePresence>
                    {filteredAndSortedStrategie.map((strategia, index) => (
                      <motion.div
                        key={strategia.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ delay: index * 0.05 }}
                        layoutId={strategia.id}
                      >
                        <CardStrategia
                          strategia={strategia}
                          onClick={() => handleSelectDetail(strategia)}
                          onEdit={handleEditStrategia}
                          onDelete={handleDeleteStrategia}
                        />
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </motion.div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Footer Stats */}
        {strategie.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-4"
          >
            <Card className="border border-gray-200 dark:border-[#2a2a3e]/50 bg-white/80 dark:bg-[#1e1e2e]/40 backdrop-blur-sm">
              <CardContent className="p-4 text-center">
                <p className="text-xs text-gray-500 dark:text-gray-500 mb-1">Strategie Totali</p>
                <p className="text-2xl font-bold text-primary-700 dark:text-[#7F00FF]">{strategie.length}</p>
              </CardContent>
            </Card>

            <Card className="border border-gray-200 dark:border-[#2a2a3e]/50 bg-white/80 dark:bg-[#1e1e2e]/40 backdrop-blur-sm">
              <CardContent className="p-4 text-center">
                <p className="text-xs text-gray-500 dark:text-gray-500 mb-1">Operazioni Totali</p>
                <p className="text-2xl font-bold text-[#00D4FF]">{totalOperazioni}</p>
              </CardContent>
            </Card>

            <Card className="border border-gray-200 dark:border-[#2a2a3e]/50 bg-white/80 dark:bg-[#1e1e2e]/40 backdrop-blur-sm">
              <CardContent className="p-4 text-center">
                <p className="text-xs text-gray-500 dark:text-gray-500 mb-1">Regole Totali</p>
                <p className="text-2xl font-bold text-[#FF6B9D]">
                  {strategie.reduce((sum, s) => sum + (s.regole?.length || 0), 0)}
                </p>
              </CardContent>
            </Card>

            <Card className="border border-gray-200 dark:border-[#2a2a3e]/50 bg-white/80 dark:bg-[#1e1e2e]/40 backdrop-blur-sm">
              <CardContent className="p-4 text-center">
                <p className="text-xs text-gray-500 dark:text-gray-500 mb-1">Win Rate Medio</p>
                <p className="text-2xl font-bold text-[#2ecc71]">
                  {strategie.length > 0
                    ? ((strategie.reduce((sum, s) => sum + (s.winRate || 0), 0) / strategie.length).toFixed(1)) + '%'
                    : '0%'}
                </p>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>

      {/* Dialog */}
      <DialogStrategia
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSave={handleSaveStrategia}
        strategiaEdit={strategiaEdit}
        onEditSave={handleEditSaveStrategia}
        isLoading={isLoading}
      />
    </motion.div>
  );
}
