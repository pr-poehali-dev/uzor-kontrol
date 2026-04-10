import { useState, useEffect } from 'react';
import Icon from '@/components/ui/icon';
import { subsApi, Subscription } from '@/lib/subscriptions-api';

interface SettingsScreenProps {
  onBack: () => void;
  onLogout: () => void;
  onOpenPlans: () => void;
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

const PLAN_LABEL: Record<string, string> = { free: 'Free', premium: 'Premium', pro: 'Pro' };
const PLAN_COLOR: Record<string, string> = {
  free: 'text-zinc-400',
  premium: 'text-blue-400',
  pro: 'text-primary',
};

function formatExpiry(iso: string | null) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
}

export function SettingsScreen({ onBack, onLogout, onOpenPlans }: SettingsScreenProps) {
  const [autoConnect, setAutoConnect]     = useState(false);
  const [autoReconnect, setAutoReconnect] = useState(true);
  const [notifications, setNotifications] = useState(true);
  const [language, setLanguage] = useState('English');
  const [subscription, setSubscription] = useState<Subscription | null>(null);

  useEffect(() => {
    subsApi.getPlansAndSubscription()
      .then(d => setSubscription(d.subscription))
      .catch(() => {});
  }, []);

  const planLabel = subscription ? PLAN_LABEL[subscription.plan] ?? subscription.plan : '—';
  const planColor = subscription ? PLAN_COLOR[subscription.plan] ?? 'text-muted-foreground' : 'text-muted-foreground';
  const isActive  = subscription?.status === 'active';

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <div className="flex items-center gap-3 px-5 pt-14 pb-4">
        <button onClick={onBack} className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center active:scale-90 transition-transform">
          <Icon name="ArrowLeft" size={18} />
        </button>
        <h1 className="text-xl font-display font-bold">Настройки</h1>
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-8">
        {/* Subscription card */}
        <div className="mb-5 rounded-2xl bg-gradient-to-br from-primary/15 to-zinc-900 border border-primary/30 p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Icon name="Crown" size={16} className="text-primary" />
              <span className="text-sm font-semibold">Подписка</span>
            </div>
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${isActive ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
              {isActive ? 'Активна' : 'Неактивна'}
            </span>
          </div>
          <p className={`text-2xl font-display font-bold ${planColor}`}>{planLabel}</p>
          {subscription?.expires_at && (
            <p className="text-xs text-muted-foreground mt-1">
              Действует до {formatExpiry(subscription.expires_at)}
            </p>
          )}
          <button
            onClick={onOpenPlans}
            className="mt-3 w-full py-2.5 rounded-xl bg-primary/20 border border-primary/40 text-primary text-sm font-semibold hover:bg-primary/30 transition-all active:scale-95"
          >
            {subscription?.plan === 'free' ? 'Улучшить план →' : 'Управление подпиской →'}
          </button>
        </div>

        {/* Connection */}
        <p className="text-xs text-muted-foreground uppercase tracking-widest mb-1 px-1">Подключение</p>
        <div className="bg-white/5 border border-white/10 rounded-2xl px-4 divide-y divide-white/5 mb-5">
          <ToggleRow icon="Zap" label="Авто-подключение" description="Подключаться при запуске" value={autoConnect} onChange={setAutoConnect} />
          <ToggleRow icon="RefreshCw" label="Авто-переподключение" description="При разрыве соединения" value={autoReconnect} onChange={setAutoReconnect} />
        </div>

        {/* Preferences */}
        <p className="text-xs text-muted-foreground uppercase tracking-widest mb-1 px-1">Интерфейс</p>
        <div className="bg-white/5 border border-white/10 rounded-2xl px-4 divide-y divide-white/5 mb-5">
          <div className="flex items-center gap-3 py-4">
            <div className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center flex-shrink-0">
              <Icon name="Globe" fallback="Circle" size={16} className="text-muted-foreground" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium">Язык</p>
            </div>
            <select
              value={language}
              onChange={e => setLanguage(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-sm outline-none focus:border-primary/50"
            >
              {['English', 'Русский', 'Español', 'Deutsch'].map(o => (
                <option key={o} value={o} className="bg-zinc-900">{o}</option>
              ))}
            </select>
          </div>
          <ToggleRow icon="Bell" label="Уведомления" description="Оповещения о соединении" value={notifications} onChange={setNotifications} />
        </div>

        {/* Logout */}
        <button
          onClick={onLogout}
          className="w-full py-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400 font-semibold text-sm flex items-center justify-center gap-2 active:scale-95 transition-all"
        >
          <Icon name="LogOut" size={16} />
          Выйти
        </button>
      </div>
    </div>
  );
}