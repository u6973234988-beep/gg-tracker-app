'use client';

import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, Loader, Grid3x3, List, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { CardStrategia } from '@/components/playbook/card-strategia';
import { DialogStrategia } from '@/components/playbook/dialog-strategia';
import { DettaglioStrategia } from '@/components/playbook/dettaglio-strategia';
import { usePlaybook, type StrategiaConDettagli } from '@/hooks/usePlaybook';
import type { Database } from '@/types/database';

type ViewType = 'grid' | 'list';

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

  const filteredStrategie = useMemo(() => {
    return strategie.filter((s) =>
      s.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.descrizione || '').toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [strategie, searchTerm]);

  const handleCreateNew = () => {
    setStrategiaEdit(null);
    setDialogOpen(true);
  };

  const handleEditStrategia = (strategia: StrategiaConDettagli) => {
    setStrategiaEdit(strategia);
    setDialogOpen(true);
  };

  const handleDeleteStrategia = (strategia: StrategiaConDettagli) => {
    if (window.confirm(`Sei sicuro di voler eliminare la strategia "${strategia.nome}"?`)) {
      eliminaStrategia(strategia.id);
    }
  };

  const handleSelectDetail = async (strategia: StrategiaConDettagli) => {
    setSelectedStrategiaDetail(strategia);
    setOperazioniDetail([]);
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
    data: Database['public']['Tables']['strategia']['Insert']
  ) => {
    await creaStrategia(data);
  };

  const handleEditSaveStrategia = async (
    id: string,
    data: Database['public']['Tables']['strategia']['Update']
  ) => {
    await modificaStrategia(id, data);
  };

  if (selectedStrategiaDetail) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="space-y-6"
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
      className="space-y-8"
    >
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">Playbook</h1>
            <p className="text-gray-400">Gestisci le tue strategie di trading e regole</p>
          </div>
          <Button
            onClick={handleCreateNew}
            className="gap-2 bg-[#7F00FF] hover:bg-[#6B00D4]"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Nuova Strategia</span>
          </Button>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
            <Input
              placeholder="Cerca strategie..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-[#12121a] border-[#2a2a3e]"
            />
          </div>

          <div className="flex gap-2 bg-[#1e1e2e] p-1 rounded-md">
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
        </div>
      </div>

      {errore && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 bg-[#FF4757]/10 border border-[#FF4757] rounded text-[#FF4757]"
        >
          Errore: {errore}
        </motion.div>
      )}

      {isLoading && !strategie.length ? (
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <Loader className="h-8 w-8 animate-spin text-[#7F00FF] mx-auto mb-4" />
            <p className="text-gray-400">Caricamento strategie...</p>
          </div>
        </div>
      ) : filteredStrategie.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <Card className="border-dashed border-[#2a2a3e]">
            <CardContent className="flex flex-col items-center justify-center py-20 text-center">
              <div className="h-16 w-16 rounded-lg bg-[#7F00FF]/10 flex items-center justify-center mb-4">
                <Plus className="h-8 w-8 text-[#7F00FF]" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">
                {searchTerm ? 'Nessuna strategia trovata' : 'Nessuna strategia creata'}
              </h3>
              <p className="text-gray-400 max-w-sm mb-6">
                {searchTerm
                  ? 'Prova a modificare i termini di ricerca'
                  : 'Definisci il tuo primo playbook per iniziare a tracciare le tue strategie di trading'}
              </p>
              {!searchTerm && (
                <Button onClick={handleCreateNew} className="bg-[#7F00FF] hover:bg-[#6B00D4]">
                  Crea la tua prima strategia
                </Button>
              )}
            </CardContent>
          </Card>
        </motion.div>
      ) : (
        <motion.div
          layout
          className={
            viewType === 'grid'
              ? 'grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
              : 'space-y-4'
          }
        >
          <AnimatePresence>
            {filteredStrategie.map((strategia, index) => (
              <motion.div
                key={strategia.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ delay: index * 0.05 }}
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
      )}

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
