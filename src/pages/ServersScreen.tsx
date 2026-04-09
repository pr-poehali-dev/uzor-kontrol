import { useState, useMemo } from 'react';
import { Server, MOCK_SERVERS } from '@/lib/api';
import Icon from '@/components/ui/icon';

interface ServersScreenProps {
  selected: Server;
  onSelect: (server: Server) => void;
  onBack: () => void;
}

type SortKey = 'latency' | 'load';

export function ServersScreen({ selected, onSelect, onBack }: ServersScreenProps) {
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<SortKey>('latency');

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return MOCK_SERVERS
      .filter(s => s.name.toLowerCase().includes(q) || s.country.toLowerCase().includes(q) || s.city.toLowerCase().includes(q))
      .sort((a, b) => a[sort] - b[sort]);
  }, [query, sort]);

  function getLatencyColor(ms: number) {
    if (ms < 50) return 'text-green-400';
    if (ms < 100) return 'text-yellow-400';
    return 'text-red-400';
  }

  function getLoadColor(load: number) {
    if (load < 40) return 'bg-green-500';
    if (load < 70) return 'bg-yellow-500';
    return 'bg-red-500';
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 pt-14 pb-4">
        <button onClick={onBack} className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center active:scale-90 transition-transform">
          <Icon name="ArrowLeft" size={18} />
        </button>
        <h1 className="text-xl font-display font-bold flex-1">Select Server</h1>
        <button
          onClick={() => {
            const rec = MOCK_SERVERS.find(s => s.recommended && s.online);
            if (rec) { onSelect(rec); onBack(); }
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary/20 border border-primary/30 text-primary text-sm font-medium"
        >
          <Icon name="Zap" size={14} />
          Best
        </button>
      </div>

      {/* Search */}
      <div className="px-5 pb-3">
        <div className="relative">
          <Icon name="Search" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search country, city..."
            className="w-full bg-white/5 border border-white/10 rounded-2xl pl-9 pr-4 py-3 text-sm outline-none focus:border-primary/50 transition-colors placeholder:text-muted-foreground"
          />
        </div>
      </div>

      {/* Sort */}
      <div className="flex gap-2 px-5 pb-4">
        {(['latency', 'load'] as SortKey[]).map(key => (
          <button
            key={key}
            onClick={() => setSort(key)}
            className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all ${
              sort === key ? 'bg-primary/20 border border-primary/50 text-primary' : 'bg-white/5 border border-white/10 text-muted-foreground'
            }`}
          >
            Sort by {key === 'latency' ? 'Latency' : 'Load'}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-5 pb-8 flex flex-col gap-2">
        {filtered.map(server => (
          <button
            key={server.id}
            onClick={() => { onSelect(server); onBack(); }}
            disabled={!server.online}
            className={`flex items-center gap-3 p-4 rounded-2xl border transition-all active:scale-98 text-left
              ${selected.id === server.id ? 'bg-primary/10 border-primary/50' : 'bg-white/5 border-white/10 hover:border-white/20'}
              ${!server.online ? 'opacity-40 cursor-not-allowed' : ''}
            `}
          >
            <span className="text-2xl">{server.flag}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm truncate">{server.name}</span>
                {server.recommended && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/20 text-primary font-medium">REC</span>
                )}
              </div>
              <span className="text-xs text-muted-foreground">{server.city}</span>
            </div>

            {/* Load bar */}
            <div className="flex flex-col items-end gap-1 min-w-[60px]">
              <span className={`text-sm font-semibold font-space-mono ${getLatencyColor(server.latency)}`}>
                {server.latency}ms
              </span>
              <div className="w-12 h-1.5 rounded-full bg-white/10 overflow-hidden">
                <div className={`h-full rounded-full ${getLoadColor(server.load)}`} style={{ width: `${server.load}%` }} />
              </div>
              <span className="text-[10px] text-muted-foreground">{server.load}% load</span>
            </div>

            {/* Online indicator */}
            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${server.online ? 'bg-green-400' : 'bg-zinc-600'}`} />
          </button>
        ))}
      </div>
    </div>
  );
}
