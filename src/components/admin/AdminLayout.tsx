import { ReactNode, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import Icon from '@/components/ui/icon';
import { useAdminAuth } from '@/lib/admin-auth-context';

interface NavItem {
  path: string;
  icon: string;
  label: string;
}

const NAV: NavItem[] = [
  { path: '/admin', icon: 'LayoutDashboard', label: 'Dashboard' },
  { path: '/admin/users', icon: 'Users', label: 'Users' },
  { path: '/admin/servers', icon: 'Server', label: 'Servers' },
  { path: '/admin/metrics', icon: 'BarChart3', label: 'Metrics' },
  { path: '/admin/logs', icon: 'ScrollText', label: 'Logs' },
];

interface AdminLayoutProps {
  children: ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const { user, logout } = useAdminAuth();

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden">
      {/* Sidebar */}
      <aside className={`flex flex-col border-r border-white/10 bg-card transition-all duration-300 ${collapsed ? 'w-16' : 'w-56'} flex-shrink-0`}>
        {/* Logo */}
        <div className={`flex items-center gap-3 px-4 py-5 border-b border-white/10 ${collapsed ? 'justify-center' : ''}`}>
          <div className="w-8 h-8 rounded-lg bg-primary/20 border border-primary/40 flex items-center justify-center flex-shrink-0">
            <Icon name="Shield" size={16} className="text-primary" />
          </div>
          {!collapsed && (
            <div>
              <p className="font-display font-bold text-sm tracking-wider leading-none">NEXTVPN</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Admin Panel</p>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 px-2 flex flex-col gap-1">
          {NAV.map(item => {
            const active = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-sm font-medium
                  ${active ? 'bg-primary/15 text-primary border border-primary/30' : 'text-muted-foreground hover:text-foreground hover:bg-white/5'}
                  ${collapsed ? 'justify-center' : ''}
                `}
                title={collapsed ? item.label : undefined}
              >
                <Icon name={item.icon} fallback="Circle" size={18} />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* User + Logout */}
        {user && (
          <div className={`mx-2 mb-2 p-3 rounded-xl bg-white/5 border border-white/10 ${collapsed ? 'flex justify-center' : ''}`}>
            {!collapsed && (
              <div className="mb-2">
                <p className="text-xs font-medium text-foreground truncate">{user.name}</p>
                <p className="text-[10px] text-muted-foreground truncate">{user.email}</p>
              </div>
            )}
            <button
              onClick={logout}
              className={`flex items-center gap-2 text-xs text-muted-foreground hover:text-red-400 transition-colors ${collapsed ? '' : 'w-full'}`}
              title="Sign out"
            >
              <Icon name="LogOut" size={14} />
              {!collapsed && <span>Sign out</span>}
            </button>
          </div>
        )}

        {/* Collapse button */}
        <button
          onClick={() => setCollapsed(c => !c)}
          className={`flex items-center gap-3 px-3 py-3 mx-2 mb-3 rounded-xl text-muted-foreground hover:text-foreground hover:bg-white/5 transition-all text-sm ${collapsed ? 'justify-center' : ''}`}
        >
          <Icon name={collapsed ? 'PanelLeftOpen' : 'PanelLeftClose'} size={18} />
          {!collapsed && <span>Collapse</span>}
        </button>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
