'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Plus, LogOut, BarChart3, Users, Trophy,
  ArrowRight, Clock, ExternalLink, Hexagon
} from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';


interface EventSummary {
  slug: string;
  name: string;
  status: 'not_started' | 'open' | 'closed';
  teams: number;
  judges: number;
  completedSubmissions: number;
  totalAssignments: number;
  createdAt: string;
}

function statusBadge(status: EventSummary['status']) {
  if (status === 'open') return <span className="rounded-full bg-semantic-success/15 px-2.5 py-0.5 text-xs font-medium text-semantic-success">Open</span>;
  if (status === 'closed') return <span className="rounded-full bg-bg-muted px-2.5 py-0.5 text-xs font-medium text-fg-subtle">Closed</span>;
  return <span className="rounded-full bg-semantic-warning/10 px-2.5 py-0.5 text-xs font-medium text-semantic-warning">Not started</span>;
}

export default function Home() {
  const [authState, setAuthState] = useState<'loading' | 'guest' | 'organizer'>('loading');
  const [events, setEvents] = useState<EventSummary[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) { setAuthState('guest'); return; }
    setEventsLoading(true);
    fetch(`${API}/events/status-all`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => {
        if (d.success) { setEvents(d.data); setAuthState('organizer'); }
        else { localStorage.removeItem('token'); setAuthState('guest'); }
      })
      .catch(() => setAuthState('guest'))
      .finally(() => setEventsLoading(false));
  }, []);

  if (authState === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-fg-subtle border-t-fg-default" />
      </div>
    );
  }

  if (authState === 'organizer') return <OrganizerHub events={events} loading={eventsLoading} />;
  return <GuestLanding />;
}

/* ═══════════════════════════════════ GUEST LANDING ═══════ */
function GuestLanding() {
  return (
    <main className="flex min-h-screen flex-col">
      {/* Nav */}
      <header className="flex items-center justify-between border-b border-bg-border px-8 py-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-fg-default">
          <Hexagon size={18} strokeWidth={1.5} /> HackJudge
        </div>
        <div className="flex items-center gap-3">
          <Link href="/login" className="btn-ghost text-sm">Sign In</Link>
          <Link href="/events/new" className="btn-primary text-sm">Create Event</Link>
        </div>
      </header>

      {/* Hero */}
      <section className="flex flex-1 flex-col items-center justify-center px-6 py-24 text-center">
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

        {/* Feature pills */}
        <div className="mt-14 flex flex-wrap items-center justify-center gap-2.5">
          {['PIN-based judge auth', 'Weighted scoring', 'Live progress', 'YAML config', 'Results & leaderboard'].map((f) => (
            <span key={f} className="rounded-full border border-bg-border bg-bg-subtle px-3.5 py-1.5 text-xs text-fg-muted">{f}</span>
          ))}
        </div>
      </section>

      <footer className="border-t border-bg-border px-8 py-5 text-center text-xs text-fg-subtle">
        HackJudge — Open-source hackathon judging platform
      </footer>
    </main>
  );
}

/* ═══════════════════════════════════ ORGANIZER HUB ═══════ */
function OrganizerHub({ events, loading }: { events: EventSummary[]; loading: boolean }) {
  function signOut() {
    localStorage.removeItem('token');
    window.location.reload();
  }

  return (
    <main className="min-h-screen bg-bg-base">
      {/* Top nav */}
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-bg-border bg-bg-base/95 px-8 py-3.5 backdrop-blur">
        <div className="flex items-center gap-2 text-sm font-semibold text-fg-default">
          <Hexagon size={17} strokeWidth={1.5} /> HackJudge
        </div>
        <div className="flex items-center gap-3">
          <Link href="/events/new" className="btn-primary text-sm">
            <Plus size={14} /> New Event
          </Link>
          <button onClick={signOut} className="flex items-center gap-1.5 text-xs text-fg-subtle hover:text-fg-muted">
            <LogOut size={13} /> Sign out
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-6 py-10">
        {/* Page heading */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-fg-default">My Events</h1>
            <p className="mt-1 text-sm text-fg-muted">{events.length} event{events.length !== 1 ? 's' : ''} total</p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-fg-subtle border-t-fg-default" />
          </div>
        ) : events.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-bg-border py-24 text-center">
            <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl border border-bg-border bg-bg-subtle">
              <Trophy size={24} className="text-fg-subtle" />
            </div>
            <h2 className="text-lg font-semibold text-fg-default">No events yet</h2>
            <p className="mt-1 text-sm text-fg-muted">Create your first hackathon to get started.</p>
            <Link href="/events/new" className="btn-primary mt-6">
              <Plus size={14} /> Create Event
            </Link>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {events.map((ev) => {
              const pct = ev.totalAssignments > 0 ? Math.round((ev.completedSubmissions / ev.totalAssignments) * 100) : 0;
              return (
                <div key={ev.slug} className="card flex flex-col p-5 transition-shadow hover:shadow-md">
                  {/* Card header */}
                  <div className="mb-3 flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h2 className="truncate text-[15px] font-semibold text-fg-default">{ev.name}</h2>
                      <p className="mt-0.5 font-mono text-xs text-fg-subtle">{ev.slug}</p>
                    </div>
                    {statusBadge(ev.status)}
                  </div>

                  {/* Stats row */}
                  <div className="mb-4 grid grid-cols-3 gap-2 rounded-lg border border-bg-border bg-bg-subtle p-3 text-center text-xs">
                    <div>
                      <div className="flex items-center justify-center gap-1 text-fg-subtle"><Users size={11} /></div>
                      <p className="mt-0.5 font-semibold text-fg-default">{ev.teams}</p>
                      <p className="text-fg-subtle">teams</p>
                    </div>
                    <div className="border-x border-bg-border">
                      <div className="flex items-center justify-center gap-1 text-fg-subtle"><BarChart3 size={11} /></div>
                      <p className="mt-0.5 font-semibold text-fg-default">{ev.judges}</p>
                      <p className="text-fg-subtle">judges</p>
                    </div>
                    <div>
                      <div className="flex items-center justify-center gap-1 text-fg-subtle"><Trophy size={11} /></div>
                      <p className="mt-0.5 font-semibold text-fg-default">{pct}%</p>
                      <p className="text-fg-subtle">done</p>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="mb-4">
                    <div className="h-1.5 overflow-hidden rounded-full bg-bg-muted">
                      <div className={`h-full rounded-full transition-all ${pct === 100 ? 'bg-semantic-success' : 'bg-fg-default'}`} style={{ width: `${pct}%` }} />
                    </div>
                    <p className="mt-1 text-right text-xs text-fg-subtle">{ev.completedSubmissions} / {ev.totalAssignments} scored</p>
                  </div>

                  {/* Actions */}
                  <div className="mt-auto flex items-center gap-2">
                    <Link href={`/events/${ev.slug}`} className="btn-primary flex-1 text-center text-xs">
                      Dashboard
                    </Link>
                    <Link href={`/events/${ev.slug}/results`} className="btn-ghost px-3 py-2 text-xs">
                      <BarChart3 size={13} />
                    </Link>
                    <Link href={`/events/${ev.slug}/leaderboard`} className="btn-ghost px-3 py-2 text-xs">
                      <Trophy size={13} />
                    </Link>
                    <Link href={`/events/${ev.slug}/judge`} target="_blank" className="btn-ghost px-3 py-2 text-xs">
                      <ExternalLink size={13} />
                    </Link>
                  </div>

                  {/* Created at */}
                  <p className="mt-3 flex items-center gap-1 text-xs text-fg-subtle">
                    <Clock size={10} /> {new Date(ev.createdAt).toLocaleDateString()}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
