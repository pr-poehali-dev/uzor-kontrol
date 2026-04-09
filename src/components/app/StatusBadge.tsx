import { ConnectionStatus } from '@/lib/api';

interface StatusBadgeProps {
  status: ConnectionStatus;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const config = {
    connected: { label: 'Connected', color: 'text-green-400', dot: 'bg-green-400', ring: 'ring-green-400/30' },
    disconnected: { label: 'Disconnected', color: 'text-zinc-400', dot: 'bg-zinc-500', ring: 'ring-zinc-500/30' },
    connecting: { label: 'Connecting...', color: 'text-primary', dot: 'bg-primary', ring: 'ring-primary/30' },
  }[status];

  return (
    <div className={`flex items-center gap-2 px-4 py-1.5 rounded-full bg-black/40 ring-1 ${config.ring} backdrop-blur-sm`}>
      <span className={`w-2 h-2 rounded-full ${config.dot} ${status === 'connecting' ? 'animate-pulse' : ''}`} />
      <span className={`text-sm font-medium tracking-wide ${config.color}`}>{config.label}</span>
    </div>
  );
}
