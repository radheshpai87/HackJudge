'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Activity, BarChart3, Users, CheckCircle, QrCode, Copy, ExternalLink, KeyRound, ShieldCheck, Eye, EyeOff, Trophy, Settings } from 'lucide-react';
import Link from 'next/link';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

function getAppBase() {
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL;
  if (typeof window === 'undefined') return 'http://localhost:3000';
  const origin = window.location.origin;
  if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
    try {
      const apiHost = new URL(API).hostname;
      if (apiHost !== 'localhost' && apiHost !== '127.0.0.1') return `http://${apiHost}:3000`;
    } catch { /* fall through */ }
  }
  return origin;
}

export default function EventDashboard() {
  const { slug } = useParams();
  const [event, setEvent] = useState<any>(null);
  const [status, setStatus] = useState<any>(null);
  const [judges, setJudges] = useState<any[]>([]);
  const [notOrg, setNotOrg] = useState(false);
  const [copiedPortal, setCopiedPortal] = useState(false);

  function reloadJudges() {
    const orgToken = typeof window !== 'undefined' ? localStorage.getItem('token') : '';
    if (!orgToken) { setNotOrg(true); return; }
    fetch(`${API}/events/${slug}/judges`, { headers: { Authorization: `Bearer ${orgToken}` } })
      .then((r) => { if (r.status === 401) { setNotOrg(true); return r.json(); } return r.json(); })
      .then((d) => { if (d?.success) { setJudges(d.data); setNotOrg(false); } });
  }

  useEffect(() => {
    const ctrl = new AbortController();
    fetch(`${API}/events/${slug}`, { signal: ctrl.signal })
      .then((r) => r.json()).then((d) => setEvent(d.data)).catch(() => {});
    fetch(`${API}/events/${slug}/status`, { signal: ctrl.signal })
      .then((r) => r.json()).then((d) => setStatus(d.data)).catch(() => {});
    reloadJudges();
    return () => ctrl.abort();
  }, [slug]);

  if (!event) {
    return (
      <div className="page-shell flex min-h-screen items-center justify-center">
        <p className="text-sm text-fg-muted">Loading…</p>
      </div>
    );
  }

  const eventName = event?.event?.name ?? 'Untitled Event';
  const judgingStatus: string = event?.status ?? 'not_started';
  const totalAssignments = status?.totalAssignments ?? 0;
  const completedSubmissions = status?.completedSubmissions ?? 0;
  const completionPct = totalAssignments > 0 ? Math.round((completedSubmissions / totalAssignments) * 100) : 0;

  const statusBadge = {
    open: 'border-semantic-success/30 bg-semantic-success/10 text-semantic-success',
    closed: 'border-semantic-error/30 bg-semantic-error/10 text-semantic-error',
    not_started: 'border-fg-muted/30 bg-bg-muted text-fg-muted',
  }[judgingStatus] ?? 'border-fg-muted/30 bg-bg-muted text-fg-muted';

  const statusLabel = { open: 'Open', closed: 'Closed', not_started: 'Not Started' }[judgingStatus] ?? judgingStatus;

  return (
    <div className="page-shell flex min-h-screen">
      {/* Sidebar */}
      <aside className="hidden w-60 flex-shrink-0 flex-col border-r border-bg-border bg-bg-subtle md:flex">
        {/* Top: back to hub */}
        <div className="border-b border-bg-border px-4 py-3">
          <Link href="/home" className="flex items-center gap-1.5 text-xs text-fg-subtle transition-colors hover:text-fg-muted">
            <span className="text-fg-disabled">←</span> All Events
          </Link>
        </div>

        {/* Event identity */}
        <div className="border-b border-bg-border px-4 py-4">
          <div className={`mb-2 inline-flex items-center rounded-full border px-2 py-0.5 text-2xs font-medium ${statusBadge}`}>{statusLabel}</div>
          <h2 className="truncate text-sm font-semibold text-fg-default leading-snug">{eventName}</h2>
          <p className="mt-0.5 font-mono text-2xs text-fg-subtle">{String(slug)}</p>
        </div>

        {/* Nav */}
        <nav className="flex flex-col gap-0.5 p-3">
          <SidebarLink href={`/events/${slug}`} icon={<Activity size={14} />} label="Dashboard" active />
          <SidebarLink href={`/events/${slug}/results`} icon={<BarChart3 size={14} />} label="Results" />
          <SidebarLink href={`/events/${slug}/leaderboard`} icon={<Trophy size={14} />} label="Leaderboard" />
          <SidebarLink href={`/events/${slug}/judge`} icon={<QrCode size={14} />} label="Judge Portal" />
          <div className="my-1 h-px bg-bg-border" />
          <SidebarLink href={`/events/${slug}/config`} icon={<Settings size={14} />} label="Settings" />
        </nav>

        {/* Progress footer */}
        <div className="mt-auto border-t border-bg-border p-4">
          <div className="mb-2 flex items-center justify-between text-xs">
            <span className="text-fg-muted">Scoring progress</span>
            <span className={`font-mono font-medium ${completionPct === 100 ? 'text-semantic-success' : 'text-fg-default'}`}>{completionPct}%</span>
          </div>
          <div className="h-1 overflow-hidden rounded-full bg-bg-muted">
            <div className={`h-full rounded-full transition-all duration-500 ${completionPct === 100 ? 'bg-semantic-success' : 'bg-fg-muted'}`} style={{ width: `${completionPct}%` }} />
          </div>
          <p className="mt-1.5 text-2xs text-fg-subtle">{completedSubmissions} / {totalAssignments || '—'} submitted</p>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-y-auto p-6 lg:p-8">
        {/* Page header */}
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-fg-default">{eventName}</h1>
            {event?.event?.description && (
              <p className="mt-1 max-w-xl text-sm text-fg-muted leading-relaxed">{event.event.description}</p>
            )}
          </div>
          <span className={`self-start rounded-full border px-3 py-1 text-xs font-medium sm:self-auto ${statusBadge}`}>
            {statusLabel}
          </span>
        </div>

        {/* Stats */}
        {status && (
          <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard icon={<Users size={18} />} value={status.totalTeams ?? 0} label="Teams" />
            <StatCard icon={<Activity size={18} />} value={status.totalJudges ?? 0} label="Judges" />
            <StatCard icon={<CheckCircle size={18} />} value={`${completedSubmissions} / ${totalAssignments || '—'}`} label="Submissions" />
            <StatCard icon={<BarChart3 size={18} />} value={`${completionPct}%`} label="Complete" />
          </div>
        )}

        {/* Judge Management */}
        <JudgeAccessPanel
          slug={String(slug)} judges={judges} notOrg={notOrg} copiedPortal={copiedPortal}
          onPinUpdated={reloadJudges}
          onCopyPortal={() => {
            navigator.clipboard.writeText(`${getAppBase()}/events/${slug}/judge`);
            setCopiedPortal(true);
            setTimeout(() => setCopiedPortal(false), 2000);
          }}
        />
      </main>
    </div>
  );
}

function SidebarLink({ href, icon, label, active }: { href: string; icon: React.ReactNode; label: string; active?: boolean }) {
  return (
    <Link href={href} className={active ? 'sidebar-item-active' : 'sidebar-item'}>
      {icon} {label}
    </Link>
  );
}

function StatCard({ icon, value, label }: { icon: React.ReactNode; value: string | number; label: string }) {
  return (
    <div className="stat-card">
      <div className="mb-2 text-fg-muted">{icon}</div>
      <div className="font-mono text-2xl font-medium text-fg-default">{value}</div>
      <div className="mt-0.5 text-xs text-fg-muted">{label}</div>
    </div>
  );
}

function JudgeAccessPanel({ slug, judges, notOrg, copiedPortal, onPinUpdated, onCopyPortal }: {
  slug: string; judges: any[]; notOrg: boolean; copiedPortal: boolean; onPinUpdated: () => void; onCopyPortal: () => void;
}) {
  const portalUrl = `${getAppBase()}/events/${slug}/judge`;
  return (
    <div className="card p-6">
      <div className="mb-5 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h3 className="text-base font-semibold text-fg-default">Judges</h3>
          <p className="mt-0.5 text-sm text-fg-muted">Set a PIN for each judge — they sign in with email + PIN.</p>
        </div>
        <a href={portalUrl} target="_blank" rel="noopener noreferrer" className="btn-primary whitespace-nowrap text-sm">
          <ExternalLink size={14} /> Open Portal
        </a>
      </div>

      <div className="mb-5 flex items-center gap-2 rounded-lg border border-bg-border bg-bg-muted px-4 py-2.5">
        <code className="flex-1 truncate font-mono text-xs text-fg-muted">{portalUrl}</code>
        <button type="button" onClick={onCopyPortal} className="flex items-center gap-1 text-xs text-fg-muted hover:text-fg-default">
          {copiedPortal ? <><CheckCircle size={12} /> Copied</> : <><Copy size={12} /> Copy</>}
        </button>
      </div>

      {notOrg ? (
        <div className="flex flex-col items-center gap-3 py-10 text-center">
          <KeyRound size={24} className="text-fg-subtle" />
          <p className="text-sm text-fg-muted">Sign in as organizer to manage judge PINs.</p>
          <a href={`/login?next=/events/${slug}`} className="btn-primary text-sm">Sign in</a>
        </div>
      ) : judges.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {judges.map((judge) => (
            <JudgeCard key={judge.id} judge={judge} slug={slug} portalUrl={portalUrl} onPinUpdated={onPinUpdated} />
          ))}
        </div>
      ) : (
        <p className="py-10 text-center text-sm text-fg-subtle">No judges configured for this event.</p>
      )}
    </div>
  );
}

function JudgeCard({ judge, slug, portalUrl, onPinUpdated }: { judge: any; slug: string; portalUrl: string; onPinUpdated: () => void }) {
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState('');
  const judgeUrl = `${portalUrl}?email=${encodeURIComponent(judge.email)}`;
  const qr = `https://api.qrserver.com/v1/create-qr-code/?size=140x140&color=ededed&bgcolor=111111&data=${encodeURIComponent(judgeUrl)}`;

  async function savePin() {
    if (pin.length < 4) { setErr('Min 4 characters'); return; }
    setSaving(true); setErr('');
    const orgToken = localStorage.getItem('token') || '';
    const res = await fetch(`${API}/events/${slug}/judges/${judge.id}/pin`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${orgToken}` },
      body: JSON.stringify({ pin }),
    });
    const data = await res.json();
    setSaving(false);
    if (data.success) { setSaved(true); setPin(''); onPinUpdated(); setTimeout(() => setSaved(false), 2000); }
    else setErr(data.error?.message ?? 'Failed to save');
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-bg-border bg-bg-muted p-4">
      <div className="flex items-center gap-3">
        <div className="overflow-hidden rounded-lg border border-bg-border flex-shrink-0">
          <img src={qr} alt={`QR for ${judge.name}`} width={70} height={70} className="block" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-fg-default">{judge.name}</p>
          <p className="truncate text-xs text-fg-subtle">{judge.email}</p>
          <p className="mt-0.5 text-xs text-fg-subtle">{judge.tracks?.join(' · ') || 'All tracks'}</p>
          <div className="mt-1.5 flex items-center gap-2">
            {judge.hasPin
              ? <span className="flex items-center gap-1 text-2xs text-semantic-success"><ShieldCheck size={11} /> PIN set</span>
              : <span className="flex items-center gap-1 text-2xs text-amber-400"><KeyRound size={11} /> No PIN</span>}
            <span className="ml-auto text-2xs text-fg-subtle">{judge.completion}%</span>
          </div>
        </div>
      </div>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <input
            className="input w-full pr-9 font-mono text-sm tracking-widest"
            type={showPin ? 'text' : 'password'}
            placeholder={judge.hasPin ? 'Change PIN…' : 'Set PIN…'}
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && savePin()}
          />
          <button type="button" onClick={() => setShowPin(v => !v)} className="absolute right-2 top-1/2 -translate-y-1/2 text-fg-subtle hover:text-fg-muted">
            {showPin ? <EyeOff size={13} /> : <Eye size={13} />}
          </button>
        </div>
        <button type="button" onClick={savePin} disabled={saving || !pin} className="btn-secondary px-3 text-xs disabled:opacity-40">
          {saved ? <CheckCircle size={13} className="text-semantic-success" /> : saving ? '…' : 'Save'}
        </button>
      </div>
      {err && <p className="text-xs text-semantic-error">{err}</p>}
    </div>
  );
}
