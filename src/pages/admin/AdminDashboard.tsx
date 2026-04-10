import { useEffect, useState } from 'react';
import { adminApi, DashboardData } from '@/lib/admin-api';
import { StatCard } from '@/components/admin/StatCard';
import { PageHeader } from '@/components/admin/PageHeader';
import { Badge } from '@/components/admin/Badge';
import Icon from '@/components/ui/icon';
import {
  BarChart, Bar, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';

const tooltip = {
  contentStyle: { background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, fontSize: 12 },
  labelStyle: { color: '#888' },
  cursor: { fill: 'rgba(255,255,255,0.04)' },
};

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function getLoadColor(load: number) {
  if (load >= 80) return '#f87171';
  if (load >= 60) return '#facc15';
  return 'hsl(0,84%,60%)';
}

function LoadingCard() {
  return <div className="bg-card border border-white/10 rounded-2xl p-5 animate-pulse h-32" />;
}

export default function AdminDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    adminApi.getDashboard()
      .then(setData)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const refresh = () => {
    setLoading(true);
    setError('');
    adminApi.getDashboard()
      .then(setData)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <PageHeader
        title="Dashboard"
        description={`Live · ${new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}`}
        actions={
          <button onClick={refresh} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 transition-all text-sm text-muted-foreground hover:text-foreground">
            <Icon name="RefreshCw" size={14} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        }
      />

      {error && (
        <div className="flex items-center gap-2 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm mb-5">
          <Icon name="AlertCircle" size={16} />
          {error}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {loading ? (
          Array.from({length: 4}).map((_, i) => <LoadingCard key={i} />)
        ) : data ? (
          <>
            <StatCard
              label="Total Users"
              value={data.stats.total_users}
              icon="Users"
              accent="default"
              trend={{ value: `+${data.stats.new_users_week} this week`, up: data.stats.new_users_week > 0 }}
            />
            <StatCard
              label="Active Connections"
              value={data.stats.active_connections}
              icon="Wifi"
              accent="green"
            />
            <StatCard
              label="Servers Online"
              value={`${data.stats.online_servers}/${data.stats.total_servers}`}
              icon="Server"
              accent="blue"
              trend={{ value: `avg ${data.stats.avg_load}% load`, up: data.stats.avg_load < 70 }}
            />
            <StatCard
              label="Errors 24h"
              value={data.stats.errors_24h}
              icon="AlertTriangle"
              accent={data.stats.errors_24h > 0 ? 'red' : 'green'}
            />
          </>
        ) : null}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
        {/* Activity chart */}
        <div className="lg:col-span-2 bg-card border border-white/10 rounded-2xl p-5">
          <p className="text-sm font-semibold mb-1">Activity — last 24h</p>
          <p className="text-xs text-muted-foreground mb-4">Events from audit log</p>
          {loading ? (
            <div className="h-48 bg-white/5 rounded-xl animate-pulse" />
          ) : (
            <ResponsiveContainer width="100%" height={190}>
              <AreaChart data={data?.charts.activity ?? []}>
                <defs>
                  <linearGradient id="actGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(0,84%,60%)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(0,84%,60%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="time" tick={{ fill: '#666', fontSize: 11 }} tickLine={false} axisLine={false} interval={3} />
                <YAxis tick={{ fill: '#666', fontSize: 11 }} tickLine={false} axisLine={false} width={25} allowDecimals={false} />
                <Tooltip {...tooltip} formatter={(v) => [v, 'Events']} />
                <Area type="monotone" dataKey="events" stroke="hsl(0,84%,60%)" fill="url(#actGrad)" strokeWidth={2} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Plans breakdown */}
        <div className="bg-card border border-white/10 rounded-2xl p-5">
          <p className="text-sm font-semibold mb-1">Plans</p>
          <p className="text-xs text-muted-foreground mb-4">Subscription breakdown</p>
          {loading ? (
            <div className="h-48 bg-white/5 rounded-xl animate-pulse" />
          ) : (
            <div className="flex flex-col gap-3 mt-2">
              {(data?.charts.plans ?? []).map((p, i) => {
                const colors = ['#60a5fa', 'hsl(0,84%,60%)', '#34d399'];
                const total = (data?.charts.plans ?? []).reduce((a, x) => a + x.value, 0);
                const pct = total > 0 ? Math.round((p.value / total) * 100) : 0;
                return (
                  <div key={p.name}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-muted-foreground">{p.name}</span>
                      <span className="text-sm font-semibold">{p.value} <span className="text-xs text-muted-foreground">({pct}%)</span></span>
                    </div>
                    <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: colors[i] }} />
                    </div>
                  </div>
                );
              })}
              {data?.stats.total_users === 0 && (
                <p className="text-xs text-muted-foreground text-center py-4">No users yet</p>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        {/* Server Load */}
        <div className="bg-card border border-white/10 rounded-2xl p-5">
          <p className="text-sm font-semibold mb-1">Server Load %</p>
          <p className="text-xs text-muted-foreground mb-4">Current load per server</p>
          {loading ? (
            <div className="h-44 bg-white/5 rounded-xl animate-pulse" />
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={data?.charts.server_load ?? []} layout="vertical">
                <CartesianGrid stroke="rgba(255,255,255,0.05)" horizontal={false} />
                <XAxis type="number" tick={{ fill: '#666', fontSize: 11 }} tickLine={false} axisLine={false} domain={[0, 100]} unit="%" />
                <YAxis type="category" dataKey="name" tick={{ fill: '#aaa', fontSize: 11 }} tickLine={false} axisLine={false} width={90} />
                <Tooltip {...tooltip} formatter={(v) => [`${v}%`, 'Load']} />
                <Bar dataKey="load" radius={4}>
                  {(data?.charts.server_load ?? []).map((entry, i) => (
                    <Cell key={i} fill={getLoadColor(entry.load)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Server Latency */}
        <div className="bg-card border border-white/10 rounded-2xl p-5">
          <p className="text-sm font-semibold mb-1">Latency by Server</p>
          <p className="text-xs text-muted-foreground mb-4">Milliseconds (lower is better)</p>
          {loading ? (
            <div className="h-44 bg-white/5 rounded-xl animate-pulse" />
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={data?.charts.server_latency ?? []} layout="vertical">
                <CartesianGrid stroke="rgba(255,255,255,0.05)" horizontal={false} />
                <XAxis type="number" tick={{ fill: '#666', fontSize: 11 }} tickLine={false} axisLine={false} unit="ms" />
                <YAxis type="category" dataKey="name" tick={{ fill: '#aaa', fontSize: 11 }} tickLine={false} axisLine={false} width={90} />
                <Tooltip {...tooltip} formatter={(v) => [`${v}ms`, 'Latency']} />
                <Bar dataKey="latency" radius={4} fill="#60a5fa" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Servers table */}
        <div className="bg-card border border-white/10 rounded-2xl p-5">
          <p className="text-sm font-semibold mb-4">Servers — Live Status</p>
          {loading ? (
            <div className="space-y-2">
              {Array.from({length: 5}).map((_, i) => <div key={i} className="h-10 bg-white/5 rounded-xl animate-pulse" />)}
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {(data?.servers ?? []).map(s => (
                <div key={s.id} className="flex items-center gap-3 py-2 border-b border-white/5 last:border-0">
                  <span className="text-lg">{s.flag}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{s.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <div className="w-16 h-1 bg-white/10 rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${s.load}%`, backgroundColor: getLoadColor(s.load) }} />
                      </div>
                      <span className="text-[10px] text-muted-foreground">{s.load}%</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-xs font-mono font-semibold ${s.latency < 50 ? 'text-green-400' : s.latency < 100 ? 'text-yellow-400' : 'text-red-400'}`}>
                      {s.latency}ms
                    </p>
                    <p className="text-[10px] text-muted-foreground">{s.uptime}% up</p>
                  </div>
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${s.status === 'online' ? 'bg-green-400' : s.status === 'maintenance' ? 'bg-yellow-400' : 'bg-red-500'}`} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent logs */}
        <div className="bg-card border border-white/10 rounded-2xl p-5">
          <p className="text-sm font-semibold mb-4">Recent Activity</p>
          {loading ? (
            <div className="space-y-2">
              {Array.from({length: 5}).map((_, i) => <div key={i} className="h-10 bg-white/5 rounded-xl animate-pulse" />)}
            </div>
          ) : (data?.recent_logs ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No activity yet</p>
          ) : (
            <div className="flex flex-col gap-3">
              {(data?.recent_logs ?? []).map((log, i) => (
                <div key={i} className="flex items-start gap-3 py-2 border-b border-white/5 last:border-0">
                  <div className="w-7 h-7 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Icon name={log.action.includes('login') ? 'LogIn' : log.action.includes('error') ? 'AlertTriangle' : 'Activity'} fallback="Circle" size={12} className="text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium capitalize">{log.action.replace(/_/g, ' ')}</p>
                    <p className="text-xs text-muted-foreground truncate">{log.user ?? log.ip ?? '—'}</p>
                  </div>
                  <span className="text-[10px] text-muted-foreground whitespace-nowrap">{timeAgo(log.timestamp)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
