import { METRICS, MOCK_ADMIN_SERVERS } from '@/lib/admin-data';
import { PageHeader } from '@/components/admin/PageHeader';
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';

const tooltip = {
  contentStyle: { background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, fontSize: 12 },
  labelStyle: { color: '#888' },
  cursor: { fill: 'rgba(255,255,255,0.03)' },
};

function ChartCard({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="bg-card border border-white/10 rounded-2xl p-5">
      <div className="mb-4">
        <p className="text-sm font-semibold">{title}</p>
        {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
      </div>
      {children}
    </div>
  );
}

const latencyData = MOCK_ADMIN_SERVERS
  .filter(s => s.status === 'online')
  .sort((a, b) => a.latency - b.latency)
  .map(s => ({ name: s.name.replace(' #1', ''), latency: s.latency, flag: s.flag }));

const uptimeData = MOCK_ADMIN_SERVERS
  .map(s => ({ name: s.name.replace(' #1', ''), uptime: s.uptime }))
  .sort((a, b) => b.uptime - a.uptime);

export default function AdminMetrics() {
  return (
    <div className="p-6 max-w-7xl mx-auto">
      <PageHeader
        title="Metrics"
        description="Performance overview across all servers"
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        {/* Connections 24h */}
        <ChartCard title="Active Connections" description="Last 24 hours">
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={METRICS.connectionsOverTime}>
              <defs>
                <linearGradient id="m_conn" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(0,84%,60%)" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="hsl(0,84%,60%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="time" tick={{ fill: '#666', fontSize: 11 }} tickLine={false} axisLine={false} interval={4} />
              <YAxis tick={{ fill: '#666', fontSize: 11 }} tickLine={false} axisLine={false} width={45} />
              <Tooltip {...tooltip} />
              <Area type="monotone" dataKey="value" stroke="hsl(0,84%,60%)" fill="url(#m_conn)" strokeWidth={2} dot={false} name="Connections" />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Errors 24h */}
        <ChartCard title="Errors" description="Last 24 hours">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={METRICS.errorsOverTime}>
              <CartesianGrid stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="time" tick={{ fill: '#666', fontSize: 11 }} tickLine={false} axisLine={false} interval={4} />
              <YAxis tick={{ fill: '#666', fontSize: 11 }} tickLine={false} axisLine={false} width={30} />
              <Tooltip {...tooltip} formatter={(v) => [v, 'Errors']} />
              <Bar dataKey="value" radius={4} fill="#f87171" name="Errors" opacity={0.85} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        {/* Latency per server */}
        <ChartCard title="Latency by Server" description="Milliseconds (lower is better)">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={latencyData} layout="vertical">
              <CartesianGrid stroke="rgba(255,255,255,0.05)" horizontal={false} />
              <XAxis type="number" tick={{ fill: '#666', fontSize: 11 }} tickLine={false} axisLine={false} unit="ms" />
              <YAxis type="category" dataKey="name" tick={{ fill: '#aaa', fontSize: 11 }} tickLine={false} axisLine={false} width={85} />
              <Tooltip {...tooltip} formatter={(v) => [`${v}ms`, 'Latency']} />
              <Bar dataKey="latency" radius={4} fill="#60a5fa" name="Latency" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Uptime */}
        <ChartCard title="Uptime by Server" description="Percentage over all time">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={uptimeData} layout="vertical">
              <CartesianGrid stroke="rgba(255,255,255,0.05)" horizontal={false} />
              <XAxis type="number" tick={{ fill: '#666', fontSize: 11 }} tickLine={false} axisLine={false} domain={[90, 100]} unit="%" />
              <YAxis type="category" dataKey="name" tick={{ fill: '#aaa', fontSize: 11 }} tickLine={false} axisLine={false} width={85} />
              <Tooltip {...tooltip} formatter={(v) => [`${v}%`, 'Uptime']} />
              <Bar dataKey="uptime" radius={4} fill="#34d399" name="Uptime" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Bandwidth */}
      <ChartCard title="Total Bandwidth GB/s" description="Last 24 hours">
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={METRICS.bandwidthOverTime}>
            <defs>
              <linearGradient id="m_bw" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#a78bfa" stopOpacity={0.35} />
                <stop offset="95%" stopColor="#a78bfa" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey="time" tick={{ fill: '#666', fontSize: 11 }} tickLine={false} axisLine={false} interval={3} />
            <YAxis tick={{ fill: '#666', fontSize: 11 }} tickLine={false} axisLine={false} width={35} />
            <Tooltip {...tooltip} formatter={(v) => [`${v} GB/s`, 'Bandwidth']} />
            <Area type="monotone" dataKey="value" stroke="#a78bfa" fill="url(#m_bw)" strokeWidth={2} dot={false} name="GB/s" />
          </AreaChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  );
}
