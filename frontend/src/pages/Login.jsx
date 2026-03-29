import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../utils/store';
import { TrendingUp, Mail, Lock, Eye, EyeOff, UserCircle, Sparkles } from 'lucide-react';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [guestLoading, setGuestLoading] = useState(false);
  const { login, guestLogin, isLoading, error } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    const success = await login(email, password);
    if (success) navigate('/dashboard');
  };

  const handleGuestLogin = async () => {
    setGuestLoading(true);
    const success = await guestLogin();
    setGuestLoading(false);
    if (success) navigate('/dashboard');
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500 to-success-500 flex items-center justify-center mx-auto mb-4">
            <TrendingUp className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold">CryptoStock Pro</h1>
          <p className="text-gray-400 mt-2">Track your investments in real-time</p>
        </div>

        {/* Login Form */}
        <div className="glass-card p-8">
          <h2 className="text-xl font-semibold mb-6">Welcome back</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-2">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="input-field pl-10"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-2">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="********"
                  className="input-field pl-10 pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {error && (
              <p className="text-danger-400 text-sm">{error}</p>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary w-full"
            >
              {isLoading && !guestLoading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-4 my-6">
            <div className="flex-1 h-px bg-white/10"></div>
            <span className="text-sm text-gray-400">or</span>
            <div className="flex-1 h-px bg-white/10"></div>
          </div>

          {/* Guest Login Button */}
          <button
            onClick={handleGuestLogin}
            disabled={guestLoading || isLoading}
            className="w-full flex items-center justify-center gap-3 py-3 px-6 rounded-xl
                       bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-semibold
                       transition-all duration-300 hover:from-purple-500 hover:to-indigo-500
                       hover:shadow-lg hover:shadow-purple-500/25
                       disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {guestLoading ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                Setting up your demo...
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                Continue as Guest
              </>
            )}
          </button>
          <p className="text-center text-xs text-gray-500 mt-2">
            Instant access with a pre-loaded sample portfolio
          </p>

          <p className="text-center text-gray-400 mt-6">
            Don't have an account?{' '}
            <Link to="/register" className="text-primary-400 hover:text-primary-300">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
