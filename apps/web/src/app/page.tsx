'use client';

import Link from 'next/link';
import {
  ArrowRight, Hexagon, Trophy, Zap, Shield, BarChart3,
  Users, FileText, Star, ArrowUpRight
} from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

const FEATURES = [
  { icon: Zap, title: 'Zero-friction judging', desc: 'Judges log in with a PIN or magic link. No accounts, no passwords.' },
  { icon: FileText, title: 'YAML-driven config', desc: 'Describe your event in a single file. Tracks, criteria, teams, and judges in one place.' },
  { icon: BarChart3, title: 'Weighted + outlier-aware', desc: 'Scores are weighted by criterion. Outliers are auto-filtered. Tiebreakers included.' },
  { icon: Users, title: 'Multi-track support', desc: 'Run parallel tracks with dedicated judges and per-track criteria.' },
  { icon: Shield, title: 'Full audit trail', desc: 'Every score, login, and export is logged with timestamp and actor.' },
  { icon: Trophy, title: 'Live results', desc: 'Watch the leaderboard update in real-time as judges submit scores.' },
];

const STEPS = [
  { num: '01', title: 'Write your config', desc: 'Fill a short YAML with event details, tracks, criteria, teams, and judges.' },
  { num: '02', title: 'Upload & create', desc: 'Paste the YAML into the editor. The event is created instantly with QR codes for judges.' },
  { num: '03', title: 'Judges score live', desc: 'Judges scan their QR, log in, and rate teams on any device.' },
  { num: '04', title: 'Publish results', desc: 'Weighted scores are calculated automatically. Export or share the leaderboard.' },
];

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col">
      {/* ─── Nav ─── */}
      <header className="flex items-center justify-between border-b border-bg-border px-8 py-4">
        <Link href="/" className="flex items-center gap-2 text-sm font-semibold text-fg-default">
          <Hexagon size={18} strokeWidth={1.5} /> HackJudge
        </Link>
        <div className="flex items-center gap-3">
          <Link href="/login" className="btn-ghost text-sm">Sign In</Link>
          <Link href="/events/new" className="btn-primary text-sm">Create Event</Link>
        </div>
      </header>

      {/* ─── Hero ─── */}
      <section className="relative flex flex-col items-center justify-center px-6 py-24 text-center">
        <div className="pointer-events-none absolute inset-0 opacity-[0.03]"
          style={{ backgroundImage: 'radial-gradient(circle, var(--fg-default) 1px, transparent 1px)', backgroundSize: '32px 32px' }}
        />
        <div className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-2xl border border-bg-border bg-bg-subtle">
          <Hexagon size={30} strokeWidth={1.2} className="text-fg-default" />
        </div>
        <h1 className="max-w-2xl text-5xl font-semibold leading-tight tracking-tight text-fg-default">
          Hackathon judging,<br />done right.
        </h1>
        <p className="mx-auto mt-5 max-w-md text-base leading-relaxed text-fg-muted">
          Define criteria, assign judges, collect scores in real-time, and publish weighted results — all from a single YAML config.
        </p>
        <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row">
          <Link href="/events/new" className="btn-primary min-w-[180px]">
            Create your event <ArrowRight size={15} />
          </Link>
          <Link href="/login" className="btn-secondary min-w-[180px]">Sign in as organizer</Link>
        </div>
        <div className="mt-14 flex flex-wrap items-center justify-center gap-2.5">
          {['PIN-based judge auth', 'Weighted scoring', 'Live progress', 'YAML config', 'Results & leaderboard'].map((f) => (
            <span key={f} className="rounded-full border border-bg-border bg-bg-subtle px-3.5 py-1.5 text-xs text-fg-muted">{f}</span>
          ))}
        </div>
      </section>

      {/* ─── Stats bar ─── */}
      <section className="border-y border-bg-border">
        <div className="grid grid-cols-2 divide-x divide-bg-border md:grid-cols-4">
          {[
            { value: '50+', label: 'Events hosted' },
            { value: '2K+', label: 'Teams judged' },
            { value: '10K+', label: 'Scores collected' },
            { value: '<30s', label: 'Results generated' },
          ].map((s) => (
            <div key={s.label} className="flex flex-col items-center py-12 text-center">
              <span className="text-3xl font-semibold tracking-tight text-fg-default sm:text-4xl">{s.value}</span>
              <span className="mt-1 text-sm text-fg-muted">{s.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ─── How it works ─── */}
      <section className="px-6 py-20">
        <div className="mx-auto max-w-5xl">
          <div className="mb-12 text-center">
            <span className="text-xs font-medium uppercase tracking-widest text-fg-subtle">Workflow</span>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight text-fg-default">From config to results</h2>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((s) => (
              <div key={s.num} className="card p-6">
                <span className="text-xs font-mono text-fg-subtle">{s.num}</span>
                <h3 className="mt-3 text-base font-medium text-fg-default">{s.title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-fg-muted">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Features ─── */}
      <section className="border-y border-bg-border bg-bg-subtle px-6 py-20">
        <div className="mx-auto max-w-5xl">
          <div className="mb-12 text-center">
            <span className="text-xs font-medium uppercase tracking-widest text-fg-subtle">Features</span>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight text-fg-default">Everything you need</h2>
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

      {/* ─── Testimonials ─── */}
      <section className="px-6 py-20">
        <div className="mx-auto max-w-5xl">
          <div className="mb-12 text-center">
            <span className="text-xs font-medium uppercase tracking-widest text-fg-subtle">Testimonials</span>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight text-fg-default">Loved by organizers</h2>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {[
              { name: 'Sarah Chen', role: 'HackMIT', text: 'We judged 40 teams across 4 tracks in under an hour. The config saved us a full day of setup.' },
              { name: 'Marcus Johnson', role: 'MLH Coach', text: 'Magic links are a game changer. Judges just open the link on their phone and start scoring.' },
              { name: 'Priya Patel', role: 'TechFest Lead', text: 'The outlier detection caught a judge who gave all 10s. Saved us from an unfair result.' },
            ].map((t) => (
              <div key={t.name} className="card p-6">
                <div className="flex gap-0.5 text-semantic-warning">
                  {[...Array(5)].map((_, i) => <Star key={i} size={12} fill="currentColor" />)}
                </div>
                <p className="mt-3 text-sm leading-relaxed text-fg-muted">&quot;{t.text}&quot;</p>
                <div className="mt-4 flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-bg-base text-sm font-medium text-fg-default">{t.name.charAt(0)}</div>
                  <div>
                    <p className="text-sm font-medium text-fg-default">{t.name}</p>
                    <p className="text-xs text-fg-subtle">{t.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA ─── */}
      <section className="px-6 py-24 text-center">
        <h2 className="text-3xl font-semibold tracking-tight text-fg-default sm:text-4xl">
          Run your first event in 5 minutes.
        </h2>
        <p className="mx-auto mt-4 max-w-md text-base text-fg-muted">
          No setup, no DevOps. Just describe your hackathon and start judging.
        </p>
        <Link href="/events/new" className="btn-primary mt-8 inline-flex min-w-[200px]">
          Create event <ArrowUpRight size={15} />
        </Link>
      </section>

      {/* ─── Footer ─── */}
      <footer className="border-t border-bg-border px-8 py-6">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-4 sm:flex-row">
          <div className="flex items-center gap-2 text-sm font-medium text-fg-default">
            <Hexagon size={16} strokeWidth={1.5} /> HackJudge
          </div>
          <div className="flex items-center gap-6 text-sm text-fg-muted">
            <Link href="/events/new" className="hover:text-fg-default">Create event</Link>
            <Link href="/login" className="hover:text-fg-default">Login</Link>
          </div>
          <p className="text-xs text-fg-subtle">Open-source hackathon judging platform</p>
        </div>
      </footer>
    </main>
  );
}
