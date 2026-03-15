import { cn } from '@/lib/utils';

/**
 * Componente Skeleton per caricamento placeholder
 * Mostra un'animazione di impulso mentre i dati stanno caricando
 *
 * @example
 * <Skeleton className="h-12 w-12 rounded-full" />
 * <Skeleton className="h-4 w-[250px]" />
 */
function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'animate-pulse rounded-md bg-[#1e1e2e] dark:bg-[#1e1e2e]',
        className,
      )}
      {...props}
    />
  );
}

export { Skeleton };
