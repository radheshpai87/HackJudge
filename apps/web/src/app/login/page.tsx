'use client';

import { useState, useEffect } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Hexagon, ArrowRight, Eye, EyeOff } from 'lucide-react';

const API = '/api';

type Tab = 'signin' | 'register';

function useGoogleCallback() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const accessToken = params.get('accessToken');
    const from = params.get('from');
    if (accessToken && from === 'google') {
      localStorage.setItem('token', accessToken);
      const refreshToken = params.get('refreshToken');
      if (refreshToken) localStorage.setItem('refreshToken', refreshToken);
      window.location.href = params.get('next') || '/home';
    }
  }, []);
}

export default function LoginPage() {
  const [tab, setTab] = useState<Tab>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const reduced = useReducedMotion();

  useGoogleCallback();

  useEffect(() => {
    if (localStorage.getItem('token')) {
      const next = new URLSearchParams(window.location.search).get('next') || '/home';
      window.location.href = next;
    }
  }, []);

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`${API}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (data.success) {
        localStorage.setItem('token', data.data.accessToken);
        localStorage.setItem('refreshToken', data.data.refreshToken);
        const next = new URLSearchParams(window.location.search).get('next') || '/home';
        window.location.href = next;
      } else {
        setError(data.error?.message || 'Login failed');
      }
    } catch {
      setError('Network error. Is the API running?');
    } finally {
      setLoading(false);
    }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (password.length < 6) { setError('Password must be at least 6 characters'); return; }
    setLoading(true);
    try {
      const res = await fetch(`${API}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      });
      const data = await res.json();
      if (data.success) {
        localStorage.setItem('token', data.data.accessToken);
        localStorage.setItem('refreshToken', data.data.refreshToken);
        const next = new URLSearchParams(window.location.search).get('next') || '/home';
        window.location.href = next;
      } else {
        setError(data.error?.message || 'Registration failed');
      }
    } catch {
      setError('Network error. Is the API running?');
    } finally {
      setLoading(false);
    }
  }

  function signInWithGoogle() {
    window.location.href = `${API}/auth/google`;
  }

  return (
    <main className="page-shell flex min-h-screen items-center justify-center px-6">
      <motion.div
        initial={reduced ? undefined : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-[400px]"
      >
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl border border-bg-border bg-bg-subtle">
            <Hexagon size={24} className="text-fg-default" />
          </div>
          <h1 className="text-2xl font-semibold text-fg-default">HackJudge</h1>
          <p className="mt-1 text-sm text-fg-muted">Organizer portal</p>
        </div>

        <div className="card p-6">
          {/* Tabs */}
          <div className="mb-5 flex rounded-lg border border-bg-border bg-bg-muted p-1">
            <button
              type="button"
              onClick={() => { setTab('signin'); setError(''); }}
              className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${tab === 'signin' ? 'bg-bg-base text-fg-default shadow-sm' : 'text-fg-subtle hover:text-fg-muted'}`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => { setTab('register'); setError(''); }}
              className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${tab === 'register' ? 'bg-bg-base text-fg-default shadow-sm' : 'text-fg-subtle hover:text-fg-muted'}`}
            >
              Register
            </button>
          </div>

          {/* Google */}
          <button
            type="button"
            onClick={signInWithGoogle}
            className="mb-5 flex w-full items-center justify-center gap-2 rounded-lg border border-bg-border bg-bg-subtle px-4 py-2.5 text-sm font-medium text-fg-default transition-colors hover:bg-bg-muted"
          >
            <svg viewBox="0 0 24 24" width="18" height="18" className="flex-shrink-0">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Continue with Google
          </button>

          <div className="mb-5 flex items-center gap-3">
            <div className="h-px flex-1 bg-bg-border" />
            <span className="text-xs text-fg-subtle">or</span>
            <div className="h-px flex-1 bg-bg-border" />
          </div>

          {error && (
            <div className="mb-4 rounded-lg border border-semantic-error/20 bg-semantic-error/10 px-4 py-3 text-sm text-semantic-error">
              {error}
            </div>
          )}

          {tab === 'signin' ? (
            <form onSubmit={handleSignIn} className="space-y-4">
              <div>
                <label className="label">Email</label>
                <input
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input"
                  required
                />
              </div>
              <div>
                <label className="label">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="input w-full pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-fg-subtle hover:text-fg-muted"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              <button type="submit" disabled={loading} className="btn-primary w-full">
                {loading ? 'Signing in…' : <>Sign in <ArrowRight size={16} /></>}
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label className="label">Name</label>
                <input
                  type="text"
                  placeholder="Your name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="input"
                  required
                />
              </div>
              <div>
                <label className="label">Email</label>
                <input
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input"
                  required
                />
              </div>
              <div>
                <label className="label">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Min 6 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="input w-full pr-10"
                    required
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-fg-subtle hover:text-fg-muted"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              <button type="submit" disabled={loading} className="btn-primary w-full">
                {loading ? 'Creating account…' : <>Create account <ArrowRight size={16} /></>}
              </button>
            </form>
          )}
        </div>
      </motion.div>
    </main>
  );
}
