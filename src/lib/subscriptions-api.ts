const SUBS_URL = 'https://functions.poehali.dev/8d3d9b83-c48b-4c9c-b1e7-9a0159ddf084';
const TOKEN_KEY = 'vpn_token';

export interface Plan {
  id: string;
  name: string;
  price_rub: number;
  features: string[];
  server_limit: number;
}

export interface Subscription {
  plan: string;
  status: 'active' | 'expired' | 'blocked';
  expires_at: string | null;
}

export interface PaymentInfo {
  id: string;
  status: string;
  plan_id: string;
  amount_rub: number;
  created_at: string;
}

export interface SubsData {
  plans: Plan[];
  subscription: Subscription;
  last_payment: PaymentInfo | null;
}

export interface CheckoutResult {
  payment_id: string;
  amount_rub: number;
  plan_id: string;
  plan_name: string;
  pay_url: string;
}

function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

function authHeaders(): Record<string, string> {
  const t = getToken();
  return t ? { 'X-Authorization': `Bearer ${t}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' };
}

export const subsApi = {
  async getPlansAndSubscription(): Promise<SubsData> {
    const res = await fetch(SUBS_URL, { headers: authHeaders() });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to load');
    return data;
  },

  async checkout(planId: string): Promise<CheckoutResult> {
    const res = await fetch(SUBS_URL, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ plan_id: planId }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Checkout failed');
    return data;
  },

  async getPaymentStatus(paymentId: string): Promise<{ status: string; plan_id: string }> {
    const res = await fetch(`${SUBS_URL}?payment_id=${paymentId}`, { headers: authHeaders() });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed');
    return data;
  },

  // Mock: симулируем webhook для теста
  async mockConfirmPayment(paymentId: string): Promise<void> {
    await fetch(`${SUBS_URL}/webhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ payment_id: paymentId, status: 'paid' }),
    });
  },

  isPlanFree(plan: string): boolean {
    return plan === 'free';
  },

  canAccessServer(plan: string, serverIndex: number): boolean {
    if (plan === 'free') return serverIndex === 0;
    return true;
  },
};
