import { useState, useEffect } from 'react';
import Icon from '@/components/ui/icon';
import { subsApi, Subscription } from '@/lib/subscriptions-api';

const VPN_AUTH_URL = 'https://functions.poehali.dev/529a9537-80ea-438b-a860-ecd84143015b';
const TOKEN_KEY = 'vpn_token';

interface SettingsScreenProps {
  onBack: () => void;
  onLogout: () => void;
  onOpenPlans: () => void;
  onOpenHelp: () => void;
  onOpenLegal: () => void;
}

interface ToggleRowProps {
  icon: string;
  label: string;
  description?: string;
  value: boolean;
  onChange: (v: boolean) => void;
}

interface NavRowProps {
  icon: string;
  label: string;
  description?: string;
  onClick: () => void;
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

function NavRow({ icon, label, description, onClick }: NavRowProps) {
  return (
    <button onClick={onClick} className="w-full flex items-center gap-3 py-4 text-left active:scale-[0.99] transition-transform">
      <div className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center flex-shrink-0">
        <Icon name={icon} fallback="Circle" size={16} className="text-muted-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">{label}</p>
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
      </div>
      <Icon name="ChevronRight" size={16} className="text-muted-foreground flex-shrink-0" />
    </button>
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
  return new Date(iso).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
}

function daysUntil(iso: string | null) {
  if (!iso) return 0;
  const ms = new Date(iso).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)));
}

interface Me {
  email: string;
  name: string;
  email_verified: boolean;
  sub_status: string;
}

export function SettingsScreen({ onBack, onLogout, onOpenPlans, onOpenHelp, onOpenLegal }: SettingsScreenProps) {
  const [autoConnect, setAutoConnect] = useState(false);
  const [autoReconnect, setAutoReconnect] = useState(true);
  const [notifications, setNotifications] = useState(true);
  const [language, setLanguage] = useState('Русский');
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [me, setMe] = useState<Me | null>(null);
  const [resendMsg, setResendMsg] = useState('');

  useEffect(() => {
    subsApi.getPlansAndSubscription()
      .then(d => setSubscription(d.subscription))
      .catch(() => {});

    const token = localStorage.getItem(TOKEN_KEY);
    if (token) {
      fetch(VPN_AUTH_URL, { headers: { 'X-Authorization': `Bearer ${token}` } })
        .then(r => r.ok ? r.json() : null)
        .then(d => { if (d) setMe(d); })
        .catch(() => {});
    }
  }, []);

  async function handleResendVerify() {
    setResendMsg('');
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) return;
    try {
      const res = await fetch(VPN_AUTH_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Authorization': `Bearer ${token}` },
        body: JSON.stringify({ action: 'resend_verify' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setResendMsg('Письмо отправлено. Проверьте почту.');
    } catch (e) {
      setResendMsg(e instanceof Error ? e.message : 'Ошибка');
    }
  }

  const planLabel = subscription ? PLAN_LABEL[subscription.plan] ?? subscription.plan : '—';
  const planColor = subscription ? PLAN_COLOR[subscription.plan] ?? 'text-muted-foreground' : 'text-muted-foreground';
  const isBlocked = subscription?.status === 'blocked';
  const isExpired = subscription?.status === 'expired';
  const isActive = subscription?.status === 'active';
  const daysLeft = daysUntil(subscription?.expires_at ?? null);

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <div className="flex items-center gap-3 px-5 pt-14 pb-4">
        <button onClick={onBack} className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center active:scale-90 transition-transform">
          <Icon name="ArrowLeft" size={18} />
        </button>
        <h1 className="text-xl font-display font-bold">Настройки</h1>
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-8">
        {/* Blocked banner */}
        {isBlocked && (
          <div className="mb-4 p-4 rounded-2xl bg-red-500/10 border border-red-500/30">
            <div className="flex items-start gap-3">
              <Icon name="ShieldAlert" size={18} className="text-red-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-red-400">Аккаунт заблокирован</p>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  VPN-доступ приостановлен. Свяжитесь с поддержкой для разблокировки.
                </p>
                <a href="mailto:support@nextvpn.ru" className="inline-flex items-center gap-1.5 mt-2 text-xs text-primary font-medium hover:underline">
                  <Icon name="Mail" size={12} />
                  support@nextvpn.ru
                </a>
              </div>
            </div>
          </div>
        )}

        {/* Expired banner */}
        {isExpired && !isBlocked && (
          <div className="mb-4 p-4 rounded-2xl bg-yellow-500/10 border border-yellow-500/30">
            <div className="flex items-start gap-3">
              <Icon name="Clock" size={18} className="text-yellow-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-yellow-400">Подписка истекла</p>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  Продлите подписку, чтобы продолжить пользоваться VPN.
                </p>
                <button onClick={onOpenPlans} className="mt-2 text-xs text-primary font-medium hover:underline">
                  Продлить подписку →
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Expiring soon */}
        {isActive && subscription?.expires_at && daysLeft <= 3 && daysLeft > 0 && (
          <div className="mb-4 p-4 rounded-2xl bg-orange-500/10 border border-orange-500/30">
            <div className="flex items-start gap-3">
              <Icon name="AlertTriangle" size={18} className="text-orange-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-orange-400">Подписка скоро закончится</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Осталось {daysLeft} {daysLeft === 1 ? 'день' : daysLeft < 5 ? 'дня' : 'дней'}. Продлите заранее.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Email not verified */}
        {me && !me.email_verified && (
          <div className="mb-4 p-4 rounded-2xl bg-blue-500/10 border border-blue-500/30">
            <div className="flex items-start gap-3">
              <Icon name="MailWarning" size={18} className="text-blue-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-blue-400">Email не подтверждён</p>
                <p className="text-xs text-muted-foreground mt-1 mb-2">
                  Подтвердите почту, чтобы восстановить пароль в случае необходимости.
                </p>
                <button onClick={handleResendVerify} className="text-xs text-primary font-medium hover:underline">
                  Отправить письмо ещё раз
                </button>
                {resendMsg && <p className="text-xs text-muted-foreground mt-1">{resendMsg}</p>}
              </div>
            </div>
          </div>
        )}

        {/* Subscription card */}
        <div className="mb-5 rounded-2xl bg-gradient-to-br from-primary/15 to-zinc-900 border border-primary/30 p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Icon name="Crown" size={16} className="text-primary" />
              <span className="text-sm font-semibold">Подписка</span>
            </div>
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
              isBlocked ? 'bg-red-500/20 text-red-400'
              : isExpired ? 'bg-yellow-500/20 text-yellow-400'
              : isActive ? 'bg-green-500/20 text-green-400'
              : 'bg-zinc-500/20 text-zinc-400'
            }`}>
              {isBlocked ? 'Заблокирована' : isExpired ? 'Истекла' : isActive ? 'Активна' : '—'}
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

        {/* Account info */}
        {me && (
          <div className="mb-5 bg-white/5 border border-white/10 rounded-2xl p-4">
            <p className="text-xs text-muted-foreground mb-1">Аккаунт</p>
            <p className="text-sm font-medium">{me.name}</p>
            <p className="text-xs text-muted-foreground">{me.email}</p>
          </div>
        )}

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
              {['Русский', 'English', 'Español', 'Deutsch'].map(o => (
                <option key={o} value={o} className="bg-zinc-900">{o}</option>
              ))}
            </select>
          </div>
          <ToggleRow icon="Bell" label="Уведомления" description="Оповещения о соединении" value={notifications} onChange={setNotifications} />
        </div>

        {/* Help & Legal */}
        <p className="text-xs text-muted-foreground uppercase tracking-widest mb-1 px-1">Поддержка</p>
        <div className="bg-white/5 border border-white/10 rounded-2xl px-4 divide-y divide-white/5 mb-5">
          <NavRow icon="BookOpen" label="Инструкция по подключению" description="iOS, Android, Windows, Mac, Linux" onClick={onOpenHelp} />
          <NavRow icon="FileText" label="Документы и поддержка" description="Оферта, политика, контакты" onClick={onOpenLegal} />
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

export default SettingsScreen;
