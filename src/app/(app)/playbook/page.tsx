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
        <header className="sticky top-0 z-30 bg-[#1C1C1F] border-b border-[#2D2D32]">
          <div className="w-full max-w-[98%] mx-auto py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-[#46265F]/20">
                <BookOpen className="h-4 w-4 text-[#c4a0e8]" />
              </div>
              <h1 className="text-lg font-bold tracking-tight text-[#F8F8FF]">
                Trading Playbook
              </h1>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                onClick={handleBackFromDetail}
                size="sm"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Torna alle Strategie
              </Button>
              <Button
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
            className="relative overflow-hidden rounded-xl bg-[#1C1C1F] border border-[#2D2D32]"
          >
            <div className="relative z-10 w-full px-0">
              <DettaglioStrategia
                strategia={selectedStrategiaDetail}
                operazioni={operazioniDetail}
                onBack={handleBackFromDetail}
                onEdit={handleEditStrategia}
                onEditSave={handleEditSaveStrategia}
                onAddRule={handleAddRule}
                onDeleteRule={handleDeleteRule}
                onDelete={handleDeleteStrategia}
                isLoading={isLoading}
              />
            </div>
          </motion.div>

          {/* Loading overlay */}
          {!isPageLoaded && (
            <div className="absolute inset-0 flex items-center justify-center bg-[#0F0F11]/80 rounded-xl z-20">
              <div className="flex flex-col items-center">
                <div className="h-12 w-12 rounded-full border-2 border-[#6A3D8F] border-t-transparent animate-spin" />
                <span className="mt-3 text-sm font-bold text-[#c4a0e8]">
                  Caricamento playbook...
                </span>
              </div>
            </div>
          )}
        </main>

        {/* Footer */}
        <footer className="mt-auto border-t border-[#2D2D32] bg-[#0F0F11] py-3">
          <div className="w-full max-w-[98%] mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-[#80808A] font-medium">
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
      <header className="sticky top-0 z-30 bg-[#1C1C1F] border-b border-[#2D2D32]">
        <div className="w-full max-w-[98%] mx-auto py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[#46265F]/20">
              <BookOpen className="h-4 w-4 text-[#c4a0e8]" />
            </div>
            <h1 className="text-lg font-bold tracking-tight text-[#F8F8FF]">
              Trading Playbook
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <Button
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
            className="bg-[#1C1C1F] rounded-xl p-5 border border-[#2D2D32] transition-all duration-300"
          >
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4 w-full md:w-auto">
                {/* View mode toggle */}
                <div className="bg-[#0F0F11] p-1 rounded-lg border border-[#2D2D32] flex">
                  <button
                    onClick={() => setViewType('list')}
                    className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-all duration-200 ${
                      viewType === 'list'
                        ? 'bg-[#46265F] text-[#F8F8FF]'
                        : 'text-[#80808A] hover:text-[#c4a0e8]'
                    }`}
                  >
                    <List className="h-3.5 w-3.5" />
                    Lista
                  </button>
                  <button
                    onClick={() => setViewType('grid')}
                    className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-all duration-200 ${
                      viewType === 'grid'
                        ? 'bg-[#46265F] text-[#F8F8FF]'
                        : 'text-[#80808A] hover:text-[#c4a0e8]'
                    }`}
                  >
                    <Grid3x3 className="h-3.5 w-3.5" />
                    Griglia
                  </button>
                </div>

                {/* Search input */}
                <div className="relative flex-1 min-w-[250px] max-w-md group">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-[#80808A] group-focus-within:text-[#c4a0e8] transition-colors duration-200" />
                  <Input
                    placeholder="Cerca playbook..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 h-10"
                  />
                </div>
              </div>

              <div className="flex gap-3 w-full md:w-auto">
                {/* Sort dropdown */}
                <div className="flex items-center gap-2">
                  <select
                    value={sortType}
                    onChange={(e) => setSortType(e.target.value as SortType)}
                    className="px-3 py-2 bg-[#1C1C1F] border border-[#2D2D32] text-[#F8F8FF] rounded-lg text-sm font-medium focus:border-[#6A3D8F] focus:outline-none focus:ring-2 focus:ring-[#6A3D8F]/20 transition-colors"
                  >
                    <option value="name">Nome</option>
                    <option value="trades">Operazioni</option>
                    <option value="winrate">Win Rate</option>
                  </select>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')}
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
              className="p-4 bg-[#DC2626]/10 border border-[#DC2626]/30 rounded-xl text-[#DC2626] text-sm font-medium"
            >
              Errore: {errore}
            </motion.div>
          )}

          {/* Loading State */}
          {isLoading && !strategie.length ? (
            <div className="flex items-center justify-center py-24">
              <div className="text-center space-y-4">
                <Loader className="h-10 w-10 animate-spin text-[#6A3D8F] mx-auto" />
                <p className="text-[#80808A] font-medium">Caricamento strategie...</p>
              </div>
            </div>
          ) : filteredAndSortedStrategie.length === 0 ? (
            /* Empty State */
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-[#1C1C1F] rounded-xl border border-[#2D2D32] overflow-hidden"
            >
              <div className="flex flex-col items-center justify-center p-12 text-center">
                <div className="relative mb-8">
                  <div className="relative p-6 rounded-full bg-[#46265F]/10">
                    <BookOpen className="h-16 w-16 text-[#c4a0e8]" />
                  </div>
                </div>
                <h3 className="text-2xl font-bold tracking-tight text-[#F8F8FF] mb-3">
                  {searchTerm ? 'Nessuna Strategia Trovata' : 'Nessun Playbook Creato'}
                </h3>
                <p className="text-[#80808A] mt-1 mb-8 max-w-lg leading-relaxed">
                  {searchTerm
                    ? 'Prova a modificare i termini di ricerca'
                    : 'Crea il tuo primo playbook per iniziare a definire le tue strategie di trading e monitorare le tue performance.'}
                </p>

                {!searchTerm && (
                  <div className="flex flex-col sm:flex-row gap-4">
                    <Button
                      variant="outline"
                      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                    >
                      <ArrowUp className="mr-2 h-4 w-4" />
                      Sfoglia Playbook
                    </Button>
                    <Button
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
                      className="flex flex-col items-center p-5 bg-[#0F0F11] rounded-xl border border-[#2D2D32] hover:border-[#6A3D8F]/40 transition-all duration-300 group"
                    >
                      <div className="bg-[#46265F]/15 p-3 rounded-xl mb-4 w-12 h-12 flex items-center justify-center group-hover:bg-[#46265F]/25 transition-colors duration-300">
                        <feature.icon className="h-6 w-6 text-[#c4a0e8]" />
                      </div>
                      <h4 className="text-sm font-bold tracking-tight text-[#F8F8FF] mb-2">
                        {feature.title}
                      </h4>
                      <p className="text-xs text-[#80808A] text-center leading-relaxed">{feature.desc}</p>
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
              className="bg-[#1C1C1F] rounded-xl border border-[#2D2D32] overflow-hidden"
            >
              {/* Section header */}
              <div className="p-5 border-b border-[#2D2D32] bg-[#0F0F11]/60">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-bold tracking-tight text-[#F8F8FF] flex items-center gap-2">
                      <BookOpen className="h-5 w-5 text-[#c4a0e8]" />
                      Le Tue Strategie di Trading
                    </h2>
                    <p className="text-sm text-[#80808A] mt-1">
                      Seleziona una strategia per visualizzare o modificare il playbook
                    </p>
                  </div>
                  <div className="text-sm font-bold bg-[#46265F]/20 text-[#c4a0e8] px-3 py-1.5 rounded-lg flex items-center gap-1.5 border border-[#6A3D8F]/20">
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
      <footer className="mt-auto border-t border-[#2D2D32] bg-[#0F0F11] py-3">
        <div className="w-full max-w-[98%] mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-[#80808A] font-medium">
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
