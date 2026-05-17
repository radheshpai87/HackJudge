'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Download, FileText, Lock, AlertTriangle, RefreshCw, BarChart3 } from 'lucide-react';
import Link from 'next/link';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

export default function ResultsPage() {
  const { slug } = useParams();
  const [results, setResults] = useState<any>(null);
  const [state, setState] = useState<'loading' | 'ok' | 'empty' | 'unauth'>('loading');
  const [generating, setGenerating] = useState(false);

  function getToken() {
    return typeof window !== 'undefined' ? localStorage.getItem('token') || '' : '';
  }

  async function loadResults() {
    setState('loading');
    const token = getToken();
    const r = await fetch(`${API}/events/${slug}/results`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (r.status === 401) { setState('unauth'); return; }
    const d = await r.json();
    if (!d.success) { setState('empty'); return; }
    setResults(d.data);
    setState('ok');
  }

  async function generate() {
    const token = getToken();
    if (!token) { setState('unauth'); return; }
    setGenerating(true);
    await fetch(`${API}/events/${slug}/results/generate`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    setGenerating(false);
    loadResults();
  }

  useEffect(() => { loadResults(); }, [slug]);

  if (state === 'loading') return (
    <div className="page-shell flex min-h-screen items-center justify-center">
      <p className="text-sm text-fg-muted">Loading results…</p>
    </div>
  );

  if (state === 'unauth') return (
    <div className="page-shell flex min-h-screen flex-col items-center justify-center gap-4">
      <p className="text-sm text-fg-muted">Sign in as organizer to view results.</p>
      <a href={`/login?next=/events/${slug}/results`} className="btn-primary text-sm">Sign in</a>
    </div>
  );

  if (state === 'empty' || !results) return (
    <main className="page-shell flex min-h-screen flex-col items-center justify-center gap-5 px-6">
      <BarChart3 size={36} className="text-fg-subtle" />
      <div className="text-center">
        <h2 className="text-lg font-semibold text-fg-default">No results yet</h2>
        <p className="mt-1 text-sm text-fg-muted">Generate results to see the leaderboard.</p>
      </div>
      <button onClick={generate} disabled={generating} className="btn-primary">
        {generating ? <><RefreshCw size={14} className="animate-spin" /> Generating…</> : 'Generate Results'}
      </button>
      <Link href={`/events/${slug}`} className="text-sm text-fg-subtle hover:text-fg-muted">← Back to dashboard</Link>
    </main>
  );

  const ranking = results.overallRanking ?? [];
  const isLocked = results.locked ?? false;

  return (
    <main className="page-shell px-6 py-10">
      <div className="container-tight">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-fg-default">Results</h1>
          <p className="mt-1 text-sm text-fg-muted">Overall leaderboard and export options</p>
        </div>

        {results.tiebreakRequired && (
          <div className="mb-6 flex items-center gap-3 rounded-lg border border-semantic-warning/30 bg-semantic-warning/5 px-5 py-4 text-sm text-semantic-warning">
            <AlertTriangle size={16} /> Manual tiebreak required for some teams.
          </div>
        )}

        {/* Top 3 Podium */}
        {ranking.length >= 3 && (
          <div className="mb-8 grid grid-cols-3 gap-4">
            {[1, 0, 2].map((idx) => {
              const team = ranking[idx];
              if (!team) return null;
              const sizes = idx === 0 ? 'order-2 py-8' : 'order-1 py-6';
              const border = idx === 0 ? 'border-fg-default' : 'border-bg-border';
              return (
                <div key={idx} className={`${sizes} flex flex-col items-center rounded-xl border ${border} bg-bg-subtle text-center`}>
                  <div className={`mb-2 inline-flex h-8 w-8 items-center justify-center rounded-full ${idx === 0 ? 'bg-fg-default text-bg-base' : 'bg-bg-muted text-fg-muted'} text-sm font-bold`}>
                    {idx + 1}
                  </div>
                  <p className="text-sm font-semibold text-fg-default">{team.teamName}</p>
                  <p className="mt-1 font-mono text-lg text-fg-default">{team.score?.toFixed ? `${team.score.toFixed(1)}%` : 'N/A'}</p>
                </div>
              );
            })}
          </div>
        )}

        {/* Leaderboard table */}
        <div className="card mb-8 overflow-hidden">
          {/* Header */}
          <div className="grid grid-cols-[60px_1fr_120px_100px_80px] gap-4 border-b border-bg-border bg-bg-muted px-6 py-3">
            <span className="font-mono text-2xs uppercase text-fg-subtle">Rank</span>
            <span className="font-mono text-2xs uppercase text-fg-subtle">Team</span>
            <span className="font-mono text-2xs uppercase text-fg-subtle">Track</span>
            <span className="font-mono text-2xs uppercase text-fg-subtle">Score</span>
            <span className="font-mono text-2xs uppercase text-fg-subtle">Judges</span>
          </div>
          {/* Rows */}
          {ranking.map((team: any, idx: number) => {
            const isTop3 = idx < 3;
            return (
              <div
                key={team.teamId}
                className={`grid grid-cols-[60px_1fr_120px_100px_80px] gap-4 border-b border-bg-border bg-bg-subtle px-6 py-4 transition-colors hover:bg-bg-muted ${isTop3 ? 'border-l-2 border-l-fg-default' : 'border-l-2 border-l-bg-border'}`}
              >
                <span className={`font-mono text-lg font-medium ${isTop3 ? 'text-fg-default' : 'text-fg-subtle'}`}>{idx + 1}</span>
                <span className="text-sm font-medium text-fg-default">{team.teamName}</span>
                <span className="text-sm text-fg-muted">{team.trackName ?? '—'}</span>
                <span className="font-mono text-sm text-fg-default">{team.score?.toFixed ? `${team.score.toFixed(1)}%` : 'N/A'}</span>
                <span className="font-mono text-sm text-fg-muted">{team.judgeCount}</span>
              </div>
            );
          })}
        </div>

        {/* Export bar */}
        <div className="sticky bottom-4 flex flex-col items-start justify-between gap-4 rounded-xl border border-bg-border bg-bg-overlay p-4 sm:flex-row sm:items-center">
          <div className="flex items-center gap-2 text-fg-subtle">
            {isLocked && <Lock size={14} />}
            <span className="text-sm">{isLocked ? 'Results locked' : `Generated ${results.generatedAt ? new Date(results.generatedAt).toLocaleDateString() : 'recently'}`}</span>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={generate} disabled={generating} className="btn-secondary text-sm">
              {generating ? <><RefreshCw size={13} className="animate-spin" /> Regenerating…</> : <><RefreshCw size={13} /> Regenerate</>}
            </button>
            <a href={`${API}/events/${slug}/results/export/pdf?token=${getToken()}`} className="btn-secondary text-sm"><FileText size={14} /> Export PDF</a>
            <a href={`${API}/events/${slug}/results/export/csv?token=${getToken()}`} className="btn-secondary text-sm"><Download size={14} /> Export CSV</a>
          </div>
        </div>
      </div>
    </main>
  );
}

function ExportButton({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  return (
    <a href={href} className="btn-secondary text-sm">
      {icon} {label}
    </a>
  );
}
