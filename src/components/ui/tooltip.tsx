import * as React from 'react';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';

import { cn } from '@/lib/utils';

/**
 * Fornitore di Tooltip di Radix UI
 * Deve avvolgere l'intera applicazione o le parti che usano tooltip
 */
const TooltipProvider = TooltipPrimitive.Provider;

/**
 * Componente Tooltip primario di Radix
 */
const Tooltip = TooltipPrimitive.Root;

/**
 * Componente TooltipTrigger per attivare il tooltip
 */
const TooltipTrigger = TooltipPrimitive.Trigger;

/**
 * Componente TooltipContent per il contenuto del tooltip
 * Mostra il testo di aiuto con stile scuro
 */
const TooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>(({ className, sideOffset = 4, ...props }, ref) => (
  <TooltipPrimitive.Content
    ref={ref}
    sideOffset={sideOffset}
    className={cn(
      'z-50 overflow-hidden rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-900 shadow-md animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 dark:border-[#1e1e2e] dark:bg-[#12121a] dark:text-white',
      className,
    )}
    {...props}
  />
));
TooltipContent.displayName = TooltipPrimitive.Content.displayName;

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider };
