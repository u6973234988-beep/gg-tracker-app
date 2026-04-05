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
import { formatValuta, formatData, cn } from '@/lib/utils';
import { Edit2, Trash2, ChevronDown, ChevronUp, BarChart2, Check, Minus, ChevronLeft, ChevronRight, Clock, Tag } from 'lucide-react';
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
      <div className="rounded-xl border border-[#2D2D32] bg-[#1C1C1F] overflow-hidden">
        <div className="p-6 space-y-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-4 h-4 rounded bg-[#46265F]/20 animate-pulse" />
              <div className="h-10 flex-1 bg-[#46265F]/10 rounded-lg animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (operazioni.length === 0) {
    return (
      <div className="rounded-xl border border-[#2D2D32] bg-[#1C1C1F] overflow-hidden">
        <div className="p-16 text-center">
          <div className="w-14 h-14 rounded-2xl bg-[#46265F]/10 flex items-center justify-center mx-auto mb-4">
            <BarChart2 className="w-7 h-7 text-[#c4a0e8]" />
          </div>
          <p className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">
            Nessuna operazione trovata
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500">
            Aggiungi la tua prima operazione per iniziare il tracking
          </p>
        </div>
      </div>
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
    <div className="space-y-3">
      <div className="rounded-xl border border-[#2D2D32] bg-[#1C1C1F] overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-[#2D2D32] bg-[#46265F]/10">
                <TableHead className="w-10 pl-3">
                  {selectionEnabled ? (
                    <button
                      onClick={toggleSelectAll}
                      className={cn(
                        'flex items-center justify-center w-[18px] h-[18px] rounded border-2 transition-all duration-200',
                        allPageSelected
                          ? 'bg-[#46265F] border-[#46265F] text-white shadow-sm'
                          : somePageSelected
                            ? 'bg-[#46265F]/30 border-[#6A3D8F] text-white'
                            : 'border-gray-300 dark:border-gray-600 hover:border-[#6A3D8F]'
                      )}
                    >
                      {allPageSelected ? (
                        <Check className="w-2.5 h-2.5" />
                      ) : somePageSelected ? (
                        <Minus className="w-2.5 h-2.5" />
                      ) : null}
                    </button>
                  ) : null}
                </TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-wider text-[#c4a0e8]">Data</TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-wider text-[#c4a0e8]">Ticker</TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-wider text-[#c4a0e8]">Dir.</TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-wider text-[#c4a0e8]">Entrata</TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-wider text-[#c4a0e8]">Uscita</TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-wider text-[#c4a0e8]">Qty</TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-wider text-[#c4a0e8]">P&L</TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-wider text-[#c4a0e8]">Strategia</TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-wider text-[#c4a0e8] text-right pr-3">Azioni</TableHead>
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
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ delay: idx * 0.02 }}
                      className={cn(
                        'border-b border-[#2D2D32]/10 transition-colors group cursor-pointer',
                        isSelected
                          ? 'bg-[#46265F]/10 hover:bg-[#46265F]/15'
                          : 'hover:bg-[#46265F]/10'
                      )}
                      onClick={() => {
                        if (selectionEnabled) toggleSelect(op.id);
                        else toggleExpand(op.id);
                      }}
                    >
                      <TableCell className="pl-3">
                        {selectionEnabled ? (
                          <button
                            onClick={(e) => { e.stopPropagation(); toggleSelect(op.id); }}
                            className={cn(
                              'flex items-center justify-center w-[18px] h-[18px] rounded border-2 transition-all duration-200',
                              isSelected
                                ? 'bg-[#46265F] border-[#46265F] text-white shadow-sm'
                                : 'border-gray-300 dark:border-gray-600 group-hover:border-[#6A3D8F]'
                            )}
                          >
                            {isSelected && <Check className="w-2.5 h-2.5" />}
                          </button>
                        ) : (
                          <div className={cn(
                            'w-5 h-5 rounded flex items-center justify-center transition-colors',
                            isExpanded ? 'bg-[#46265F]/20' : 'opacity-0 group-hover:opacity-100'
                          )}>
                            {isExpanded ? (
                              <ChevronUp className="w-3 h-3 text-[#c4a0e8]" />
                            ) : (
                              <ChevronDown className="w-3 h-3 text-[#c4a0e8]" />
                            )}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-xs font-medium text-gray-600 dark:text-gray-300">
                        {formatData(op.data)}
                      </TableCell>
                      <TableCell className="font-mono font-bold text-xs text-[#F8F8FF]">
                        {op.ticker}
                      </TableCell>
                      <TableCell>
                        <span className={cn(
                          'inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider',
                          isLong
                            ? 'bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                            : 'bg-red-100 dark:bg-red-500/10 text-red-700 dark:text-red-400'
                        )}>
                          {isLong ? 'L' : 'S'}
                        </span>
                      </TableCell>
                      <TableCell className="font-mono text-xs text-gray-600 dark:text-gray-400">{op.prezzo_entrata.toFixed(2)}</TableCell>
                      <TableCell className="font-mono text-xs text-gray-600 dark:text-gray-400">{op.prezzo_uscita?.toFixed(2) || '—'}</TableCell>
                      <TableCell className="font-mono text-xs text-gray-600 dark:text-gray-400">{op.quantita}</TableCell>
                      <TableCell>
                        <span
                          className={cn(
                            'font-mono text-xs font-bold',
                            isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
                          )}
                        >
                          {isPositive ? '+' : ''}{formatValuta(pnl)}
                        </span>
                      </TableCell>
                      <TableCell>
                        {op.strategia ? (
                          <span
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold"
                            style={{
                              backgroundColor: op.strategia.colore
                                ? `${op.strategia.colore}15`
                                : 'rgba(70, 38, 95, 0.08)',
                              color: op.strategia.colore || '#6A3D8F',
                            }}
                          >
                            <div
                              className="w-1.5 h-1.5 rounded-full"
                              style={{ backgroundColor: op.strategia.colore || '#6A3D8F' }}
                            />
                            {op.strategia.nome}
                          </span>
                        ) : (
                          <span className="text-[10px] text-gray-400 dark:text-gray-600">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right pr-3">
                        <div className="flex gap-0.5 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={(e) => { e.stopPropagation(); router.push(`/analisi/${op.id}`); }}
                            className="h-7 w-7 text-[#c4a0e8] hover:text-[#c4a0e8] hover:bg-[#46265F]/10"
                            title="Analisi"
                          >
                            <BarChart2 className="w-3.5 h-3.5" />
                          </Button>
                          {onEdit && (
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={(e) => { e.stopPropagation(); onEdit(op); }}
                              className="h-7 w-7 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800/50"
                              title="Modifica"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </Button>
                          )}
                          {onDelete && (
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={async (e) => {
                                e.stopPropagation();
                                if (window.confirm('Sei sicuro di voler eliminare questa operazione?')) {
                                  setDeletingId(op.id);
                                  try { await onDelete(op.id); } finally { setDeletingId(null); }
                                }
                              }}
                              disabled={deletingId === op.id}
                              className="h-7 w-7 text-red-400 hover:text-red-600 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-500/10"
                              title="Elimina"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
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
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="border-b border-[#2D2D32]/10"
                  >
                    <TableCell colSpan={10} className="p-0">
                      <div className="px-4 py-3 bg-[#46265F]/5 border-l-2 border-[#6A3D8F]/30 ml-3">
                        {/* Row 1: Key metrics */}
                        <div className="flex flex-wrap items-center gap-4 mb-2">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-medium text-gray-400 dark:text-gray-500 uppercase">P&L %</span>
                            <span className={cn(
                              'text-xs font-bold',
                              (op.pnl_percentuale || 0) >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
                            )}>
                              {(op.pnl_percentuale || 0).toFixed(2)}%
                            </span>
                          </div>
                          <div className="w-px h-3 bg-gray-200 dark:bg-gray-700" />
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-medium text-gray-400 dark:text-gray-500 uppercase">Comm.</span>
                            <span className="text-xs font-medium text-gray-600 dark:text-gray-300">{formatValuta(op.commissione)}</span>
                          </div>
                          <div className="w-px h-3 bg-gray-200 dark:bg-gray-700" />
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-medium text-gray-400 dark:text-gray-500 uppercase">Stato</span>
                            <Badge variant="outline" className="text-[10px] h-4 px-1.5 bg-[#46265F]/5 border-[#6A3D8F]/20 text-[#c4a0e8]">
                              {op.stato}
                            </Badge>
                          </div>
                          {op.broker && (
                            <>
                              <div className="w-px h-3 bg-gray-200 dark:bg-gray-700" />
                              <div className="flex items-center gap-1.5">
                                <span className="text-[10px] font-medium text-gray-400 dark:text-gray-500 uppercase">Broker</span>
                                <span className="text-xs font-medium text-gray-600 dark:text-gray-300">{op.broker}</span>
                              </div>
                            </>
                          )}
                          {(op.ora_entrata || op.ora_uscita) && (
                            <>
                              <div className="w-px h-3 bg-gray-200 dark:bg-gray-700" />
                              <div className="flex items-center gap-1.5">
                                <Clock className="w-3 h-3 text-gray-400" />
                                <span className="text-xs text-gray-500 dark:text-gray-400">
                                  {op.ora_entrata || '—'} → {op.ora_uscita || '—'}
                                </span>
                              </div>
                            </>
                          )}
                        </div>

                        {/* Row 2: Notes + Tags */}
                        {(op.note || (op.tags && op.tags.length > 0)) && (
                          <div className="flex flex-wrap items-start gap-3">
                            {op.note && (
                              <p className="text-xs text-gray-500 dark:text-gray-400 italic max-w-lg">
                                &ldquo;{op.note}&rdquo;
                              </p>
                            )}
                            {op.tags && op.tags.length > 0 && (
                              <div className="flex items-center gap-1">
                                <Tag className="w-3 h-3 text-gray-400" />
                                {op.tags.map((tag) => (
                                  <Badge key={tag.id} variant="outline" className="text-[10px] h-4 px-1.5">
                                    {tag.nome}
                                  </Badge>
                                ))}
                              </div>
                            )}
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
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-1">
          <p className="text-[11px] text-gray-400 dark:text-gray-500">
            {startIndex + 1}–{Math.min(endIndex, operazioni.length)} di {operazioni.length}
          </p>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-[#c4a0e8] hover:bg-[#46265F]/10"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
            <div className="flex items-center gap-0.5">
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                let page: number;
                if (totalPages <= 5) {
                  page = i + 1;
                } else if (currentPage <= 3) {
                  page = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  page = totalPages - 4 + i;
                } else {
                  page = currentPage - 2 + i;
                }
                return (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={cn(
                      'h-7 w-7 rounded text-xs font-medium transition-all',
                      currentPage === page
                        ? 'bg-[#46265F] text-white shadow-sm'
                        : 'text-[#80808A] hover:bg-[#46265F]/10'
                    )}
                  >
                    {page}
                  </button>
                );
              })}
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-[#c4a0e8] hover:bg-[#46265F]/10"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
