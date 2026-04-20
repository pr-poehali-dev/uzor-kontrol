import { useState } from 'react';
import Icon from '@/components/ui/icon';

interface HelpScreenProps {
  onBack: () => void;
}

type Platform = 'ios' | 'android' | 'windows' | 'mac' | 'linux';

const PLATFORMS: { id: Platform; label: string; icon: string }[] = [
  { id: 'ios', label: 'iPhone / iPad', icon: 'Apple' },
  { id: 'android', label: 'Android', icon: 'Smartphone' },
  { id: 'windows', label: 'Windows', icon: 'Monitor' },
  { id: 'mac', label: 'macOS', icon: 'Laptop' },
  { id: 'linux', label: 'Linux', icon: 'Terminal' },
];

const STEPS: Record<Platform, { title: string; body: string }[]> = {
  ios: [
    { title: '1. Установите приложение WireGuard', body: 'Откройте App Store, найдите «WireGuard» и установите бесплатное официальное приложение от WireGuard Development Team.' },
    { title: '2. Получите конфигурацию', body: 'В NEXTVPN откройте вкладку «Главная» и нажмите кнопку подключения. Откроется окно с QR-кодом.' },
    { title: '3. Отсканируйте QR-код', body: 'В приложении WireGuard нажмите «+» → «Создать из QR-кода» → отсканируйте код на экране.' },
    { title: '4. Включите VPN', body: 'Переключите тумблер рядом с новым туннелем — VPN активен. В статус-баре появится иконка VPN.' },
  ],
  android: [
    { title: '1. Установите WireGuard', body: 'Откройте Google Play или RuStore, найдите «WireGuard» и установите официальное приложение.' },
    { title: '2. Получите конфигурацию', body: 'В NEXTVPN нажмите кнопку подключения — откроется QR-код.' },
    { title: '3. Добавьте туннель', body: 'В WireGuard нажмите «+» → «Сканировать QR-код» → отсканируйте код.' },
    { title: '4. Активируйте VPN', body: 'Нажмите на переключатель рядом с туннелем. Подтвердите запрос системы на создание VPN-соединения.' },
  ],
  windows: [
    { title: '1. Скачайте WireGuard', body: 'Перейдите на сайт wireguard.com/install и скачайте установщик для Windows. Запустите и установите.' },
    { title: '2. Скачайте конфиг', body: 'В NEXTVPN нажмите кнопку подключения. В открывшемся окне нажмите «Скачать .conf».' },
    { title: '3. Импортируйте конфиг', body: 'Откройте приложение WireGuard → «Импортировать туннель из файла» → выберите скачанный .conf файл.' },
    { title: '4. Подключитесь', body: 'Нажмите «Активировать». Значок в трее станет цветным — VPN работает.' },
  ],
  mac: [
    { title: '1. Установите WireGuard', body: 'Откройте Mac App Store, найдите «WireGuard» и установите.' },
    { title: '2. Скачайте конфиг', body: 'В NEXTVPN нажмите кнопку подключения и затем «Скачать .conf».' },
    { title: '3. Импортируйте туннель', body: 'В WireGuard нажмите «+» → «Импортировать туннель из файла» → выберите .conf.' },
    { title: '4. Включите VPN', body: 'Нажмите «Активировать». В строке меню появится иконка WireGuard.' },
  ],
  linux: [
    { title: '1. Установите WireGuard', body: 'Ubuntu/Debian: sudo apt install wireguard. Fedora: sudo dnf install wireguard-tools. Arch: sudo pacman -S wireguard-tools.' },
    { title: '2. Сохраните конфиг', body: 'В NEXTVPN скачайте .conf и сохраните как /etc/wireguard/wg0.conf (нужен sudo).' },
    { title: '3. Запустите', body: 'sudo wg-quick up wg0 — подключиться, sudo wg-quick down wg0 — отключиться.' },
    { title: '4. Автозапуск', body: 'sudo systemctl enable wg-quick@wg0 — чтобы VPN включался автоматически.' },
  ],
};

export function HelpScreen({ onBack }: HelpScreenProps) {
  const [platform, setPlatform] = useState<Platform>('ios');

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <div className="flex items-center gap-3 px-5 pt-14 pb-4">
        <button onClick={onBack} className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center active:scale-90 transition-transform">
          <Icon name="ArrowLeft" size={18} />
        </button>
        <h1 className="text-xl font-display font-bold">Как подключить</h1>
      </div>

      <div className="px-5 pb-3">
        <p className="text-sm text-muted-foreground mb-3">Выберите устройство:</p>
        <div className="grid grid-cols-3 gap-2 mb-5">
          {PLATFORMS.map(p => (
            <button
              key={p.id}
              onClick={() => setPlatform(p.id)}
              className={`flex flex-col items-center gap-1 p-3 rounded-2xl border transition-all active:scale-95 ${
                platform === p.id ? 'bg-primary/20 border-primary/50 text-primary' : 'bg-white/5 border-white/10 text-muted-foreground'
              }`}
            >
              <Icon name={p.icon} fallback="Monitor" size={20} />
              <span className="text-[10px] font-medium">{p.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-8">
        <div className="flex flex-col gap-3">
          {STEPS[platform].map((step, i) => (
            <div key={i} className="bg-white/5 border border-white/10 rounded-2xl p-4">
              <h3 className="font-semibold text-sm mb-1.5 text-primary">{step.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{step.body}</p>
            </div>
          ))}
        </div>

        <div className="mt-6 p-4 rounded-2xl bg-primary/5 border border-primary/20">
          <div className="flex items-start gap-3">
            <Icon name="HelpCircle" size={18} className="text-primary flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold mb-1">Нужна помощь?</p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Если что-то не получается — напишите нам, мы поможем.
              </p>
              <a href="mailto:support@nextvpn.ru" className="inline-flex items-center gap-1.5 mt-2 text-xs text-primary font-medium hover:underline">
                <Icon name="Mail" size={12} />
                support@nextvpn.ru
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default HelpScreen;
