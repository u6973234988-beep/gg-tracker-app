import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

/**
 * Definisce le varianti e gli stili del pulsante usando CVA
 * Supporta varianti di stile, dimensioni e stati
 * GG Tracker Design System — Deep Purple #46265F / Vivid Purple #6A3D8F
 */
const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-[#0F0F11] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6A3D8F] focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default:
          'bg-[#46265F] text-[#F8F8FF] hover:bg-[#6A3D8F] hover:shadow-[0_0_20px_rgba(106,61,143,0.3)]',
        secondary:
          'bg-[#1C1C1F] border border-[#2D2D32] text-[#F8F8FF] hover:border-[#6A3D8F] hover:bg-[#1C1C1F]',
        destructive:
          'bg-[#DC2626] text-white hover:bg-red-700',
        outline:
          'border border-[#2D2D32] bg-transparent text-[#80808A] hover:border-[#6A3D8F] hover:text-[#c4a0e8]',
        ghost:
          'text-[#80808A] hover:bg-[#46265F]/15 hover:text-[#c4a0e8]',
        link: 'text-[#6A3D8F] underline-offset-4 hover:underline hover:text-[#c4a0e8]',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 rounded-md px-3',
        lg: 'h-11 rounded-md px-8',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

/**
 * Interfaccia per le proprietà del Button
 * @extends React.ButtonHTMLAttributes<HTMLButtonElement>
 * @extends VariantProps<typeof buttonVariants>
 * @param asChild - Se true, il componente renderizza il figlio come elemento radice
 */
export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  /** Se true, usa il figlio come elemento primario */
  asChild?: boolean;
}

/**
 * Componente Button riutilizzabile con varianti multiple
 * Supporta default, secondary, destructive, outline, ghost e link
 * Disponibili in diverse dimensioni: sm, default, lg, icon
 *
 * @example
 * <Button>Cliccami</Button>
 * <Button variant="secondary">Secondario</Button>
 * <Button size="lg" variant="outline">Grande outline</Button>
 * <Button asChild><a href="/home">Link home</a></Button>
 */
const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    // Usa Slot di Radix se asChild è true, altrimenti usa un pulsante
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = 'Button';

export { Button, buttonVariants };
