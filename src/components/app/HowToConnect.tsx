import { useState } from 'react';
import Icon from '@/components/ui/icon';

const STEPS = [
  {
    icon: 'Download',
    title: 'Скачайте WireGuard',
    desc: 'Бесплатное приложение для VPN-подключения',
    links: [
      { label: 'iPhone', url: 'https://apps.apple.com/app/wireguard/id1441195209', icon: 'Smartphone' },
      { label: 'Android', url: 'https://play.google.com/store/apps/details?id=com.wireguard.android', icon: 'Smartphone' },
      { label: 'Windows / Mac', url: 'https://www.wireguard.com/install/', icon: 'Monitor' },
    ],
  },
  {
    icon: 'Zap',
    title: 'Нажмите «Подключиться»',
    desc: 'Выберите сервер и нажмите большую кнопку — появится QR-код и конфиг-файл',
  },
  {
    icon: 'QrCode',
    title: 'Отсканируйте QR-код',
    desc: 'Откройте WireGuard → нажмите «+» → «Сканировать QR-код» → наведите камеру',
  },
  {
    icon: 'ShieldCheck',
    title: 'VPN работает!',
    desc: 'Включите туннель в WireGuard — весь трафик теперь защищён',
  },
];

export function HowToConnect() {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm font-medium hover:bg-blue-500/15 transition-all active:scale-95 w-full max-w-xs"
      >
        <Icon name="HelpCircle" size={16} />
        Как подключить VPN?
      </button>
    );
  }

  return (
    <div className="w-full max-w-xs">
      <div className="rounded-2xl bg-white/5 border border-white/10 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
          <span className="text-sm font-semibold">Как подключиться</span>
          <button onClick={() => setOpen(false)} className="w-6 h-6 rounded-lg bg-white/5 flex items-center justify-center">
            <Icon name="X" size={12} />
          </button>
        </div>

        <div className="p-4 flex flex-col gap-4">
          {STEPS.map((step, i) => (
            <div key={i} className="flex gap-3">
              <div className="flex flex-col items-center">
                <div className="w-8 h-8 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center flex-shrink-0">
                  <Icon name={step.icon} fallback="Circle" size={14} className="text-primary" />
                </div>
                {i < STEPS.length - 1 && <div className="w-px flex-1 bg-white/10 mt-1" />}
              </div>
              <div className="pb-4">
                <p className="text-sm font-medium text-foreground">{step.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{step.desc}</p>
                {step.links && (
                  <div className="flex gap-2 mt-2 flex-wrap">
                    {step.links.map(link => (
                      <a
                        key={link.label}
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-primary/10 border border-primary/20 text-primary text-xs font-medium hover:bg-primary/20 transition-colors"
                      >
                        <Icon name={link.icon} fallback="ExternalLink" size={10} />
                        {link.label}
                      </a>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default HowToConnect;
