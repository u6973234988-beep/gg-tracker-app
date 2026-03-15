'use client';

import { useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { useTheme } from 'next-themes';
import { toast } from 'sonner';
import { Download, Upload, Trash2, User, Settings, Lock, AlertTriangle } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
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

const sectionVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
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
  const [commissioneDefault, setCommissioneDefault] = useState(1.99);
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
      setNomeVisualizzato(profilo.nome_trading || profilo.nome_completo || '');
      setCapitaleIniziale(profilo.account_size || 10000);
      setValuta(profilo.valuta_base || 'EUR');
    }
  }, [profilo]);

  // Salva il profilo
  const handleSaveProfilo = async () => {
    await aggiornaProfilo({
      nome_trading: nomeVisualizzato,
    });
  };

  // Salva le preferenze trading
  const handleSavePreferenze = async () => {
    await aggiornaProfilo({
      account_size: capitaleIniziale,
      valuta_base: valuta,
    });
  };

  // Salva il comportamento
  const handleSaveComportamento = async () => {
    await aggiornaProfilo({
      theme: theme as 'light' | 'dark',
    });
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
          <p className="text-gray-400">Caricamento impostazioni...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 md:p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Configurazioni</h1>
        <p className="text-gray-400">Gestisci il tuo profilo, le preferenze e i tuoi dati</p>
      </div>

      {/* SEZIONE 1: PROFILO */}
      <motion.div variants={sectionVariants} initial="hidden" animate="visible">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <User className="h-5 w-5 text-[#7F00FF]" />
              <div>
                <CardTitle>Profilo</CardTitle>
                <CardDescription>Gestisci le informazioni del tuo profilo</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-white">Nome visualizzato</label>
              <Input
                type="text"
                value={nomeVisualizzato}
                onChange={(e) => setNomeVisualizzato(e.target.value)}
                placeholder="Il tuo nome di trading"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-white">Email</label>
              <div className="px-3 py-2 text-sm text-gray-400 bg-[#12121a] border border-[#1e1e2e] rounded-md">
                {profilo?.email || 'N/A'}
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <Button onClick={handleSaveProfilo} disabled={isSaving}>
                {isSaving ? 'Salvataggio...' : 'Salva Profilo'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* SEZIONE 2: PREFERENZE TRADING */}
      <motion.div
        variants={sectionVariants}
        initial="hidden"
        animate="visible"
        transition={{ delay: 0.1 }}
      >
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-[#7F00FF]" />
              <div>
                <CardTitle>Preferenze Trading</CardTitle>
                <CardDescription>Imposta i tuoi parametri di trading predefiniti</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-white">Capitale Iniziale</label>
                <div className="flex items-center gap-2">
                  <span className="text-gray-400">€</span>
                  <Input
                    type="number"
                    value={capitaleIniziale}
                    onChange={(e) => setCapitaleIniziale(parseFloat(e.target.value))}
                    placeholder="10000"
                    min="0"
                    step="100"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-white">Commissione Default</label>
                <div className="flex items-center gap-2">
                  <span className="text-gray-400">€</span>
                  <Input
                    type="number"
                    value={commissioneDefault}
                    onChange={(e) => setCommissioneDefault(parseFloat(e.target.value))}
                    placeholder="1.99"
                    min="0"
                    step="0.01"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-white">Valuta</label>
                <select
                  value={valuta}
                  onChange={(e) => setValuta(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-[#1e1e2e] bg-[#12121a] px-3 py-2 text-sm text-white placeholder:text-gray-500 focus:border-[#7F00FF] focus:outline-none focus:ring-2 focus:ring-[#7F00FF] focus:ring-opacity-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="EUR">EUR - Euro</option>
                  <option value="USD">USD - Dollaro USA</option>
                  <option value="GBP">GBP - Sterlina</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <Button onClick={handleSavePreferenze} disabled={isSaving}>
                {isSaving ? 'Salvataggio...' : 'Salva Preferenze'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* SEZIONE 3: COMPORTAMENTO */}
      <motion.div
        variants={sectionVariants}
        initial="hidden"
        animate="visible"
        transition={{ delay: 0.2 }}
      >
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Lock className="h-5 w-5 text-[#7F00FF]" />
              <div>
                <CardTitle>Comportamento</CardTitle>
                <CardDescription>Personalizza il comportamento della applicazione</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between py-3 border-b border-[#1e1e2e]">
                <div>
                  <p className="text-sm font-medium text-white">Auto-tagging</p>
                  <p className="text-xs text-gray-400">
                    Assegna automaticamente tag basati sulla strategia
                  </p>
                </div>
                <Switch checked={autoTagging} onCheckedChange={setAutoTagging} />
              </div>

              <div className="flex items-center justify-between py-3 border-b border-[#1e1e2e]">
                <div>
                  <p className="text-sm font-medium text-white">Suggerimenti Tag</p>
                  <p className="text-xs text-gray-400">Mostra suggerimenti di tag durante la fase di inserimento</p>
                </div>
                <Switch checked={suggerimentiTag} onCheckedChange={setSuggerimentiTag} />
              </div>

              <div className="flex items-center justify-between py-3">
                <div>
                  <p className="text-sm font-medium text-white">Tema</p>
                  <p className="text-xs text-gray-400">Scegli il tema della applicazione</p>
                </div>
                <select
                  value={theme}
                  onChange={(e) => setTheme(e.target.value)}
                  className="px-3 py-1 text-sm rounded-md border border-[#1e1e2e] bg-[#12121a] text-white focus:border-[#7F00FF] focus:outline-none focus:ring-2 focus:ring-[#7F00FF] focus:ring-opacity-50"
                >
                  <option value="light">Chiaro</option>
                  <option value="dark">Scuro</option>
                  <option value="system">Sistema</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <Button onClick={handleSaveComportamento} disabled={isSaving}>
                {isSaving ? 'Salvataggio...' : 'Salva'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* SEZIONE 4: IMPORTA DATI */}
      <motion.div
        variants={sectionVariants}
        initial="hidden"
        animate="visible"
        transition={{ delay: 0.3 }}
      >
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Upload className="h-5 w-5 text-[#7F00FF]" />
              <div>
                <CardTitle>Importa Dati</CardTitle>
                <CardDescription>
                  Supportiamo la importazione da diversi broker. Seleziona il tuo broker e carica il file
                  CSV.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-white">Seleziona Broker</label>
              <select
                value={selectedBroker}
                onChange={(e) => setSelectedBroker(e.target.value)}
                className="flex h-10 w-full rounded-md border border-[#1e1e2e] bg-[#12121a] px-3 py-2 text-sm text-white placeholder:text-gray-500 focus:border-[#7F00FF] focus:outline-none focus:ring-2 focus:ring-[#7F00FF] focus:ring-opacity-50"
              >
                <option value="default">Default</option>
                <option value="tradezero">TradeZero</option>
                <option value="interactive brokers">Interactive Brokers</option>
                <option value="directa sim">Directa SIM</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-white">Carica File CSV</label>
              <div
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                className="border-2 border-dashed border-[#7F00FF]/50 rounded-lg p-8 text-center cursor-pointer hover:border-[#7F00FF] transition-colors"
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
                  <Upload className="h-8 w-8 text-[#7F00FF]" />
                  <p className="text-sm text-white font-medium">Trascina il file CSV qui</p>
                  <p className="text-xs text-gray-400">oppure clicca per selezionarlo</p>
                </div>
              </div>
            </div>

            {importedCount > 0 && (
              <div className="mt-4 p-3 bg-green-900/20 border border-green-600/50 rounded-md">
                <p className="text-sm text-green-400">
                  ✓ {importedCount} operazioni importate con successo
                </p>
              </div>
            )}

            <div className="flex justify-between items-center pt-2">
              <button
                onClick={handleDownloadExample}
                className="text-sm text-[#7F00FF] hover:text-[#6B00D4] transition-colors flex items-center gap-1"
              >
                <Download className="h-4 w-4" />
                Scarica esempio CSV
              </button>
              <Button onClick={() => fileInputRef.current?.click()} disabled={isImporting}>
                {isImporting ? 'Importazione...' : 'Importa'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* SEZIONE 5: ESPORTA DATI */}
      <motion.div
        variants={sectionVariants}
        initial="hidden"
        animate="visible"
        transition={{ delay: 0.4 }}
      >
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Download className="h-5 w-5 text-[#7F00FF]" />
              <div>
                <CardTitle>Esporta Dati</CardTitle>
                <CardDescription>Scarica i tuoi dati per il backup o le analisi</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button variant="secondary" onClick={handleExportCSV} disabled={isSaving} className="w-full">
              <Download className="h-4 w-4 mr-2" />
              Esporta tutte le operazioni in CSV
            </Button>
            <Button variant="secondary" disabled className="w-full">
              <Download className="h-4 w-4 mr-2" />
              Esporta report completo (presto disponibile)
            </Button>
          </CardContent>
        </Card>
      </motion.div>

      {/* SEZIONE 6: ZONA PERICOLOSA */}
      <motion.div
        variants={sectionVariants}
        initial="hidden"
        animate="visible"
        transition={{ delay: 0.5 }}
      >
        <Card className="border-red-600/30">
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              <div>
                <CardTitle className="text-red-500">Zona Pericolosa</CardTitle>
                <CardDescription>Azioni irreversibili - esegui con cautela</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-400 mb-4">
              Questa azione eliminerà permanentemente tutte le tue operazioni, strategie, obiettivi e
              routine. Questa operazione non può essere annullata.
            </p>
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
    </div>
  );
}
