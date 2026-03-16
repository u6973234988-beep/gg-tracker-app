import * as React from 'react';

import { cn } from '@/lib/utils';

/**
 * Componente Table primario per tabelle HTML
 */
const Table = React.forwardRef<
  HTMLTableElement,
  React.HTMLAttributes<HTMLTableElement>
>(({ className, ...props }, ref) => (
  <div className="relative w-full overflow-auto">
    <table
      ref={ref}
      className={cn(
        'w-full caption-bottom text-sm text-gray-900 dark:text-white',
        className,
      )}
      {...props}
    />
  </div>
));
Table.displayName = 'Table';

/**
 * Componente TableHeader per l'intestazione della tabella
 */
const TableHeader = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <thead
    ref={ref}
    className={cn(
      'border-b border-gray-200 bg-gray-50 dark:border-[#1e1e2e] dark:bg-[#1e1e2e]',
      className,
    )}
    {...props}
  />
));
TableHeader.displayName = 'TableHeader';

/**
 * Componente TableBody per il corpo della tabella
 */
const TableBody = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tbody
    ref={ref}
    className={cn('[&_tr:last-child]:border-0', className)}
    {...props}
  />
));
TableBody.displayName = 'TableBody';

/**
 * Componente TableFooter per il piè di pagina della tabella
 */
const TableFooter = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tfoot
    ref={ref}
    className={cn(
      'border-t border-gray-200 bg-gray-50 font-medium text-gray-900 dark:border-[#1e1e2e] dark:bg-[#1e1e2e] dark:text-white [&>tr]:last:border-b-0',
      className,
    )}
    {...props}
  />
));
TableFooter.displayName = 'TableFooter';

/**
 * Componente TableRow per le righe della tabella
 * Evidenzia alternativamente per migliore leggibilità
 */
const TableRow = React.forwardRef<
  HTMLTableRowElement,
  React.HTMLAttributes<HTMLTableRowElement>
>(({ className, ...props }, ref) => (
  <tr
    ref={ref}
    className={cn(
      'border-b border-gray-100 transition-colors hover:bg-gray-50 data-[state=selected]:bg-gray-100 dark:border-[#1e1e2e] dark:hover:bg-[#1e1e2e]/50 dark:data-[state=selected]:bg-[#1e1e2e]',
      className,
    )}
    {...props}
  />
));
TableRow.displayName = 'TableRow';

/**
 * Componente TableHead per le celle di intestazione
 */
const TableHead = React.forwardRef<
  HTMLTableCellElement,
  React.ThHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
  <th
    ref={ref}
    className={cn(
      'h-12 px-4 text-left align-middle font-medium text-gray-600 [&:has([role=checkbox])]:pr-0 dark:text-gray-300',
      className,
    )}
    {...props}
  />
));
TableHead.displayName = 'TableHead';

/**
 * Componente TableCell per le celle della tabella
 */
const TableCell = React.forwardRef<
  HTMLTableCellElement,
  React.TdHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
  <td
    ref={ref}
    className={cn(
      'px-4 py-2 align-middle [&:has([role=checkbox])]:pr-0',
      className,
    )}
    {...props}
  />
));
TableCell.displayName = 'TableCell';

/**
 * Componente TableCaption per la didascalia della tabella
 */
const TableCaption = React.forwardRef<
  HTMLTableCaptionElement,
  React.HTMLAttributes<HTMLTableCaptionElement>
>(({ className, ...props }, ref) => (
  <caption
    ref={ref}
    className={cn('mt-4 text-sm text-gray-500 dark:text-gray-400', className)}
    {...props}
  />
));
TableCaption.displayName = 'TableCaption';

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
};
