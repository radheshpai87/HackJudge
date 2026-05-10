'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Download, FileSpreadsheet, FileText, Lock, Trophy, AlertTriangle } from 'lucide-react';
import Link from 'next/link';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

export default function ResultsPage() {
  const { slug } = useParams();
  const [results, setResults] = useState<any>(null);

  useEffect(() => {
    fetch(`${API}/events/${slug}/results`).then((r) => r.json()).then((d) => setResults(d.data));
  }, [slug]);

  if (!results) {
    return (
      <div className="page-shell flex min-h-screen items-center justify-center">
        <p className="text-sm text-fg-muted">Loading results...</p>
      </div>
    );
  }

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
            <ExportButton href={`${API}/events/${slug}/results/export/pdf`} icon={<FileText size={14} />} label="Export PDF" />
            <ExportButton href={`${API}/events/${slug}/results/export/csv`} icon={<Download size={14} />} label="Export CSV" />
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
