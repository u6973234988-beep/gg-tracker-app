import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

/**
 * Definisce le varianti del Badge usando CVA
 * Supporta varianti: default, secondary, success, danger, warning, outline
 */
const badgeVariants = cva(
  'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        default:
          'border border-transparent bg-[#7F00FF] text-white hover:bg-[#6B00D4] dark:bg-[#7F00FF] dark:text-white dark:hover:bg-[#6B00D4]',
        secondary:
          'border border-transparent bg-[#1e1e2e] text-gray-300 hover:bg-[#2a2a3e] dark:bg-[#1e1e2e] dark:text-gray-300 dark:hover:bg-[#2a2a3e]',
        destructive:
          'border border-transparent bg-[#FF4757] text-white hover:bg-[#E63946] dark:bg-[#FF4757] dark:text-white dark:hover:bg-[#E63946]',
        outline:
          'border border-[#7F00FF] text-[#7F00FF] dark:border-[#7F00FF] dark:text-[#7F00FF]',
        success:
          'border border-transparent bg-[#2ecc71] text-white hover:bg-[#27ae60] dark:bg-[#2ecc71] dark:text-white dark:hover:bg-[#27ae60]',
        warning:
          'border border-transparent bg-[#f39c12] text-white hover:bg-[#e67e22] dark:bg-[#f39c12] dark:text-white dark:hover:bg-[#e67e22]',
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
 * Disponibili: default (viola), secondary, success (verde), danger (rosso),
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
