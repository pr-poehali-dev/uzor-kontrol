import { useState } from 'react';
import { api } from '@/lib/api';
import Icon from '@/components/ui/icon';

interface AuthScreenProps {
  onAuth: () => void;
}

type AuthMode = 'login' | 'register' | 'forgot';

export function AuthScreen({ onAuth }: AuthScreenProps) {
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      if (mode === 'login') {
        const res = await api.login(email, password);
        if (res.success) onAuth();
        else setError('Invalid email or password');
      } else if (mode === 'register') {
        await api.register(email, password);
        setSuccess('Account created! Please log in.');
        setMode('login');
      } else {
        await new Promise(r => setTimeout(r, 800));
        setSuccess('Reset link sent to your email.');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background px-5">
      {/* Logo */}
      <div className="flex flex-col items-center mb-10">
        <div className="w-16 h-16 rounded-2xl bg-primary/20 border border-primary/40 flex items-center justify-center mb-4">
          <Icon name="Shield" size={32} className="text-primary" />
        </div>
        <h1 className="font-display font-bold text-3xl tracking-widest">NEXTVPN</h1>
        <p className="text-muted-foreground text-sm mt-1">Secure. Fast. Private.</p>
      </div>

      {/* Card */}
      <div className="w-full max-w-sm bg-white/5 border border-white/10 rounded-3xl p-6">
        <h2 className="text-xl font-semibold mb-6 text-center">
          {mode === 'login' ? 'Welcome back' : mode === 'register' ? 'Create account' : 'Reset password'}
        </h2>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
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

          {mode !== 'forgot' && (
            <div className="relative">
              <Icon name="Lock" size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
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
            {loading ? 'Please wait...' : mode === 'login' ? 'Sign In' : mode === 'register' ? 'Create Account' : 'Send Reset Link'}
          </button>
        </form>

        <div className="flex flex-col gap-3 mt-5 pt-5 border-t border-white/10">
          {mode === 'login' && (
            <>
              <button onClick={() => { setMode('register'); setError(''); }} className="text-sm text-muted-foreground hover:text-foreground transition-colors text-center">
                Don't have an account? <span className="text-primary font-medium">Register</span>
              </button>
              <button onClick={() => { setMode('forgot'); setError(''); }} className="text-sm text-muted-foreground hover:text-foreground transition-colors text-center">
                Forgot password?
              </button>
            </>
          )}
          {(mode === 'register' || mode === 'forgot') && (
            <button onClick={() => { setMode('login'); setError(''); }} className="text-sm text-muted-foreground hover:text-foreground transition-colors text-center">
              ← Back to Sign In
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
