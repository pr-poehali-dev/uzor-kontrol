import { useState } from 'react';
import { Plan } from '@/lib/subscriptions-api';
import { useRobokassa, openPaymentPage } from '@/components/extensions/robokassa/useRobokassa';
import Icon from '@/components/ui/icon';

const ROBOKASSA_URL = 'https://functions.poehali.dev/5c7db9cc-11f9-4c80-a92c-a5b742498c66';
const TOKEN_KEY = 'vpn_token';

interface CheckoutScreenProps {
  plan: Plan;
  onBack: () => void;
  onSuccess: (plan: string) => void;
}

const PLAN_COLOR: Record<string, string> = {
  free: 'text-zinc-400',
  premium: 'text-blue-400',
  pro: 'text-primary',
};

export function CheckoutScreen({ plan, onBack, onSuccess }: CheckoutScreenProps) {
  const [email, setEmail] = useState('');
  const [name, setName]   = useState('');
  const [redirecting, setRedirecting] = useState(false);

  const token = localStorage.getItem(TOKEN_KEY) || '';

  const { createPayment, isLoading } = useRobokassa({
    apiUrl: ROBOKASSA_URL,
    onError: (e) => alert(e.message),
  });

  async function handlePay() {
    if (!email || !name) return;
    setRedirecting(true);
    try {
      // Передаём plan_id через orderComment — backend достаёт из JWT
      const res = await fetch(ROBOKASSA_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          plan_id: plan.id,
          site_url: window.location.origin,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Ошибка создания платежа');
      openPaymentPage(data.payment_url);
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Ошибка');
      setRedirecting(false);
    }
  }

  return (
    <div className="flex flex-col min-h-screen bg-background px-5">
      {/* Header */}
      <div className="flex items-center gap-3 pt-14 pb-6">
        {!redirecting && (
          <button onClick={onBack} className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center active:scale-90 transition-transform">
            <Icon name="ArrowLeft" size={18} />
          </button>
        )}
        <h1 className="text-xl font-display font-bold">Оплата</h1>
      </div>

      <div className="flex-1 flex flex-col gap-5 pb-8">
        {/* Redirecting state */}
        {redirecting && (
          <div className="flex-1 flex flex-col items-center justify-center gap-4">
            <div className="w-20 h-20 rounded-full border-4 border-primary/30 border-t-primary animate-spin" />
            <p className="text-lg font-semibold">Переходим к оплате...</p>
            <p className="text-sm text-muted-foreground text-center">
              Вы будете перенаправлены на страницу Robokassa
            </p>
          </div>
        )}

        {!redirecting && (
          <>
            {/* Plan summary */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-5 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Тариф</p>
                  <p className={`text-xl font-bold ${PLAN_COLOR[plan.id]}`}>{plan.name}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground mb-1">Сумма</p>
                  <p className="text-2xl font-bold">{plan.price_rub} ₽</p>
                </div>
              </div>
              <div className="border-t border-white/10 pt-3 flex flex-col gap-2">
                {plan.features.map((f, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Icon name="Check" size={13} className={PLAN_COLOR[plan.id]} />
                    {f}
                  </div>
                ))}
              </div>
              <div className="border-t border-white/10 pt-3 flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Период</span>
                <span className="font-semibold text-sm">30 дней</span>
              </div>
            </div>

            {/* User details */}
            <div className="flex flex-col gap-3">
              <p className="text-xs text-muted-foreground uppercase tracking-wider px-1">Ваши данные</p>

              <div className="relative">
                <Icon name="User" size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Имя *"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-3 text-sm outline-none focus:border-primary/50 transition-colors placeholder:text-muted-foreground"
                />
              </div>

              <div className="relative">
                <Icon name="Mail" size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="email"
                  placeholder="Email для чека *"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-3 text-sm outline-none focus:border-primary/50 transition-colors placeholder:text-muted-foreground"
                />
              </div>
            </div>

            {/* Robokassa badge */}
            <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10">
              <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                <Icon name="CreditCard" size={15} className="text-blue-400" />
              </div>
              <div>
                <p className="text-sm font-medium">Оплата через Robokassa</p>
                <p className="text-xs text-muted-foreground">Карта, СБП, ЮMoney, QIWI и др.</p>
              </div>
              <div className="ml-auto">
                <Icon name="ShieldCheck" size={18} className="text-green-400" />
              </div>
            </div>

            {/* Pay button */}
            <button
              onClick={handlePay}
              disabled={!email || !name || isLoading}
              className={`w-full py-4 rounded-2xl font-bold text-base text-white transition-all active:scale-95 disabled:opacity-40
                ${plan.id === 'premium' ? 'bg-blue-500 hover:bg-blue-400' : 'bg-primary hover:bg-primary/90'}
              `}
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Создаём платёж...
                </span>
              ) : (
                `Оплатить ${plan.price_rub} ₽`
              )}
            </button>

            <p className="text-xs text-muted-foreground text-center">
              После оплаты подписка активируется автоматически
            </p>
          </>
        )}
      </div>
    </div>
  );
}
