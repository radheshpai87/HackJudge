'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { motion, useReducedMotion } from 'framer-motion';
import { Activity, BarChart3, Users, CheckCircle, FileBarChart, QrCode, Send, Copy, ExternalLink, CalendarRange, LayoutList, Tag } from 'lucide-react';
import Link from 'next/link';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

export default function EventDashboard() {
  const { slug } = useParams();
  const [event, setEvent] = useState<any>(null);
  const [status, setStatus] = useState<any>(null);
  const [judges, setJudges] = useState<any[]>([]);
  const [sending, setSending] = useState<Record<string, boolean>>({});
  const [sent, setSent] = useState<Record<string, boolean>>({});
  const [copiedPortal, setCopiedPortal] = useState(false);
  const reduced = useReducedMotion();

  useEffect(() => {
    fetch(`${API}/events/${slug}`).then((r) => r.json()).then((d) => setEvent(d.data));
    fetch(`${API}/events/${slug}/status`).then((r) => r.json()).then((d) => setStatus(d.data));
    const orgToken = typeof window !== 'undefined' ? localStorage.getItem('token') : '';
    if (orgToken) {
      fetch(`${API}/events/${slug}/judges`, { headers: { Authorization: `Bearer ${orgToken}` } })
        .then((r) => r.json()).then((d) => d.success && setJudges(d.data));
    }
  }, [slug]);

  async function sendMagicLink(email: string) {
    setSending((s) => ({ ...s, [email]: true }));
    try {
      await fetch(`${API}/auth/magic-link`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, eventSlug: slug }) });
      setSent((s) => ({ ...s, [email]: true }));
    } finally { setSending((s) => ({ ...s, [email]: false })); }
  }

  async function sendAllMagicLinks() { for (const j of judges) await sendMagicLink(j.email); }

  if (!event) {
    return (
      <div className="page-shell flex min-h-screen items-center justify-center">
        <p className="text-sm text-fg-muted">Loading...</p>
      </div>
    );
  }

  const eventName = event?.event?.name ?? 'Untitled Event';
  const eventSlug = event?.slug ?? String(slug);
  const completionPct = status?.completionPercentage ?? 0;

  return (
    <div className="page-shell flex min-h-screen">
      {/* Sidebar */}
      <aside className="hidden w-60 flex-shrink-0 flex-col border-r border-bg-border bg-bg-subtle p-6 md:flex">
        <div>
          <h2 className="truncate text-base font-semibold text-fg-default">{eventName}</h2>
          <p className="mt-1 font-mono text-2xs text-fg-subtle">{eventSlug}</p>
        </div>

        <nav className="mt-6 flex flex-col gap-1">
          <SidebarLink href={`/events/${slug}`} icon={<Activity size={16} />} label="Dashboard" active />
          <SidebarLink href={`/events/${slug}/results`} icon={<BarChart3 size={16} />} label="Results" />
          <SidebarLink href={`/events/${slug}/leaderboard`} icon={<Users size={16} />} label="Leaderboard" />
          <SidebarLink href={`/events/${slug}/judge`} icon={<QrCode size={16} />} label="Judge Portal" />
          <SidebarLink href={`/events/${slug}/config`} icon={<FileBarChart size={16} />} label="Config" />
        </nav>

        <div className="mt-auto pt-6">
          <span className="inline-flex items-center rounded-full border border-bg-border bg-bg-overlay px-2.5 py-0.5 text-2xs font-mono text-fg-muted">
            {completionPct}% complete
          </span>
          <Link href={`/events/${slug}/results`} className="btn-primary mt-4 block w-full text-center text-sm">
            Generate results
          </Link>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 p-6 lg:p-10">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-fg-default">Dashboard</h1>
          <p className="mt-1 text-sm text-fg-muted">Live judging overview for {eventName}</p>
        </div>

        {/* Stats row */}
        {status && (
          <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard icon={<Users size={20} />} value={status.totalTeams ?? 0} label="Teams" />
            <StatCard icon={<Activity size={20} />} value={status.totalJudges ?? 0} label="Judges active" />
            <StatCard icon={<CheckCircle size={20} />} value={status.completedSubmissions ?? 0} label="Submissions" />
            <StatCard icon={<BarChart3 size={20} />} value={`${completionPct}%`} label="Completion" />
          </div>
        )}

        {/* Event details row */}
        <div className="mb-6 grid gap-4 lg:grid-cols-3">
          {/* Description */}
          <div className="card p-5">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-fg-default">
              <CalendarRange size={16} className="text-fg-subtle" /> Event Details
            </h3>
            {event?.event?.description && (
              <p className="mt-2 text-sm text-fg-muted leading-relaxed">{event.event.description}</p>
            )}
            <div className="mt-3 space-y-1">
              {event?.event?.timezone && <p className="text-xs text-fg-subtle">Timezone: {event.event.timezone}</p>}
              {event?.event?.judging_opens_at && <p className="text-xs text-fg-subtle">Opens: {new Date(event.event.judging_opens_at).toLocaleString()}</p>}
              {event?.event?.judging_closes_at && <p className="text-xs text-fg-subtle">Closes: {new Date(event.event.judging_closes_at).toLocaleString()}</p>}
              {event?.status && (
                <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-2xs font-medium ${event.status === 'open' ? 'border-semantic-success/30 text-semantic-success' : event.status === 'not_started' ? 'border-fg-muted/30 text-fg-subtle' : 'border-semantic-error/30 text-semantic-error'}`}>
                  Status: {event.status}
                </span>
              )}
            </div>
          </div>

          {/* Tracks */}
          <div className="card p-5">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-fg-default">
              <Tag size={16} className="text-fg-subtle" /> Tracks
            </h3>
            {event?.tracks && event.tracks.length > 0 ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {event.tracks.map((track: any) => (
                  <span key={track.id} className="inline-flex items-center rounded-full border border-bg-border bg-bg-muted px-3 py-1 text-xs text-fg-muted">
                    {track.name}
                  </span>
                ))}
              </div>
            ) : (
              <p className="mt-2 text-sm text-fg-subtle">No tracks configured.</p>
            )}
          </div>

          {/* Criteria */}
          <div className="card p-5">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-fg-default">
              <LayoutList size={16} className="text-fg-subtle" /> Criteria
            </h3>
            {event?.criteria && event.criteria.length > 0 ? (
              <div className="mt-3 space-y-1.5">
                {event.criteria.map((c: any) => (
                  <div key={c.id} className="flex items-center justify-between text-xs">
                    <span className="text-fg-muted">{c.name}</span>
                    <span className="text-fg-subtle">{c.scoring_type === 'rubric' ? 'Rubric' : `0–${c.max_score}`} · {(c.weight * 100).toFixed(0)}%</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-2 text-sm text-fg-subtle">No criteria configured.</p>
            )}
          </div>
        </div>

        {/* Heatmap */}
        <div className="card mb-6 p-6">
          <h3 className="section-title">Completion Heatmap</h3>
          <p className="section-subtitle mt-1 mb-4">Judges (rows) × Teams (columns). White = submitted.</p>
          <Heatmap status={status} />
        </div>

        {/* Judge Access */}
        <JudgeAccessPanel
          slug={String(slug)} judges={judges} sending={sending} sent={sent} copiedPortal={copiedPortal}
          onSend={sendMagicLink} onSendAll={sendAllMagicLinks}
          onCopyPortal={() => { navigator.clipboard.writeText(`${window.location.origin}/events/${slug}/judge`); setCopiedPortal(true); setTimeout(() => setCopiedPortal(false), 2000); }}
        />
      </main>
    </div>
  );
}

function SidebarLink({ href, icon, label, active }: { href: string; icon: React.ReactNode; label: string; active?: boolean }) {
  return (
    <Link href={href} className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${active ? 'bg-bg-muted text-fg-default' : 'text-fg-muted hover:bg-bg-muted hover:text-fg-default'}`}>
      {icon}
      {label}
    </Link>
  );
}

function StatCard({ icon, value, label }: { icon: React.ReactNode; value: string | number; label: string }) {
  return (
    <div className="stat-card">
      <div className="mb-3 text-fg-muted">{icon}</div>
      <div className="font-mono text-2xl font-medium text-fg-default">{value}</div>
      <div className="text-sm text-fg-muted">{label}</div>
    </div>
  );
}

function JudgeAccessPanel({ slug, judges, sending, sent, copiedPortal, onSend, onSendAll, onCopyPortal }: {
  slug: string; judges: any[]; sending: Record<string, boolean>; sent: Record<string, boolean>;
  copiedPortal: boolean; onSend: (email: string) => void; onSendAll: () => void; onCopyPortal: () => void;
}) {
  const portalUrl = typeof window !== 'undefined' ? `${window.location.origin}/events/${slug}/judge` : `http://localhost:3000/events/${slug}/judge`;
  return (
    <div className="card p-6">
      <div className="mb-5 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h3 className="section-title">Judge Portal</h3>
          <p className="section-subtitle mt-1">Share QR codes or send magic links to let judges start scoring.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={onSendAll} className="btn-secondary text-sm"><Send size={14} /> Send All</button>
          <Link href={portalUrl} target="_blank" rel="noopener noreferrer" className="btn-primary text-sm"><ExternalLink size={14} /> Open Portal</Link>
        </div>
      </div>

      <div className="mb-6 flex items-center gap-3 rounded-lg border border-bg-border bg-bg-muted p-4">
        <code className="flex-1 truncate font-mono text-sm text-fg-muted">{portalUrl}</code>
        <button onClick={onCopyPortal} className="btn-ghost text-fg-muted text-sm">
          {copiedPortal ? <CheckCircle size={13} /> : <Copy size={13} />}
          <span className="ml-1">{copiedPortal ? 'Copied' : 'Copy'}</span>
        </button>
      </div>

      {judges.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {judges.map((judge) => {
            const judgeUrl = `${portalUrl}?email=${encodeURIComponent(judge.email)}`;
            const qr = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&color=ededed&bgcolor=111111&data=${encodeURIComponent(judgeUrl)}`;
            return (
              <div key={judge.email} className="flex flex-col items-center gap-3 rounded-xl border border-bg-border bg-bg-muted p-5">
                <div className="overflow-hidden rounded-lg border border-bg-border">
                  <img src={qr} alt={`QR for ${judge.name}`} width={150} height={150} className="block" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium text-fg-default">{judge.name}</p>
                  <p className="mt-0.5 text-2xs text-fg-subtle">{judge.tracks?.join(' · ')}</p>
                  <p className="mt-0.5 font-mono text-2xs text-fg-subtle">{judge.completion}% done</p>
                </div>
                <button onClick={() => onSend(judge.email)} disabled={sending[judge.email] || sent[judge.email]} className="btn-secondary w-full justify-center text-xs">
                  {sent[judge.email] ? <><CheckCircle size={13} /> Sent</> : <><Send size={13} /> Send Magic Link</>}
                </button>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="py-10 text-center text-sm text-fg-subtle">No judges found. Make sure you are signed in as organizer.</p>
      )}
    </div>
  );
}

function Heatmap({ status }: { status: any }) {
  if (!status?.heatmap) {
    return (
      <div className="grid gap-1" style={{ gridTemplateColumns: 'repeat(8, 32px)' }}>
        {Array.from({ length: 24 }).map((_, i) => (
          <div key={i} className="h-8 w-8 rounded-sm bg-bg-muted" />
        ))}
      </div>
    );
  }
  return (
    <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${status.heatmap[0]?.length ?? 8}, 32px)` }}>
      {status.heatmap.flatMap((row: any[], ri: number) =>
        row.map((cell: any, ci: number) => (
          <div
            key={`${ri}-${ci}`}
            className={`h-8 w-8 rounded-sm ${cell === 'submitted' ? 'bg-fg-default' : cell === 'in_progress' ? 'border border-fg-default bg-bg-overlay' : 'bg-bg-muted'}`}
            title={`Judge ${ri + 1} · Team ${ci + 1} · ${cell}`}
          />
        ))
      )}
    </div>
  );
}
