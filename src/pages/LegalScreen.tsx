import { useState } from 'react';
import Icon from '@/components/ui/icon';

interface LegalScreenProps {
  onBack: () => void;
}

type Tab = 'terms' | 'privacy' | 'contacts';

const TABS: { id: Tab; label: string }[] = [
  { id: 'terms', label: 'Оферта' },
  { id: 'privacy', label: 'Политика' },
  { id: 'contacts', label: 'Контакты' },
];

export function LegalScreen({ onBack }: LegalScreenProps) {
  const [tab, setTab] = useState<Tab>('terms');

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <div className="flex items-center gap-3 px-5 pt-14 pb-4">
        <button onClick={onBack} className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center active:scale-90 transition-transform">
          <Icon name="ArrowLeft" size={18} />
        </button>
        <h1 className="text-xl font-display font-bold">Документы</h1>
      </div>

      <div className="flex gap-2 px-5 pb-4">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 py-2 rounded-xl text-xs font-medium transition-all ${
              tab === t.id ? 'bg-primary/20 border border-primary/50 text-primary' : 'bg-white/5 border border-white/10 text-muted-foreground'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-8">
        {tab === 'terms' && (
          <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
            <h2 className="text-lg font-bold text-foreground">Публичная оферта</h2>
            <p className="text-xs">Редакция от 20 апреля 2026 года</p>

            <h3 className="font-semibold text-foreground pt-2">1. Общие положения</h3>
            <p>Исполнитель — ИП Смирнов А.В. (ИНН 233907083873) предоставляет Заказчику услуги доступа к VPN-сервису NEXTVPN (далее — Сервис) на условиях настоящей оферты.</p>
            <p>Акцепт оферты — оплата подписки. После оплаты Заказчик считается согласившимся со всеми условиями.</p>

            <h3 className="font-semibold text-foreground pt-2">2. Предмет договора</h3>
            <p>Исполнитель предоставляет Заказчику платный доступ к VPN-серверам для шифрования интернет-трафика сроком на 30 дней с момента оплаты.</p>
            <p>Стоимость подписки и состав тарифов указаны в разделе «Тарифы». Оплата производится через сервис ЮKassa.</p>

            <h3 className="font-semibold text-foreground pt-2">3. Права и обязанности</h3>
            <p>Исполнитель обязуется предоставить доступ к Сервису в течение 15 минут после оплаты и обеспечить работоспособность серверов 99% времени в месяц.</p>
            <p>Заказчик обязуется не использовать Сервис для противоправных действий, рассылки спама, DDoS-атак, распространения вредоносного ПО и нарушения авторских прав.</p>

            <h3 className="font-semibold text-foreground pt-2">4. Возврат средств</h3>
            <p>Возврат возможен в течение 7 дней с момента оплаты, если Сервис не был использован (трафик не расходовался). Для возврата напишите на support@nextvpn.ru с указанием email и даты оплаты.</p>
            <p>При технической невозможности предоставить услугу возврат производится пропорционально неиспользованному периоду.</p>

            <h3 className="font-semibold text-foreground pt-2">5. Ответственность</h3>
            <p>Исполнитель не несёт ответственности за действия Заказчика и третьих лиц, а также за перебои в работе Сервиса из-за причин вне его контроля (действия провайдеров, блокировки, форс-мажор).</p>

            <h3 className="font-semibold text-foreground pt-2">6. Реквизиты</h3>
            <p>ИП Смирнов Артём Викторович<br/>ИНН 233907083873<br/>Email: support@nextvpn.ru</p>
          </div>
        )}

        {tab === 'privacy' && (
          <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
            <h2 className="text-lg font-bold text-foreground">Политика конфиденциальности</h2>
            <p className="text-xs">Редакция от 20 апреля 2026 года</p>

            <h3 className="font-semibold text-foreground pt-2">Что мы собираем</h3>
            <p>Мы собираем минимум данных, необходимых для работы Сервиса:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Email-адрес — для входа в аккаунт и уведомлений</li>
              <li>Имя (опционально) — для приветствия в интерфейсе</li>
              <li>IP-адрес — для защиты от атак и для обязательных логов по закону</li>
              <li>Информация о платежах — через ЮKassa, в рамках требований 54-ФЗ</li>
            </ul>

            <h3 className="font-semibold text-foreground pt-2">Что мы НЕ собираем</h3>
            <p>Мы не ведём журналы ваших действий в интернете: какие сайты вы посещаете, какой трафик передаёте, с какими адресами соединяетесь. Мы не можем восстановить эту информацию — её просто нет.</p>

            <h3 className="font-semibold text-foreground pt-2">Как мы используем данные</h3>
            <p>Данные используются только для предоставления Сервиса: авторизации, отправки уведомлений о подписке, предотвращения мошенничества. Мы не передаём ваши данные третьим лицам, кроме случаев, когда этого требует закон.</p>

            <h3 className="font-semibold text-foreground pt-2">Хранение и удаление</h3>
            <p>Данные хранятся на защищённых серверах в ЕС и РФ. Вы можете удалить аккаунт в любой момент, написав на support@nextvpn.ru — все данные будут удалены в течение 30 дней.</p>

            <h3 className="font-semibold text-foreground pt-2">Cookies</h3>
            <p>Мы используем только технические cookies для работы авторизации. Аналитика и реклама отсутствуют.</p>

            <h3 className="font-semibold text-foreground pt-2">Ваши права</h3>
            <p>В соответствии с 152-ФЗ вы имеете право запросить информацию о хранимых данных, их исправление или удаление. Запросы — на support@nextvpn.ru.</p>
          </div>
        )}

        {tab === 'contacts' && (
          <div className="space-y-4">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
              <div className="flex items-center gap-3 mb-3">
                <Icon name="Mail" size={18} className="text-primary" />
                <div>
                  <p className="text-sm font-semibold">Email поддержки</p>
                  <a href="mailto:support@nextvpn.ru" className="text-sm text-primary hover:underline">support@nextvpn.ru</a>
                </div>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Отвечаем с 9:00 до 22:00 по МСК, обычно в течение 2-4 часов.
              </p>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
              <div className="flex items-center gap-3 mb-3">
                <Icon name="MessageCircle" size={18} className="text-primary" />
                <div>
                  <p className="text-sm font-semibold">Telegram</p>
                  <a href="https://t.me/nextvpn_support" target="_blank" rel="noreferrer" className="text-sm text-primary hover:underline">@nextvpn_support</a>
                </div>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Самый быстрый способ связаться — обычно отвечаем за 15-30 минут.
              </p>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
              <p className="text-xs text-muted-foreground mb-2 font-semibold uppercase tracking-wider">Реквизиты</p>
              <div className="text-sm space-y-1">
                <p>ИП Смирнов Артём Викторович</p>
                <p className="text-muted-foreground">ИНН: 233907083873</p>
                <p className="text-muted-foreground">ОГРНИП: присваивается</p>
              </div>
            </div>

            <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4">
              <div className="flex items-start gap-3">
                <Icon name="Shield" size={18} className="text-primary flex-shrink-0 mt-0.5" />
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Оплата принимается через сертифицированный сервис ЮKassa. Ваши платёжные данные не передаются нам и обрабатываются на стороне банка по стандарту PCI DSS.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default LegalScreen;
