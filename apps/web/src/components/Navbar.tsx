'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, Hexagon, Plus, LogOut, LayoutDashboard, ArrowRight } from 'lucide-react';

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    setLoggedIn(!!localStorage.getItem('token'));
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  function signOut() {
    localStorage.removeItem('token');
    window.location.href = '/';
  }

  const createHref = loggedIn ? '/events/new' : '/login?next=/events/new';

  return (
    <>
      {/* ── Desktop floating pill ── */}
      <header
        className={`fixed left-1/2 top-4 z-50 hidden w-full max-w-3xl -translate-x-1/2 px-4 md:block transition-all duration-300 ${scrolled ? 'top-2' : 'top-4'}`}
      >
        <div className={`flex items-center justify-between rounded-2xl border px-4 py-2.5 transition-all duration-300 ${scrolled ? 'border-bg-border/80 bg-bg-subtle/95 shadow-lg shadow-black/30 backdrop-blur-2xl' : 'border-bg-border/50 bg-bg-subtle/80 backdrop-blur-xl'}`}>
          {/* Logo */}
          <Link href={loggedIn ? '/home' : '/'} className="group flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-bg-border bg-bg-muted transition-all group-hover:border-fg-subtle/40 group-hover:bg-bg-overlay">
              <Hexagon size={14} strokeWidth={1.8} className="text-fg-muted transition-colors group-hover:text-fg-default" />
            </div>
            <span className="text-sm font-semibold tracking-tight text-fg-default">HackJudge</span>
          </Link>

          {/* Center divider line */}
          <div className="h-4 w-px bg-bg-border/80 mx-4 hidden lg:block" />

          {/* Center links */}
          <nav className="hidden items-center gap-0.5 lg:flex">
            {loggedIn ? (
              <>
                <Link href="/home" className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-fg-muted transition-colors hover:bg-bg-muted hover:text-fg-default">
                  <LayoutDashboard size={12} /> My Events
                </Link>
              </>
            ) : (
              <>
                <a href="#how-it-works" className="rounded-lg px-3 py-1.5 text-xs font-medium text-fg-muted transition-colors hover:bg-bg-muted hover:text-fg-default">How it works</a>
                <a href="#features" className="rounded-lg px-3 py-1.5 text-xs font-medium text-fg-muted transition-colors hover:bg-bg-muted hover:text-fg-default">Features</a>
              </>
            )}
          </nav>

          <div className="flex-1" />

          {/* Right actions */}
          <div className="flex items-center gap-2">
            {loggedIn ? (
              <>
                <Link href={createHref} className="flex items-center gap-1.5 rounded-lg bg-fg-default px-3.5 py-1.5 text-xs font-semibold text-bg-base transition-opacity hover:opacity-85">
                  <Plus size={12} /> New Event
                </Link>
                <button onClick={signOut} className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs text-fg-subtle transition-colors hover:bg-bg-muted hover:text-fg-muted">
                  <LogOut size={12} />
                </button>
              </>
            ) : (
              <>
                <Link href="/login" className="rounded-lg px-3 py-1.5 text-xs font-medium text-fg-muted transition-colors hover:bg-bg-muted hover:text-fg-default">
                  Sign in
                </Link>
                <Link href={createHref} className="flex items-center gap-1.5 rounded-lg bg-fg-default px-3.5 py-1.5 text-xs font-semibold text-bg-base transition-opacity hover:opacity-85">
                  Get started <ArrowRight size={11} />
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* ── Mobile bar ── */}
      <header className="fixed left-0 right-0 top-0 z-50 flex items-center justify-between border-b border-bg-border/50 bg-bg-base/90 px-5 py-3.5 backdrop-blur-xl md:hidden">
        <Link href={loggedIn ? '/home' : '/'} className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-md border border-bg-border bg-bg-muted">
            <Hexagon size={13} strokeWidth={1.8} className="text-fg-muted" />
          </div>
          <span className="text-sm font-semibold text-fg-default">HackJudge</span>
        </Link>
        <button onClick={() => setOpen(!open)} className="flex h-8 w-8 items-center justify-center rounded-lg border border-bg-border bg-bg-muted text-fg-muted transition-colors hover:text-fg-default">
          {open ? <X size={15} /> : <Menu size={15} />}
        </button>
      </header>

      {/* ── Mobile drawer ── */}
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-bg-base/60 backdrop-blur-sm md:hidden"
              onClick={() => setOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
              className="fixed inset-x-3 top-16 z-50 rounded-2xl border border-bg-border bg-bg-subtle p-4 shadow-xl shadow-black/40 md:hidden"
            >
              <div className="flex flex-col gap-1">
                {loggedIn ? (
                  <>
                    <Link href="/home" onClick={() => setOpen(false)} className="flex items-center gap-2.5 rounded-xl px-3 py-3 text-sm text-fg-muted transition-colors hover:bg-bg-muted hover:text-fg-default">
                      <LayoutDashboard size={15} /> My Events
                    </Link>
                    <Link href="/events/new" onClick={() => setOpen(false)} className="flex items-center gap-2.5 rounded-xl px-3 py-3 text-sm text-fg-muted transition-colors hover:bg-bg-muted hover:text-fg-default">
                      <Plus size={15} /> New Event
                    </Link>
                    <div className="my-1 h-px bg-bg-border" />
                    <button onClick={signOut} className="flex items-center gap-2.5 rounded-xl px-3 py-3 text-sm text-semantic-error/70 transition-colors hover:bg-semantic-error/10 hover:text-semantic-error">
                      <LogOut size={15} /> Sign out
                    </button>
                  </>
                ) : (
                  <>
                    <Link href="/login" onClick={() => setOpen(false)} className="flex items-center gap-2.5 rounded-xl px-3 py-3 text-sm text-fg-muted transition-colors hover:bg-bg-muted hover:text-fg-default">
                      Sign in as organizer
                    </Link>
                    <Link href={createHref} onClick={() => setOpen(false)} className="mt-1 flex items-center justify-center gap-2 rounded-xl bg-fg-default px-3 py-3 text-sm font-semibold text-bg-base">
                      Get started <ArrowRight size={14} />
                    </Link>
                  </>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
