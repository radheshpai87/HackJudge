'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ArrowRight, Zap, Shield, BarChart3,
  Users, Star, ArrowUpRight, QrCode, FileDown,
  ChevronRight, Trophy, Clock, Lock, Sparkles
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

const STATS = [
  { label: 'Events hosted', value: '500+' },
  { label: 'Teams judged', value: '12K+' },
  { label: 'Judges served', value: '8K+' },
  { label: 'Countries', value: '40+' },
];

const TESTIMONIALS = [
  { name: 'Sarah Chen', role: 'Event Organizer, MIT Hackathon', text: 'We scored 40 teams across 4 tracks in under an hour. The live dashboard made coordination effortless.', stars: 5 },
  { name: 'Marcus Johnson', role: 'Hackathon Coach, TechStars', text: 'Magic links changed everything. Judges just open the link on their phone and start scoring immediately.', stars: 5 },
  { name: 'Priya Patel', role: 'TechFest Lead, IIT Bombay', text: 'Outlier detection flagged a biased judge automatically. The final rankings were fair and defensible.', stars: 5 },
];

export default function Home() {
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    setLoggedIn(!!localStorage.getItem('token'));
  }, []);

  const createHref = loggedIn ? '/events/new' : '/login?next=/events/new';
  const dashHref = '/home';

  return (
    <main className="flex min-h-screen flex-col overflow-x-hidden">
      <Navbar />
      <div className="nav-spacer" />

      {/* ─── Hero ─── */}
      <section className="relative flex flex-col items-center justify-center px-6 pb-20 pt-12 text-center md:pb-28 md:pt-20">
        {/* Gradient orbs */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -left-32 top-20 h-72 w-72 rounded-full bg-semantic-info/10 blur-[100px] animate-pulse-slow" />
          <div className="absolute -right-32 top-40 h-96 w-96 rounded-full bg-semantic-success/8 blur-[120px] animate-pulse-slow delay-1000" />
          <div className="absolute bottom-20 left-1/2 h-64 w-64 -translate-x-1/2 rounded-full bg-semantic-warning/5 blur-[100px] animate-pulse-slow delay-2000" />
        </div>
        {/* Dot grid */}
        <div className="pointer-events-none absolute inset-0 opacity-[0.04]"
          style={{ backgroundImage: 'radial-gradient(circle, var(--fg-default) 1px, transparent 1px)', backgroundSize: '28px 28px' }} />

        <div className="relative z-10">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-bg-border bg-bg-subtle/80 px-4 py-1.5 text-xs font-medium text-fg-muted backdrop-blur-sm">
            <Sparkles size={12} className="text-semantic-warning" />
            Trusted by 500+ hackathons worldwide
          </div>

          <h1 className="max-w-3xl text-4xl font-bold leading-tight tracking-tight text-fg-default md:text-6xl lg:text-7xl">
            Hackathon judging,
            <br />
            <span className="text-fg-muted">built for scale.</span>
          </h1>

          <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-fg-muted md:text-lg">
            Set up your event in minutes. Judges score on any device with a magic link — no accounts needed. Weighted results ready the moment judging ends.
          </p>

          <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Link href={createHref} className="btn-primary min-w-[200px] text-sm md:text-base">
              Create your event <ArrowRight size={16} />
            </Link>
            {!loggedIn && (
              <button
                type="button"
                className="btn-secondary min-w-[200px] text-sm md:text-base"
                onClick={(e) => { e.preventDefault(); document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' }); }}
              >
                See how it works
              </button>
            )}
          </div>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-2">
            {['Magic link auth', 'Weighted scoring', 'Live progress', 'Multi-track', 'PDF export', 'Outlier detection'].map((f) => (
              <span key={f} className="rounded-full border border-bg-border bg-bg-subtle/60 px-3.5 py-1.5 text-xs text-fg-muted backdrop-blur-sm">
                {f}
              </span>
            ))}
          </div>
        </div>

        {/* Dashboard preview mockup */}
        <div className="relative z-10 mt-16 w-full max-w-4xl px-4 md:mt-20">
          <div className="relative rounded-2xl border border-bg-border bg-bg-subtle/50 p-1 shadow-2xl shadow-black/40 backdrop-blur-sm">
            <div className="absolute -inset-0.5 rounded-2xl bg-gradient-to-b from-fg-default/10 to-transparent opacity-50" />
            <div className="relative overflow-hidden rounded-xl bg-bg-base p-4 md:p-6">
              {/* Mock header */}
              <div className="flex items-center justify-between border-b border-bg-border pb-4">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-lg bg-fg-default/10" />
                  <div className="h-4 w-32 rounded bg-bg-muted" />
                </div>
                <div className="flex gap-2">
                  <div className="h-8 w-20 rounded-lg bg-bg-muted" />
                  <div className="h-8 w-8 rounded-lg bg-bg-muted" />
                </div>
              </div>
              {/* Mock stats */}
              <div className="mt-4 grid grid-cols-3 gap-3">
                {[
                  { label: 'Teams', val: '24', icon: Users },
                  { label: 'Judges', val: '12', icon: Star },
                  { label: 'Completed', val: '89%', icon: Trophy },
                ].map((s) => (
                  <div key={s.label} className="rounded-xl border border-bg-border bg-bg-subtle/50 p-3 md:p-4">
                    <div className="flex items-center gap-2">
                      <s.icon size={14} className="text-fg-subtle" />
                      <span className="text-xs text-fg-subtle">{s.label}</span>
                    </div>
                    <p className="mt-1 text-xl font-bold text-fg-default md:text-2xl">{s.val}</p>
                  </div>
                ))}
              </div>
              {/* Mock progress bar */}
              <div className="mt-4 rounded-xl border border-bg-border bg-bg-subtle/50 p-3 md:p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-fg-subtle">Judging progress</span>
                  <span className="text-xs font-medium text-semantic-success">78% complete</span>
                </div>
                <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-bg-muted">
                  <div className="h-full w-[78%] rounded-full bg-gradient-to-r from-semantic-success to-semantic-info" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Stats bar ─── */}
      <section className="border-y border-bg-border bg-bg-subtle/30 px-6 py-10">
        <div className="mx-auto max-w-5xl">
          <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
            {STATS.map((s) => (
              <div key={s.label} className="text-center">
                <p className="text-2xl font-bold text-fg-default md:text-3xl">{s.value}</p>
                <p className="mt-1 text-xs text-fg-subtle uppercase tracking-wider">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── How it works ─── */}
      <section id="how-it-works" className="px-6 py-20 md:py-28">
        <div className="mx-auto max-w-5xl">
          <div className="mb-12 text-center md:mb-16">
            <span className="text-xs font-medium uppercase tracking-widest text-fg-subtle">How it works</span>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-fg-default md:text-4xl">
              From setup to results in four steps
            </h2>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((s, i) => (
              <div key={s.num} className="group relative card-hover p-6">
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-bg-base text-sm font-bold text-fg-default ring-1 ring-bg-border group-hover:ring-fg-muted/30 transition-all">
                  {s.num}
                </div>
                <h3 className="text-base font-semibold text-fg-default">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-fg-muted">{s.desc}</p>
                {i < STEPS.length - 1 && (
                  <ChevronRight size={16} className="absolute -right-2.5 top-8 hidden text-fg-subtle lg:block" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Features ─── */}
      <section id="features" className="border-y border-bg-border bg-bg-subtle/20 px-6 py-20 md:py-28">
        <div className="mx-auto max-w-5xl">
          <div className="mb-12 text-center md:mb-16">
            <span className="text-xs font-medium uppercase tracking-widest text-fg-subtle">Features</span>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-fg-default md:text-4xl">
              Everything you need to run a fair hackathon
            </h2>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <div key={f.title} className="group card-hover p-6">
                <div className="mb-4 inline-flex rounded-xl bg-bg-base p-3 text-fg-muted ring-1 ring-bg-border group-hover:text-fg-default group-hover:ring-fg-muted/30 transition-all">
                  <f.icon size={20} />
                </div>
                <h3 className="text-base font-semibold text-fg-default">{f.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-fg-muted">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Testimonials ─── */}
      <section className="px-6 py-20 md:py-28">
        <div className="mx-auto max-w-5xl">
          <div className="mb-12 text-center md:mb-16">
            <span className="text-xs font-medium uppercase tracking-widest text-fg-subtle">Testimonials</span>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-fg-default md:text-4xl">
              Loved by organizers worldwide
            </h2>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {TESTIMONIALS.map((t) => (
              <div key={t.name} className="card-hover flex flex-col p-6">
                <div className="flex gap-0.5 text-semantic-warning">
                  {[...Array(t.stars)].map((_, i) => <Star key={i} size={14} fill="currentColor" />)}
                </div>
                <p className="mt-4 flex-1 text-sm leading-relaxed text-fg-muted">&quot;{t.text}&quot;</p>
                <div className="mt-6 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-bg-base text-sm font-bold text-fg-default ring-1 ring-bg-border">
                    {t.name.charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-fg-default">{t.name}</p>
                    <p className="text-xs text-fg-subtle">{t.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA ─── */}
      <section className="relative border-t border-bg-border px-6 py-24 text-center md:py-32">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute left-1/2 top-1/2 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-semantic-info/5 blur-[120px]" />
        </div>
        <div className="relative z-10">
          <h2 className="text-3xl font-bold tracking-tight text-fg-default md:text-5xl">
            Ready to run a better hackathon?
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-base text-fg-muted md:text-lg">
            Set up your event, invite judges, and collect scores — all from one place.
          </p>
          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Link href={createHref} className="btn-primary inline-flex min-w-[220px] text-sm md:text-base">
              Create event <ArrowUpRight size={16} />
            </Link>
            {loggedIn && (
              <Link href={dashHref} className="btn-secondary inline-flex min-w-[220px] text-sm md:text-base">
                Go to My Events
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer className="border-t border-bg-border px-8 py-8">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-4 sm:flex-row">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-fg-default/10 text-xs font-bold text-fg-default">
              HJ
            </div>
            <p className="text-sm font-semibold text-fg-default">HackJudge</p>
          </div>
          <div className="flex items-center gap-6 text-sm text-fg-muted">
            <Link href={createHref} className="transition-colors hover:text-fg-default">Create event</Link>
            <Link href="/login" className="transition-colors hover:text-fg-default">Organizer login</Link>
          </div>
          <p className="text-xs text-fg-subtle">Hackathon judging platform</p>
        </div>
      </footer>
    </main>
  );
}
