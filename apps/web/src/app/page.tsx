'use client';

import { useState, useEffect } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import Link from 'next/link';
import {
  Settings, Users, FileText, Zap, Download, Sparkles,
  ArrowRight, Trophy, CheckCircle, ChevronRight,
  BarChart3, Shield, Globe, Star, Quote, ArrowUpRight
} from 'lucide-react';
import FloatingNav from '../components/FloatingNav';

/* ─── Typewriter ─── */
const TAGLINES = ['Judge any hackathon.', 'Configure everything.', 'Results in seconds.'];

function TypewriterEffect({ strings }: { strings: string[] }) {
  const [current, setCurrent] = useState(0);
  const [display, setDisplay] = useState('');
  const [forward, setForward] = useState(true);

  useEffect(() => {
    const str = strings[current];
    const timer = setTimeout(() => {
      if (forward) {
        if (display.length < str.length) setDisplay(str.slice(0, display.length + 1));
        else setTimeout(() => setForward(false), 2200);
      } else {
        if (display.length > 0) setDisplay(display.slice(0, -1));
        else { setCurrent((c) => (c + 1) % strings.length); setForward(true); }
      }
    }, forward ? (display.length < str.length ? 75 : 2200) : 35);
    return () => clearTimeout(timer);
  }, [display, forward, current, strings]);

  return <span>{display}<span className="animate-pulse">|</span></span>;
}

/* ─── Data ─── */
const features = [
  { icon: Sparkles, title: 'AI config generation', desc: 'Describe your hackathon in plain English. Groq generates a complete event.yaml with tracks, criteria, teams, and judges.', large: true },
  { icon: Users, title: 'Magic link judges', desc: 'No passwords, no friction. Send a link, judges score instantly.', large: false },
  { icon: Zap, title: 'Live completion dashboard', desc: 'Watch scores roll in real-time across all tracks and criteria.', large: false },
  { icon: BarChart3, title: 'Outlier-aware results', desc: 'Weighted averages, standard deviation filtering, and automatic tiebreakers.', large: false },
  { icon: Download, title: 'One-tap export', desc: 'CSV, PDF, and Excel exports for ceremonies and stakeholders.', large: false },
  { icon: Shield, title: 'Full audit trail', desc: 'Every score, login, and export logged with actor and timestamp.', large: true },
];

const steps = [
  { num: '01', title: 'Describe', desc: 'Type your event in natural language or write a YAML config.', icon: FileText },
  { num: '02', title: 'Invite', desc: 'Judges receive secure magic links — no accounts needed.', icon: Users },
  { num: '03', title: 'Score', desc: 'Judges rate teams on any device. Live progress updates.', icon: Zap },
  { num: '04', title: 'Export', desc: 'Weighted results with outlier detection and full audit trail.', icon: Download },
];

const stats = [
  { value: '50+', label: 'Events hosted' },
  { value: '2K+', label: 'Teams judged' },
  { value: '10K+', label: 'Scores collected' },
  { value: '<30s', label: 'Results generated' },
];

const testimonials = [
  { name: 'Sarah Chen', role: 'HackMIT Organizer', text: 'We judged 40 teams across 4 tracks in under an hour. The AI config saved us a full day of setup.' },
  { name: 'Marcus Johnson', role: 'MLH Coach', text: 'Magic links are a game changer. Judges just open the link on their phone and start scoring immediately.' },
  { name: 'Priya Patel', role: 'TechFest Lead', text: 'The outlier detection caught a judge who gave all 10s. Saved us from an unfair result.' },
];

const MARQUEE_ITEMS = ['Live scoring', 'Magic links', 'AI configs', 'Weighted averages', 'Outlier detection', 'CSV export', 'PDF results', 'Team QR codes'];

export default function Home() {
  const reduced = useReducedMotion();

  return (
    <>
      <FloatingNav />
      <main className="page-shell">

        {/* ─── HERO ─── */}
        <section className="relative flex min-h-[100dvh] flex-col items-center justify-center overflow-hidden px-6 pt-20 text-center">
          {/* ─── Floating particles ─── */}
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            {[...Array(30)].map((_, i) => {
              const size = 2 + Math.random() * 4;
              const x = Math.random() * 100;
              const y = Math.random() * 100;
              const duration = 15 + Math.random() * 20;
              const delay = Math.random() * 10;
              return (
                <motion.div
                  key={`p-${i}`}
                  className="absolute rounded-full"
                  style={{
                    left: `${x}%`,
                    top: `${y}%`,
                    width: size,
                    height: size,
                    backgroundColor: i % 3 === 0 ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.06)',
                  }}
                  animate={{
                    y: [0, -30 - Math.random() * 40, 0],
                    x: [0, (Math.random() - 0.5) * 30, 0],
                    opacity: [0.2, 0.8, 0.2],
                  }}
                  transition={{ duration, repeat: Infinity, ease: 'easeInOut', delay }}
                />
              );
            })}
          </div>

          {/* ─── Floating geometric shapes ─── */}
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            {[
              { shape: 'circle', x: '10%', y: '20%', s: 60, d: 25, w: 1, o: 0.12 },
              { shape: 'circle', x: '85%', y: '15%', s: 40, d: 18, w: 1, o: 0.1 },
              { shape: 'square', x: '75%', y: '65%', s: 50, d: 22, w: 1, o: 0.08 },
              { shape: 'diamond', x: '20%', y: '75%', s: 35, d: 20, w: 1, o: 0.1 },
              { shape: 'circle', x: '50%', y: '10%', s: 25, d: 16, w: 1, o: 0.08 },
              { shape: 'square', x: '5%', y: '50%', s: 45, d: 28, w: 1, o: 0.06 },
              { shape: 'diamond', x: '90%', y: '80%', s: 30, d: 19, w: 1, o: 0.09 },
              { shape: 'circle', x: '35%', y: '85%', s: 20, d: 14, w: 1, o: 0.1 },
            ].map((s, i) => (
              <motion.div
                key={`geo-${i}`}
                className="absolute border border-white"
                style={{
                  left: s.x,
                  top: s.y,
                  width: s.s,
                  height: s.s,
                  borderRadius: s.shape === 'circle' ? '50%' : s.shape === 'diamond' ? '4px' : '2px',
                  borderWidth: s.w,
                  opacity: s.o,
                  transform: s.shape === 'diamond' ? 'rotate(45deg)' : undefined,
                }}
                animate={{
                  y: [0, -20, 0, 15, 0],
                  x: [0, 15, 0, -10, 0],
                  rotate: s.shape === 'diamond' ? [45, 55, 45, 35, 45] : [0, 10, 0, -10, 0],
                  opacity: [s.o, s.o * 2, s.o],
                }}
                transition={{ duration: s.d, repeat: Infinity, ease: 'easeInOut', delay: i * 1.5 }}
              />
            ))}
          </div>

          {/* ─── Gradient orbs ─── */}
          <div className="pointer-events-none absolute inset-0">
            <motion.div
              animate={{ x: [0, 80, 0], y: [0, -60, 0], scale: [1, 1.1, 1], opacity: [0.3, 0.5, 0.3] }}
              transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut' }}
              className="absolute -left-40 top-1/5 h-[500px] w-[500px] rounded-full bg-white/[0.04] blur-[120px]"
            />
            <motion.div
              animate={{ x: [0, -60, 0], y: [0, 70, 0], scale: [1, 1.15, 1], opacity: [0.2, 0.45, 0.2] }}
              transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut', delay: 3 }}
              className="absolute -right-40 bottom-1/4 h-[600px] w-[600px] rounded-full bg-white/[0.03] blur-[140px]"
            />
            <motion.div
              animate={{ x: [0, 50, 0], y: [0, -40, 0], opacity: [0.1, 0.3, 0.1] }}
              transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut', delay: 6 }}
              className="absolute left-1/3 top-1/2 h-[300px] w-[300px] rounded-full bg-white/[0.04] blur-[80px]"
            />
          </div>

          {/* ─── Subtle grid pattern ─── */}
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.025]"
            style={{ backgroundImage: 'radial-gradient(circle, var(--fg-default) 1px, transparent 1px)', backgroundSize: '40px 40px' }}
          />

          <motion.div
            initial={reduced ? undefined : { opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="relative z-10 max-w-4xl"
          >
            <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-bg-border bg-bg-subtle/80 px-4 py-2 text-xs text-fg-muted backdrop-blur-md">
              <Trophy size={13} /> Trusted by 50+ hackathons worldwide
            </div>

            <h1 className="text-5xl font-semibold leading-[1.1] tracking-tight text-fg-default sm:text-6xl md:text-7xl lg:text-8xl">
              <TypewriterEffect strings={TAGLINES} />
            </h1>

            <p className="mx-auto mt-8 max-w-xl text-base leading-relaxed text-fg-muted sm:text-lg">
              The all-in-one hackathon judging platform. Define criteria, invite judges with magic links, collect scores live, and export results with weighted averages and outlier detection.
            </p>

            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link href="/events/new" className="btn-primary min-w-[200px] text-base">
                Create your event <ArrowRight size={16} />
              </Link>
              <Link href="/login" className="btn-secondary min-w-[200px] text-base">
                Organizer login
              </Link>
            </div>

            <motion.div
              animate={{ y: [0, 8, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              className="mt-20 text-fg-subtle"
            >
              <div className="mx-auto h-10 w-6 rounded-full border-2 border-fg-subtle p-1">
                <div className="h-2 w-full rounded-full bg-fg-subtle" />
              </div>
            </motion.div>
          </motion.div>
        </section>

        {/* ─── MARQUEE ─── */}
        <div className="relative overflow-hidden border-y border-bg-border bg-bg-subtle py-4">
          <div className="flex animate-marquee gap-8 whitespace-nowrap">
            {[...MARQUEE_ITEMS, ...MARQUEE_ITEMS, ...MARQUEE_ITEMS].map((item, i) => (
              <span key={i} className="flex items-center gap-2 text-sm text-fg-subtle">
                <Star size={12} className="text-fg-subtle" /> {item}
              </span>
            ))}
          </div>
        </div>

        {/* ─── STATS ─── */}
        <section className="border-b border-bg-border">
          <div className="grid grid-cols-2 divide-x divide-bg-border md:grid-cols-4">
            {stats.map((s) => (
              <div key={s.label} className="flex flex-col items-center py-14 text-center">
                <span className="text-4xl font-semibold tracking-tight text-fg-default sm:text-5xl">{s.value}</span>
                <span className="mt-2 text-sm text-fg-muted">{s.label}</span>
              </div>
            ))}
          </div>
        </section>

        {/* ─── HOW IT WORKS ─── */}
        <section className="relative overflow-hidden px-6 py-28">
          <div className="container-tight">
            <motion.div
              initial={reduced ? undefined : { opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="mb-20 text-center"
            >
              <span className="text-xs font-medium uppercase tracking-widest text-fg-subtle">Workflow</span>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight text-fg-default sm:text-4xl md:text-5xl">
                From idea to results
              </h2>
              <p className="mx-auto mt-4 max-w-lg text-base text-fg-muted">
                Four steps. Five minutes. Zero configuration headaches.
              </p>
            </motion.div>

            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
              {steps.map((s, i) => (
                <motion.div
                  key={i}
                  initial={reduced ? undefined : { opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1, duration: 0.4 }}
                  className="relative"
                >
                  <div className="card-hover p-8">
                    <span className="text-xs font-mono text-fg-subtle">{s.num}</span>
                    <div className="mb-5 mt-4 inline-flex rounded-xl bg-bg-base p-3 text-fg-muted">
                      <s.icon size={22} />
                    </div>
                    <h3 className="text-lg font-medium text-fg-default">{s.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-fg-muted">{s.desc}</p>
                  </div>
                  {i < steps.length - 1 && (
                    <div className="hidden lg:absolute lg:right-0 lg:top-1/2 lg:block lg:-translate-y-1/2 lg:translate-x-1/2 lg:text-fg-subtle">
                      <ChevronRight size={18} />
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── BENTO FEATURES ─── */}
        <section className="border-y border-bg-border bg-bg-subtle px-6 py-28">
          <div className="container-tight">
            <motion.div
              initial={reduced ? undefined : { opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="mb-20 text-center"
            >
              <span className="text-xs font-medium uppercase tracking-widest text-fg-subtle">Features</span>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight text-fg-default sm:text-4xl md:text-5xl">
                Everything you need
              </h2>
              <p className="mx-auto mt-4 max-w-lg text-base text-fg-muted">
                Built for organizers who care about fairness, speed, and zero friction.
              </p>
            </motion.div>

            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {features.map((f, i) => (
                <motion.div
                  key={i}
                  initial={reduced ? undefined : { opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.06, duration: 0.4 }}
                  className={`card-hover group relative overflow-hidden p-8 ${f.large ? 'sm:col-span-2 lg:col-span-1' : ''}`}
                >
                  <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/5 opacity-0 blur-3xl transition-opacity duration-500 group-hover:opacity-100" />
                  <div className="mb-5 inline-flex rounded-xl bg-bg-base p-3 text-fg-muted transition-colors group-hover:text-fg-default">
                    <f.icon size={22} />
                  </div>
                  <h3 className="text-lg font-medium text-fg-default">{f.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-fg-muted">{f.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── AI FEATURE ─── */}
        <section className="px-6 py-28">
          <div className="container-tight">
            <motion.div
              initial={reduced ? undefined : { opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="relative overflow-hidden rounded-3xl border border-bg-border bg-bg-subtle p-8 sm:p-14"
            >
              <div className="pointer-events-none absolute -right-40 -top-40 h-96 w-96 rounded-full bg-white/[0.04] blur-[100px]" />
              <div className="pointer-events-none absolute -bottom-40 -left-40 h-96 w-96 rounded-full bg-white/[0.03] blur-[100px]" />

              <div className="relative z-10 grid items-center gap-12 lg:grid-cols-2">
                <div>
                  <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-bg-border bg-bg-muted px-3 py-1.5 text-xs text-fg-muted">
                    <Sparkles size={12} /> AI Config Assistant
                  </div>
                  <h2 className="text-3xl font-semibold tracking-tight text-fg-default sm:text-4xl">
                    Describe your event.<br />Get the config.
                  </h2>
                  <p className="mt-5 text-base leading-relaxed text-fg-muted">
                    Type a description like &quot;48-hour university hackathon with AI and Web3 tracks, 15 teams, 5 judges&quot; and let Groq generate a complete event.yaml with tracks, criteria, teams, and judge assignments.
                  </p>
                  <ul className="mt-8 space-y-3">
                    {['Natural language input', 'Groq, Mistral, or Ollama backends', 'Valid YAML with instant preview'].map((item) => (
                      <li key={item} className="flex items-center gap-3 text-sm text-fg-muted">
                        <CheckCircle size={16} className="text-semantic-success" />
                        {item}
                      </li>
                    ))}
                  </ul>
                  <Link href="/events/new" className="btn-primary mt-10 inline-flex">
                    Try AI generation <ArrowRight size={16} />
                  </Link>
                </div>
                <div className="rounded-2xl border border-bg-border bg-bg-base p-6 font-mono text-xs text-fg-muted shadow-2xl">
                  <div className="mb-4 flex items-center gap-2">
                    <div className="h-2.5 w-2.5 rounded-full bg-semantic-error/60" />
                    <div className="h-2.5 w-2.5 rounded-full bg-semantic-warning/60" />
                    <div className="h-2.5 w-2.5 rounded-full bg-semantic-success/60" />
                    <span className="ml-2 text-fg-subtle">event.yaml</span>
                  </div>
                  <pre className="overflow-x-auto whitespace-pre-wrap leading-relaxed">
{`event:
  name: "AI Innovation Hackathon"
  slug: "ai-hack-2025"
  date: "2025-06-15"

tracks:
  - id: ai
    name: "Artificial Intelligence"
  - id: web3
    name: "Web3 & Blockchain"

criteria:
  - name: "Innovation"
    weight: 0.35
    max_score: 10
  - name: "Technical Execution"
    weight: 0.35
    max_score: 10
  - name: "Presentation"
    weight: 0.30
    max_score: 10

teams: [...]
judges: [...]`}
                  </pre>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* ─── TESTIMONIALS ─── */}
        <section className="border-y border-bg-border bg-bg-subtle px-6 py-28">
          <div className="container-tight">
            <motion.div
              initial={reduced ? undefined : { opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="mb-20 text-center"
            >
              <span className="text-xs font-medium uppercase tracking-widest text-fg-subtle">Testimonials</span>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight text-fg-default sm:text-4xl md:text-5xl">
                Loved by organizers
              </h2>
            </motion.div>

            <div className="grid gap-6 md:grid-cols-3">
              {testimonials.map((t, i) => (
                <motion.div
                  key={i}
                  initial={reduced ? undefined : { opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1, duration: 0.4 }}
                  className="card-hover relative p-8"
                >
                  <Quote size={24} className="mb-4 text-fg-subtle/30" />
                  <p className="text-base leading-relaxed text-fg-muted">&quot;{t.text}&quot;</p>
                  <div className="mt-6 flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-bg-base text-sm font-medium text-fg-default">
                      {t.name.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-fg-default">{t.name}</p>
                      <p className="text-xs text-fg-subtle">{t.role}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── HIGHLIGHTS ─── */}
        <section className="px-6 py-28">
          <div className="container-tight">
            <motion.div
              initial={reduced ? undefined : { opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="mb-20 text-center"
            >
              <span className="text-xs font-medium uppercase tracking-widest text-fg-subtle">Why HackJudge</span>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight text-fg-default sm:text-4xl md:text-5xl">
                Built for real events
              </h2>
            </motion.div>

            <div className="grid gap-8 sm:grid-cols-3">
              {[
                { icon: Shield, title: 'Audit everything', desc: 'Every score, login, and export is logged with actor and timestamp.' },
                { icon: Globe, title: 'Works on any network', desc: 'LAN, dev tunnels, or deployed. Judges connect from any device.' },
                { icon: Sparkles, title: 'Open source', desc: 'Self-host with MongoDB Atlas. No vendor lock-in, no subscription fees.' },
              ].map((h, i) => (
                <motion.div
                  key={i}
                  initial={reduced ? undefined : { opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1, duration: 0.4 }}
                  className="text-center"
                >
                  <div className="mx-auto mb-5 inline-flex rounded-2xl bg-bg-subtle p-4 text-fg-muted">
                    <h.icon size={24} />
                  </div>
                  <h3 className="text-lg font-medium text-fg-default">{h.title}</h3>
                  <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-fg-muted">{h.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── CTA ─── */}
        <section className="relative overflow-hidden px-6 py-36 text-center">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute left-1/2 top-1/2 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/[0.04] blur-[120px]" />
          </div>
          <motion.div
            initial={reduced ? undefined : { opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="relative z-10"
          >
            <h2 className="text-4xl font-semibold tracking-tight text-fg-default sm:text-5xl md:text-6xl">
              Run your first event<br />in 5 minutes.
            </h2>
            <p className="mx-auto mt-6 max-w-md text-base text-fg-muted">
              No setup, no DevOps. Just describe your hackathon and start judging.
            </p>
            <Link href="/events/new" className="btn-primary mt-10 inline-flex min-w-[220px] text-base">
              Create event <ArrowUpRight size={16} />
            </Link>
          </motion.div>
        </section>

        {/* ─── FOOTER ─── */}
        <footer className="border-t border-bg-border px-6 py-14">
          <div className="container-tight">
            <div className="flex flex-col items-center justify-between gap-8 sm:flex-row">
              <div className="flex items-center gap-2 text-sm font-medium text-fg-default">
                <Trophy size={18} /> HackJudge
              </div>
              <div className="flex items-center gap-6 text-sm text-fg-muted">
                <Link href="/events/new" className="transition-colors hover:text-fg-default">Create event</Link>
                <Link href="/events" className="transition-colors hover:text-fg-default">Events</Link>
                <Link href="/login" className="transition-colors hover:text-fg-default">Login</Link>
              </div>
              <p className="text-xs text-fg-subtle">Open source hackathon judging platform.</p>
            </div>
          </div>
        </footer>
      </main>
    </>
  );
}
