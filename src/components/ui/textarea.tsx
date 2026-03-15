import * as React from 'react';

import { cn } from '@/lib/utils';

/**
 * Interfaccia per le proprietà del Textarea
 * @extends React.TextareaHTMLAttributes<HTMLTextAreaElement>
 */
export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

/**
 * Componente Textarea riutilizzabile con stile scuro
 * Include focus ring viola e placeholder grigio
 * Supporta tutti gli attributi HTML standard del textarea
 *
 * @example
 * <Textarea
 *   placeholder="Scrivi un commento..."
 *   value={text}
 *   onChange={(e) => setText(e.target.value)}
 *   rows={5}
 * />
 */
const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => (
    <textarea
      className={cn(
        'flex min-h-[80px] w-full rounded-md border border-[#1e1e2e] bg-[#12121a] px-3 py-2 text-sm text-white placeholder:text-gray-500 focus:border-[#7F00FF] focus:outline-none focus:ring-2 focus:ring-[#7F00FF] focus:ring-opacity-50 disabled:cursor-not-allowed disabled:opacity-50 resize-none dark:border-[#1e1e2e] dark:bg-[#12121a] dark:text-white dark:placeholder:text-gray-500 dark:focus:border-[#7F00FF] dark:focus:ring-[#7F00FF]',
        className,
      )}
      ref={ref}
      {...props}
    />
  ),
);
Textarea.displayName = 'Textarea';

export { Textarea };
