import { useState, useMemo, useEffect } from 'react';
import { Server, api } from '@/lib/api';
import Icon from '@/components/ui/icon';

interface ServersScreenProps {
  selected: Server;
  onSelect: (server: Server) => void;
  onBack: () => void;
  plan?: string;
  onUpgrade?: () => void;
}

type SortKey = 'latency' | 'load';

export function ServersScreen({ selected, onSelect, onBack, plan = 'free', onUpgrade }: ServersScreenProps) {
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<SortKey>('latency');
  const [servers, setServers] = useState<Server[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.listServers()
      .then(s => setServers(s))
      .catch(() => setServers([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return servers
      .filter(s => s.name.toLowerCase().includes(q) || (s.city?.toLowerCase().includes(q)))
      .sort((a, b) => a[sort] - b[sort]);
  }, [query, sort, servers]);

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

  function isLocked(server: Server, index: number): boolean {
    if (plan === 'premium' || plan === 'pro') return false;
    if (server.recommended) return false;
    return index > 0;
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <div className="flex items-center gap-3 px-5 pt-14 pb-4">
        <button onClick={onBack} className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center active:scale-90 transition-transform">
          <Icon name="ArrowLeft" size={18} />
        </button>
        <h1 className="text-xl font-display font-bold flex-1">Серверы</h1>
        <button
          onClick={() => {
            const rec = servers.find(s => s.recommended && s.online && s.available);
            if (rec) { onSelect(rec); onBack(); }
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary/20 border border-primary/30 text-primary text-sm font-medium"
        >
          <Icon name="Zap" size={14} />
          Лучший
        </button>
      </div>

      {plan === 'free' && (
        <button onClick={onUpgrade} className="mx-5 mb-3 p-3 rounded-2xl bg-gradient-to-r from-primary/20 to-blue-500/20 border border-primary/30 flex items-center gap-3 active:scale-95 transition-all">
          <div className="w-8 h-8 rounded-xl bg-primary/20 flex items-center justify-center flex-shrink-0">
            <Icon name="Lock" size={14} className="text-primary" />
          </div>
          <div className="flex-1 text-left">
            <p className="text-sm font-semibold text-primary">Разблокировать все серверы</p>
            <p className="text-xs text-muted-foreground">Premium от 199 ₽/мес</p>
          </div>
          <Icon name="ChevronRight" size={16} className="text-primary" />
        </button>
      )}

      <div className="px-5 pb-3">
        <div className="relative">
          <Icon name="Search" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Поиск по стране, городу..."
            className="w-full bg-white/5 border border-white/10 rounded-2xl pl-9 pr-4 py-3 text-sm outline-none focus:border-primary/50 transition-colors placeholder:text-muted-foreground"
          />
        </div>
      </div>

      <div className="flex gap-2 px-5 pb-4">
        {(['latency', 'load'] as SortKey[]).map(key => (
          <button
            key={key}
            onClick={() => setSort(key)}
            className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all ${
              sort === key ? 'bg-primary/20 border border-primary/50 text-primary' : 'bg-white/5 border border-white/10 text-muted-foreground'
            }`}
          >
            По {key === 'latency' ? 'задержке' : 'нагрузке'}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-8 flex flex-col gap-2">
        {loading && (
          <div className="flex items-center justify-center py-10">
            <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
        )}
        {!loading && filtered.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-10">Серверы не найдены</p>
        )}
        {!loading && filtered.map((server, index) => {
          const locked = isLocked(server, index);
          const unavailable = !server.available;
          return (
            <button
              key={server.id}
              onClick={() => {
                if (locked) { onUpgrade?.(); return; }
                if (!server.online || unavailable) return;
                onSelect(server);
                onBack();
              }}
              className={`flex items-center gap-3 p-4 rounded-2xl border transition-all text-left relative overflow-hidden
                ${selected.id === server.id && !locked ? 'bg-primary/10 border-primary/50' : 'bg-white/5 border-white/10 hover:border-white/20'}
                ${(!server.online || unavailable) && !locked ? 'opacity-40' : ''}
                ${locked ? 'opacity-60' : 'active:scale-[0.98]'}
              `}
            >
              {locked && (
                <div className="absolute inset-0 bg-background/40 backdrop-blur-[1px] flex items-center justify-end pr-4 rounded-2xl">
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary/20 border border-primary/30">
                    <Icon name="Lock" size={12} className="text-primary" />
                    <span className="text-xs text-primary font-medium">Premium</span>
                  </div>
                </div>
              )}
              {!locked && unavailable && (
                <div className="absolute top-1 right-2">
                  <span className="text-[9px] px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-400 font-medium">Скоро</span>
                </div>
              )}
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

              <div className="flex flex-col items-end gap-1 min-w-[60px]">
                <span className={`text-sm font-semibold font-space-mono ${getLatencyColor(server.latency)}`}>
                  {server.latency}ms
                </span>
                <div className="w-12 h-1.5 rounded-full bg-white/10 overflow-hidden">
                  <div className={`h-full rounded-full ${getLoadColor(server.load)}`} style={{ width: `${server.load}%` }} />
                </div>
              </div>

              <div className={`w-2 h-2 rounded-full flex-shrink-0 ${server.online ? 'bg-green-400' : 'bg-zinc-600'}`} />
            </button>
          );
        })}
      </div>
    </div>
  );
}
