'use client';

import { useState, useEffect } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Hexagon, ArrowRight } from 'lucide-react';

const API = '/api';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const reduced = useReducedMotion();

  useEffect(() => {
    if (localStorage.getItem('token')) {
      const next = new URLSearchParams(window.location.search).get('next') || '/home';
      window.location.href = next;
    }
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`${API}/auth/organizer/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (data.success) {
        localStorage.setItem('token', data.data.accessToken);
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
          <h1 className="text-2xl font-semibold text-fg-default">Organizer Login</h1>
          <p className="mt-1 text-sm text-fg-muted">Sign in to manage your events.</p>
        </div>

        <form onSubmit={handleSubmit} className="card p-6">
          {error && (
            <div className="mb-4 rounded-lg border border-semantic-error/20 bg-semantic-error/10 px-4 py-3 text-sm text-semantic-error">
              {error}
            </div>
          )}

          <div className="mb-4">
            <label className="label">Email</label>
            <input
              type="email"
              placeholder="organizer@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input"
            />
          </div>

          <div className="mb-6">
            <label className="label">Password</label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input"
            />
          </div>

          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? 'Signing in…' : <>Sign in <ArrowRight size={16} /></>}
          </button>

          <p className="mt-4 text-center text-xs text-fg-subtle">
            Default: organizer@hackjudge.dev / hackjudge-demo
          </p>
        </form>
      </motion.div>
    </main>
  );
}
