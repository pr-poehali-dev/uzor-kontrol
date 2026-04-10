import { useState, useEffect } from 'react';
import { subsApi, Plan } from '@/lib/subscriptions-api';
import Icon from '@/components/ui/icon';

interface CheckoutScreenProps {
  plan: Plan;
  onBack: () => void;
  onSuccess: (plan: string) => void;
}

type CheckoutStep = 'confirm' | 'processing' | 'polling' | 'success' | 'error';

export function CheckoutScreen({ plan, onBack, onSuccess }: CheckoutScreenProps) {
  const [step, setStep] = useState<CheckoutStep>('confirm');
  const [paymentId, setPaymentId] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [countdown, setCountdown] = useState(3);

  // После успеха — обратный отсчёт и редирект
  useEffect(() => {
    if (step !== 'success') return;
    const t = setInterval(() => setCountdown(c => c - 1), 1000);
    const done = setTimeout(() => onSuccess(plan.id), 3000);
    return () => { clearInterval(t); clearTimeout(done); };
  }, [step]);

  // Polling статуса
  useEffect(() => {
    if (step !== 'polling' || !paymentId) return;
    let attempts = 0;
    const interval = setInterval(async () => {
      attempts++;
      try {
        const res = await subsApi.getPaymentStatus(paymentId);
        if (res.status === 'paid') {
          clearInterval(interval);
          setStep('success');
        } else if (res.status === 'failed' || res.status === 'cancelled') {
          clearInterval(interval);
          setErrorMsg('Платёж отклонён');
          setStep('error');
        } else if (attempts >= 30) {
          clearInterval(interval);
          setErrorMsg('Время ожидания истекло');
          setStep('error');
        }
      } catch {
        // continue polling
      }
    }, 2000);
    return () => clearInterval(interval);
  }, [step, paymentId]);

  async function handlePay() {
    setStep('processing');
    try {
      const result = await subsApi.checkout(plan.id);
      setPaymentId(result.payment_id);
      // Mock: сразу подтверждаем платёж через webhook-заглушку
      setStep('polling');
      await subsApi.mockConfirmPayment(result.payment_id);
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : 'Ошибка оплаты');
      setStep('error');
    }
  }

  const PLAN_COLOR: Record<string, string> = {
    free: 'text-zinc-400',
    premium: 'text-blue-400',
    pro: 'text-primary',
  };

  return (
    <div className="flex flex-col min-h-screen bg-background px-5">
      {/* Header */}
      <div className="flex items-center gap-3 pt-14 pb-6">
        {step === 'confirm' && (
          <button onClick={onBack} className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center active:scale-90 transition-transform">
            <Icon name="ArrowLeft" size={18} />
          </button>
        )}
        <h1 className="text-xl font-display font-bold">
          {step === 'success' ? 'Оплачено!' : step === 'error' ? 'Ошибка' : 'Оплата'}
        </h1>
      </div>

      <div className="flex-1 flex flex-col justify-center gap-6">
        {/* Success */}
        {step === 'success' && (
          <div className="flex flex-col items-center gap-5 py-8">
            <div className="w-24 h-24 rounded-full bg-green-500/20 border-2 border-green-500 flex items-center justify-center">
              <Icon name="CheckCircle2" size={44} className="text-green-400" />
            </div>
            <div className="text-center">
              <h2 className="text-2xl font-bold mb-2">Подписка активирована!</h2>
              <p className="text-muted-foreground">План <span className={`font-semibold ${PLAN_COLOR[plan.id]}`}>{plan.name}</span> активен на 30 дней</p>
            </div>
            <div className="flex flex-col items-center gap-1">
              <div className="w-8 h-8 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center">
                <span className="text-sm font-bold text-primary">{countdown}</span>
              </div>
              <p className="text-xs text-muted-foreground">Возврат через {countdown}с</p>
            </div>
          </div>
        )}

        {/* Error */}
        {step === 'error' && (
          <div className="flex flex-col items-center gap-5 py-8">
            <div className="w-24 h-24 rounded-full bg-red-500/20 border-2 border-red-500 flex items-center justify-center">
              <Icon name="XCircle" size={44} className="text-red-400" />
            </div>
            <div className="text-center">
              <h2 className="text-2xl font-bold mb-2">Не удалось оплатить</h2>
              <p className="text-muted-foreground">{errorMsg}</p>
            </div>
            <button onClick={() => setStep('confirm')} className="px-6 py-3 rounded-xl bg-primary text-white font-semibold hover:bg-primary/90 transition-all">
              Попробовать снова
            </button>
          </div>
        )}

        {/* Processing / Polling */}
        {(step === 'processing' || step === 'polling') && (
          <div className="flex flex-col items-center gap-5 py-8">
            <div className="w-24 h-24 rounded-full border-4 border-primary/30 border-t-primary animate-spin" />
            <div className="text-center">
              <h2 className="text-xl font-bold mb-2">
                {step === 'processing' ? 'Создаём платёж...' : 'Ожидаем подтверждение...'}
              </h2>
              <p className="text-muted-foreground text-sm">Пожалуйста, подождите</p>
            </div>
          </div>
        )}

        {/* Confirm */}
        {step === 'confirm' && (
          <>
            {/* Plan summary */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-5 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Тариф</p>
                  <p className={`text-xl font-bold ${PLAN_COLOR[plan.id]}`}>{plan.name}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Сумма</p>
                  <p className="text-2xl font-bold">{plan.price_rub} ₽</p>
                </div>
              </div>

              <div className="border-t border-white/10 pt-4 flex flex-col gap-2">
                {plan.features.map((f, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Icon name="Check" size={13} className={PLAN_COLOR[plan.id]} />
                    {f}
                  </div>
                ))}
              </div>

              <div className="border-t border-white/10 pt-4 flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Период</span>
                <span className="font-medium">30 дней</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Итого</span>
                <span className="font-bold text-lg">{plan.price_rub} ₽</span>
              </div>
            </div>

            {/* Mock payment notice */}
            <div className="flex items-start gap-2 p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/30">
              <Icon name="Info" size={14} className="text-yellow-400 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-yellow-400/90">
                Демо-режим. Реальное списание не производится. При подключении платёжной системы здесь будет форма оплаты.
              </p>
            </div>

            {/* Pay button */}
            <button
              onClick={handlePay}
              className={`w-full py-4 rounded-2xl font-bold text-base text-white transition-all active:scale-95
                ${plan.id === 'premium' ? 'bg-blue-500 hover:bg-blue-400' : 'bg-primary hover:bg-primary/90'}
              `}
            >
              Оплатить {plan.price_rub} ₽
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
