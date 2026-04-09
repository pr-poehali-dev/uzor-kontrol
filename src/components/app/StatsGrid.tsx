import Icon from '@/components/ui/icon';
import { ConnectionState } from '@/lib/api';

interface StatsGridProps {
  state: ConnectionState;
}

function formatDuration(connectedAt: Date | null): string {
  if (!connectedAt) return '00:00:00';
  const diff = Math.floor((Date.now() - connectedAt.getTime()) / 1000);
  const h = Math.floor(diff / 3600).toString().padStart(2, '0');
  const m = Math.floor((diff % 3600) / 60).toString().padStart(2, '0');
  const s = (diff % 60).toString().padStart(2, '0');
  return `${h}:${m}:${s}`;
}

function getQualityColor(latency: number): string {
  if (latency < 50) return 'text-green-400';
  if (latency < 100) return 'text-yellow-400';
  return 'text-red-400';
}

interface StatCardProps {
  icon: string;
  label: string;
  value: string;
  valueClass?: string;
}

function StatCard({ icon, label, value, valueClass = 'text-foreground' }: StatCardProps) {
  return (
    <div className="flex flex-col gap-1 bg-white/5 rounded-2xl p-4 border border-white/10">
      <div className="flex items-center gap-1.5 text-muted-foreground">
        <Icon name={icon} fallback="Circle" size={14} />
        <span className="text-xs uppercase tracking-wider">{label}</span>
      </div>
      <span className={`text-lg font-semibold font-space-mono ${valueClass}`}>{value}</span>
    </div>
  );
}

export function StatsGrid({ state }: StatsGridProps) {
  const { status, latency, downloadSpeed, uploadSpeed, connectedAt } = state;
  const active = status === 'connected';

  return (
    <div className="grid grid-cols-2 gap-3 w-full">
      <StatCard
        icon="Timer"
        label="Duration"
        value={active ? formatDuration(connectedAt) : '--:--:--'}
      />
      <StatCard
        icon="Activity"
        label="Latency"
        value={active ? `${latency} ms` : '-- ms'}
        valueClass={active ? getQualityColor(latency) : 'text-muted-foreground'}
      />
      <StatCard
        icon="ArrowDown"
        label="Download"
        value={active ? `${downloadSpeed} MB/s` : '--'}
        valueClass={active ? 'text-blue-400' : 'text-muted-foreground'}
      />
      <StatCard
        icon="ArrowUp"
        label="Upload"
        value={active ? `${uploadSpeed} MB/s` : '--'}
        valueClass={active ? 'text-purple-400' : 'text-muted-foreground'}
      />
    </div>
  );
}
