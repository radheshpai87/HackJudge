'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { Hexagon, ArrowLeft, ArrowRight, Check, Trophy, LogOut } from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

type Screen = 'loading' | 'auth' | 'home' | 'scoring' | 'success';
interface Team { id: string; name: string; track: string | null; trackId: string | null; tableNumber: string | null; members: string[]; }
interface Criterion { id: string; name: string; maxScore: number; weight: number; scoringType: 'numeric' | 'rubric'; rubric: Array<{ score: number; label: string; description: string }> | null; trackId: string | null; }
interface JudgeInfo { id: string; name: string; email: string; }
interface JudgeState { judge: JudgeInfo; assignments: Team[]; completedTeamIds: string[]; progress: { totalAssigned: number; completed: number; percent: number }; }
interface EventMeta { name: string; description: string; judging_opens_at: string; judging_closes_at: string; }
interface EventConfig { event: EventMeta; tracks: Array<{ id: string; name: string }>; }

async function apiFetch(path: string, token?: string, opts: RequestInit = {}) {
  const res = await fetch(`${API}${path}`, {
    ...opts,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(opts.headers ?? {}) },
  });
  return res.json();
}

function tokenKey(slug: string) { return `judge_token_${slug}`; }

export default function JudgePortal() {
  const { slug } = useParams<{ slug: string }>();
  const searchParams = useSearchParams();
  const prefilledEmail = searchParams.get('email') ?? '';
  const [screen, setScreen] = useState<Screen>('loading');
  const [authToken, setAuthToken] = useState('');
  const [judgeState, setJudgeState] = useState<JudgeState | null>(null);
  const [eventConfig, setEventConfig] = useState<EventConfig | null>(null);
  const [currentTeam, setCurrentTeam] = useState<Team | null>(null);
  const [lastProgress, setLastProgress] = useState({ completed: 0, totalAssigned: 0 });

  useEffect(() => {
    // Fetch event config first (public endpoint)
    apiFetch(`/events/${slug}`).then((ev) => { if (ev.success) setEventConfig({ event: ev.data.event, tracks: ev.data.tracks }); });
    const stored = localStorage.getItem(tokenKey(slug));
    if (!stored) { setScreen('auth'); return; }
    apiFetch(`/events/${slug}/judges/me`, stored)
      .then((data) => {
        if (data.success) { setAuthToken(stored); setJudgeState(data.data); setLastProgress(data.data.progress); setScreen('home'); }
        else { localStorage.removeItem(tokenKey(slug)); setScreen('auth'); }
      })
      .catch(() => setScreen('auth'));
  }, [slug]);

  const refreshJudgeState = useCallback(async (token: string) => {
    const data = await apiFetch(`/events/${slug}/judges/me`, token);
    if (data.success) { setJudgeState(data.data); setLastProgress(data.data.progress); }
  }, [slug]);

  function handleSignedIn(token: string, state: JudgeState) { localStorage.setItem(tokenKey(slug), token); setAuthToken(token); setJudgeState(state); setLastProgress(state.progress); setScreen('home'); }
  function handleSelectTeam(team: Team) { setCurrentTeam(team); setScreen('scoring'); }
  async function handleSubmitted() { await refreshJudgeState(authToken); setScreen('success'); }
  function handleSignOut() { localStorage.removeItem(tokenKey(slug)); setAuthToken(''); setJudgeState(null); setCurrentTeam(null); setScreen('auth'); }

  if (screen === 'loading') return <Shell><div className="flex h-screen items-center justify-center"><p className="text-sm text-fg-muted">Loading…</p></div></Shell>;
  if (screen === 'auth') return <Shell><AuthScreen slug={slug} eventConfig={eventConfig} prefilledEmail={prefilledEmail} onSignedIn={handleSignedIn} /></Shell>;
  if (screen === 'home') return <Shell><HomeScreen judgeState={judgeState!} eventConfig={eventConfig} onSelectTeam={handleSelectTeam} onSignOut={handleSignOut} /></Shell>;
  if (screen === 'scoring') return <Shell><ScoringScreen token={authToken} slug={slug} team={currentTeam!} eventConfig={eventConfig} onSubmitted={handleSubmitted} onBack={() => setScreen('home')} /></Shell>;
  if (screen === 'success') return <Shell><SuccessScreen team={currentTeam!} eventConfig={eventConfig} progress={lastProgress} onContinue={() => setScreen('home')} /></Shell>;
  return null;
}

function Shell({ children }: { children: React.ReactNode }) {
  return <div className="page-shell flex justify-center"><div className="w-full max-w-[480px]">{children}</div></div>;
}

/* ═══════════════════════════════════════════════════════ AUTH ═══════ */
function AuthScreen({ slug, eventConfig, prefilledEmail, onSignedIn }: { slug: string; eventConfig: EventConfig | null; prefilledEmail: string; onSignedIn: (token: string, state: JudgeState) => void }) {
  const [step, setStep] = useState<'request' | 'verify'>(prefilledEmail ? 'request' : 'request');
  const [email, setEmail] = useState(prefilledEmail);
  const [magicToken, setMagicToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [hint, setHint] = useState('');
  const [err, setErr] = useState('');

  async function requestLink() {
    if (!email.trim()) { setErr('Enter your email address.'); return; }
    setLoading(true); setErr('');
    const data = await apiFetch('/auth/magic-link', undefined, { method: 'POST', body: JSON.stringify({ email: email.trim(), eventSlug: slug }) });
    setLoading(false);
    if (data.success) { setHint('Magic link sent! Check your email — or look in the API terminal (dev mode).'); setStep('verify'); }
    else { setErr(data.error?.message ?? 'Failed to send magic link.'); }
  }

  async function verify() {
    if (!magicToken.trim()) { setErr('Paste the token from the magic link.'); return; }
    setLoading(true); setErr('');
    const data = await apiFetch(`/auth/verify/${magicToken.trim()}`);
    if (!data.success) { setLoading(false); setErr(data.error?.message ?? 'Invalid or expired token.'); return; }
    const meData = await apiFetch(`/events/${slug}/judges/me`, data.data.accessToken);
    setLoading(false);
    if (meData.success) { onSignedIn(data.data.accessToken, meData.data); }
    else { setErr('Authenticated but could not load your profile. Are you assigned to this event?'); }
  }

  return (
    <div className="px-6 pt-16 pb-10">
      <div className="mb-10 text-center">
        <div className="mx-auto mb-3 inline-flex h-12 w-12 items-center justify-center rounded-xl border border-bg-border bg-bg-subtle">
          <Hexagon size={24} className="text-fg-default" />
        </div>
        <h1 className="text-2xl font-semibold text-fg-default">{eventConfig?.event?.name || 'HackJudge'}</h1>
        {eventConfig?.event?.description ? (
          <p className="mt-2 text-sm text-fg-muted leading-relaxed">{eventConfig.event.description}</p>
        ) : (
          <p className="mt-1 text-sm text-fg-subtle">{slug}</p>
        )}
      </div>

      <div className="card p-6">
        {step === 'request' ? (
          <>
            <h2 className="mb-5 text-lg font-semibold text-fg-default">Judge Sign In</h2>
            <label className="label">Email address</label>
            <input className="input" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="judge@example.com" type="email" onKeyDown={(e) => e.key === 'Enter' && requestLink()} />
            {err && <p className="mt-2 text-sm text-semantic-error">{err}</p>}
            <button className="btn-primary mt-4 w-full" onClick={requestLink} disabled={loading}>
              {loading ? 'Sending…' : 'Send Magic Link'}
            </button>
          </>
        ) : (
          <>
            <h2 className="mb-2 text-lg font-semibold text-fg-default">Enter Token</h2>
            {hint && <p className="mb-4 text-sm text-fg-muted leading-relaxed">{hint}</p>}
            <label className="label">Magic link token</label>
            <textarea className="input mb-4 h-20 resize-y font-mono text-sm" value={magicToken} onChange={(e) => setMagicToken(e.target.value)} placeholder="Paste token here…" />
            {err && <p className="mb-2 text-sm text-semantic-error">{err}</p>}
            <button className="btn-primary w-full" onClick={verify} disabled={loading}>
              {loading ? 'Verifying…' : 'Sign In'}
            </button>
            <button onClick={() => { setStep('request'); setErr(''); }} className="btn-ghost mt-3 w-full text-fg-subtle">
              <ArrowLeft size={14} /> Back
            </button>
          </>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════ HOME ═══════ */
function HomeScreen({ judgeState, eventConfig, onSelectTeam, onSignOut }: { judgeState: JudgeState; eventConfig: EventConfig | null; onSelectTeam: (t: Team) => void; onSignOut: () => void }) {
  const { judge, assignments, completedTeamIds, progress } = judgeState;
  return (
    <div className="pb-10">
      {/* Event header */}
      {eventConfig?.event?.name && (
        <div className="border-b border-bg-border bg-bg-subtle px-6 pt-6 pb-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-fg-subtle">Judging Portal</p>
          <h2 className="mt-1 text-lg font-semibold text-fg-default">{eventConfig.event.name}</h2>
        </div>
      )}
      {/* Header */}
      <div className="flex items-start justify-between border-b border-bg-border px-6 pt-6 pb-5">
        <div>
          <h1 className="text-xl font-semibold text-fg-default">{judge.name}</h1>
          <p className="mt-1 text-sm text-fg-subtle">{judge.email}</p>
        </div>
        <button onClick={onSignOut} className="btn-ghost text-fg-subtle">
          <LogOut size={14} /> Sign out
        </button>
      </div>

      {/* Progress */}
      <div className="border-b border-bg-border px-6 py-5">
        <div className="mb-2 flex justify-between text-sm">
          <span className="text-fg-muted">Progress</span>
          <span className="font-medium text-fg-default">{progress.completed}/{progress.totalAssigned}</span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-bg-muted">
          <div className={`h-full rounded-full transition-all duration-300 ${progress.percent === 100 ? 'bg-semantic-success' : 'bg-fg-default'}`} style={{ width: `${progress.percent}%` }} />
        </div>
        {progress.percent === 100 && <p className="mt-2 text-center text-sm text-semantic-success">All teams scored!</p>}
      </div>

      {/* Team list */}
      <div className="px-6 pt-5">
        <p className="mb-3.5 text-xs font-semibold uppercase tracking-wider text-fg-subtle">Assigned Teams</p>
        <div className="flex flex-col gap-2.5">
          {assignments.map((team) => {
            const done = completedTeamIds.includes(team.id);
            return (
              <button key={team.id} onClick={() => onSelectTeam(team)} className="flex items-center justify-between rounded-xl border border-bg-border bg-bg-subtle p-4 text-left transition-colors hover:border-fg-muted/20">
                <div className="flex items-center gap-3">
                  <div className={`h-2 w-2 flex-shrink-0 rounded-full ${done ? 'bg-semantic-success' : 'bg-fg-disabled'}`} />
                  <div>
                    <p className="text-[15px] font-semibold text-fg-default">{team.name}</p>
                    {team.track && <p className="mt-0.5 text-xs text-fg-subtle">{team.track}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-2.5">
                  {team.tableNumber && <span className="rounded-md bg-bg-muted px-2 py-0.5 text-xs text-fg-subtle">Table {team.tableNumber}</span>}
                  {done ? <Check size={18} className="text-semantic-success" /> : <span className="text-fg-subtle">›</span>}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════ SCORING ════ */
function ScoringScreen({ token, slug, team, eventConfig, onSubmitted, onBack }: { token: string; slug: string; team: Team; eventConfig: EventConfig | null; onSubmitted: () => void; onBack: () => void }) {
  const [criteria, setCriteria] = useState<Criterion[]>([]);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    Promise.all([
      apiFetch(`/events/${slug}/criteria`, token),
      apiFetch(`/events/${slug}/teams/${team.id}`, token),
    ]).then(([critData, teamData]) => {
      const all: Criterion[] = critData.success ? critData.data : [];
      const relevant = all.filter((c) => c.trackId === null || c.trackId === team.trackId);
      setCriteria(relevant);
      if (teamData.success && teamData.data.scores) {
        const existing: Record<string, number> = {};
        for (const s of teamData.data.scores) existing[s.criterionId] = s.value;
        setScores(existing);
      }
      setLoading(false);
    });
  }, [slug, token, team]);

  const allScored = criteria.length > 0 && criteria.every((c) => scores[c.id] !== undefined);

  async function save() {
    setSaving(true); setErr('');
    const entries = Object.entries(scores).map(([criterionId, value]) => ({ criterionId, value }));
    const data = await apiFetch(`/events/${slug}/scores`, token, { method: 'PUT', body: JSON.stringify({ teamId: team.id, scores: entries }) });
    setSaving(false);
    if (!data.success) setErr(data.error?.message ?? 'Failed to save');
  }

  async function submit() {
    if (!allScored) { setErr('Score all criteria before submitting.'); return; }
    setSubmitting(true); setErr('');
    const entries = criteria.map((c) => ({ criterionId: c.id, value: scores[c.id]! }));
    const saveData = await apiFetch(`/events/${slug}/scores`, token, { method: 'PUT', body: JSON.stringify({ teamId: team.id, scores: entries }) });
    if (!saveData.success) { setSubmitting(false); setErr(saveData.error?.message ?? 'Failed to save scores'); return; }
    const submitData = await apiFetch(`/events/${slug}/scores/submit`, token, { method: 'POST', body: JSON.stringify({ teamId: team.id }) });
    setSubmitting(false);
    if (submitData.success) onSubmitted(); else setErr(submitData.error?.message ?? 'Failed to submit');
  }

  if (loading) return <div className="flex h-screen items-center justify-center"><p className="text-sm text-fg-muted">Loading…</p></div>;

  return (
    <div className="pb-16">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-bg-border px-4 pt-12 pb-4">
        <button onClick={onBack} className="btn-ghost p-1 text-fg-muted"><ArrowLeft size={18} /></button>
        <div className="flex-1">
          <h1 className="text-lg font-semibold text-fg-default">{team.name}</h1>
          {eventConfig?.event?.name && <p className="text-xs text-fg-subtle">{eventConfig.event.name}</p>}
        </div>
      </div>

      <div className="px-5 pt-5">
        {/* Team info */}
        <div className="mb-6 flex flex-wrap gap-2">
          {team.track && <span className="rounded-full border border-bg-border bg-bg-muted px-3 py-1 text-xs text-fg-muted">{team.track}</span>}
          {team.tableNumber && <span className="text-xs text-fg-subtle">Table {team.tableNumber}</span>}
          {team.members?.length > 0 && <span className="w-full text-xs text-fg-subtle">{team.members.join(' · ')}</span>}
        </div>

        <p className="mb-3.5 text-xs font-semibold uppercase tracking-wider text-fg-subtle">Criteria</p>

        {/* Criteria */}
        <div className="flex flex-col gap-3">
          {criteria.map((crit) => (
            <div key={crit.id} className="rounded-xl border border-bg-border bg-bg-subtle p-4">
              <div className="mb-3.5 flex justify-between">
                <span className="text-[15px] font-semibold text-fg-default">{crit.name}</span>
                <span className="text-xs text-fg-subtle">×{(crit.weight * 100).toFixed(0)}%</span>
              </div>
              {crit.scoringType === 'rubric' && crit.rubric ? (
                <div className="flex flex-col gap-2">
                  {crit.rubric.map((level) => {
                    const sel = scores[crit.id] === level.score;
                    return (
                      <button key={level.score} onClick={() => setScores((s) => ({ ...s, [crit.id]: level.score }))}
                        className={`rounded-lg border p-3 text-left transition-colors ${sel ? 'border-semantic-success bg-semantic-success/5' : 'border-bg-border bg-bg-muted hover:border-fg-muted/20'}`}>
                        <div className="mb-1 flex items-center gap-2.5">
                          <span className={`w-6 font-mono text-base font-bold ${sel ? 'text-semantic-success' : 'text-fg-subtle'}`}>{level.score}</span>
                          <span className={`text-sm font-semibold ${sel ? 'text-fg-default' : 'text-fg-muted'}`}>{level.label}</span>
                        </div>
                        <p className={`pl-8 text-xs leading-relaxed ${sel ? 'text-fg-muted' : 'text-fg-subtle'}`}>{level.description}</p>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {Array.from({ length: crit.maxScore + 1 }, (_, i) => i).map((n) => {
                    const sel = scores[crit.id] === n;
                    return (
                      <button key={n} onClick={() => setScores((s) => ({ ...s, [crit.id]: n }))}
                        className={`flex h-11 w-11 items-center justify-center rounded-lg border text-sm font-medium transition-colors ${sel ? 'border-fg-default bg-fg-default text-bg-base' : 'border-bg-border bg-bg-muted text-fg-muted hover:border-fg-muted'}`}>
                        {n}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>

        {err && <p className="mt-3 text-sm text-semantic-error">{err}</p>}

        {/* Actions */}
        <div className="mt-6 flex flex-col gap-2.5">
          <button onClick={save} disabled={saving} className="btn-secondary w-full">
            {saving ? 'Saving…' : 'Save Draft'}
          </button>
          <button onClick={submit} disabled={!allScored || submitting} className={`w-full rounded-md py-3.5 text-sm font-semibold transition-opacity ${allScored ? 'bg-fg-default text-bg-base hover:opacity-85' : 'cursor-not-allowed bg-bg-muted text-fg-subtle'}`}>
            {submitting ? 'Submitting…' : <>Submit Scores <ArrowRight size={16} /></>}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════ SUCCESS ════ */
function SuccessScreen({ team, eventConfig, progress, onContinue }: { team: Team; eventConfig: EventConfig | null; progress: { completed: number; totalAssigned: number }; onContinue: () => void }) {
  const allDone = progress.completed >= progress.totalAssigned;
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-8 py-10 text-center">
      <div className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-2xl border border-bg-border bg-bg-subtle">
        {allDone ? <Trophy size={32} className="text-semantic-success" /> : <Check size={32} className="text-semantic-success" />}
      </div>
      <h1 className="text-2xl font-semibold text-fg-default">{allDone ? 'All Done!' : 'Submitted!'}</h1>
      <p className="mt-2 text-base text-fg-muted">{team.name}</p>
      {eventConfig?.event?.name && <p className="mt-1 text-sm text-fg-subtle">{eventConfig.event.name}</p>}
      <p className="mt-1 text-sm text-fg-subtle">
        {allDone ? 'You have scored all your assigned teams.' : `${progress.completed} of ${progress.totalAssigned} teams completed`}
      </p>
      <div className="my-8 h-1.5 w-full max-w-[280px] overflow-hidden rounded-full bg-bg-muted">
        <div className="h-full rounded-full bg-semantic-success transition-all" style={{ width: `${Math.round((progress.completed / Math.max(progress.totalAssigned, 1)) * 100)}%` }} />
      </div>
      <button onClick={onContinue} className="btn-primary min-w-[200px]">
        {allDone ? 'View All Teams' : <>Next Team <ArrowRight size={16} /></>}
      </button>
    </div>
  );
}
