import { useState } from 'react';
import { Server, MOCK_SERVERS } from '@/lib/api';
import { HomeScreen } from './HomeScreen';
import { ServersScreen } from './ServersScreen';
import { AuthScreen } from './AuthScreen';
import { SettingsScreen } from './SettingsScreen';
import Icon from '@/components/ui/icon';

type Screen = 'auth' | 'home' | 'servers' | 'settings';

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

export default function Index() {
  const [screen, setScreen] = useState<Screen>('auth');
  const [selectedServer, setSelectedServer] = useState<Server>(MOCK_SERVERS[0]);

  if (screen === 'auth') {
    return (
      <div className="dark min-h-screen bg-background">
        <AuthScreen onAuth={() => setScreen('home')} />
      </div>
    );
  }

  return (
    <div className="dark min-h-screen bg-background flex flex-col">
      {/* Mobile Frame */}
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
          />
        )}
        {screen === 'settings' && (
          <SettingsScreen
            onBack={() => setScreen('home')}
            onLogout={() => setScreen('auth')}
          />
        )}
      </div>

      {/* Bottom Tab Bar */}
      {(screen === 'home' || screen === 'settings') && (
        <div className="flex items-center border-t border-white/10 bg-background/95 backdrop-blur-xl pb-safe">
          <NavItem icon="Shield" label="Home" active={screen === 'home'} onClick={() => setScreen('home')} />
          <NavItem icon="Globe" label="Servers" active={false} onClick={() => setScreen('servers')} />
          <NavItem icon="Settings" label="Settings" active={screen === 'settings'} onClick={() => setScreen('settings')} />
        </div>
      )}
    </div>
  );
}
