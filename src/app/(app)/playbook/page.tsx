'use client';

import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Plus,
  Loader,
  Grid3x3,
  List,
  Search,
  BookOpen,
  SlidersHorizontal,
  ArrowLeft,
  TrendingUp,
  BarChart2,
  Sparkles,
  ArrowUp,
} from 'lucide-react';
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
  const [isPageLoaded, setIsPageLoaded] = useState(false);

  React.useEffect(() => {
    const timer = setTimeout(() => setIsPageLoaded(true), 100);
    return () => clearTimeout(timer);
  }, []);

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
  const sortLabel = sortType === 'name' ? 'Nome' : sortType === 'trades' ? 'Operazioni' : 'Win Rate';

  // ─── Vista dettaglio ─────────────────────────────────────────────
  if (selectedStrategiaDetail) {
    return (
      <div className="min-h-screen relative">
        {/* Header */}
        <header className="sticky top-0 z-30 backdrop-blur-xl bg-white/95 dark:bg-[#0a0a0f]/90 border-b border-gray-200/80 dark:border-violet-500/20 shadow-sm">
          <div className="w-full max-w-[98%] mx-auto py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-violet-100 dark:bg-violet-500/20">
                <BookOpen className="h-4 w-4 text-violet-600 dark:text-violet-400" />
              </div>
              <h1 className="text-lg font-bold tracking-tight text-gray-900 dark:text-white">
                Trading Playbook
              </h1>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                onClick={handleBackFromDetail}
                className="border-gray-200 dark:border-violet-500/30 hover:border-violet-400 text-gray-700 dark:text-gray-300 font-medium"
                size="sm"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Torna alle Strategie
              </Button>
              <Button
                className="bg-violet-600 hover:bg-violet-700 text-white border-0 shadow-lg shadow-violet-500/25 font-bold"
                onClick={handleCreateNew}
                size="sm"
              >
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                Nuovo Playbook
              </Button>
            </div>
          </div>
        </header>

        <main className="w-full max-w-[98%] mx-auto py-6 relative">
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="relative overflow-hidden rounded-xl bg-white dark:bg-[#1e1e30] border border-gray-200 dark:border-violet-500/20 shadow-lg dark:shadow-violet-500/5"
          >
            <div className="relative z-10 w-full px-0">
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
            </div>
          </motion.div>

          {/* Loading overlay */}
          {!isPageLoaded && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-50/80 dark:bg-[#0a0a0f]/80 backdrop-blur-sm rounded-xl z-20">
              <div className="flex flex-col items-center">
                <div className="h-12 w-12 rounded-full border-3 border-violet-500 border-t-transparent animate-spin" />
                <span className="mt-3 text-sm font-bold text-gray-700 dark:text-violet-300">
                  Caricamento playbook...
                </span>
              </div>
            </div>
          )}
        </main>

        {/* Footer */}
        <footer className="mt-auto border-t border-gray-200/80 dark:border-violet-500/20 bg-gray-50/80 dark:bg-[#161622]/80 backdrop-blur-sm py-3">
          <div className="w-full max-w-[98%] mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-gray-500 dark:text-gray-400 font-medium">
            <div>Trading Playbook &bull; Gestisci le tue strategie di trading in modo efficace</div>
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1">
                <BookOpen className="h-3 w-3" /> {strategie.length} Strategie
              </span>
              <span className="flex items-center gap-1">
                <TrendingUp className="h-3 w-3" /> {totalOperazioni} Operazioni
              </span>
            </div>
          </div>
        </footer>

        <DialogStrategia
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          onSave={handleSaveStrategia}
          strategiaEdit={strategiaEdit}
          onEditSave={handleEditSaveStrategia}
          isLoading={isLoading}
        />
      </div>
    );
  }

  // ─── Vista lista strategie ────────────────────────────────────────
  return (
    <div className="min-h-screen relative">
      {/* Header sticky */}
      <header className="sticky top-0 z-30 backdrop-blur-xl bg-white/95 dark:bg-[#0a0a0f]/90 border-b border-gray-200/80 dark:border-violet-500/20 shadow-sm">
        <div className="w-full max-w-[98%] mx-auto py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-violet-100 dark:bg-violet-500/20">
              <BookOpen className="h-4 w-4 text-violet-600 dark:text-violet-400" />
            </div>
            <h1 className="text-lg font-bold tracking-tight text-gray-900 dark:text-white">
              Trading Playbook
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <Button
              className="bg-violet-600 hover:bg-violet-700 text-white border-0 shadow-lg shadow-violet-500/25 font-bold"
              onClick={handleCreateNew}
              size="sm"
            >
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Nuovo Playbook
            </Button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="w-full max-w-[98%] mx-auto py-6 relative">
        <div className="space-y-6">
          {/* Search bar and filters */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-[#1e1e30] rounded-xl p-5 border border-gray-200 dark:border-violet-500/20 shadow-sm dark:shadow-violet-500/5 transition-all duration-300"
          >
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4 w-full md:w-auto">
                {/* View mode toggle */}
                <div className="bg-gray-100 dark:bg-gray-800/60 p-1 rounded-lg border border-gray-200 dark:border-violet-500/20 flex">
                  <button
                    onClick={() => setViewType('list')}
                    className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-all duration-200 ${
                      viewType === 'list'
                        ? 'bg-white dark:bg-[#161622] text-violet-600 dark:text-violet-400 shadow-sm'
                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                    }`}
                  >
                    <List className="h-3.5 w-3.5" />
                    Lista
                  </button>
                  <button
                    onClick={() => setViewType('grid')}
                    className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-all duration-200 ${
                      viewType === 'grid'
                        ? 'bg-white dark:bg-[#161622] text-violet-600 dark:text-violet-400 shadow-sm'
                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                    }`}
                  >
                    <Grid3x3 className="h-3.5 w-3.5" />
                    Griglia
                  </button>
                </div>

                {/* Search input */}
                <div className="relative flex-1 min-w-[250px] max-w-md group">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400 dark:text-violet-400 group-focus-within:text-violet-600 dark:group-focus-within:text-violet-300 transition-colors duration-200" />
                  <Input
                    placeholder="Cerca playbook..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 h-10 shadow-sm group-focus-within:shadow-md transition-all border-gray-200 dark:border-violet-500/30 focus:border-violet-400 bg-white dark:bg-[#161622] focus:ring-2 focus:ring-violet-500/10 text-gray-900 dark:text-white placeholder:text-gray-400"
                  />
                </div>
              </div>

              <div className="flex gap-3 w-full md:w-auto">
                {/* Sort dropdown */}
                <div className="flex items-center gap-2">
                  <select
                    value={sortType}
                    onChange={(e) => setSortType(e.target.value as SortType)}
                    className="px-3 py-2 bg-white dark:bg-[#161622] border border-gray-200 dark:border-violet-500/30 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium focus:border-violet-400 focus:ring-2 focus:ring-violet-500/10 outline-none hover:border-violet-300 transition-colors"
                  >
                    <option value="name">Nome</option>
                    <option value="trades">Operazioni</option>
                    <option value="winrate">Win Rate</option>
                  </select>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')}
                    className="border-gray-200 dark:border-violet-500/30 hover:border-violet-400 bg-white dark:bg-[#161622] text-gray-700 dark:text-gray-300 font-medium"
                  >
                    <SlidersHorizontal className="mr-2 h-4 w-4" />
                    {sortLabel} {sortDirection === 'asc' ? '↑' : '↓'}
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Error Message */}
          {errore && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-xl text-red-700 dark:text-red-400 text-sm font-medium"
            >
              Errore: {errore}
            </motion.div>
          )}

          {/* Loading State */}
          {isLoading && !strategie.length ? (
            <div className="flex items-center justify-center py-24">
              <div className="text-center space-y-4">
                <Loader className="h-10 w-10 animate-spin text-violet-600 dark:text-violet-400 mx-auto" />
                <p className="text-gray-500 dark:text-gray-400 font-medium">Caricamento strategie...</p>
              </div>
            </div>
          ) : filteredAndSortedStrategie.length === 0 ? (
            /* Empty State */
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white dark:bg-[#1e1e30] rounded-xl border border-gray-200 dark:border-violet-500/20 shadow-lg dark:shadow-violet-500/5 overflow-hidden"
            >
              <div className="flex flex-col items-center justify-center p-12 text-center">
                <div className="relative mb-8">
                  <div className="absolute inset-0 bg-violet-100 dark:bg-violet-900/30 rounded-full blur-2xl" />
                  <div className="relative p-6 rounded-full bg-violet-50 dark:bg-violet-500/10">
                    <BookOpen className="h-16 w-16 text-violet-600 dark:text-violet-400" />
                  </div>
                </div>
                <h3 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white mb-3">
                  {searchTerm ? 'Nessuna Strategia Trovata' : 'Nessun Playbook Creato'}
                </h3>
                <p className="text-gray-500 dark:text-gray-400 mt-1 mb-8 max-w-lg leading-relaxed">
                  {searchTerm
                    ? 'Prova a modificare i termini di ricerca'
                    : 'Crea il tuo primo playbook per iniziare a definire le tue strategie di trading e monitorare le tue performance.'}
                </p>

                {!searchTerm && (
                  <div className="flex flex-col sm:flex-row gap-4">
                    <Button
                      variant="outline"
                      className="border-gray-200 dark:border-violet-500/30 hover:border-violet-400 bg-white dark:bg-[#161622] text-gray-700 dark:text-gray-300 font-medium"
                      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                    >
                      <ArrowUp className="mr-2 h-4 w-4" />
                      Sfoglia Playbook
                    </Button>
                    <Button
                      className="bg-violet-600 hover:bg-violet-700 text-white border-0 shadow-lg shadow-violet-500/25 font-bold"
                      onClick={handleCreateNew}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Crea Nuovo Playbook
                    </Button>
                  </div>
                )}

                {/* Feature cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mt-12 max-w-3xl">
                  {[
                    { icon: BookOpen, title: 'Regole di Trading', desc: 'Definisci le tue regole di ingresso e uscita per ogni strategia' },
                    { icon: BarChart2, title: 'Statistiche Dettagliate', desc: 'Analizza le performance delle tue strategie con grafici interattivi' },
                    { icon: TrendingUp, title: 'Operazioni', desc: 'Visualizza i grafici delle tue operazioni e analizza i risultati' },
                  ].map((feature, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.1 }}
                      className="flex flex-col items-center p-5 bg-gray-50 dark:bg-[#161622] rounded-xl border border-gray-200 dark:border-violet-500/20 hover:shadow-md hover:border-violet-300 dark:hover:border-violet-500/40 transition-all duration-300 group"
                    >
                      <div className="bg-violet-100 dark:bg-violet-500/15 p-3 rounded-xl mb-4 w-12 h-12 flex items-center justify-center group-hover:bg-violet-200 dark:group-hover:bg-violet-500/25 transition-colors duration-300">
                        <feature.icon className="h-6 w-6 text-violet-600 dark:text-violet-400" />
                      </div>
                      <h4 className="text-sm font-bold tracking-tight text-gray-900 dark:text-white mb-2">
                        {feature.title}
                      </h4>
                      <p className="text-xs text-gray-500 dark:text-gray-400 text-center leading-relaxed">{feature.desc}</p>
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.div>
          ) : (
            /* Strategies list/grid */
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white dark:bg-[#1e1e30] rounded-xl border border-gray-200 dark:border-violet-500/20 shadow-lg dark:shadow-violet-500/5 overflow-hidden"
            >
              {/* Section header */}
              <div className="p-5 border-b border-gray-100 dark:border-violet-500/15 bg-gray-50/80 dark:bg-[#161622]/60">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-bold tracking-tight text-gray-900 dark:text-white flex items-center gap-2">
                      <BookOpen className="h-5 w-5 text-violet-600 dark:text-violet-400" />
                      Le Tue Strategie di Trading
                    </h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      Seleziona una strategia per visualizzare o modificare il playbook
                    </p>
                  </div>
                  <div className="text-sm font-bold bg-violet-100 dark:bg-violet-500/15 text-violet-700 dark:text-violet-300 px-3 py-1.5 rounded-lg flex items-center gap-1.5 border border-violet-200/50 dark:border-violet-500/20">
                    <Sparkles className="h-3.5 w-3.5" />
                    {filteredAndSortedStrategie.length} strategie
                  </div>
                </div>
              </div>

              {/* Cards container */}
              <div className="p-5">
                <motion.div
                  layout
                  className={
                    viewType === 'grid'
                      ? 'grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
                      : 'space-y-3'
                  }
                >
                  <AnimatePresence>
                    {filteredAndSortedStrategie.map((strategia, index) => (
                      <motion.div
                        key={strategia.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ delay: index * 0.05, duration: 0.3 }}
                        layoutId={strategia.id}
                      >
                        <CardStrategia
                          strategia={strategia}
                          onClick={() => handleSelectDetail(strategia)}
                          onEdit={handleEditStrategia}
                          onDelete={handleDeleteStrategia}
                          viewMode={viewType}
                        />
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </motion.div>
              </div>
            </motion.div>
          )}
        </div>
      </main>

      {/* Footer con stats */}
      <footer className="mt-auto border-t border-gray-200/80 dark:border-violet-500/20 bg-gray-50/80 dark:bg-[#161622]/80 backdrop-blur-sm py-3">
        <div className="w-full max-w-[98%] mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-gray-500 dark:text-gray-400 font-medium">
          <div>Trading Playbook &bull; Gestisci le tue strategie di trading in modo efficace</div>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <BookOpen className="h-3 w-3" /> {strategie.length} Strategie
            </span>
            <span className="flex items-center gap-1">
              <TrendingUp className="h-3 w-3" /> {totalOperazioni} Operazioni
            </span>
          </div>
        </div>
      </footer>

      <DialogStrategia
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSave={handleSaveStrategia}
        strategiaEdit={strategiaEdit}
        onEditSave={handleEditSaveStrategia}
        isLoading={isLoading}
      />
    </div>
  );
}
