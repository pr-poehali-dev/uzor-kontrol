import { useState, useEffect, useCallback } from 'react';
import { ConnectionState, Server, VpnConfig, api } from '@/lib/api';
import { ConnectButton } from '@/components/app/ConnectButton';
import { StatusBadge } from '@/components/app/StatusBadge';
import { StatsGrid } from '@/components/app/StatsGrid';
import { VpnConfigModal } from '@/components/app/VpnConfigModal';
import { HowToConnect } from '@/components/app/HowToConnect';
import Icon from '@/components/ui/icon';

interface HomeScreenProps {
  onOpenServers: () => void;
  selectedServer: Server;
}

export function HomeScreen({ onOpenServers, selectedServer }: HomeScreenProps) {
  const [connState, setConnState] = useState<ConnectionState>({
    status: 'disconnected',
    server: null,
    latency: 0,
    downloadSpeed: 0,
    uploadSpeed: 0,
    connectedAt: null,
  });
  const [vpnConfig, setVpnConfig] = useState<VpnConfig | null>(null);
  const [showConfig, setShowConfig] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ticker, setTicker] = useState(0);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (connState.status === 'connected') {
      interval = setInterval(() => setTicker(t => t + 1), 1000);
    }
    return () => clearInterval(interval);
  }, [connState.status]);

  const handleToggle = useCallback(async () => {
    setError(null);

    if (connState.status === 'connected') {
      setConnState(s => ({ ...s, status: 'connecting' }));
      try {
        await api.disconnect(selectedServer.id);
        setVpnConfig(null);
        setConnState(s => ({ ...s, status: 'disconnected', server: null, connectedAt: null, latency: 0, downloadSpeed: 0, uploadSpeed: 0 }));
      } catch {
        setConnState(s => ({ ...s, status: 'connected' }));
      }
    } else if (connState.status === 'disconnected') {
      setConnState(s => ({ ...s, status: 'connecting' }));
      try {
        const result = await api.connect(selectedServer.id);
        setVpnConfig(result);
        setShowConfig(true);
        setConnState({
          status: 'connected',
          server: selectedServer,
          latency: selectedServer.latency + Math.floor(Math.random() * 5),
          downloadSpeed: parseFloat((Math.random() * 50 + 10).toFixed(1)),
          uploadSpeed: parseFloat((Math.random() * 20 + 5).toFixed(1)),
          connectedAt: new Date(),
        });
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : 'Ошибка подключения';
        setError(msg);
        setConnState(s => ({ ...s, status: 'disconnected' }));
      }
    }
  }, [connState.status, selectedServer]);

  const isConnected = connState.status === 'connected';

  return (
    <div className="flex flex-col items-center min-h-screen bg-background px-5 pt-16 pb-8 gap-8">
      <div className="flex w-full items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary/20 border border-primary/40 flex items-center justify-center">
            <Icon name="Shield" size={16} className="text-primary" />
          </div>
          <span className="font-display font-bold text-lg tracking-wider">NEXTVPN</span>
        </div>
        <StatusBadge status={connState.status} />
      </div>

      <div className="flex-1 flex flex-col items-center justify-center gap-10 w-full">
        <ConnectButton status={connState.status} onClick={handleToggle} />

        {error && (
          <div className="w-full max-w-xs p-3 rounded-2xl bg-red-500/10 border border-red-500/30 text-center">
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        {isConnected && vpnConfig && (
          <button
            onClick={() => setShowConfig(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-primary/10 border border-primary/30 text-primary text-sm font-medium hover:bg-primary/20 transition-all active:scale-95"
          >
            <Icon name="QrCode" size={16} />
            Показать QR-код / конфиг
          </button>
        )}

        {!isConnected && <HowToConnect />}

        <button
          onClick={onOpenServers}
          className="flex items-center gap-3 px-5 py-3 rounded-2xl bg-white/5 border border-white/10 hover:border-white/20 transition-all active:scale-95 w-full max-w-xs"
        >
          <span className="text-2xl">{selectedServer.flag}</span>
          <div className="flex flex-col items-start flex-1 min-w-0">
            <span className="text-sm font-medium text-foreground truncate">{selectedServer.name}</span>
            <span className="text-xs text-muted-foreground">{selectedServer.city}, {selectedServer.country}</span>
          </div>
          <div className="flex items-center gap-1.5">
            {isConnected && (
              <div className={`w-2 h-2 rounded-full ${
                connState.latency < 50 ? 'bg-green-400' : connState.latency < 100 ? 'bg-yellow-400' : 'bg-red-400'
              }`} />
            )}
            <Icon name="ChevronRight" size={16} className="text-muted-foreground" />
          </div>
        </button>
      </div>

      <StatsGrid state={{ ...connState, server: connState.server }} key={ticker} />

      {showConfig && vpnConfig && (
        <VpnConfigModal
          config={vpnConfig}
          serverName={selectedServer.name}
          onClose={() => setShowConfig(false)}
        />
      )}
    </div>
  );
}

export default HomeScreen;