import { cn } from '@/lib/utils';

interface ScoreBarProps {
  value: number;
  max?: number;
  className?: string;
  size?: 'sm' | 'md';
}

export function ScoreBar({ value, max = 100, className, size = 'md' }: ScoreBarProps) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  const height = size === 'sm' ? 'h-1.5' : 'h-2';

  return (
    <div className={cn('w-full overflow-hidden rounded-full bg-bg-muted', height, className)}>
      <div
        className="h-full rounded-full bg-fg-default transition-all duration-500 ease-out"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
