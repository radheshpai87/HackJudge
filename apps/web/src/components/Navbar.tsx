'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, Plus, LogOut, LayoutDashboard, ArrowRight, Trophy } from 'lucide-react';

function NavLink({ href, children, onClick }: { href: string; children: React.ReactNode; onClick?: () => void }) {
  const [hov, setHov] = useState(false);
  return (
    <Link
      href={href}
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      className="relative flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-fg-muted transition-colors duration-150 hover:text-fg-default"
    >
      <AnimatePresence>
        {hov && (
          <motion.span
            key="bg"
            layoutId="nav-hover"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="absolute inset-0 rounded-lg bg-bg-muted"
          />
        )}
      </AnimatePresence>
      <span className="relative z-10 flex items-center gap-1.5">{children}</span>
    </Link>
  );
}

function NavAnchor({ href, children }: { href: string; children: React.ReactNode }) {
  const [hov, setHov] = useState(false);
  return (
    <a
      href={href}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      className="relative flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-fg-muted transition-colors duration-150 hover:text-fg-default"
    >
      <AnimatePresence>
        {hov && (
          <motion.span
            key="bg"
            layoutId="nav-hover"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="absolute inset-0 rounded-lg bg-bg-muted"
          />
        )}
      </AnimatePresence>
      <span className="relative z-10">{children}</span>
    </a>
  );
}

const PILL_BASE = 'linear-gradient(#111111cc, #111111cc) padding-box, linear-gradient(135deg, rgba(255,255,255,0.10), rgba(255,255,255,0.03) 50%, rgba(255,255,255,0.10)) border-box';
const PILL_SCROLLED = 'linear-gradient(#141414f5, #141414f5) padding-box, linear-gradient(135deg, rgba(255,255,255,0.14), rgba(255,255,255,0.04) 50%, rgba(255,255,255,0.14)) border-box';

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    setLoggedIn(!!localStorage.getItem('token'));
    const onScroll = () => setScrolled(window.scrollY > 16);
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
      <div className="pointer-events-none fixed left-0 right-0 top-0 z-50 hidden justify-center pt-4 md:flex">
        <motion.header
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="pointer-events-auto flex items-center gap-1 rounded-2xl px-2.5 py-2 transition-all duration-300"
          style={{
            background: scrolled ? PILL_SCROLLED : PILL_BASE,
            border: '1px solid transparent',
            backdropFilter: 'blur(24px)',
            boxShadow: scrolled
              ? '0 8px 32px rgba(0,0,0,0.5), 0 2px 8px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.04)'
              : '0 4px 16px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.04)',
          }}
        >
          {/* Logo mark */}
          <Link
            href={loggedIn ? '/home' : '/'}
            className="group mr-1 flex items-center gap-2.5 rounded-xl px-2 py-1 transition-opacity hover:opacity-80"
          >
            <div
              className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg"
              style={{
                background: 'linear-gradient(145deg, #2a2a2a 0%, #1a1a1a 100%)',
                border: '1px solid rgba(255,255,255,0.10)',
                boxShadow: '0 2px 4px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.06)',
              }}
            >
              <Trophy size={13} strokeWidth={1.6} className="text-fg-default" />
            </div>
            <span className="text-sm font-semibold tracking-tight text-fg-default">HackJudge</span>
          </Link>

          {/* Divider */}
          <div className="mx-0.5 h-4 w-px bg-bg-border/60" />

          {/* Center nav links */}
          {loggedIn ? (
            <NavLink href="/home">
              <LayoutDashboard size={12} /> My Events
            </NavLink>
          ) : (
            <>
              <NavAnchor href="#how-it-works">How it works</NavAnchor>
              <NavAnchor href="#features">Features</NavAnchor>
            </>
          )}

          {/* Divider */}
          <div className="mx-0.5 h-4 w-px bg-bg-border/60" />

          {/* Actions */}
          {loggedIn ? (
            <>
              <Link
                href={createHref}
                className="flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-semibold text-[#0a0a0a] transition-all hover:opacity-90 active:scale-[0.97]"
                style={{ background: 'linear-gradient(145deg, #f0f0f0 0%, #d8d8d8 100%)', boxShadow: '0 1px 3px rgba(0,0,0,0.4)' }}
              >
                <Plus size={12} strokeWidth={2.5} /> New Event
              </Link>
              <button
                onClick={signOut}
                title="Sign out"
                className="ml-0.5 flex h-8 w-8 items-center justify-center rounded-xl text-fg-subtle transition-all hover:bg-bg-muted hover:text-fg-muted active:scale-[0.97]"
              >
                <LogOut size={13} />
              </button>
            </>
          ) : (
            <>
              <NavLink href="/login">Sign in</NavLink>
              <Link
                href={createHref}
                className="ml-0.5 flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-semibold text-[#0a0a0a] transition-all hover:opacity-90 active:scale-[0.97]"
                style={{ background: 'linear-gradient(145deg, #f0f0f0 0%, #d8d8d8 100%)', boxShadow: '0 1px 3px rgba(0,0,0,0.4)' }}
              >
                Get started <ArrowRight size={11} strokeWidth={2.5} />
              </Link>
            </>
          )}
        </motion.header>
      </div>

      {/* ── Mobile top bar ── */}
      <header className="fixed left-0 right-0 top-0 z-50 flex items-center justify-between px-4 py-3 md:hidden"
        style={{
          background: 'linear-gradient(#0f0f0fdd, #0f0f0fdd) padding-box, linear-gradient(180deg, rgba(255,255,255,0.07), transparent) border-box',
          border: '0 0 1px 0',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          backdropFilter: 'blur(20px)',
        }}
      >
        <Link href={loggedIn ? '/home' : '/'} className="flex items-center gap-2">
          <div
            className="flex h-7 w-7 items-center justify-center rounded-lg"
            style={{
              background: 'linear-gradient(145deg, #2a2a2a 0%, #1a1a1a 100%)',
              border: '1px solid rgba(255,255,255,0.10)',
              boxShadow: '0 2px 4px rgba(0,0,0,0.4)',
            }}
          >
            <Trophy size={13} strokeWidth={1.6} className="text-fg-default" />
          </div>
          <span className="text-sm font-semibold tracking-tight text-fg-default">HackJudge</span>
        </Link>
        <button
          onClick={() => setOpen(!open)}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-fg-muted transition-colors hover:text-fg-default"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          <AnimatePresence mode="wait">
            <motion.span
              key={open ? 'close' : 'open'}
              initial={{ opacity: 0, rotate: open ? -90 : 90 }}
              animate={{ opacity: 1, rotate: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              {open ? <X size={15} /> : <Menu size={15} />}
            </motion.span>
          </AnimatePresence>
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
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-40 md:hidden"
              style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
              onClick={() => setOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: -12, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.98 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              className="fixed inset-x-3 top-[60px] z-50 overflow-hidden rounded-2xl p-1 md:hidden"
              style={{
                background: 'linear-gradient(#161616, #161616) padding-box, linear-gradient(135deg, rgba(255,255,255,0.12), rgba(255,255,255,0.04) 50%, rgba(255,255,255,0.12)) border-box',
                border: '1px solid transparent',
                boxShadow: '0 16px 48px rgba(0,0,0,0.6)',
              }}
            >
              <div className="flex flex-col gap-0.5">
                {loggedIn ? (
                  <>
                    <MobileLink href="/home" icon={<LayoutDashboard size={15} />} onClick={() => setOpen(false)}>My Events</MobileLink>
                    <MobileLink href="/events/new" icon={<Plus size={15} />} onClick={() => setOpen(false)}>New Event</MobileLink>
                    <div className="mx-3 my-1 h-px bg-bg-border/60" />
                    <button
                      onClick={signOut}
                      className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-semantic-error/70 transition-colors hover:bg-semantic-error/10 hover:text-semantic-error"
                    >
                      <LogOut size={15} /> Sign out
                    </button>
                  </>
                ) : (
                  <>
                    <MobileLink href="/login" onClick={() => setOpen(false)}>Sign in</MobileLink>
                    <div className="px-3 pb-3 pt-1">
                      <Link
                        href={createHref}
                        onClick={() => setOpen(false)}
                        className="flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold text-[#0a0a0a]"
                        style={{ background: 'linear-gradient(145deg, #f0f0f0 0%, #d8d8d8 100%)' }}
                      >
                        Get started <ArrowRight size={14} strokeWidth={2.5} />
                      </Link>
                    </div>
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

function MobileLink({ href, icon, children, onClick }: { href: string; icon?: React.ReactNode; children: React.ReactNode; onClick?: () => void }) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-fg-muted transition-colors hover:bg-bg-muted hover:text-fg-default"
    >
      {icon} {children}
    </Link>
  );
}
