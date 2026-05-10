import { cn } from '@/lib/utils';

interface StatusDotProps {
  status?: 'inactive' | 'active' | 'error';
  className?: string;
  pulse?: boolean;
}

export function StatusDot({ status = 'inactive', className, pulse = false }: StatusDotProps) {
  const colors = {
    inactive: 'bg-fg-disabled',
    active:   'bg-semantic-success',
    error:    'bg-semantic-error',
  };

  return (
    <span className={cn('relative inline-flex h-2.5 w-2.5 rounded-full', colors[status], className)}>
      {pulse && status === 'active' && (
        <span className="absolute inset-0 animate-ping rounded-full bg-semantic-success opacity-40" />
      )}
    </span>
  );
}
