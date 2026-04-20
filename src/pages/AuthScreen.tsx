import { useState, useEffect } from 'react';
import Icon from '@/components/ui/icon';

const VPN_AUTH_URL = 'https://functions.poehali.dev/529a9537-80ea-438b-a860-ecd84143015b';
const TOKEN_KEY = 'vpn_token';

interface AuthScreenProps {
  onAuth: (token: string) => void;
}

type AuthMode = 'login' | 'register' | 'forgot' | 'reset';

async function callAuth(action: string, payload: Record<string, string>) {
  const res = await fetch(VPN_AUTH_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, ...payload }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `Ошибка ${res.status}`);
  return data;
}

export function AuthScreen({ onAuth }: AuthScreenProps) {
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const t = params.get('reset_token');
    if (t) {
      setResetToken(t);
      setMode('reset');
    }
    const vt = params.get('verify_email');
    if (vt) {
      callAuth('verify', { token: vt })
        .then(() => setSuccess('Email подтверждён! Теперь войдите в аккаунт.'))
        .catch(err => setError(err.message))
        .finally(() => {
          const url = new URL(window.location.href);
          url.searchParams.delete('verify_email');
          window.history.replaceState({}, '', url.toString());
        });
    }
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      if (mode === 'login') {
        const res = await callAuth('login', { email, password });
        localStorage.setItem(TOKEN_KEY, res.token);
        onAuth(res.token);
      } else if (mode === 'register') {
        if (password.length < 6) throw new Error('Пароль минимум 6 символов');
        const res = await callAuth('register', { email, password, name });
        localStorage.setItem(TOKEN_KEY, res.token);
        onAuth(res.token);
      } else if (mode === 'forgot') {
        await callAuth('forgot', { email });
        setSuccess('Если email зарегистрирован — инструкции отправлены на почту.');
      } else if (mode === 'reset') {
        if (password.length < 6) throw new Error('Пароль минимум 6 символов');
        await callAuth('reset', { token: resetToken, password });
        setSuccess('Пароль изменён! Войдите с новым паролем.');
        setMode('login');
        setPassword('');
        const url = new URL(window.location.href);
        url.searchParams.delete('reset_token');
        window.history.replaceState({}, '', url.toString());
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Произошла ошибка');
    } finally {
      setLoading(false);
    }
  }

  const title = mode === 'login' ? 'Добро пожаловать'
    : mode === 'register' ? 'Создать аккаунт'
    : mode === 'forgot' ? 'Сброс пароля'
    : 'Новый пароль';

  const submitLabel = mode === 'login' ? 'Войти'
    : mode === 'register' ? 'Зарегистрироваться'
    : mode === 'forgot' ? 'Отправить ссылку'
    : 'Сохранить пароль';

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background px-5">
      <div className="flex flex-col items-center mb-10">
        <div className="w-16 h-16 rounded-2xl bg-primary/20 border border-primary/40 flex items-center justify-center mb-4">
          <Icon name="Shield" size={32} className="text-primary" />
        </div>
        <h1 className="font-display font-bold text-3xl tracking-widest">NEXTVPN</h1>
        <p className="text-muted-foreground text-sm mt-1">Secure. Fast. Private.</p>
      </div>

      <div className="w-full max-w-sm bg-white/5 border border-white/10 rounded-3xl p-6">
        <h2 className="text-xl font-semibold mb-6 text-center">{title}</h2>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {mode === 'register' && (
            <div className="relative">
              <Icon name="User" size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Имя"
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-2xl pl-10 pr-4 py-3.5 text-sm outline-none focus:border-primary/50 transition-colors placeholder:text-muted-foreground"
              />
            </div>
          )}

          {mode !== 'reset' && (
            <div className="relative">
              <Icon name="Mail" size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                className="w-full bg-white/5 border border-white/10 rounded-2xl pl-10 pr-4 py-3.5 text-sm outline-none focus:border-primary/50 transition-colors placeholder:text-muted-foreground"
              />
            </div>
          )}

          {(mode === 'login' || mode === 'register' || mode === 'reset') && (
            <div className="relative">
              <Icon name="Lock" size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="password"
                placeholder={mode === 'register' || mode === 'reset' ? 'Пароль (мин. 6 символов)' : 'Пароль'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                minLength={mode === 'register' || mode === 'reset' ? 6 : 1}
                className="w-full bg-white/5 border border-white/10 rounded-2xl pl-10 pr-4 py-3.5 text-sm outline-none focus:border-primary/50 transition-colors placeholder:text-muted-foreground"
              />
            </div>
          )}

          {error && <p className="text-red-400 text-sm text-center">{error}</p>}
          {success && <p className="text-green-400 text-sm text-center">{success}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 rounded-2xl bg-primary text-white font-semibold text-base tracking-wide hover:bg-primary/90 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed mt-1"
          >
            {loading ? 'Подождите...' : submitLabel}
          </button>
        </form>

        <div className="flex flex-col gap-3 mt-5 pt-5 border-t border-white/10">
          {mode === 'login' && (
            <>
              <button
                onClick={() => { setMode('register'); setError(''); setSuccess(''); }}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors text-center"
              >
                Нет аккаунта? <span className="text-primary font-medium">Зарегистрироваться</span>
              </button>
              <button
                onClick={() => { setMode('forgot'); setError(''); setSuccess(''); }}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors text-center"
              >
                Забыли пароль?
              </button>
            </>
          )}
          {(mode === 'register' || mode === 'forgot' || mode === 'reset') && (
            <button
              onClick={() => { setMode('login'); setError(''); setSuccess(''); }}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors text-center"
            >
              ← Назад к входу
            </button>
          )}
        </div>

        {mode === 'register' && (
          <p className="text-[10px] text-muted-foreground/70 text-center mt-4 leading-relaxed">
            Регистрируясь, вы соглашаетесь с <a href="?legal=terms" className="text-primary hover:underline">Офертой</a> и <a href="?legal=privacy" className="text-primary hover:underline">Политикой конфиденциальности</a>
          </p>
        )}
      </div>
      <p className="text-[10px] text-muted-foreground/50 text-center mt-6">ИНН 233907083873</p>
    </div>
  );
}

export default AuthScreen;
