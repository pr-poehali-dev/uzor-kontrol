import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { VpnConfig } from '@/lib/api';
import Icon from '@/components/ui/icon';

interface VpnConfigModalProps {
  config: VpnConfig;
  serverName: string;
  onClose: () => void;
}

export function VpnConfigModal({ config, serverName, onClose }: VpnConfigModalProps) {
  const [copied, setCopied] = useState(false);
  const [tab, setTab] = useState<'qr' | 'manual'>('qr');

  function handleCopy() {
    navigator.clipboard.writeText(config.config);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleDownload() {
    const blob = new Blob([config.config], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nextvpn-${serverName.toLowerCase().replace(/\s+/g, '-')}.conf`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-background border border-white/10 rounded-t-3xl sm:rounded-3xl p-6 pb-8 animate-in slide-in-from-bottom duration-300">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-display font-bold">VPN конфиг</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
            <Icon name="X" size={16} />
          </button>
        </div>

        <div className="flex gap-2 mb-5">
          <button
            onClick={() => setTab('qr')}
            className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all ${tab === 'qr' ? 'bg-primary/20 border border-primary/50 text-primary' : 'bg-white/5 border border-white/10 text-muted-foreground'}`}
          >
            <Icon name="QrCode" size={14} className="inline mr-1.5" />
            QR-код
          </button>
          <button
            onClick={() => setTab('manual')}
            className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all ${tab === 'manual' ? 'bg-primary/20 border border-primary/50 text-primary' : 'bg-white/5 border border-white/10 text-muted-foreground'}`}
          >
            <Icon name="FileText" size={14} className="inline mr-1.5" />
            Конфиг
          </button>
        </div>

        {tab === 'qr' ? (
          <div className="flex flex-col items-center gap-4">
            <div className="bg-white p-4 rounded-2xl">
              <QRCodeSVG value={config.qr_data} size={220} level="M" />
            </div>
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Откройте приложение <span className="text-foreground font-medium">WireGuard</span></p>
              <p className="text-sm text-muted-foreground">и отсканируйте QR-код</p>
            </div>
            <div className="flex gap-3 text-xs text-muted-foreground mt-1">
              <a href="https://apps.apple.com/app/wireguard/id1441195209" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 hover:border-white/20 transition-colors">
                <Icon name="Apple" fallback="Smartphone" size={12} />
                iPhone
              </a>
              <a href="https://play.google.com/store/apps/details?id=com.wireguard.android" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 hover:border-white/20 transition-colors">
                <Icon name="Smartphone" size={12} />
                Android
              </a>
              <a href="https://www.wireguard.com/install/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 hover:border-white/20 transition-colors">
                <Icon name="Monitor" size={12} />
                ПК
              </a>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 max-h-48 overflow-y-auto">
              <pre className="text-xs text-muted-foreground font-mono whitespace-pre-wrap break-all">{config.config}</pre>
            </div>
            <div className="flex gap-3">
              <button onClick={handleCopy} className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-white/5 border border-white/10 text-sm font-medium hover:border-white/20 transition-all active:scale-95">
                <Icon name={copied ? 'Check' : 'Copy'} size={16} />
                {copied ? 'Скопировано' : 'Копировать'}
              </button>
              <button onClick={handleDownload} className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-primary/20 border border-primary/50 text-primary text-sm font-medium hover:bg-primary/30 transition-all active:scale-95">
                <Icon name="Download" size={16} />
                Скачать .conf
              </button>
            </div>
          </div>
        )}

        <div className="mt-5 p-3 rounded-xl bg-blue-500/10 border border-blue-500/20">
          <p className="text-xs text-blue-400 leading-relaxed">
            <Icon name="Info" size={12} className="inline mr-1" />
            Установите бесплатное приложение WireGuard, импортируйте конфиг через QR-код или файл .conf и включите VPN.
          </p>
        </div>
      </div>
    </div>
  );
}

export default VpnConfigModal;
