import { useState, useEffect } from 'react';
import { Server, MOCK_SERVERS } from '@/lib/api';
import { subsApi, Plan, Subscription } from '@/lib/subscriptions-api';
import { HomeScreen } from './HomeScreen';
import { ServersScreen } from './ServersScreen';
import { AuthScreen } from './AuthScreen';
import { SettingsScreen } from './SettingsScreen';
import { PlansScreen } from './PlansScreen';
import { CheckoutScreen } from './CheckoutScreen';
import Icon from '@/components/ui/icon';

type Screen = 'auth' | 'home' | 'servers' | 'settings' | 'plans' | 'checkout';

interface NavItemProps {
  icon: string;
  label: string;
  active: boolean;
  onClick: () => void;
}

function NavItem({ icon, label, active, onClick }: NavItemProps) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-1 flex-1 py-2 transition-all ${active ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
    >
      <Icon name={icon} fallback="Circle" size={22} />
      <span className="text-[10px] font-medium tracking-wide">{label}</span>
    </button>
  );
}

const NAV_SCREENS: Screen[] = ['home', 'servers', 'settings'];

export default function Index() {
  const [screen, setScreen] = useState<Screen>('auth');
  const [selectedServer, setSelectedServer] = useState<Server>(MOCK_SERVERS[0]);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [subscription, setSubscription] = useState<Subscription>({ plan: 'free', status: 'active', expires_at: null });

  useEffect(() => {
    if (screen === 'auth') return;
    subsApi.getPlansAndSubscription()
      .then(d => setSubscription(d.subscription))
      .catch(() => {});
  }, [screen]);

  function handleAuth() {
    setScreen('home');
  }

  function handlePlanSelected(plan: Plan) {
    setSelectedPlan(plan);
    setScreen('checkout');
  }

  function handlePaymentSuccess(planId: string) {
    setSubscription(prev => ({ ...prev, plan: planId, status: 'active' }));
    setScreen('settings');
  }

  if (screen === 'auth') {
    return (
      <div className="dark min-h-screen bg-background">
        <AuthScreen onAuth={handleAuth} />
      </div>
    );
  }

  const showNav = NAV_SCREENS.includes(screen);

  return (
    <div className="dark min-h-screen bg-background flex flex-col">
      <div className="flex-1 relative overflow-hidden">
        {screen === 'home' && (
          <HomeScreen
            onOpenServers={() => setScreen('servers')}
            selectedServer={selectedServer}
          />
        )}
        {screen === 'servers' && (
          <ServersScreen
            selected={selectedServer}
            onSelect={setSelectedServer}
            onBack={() => setScreen('home')}
            plan={subscription.plan}
            onUpgrade={() => setScreen('plans')}
          />
        )}
        {screen === 'settings' && (
          <SettingsScreen
            onBack={() => setScreen('home')}
            onLogout={() => setScreen('auth')}
            onOpenPlans={() => setScreen('plans')}
          />
        )}
        {screen === 'plans' && (
          <PlansScreen
            onBack={() => setScreen('settings')}
            onSelectPlan={handlePlanSelected}
            currentPlan={subscription.plan}
          />
        )}
        {screen === 'checkout' && selectedPlan && (
          <CheckoutScreen
            plan={selectedPlan}
            onBack={() => setScreen('plans')}
            onSuccess={handlePaymentSuccess}
          />
        )}
      </div>

      {/* Bottom Tab Bar */}
      {showNav && (
        <div className="flex items-center border-t border-white/10 bg-background/95 backdrop-blur-xl pb-safe">
          <NavItem icon="Shield" label="Главная" active={screen === 'home'} onClick={() => setScreen('home')} />
          <NavItem icon="Globe" label="Серверы" active={screen === 'servers'} onClick={() => setScreen('servers')} />
          <NavItem icon="Settings" label="Настройки" active={screen === 'settings'} onClick={() => setScreen('settings')} />
        </div>
      )}
    </div>
  );
}
