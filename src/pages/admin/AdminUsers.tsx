import { useState, useMemo, useEffect } from 'react';
import { adminApi, ApiUser } from '@/lib/admin-api';
import { PageHeader } from '@/components/admin/PageHeader';
import { Badge } from '@/components/admin/Badge';
import { SearchInput } from '@/components/admin/SearchInput';
import Icon from '@/components/ui/icon';

type PlanFilter = 'all' | 'free' | 'pro' | 'business';
type StatusFilter = 'all' | 'active' | 'blocked' | 'expired';

function formatDate(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function timeAgoLabel(iso: string | null) {
  if (!iso) return '—';
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

const planBadge = (p: string) => {
  const map: Record<string, 'neutral' | 'info' | 'success'> = { free: 'neutral', pro: 'info', business: 'success' };
  return <Badge variant={map[p] ?? 'neutral'}>{p}</Badge>;
};

const statusBadge = (s: string) => {
  const map: Record<string, 'success' | 'error' | 'warning' | 'neutral'> = { active: 'success', blocked: 'error', expired: 'warning' };
  return <Badge variant={map[s] ?? 'neutral'}>{s}</Badge>;
};

export default function AdminUsers() {
  const [users, setUsers] = useState<ApiUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [plan, setPlan] = useState<PlanFilter>('all');
  const [status, setStatus] = useState<StatusFilter>('all');

  useEffect(() => {
    adminApi.getUsers()
      .then(setUsers)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return users.filter(u =>
      (plan === 'all' || u.plan === plan) &&
      (status === 'all' || u.status === status) &&
      (u.email.toLowerCase().includes(q) || u.name.toLowerCase().includes(q))
    );
  }, [users, query, plan, status]);

  async function toggleBlock(user: ApiUser) {
    try {
      if (user.status === 'blocked') {
        await adminApi.unblockUser(user.id);
        setUsers(prev => prev.map(u => u.id === user.id ? { ...u, status: 'active' } : u));
      } else {
        await adminApi.blockUser(user.id);
        setUsers(prev => prev.map(u => u.id === user.id ? { ...u, status: 'blocked' } : u));
      }
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Error');
    }
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <PageHeader
        title="Users"
        description={loading ? 'Loading...' : `${users.length} total · ${users.filter(u => u.status === 'active').length} active`}
      />

      <div className="flex flex-wrap items-center gap-3 mb-5">
        <SearchInput value={query} onChange={setQuery} placeholder="Search by name, email..." />
        <div className="flex gap-1 bg-white/5 border border-white/10 rounded-xl p-1">
          {(['all', 'free', 'pro', 'business'] as PlanFilter[]).map(p => (
            <button key={p} onClick={() => setPlan(p)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all capitalize ${plan === p ? 'bg-primary/20 text-primary border border-primary/30' : 'text-muted-foreground hover:text-foreground'}`}
            >{p}</button>
          ))}
        </div>
        <div className="flex gap-1 bg-white/5 border border-white/10 rounded-xl p-1">
          {(['all', 'active', 'blocked', 'expired'] as StatusFilter[]).map(s => (
            <button key={s} onClick={() => setStatus(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all capitalize ${status === s ? 'bg-primary/20 text-primary border border-primary/30' : 'text-muted-foreground hover:text-foreground'}`}
            >{s}</button>
          ))}
        </div>
        <span className="text-xs text-muted-foreground ml-auto">{filtered.length} results</span>
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
            Loading users...
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left px-5 py-3.5 text-xs text-muted-foreground font-medium uppercase tracking-wider">User</th>
                  <th className="text-left px-4 py-3.5 text-xs text-muted-foreground font-medium uppercase tracking-wider">Plan</th>
                  <th className="text-left px-4 py-3.5 text-xs text-muted-foreground font-medium uppercase tracking-wider">Status</th>
                  <th className="text-left px-4 py-3.5 text-xs text-muted-foreground font-medium uppercase tracking-wider hidden md:table-cell">Registered</th>
                  <th className="text-left px-4 py-3.5 text-xs text-muted-foreground font-medium uppercase tracking-wider hidden lg:table-cell">Last seen</th>
                  <th className="text-left px-4 py-3.5 text-xs text-muted-foreground font-medium uppercase tracking-wider hidden lg:table-cell">Live</th>
                  <th className="px-4 py-3.5 w-10" />
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filtered.map(user => (
                  <tr key={user.id} className="hover:bg-white/[0.02] transition-colors group">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0 text-xs font-bold text-primary">
                          {user.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-foreground">{user.name}</p>
                          <p className="text-xs text-muted-foreground">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">{planBadge(user.plan)}</td>
                    <td className="px-4 py-4">{statusBadge(user.status)}</td>
                    <td className="px-4 py-4 text-muted-foreground hidden md:table-cell">{formatDate(user.registered_at)}</td>
                    <td className="px-4 py-4 text-muted-foreground hidden lg:table-cell">{timeAgoLabel(user.last_seen)}</td>
                    <td className="px-4 py-4 hidden lg:table-cell">
                      {user.active_connections > 0 ? (
                        <span className="flex items-center gap-1.5 text-green-400">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                          {user.active_connections}
                        </span>
                      ) : <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="px-4 py-4">
                      {!user.is_admin && (
                        <button
                          onClick={() => toggleBlock(user)}
                          className={`opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border
                            ${user.status === 'blocked'
                              ? 'bg-green-500/10 text-green-400 border-green-500/30 hover:bg-green-500/20'
                              : 'bg-red-500/10 text-red-400 border-red-500/30 hover:bg-red-500/20'
                            }`}
                        >
                          <Icon name={user.status === 'blocked' ? 'UserCheck' : 'UserX'} size={12} />
                          {user.status === 'blocked' ? 'Unblock' : 'Block'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {!loading && filtered.length === 0 && (
          <div className="py-16 text-center text-muted-foreground">No users match your filters</div>
        )}
      </div>
    </div>
  );
}
