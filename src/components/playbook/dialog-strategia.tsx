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
import type { StrategiaConDettagli } from '@/hooks/usePlaybook';

const strategiaSchema = z.object({
  nome: z.string().min(1, 'Nome è obbligatorio').min(3, 'Nome deve avere almeno 3 caratteri'),
  descrizione: z.string().optional().nullable(),
  descrizione_dettagliata: z.string().optional().nullable(),
  colore: z.string().default('#7F00FF'),
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
  const [colorPreview, setColorPreview] = React.useState<string>('#7F00FF');

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
          colore: strategiaEdit.colore || '#7F00FF',
        }
      : {
          nome: '',
          descrizione: '',
          colore: '#7F00FF',
        },
  });

  const colore = watch('colore');

  React.useEffect(() => {
    setColorPreview(colore);
  }, [colore]);

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      reset();
      setColorPreview('#7F00FF');
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
        });
      } else {
        await onSave({
          nome: data.nome,
          descrizione: data.descrizione,
          colore: data.colore,
        });
      }
      handleOpenChange(false);
    } catch (error) {
      console.error('Errore nel salvataggio:', error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {strategiaEdit ? 'Modifica Strategia' : 'Crea Nuova Strategia'}
          </DialogTitle>
          <DialogDescription>
            {strategiaEdit ? 'Modifica i dettagli della strategia esistente.' : 'Compila i campi per creare una nuova strategia di trading.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="nome">
              Nome Strategia *
            </Label>
            <Input
              id="nome"
              placeholder="Es. Mean Reversion Breakout"
              {...register('nome')}
              disabled={isLoading}
              className=""
            />
            {errors.nome && <p className="text-sm text-[#FF4757]">{errors.nome.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="descrizione">
              Descrizione Breve
            </Label>
            <Input
              id="descrizione"
              placeholder="Una breve descrizione della strategia"
              {...register('descrizione')}
              disabled={isLoading}
              className=""
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="colore">
              Colore Strategia
            </Label>
            <div className="flex items-center gap-3">
              <input
                id="colore"
                type="color"
                {...register('colore')}
                disabled={isLoading}
                className="h-12 w-20 rounded cursor-pointer border border-gray-300 dark:border-[#2a2a3e]"
              />
              <div className="flex-1 flex items-center gap-2">
                <div
                  className="h-10 w-10 rounded border border-gray-300 dark:border-[#2a2a3e]"
                  style={{ backgroundColor: colorPreview }}
                />
                <span className="text-sm text-gray-500 dark:text-gray-400">{colorPreview}</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="rischio_max_importo">
                Rischio Max (€)
              </Label>
              <Input
                id="rischio_max_importo"
                type="number"
                placeholder="Opzionale"
                {...register('rischio_max_importo', { valueAsNumber: true })}
                disabled={isLoading}
                className=""
                step="0.01"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="rischio_max_percentuale">
                Rischio Max (%)
              </Label>
              <Input
                id="rischio_max_percentuale"
                type="number"
                placeholder="Opzionale"
                {...register('rischio_max_percentuale', { valueAsNumber: true })}
                disabled={isLoading}
                className=""
                step="0.01"
              />
            </div>
          </div>

          <DialogFooter className="flex gap-2 justify-end">
            <Button
              type="button"
              variant="secondary"
              onClick={() => handleOpenChange(false)}
              disabled={isLoading}
            >
              Annulla
            </Button>
            <Button type="submit" variant="default" disabled={isLoading}>
              {isLoading ? 'Salvataggio...' : 'Salva'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
