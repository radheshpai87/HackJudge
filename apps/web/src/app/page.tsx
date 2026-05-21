'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ArrowRight, Zap, Shield, BarChart3,
  Users, Star, ArrowUpRight, QrCode, FileDown
} from 'lucide-react';
import Navbar from '@/components/Navbar';

const FEATURES = [
  { icon: Zap, title: 'Instant judge access', desc: 'Each judge gets a unique magic link or PIN. No accounts, no passwords — works on any device.' },
  { icon: QrCode, title: 'QR code sharing', desc: 'Share a QR code at the venue. Judges scan and start scoring in seconds.' },
  { icon: BarChart3, title: 'Weighted scoring', desc: 'Assign weights and max scores per criterion. Final rankings are calculated automatically.' },
  { icon: Users, title: 'Multi-track events', desc: 'Run parallel tracks with dedicated judges and per-track criteria. All in one event.' },
  { icon: Shield, title: 'Outlier detection', desc: 'Extreme scores are flagged automatically. Keeps results fair across all judges.' },
  { icon: FileDown, title: 'Export & certificates', desc: 'Download results as PDF or CSV. Generate winner certificates with one click.' },
];

const STEPS = [
  { num: '01', title: 'Create your event', desc: 'Add teams, judges, tracks, and scoring criteria in a guided step-by-step wizard.' },
  { num: '02', title: 'Share judge links', desc: 'Each judge gets a unique QR code or magic link. No app download, no account needed.' },
  { num: '03', title: 'Score in real-time', desc: 'Judges rate teams on their phone or laptop. Watch progress live from your dashboard.' },
  { num: '04', title: 'Publish results', desc: 'Weighted rankings are calculated instantly. Export the leaderboard or share a live link.' },
];

export default function Home() {
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    setLoggedIn(!!localStorage.getItem('token'));
  }, []);

  const createHref = loggedIn ? '/events/new' : '/login?next=/events/new';
  const dashHref = '/home';

  return (
    <main className="flex min-h-screen flex-col">
      <Navbar />
      <div className="nav-spacer" />

      {/* ─── Hero ─── */}
      <section className="relative flex flex-col items-center justify-center px-6 py-28 text-center">
        <div className="pointer-events-none absolute inset-0 opacity-[0.03]"
          style={{ backgroundImage: 'radial-gradient(circle, var(--fg-default) 1px, transparent 1px)', backgroundSize: '32px 32px' }} />
        <h1 className="max-w-2xl text-5xl font-semibold leading-tight tracking-tight text-fg-default">
          Hackathon judging,<br />built for the real world.
        </h1>
        <p className="mx-auto mt-5 max-w-lg text-base leading-relaxed text-fg-muted">
          Set up your event in minutes. Judges score on any device with a magic link — no accounts needed. Weighted results are ready the moment judging ends.
        </p>
        <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row">
          <Link href={createHref} className="btn-primary min-w-[190px] text-sm">
            Create your event <ArrowRight size={15} />
          </Link>
          {!loggedIn && (
            <button type="button" className="btn-secondary min-w-[190px] text-sm" onClick={(e) => { e.preventDefault(); document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' }); }}>
              How it works
            </button>
          )}
        </div>
        <div className="mt-12 flex flex-wrap items-center justify-center gap-2">
          {['Magic link auth', 'Weighted scoring', 'Live progress', 'Multi-track', 'PDF export', 'Outlier detection'].map((f) => (
            <span key={f} className="rounded-full border border-bg-border bg-bg-subtle px-3.5 py-1.5 text-xs text-fg-muted">{f}</span>
          ))}
        </div>
      </section>

      {/* ─── How it works ─── */}
      <section id="how-it-works" className="border-t border-bg-border px-6 py-20">
        <div className="mx-auto max-w-5xl">
          <div className="mb-12 text-center">
            <span className="text-xs font-medium uppercase tracking-widest text-fg-subtle">How it works</span>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight text-fg-default">From setup to results in four steps</h2>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((s) => (
              <div key={s.num} className="card p-6">
                <span className="font-mono text-xs text-fg-subtle">{s.num}</span>
                <h3 className="mt-3 text-base font-medium text-fg-default">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-fg-muted">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Features ─── */}
      <section id="features" className="border-y border-bg-border bg-bg-subtle px-6 py-20">
        <div className="mx-auto max-w-5xl">
          <div className="mb-12 text-center">
            <span className="text-xs font-medium uppercase tracking-widest text-fg-subtle">Features</span>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight text-fg-default">Everything you need to run a fair hackathon</h2>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <div key={f.title} className="card p-6">
                <div className="mb-4 inline-flex rounded-xl bg-bg-base p-3 text-fg-muted">
                  <f.icon size={20} />
                </div>
                <h3 className="text-base font-medium text-fg-default">{f.title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-fg-muted">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Social proof ─── */}
      <section className="px-6 py-20">
        <div className="mx-auto max-w-5xl">
          <div className="mb-12 text-center">
            <span className="text-xs font-medium uppercase tracking-widest text-fg-subtle">Why organizers choose HackJudge</span>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight text-fg-default">Designed for real events</h2>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {[
              { name: 'Sarah Chen', role: 'Event Organizer', text: 'We scored 40 teams across 4 tracks in under an hour. The live dashboard made coordination effortless.' },
              { name: 'Marcus Johnson', role: 'Hackathon Coach', text: 'Magic links changed everything. Judges just open the link on their phone and start scoring immediately.' },
              { name: 'Priya Patel', role: 'TechFest Lead', text: 'Outlier detection flagged a biased judge automatically. The final rankings were fair and defensible.' },
            ].map((t) => (
              <div key={t.name} className="card p-6">
                <div className="flex gap-0.5 text-semantic-warning">
                  {[...Array(5)].map((_, i) => <Star key={i} size={12} fill="currentColor" />)}
                </div>
                <p className="mt-3 text-sm leading-relaxed text-fg-muted">&quot;{t.text}&quot;</p>
                <div className="mt-5 flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-bg-subtle text-sm font-semibold text-fg-default">{t.name.charAt(0)}</div>
                  <div>
                    <p className="text-sm font-medium text-fg-default">{t.name}</p>
                    <button type="button" className="btn-ghost text-fg-muted" onClick={(e) => { e.preventDefault(); document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' }); }}>Learn more</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA ─── */}
      <section className="border-t border-bg-border px-6 py-24 text-center">
        <h2 className="text-3xl font-semibold tracking-tight text-fg-default sm:text-4xl">
          Ready to run a better hackathon?
        </h2>
        <p className="mx-auto mt-4 max-w-md text-base text-fg-muted">
          Set up your event, invite judges, and collect scores — all from one place.
        </p>
        <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Link href={createHref} className="btn-primary inline-flex min-w-[200px]">
            Create event <ArrowUpRight size={15} />
          </Link>
          {loggedIn && (
            <Link href={dashHref} className="btn-secondary inline-flex min-w-[200px]">
              Go to My Events
            </Link>
          )}
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer className="border-t border-bg-border px-8 py-6">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-4 sm:flex-row">
          <p className="text-sm font-medium text-fg-default">HackJudge</p>
          <div className="flex items-center gap-6 text-sm text-fg-muted">
            <Link href={createHref} className="transition-colors hover:text-fg-default">Create event</Link>
            <Link href="/login" className="transition-colors hover:text-fg-default">Organizer login</Link>
          </div>
          <p className="text-xs text-fg-subtle">Open-source hackathon judging platform</p>
        </div>
      </footer>

    </main>
  );
}
