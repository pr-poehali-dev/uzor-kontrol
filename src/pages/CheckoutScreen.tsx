import { useState } from 'react';
import { Plan } from '@/lib/subscriptions-api';
import Icon from '@/components/ui/icon';

const YUKASSA_URL = 'https://functions.poehali.dev/4a2b603f-0cc0-46e5-8351-4087e59ecb6f';
const TOKEN_KEY   = 'vpn_token';

interface CheckoutScreenProps {
  plan: Plan;
  onBack: () => void;
  onSuccess: (plan: string) => void;
}

const PLAN_COLOR: Record<string, string> = {
  free:    'text-zinc-400',
  premium: 'text-blue-400',
  pro:     'text-primary',
};

type Step = 'confirm' | 'loading' | 'redirect';

export function CheckoutScreen({ plan, onBack, onSuccess }: CheckoutScreenProps) {
  const [step, setStep]   = useState<Step>('confirm');
  const [error, setError] = useState('');

  async function handlePay() {
    setError('');
    setStep('loading');

    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) {
      setError('Вы не авторизованы. Войдите в аккаунт.');
      setStep('confirm');
      return;
    }

    try {
      const res = await fetch(YUKASSA_URL, {
        method: 'POST',
        headers: {
          'Content-Type':    'application/json',
          'X-Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          plan_id:    plan.id,
          return_url: `${window.location.origin}?payment=success`,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Ошибка создания платежа');
      if (!data.confirmation_url) throw new Error('Не получена ссылка на оплату');

      setStep('redirect');

      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      if (isMobile) {
        window.open(data.confirmation_url, '_blank');
      } else {
        window.location.href = data.confirmation_url;
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка');
      setStep('confirm');
    }
  }

  return (
    <div className="flex flex-col min-h-screen bg-background px-5">
      {/* Header */}
      <div className="flex items-center gap-3 pt-14 pb-6">
        {step === 'confirm' && (
          <button
            onClick={onBack}
            className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center active:scale-90 transition-transform"
          >
            <Icon name="ArrowLeft" size={18} />
          </button>
        )}
        <h1 className="text-xl font-display font-bold">Оплата</h1>
      </div>

      <div className="flex-1 flex flex-col gap-5 pb-8">

        {/* Loading */}
        {(step === 'loading' || step === 'redirect') && (
          <div className="flex-1 flex flex-col items-center justify-center gap-4">
            <div className="w-20 h-20 rounded-full border-4 border-primary/30 border-t-primary animate-spin" />
            <p className="text-lg font-semibold">
              {step === 'loading' ? 'Создаём платёж...' : 'Переходим к оплате...'}
            </p>
            <p className="text-sm text-muted-foreground text-center px-8">
              {step === 'redirect'
                ? 'Вы будете перенаправлены на страницу ЮKassa'
                : 'Пожалуйста, подождите'}
            </p>
          </div>
        )}

        {/* Confirm */}
        {step === 'confirm' && (
          <>
            {/* Plan card */}
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

            {/* ЮKassa badge */}
            <div className="flex items-center gap-3 p-4 rounded-2xl bg-white/5 border border-white/10">
              <div className="w-10 h-10 rounded-xl bg-[#6534FF]/20 border border-[#6534FF]/30 flex items-center justify-center flex-shrink-0">
                <Icon name="CreditCard" size={18} className="text-[#6534FF]" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold">ЮKassa</p>
                <p className="text-xs text-muted-foreground">Карта, СБП, ЮMoney, Mir Pay</p>
              </div>
              <div className="flex items-center gap-1 text-green-400">
                <Icon name="ShieldCheck" size={16} />
                <span className="text-xs font-medium">Безопасно</span>
              </div>
            </div>

            {/* Что будет после */}
            <div className="flex items-start gap-3 p-3 rounded-xl bg-primary/5 border border-primary/20">
              <Icon name="Info" size={14} className="text-primary mt-0.5 flex-shrink-0" />
              <p className="text-xs text-muted-foreground leading-relaxed">
                После оплаты вы вернётесь в приложение и подписка активируется автоматически.
              </p>
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                <Icon name="AlertCircle" size={14} />
                {error}
              </div>
            )}

            {/* Pay button */}
            <button
              onClick={handlePay}
              className={`w-full py-4 rounded-2xl font-bold text-base text-white transition-all active:scale-95
                ${plan.id === 'premium' ? 'bg-blue-500 hover:bg-blue-400' : 'bg-primary hover:bg-primary/90'}
              `}
            >
              Оплатить {plan.price_rub} ₽ через ЮKassa
            </button>

            <p className="text-xs text-muted-foreground text-center -mt-2">
              Нажимая «Оплатить», вы соглашаетесь с условиями сервиса
            </p>
          </>
        )}
      </div>
    </div>
  );
}