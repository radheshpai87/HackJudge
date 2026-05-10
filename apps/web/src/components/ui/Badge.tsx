import { cn } from '@/lib/utils';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'error' | 'muted';
  className?: string;
}

export function Badge({ children, variant = 'default', className }: BadgeProps) {
  const variants = {
    default: 'bg-bg-overlay text-fg-muted',
    success: 'bg-semantic-success/10 text-semantic-success border-semantic-success/20',
    warning: 'bg-semantic-warning/10 text-semantic-warning border-semantic-warning/20',
    error:   'bg-semantic-error/10 text-semantic-error border-semantic-error/20',
    muted:   'bg-bg-muted text-fg-subtle border-bg-border',
  };

  return (
    <span className={cn('inline-flex items-center rounded-full border px-2.5 py-0.5 text-2xs font-mono font-medium', variants[variant], className)}>
      {children}
    </span>
  );
}
