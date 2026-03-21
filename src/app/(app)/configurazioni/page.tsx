'use client';

import { useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { useTheme } from 'next-themes';
import { toast } from 'sonner';
import { Download, Upload, Trash2, User, Lock, AlertTriangle, DollarSign, Loader } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useImpostazioni } from '@/hooks/useImpostazioni';
import { generateExampleCSV } from '@/lib/csv-parser';

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
    transition: { duration: 0.4, ease: 'easeOut' as const },
  },
};

export default function ConfigurazioniPage() {
  const { profilo, isLoading, isSaving, aggiornaProfilo, importaCSV, esportaCSV, eliminaTuttiDati } =
    useImpostazioni();
  const { theme, setTheme } = useTheme();
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [deleteConfirmationText, setDeleteConfirmationText] = useState('');
  const [importedCount, setImportedCount] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Profilo section state
  const [nomeVisualizzato, setNomeVisualizzato] = useState('');

  // Preferenze Trading section state
  const [capitaleIniziale, setCapitaleIniziale] = useState(10000);
  const [valuta, setValuta] = useState('EUR');

  // Comportamento section state
  const [autoTagging, setAutoTagging] = useState(false);
  const [suggerimentiTag, setSuggerimentiTag] = useState(false);

  // Import section state
  const [selectedBroker, setSelectedBroker] = useState('default');
  const [isImporting, setIsImporting] = useState(false);

  // Carica i dati del profilo
  useEffect(() => {
    if (profilo) {
      setNomeVisualizzato(profilo.nome_visualizzato || '');
      setCapitaleIniziale(profilo.capitale_iniziale || 10000);
      setValuta(profilo.valuta || 'EUR');
    }
  }, [profilo]);

  // Salva il profilo
  const handleSaveProfilo = async () => {
    await aggiornaProfilo({
      nome_visualizzato: nomeVisualizzato,
    });
  };

  // Salva le preferenze trading
  const handleSavePreferenze = async () => {
    await aggiornaProfilo({
      capitale_iniziale: capitaleIniziale,
      valuta: valuta,
    });
  };

  // Salva il comportamento (il tema è gestito localmente da next-themes)
  const handleSaveComportamento = async () => {
    toast.success('Preferenze di comportamento salvate');
  };

  // Gestisce il file upload
  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    try {
      const content = await file.text();
      const count = await importaCSV(content, selectedBroker);
      setImportedCount(count);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      toast.error('Errore nell\'importazione del file');
    } finally {
      setIsImporting(false);
    }
  };

  // Gestisce il drag and drop
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();

    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    setIsImporting(true);
    try {
      const content = await file.text();
      const count = await importaCSV(content, selectedBroker);
      setImportedCount(count);
    } catch (error) {
      toast.error('Errore nell\'importazione del file');
    } finally {
      setIsImporting(false);
    }
  };

  // Scarica il CSV di esempio
  const handleDownloadExample = () => {
    const csv = generateExampleCSV();
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'gg-tracker-esempio.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('File di esempio scaricato');
  };

  // Esporta i dati
  const handleExportCSV = async () => {
    await esportaCSV();
  };

  // Elimina tutti i dati
  const handleDeleteAll = async () => {
    if (deleteConfirmationText !== 'Confermo') {
      toast.error('Testo di conferma non corretto');
      return;
    }
    await eliminaTuttiDati();
    setShowDeleteConfirmation(false);
    setDeleteConfirmationText('');
  };

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="h-12 w-12 rounded-full bg-[#7F00FF] mx-auto mb-4 animate-pulse" />
          <p className="text-gray-500 dark:text-gray-400">Caricamento impostazioni...</p>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      className="space-y-6 p-6 md:p-8"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Header */}
      <motion.div variants={itemVariants} className="mb-8">
        <h1 className="text-4xl font-bold text-gray-800 dark:text-white mb-2">Configurazioni</h1>
        <p className="text-gray-500 dark:text-gray-400">Gestisci il tuo profilo, le preferenze e i tuoi dati</p>
      </motion.div>

      {/* Main Grid: Two columns on md+ screens */}
      <motion.div
        className="grid grid-cols-1 md:grid-cols-2 gap-6"
        variants={containerVariants}
      >
        {/* SEZIONE 1: PROFILO */}
        <motion.div variants={itemVariants}>
          <Card className="shadow-xl border border-violet-200/30 dark:border-violet-500/30 enhanced-card hover:shadow-2xl transition-all duration-300">
            <CardHeader>
              <div className="flex items-center gap-2">
                <User className="h-5 w-5 text-purple-400" />
                <div>
                  <CardTitle>Profilo</CardTitle>
                  <CardDescription>Gestisci le informazioni del tuo profilo</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-800 dark:text-white">Nome visualizzato</label>
                <Input
                  type="text"
                  value={nomeVisualizzato}
                  onChange={(e) => setNomeVisualizzato(e.target.value)}
                  placeholder="Il tuo nome di trading"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-800 dark:text-white">Email</label>
                <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-[#12121a] border border-gray-200 dark:border-[#1e1e2e] rounded-md">
                  {profilo?.email || 'N/A'}
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <Button onClick={handleSaveProfilo} disabled={isSaving} className="futuristic-button">
                  {isSaving ? 'Salvataggio...' : 'Salva Profilo'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* SEZIONE 2: CAPITALE INIZIALE */}
        <motion.div variants={itemVariants}>
          <Card className="shadow-xl border border-violet-200/30 dark:border-violet-500/30 enhanced-card hover:shadow-2xl transition-all duration-300">
            <CardHeader>
              <div className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-purple-400" />
                <div>
                  <CardTitle>Capitale Iniziale</CardTitle>
                  <CardDescription>Imposta il tuo capitale di trading</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-800 dark:text-white">Capitale</label>
                <div className="flex items-center gap-2">
                  <span className="text-gray-500 dark:text-gray-400 font-medium">€</span>
                  <Input
                    type="number"
                    value={capitaleIniziale}
                    onChange={(e) => setCapitaleIniziale(parseFloat(e.target.value))}
                    placeholder="10000"
                    min="0"
                    step="100"
                    className="futuristic-input"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-800 dark:text-white">Valuta</label>
                <select
                  value={valuta}
                  onChange={(e) => setValuta(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-gray-200 dark:border-[#1e1e2e] bg-white dark:bg-[#12121a] px-3 py-2 text-sm text-gray-800 dark:text-white placeholder:text-gray-500 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:ring-opacity-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="EUR">EUR - Euro</option>
                  <option value="USD">USD - Dollaro USA</option>
                  <option value="GBP">GBP - Sterlina</option>
                </select>
              </div>

              <div className="flex justify-end pt-4">
                <Button onClick={handleSavePreferenze} disabled={isSaving} className="futuristic-button">
                  {isSaving ? 'Salvataggio...' : 'Salva'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* SEZIONE 3: COMPORTAMENTO */}
        <motion.div variants={itemVariants}>
          <Card className="shadow-xl border border-violet-200/30 dark:border-violet-500/30 enhanced-card hover:shadow-2xl transition-all duration-300">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Lock className="h-5 w-5 text-purple-400" />
                <div>
                  <CardTitle>Comportamento</CardTitle>
                  <CardDescription>Personalizza l&apos;applicazione</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between py-3 border-b border-gray-100 dark:border-[#1e1e2e]">
                  <div>
                    <p className="text-sm font-medium text-gray-800 dark:text-white">Auto-tagging</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Tag automatici per strategia
                    </p>
                  </div>
                  <Switch checked={autoTagging} onCheckedChange={setAutoTagging} />
                </div>

                <div className="flex items-center justify-between py-3 border-b border-gray-100 dark:border-[#1e1e2e]">
                  <div>
                    <p className="text-sm font-medium text-gray-800 dark:text-white">Suggerimenti Tag</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Durante l&apos;inserimento</p>
                  </div>
                  <Switch checked={suggerimentiTag} onCheckedChange={setSuggerimentiTag} />
                </div>

                <div className="flex items-center justify-between py-3">
                  <div>
                    <p className="text-sm font-medium text-gray-800 dark:text-white">Tema</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Scelta tema</p>
                  </div>
                  <select
                    value={theme}
                    onChange={(e) => setTheme(e.target.value)}
                    className="px-3 py-1 text-sm rounded-md border border-gray-200 dark:border-[#1e1e2e] bg-white dark:bg-[#12121a] text-gray-800 dark:text-white focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:ring-opacity-50"
                  >
                    <option value="light">Chiaro</option>
                    <option value="dark">Scuro</option>
                    <option value="system">Sistema</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <Button onClick={handleSaveComportamento} disabled={isSaving} className="futuristic-button">
                  {isSaving ? 'Salvataggio...' : 'Salva'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* SEZIONE 4: ESPORTA DATI */}
        <motion.div variants={itemVariants}>
          <Card className="shadow-xl border border-violet-200/30 dark:border-violet-500/30 enhanced-card hover:shadow-2xl transition-all duration-300">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Download className="h-5 w-5 text-purple-400" />
                <div>
                  <CardTitle>Esporta Dati</CardTitle>
                  <CardDescription>Scarica i tuoi dati</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button variant="secondary" onClick={handleExportCSV} disabled={isSaving} className="w-full">
                <Download className="h-4 w-4 mr-2" />
                Operazioni in CSV
              </Button>
              <Button variant="secondary" disabled className="w-full">
                <Download className="h-4 w-4 mr-2" />
                Report (presto)
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>

      {/* SEZIONE 5: IMPORTA DATI - Full width */}
      <motion.div variants={itemVariants}>
        <Card className="shadow-xl border border-violet-200/30 dark:border-violet-500/30 enhanced-card hover:shadow-2xl transition-all duration-300">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Upload className="h-5 w-5 text-purple-400" />
              <div>
                <CardTitle>Importa Dati</CardTitle>
                <CardDescription>
                  Importa operazioni da diversi broker in formato CSV
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Broker Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-800 dark:text-white">Seleziona Broker</label>
              <select
                value={selectedBroker}
                onChange={(e) => setSelectedBroker(e.target.value)}
                className="flex h-10 w-full rounded-md border border-gray-200 dark:border-[#1e1e2e] bg-white dark:bg-[#12121a] px-3 py-2 text-sm text-gray-800 dark:text-white placeholder:text-gray-500 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:ring-opacity-50"
              >
                <option value="default">Formato Standard</option>
                <option value="tradezero">TradeZero</option>
                <option value="interactive brokers">Interactive Brokers</option>
                <option value="directa sim">Directa SIM</option>
              </select>
            </div>

            {/* Export Example Section */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-gray-800 dark:text-white">Formato CSV</h3>
              <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-800/50 space-y-2 text-xs text-gray-600 dark:text-gray-300">
                {selectedBroker === 'tradezero' ? (
                  <div>
                    <p className="font-medium text-gray-800 dark:text-white mb-2">TradeZero:</p>
                    <p className="font-mono text-xs">Account | T/D | S/D | Currency | Type | Side | Symbol | Qty | Price | Exec Time | Comm | SEC | TAF | NSCC | Nasdaq | ECN Remove | ECN Add | Gross Proceeds | Net Proceeds | Clr Broker | Liq | Note</p>
                  </div>
                ) : (
                  <div>
                    <p className="font-medium text-gray-800 dark:text-white mb-2">Standard:</p>
                    <p className="font-mono text-xs">date,time,ticker,direction,quantity,entryPrice,exitPrice,commission,strategy,notes,pnl</p>
                  </div>
                )}
              </div>

              <button
                onClick={handleDownloadExample}
                className="text-sm text-purple-400 hover:text-purple-300 transition-colors flex items-center gap-1"
              >
                <Download className="h-4 w-4" />
                Scarica file di esempio
              </button>
            </div>

            <Separator className="bg-gray-200 dark:bg-gray-800" />

            {/* Upload Section */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-800 dark:text-white">Carica File CSV</label>
              <div
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                className="border-2 border-dashed border-purple-500/50 rounded-lg p-8 text-center cursor-pointer hover:border-purple-400 transition-colors bg-purple-500/5"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="flex flex-col items-center gap-2"
                >
                  {isImporting ? (
                    <Loader className="h-8 w-8 text-purple-400 animate-spin" />
                  ) : (
                    <Upload className="h-8 w-8 text-purple-400" />
                  )}
                  <p className="text-sm text-gray-800 dark:text-white font-medium">Trascina il file CSV qui</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">oppure clicca per selezionarlo</p>
                </div>
              </div>
            </div>

            {importedCount > 0 && (
              <div className="mt-4 p-3 bg-emerald-900/20 border border-emerald-600/50 rounded-md">
                <p className="text-sm text-emerald-400">
                  ✓ {importedCount} operazioni importate con successo
                </p>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <Button onClick={() => fileInputRef.current?.click()} disabled={isImporting} className="futuristic-button">
                {isImporting ? (
                  <>
                    <Loader className="h-4 w-4 mr-2 animate-spin" />
                    Importazione...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Importa File
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* SEZIONE 6: ZONA PERICOLOSA */}
      <motion.div variants={itemVariants}>
        <Card className="shadow-xl border border-red-200/30 dark:border-red-500/30 enhanced-card hover:shadow-2xl transition-all duration-300">
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              <div>
                <CardTitle className="text-red-500">Zona Pericolosa</CardTitle>
                <CardDescription>Azioni irreversibili - esegui con cautela</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-3 rounded-lg bg-red-900/10 border border-red-900/30">
              <p className="text-sm text-red-300/80">
                Questa azione eliminerà permanentemente tutte le tue operazioni, strategie, obiettivi e routine. Questa operazione non può essere annullata.
              </p>
            </div>
            <Button
              variant="destructive"
              onClick={() => setShowDeleteConfirmation(true)}
              disabled={isSaving}
              className="w-full"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Elimina tutti i dati
            </Button>
          </CardContent>
        </Card>
      </motion.div>

      {/* DIALOG DI CONFERMA ELIMINAZIONE */}
      <Dialog open={showDeleteConfirmation} onOpenChange={setShowDeleteConfirmation}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-red-500">Elimina tutti i dati</DialogTitle>
            <DialogDescription>
              Stai per eliminare permanentemente tutti i tuoi dati incluse operazioni, strategie,
              obiettivi e routine. Questa azione non può essere annullata. Digita &quot;Confermo&quot; per
              procedere.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input
              placeholder="Digita 'Confermo' per procedere"
              value={deleteConfirmationText}
              onChange={(e) => setDeleteConfirmationText(e.target.value)}
              className="text-sm"
            />
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setShowDeleteConfirmation(false)}>
              Annulla
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteAll}
              disabled={isSaving || deleteConfirmationText !== 'Confermo'}
            >
              Elimina per sempre
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
