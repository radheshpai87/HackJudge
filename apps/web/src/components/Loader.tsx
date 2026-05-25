import { Hexagon } from 'lucide-react';

export default function Loader({ text = "Loading..." }: { text?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4">
      <div className="relative flex h-12 w-12 items-center justify-center">
        <div className="absolute animate-spin rounded-full h-10 w-10 border-2 border-fg-subtle/25 border-t-fg-default"></div>
        <Hexagon size={16} className="text-fg-muted animate-pulse" strokeWidth={2} />
      </div>
      <p className="text-[11px] font-semibold tracking-wider text-fg-subtle uppercase animate-pulse">{text}</p>
    </div>
  );
}
