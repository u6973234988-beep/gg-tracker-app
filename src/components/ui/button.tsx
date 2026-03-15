import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

/**
 * Definisce le varianti e gli stili del pulsante usando CVA
 * Supporta varianti di stile, dimensioni e stati
 */
const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default:
          'bg-[#7F00FF] text-white hover:bg-[#6B00D4] dark:bg-[#7F00FF] dark:hover:bg-[#6B00D4]',
        secondary:
          'bg-[#1e1e2e] text-white hover:bg-[#2a2a3e] dark:bg-[#1e1e2e] dark:hover:bg-[#2a2a3e]',
        destructive:
          'bg-[#FF4757] text-white hover:bg-[#E63946] dark:bg-[#FF4757] dark:hover:bg-[#E63946]',
        outline:
          'border border-[#7F00FF] text-[#7F00FF] hover:bg-[#7F00FF] hover:text-white dark:border-[#7F00FF] dark:text-[#7F00FF] dark:hover:bg-[#7F00FF] dark:hover:text-white',
        ghost:
          'text-white hover:bg-[#2a2a3e] dark:text-white dark:hover:bg-[#2a2a3e]',
        link: 'text-[#7F00FF] underline-offset-4 hover:underline dark:text-[#7F00FF] dark:hover:underline',
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
