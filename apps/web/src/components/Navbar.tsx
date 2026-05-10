'use client';

import Link from 'next/link';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, Trophy } from 'lucide-react';

const links = [
  { href: '/events/new', label: 'Create event' },
  { href: '/events', label: 'Events' },
  { href: '/login', label: 'Organizer login' },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-bg-border bg-bg-base/80 backdrop-blur-md">
      <div className="container-tight flex h-14 items-center justify-between">
        <Link href="/" className="flex items-center gap-2 text-sm font-semibold text-fg-default">
          <Trophy size={18} className="text-fg-default" />
          HackJudge
        </Link>

        {/* Desktop */}
        <nav className="hidden items-center gap-1 md:flex">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="rounded-md px-3 py-2 text-sm text-fg-muted transition-colors hover:text-fg-default"
            >
              {l.label}
            </Link>
          ))}
        </nav>

        {/* Mobile toggle */}
        <button onClick={() => setOpen(!open)} className="md:hidden btn-ghost">
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {open && (
          <motion.nav
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="border-t border-bg-border bg-bg-base md:hidden"
          >
            <div className="container-tight flex flex-col gap-1 py-3">
              {links.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className="rounded-md px-3 py-2.5 text-sm text-fg-muted transition-colors hover:bg-bg-muted hover:text-fg-default"
                >
                  {l.label}
                </Link>
              ))}
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
}
