import { useState } from 'react';
import Icon from '@/components/ui/icon';

interface SettingsScreenProps {
  onBack: () => void;
  onLogout: () => void;
}

interface ToggleRowProps {
  icon: string;
  label: string;
  description?: string;
  value: boolean;
  onChange: (v: boolean) => void;
}

function ToggleRow({ icon, label, description, value, onChange }: ToggleRowProps) {
  return (
    <div className="flex items-center gap-3 py-4">
      <div className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center flex-shrink-0">
        <Icon name={icon} fallback="Circle" size={16} className="text-muted-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">{label}</p>
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
      </div>
      <button
        onClick={() => onChange(!value)}
        className={`w-12 h-6 rounded-full transition-all duration-300 relative flex-shrink-0 ${value ? 'bg-primary' : 'bg-white/20'}`}
      >
        <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-md transition-all duration-300 ${value ? 'left-6' : 'left-0.5'}`} />
      </button>
    </div>
  );
}

interface SelectRowProps {
  icon: string;
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
}

function SelectRow({ icon, label, value, options, onChange }: SelectRowProps) {
  return (
    <div className="flex items-center gap-3 py-4">
      <div className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center flex-shrink-0">
        <Icon name={icon} fallback="Circle" size={16} className="text-muted-foreground" />
      </div>
      <div className="flex-1">
        <p className="text-sm font-medium">{label}</p>
      </div>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-sm outline-none focus:border-primary/50"
      >
        {options.map(o => <option key={o} value={o} className="bg-zinc-900">{o}</option>)}
      </select>
    </div>
  );
}

export function SettingsScreen({ onBack, onLogout }: SettingsScreenProps) {
  const [autoConnect, setAutoConnect] = useState(false);
  const [notifications, setNotifications] = useState(true);
  const [theme, setTheme] = useState('Dark');
  const [language, setLanguage] = useState('English');

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 pt-14 pb-4">
        <button onClick={onBack} className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center active:scale-90 transition-transform">
          <Icon name="ArrowLeft" size={18} />
        </button>
        <h1 className="text-xl font-display font-bold">Settings</h1>
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-8">
        {/* Connection */}
        <p className="text-xs text-muted-foreground uppercase tracking-widest mb-1 px-1">Connection</p>
        <div className="bg-white/5 border border-white/10 rounded-2xl px-4 divide-y divide-white/5 mb-5">
          <ToggleRow icon="Zap" label="Auto-connect" description="Connect on app launch" value={autoConnect} onChange={setAutoConnect} />
          <ToggleRow icon="RefreshCw" label="Auto-reconnect" description="Reconnect on drop" value={true} onChange={() => {}} />
        </div>

        {/* Preferences */}
        <p className="text-xs text-muted-foreground uppercase tracking-widest mb-1 px-1">Preferences</p>
        <div className="bg-white/5 border border-white/10 rounded-2xl px-4 divide-y divide-white/5 mb-5">
          <SelectRow icon="Moon" label="Theme" value={theme} options={['Dark', 'Light', 'System']} onChange={setTheme} />
          <SelectRow icon="Globe" label="Language" value={language} options={['English', 'Русский', 'Español', 'Deutsch']} onChange={setLanguage} />
          <ToggleRow icon="Bell" label="Notifications" description="Connection alerts" value={notifications} onChange={setNotifications} />
        </div>

        {/* Account */}
        <p className="text-xs text-muted-foreground uppercase tracking-widest mb-1 px-1">Account</p>
        <div className="bg-white/5 border border-white/10 rounded-2xl px-4 divide-y divide-white/5 mb-5">
          <div className="flex items-center gap-3 py-4">
            <div className="w-9 h-9 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center">
              <Icon name="Crown" size={16} className="text-primary" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium">Subscription</p>
              <p className="text-xs text-green-400">Pro — Active</p>
            </div>
            <Icon name="ChevronRight" size={16} className="text-muted-foreground" />
          </div>
          <div className="flex items-center gap-3 py-4">
            <div className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
              <Icon name="User" size={16} className="text-muted-foreground" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium">Account</p>
              <p className="text-xs text-muted-foreground">user@example.com</p>
            </div>
            <Icon name="ChevronRight" size={16} className="text-muted-foreground" />
          </div>
        </div>

        {/* Logout */}
        <button
          onClick={onLogout}
          className="w-full py-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400 font-semibold text-sm flex items-center justify-center gap-2 active:scale-95 transition-all"
        >
          <Icon name="LogOut" size={16} />
          Sign Out
        </button>
      </div>
    </div>
  );
}
