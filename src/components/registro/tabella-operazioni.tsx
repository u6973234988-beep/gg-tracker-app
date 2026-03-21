'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { formatValuta, formatData, cn } from '@/lib/utils';
import { Edit2, Trash2, ChevronDown, ChevronUp, BarChart2, Check, Minus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import type { OperazioneConDettagli } from '@/hooks/useOperazioni';

interface TabellaOperazioniProps {
  operazioni: OperazioneConDettagli[];
  onEdit?: (operazione: OperazioneConDettagli) => void;
  onDelete?: (id: string) => Promise<void>;
  isLoading?: boolean;
  selectedIds?: Set<string>;
  onSelectionChange?: (ids: Set<string>) => void;
}

export function TabellaOperazioni({
  operazioni,
  onEdit,
  onDelete,
  isLoading = false,
  selectedIds,
  onSelectionChange,
}: TabellaOperazioniProps) {
  const router = useRouter();
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const itemsPerPage = 20;

  const selectionEnabled = !!onSelectionChange;
  const selected = selectedIds || new Set<string>();

  const toggleExpand = (id: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedRows(newExpanded);
  };

  const toggleSelect = (id: string) => {
    if (!onSelectionChange) return;
    const newSelected = new Set(selected);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    onSelectionChange(newSelected);
  };

  const toggleSelectAll = () => {
    if (!onSelectionChange) return;
    const pageIds = paginatedOperazioni.map((op) => op.id);
    const allSelected = pageIds.every((id) => selected.has(id));
    const newSelected = new Set(selected);
    if (allSelected) {
      pageIds.forEach((id) => newSelected.delete(id));
    } else {
      pageIds.forEach((id) => newSelected.add(id));
    }
    onSelectionChange(newSelected);
  };

  if (isLoading) {
    return (
      <Card>
        <div className="p-6 space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-12 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
          ))}
        </div>
      </Card>
    );
  }

  if (operazioni.length === 0) {
    return (
      <Card>
        <div className="p-12 text-center">
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            Nessuna operazione trovata. Aggiungi la tua prima operazione!
          </p>
        </div>
      </Card>
    );
  }

  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedOperazioni = operazioni.slice(startIndex, endIndex);
  const totalPages = Math.ceil(operazioni.length / itemsPerPage);

  const pageIds = paginatedOperazioni.map((op) => op.id);
  const allPageSelected = pageIds.length > 0 && pageIds.every((id) => selected.has(id));
  const somePageSelected = pageIds.some((id) => selected.has(id)) && !allPageSelected;

  return (
    <div className="space-y-4">
      <Card>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  {selectionEnabled ? (
                    <button
                      onClick={toggleSelectAll}
                      className={cn(
                        'flex items-center justify-center w-5 h-5 rounded border-2 transition-all duration-200',
                        allPageSelected
                          ? 'bg-violet-500 border-violet-500 text-white shadow-sm shadow-violet-500/30'
                          : somePageSelected
                            ? 'bg-violet-500/30 border-violet-400 text-white'
                            : 'border-gray-300 dark:border-gray-600 hover:border-violet-400 dark:hover:border-violet-400'
                      )}
                    >
                      {allPageSelected ? (
                        <Check className="w-3 h-3" />
                      ) : somePageSelected ? (
                        <Minus className="w-3 h-3" />
                      ) : null}
                    </button>
                  ) : null}
                </TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Ticker</TableHead>
                <TableHead>Direzione</TableHead>
                <TableHead>Entrata</TableHead>
                <TableHead>Uscita</TableHead>
                <TableHead>Quantità</TableHead>
                <TableHead>P&L</TableHead>
                <TableHead>Strategia</TableHead>
                <TableHead className="text-right">Azioni</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <AnimatePresence>
                {paginatedOperazioni.map((op, idx) => {
                  const pnl = op.pnl || 0;
                  const isPositive = pnl >= 0;
                  const isLong = op.direzione === 'LONG';
                  const isExpanded = expandedRows.has(op.id);
                  const isSelected = selected.has(op.id);

                  return (
                    <motion.tr
                      key={op.id}
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ delay: idx * 0.05 }}
                      className={cn(
                        'border-b border-gray-100 dark:border-[#1e1e2e] transition-colors',
                        isSelected
                          ? 'bg-violet-50/60 dark:bg-violet-500/10 hover:bg-violet-100/60 dark:hover:bg-violet-500/15'
                          : 'hover:bg-gray-50 dark:hover:bg-[#1e1e2e]/50'
                      )}
                    >
                      <TableCell>
                        {selectionEnabled ? (
                          <button
                            onClick={() => toggleSelect(op.id)}
                            className={cn(
                              'flex items-center justify-center w-5 h-5 rounded border-2 transition-all duration-200',
                              isSelected
                                ? 'bg-violet-500 border-violet-500 text-white shadow-sm shadow-violet-500/30 scale-105'
                                : 'border-gray-300 dark:border-gray-600 hover:border-violet-400 dark:hover:border-violet-400 hover:scale-105'
                            )}
                          >
                            {isSelected && <Check className="w-3 h-3" />}
                          </button>
                        ) : (
                          <button
                            onClick={() => toggleExpand(op.id)}
                            className="p-1 hover:bg-gray-100 dark:hover:bg-[#2a2a3e] rounded"
                          >
                            {isExpanded ? (
                              <ChevronUp className="w-4 h-4" />
                            ) : (
                              <ChevronDown className="w-4 h-4" />
                            )}
                          </button>
                        )}
                      </TableCell>
                      <TableCell className="font-medium">
                        {formatData(op.data)}
                      </TableCell>
                      <TableCell className="font-mono font-semibold">
                        {op.ticker}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={isLong ? 'success' : 'destructive'}
                          className="w-fit"
                        >
                          {isLong ? 'LONG' : 'SHORT'}
                        </Badge>
                      </TableCell>
                      <TableCell>{op.prezzo_entrata.toFixed(2)}</TableCell>
                      <TableCell>{op.prezzo_uscita?.toFixed(2) || '-'}</TableCell>
                      <TableCell>{op.quantita.toFixed(2)}</TableCell>
                      <TableCell>
                        <span
                          className={cn(
                            'font-semibold',
                            isPositive ? 'text-emerald-400' : 'text-red-400'
                          )}
                        >
                          {isPositive ? '+' : ''}{formatValuta(pnl)}
                        </span>
                      </TableCell>
                      <TableCell>
                        {op.strategia ? (
                          <Badge
                            variant="secondary"
                            style={{
                              backgroundColor: op.strategia.colore
                                ? `${op.strategia.colore}20`
                                : undefined,
                              color: op.strategia.colore || undefined,
                            }}
                          >
                            {op.strategia.nome}
                          </Badge>
                        ) : (
                          <span className="text-gray-500">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-2 justify-end">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => router.push(`/analisi/${op.id}`)}
                            className="text-violet-600 hover:text-violet-800 dark:text-violet-400 dark:hover:text-violet-300"
                            title="Analisi"
                          >
                            <BarChart2 className="w-4 h-4" />
                          </Button>
                          {onEdit && (
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => onEdit(op)}
                            >
                              <Edit2 className="w-4 h-4" />
                            </Button>
                          )}
                          {onDelete && (
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={async () => {
                                if (
                                  window.confirm(
                                    'Sei sicuro di voler eliminare questa operazione?'
                                  )
                                ) {
                                  setDeletingId(op.id);
                                  try {
                                    await onDelete(op.id);
                                  } finally {
                                    setDeletingId(null);
                                  }
                                }
                              }}
                              disabled={deletingId === op.id}
                              className="text-red-400 hover:text-red-300"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </motion.tr>
                  );
                })}
              </AnimatePresence>

              {/* Expanded Details */}
              {paginatedOperazioni.map((op) => {
                if (!expandedRows.has(op.id)) return null;

                return (
                  <motion.tr
                    key={`${op.id}-expanded`}
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="border-b border-gray-100 dark:border-[#1e1e2e] bg-gray-50 dark:bg-[#0a0a12]"
                  >
                    <TableCell colSpan={10}>
                      <div className="p-4 space-y-3">
                        {op.note && (
                          <div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Note</p>
                            <p className="text-sm text-gray-800 dark:text-white">{op.note}</p>
                          </div>
                        )}

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">P&L %</p>
                            <p className={cn(
                              'font-semibold',
                              (op.pnl_percentuale || 0) >= 0
                                ? 'text-emerald-400'
                                : 'text-red-400'
                            )}>
                              {(op.pnl_percentuale || 0).toFixed(2)}%
                            </p>
                          </div>

                          <div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Commissione</p>
                            <p className="text-gray-800 dark:text-white">{formatValuta(op.commissione)}</p>
                          </div>

                          <div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Stato</p>
                            <Badge variant="secondary" className="w-fit">
                              {op.stato}
                            </Badge>
                          </div>

                          <div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Broker</p>
                            <p className="text-gray-800 dark:text-white">{op.broker || 'N/A'}</p>
                          </div>
                        </div>

                        {op.tags && op.tags.length > 0 && (
                          <div>
                            <p className="text-xs text-gray-400 mb-2">Tag</p>
                            <div className="flex flex-wrap gap-2">
                              {op.tags.map((tag) => (
                                <Badge key={tag.id} variant="outline">
                                  {tag.nome}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </TableCell>
                  </motion.tr>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Mostrando {startIndex + 1} a {Math.min(endIndex, operazioni.length)} di{' '}
            {operazioni.length} operazioni
          </p>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              Precedente
            </Button>
            <div className="px-3 py-1 rounded bg-gray-100 dark:bg-[#1e1e2e] text-sm flex items-center text-gray-700 dark:text-white">
              {currentPage} / {totalPages}
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              Successivo
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
