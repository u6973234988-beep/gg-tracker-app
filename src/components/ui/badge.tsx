import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

/**
 * Definisce le varianti del Badge usando CVA
 * GG Tracker Design System — colori semantici senza glassmorphism
 * Supporta varianti: default, secondary, success, destructive, warning, outline
 */
const badgeVariants = cva(
  'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-[#6A3D8F] focus:ring-offset-2',
  {
    variants: {
      variant: {
        default:
          'bg-[#46265F]/30 text-[#c4a0e8] border border-[#6A3D8F]/20',
        secondary:
          'bg-[#1C1C1F] border border-[#2D2D32] text-[#80808A]',
        destructive:
          'bg-[#DC2626]/15 border border-[#DC2626]/30 text-[#DC2626]',
        outline:
          'border border-[#6A3D8F]/40 text-[#c4a0e8] bg-transparent',
        success:
          'bg-[#22C55E]/15 border border-[#22C55E]/30 text-[#22C55E]',
        warning:
          'bg-[#f39c12]/15 border border-[#f39c12]/30 text-[#f39c12]',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

/**
 * Interfaccia per le proprietà del Badge
 * @extends React.HTMLAttributes<HTMLDivElement>
 * @extends VariantProps<typeof badgeVariants>
 */
export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

/**
 * Componente Badge riutilizzabile con varianti multiple
 * Disponibili: default (viola), secondary, success (verde), destructive (rosso),
 * warning (giallo), outline
 *
 * @example
 * <Badge>Default</Badge>
 * <Badge variant="secondary">Secondario</Badge>
 * <Badge variant="success">Successo</Badge>
 * <Badge variant="destructive">Pericolo</Badge>
 */
function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  );
}

export { Badge, badgeVariants };
