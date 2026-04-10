import { useState, useMemo } from 'react';
import { MOCK_LOGS, LogEntry } from '@/lib/admin-data';
import { PageHeader } from '@/components/admin/PageHeader';
import { Badge } from '@/components/admin/Badge';
import { SearchInput } from '@/components/admin/SearchInput';

type TypeFilter = 'all' | LogEntry['type'];
type LevelFilter = 'all' | LogEntry['level'];

function timeLabel(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

const levelVariant = (l: LogEntry['level']) => {
  const m = { info: 'info', warn: 'warning', error: 'error' } as const;
  return m[l];
};

const typeVariant = (t: LogEntry['type']) => {
  const m = { connection: 'success', error: 'error', auth: 'warning', admin: 'neutral' } as const;
  return m[t];
};

const levelDot = { info: 'bg-blue-400', warn: 'bg-yellow-400', error: 'bg-red-400' };

export default function AdminLogs() {
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [levelFilter, setLevelFilter] = useState<LevelFilter>('all');

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return MOCK_LOGS.filter(l =>
      (typeFilter === 'all' || l.type === typeFilter) &&
      (levelFilter === 'all' || l.level === levelFilter) &&
      (l.message.toLowerCase().includes(q) || (l.user?.toLowerCase().includes(q)) || (l.ip?.includes(q)))
    );
  }, [query, typeFilter, levelFilter]);

  const errorCount = MOCK_LOGS.filter(l => l.level === 'error').length;
  const warnCount = MOCK_LOGS.filter(l => l.level === 'warn').length;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <PageHeader
        title="Logs"
        description={`${MOCK_LOGS.length} entries · ${errorCount} errors · ${warnCount} warnings`}
      />

      {/* Summary pills */}
      <div className="flex gap-3 mb-5">
        {[
          { label: 'Errors', count: errorCount, color: 'text-red-400 bg-red-500/10 border-red-500/30' },
          { label: 'Warnings', count: warnCount, color: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30' },
          { label: 'Auth events', count: MOCK_LOGS.filter(l => l.type === 'auth').length, color: 'text-blue-400 bg-blue-500/10 border-blue-500/30' },
        ].map(p => (
          <div key={p.label} className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-medium ${p.color}`}>
            <span className="text-lg font-bold">{p.count}</span>
            <span className="text-xs opacity-80">{p.label}</span>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <SearchInput value={query} onChange={setQuery} placeholder="Search message, user, IP..." />

        <div className="flex gap-1 bg-white/5 border border-white/10 rounded-xl p-1">
          {(['all', 'connection', 'auth', 'error', 'admin'] as TypeFilter[]).map(t => (
            <button key={t} onClick={() => setTypeFilter(t)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all capitalize ${typeFilter === t ? 'bg-primary/20 text-primary border border-primary/30' : 'text-muted-foreground hover:text-foreground'}`}
            >{t}</button>
          ))}
        </div>

        <div className="flex gap-1 bg-white/5 border border-white/10 rounded-xl p-1">
          {(['all', 'info', 'warn', 'error'] as LevelFilter[]).map(l => (
            <button key={l} onClick={() => setLevelFilter(l)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all capitalize ${levelFilter === l ? 'bg-primary/20 text-primary border border-primary/30' : 'text-muted-foreground hover:text-foreground'}`}
            >{l}</button>
          ))}
        </div>

        <span className="text-xs text-muted-foreground ml-auto">{filtered.length} entries</span>
      </div>

      {/* Log list */}
      <div className="bg-card border border-white/10 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm font-space-mono">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left px-5 py-3.5 text-xs text-muted-foreground font-sans font-medium uppercase tracking-wider w-8" />
                <th className="text-left px-3 py-3.5 text-xs text-muted-foreground font-sans font-medium uppercase tracking-wider">Timestamp</th>
                <th className="text-left px-3 py-3.5 text-xs text-muted-foreground font-sans font-medium uppercase tracking-wider hidden md:table-cell">Type</th>
                <th className="text-left px-3 py-3.5 text-xs text-muted-foreground font-sans font-medium uppercase tracking-wider">Message</th>
                <th className="text-left px-3 py-3.5 text-xs text-muted-foreground font-sans font-medium uppercase tracking-wider hidden lg:table-cell">IP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filtered.map(log => (
                <tr key={log.id} className={`hover:bg-white/3 transition-colors ${log.level === 'error' ? 'bg-red-500/3' : log.level === 'warn' ? 'bg-yellow-500/3' : ''}`}>
                  <td className="px-5 py-3">
                    <span className={`w-2 h-2 rounded-full inline-block ${levelDot[log.level]}`} />
                  </td>
                  <td className="px-3 py-3 text-xs text-muted-foreground whitespace-nowrap">{timeLabel(log.timestamp)}</td>
                  <td className="px-3 py-3 hidden md:table-cell">
                    <Badge variant={typeVariant(log.type)}>{log.type}</Badge>
                  </td>
                  <td className="px-3 py-3 text-xs text-foreground max-w-xs truncate">{log.message}</td>
                  <td className="px-3 py-3 text-xs text-muted-foreground hidden lg:table-cell">{log.ip ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && (
          <div className="py-16 text-center text-muted-foreground font-sans">No logs match your filters</div>
        )}
      </div>
    </div>
  );
}
