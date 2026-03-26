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
    <div className="min-h-screen bg-dark-950 flex items-center justify-center p-4">
      {/* Background grid */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute inset-0"
          style={{
            backgroundImage: 'linear-gradient(rgba(59,130,246,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(59,130,246,0.03) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }} />
        <div className="absolute inset-0 bg-gradient-to-br from-primary-900/20 via-transparent to-violet-900/20" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-600 rounded-2xl mb-4 shadow-lg shadow-primary-900">
            <Network className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-dark-100">DCIM Pro</h1>
          <p className="text-dark-500 text-sm mt-1">Data Center Infrastructure Manager</p>
        </div>

        {/* Login form */}
        <div className="card shadow-2xl shadow-dark-950/50 border-dark-700">
          <h2 className="text-lg font-semibold text-dark-100 mb-6">Sign In</h2>

          {error && (
            <div className="flex items-center gap-2 bg-red-900/30 border border-red-800/50 text-red-400 text-sm px-4 py-3 rounded-lg mb-4">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm text-dark-400 mb-1.5">Username</label>
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
              <label className="block text-sm text-dark-400 mb-1.5">Password</label>
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
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-500 hover:text-dark-300"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary w-full py-2.5 flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
              ) : 'Sign In'}
            </button>
          </form>

          <div className="mt-4 p-3 bg-dark-800/50 rounded-lg text-xs text-dark-500">
            <div className="font-medium text-dark-400 mb-1">Demo credentials:</div>
            <div>Admin: <span className="font-mono text-dark-300">admin / admin123</span></div>
            <div>Engineer: <span className="font-mono text-dark-300">engineer1 / dcim1234</span></div>
          </div>
        </div>

        <p className="text-center text-dark-600 text-xs mt-6">
          DCIM Pro — Enterprise Data Center Management
        </p>
      </div>
    </div>
  );
}
