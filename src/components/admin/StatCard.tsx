import Icon from '@/components/ui/icon';

interface StatCardProps {
  label: string;
  value: string | number;
  icon: string;
  trend?: { value: string; up?: boolean };
  accent?: 'default' | 'green' | 'red' | 'blue' | 'yellow';
}

const accentMap = {
  default: 'text-primary bg-primary/10 border-primary/20',
  green: 'text-green-400 bg-green-400/10 border-green-400/20',
  red: 'text-red-400 bg-red-400/10 border-red-400/20',
  blue: 'text-blue-400 bg-blue-400/10 border-blue-400/20',
  yellow: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20',
};

export function StatCard({ label, value, icon, trend, accent = 'default' }: StatCardProps) {
  const cls = accentMap[accent];
  return (
    <div className="bg-card border border-white/10 rounded-2xl p-5 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground font-medium">{label}</span>
        <div className={`w-9 h-9 rounded-xl border flex items-center justify-center ${cls}`}>
          <Icon name={icon} fallback="Circle" size={16} />
        </div>
      </div>
      <div className="flex items-end justify-between gap-2">
        <span className="text-3xl font-bold font-display tracking-tight">{value}</span>
        {trend && (
          <span className={`text-xs font-medium flex items-center gap-1 mb-1 ${trend.up ? 'text-green-400' : 'text-muted-foreground'}`}>
            <Icon name={trend.up ? 'TrendingUp' : 'Minus'} size={12} />
            {trend.value}
          </span>
        )}
      </div>
    </div>
  );
}
