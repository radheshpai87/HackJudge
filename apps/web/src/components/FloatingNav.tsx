'use client';

import Link from 'next/link';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, Trophy } from 'lucide-react';

const links = [
  { href: '/events/new', label: 'Create event' },
  { href: '/events', label: 'Events' },
  { href: '/login', label: 'Login' },
];

export default function FloatingNav() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Desktop floating pill */}
      <header className="fixed top-5 left-1/2 z-50 hidden -translate-x-1/2 md:block">
        <nav className="flex items-center gap-1 rounded-full border border-bg-border bg-bg-subtle/80 px-2 py-2 backdrop-blur-xl">
          <Link href="/" className="flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold text-fg-default">
            <Trophy size={16} className="text-fg-default" />
            HackJudge
          </Link>
          <div className="h-4 w-px bg-bg-border" />
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="rounded-full px-4 py-2 text-sm text-fg-muted transition-colors hover:text-fg-default"
            >
              {l.label}
            </Link>
          ))}
        </nav>
      </header>

      {/* Mobile hamburger */}
      <header className="fixed top-4 right-4 z-50 md:hidden">
        <button
          onClick={() => setOpen(!open)}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-bg-border bg-bg-subtle/80 backdrop-blur-xl text-fg-default"
        >
          {open ? <X size={18} /> : <Menu size={18} />}
        </button>
      </header>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="fixed inset-x-4 top-16 z-50 rounded-2xl border border-bg-border bg-bg-subtle/95 p-6 backdrop-blur-xl md:hidden"
          >
            <div className="flex flex-col gap-2">
              <Link href="/" onClick={() => setOpen(false)} className="flex items-center gap-2 px-3 py-3 text-sm font-semibold text-fg-default">
                <Trophy size={16} /> HackJudge
              </Link>
              <div className="my-1 h-px bg-bg-border" />
              {links.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className="rounded-xl px-3 py-3 text-sm text-fg-muted transition-colors hover:bg-bg-muted hover:text-fg-default"
                >
                  {l.label}
                </Link>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
