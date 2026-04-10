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

const PLAN_COLORS: Record<string, string> = {
  free:     'text-zinc-400 border-zinc-500/30 bg-zinc-500/10',
  pro:      'text-blue-400 border-blue-500/30 bg-blue-500/10',
  business: 'text-green-400 border-green-500/30 bg-green-500/10',
};

interface PlanSelectorProps {
  userId: string;
  currentPlan: string;
  onChange: (id: string, plan: string) => void;
}

function PlanSelector({ userId, currentPlan, onChange }: PlanSelectorProps) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  async function select(plan: string) {
    if (plan === currentPlan) { setOpen(false); return; }
    setSaving(true);
    try {
      await adminApi.setUserPlan(userId, plan);
      onChange(userId, plan);
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Error');
    } finally {
      setSaving(false);
      setOpen(false);
    }
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        disabled={saving}
        className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium border transition-all capitalize
          ${PLAN_COLORS[currentPlan] ?? PLAN_COLORS.free}
          ${saving ? 'opacity-50' : 'hover:opacity-80'}`}
      >
        {saving
          ? <span className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
          : currentPlan
        }
        <Icon name="ChevronDown" size={10} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full mt-1 z-20 bg-card border border-white/15 rounded-xl shadow-xl overflow-hidden min-w-[110px]">
            {(['free', 'pro', 'business'] as const).map(p => (
              <button
                key={p}
                onClick={() => select(p)}
                className={`w-full text-left px-3 py-2 text-xs font-medium capitalize transition-colors hover:bg-white/10 flex items-center gap-2
                  ${p === currentPlan ? 'text-foreground bg-white/5' : 'text-muted-foreground'}`}
              >
                <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${p === 'free' ? 'bg-zinc-400' : p === 'pro' ? 'bg-blue-400' : 'bg-green-400'}`} />
                {p}
                {p === currentPlan && <Icon name="Check" size={10} className="ml-auto" />}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

const planBadge = (p: string) => {
  const map: Record<string, 'neutral' | 'info' | 'success'> = { free: 'neutral', pro: 'info', business: 'success' };
  return <Badge variant={map[p] ?? 'neutral'}>{p}</Badge>;
};

const statusBadge = (s: string) => {
  const map: Record<string, 'success' | 'error' | 'warning' | 'neutral'> = { active: 'success', blocked: 'error', expired: 'warning' };
  return <Badge variant={map[s] ?? 'neutral'}>{s}</Badge>;
};

// --- Create User Modal ---
interface CreateUserModalProps {
  onClose: () => void;
  onCreated: () => void;
}

function CreateUserModal({ onClose, onCreated }: CreateUserModalProps) {
  const [form, setForm] = useState({ name: '', email: '', password: '', plan: 'free' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  function set(k: string, v: string) {
    setForm(f => ({ ...f, [k]: v }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await adminApi.createUser(form);
      onCreated();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error creating user');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-md bg-card border border-white/15 rounded-2xl shadow-2xl p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-lg font-semibold">Create User</h2>
            <p className="text-xs text-muted-foreground mt-0.5">New account will be added to the system</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-all">
            <Icon name="X" size={14} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Name */}
          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block">Full Name</label>
            <div className="relative">
              <Icon name="User" size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="John Doe"
                value={form.name}
                onChange={e => set('name', e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-sm outline-none focus:border-primary/50 transition-colors placeholder:text-muted-foreground"
              />
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block">Email <span className="text-red-400">*</span></label>
            <div className="relative">
              <Icon name="Mail" size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="email"
                placeholder="user@example.com"
                value={form.email}
                onChange={e => set('email', e.target.value)}
                required
                className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-sm outline-none focus:border-primary/50 transition-colors placeholder:text-muted-foreground"
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block">Password <span className="text-red-400">*</span></label>
            <div className="relative">
              <Icon name="Lock" size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="password"
                placeholder="Min. 6 characters"
                value={form.password}
                onChange={e => set('password', e.target.value)}
                required
                minLength={6}
                className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-sm outline-none focus:border-primary/50 transition-colors placeholder:text-muted-foreground"
              />
            </div>
          </div>

          {/* Plan */}
          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block">Subscription Plan</label>
            <div className="flex gap-2">
              {(['free', 'pro', 'business'] as const).map(p => (
                <button
                  key={p}
                  type="button"
                  onClick={() => set('plan', p)}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-medium border transition-all capitalize
                    ${form.plan === p
                      ? 'bg-primary/20 border-primary/50 text-primary'
                      : 'bg-white/5 border-white/10 text-muted-foreground hover:border-white/20'
                    }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
              <Icon name="AlertCircle" size={14} />
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-xl bg-white/5 border border-white/10 text-sm font-medium hover:bg-white/10 transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-3 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Creating...</>
              ) : (
                <><Icon name="UserPlus" size={14} /> Create User</>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// --- Main Page ---
export default function AdminUsers() {
  const [users, setUsers] = useState<ApiUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [plan, setPlan] = useState<PlanFilter>('all');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [showCreate, setShowCreate] = useState(false);

  function loadUsers() {
    setLoading(true);
    adminApi.getUsers()
      .then(setUsers)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => { loadUsers(); }, []);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return users.filter(u =>
      (plan === 'all' || u.plan === plan) &&
      (status === 'all' || u.status === status) &&
      (u.email.toLowerCase().includes(q) || u.name.toLowerCase().includes(q))
    );
  }, [users, query, plan, status]);

  function updatePlan(id: string, newPlan: string) {
    setUsers(prev => prev.map(u => u.id === id ? { ...u, plan: newPlan } : u));
  }

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
      {showCreate && (
        <CreateUserModal
          onClose={() => setShowCreate(false)}
          onCreated={loadUsers}
        />
      )}

      <PageHeader
        title="Users"
        description={loading ? 'Loading...' : `${users.length} total · ${users.filter(u => u.status === 'active').length} active`}
        actions={
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition-all active:scale-95"
          >
            <Icon name="UserPlus" size={15} />
            Add User
          </button>
        }
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
                  <th className="px-4 py-3.5 w-24" />
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
                    <td className="px-4 py-4">
                      {user.is_admin
                        ? planBadge(user.plan)
                        : <PlanSelector userId={user.id} currentPlan={user.plan} onChange={updatePlan} />
                      }
                    </td>
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
          <div className="py-16 text-center">
            <p className="text-muted-foreground mb-3">No users match your filters</p>
            <button
              onClick={() => setShowCreate(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary/10 border border-primary/30 text-primary text-sm font-medium hover:bg-primary/20 transition-all"
            >
              <Icon name="UserPlus" size={14} />
              Create first user
            </button>
          </div>
        )}
      </div>
    </div>
  );
}