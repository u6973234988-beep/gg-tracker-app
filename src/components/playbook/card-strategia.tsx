'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MoreVertical, Trash2, Edit2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { formatPercentuale } from '@/lib/utils';
import type { StrategiaConDettagli } from '@/hooks/usePlaybook';

interface CardStrategiaProps {
  strategia: StrategiaConDettagli;
  onClick: () => void;
  onEdit: (strategia: StrategiaConDettagli) => void;
  onDelete: (strategia: StrategiaConDettagli) => void;
}

export function CardStrategia({ strategia, onClick, onEdit, onDelete }: CardStrategiaProps) {
  const [showMenu, setShowMenu] = React.useState(false);
  const menuRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getStatusBadge = () => {
    const operazioni = strategia.operazioniCount || 0;
    const winRate = strategia.winRate || 0;
    const profitFactor = strategia.profitFactor || 0;

    if (operazioni === 0) {
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

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.2 }}
      onClick={onClick}
      className="group cursor-pointer"
    >
      <Card
        className="overflow-hidden transition-all duration-300 hover:shadow-xl border-l-4"
        style={{ borderLeftColor: borderColor }}
      >
        <div className="absolute top-3 right-3 z-20">
          <div className="relative" ref={menuRef}>
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                setShowMenu(!showMenu);
              }}
              className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <MoreVertical className="h-4 w-4" />
            </Button>

            {showMenu && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="absolute right-0 mt-2 w-48 bg-[#1e1e2e] border border-[#2a2a3e] rounded-md shadow-lg z-50"
              >
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit(strategia);
                    setShowMenu(false);
                  }}
                  className="w-full px-4 py-2 text-left text-sm text-gray-300 hover:bg-[#2a2a3e] flex items-center gap-2 transition-colors"
                >
                  <Edit2 className="h-4 w-4" />
                  Modifica
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(strategia);
                    setShowMenu(false);
                  }}
                  className="w-full px-4 py-2 text-left text-sm text-[#FF4757] hover:bg-[#2a2a3e] flex items-center gap-2 transition-colors border-t border-[#2a2a3e]"
                >
                  <Trash2 className="h-4 w-4" />
                  Elimina
                </button>
              </motion.div>
            )}
          </div>
        </div>

        <CardContent className="p-6">
          <div className="mb-4">
            <h3 className="text-xl font-bold text-white mb-1">{strategia.nome}</h3>
            <p className="text-sm text-gray-400 line-clamp-2">
              {strategia.descrizione || 'Nessuna descrizione'}
            </p>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="bg-[#1e1e2e] p-3 rounded">
                <div className="text-gray-500 text-xs mb-1">Operazioni</div>
                <div className="text-white font-semibold">{strategia.operazioniCount || 0}</div>
              </div>
              <div className="bg-[#1e1e2e] p-3 rounded">
                <div className="text-gray-500 text-xs mb-1">Win Rate</div>
                <div className="text-white font-semibold">
                  {formatPercentuale((strategia.winRate || 0) / 100)}
                </div>
              </div>
              <div className="bg-[#1e1e2e] p-3 rounded">
                <div className="text-gray-500 text-xs mb-1">Profit Factor</div>
                <div className="text-white font-semibold">
                  {(strategia.profitFactor || 0).toFixed(2)}
                </div>
              </div>
              <div
                className="bg-[#1e1e2e] p-3 rounded"
                style={{
                  backgroundColor: strategia.regole && strategia.regole.length > 0 ? '#1e1e2e' : '#1e1e2e',
                }}
              >
                <div className="text-gray-500 text-xs mb-1">Regole</div>
                <div className="text-white font-semibold">{(strategia.regole || []).length}</div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <Badge variant={status.variant}>{status.label}</Badge>
              <span className="text-xs text-gray-500">
                {strategia.operazioniCount === 0
                  ? 'Nessun trade'
                  : `${strategia.operazioniCount} trade`}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
