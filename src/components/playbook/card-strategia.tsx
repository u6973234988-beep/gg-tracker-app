'use client';

import React from 'react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MoreVertical, Trash2, Edit2, ChevronRight, BarChart2, Activity } from 'lucide-react';
import type { StrategiaConDettagli } from '@/hooks/usePlaybook';

interface CardStrategiaProps {
  strategia: StrategiaConDettagli;
  onClick: () => void;
  onEdit: (strategia: StrategiaConDettagli) => void;
  onDelete: (strategia: StrategiaConDettagli) => void;
  viewMode?: 'grid' | 'list';
}

export function CardStrategia({ strategia, onClick, onEdit, onDelete, viewMode = 'grid' }: CardStrategiaProps) {
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

  const borderColor = strategia.colore || '#6A3D8F';
  const operazioni = strategia.operazioniCount || 0;
  const winRate = strategia.winRate || 0;

  if (viewMode === 'list') {
    return (
      <div
        onClick={onClick}
        className="p-4 rounded-xl transition-all duration-200 border border-[#2D2D32] hover:bg-[#46265F]/10 group cursor-pointer bg-[#1C1C1F] hover:shadow-sm"
      >
        <div className="flex items-start w-full">
          <div className="w-1.5 h-full min-h-[60px] rounded-full mr-4 shrink-0" style={{ backgroundColor: borderColor }} />
          <div className="flex-1">
            <div className="flex items-center justify-between mb-2">
              <div className="font-bold text-lg tracking-tight text-gray-900 dark:text-white">{strategia.nome}</div>
              <ChevronRight className="h-5 w-5 text-gray-300 dark:text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400 mb-3 line-clamp-2">
              {strategia.descrizione || 'Strategia ' + strategia.nome}
            </div>
            <div className="flex flex-wrap gap-3 mt-2">
              <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800/60 px-3 py-1.5 rounded-lg">
                <BarChart2 className="h-4 w-4 text-[#c4a0e8]" />
                <span className="font-bold text-sm text-gray-700 dark:text-gray-300">{operazioni} operazioni</span>
              </div>
              {operazioni > 0 && (
                <div className={'flex items-center gap-2 px-3 py-1.5 rounded-lg ' + (winRate >= 50 ? 'bg-green-50 dark:bg-green-900/20' : 'bg-red-50 dark:bg-red-900/20')}>
                  <Activity className={'h-4 w-4 ' + (winRate >= 50 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400')} />
                  <span className={'font-bold text-sm ' + (winRate >= 50 ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400')}>
                    {winRate.toFixed(0)}% win rate
                  </span>
                </div>
              )}
            </div>
          </div>
          <div className="relative ml-2" ref={menuRef}>
            <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }} className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-gray-600">
              <MoreVertical className="h-4 w-4" />
            </Button>
            {showMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-[#1C1C1F] border border-gray-200 dark:border-[#2D2D32] rounded-xl shadow-lg z-50 overflow-hidden">
                <button onClick={(e) => { e.stopPropagation(); onEdit(strategia); setShowMenu(false); }} className="w-full px-4 py-2.5 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#46265F]/10 flex items-center gap-2 transition-colors font-medium">
                  <Edit2 className="h-4 w-4" /> Modifica
                </button>
                <button onClick={(e) => { e.stopPropagation(); onDelete(strategia); setShowMenu(false); }} className="w-full px-4 py-2.5 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/10 flex items-center gap-2 transition-colors font-medium border-t border-gray-100 dark:border-[#2D2D32]">
                  <Trash2 className="h-4 w-4" /> Elimina
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div onClick={onClick} className="group cursor-pointer">
      <Card className="overflow-hidden transition-all duration-300 hover:shadow-lg border border-[#2D2D32] relative bg-[#1C1C1F] hover:border-[#6A3D8F]/40">
        <div className="h-1 w-full" style={{ background: 'linear-gradient(to right, ' + borderColor + ', ' + borderColor + '88)' }} />
        <div className="absolute top-3 right-3 z-20">
          <div className="relative" ref={menuRef}>
            <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }} className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-gray-600">
              <MoreVertical className="h-4 w-4" />
            </Button>
            {showMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-[#1C1C1F] border border-gray-200 dark:border-[#2D2D32] rounded-xl shadow-lg z-50 overflow-hidden">
                <button onClick={(e) => { e.stopPropagation(); onEdit(strategia); setShowMenu(false); }} className="w-full px-4 py-2.5 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#46265F]/10 flex items-center gap-2 transition-colors font-medium">
                  <Edit2 className="h-4 w-4" /> Modifica
                </button>
                <button onClick={(e) => { e.stopPropagation(); onDelete(strategia); setShowMenu(false); }} className="w-full px-4 py-2.5 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/10 flex items-center gap-2 transition-colors font-medium border-t border-gray-100 dark:border-[#2D2D32]">
                  <Trash2 className="h-4 w-4" /> Elimina
                </button>
              </div>
            )}
          </div>
        </div>
        <CardHeader className="pb-2 relative">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full ring-2 ring-offset-2 ring-offset-white dark:ring-offset-[#1C1C1F]" style={{ backgroundColor: borderColor }} />
            <CardTitle className="text-base font-bold tracking-tight text-gray-900 dark:text-white">{strategia.nome}</CardTitle>
          </div>
          <ChevronRight className="absolute right-4 top-4 h-4 w-4 text-gray-300 dark:text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity" />
        </CardHeader>
        <CardContent className="pb-2">
          <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2">
            {strategia.descrizione || 'Strategia ' + strategia.nome}
          </p>
        </CardContent>
        <CardFooter className="flex justify-between pt-0 pb-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="bg-[#46265F]/10 text-[#c4a0e8] border-[#6A3D8F]/20 font-bold text-xs">
              {operazioni} trades
            </Badge>
            {operazioni > 0 && (
              <Badge variant="outline" className={winRate >= 50 ? 'bg-green-50 text-green-700 border-green-200 dark:bg-green-500/10 dark:text-green-400 dark:border-green-500/20 font-bold text-xs' : 'bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20 font-bold text-xs'}>
                {winRate.toFixed(0)}% win
              </Badge>
            )}
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
