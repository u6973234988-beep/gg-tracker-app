import * as React from 'react';
import * as TabsPrimitive from '@radix-ui/react-tabs';

import { cn } from '@/lib/utils';

/**
 * Componente Tabs primario di Radix
 */
const Tabs = TabsPrimitive.Root;

/**
 * Componente TabsList per la lista dei trigger dei tab
 * GG Tracker Design System — sfondo Card #1C1C1F, bordo #2D2D32
 */
const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn(
      'inline-flex h-10 items-center justify-center rounded-md bg-[#1C1C1F] border border-[#2D2D32] p-1 text-[#80808A]',
      className,
    )}
    {...props}
  />
));
TabsList.displayName = TabsPrimitive.List.displayName;

/**
 * Componente TabsTrigger per il pulsante di selezione del tab
 * Mostra lo stato attivo con colore viola Deep Purple e transizioni fluide
 */
const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      'inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-[#0F0F11] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6A3D8F] focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-[#46265F] data-[state=active]:text-[#F8F8FF] data-[state=active]:shadow-sm data-[state=inactive]:text-[#80808A] data-[state=inactive]:hover:text-[#c4a0e8]',
      className,
    )}
    {...props}
  />
));
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName;

/**
 * Componente TabsContent per il contenuto del tab
 */
const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn(
      'mt-2 ring-offset-[#0F0F11] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6A3D8F] focus-visible:ring-offset-2',
      className,
    )}
    {...props}
  />
));
TabsContent.displayName = TabsPrimitive.Content.displayName;

export { Tabs, TabsList, TabsTrigger, TabsContent };
