import { useState, useMemo, useEffect } from 'react';
import { adminApi, ApiLog } from '@/lib/admin-api';
import { PageHeader } from '@/components/admin/PageHeader';
import { Badge } from '@/components/admin/Badge';
import { SearchInput } from '@/components/admin/SearchInput';
import Icon from '@/components/ui/icon';

type ActionFilter = 'all' | string;

function timeLabel(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function getActionVariant(action: string): 'success' | 'error' | 'warning' | 'neutral' | 'info' {
  if (action.includes('login')) return 'info';
  if (action.includes('error') || action.includes('fail')) return 'error';
  if (action.includes('block')) return 'warning';
  if (action.includes('admin')) return 'neutral';
  return 'success';
}

const levelDot: Record<string, string> = {
  info: 'bg-blue-400',
  warn: 'bg-yellow-400',
  error: 'bg-red-400',
};

export default function AdminLogs() {
  const [logs, setLogs] = useState<ApiLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [actionFilter, setActionFilter] = useState<ActionFilter>('all');

  useEffect(() => {
    adminApi.getLogs()
      .then(setLogs)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const uniqueActions = useMemo(() => {
    const actions = [...new Set(logs.map(l => l.action))].sort();
    return ['all', ...actions];
  }, [logs]);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return logs.filter(l =>
      (actionFilter === 'all' || l.action === actionFilter) &&
      (l.action.toLowerCase().includes(q) ||
        (l.user?.toLowerCase().includes(q) ?? false) ||
        (l.ip?.includes(q) ?? false))
    );
  }, [logs, query, actionFilter]);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <PageHeader
        title="Logs"
        description={loading ? 'Loading...' : `${logs.length} entries in audit log`}
      />

      {/* Summary */}
      {!loading && logs.length > 0 && (
        <div className="flex gap-3 mb-5 flex-wrap">
          {[
            { label: 'Total entries', count: logs.length, color: 'text-foreground bg-white/5 border-white/10' },
            { label: 'Login events', count: logs.filter(l => l.action.includes('login')).length, color: 'text-blue-400 bg-blue-500/10 border-blue-500/30' },
            { label: 'Admin actions', count: logs.filter(l => l.action.includes('admin')).length, color: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30' },
          ].map(p => (
            <div key={p.label} className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-medium ${p.color}`}>
              <span className="text-lg font-bold">{p.count}</span>
              <span className="text-xs opacity-80">{p.label}</span>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <SearchInput value={query} onChange={setQuery} placeholder="Search action, user, IP..." />
        <div className="flex gap-1 bg-white/5 border border-white/10 rounded-xl p-1 flex-wrap">
          {uniqueActions.slice(0, 6).map(a => (
            <button key={a} onClick={() => setActionFilter(a)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all capitalize ${actionFilter === a ? 'bg-primary/20 text-primary border border-primary/30' : 'text-muted-foreground hover:text-foreground'}`}
            >{a}</button>
          ))}
        </div>
        <span className="text-xs text-muted-foreground ml-auto">{filtered.length} entries</span>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm mb-4">
          <Icon name="AlertCircle" size={16} />
          {error}
        </div>
      )}

      <div className="bg-card border border-white/10 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-muted-foreground flex flex-col items-center gap-3">
            <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            Loading logs...
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm font-space-mono">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left px-5 py-3.5 text-xs text-muted-foreground font-sans font-medium uppercase tracking-wider w-8" />
                  <th className="text-left px-3 py-3.5 text-xs text-muted-foreground font-sans font-medium uppercase tracking-wider">Timestamp</th>
                  <th className="text-left px-3 py-3.5 text-xs text-muted-foreground font-sans font-medium uppercase tracking-wider hidden md:table-cell">Action</th>
                  <th className="text-left px-3 py-3.5 text-xs text-muted-foreground font-sans font-medium uppercase tracking-wider hidden lg:table-cell">User</th>
                  <th className="text-left px-3 py-3.5 text-xs text-muted-foreground font-sans font-medium uppercase tracking-wider">Details</th>
                  <th className="text-left px-3 py-3.5 text-xs text-muted-foreground font-sans font-medium uppercase tracking-wider hidden lg:table-cell">IP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filtered.map(log => (
                  <tr key={log.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-5 py-3">
                      <span className={`w-2 h-2 rounded-full inline-block ${log.action.includes('error') || log.action.includes('fail') ? levelDot.error : levelDot.info}`} />
                    </td>
                    <td className="px-3 py-3 text-xs text-muted-foreground whitespace-nowrap">{timeLabel(log.timestamp)}</td>
                    <td className="px-3 py-3 hidden md:table-cell">
                      <Badge variant={getActionVariant(log.action)}>{log.action}</Badge>
                    </td>
                    <td className="px-3 py-3 text-xs text-muted-foreground hidden lg:table-cell truncate max-w-[160px]">{log.user ?? '—'}</td>
                    <td className="px-3 py-3 text-xs text-foreground max-w-xs truncate">
                      {log.resource || (log.meta && Object.keys(log.meta).length > 0 ? JSON.stringify(log.meta) : '—')}
                    </td>
                    <td className="px-3 py-3 text-xs text-muted-foreground hidden lg:table-cell">{log.ip ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {!loading && filtered.length === 0 && (
          <div className="py-16 text-center text-muted-foreground font-sans">No logs found</div>
        )}
      </div>
    </div>
  );
}
