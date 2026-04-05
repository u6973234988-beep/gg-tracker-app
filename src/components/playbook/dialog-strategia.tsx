'use client';

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { BookOpen, Palette, DollarSign, Percent } from 'lucide-react';
import type { StrategiaConDettagli } from '@/hooks/usePlaybook';

const strategiaSchema = z.object({
  nome: z.string().min(1, 'Nome è obbligatorio').min(3, 'Nome deve avere almeno 3 caratteri'),
  descrizione: z.string().optional().nullable(),
  descrizione_dettagliata: z.string().optional().nullable(),
  colore: z.string().default('#6A3D8F'),
  rischio_max_importo: z.number().optional().nullable(),
  rischio_max_percentuale: z.number().optional().nullable(),
});

type StrategiaFormData = z.infer<typeof strategiaSchema>;

interface DialogStrategiaProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: any) => Promise<void>;
  strategiaEdit?: StrategiaConDettagli | null;
  onEditSave?: (id: string, data: any) => Promise<void>;
  isLoading?: boolean;
}

export function DialogStrategia({
  open,
  onOpenChange,
  onSave,
  strategiaEdit,
  onEditSave,
  isLoading = false,
}: DialogStrategiaProps) {
  const [colorPreview, setColorPreview] = React.useState<string>('#6A3D8F');

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
    watch,
  } = useForm<StrategiaFormData>({
    resolver: zodResolver(strategiaSchema) as any,
    defaultValues: strategiaEdit
      ? {
          nome: strategiaEdit.nome,
          descrizione: strategiaEdit.descrizione,
          colore: strategiaEdit.colore || '#6A3D8F',
        }
      : {
          nome: '',
          descrizione: '',
          colore: '#6A3D8F',
        },
  });

  const colore = watch('colore');

  React.useEffect(() => {
    setColorPreview(colore);
  }, [colore]);

  React.useEffect(() => {
    if (strategiaEdit) {
      reset({
        nome: strategiaEdit.nome,
        descrizione: strategiaEdit.descrizione,
        colore: strategiaEdit.colore || '#6A3D8F',
      });
      setColorPreview(strategiaEdit.colore || '#6A3D8F');
    } else {
      reset({
        nome: '',
        descrizione: '',
        colore: '#6A3D8F',
      });
      setColorPreview('#6A3D8F');
    }
  }, [strategiaEdit, reset]);

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      reset();
      setColorPreview('#6A3D8F');
    }
    onOpenChange(newOpen);
  };

  const onSubmit = async (data: StrategiaFormData) => {
    try {
      if (strategiaEdit && onEditSave) {
        await onEditSave(strategiaEdit.id, {
          nome: data.nome,
          descrizione: data.descrizione,
          colore: data.colore,
          rischio_max_importo: data.rischio_max_importo,
          rischio_max_percentuale: data.rischio_max_percentuale,
        });
      } else {
        await onSave({
          nome: data.nome,
          descrizione: data.descrizione,
          colore: data.colore,
          rischio_max_importo: data.rischio_max_importo,
          rischio_max_percentuale: data.rischio_max_percentuale,
        });
      }
      handleOpenChange(false);
    } catch (error) {
      console.error('Errore nel salvataggio:', error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[550px] border border-gray-200 dark:border-[#2D2D32] bg-white dark:bg-[#1C1C1F] shadow-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-bold tracking-tight text-gray-900 dark:text-white">
            <div className="p-1.5 rounded-lg bg-[#46265F]/20">
              <BookOpen className="h-4 w-4 text-[#c4a0e8]" />
            </div>
            {strategiaEdit ? 'Modifica Strategia' : 'Crea Nuova Strategia'}
          </DialogTitle>
          <DialogDescription className="text-gray-500 dark:text-gray-400">
            {strategiaEdit
              ? 'Modifica i dettagli della strategia esistente.'
              : 'Compila i campi per creare una nuova strategia di trading.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 mt-2">
          {/* Nome */}
          <div className="space-y-2">
            <Label htmlFor="nome" className="text-sm font-bold text-gray-700 dark:text-gray-300">
              Nome Strategia *
            </Label>
            <Input
              id="nome"
              placeholder="Es. Mean Reversion Breakout"
              {...register('nome')}
              disabled={isLoading}
              className="border-gray-200 dark:border-[#2D2D32] focus:border-[#6A3D8F] bg-white dark:bg-[#1C1C1F] text-gray-900 dark:text-white font-medium focus:ring-2 focus:ring-[#6A3D8F]/10"
            />
            {errors.nome && (
              <p className="text-sm text-red-600 dark:text-red-400 font-medium">{errors.nome.message}</p>
            )}
          </div>

          {/* Descrizione */}
          <div className="space-y-2">
            <Label htmlFor="descrizione" className="text-sm font-bold text-gray-700 dark:text-gray-300">
              Descrizione Breve
            </Label>
            <Input
              id="descrizione"
              placeholder="Una breve descrizione della strategia"
              {...register('descrizione')}
              disabled={isLoading}
              className="border-gray-200 dark:border-[#2D2D32] focus:border-[#6A3D8F] bg-white dark:bg-[#1C1C1F] text-gray-900 dark:text-white font-medium focus:ring-2 focus:ring-[#6A3D8F]/10"
            />
          </div>

          {/* Colore */}
          <div className="space-y-2">
            <Label htmlFor="colore" className="text-sm font-bold text-gray-700 dark:text-gray-300 flex items-center gap-2">
              <Palette className="h-4 w-4 text-[#c4a0e8]" />
              Colore Strategia
            </Label>
            <div className="flex items-center gap-3">
              <input
                id="colore"
                type="color"
                {...register('colore')}
                disabled={isLoading}
                className="h-12 w-20 rounded-lg cursor-pointer border border-gray-200 dark:border-[#2D2D32]"
              />
              <div className="flex-1 flex items-center gap-2">
                <div
                  className="h-10 w-10 rounded-lg border border-gray-200 dark:border-[#2D2D32] shadow-sm"
                  style={{ backgroundColor: colorPreview }}
                />
                <span className="text-sm text-gray-500 dark:text-gray-400 font-mono font-bold">
                  {colorPreview}
                </span>
              </div>
            </div>
          </div>

          {/* Risk settings */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="rischio_max_importo" className="text-sm font-bold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-amber-500" />
                Rischio Max (€)
              </Label>
              <Input
                id="rischio_max_importo"
                type="number"
                placeholder="Opzionale"
                {...register('rischio_max_importo', { valueAsNumber: true })}
                disabled={isLoading}
                className="border-gray-200 dark:border-[#2D2D32] focus:border-[#6A3D8F] bg-white dark:bg-[#1C1C1F] text-gray-900 dark:text-white font-medium focus:ring-2 focus:ring-[#6A3D8F]/10"
                step="0.01"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="rischio_max_percentuale" className="text-sm font-bold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                <Percent className="h-4 w-4 text-amber-500" />
                Rischio Max (%)
              </Label>
              <Input
                id="rischio_max_percentuale"
                type="number"
                placeholder="Opzionale"
                {...register('rischio_max_percentuale', { valueAsNumber: true })}
                disabled={isLoading}
                className="border-gray-200 dark:border-[#2D2D32] focus:border-[#6A3D8F] bg-white dark:bg-[#1C1C1F] text-gray-900 dark:text-white font-medium focus:ring-2 focus:ring-[#6A3D8F]/10"
                step="0.01"
              />
            </div>
          </div>

          <DialogFooter className="flex gap-2 justify-end pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isLoading}
              className="border-gray-200 dark:border-[#2D2D32] hover:border-[#6A3D8F] text-gray-700 dark:text-gray-300 font-medium"
            >
              Annulla
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className="font-bold"
            >
              {isLoading ? 'Salvataggio...' : strategiaEdit ? 'Aggiorna' : 'Crea Playbook'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
