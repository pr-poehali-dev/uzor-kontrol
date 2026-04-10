import { useState } from 'react';
import { MOCK_ADMIN_SERVERS, AdminServer } from '@/lib/admin-data';
import { PageHeader } from '@/components/admin/PageHeader';
import { Badge } from '@/components/admin/Badge';
import { SearchInput } from '@/components/admin/SearchInput';
import Icon from '@/components/ui/icon';

type StatusFilter = 'all' | 'online' | 'offline' | 'maintenance';

function LoadBar({ value }: { value: number }) {
  const color = value >= 80 ? 'bg-red-500' : value >= 60 ? 'bg-yellow-500' : 'bg-green-500';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden w-20">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${value}%` }} />
      </div>
      <span className="text-xs text-muted-foreground w-8 text-right">{value}%</span>
    </div>
  );
}

const statusVariant = (s: AdminServer['status']) => {
  const map = { online: 'success', offline: 'error', maintenance: 'warning' } as const;
  return map[s];
};

export default function AdminServers() {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<StatusFilter>('all');
  const [servers, setServers] = useState<AdminServer[]>(MOCK_ADMIN_SERVERS);

  const filtered = servers.filter(s =>
    (filter === 'all' || s.status === filter) &&
    (s.name.toLowerCase().includes(query.toLowerCase()) || s.country.toLowerCase().includes(query.toLowerCase()) || s.city.toLowerCase().includes(query.toLowerCase()))
  );

  function toggleStatus(id: string) {
    setServers(prev => prev.map(s => {
      if (s.id !== id) return s;
      if (s.status === 'online') return { ...s, status: 'maintenance', connections: 0, load: 0, bandwidth: 0 };
      if (s.status === 'maintenance') return { ...s, status: 'online', load: Math.floor(Math.random() * 40 + 10) };
      return { ...s, status: 'online' };
    }));
  }

  const onlineCount = servers.filter(s => s.status === 'online').length;
  const totalConn = servers.reduce((a, s) => a + s.connections, 0);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <PageHeader
        title="Servers"
        description={`${onlineCount} online · ${totalConn.toLocaleString()} total connections`}
      />

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <SearchInput value={query} onChange={setQuery} placeholder="Search server, country..." />
        <div className="flex gap-1 bg-white/5 border border-white/10 rounded-xl p-1">
          {(['all', 'online', 'maintenance', 'offline'] as StatusFilter[]).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all capitalize ${filter === f ? 'bg-primary/20 text-primary border border-primary/30' : 'text-muted-foreground hover:text-foreground'}`}
            >{f}</button>
          ))}
        </div>
        <span className="text-xs text-muted-foreground ml-auto">{filtered.length} servers</span>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map(server => (
          <div key={server.id} className="bg-card border border-white/10 rounded-2xl p-5 flex flex-col gap-4 hover:border-white/20 transition-all">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{server.flag}</span>
                <div>
                  <p className="font-semibold text-sm">{server.name}</p>
                  <p className="text-xs text-muted-foreground">{server.city}, {server.country}</p>
                </div>
              </div>
              <Badge variant={statusVariant(server.status)}>{server.status}</Badge>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="bg-white/5 rounded-xl p-3">
                <p className="text-xs text-muted-foreground mb-1">Latency</p>
                <p className={`font-semibold font-space-mono ${server.latency === 0 ? 'text-muted-foreground' : server.latency < 50 ? 'text-green-400' : server.latency < 100 ? 'text-yellow-400' : 'text-red-400'}`}>
                  {server.latency > 0 ? `${server.latency}ms` : '—'}
                </p>
              </div>
              <div className="bg-white/5 rounded-xl p-3">
                <p className="text-xs text-muted-foreground mb-1">Uptime</p>
                <p className={`font-semibold font-space-mono ${server.uptime >= 99 ? 'text-green-400' : server.uptime >= 97 ? 'text-yellow-400' : 'text-red-400'}`}>
                  {server.uptime}%
                </p>
              </div>
              <div className="bg-white/5 rounded-xl p-3">
                <p className="text-xs text-muted-foreground mb-1">Connections</p>
                <p className="font-semibold font-space-mono">{server.connections.toLocaleString()}</p>
              </div>
              <div className="bg-white/5 rounded-xl p-3">
                <p className="text-xs text-muted-foreground mb-1">Bandwidth</p>
                <p className="font-semibold font-space-mono text-blue-400">{server.bandwidth > 0 ? `${server.bandwidth} GB/s` : '—'}</p>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-muted-foreground">Load</span>
              </div>
              <LoadBar value={server.load} />
            </div>

            <div className="flex items-center justify-between pt-1 border-t border-white/5">
              <span className="text-xs text-muted-foreground font-space-mono">{server.ip}</span>
              <button
                onClick={() => toggleStatus(server.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all active:scale-95
                  ${server.status === 'online'
                    ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30 hover:bg-yellow-500/20'
                    : 'bg-green-500/10 text-green-400 border-green-500/30 hover:bg-green-500/20'
                  }`}
              >
                <Icon name={server.status === 'online' ? 'Pause' : 'Play'} size={12} />
                {server.status === 'online' ? 'Disable' : 'Enable'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
