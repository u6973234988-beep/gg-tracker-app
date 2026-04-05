import * as React from 'react';

import { cn } from '@/lib/utils';

/**
 * Interfaccia per le proprietà dell'Input
 * @extends React.InputHTMLAttributes<HTMLInputElement>
 */
export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

/**
 * Componente Input riutilizzabile con stile scuro GG Tracker
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
        'flex h-10 w-full rounded-md border border-[#2D2D32] bg-[#1C1C1F] px-3 py-2 text-sm text-[#F8F8FF] placeholder:text-[#80808A] focus:border-[#6A3D8F] focus:outline-none focus:ring-2 focus:ring-[#6A3D8F]/20 disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      ref={ref}
      {...props}
    />
  ),
);
Input.displayName = 'Input';

export { Input };
