import { useEffect, useState } from 'react';
import { subsApi, Plan, Subscription } from '@/lib/subscriptions-api';
import Icon from '@/components/ui/icon';

interface PlansScreenProps {
  onBack: () => void;
  onSelectPlan: (plan: Plan) => void;
  currentPlan: string;
}

const PLAN_STYLE: Record<string, { gradient: string; badge?: string; popular?: boolean }> = {
  free:    { gradient: 'from-zinc-800 to-zinc-900' },
  premium: { gradient: 'from-blue-900/60 to-zinc-900', badge: 'Популярный', popular: true },
  pro:     { gradient: 'from-primary/20 to-zinc-900', badge: 'Лучший' },
};

function formatExpiry(iso: string | null) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
}

export function PlansScreen({ onBack, onSelectPlan, currentPlan }: PlansScreenProps) {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    subsApi.getPlansAndSubscription()
      .then(d => { setPlans(d.plans); setSubscription(d.subscription); })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 pt-14 pb-2">
        <button onClick={onBack} className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center active:scale-90 transition-transform">
          <Icon name="ArrowLeft" size={18} />
        </button>
        <div>
          <h1 className="text-xl font-display font-bold">Тарифы</h1>
          <p className="text-xs text-muted-foreground">Выберите подходящий план</p>
        </div>
      </div>

      {/* Current subscription badge */}
      {subscription && subscription.plan !== 'free' && (
        <div className="mx-5 mt-3 p-3 rounded-xl bg-green-500/10 border border-green-500/30 flex items-center gap-2">
          <Icon name="CheckCircle2" size={16} className="text-green-400 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-green-400">Активная подписка: {subscription.plan}</p>
            {subscription.expires_at && (
              <p className="text-xs text-green-400/70">Действует до {formatExpiry(subscription.expires_at)}</p>
            )}
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-4">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-52 rounded-2xl bg-white/5 animate-pulse" />
          ))
        ) : error ? (
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm flex items-center gap-2">
            <Icon name="AlertCircle" size={16} /> {error}
          </div>
        ) : (
          plans.map(plan => {
            const style = PLAN_STYLE[plan.id] ?? PLAN_STYLE.free;
            const isCurrent = currentPlan === plan.id;

            return (
              <div
                key={plan.id}
                className={`relative rounded-2xl bg-gradient-to-br ${style.gradient} border transition-all
                  ${isCurrent ? 'border-primary/60' : style.popular ? 'border-blue-500/40' : 'border-white/10'}
                `}
              >
                {style.badge && (
                  <div className={`absolute -top-3 left-4 px-3 py-1 rounded-full text-xs font-semibold
                    ${style.popular ? 'bg-blue-500 text-white' : 'bg-primary text-white'}`}>
                    {style.badge}
                  </div>
                )}

                <div className="p-5">
                  {/* Title + Price */}
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="font-display font-bold text-lg">{plan.name}</h3>
                      {isCurrent && (
                        <span className="text-xs text-primary font-medium flex items-center gap-1">
                          <Icon name="Check" size={10} /> Текущий план
                        </span>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold">{plan.price_rub} ₽</p>
                      <p className="text-xs text-muted-foreground">в месяц</p>
                    </div>
                  </div>

                  {/* Features */}
                  <div className="flex flex-col gap-2 mb-5">
                    {plan.features.map((f, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm">
                        <Icon name="Check" size={13} className={plan.id === 'free' ? 'text-zinc-500' : plan.id === 'premium' ? 'text-blue-400' : 'text-primary'} />
                        <span className={plan.id === 'free' ? 'text-muted-foreground' : 'text-foreground'}>{f}</span>
                      </div>
                    ))}
                  </div>

                  {/* CTA */}
                  <button
                    onClick={() => !isCurrent && onSelectPlan(plan)}
                    disabled={isCurrent}
                    className={`w-full py-3 rounded-xl font-semibold text-sm transition-all active:scale-95
                      ${isCurrent
                        ? 'bg-white/10 text-muted-foreground cursor-default'
                        : plan.id === 'premium'
                        ? 'bg-blue-500 text-white hover:bg-blue-400'
                        : plan.id === 'pro'
                        ? 'bg-primary text-white hover:bg-primary/90'
                        : 'bg-white/10 text-foreground hover:bg-white/20'
                      }`}
                  >
                    {isCurrent ? 'Активен' : plan.id === 'free' ? 'Бесплатно' : `Выбрать за ${plan.price_rub} ₽`}
                  </button>
                </div>
              </div>
            );
          })
        )}

        {/* Fine print */}
        <p className="text-xs text-muted-foreground text-center pb-4 leading-relaxed">
          Оплата списывается ежемесячно. Отменить можно в любой момент.
        </p>
      </div>
    </div>
  );
}
