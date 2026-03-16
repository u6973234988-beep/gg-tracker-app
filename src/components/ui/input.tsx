import * as React from 'react';

import { cn } from '@/lib/utils';

/**
 * Interfaccia per le proprietà dell'Input
 * @extends React.InputHTMLAttributes<HTMLInputElement>
 */
export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

/**
 * Componente Input riutilizzabile con stile scuro
 * Include focus ring viola e placeholder grigio
 * Supporta tutti gli attributi HTML standard dell'input
 *
 * @example
 * <Input
 *   type="email"
 *   placeholder="Inserisci email"
 *   value={email}
 *   onChange={(e) => setEmail(e.target.value)}
 * />
 */
const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => (
    <input
      type={type}
      className={cn(
        'flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-[#7F00FF] focus:outline-none focus:ring-2 focus:ring-[#7F00FF] focus:ring-opacity-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-[#1e1e2e] dark:bg-[#12121a] dark:text-white dark:placeholder:text-gray-500 dark:focus:border-[#7F00FF] dark:focus:ring-[#7F00FF]',
        className,
      )}
      ref={ref}
      {...props}
    />
  ),
);
Input.displayName = 'Input';

export { Input };
