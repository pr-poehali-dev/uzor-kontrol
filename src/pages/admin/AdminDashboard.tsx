import { STATS, METRICS, MOCK_ADMIN_SERVERS } from '@/lib/admin-data';
import { StatCard } from '@/components/admin/StatCard';
import { PageHeader } from '@/components/admin/PageHeader';
import { Badge } from '@/components/admin/Badge';
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';

const tooltipStyle = {
  contentStyle: { background: '#111', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, fontSize: 12 },
  labelStyle: { color: '#999' },
  cursor: { fill: 'rgba(255,255,255,0.04)' },
};

export default function AdminDashboard() {
  const topServers = MOCK_ADMIN_SERVERS
    .filter(s => s.status === 'online')
    .sort((a, b) => b.connections - a.connections)
    .slice(0, 5);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <PageHeader
        title="Dashboard"
        description={`Overview · ${new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}`}
      />

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total Users" value={STATS.totalUsers} icon="Users" accent="default" trend={{ value: '+3 today', up: true }} />
        <StatCard label="Active Connections" value={STATS.activeConnections} icon="Wifi" accent="green" trend={{ value: 'live', up: true }} />
        <StatCard label="Servers Online" value={`${STATS.onlineServers}/${STATS.totalServers}`} icon="Server" accent="blue" />
        <StatCard label="Errors 24h" value={STATS.errorsLast24h} icon="AlertTriangle" accent={STATS.errorsLast24h > 5 ? 'red' : 'yellow'} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
        {/* Connections chart */}
        <div className="lg:col-span-2 bg-card border border-white/10 rounded-2xl p-5">
          <p className="text-sm font-semibold mb-4">Active Connections — 24h</p>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={METRICS.connectionsOverTime}>
              <defs>
                <linearGradient id="connGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(0,84%,60%)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(0,84%,60%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="time" tick={{ fill: '#666', fontSize: 11 }} tickLine={false} axisLine={false} interval={3} />
              <YAxis tick={{ fill: '#666', fontSize: 11 }} tickLine={false} axisLine={false} width={40} />
              <Tooltip {...tooltipStyle} />
              <Area type="monotone" dataKey="value" stroke="hsl(0,84%,60%)" fill="url(#connGrad)" strokeWidth={2} dot={false} name="Connections" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Bandwidth chart */}
        <div className="bg-card border border-white/10 rounded-2xl p-5">
          <p className="text-sm font-semibold mb-4">Bandwidth GB/s — 24h</p>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={METRICS.bandwidthOverTime}>
              <defs>
                <linearGradient id="bwGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#60a5fa" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#60a5fa" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="time" tick={{ fill: '#666', fontSize: 10 }} tickLine={false} axisLine={false} interval={5} />
              <YAxis tick={{ fill: '#666', fontSize: 10 }} tickLine={false} axisLine={false} width={30} />
              <Tooltip {...tooltipStyle} />
              <Area type="monotone" dataKey="value" stroke="#60a5fa" fill="url(#bwGrad)" strokeWidth={2} dot={false} name="GB/s" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Server Load */}
        <div className="bg-card border border-white/10 rounded-2xl p-5">
          <p className="text-sm font-semibold mb-4">Server Load %</p>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={METRICS.serverLoad} layout="vertical">
              <CartesianGrid stroke="rgba(255,255,255,0.05)" horizontal={false} />
              <XAxis type="number" tick={{ fill: '#666', fontSize: 11 }} tickLine={false} axisLine={false} domain={[0, 100]} />
              <YAxis type="category" dataKey="name" tick={{ fill: '#aaa', fontSize: 11 }} tickLine={false} axisLine={false} width={90} />
              <Tooltip {...tooltipStyle} formatter={(v) => [`${v}%`, 'Load']} />
              <Bar dataKey="load" radius={4} fill="hsl(0,84%,60%)" opacity={0.85} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Top servers table */}
        <div className="bg-card border border-white/10 rounded-2xl p-5">
          <p className="text-sm font-semibold mb-4">Top Servers by Connections</p>
          <div className="flex flex-col gap-2">
            {topServers.map((s, i) => (
              <div key={s.id} className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground w-4">{i + 1}</span>
                <span className="text-base">{s.flag}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{s.name}</p>
                  <div className="w-full h-1 bg-white/10 rounded-full mt-1">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${s.load}%`, opacity: 0.8 }} />
                  </div>
                </div>
                <span className="text-sm font-semibold text-right w-16 text-muted-foreground">{s.connections.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
