import * as React from 'react';

import { cn } from '@/lib/utils';

/**
 * Componente Card principale con stile glass-morphism scuro
 * Crea un contenitore con effetto sfocato e bordo sottile
 *
 * @example
 * <Card>
 *   <CardHeader>
 *     <CardTitle>Titolo</CardTitle>
 *   </CardHeader>
 *   <CardContent>Contenuto</CardContent>
 * </Card>
 */
const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      'rounded-lg border border-gray-200 bg-white/90 backdrop-blur-md shadow-lg dark:border-[#1e1e2e] dark:bg-[#12121a]/80',
      className,
    )}
    {...props}
  />
));
Card.displayName = 'Card';

/**
 * Componente CardHeader per l'intestazione della Card
 * Contiene il titolo e la descrizione della card
 */
const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('flex flex-col space-y-1.5 p-6', className)}
    {...props}
  />
));
CardHeader.displayName = 'CardHeader';

/**
 * Componente CardTitle per il titolo della Card
 */
const CardTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h2
    ref={ref}
    className={cn(
      'text-2xl font-semibold leading-none tracking-tight text-gray-900 dark:text-white',
      className,
    )}
    {...props}
  />
));
CardTitle.displayName = 'CardTitle';

/**
 * Componente CardDescription per la descrizione della Card
 */
const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn('text-sm text-gray-500 dark:text-gray-400', className)}
    {...props}
  />
));
CardDescription.displayName = 'CardDescription';

/**
 * Componente CardContent per il contenuto principale della Card
 */
const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('px-6 py-4', className)}
    {...props}
  />
));
CardContent.displayName = 'CardContent';

/**
 * Componente CardFooter per il piè di pagina della Card
 */
const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('flex items-center p-6 pt-0', className)}
    {...props}
  />
));
CardFooter.displayName = 'CardFooter';

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardDescription,
  CardContent,
};
