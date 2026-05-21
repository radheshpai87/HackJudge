'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Trophy, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

const API = '/api';

export default function LeaderboardPage() {
  const { slug } = useParams();
  const [results, setResults] = useState<any>(null);
  const [trackFilter, setTrackFilter] = useState<string>('all');
  const [status, setStatus] = useState<'loading' | 'empty' | 'error' | 'ok'>('loading');

  useEffect(() => {
    const token = typeof window !== 'undefined' ? (localStorage.getItem('token') ?? '') : '';
    fetch(`${API}/events/${slug}/results`, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
      .then((r) => {
        if (r.status === 401) { setStatus('error'); return null; }
        return r.json();
      })
      .then((d) => {
        if (!d) return;
        if (!d.success || !d.data) { setStatus('empty'); return; }
        setResults(d.data);
        setStatus('ok');
      })
      .catch(() => setStatus('error'));
  }, [slug]);

  if (status === 'loading') {
    return (
      <main className="page-shell flex min-h-screen items-center justify-center">
        <p className="text-sm text-fg-muted">Loading leaderboard…</p>
      </main>
    );
  }

  if (status === 'error') {
    return (
      <main className="page-shell flex min-h-screen items-center justify-center px-6">
        <div className="text-center">
          <p className="text-sm text-semantic-error">Failed to load leaderboard. Check your connection or sign in as organizer.</p>
          <Link href={`/events/${slug}`} className="btn-ghost mt-4 inline-flex text-sm text-fg-muted"><ArrowLeft size={14} /> Back to Dashboard</Link>
        </div>
      </main>
    );
  }

  if (status === 'empty') {
    return (
      <main className="page-shell flex min-h-screen items-center justify-center px-6">
        <div className="text-center">
          <Trophy size={40} className="mx-auto mb-4 text-fg-subtle" />
          <h2 className="text-lg font-medium text-fg-default">No results yet</h2>
          <p className="mt-2 text-sm text-fg-muted">Results haven&apos;t been generated yet. Generate them from the dashboard.</p>
          <Link href={`/events/${slug}/results`} className="btn-primary mt-6 inline-flex">Go to Results</Link>
        </div>
      </main>
    );
  }

  const ranking: any[] = results.overallRanking ?? [];
  const tracks = Array.from(new Set(ranking.map((t: any) => t.trackName).filter(Boolean)));
  const filtered = trackFilter === 'all' ? ranking : ranking.filter((t: any) => t.trackName === trackFilter);

  return (
    <main className="page-shell px-6 py-10">
      <div className="container-tight">
        {/* Header */}
        <div className="mb-8 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-3xl font-semibold text-fg-default">Leaderboard</h1>
            <p className="mt-1 text-sm text-fg-muted">Live rankings for {results.eventName ?? slug}</p>
          </div>
          <Link href={`/events/${slug}`} className="btn-ghost text-sm text-fg-muted">
            <ArrowLeft size={16} /> Back to Dashboard
          </Link>
        </div>

        {/* Track filter */}
        {tracks.length > 0 && (
          <div className="mb-6 flex flex-wrap gap-2">
            <button type="button"
              onClick={() => setTrackFilter('all')}
              className={`rounded-full border px-4 py-1.5 text-sm transition-colors ${trackFilter === 'all' ? 'border-fg-default bg-fg-default text-bg-base' : 'border-bg-border text-fg-muted hover:border-fg-muted'}`}
            >
              All Tracks
            </button>
            {tracks.map((track) => (
              <button type="button"
                key={track}
                onClick={() => setTrackFilter(track)}
                className={`rounded-full border px-4 py-1.5 text-sm transition-colors ${trackFilter === track ? 'border-fg-default bg-fg-default text-bg-base' : 'border-bg-border text-fg-muted hover:border-fg-muted'}`}
              >
                {track}
              </button>
            ))}
          </div>
        )}

        {/* Podium */}
        {filtered.length >= 3 && (
          <div className="mb-10 grid grid-cols-3 items-end gap-4">
            {[1, 0, 2].map((idx) => {
              const team = filtered[idx];
              if (!team) return null;
              const isFirst = idx === 0;
              return (
                <div key={idx} className={`flex flex-col items-center rounded-2xl border border-bg-border bg-bg-subtle p-5 text-center ${isFirst ? 'order-2 py-10' : 'order-1 py-6'}`}>
                  <div className={`mb-3 inline-flex h-10 w-10 items-center justify-center rounded-full ${isFirst ? 'bg-fg-default text-bg-base' : 'bg-bg-muted text-fg-muted'}`}>
                    {isFirst ? <Trophy size={20} /> : <span className="text-sm font-bold">{idx + 1}</span>}
                  </div>
                  <p className="text-base font-semibold text-fg-default">{team.teamName}</p>
                  <p className="mt-1 font-mono text-xl font-bold text-fg-default">{team.score?.toFixed ? `${team.score.toFixed(1)}%` : 'N/A'}</p>
                  <p className="mt-1 text-xs text-fg-subtle">{team.trackName ?? '—'}</p>
                </div>
              );
            })}
          </div>
        )}

        {/* Full table */}
        <div className="card overflow-hidden">
          <div className="grid grid-cols-[48px_1fr_100px_100px_80px] gap-4 border-b border-bg-border bg-bg-muted px-6 py-3 sm:grid-cols-[60px_1fr_120px_100px_80px]">
            <span className="font-mono text-2xs uppercase text-fg-subtle">#</span>
            <span className="font-mono text-2xs uppercase text-fg-subtle">Team</span>
            <span className="hidden font-mono text-2xs uppercase text-fg-subtle sm:block">Track</span>
            <span className="font-mono text-2xs uppercase text-fg-subtle">Score</span>
            <span className="font-mono text-2xs uppercase text-fg-subtle">Judges</span>
          </div>
          {filtered.map((team: any, idx: number) => {
            const isTop3 = idx < 3;
            return (
              <div
                key={team.teamId}
                className={`grid grid-cols-[48px_1fr_100px_100px_80px] gap-4 border-b border-bg-border bg-bg-subtle px-6 py-4 transition-colors hover:bg-bg-muted sm:grid-cols-[60px_1fr_120px_100px_80px] ${isTop3 ? 'border-l-2 border-l-fg-default' : 'border-l-2 border-l-bg-border'}`}
              >
                <div className="flex items-center">
                  {isTop3 ? (
                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-bg-muted text-xs font-bold text-fg-default">{idx + 1}</span>
                  ) : (
                    <span className="font-mono text-sm text-fg-subtle">{idx + 1}</span>
                  )}
                </div>
                <span className="truncate text-sm font-medium text-fg-default">{team.teamName}</span>
                <span className="hidden truncate text-sm text-fg-muted sm:block">{team.trackName ?? '—'}</span>
                <span className="font-mono text-sm text-fg-default">{team.score?.toFixed ? `${team.score.toFixed(1)}%` : 'N/A'}</span>
                <span className="font-mono text-sm text-fg-muted">{team.judgeCount}</span>
              </div>
            );
          })}
        </div>

        {filtered.length === 0 && (
          <div className="py-16 text-center">
            <p className="text-fg-muted">No teams match this filter.</p>
          </div>
        )}
      </div>
    </main>
  );
}
