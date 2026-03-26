import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { Network, Eye, EyeOff, AlertCircle } from 'lucide-react';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const { login, isLoading } = useAuthStore();
  const navigate = useNavigate();

  // Apply saved theme on login page
  const savedTheme = (() => {
    try {
      return JSON.parse(localStorage.getItem('ui-storage') || '{}')?.state?.theme || 'dark';
    } catch {
      return 'dark';
    }
  })();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await login(username, password);
      navigate('/');
    } catch {
      setError('Invalid username or password');
    }
  };

  return (
    <div
      className={savedTheme}
      style={{ minHeight: '100vh', backgroundColor: 'var(--bg-base)' }}
    >
      <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
        {/* Background grid */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage:
                'linear-gradient(rgba(59,130,246,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(59,130,246,0.04) 1px, transparent 1px)',
              backgroundSize: '40px 40px',
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-br from-primary-900/20 via-transparent to-violet-900/20" />
        </div>

        <div className="relative w-full max-w-md">
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-600 rounded-2xl mb-4 shadow-2xl shadow-primary-900/60">
              <Network className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>
              DCIM Pro
            </h1>
            <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
              Data Center Infrastructure Manager
            </p>
          </div>

          {/* Login form */}
          <div className="card shadow-2xl" style={{ boxShadow: '0 25px 50px -12px rgba(0,0,0,0.4)' }}>
            <h2 className="text-lg font-semibold mb-6" style={{ color: 'var(--text-primary)' }}>
              Sign In
            </h2>

            {error && (
              <div className="flex items-center gap-2 text-red-400 text-sm px-4 py-3 rounded-lg mb-4"
                style={{ backgroundColor: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)' }}>
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                  Username
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="input w-full"
                  placeholder="admin"
                  required
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="input w-full pr-10"
                    placeholder="••••••••"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 transition-opacity hover:opacity-80"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="btn-primary w-full py-2.5 justify-center"
              >
                {isLoading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                ) : (
                  'Sign In'
                )}
              </button>
            </form>

            <div
              className="mt-5 p-3 rounded-lg text-xs"
              style={{
                backgroundColor: 'var(--bg-elevated)',
                color: 'var(--text-muted)',
              }}
            >
              <div className="font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>
                Demo credentials:
              </div>
              <div>
                Admin:{' '}
                <span className="font-mono" style={{ color: 'var(--text-primary)' }}>
                  admin / admin123
                </span>
              </div>
              <div>
                Engineer:{' '}
                <span className="font-mono" style={{ color: 'var(--text-primary)' }}>
                  engineer1 / dcim1234
                </span>
              </div>
            </div>
          </div>

          <p className="text-center text-xs mt-6" style={{ color: 'var(--text-muted)' }}>
            DCIM Pro — Enterprise Data Center Management
          </p>
        </div>
      </div>
    </div>
  );
}
