'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { Hexagon, ArrowLeft, ArrowRight, Check, Trophy, LogOut, Pencil, MessageSquare } from 'lucide-react';

const API = '/api';

type Screen = 'loading' | 'auth' | 'home' | 'scoring' | 'success';
interface Team { id: string; name: string; track: string | null; trackId: string | null; tableNumber: string | null; members: string[]; }
interface Criterion { id: string; name: string; description?: string; maxScore: number; weight: number; scoringType: 'numeric' | 'rubric'; rubric: Array<{ score: number; label: string; description: string }> | null; trackId: string | null; }
interface JudgeInfo { id: string; name: string; email: string; }
interface JudgeState { judge: JudgeInfo; assignments: Team[]; completedTeamIds: string[]; progress: { totalAssigned: number; completed: number; percent: number }; }
interface EventMeta { name: string; description: string; }
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
    let mounted = true;
    apiFetch(`/events/${slug}`).then((ev) => { if (mounted && ev.success) setEventConfig({ event: ev.data.event, tracks: ev.data.tracks }); });
    const stored = localStorage.getItem(tokenKey(slug));
    if (!stored) { if (mounted) setScreen('auth'); return; }
    apiFetch(`/events/${slug}/judges/me`, stored)
      .then((data) => {
        if (!mounted) return;
        if (data.success) { setAuthToken(stored); setJudgeState(data.data); setLastProgress(data.data.progress); setScreen('home'); }
        else { localStorage.removeItem(tokenKey(slug)); setScreen('auth'); }
      })
      .catch(() => { if (mounted) setScreen('auth'); });
    return () => { mounted = false; };
  }, [slug]);

  const refreshJudgeState = useCallback(async (token: string) => {
    const data = await apiFetch(`/events/${slug}/judges/me`, token);
    if (data.success) { setJudgeState(data.data); setLastProgress(data.data.progress); }
  }, [slug]);

  function handleSignedIn(token: string, state: JudgeState) { localStorage.setItem(tokenKey(slug), token); setAuthToken(token); setJudgeState(state); setLastProgress(state.progress); setScreen('home'); }
  function handleSelectTeam(team: Team) { setCurrentTeam(team); setScreen('scoring'); }
  async function handleSubmitted(progress: { completed: number; totalAssigned: number }) { await refreshJudgeState(authToken); setLastProgress(progress); setScreen('success'); }
  function handleSignOut() { localStorage.removeItem(tokenKey(slug)); setAuthToken(''); setJudgeState(null); setCurrentTeam(null); setScreen('auth'); }

  if (screen === 'loading') return <Shell><div className="flex h-screen items-center justify-center"><p className="text-sm text-fg-muted">Loading…</p></div></Shell>;
  if (screen === 'auth') return <Shell><AuthScreen slug={slug} eventConfig={eventConfig} prefilledEmail={prefilledEmail} onSignedIn={handleSignedIn} /></Shell>;
  if (screen === 'home') return <Shell><HomeScreen judgeState={judgeState!} eventConfig={eventConfig} onSelectTeam={handleSelectTeam} onSignOut={handleSignOut} /></Shell>;
  if (screen === 'scoring') return <Shell><ScoringScreen token={authToken} slug={slug} team={currentTeam!} eventConfig={eventConfig} onSubmitted={handleSubmitted} onBack={() => setScreen('home')} /></Shell>;
  if (screen === 'success') return <Shell><SuccessScreen team={currentTeam!} eventConfig={eventConfig} progress={lastProgress} onContinue={() => setScreen('home')} /></Shell>;
  return null;
}

function Shell({ children }: { children: React.ReactNode }) {
  return <div className="page-shell flex justify-center"><div className="w-full max-w-[520px]">{children}</div></div>;
}

/* ═══════════════════════════════════════════════════════ AUTH ═══════ */
function AuthScreen({ slug, eventConfig, prefilledEmail, onSignedIn }: { slug: string; eventConfig: EventConfig | null; prefilledEmail: string; onSignedIn: (token: string, state: JudgeState) => void }) {
  const [email, setEmail] = useState(prefilledEmail);
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  const [organizerToken, setOrganizerToken] = useState<string | null>(null);

  useEffect(() => {
    setOrganizerToken(localStorage.getItem('token'));
  }, []);

  async function login() {
    if (!email.trim()) { setErr('Enter your email address.'); return; }
    if (!pin.trim()) { setErr('Enter your PIN.'); return; }
    setLoading(true); setErr('');
    const data = await apiFetch('/auth/judge-login', undefined, { method: 'POST', body: JSON.stringify({ email: email.trim(), pin: pin.trim(), eventSlug: slug }) });
    if (!data.success) { setLoading(false); setErr(data.error?.message ?? 'Sign in failed.'); return; }
    const meData = await apiFetch(`/events/${slug}/judges/me`, data.data.accessToken);
    setLoading(false);
    if (meData.success) { onSignedIn(data.data.accessToken, meData.data); }
    else { setErr('Signed in but could not load your profile. Contact the organizer.'); }
  }

  async function loginAsOrganizer() {
    if (!organizerToken) return;
    setLoading(true); setErr('');
    const data = await apiFetch('/auth/judge-login', organizerToken, {
      method: 'POST',
      body: JSON.stringify({ tokenExchange: true, eventSlug: slug })
    });
    if (!data.success) {
      setLoading(false);
      setErr(data.error?.message ?? 'Failed to authenticate using organizer account.');
      return;
    }
    const meData = await apiFetch(`/events/${slug}/judges/me`, data.data.accessToken);
    setLoading(false);
    if (meData.success) {
      onSignedIn(data.data.accessToken, meData.data);
    } else {
      setErr('Signed in but could not load your profile. Contact the organizer.');
    }
  }

  return (
    <div className="px-6 pt-14 pb-10">
      <div className="mb-10 text-center">
        <div className="mx-auto mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl border border-bg-border bg-bg-subtle">
          <Hexagon size={26} className="text-fg-default" strokeWidth={1.5} />
        </div>
        <h1 className="text-2xl font-semibold text-fg-default">{eventConfig?.event?.name || 'HackJudge'}</h1>
        {eventConfig?.event?.description
          ? <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-fg-muted">{eventConfig.event.description}</p>
          : <p className="mt-1 font-mono text-xs text-fg-subtle">{slug}</p>}
      </div>

      {organizerToken && (
        <div className="card mb-6 border border-primary/20 bg-primary/5 p-5 text-center">
          <p className="text-[15px] font-semibold text-fg-default">Logged in as Organizer</p>
          <p className="mt-1.5 text-xs text-fg-muted leading-relaxed">
            You can access the judging portal for your event directly using your active session.
          </p>
          <button
            type="button"
            onClick={loginAsOrganizer}
            disabled={loading}
            className="btn-primary mt-4 w-full py-2.5 text-xs font-semibold"
          >
            {loading ? 'Accessing Judge Portal…' : 'Access Judge Portal →'}
          </button>
        </div>
      )}

      <div className="card p-6">
        <h2 className="mb-5 text-base font-semibold text-fg-default">Judge Sign In</h2>
        <div className="space-y-4">
          <div>
            <label className="label">Email address</label>
            <input className="input" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="judge@example.com" type="email" autoComplete="email" onKeyDown={(e) => e.key === 'Enter' && login()} />
          </div>
          <div>
            <label className="label">PIN</label>
            <div className="relative">
              <input
                className="input w-full pr-14 tracking-widest"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="••••"
                type={showPin ? 'text' : 'password'}
                inputMode="numeric"
                autoComplete="current-password"
                onKeyDown={(e) => e.key === 'Enter' && login()}
              />
              <button type="button" onClick={() => setShowPin((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-fg-subtle hover:text-fg-muted">
                {showPin ? 'Hide' : 'Show'}
              </button>
            </div>
            <p className="mt-1.5 text-xs text-fg-subtle leading-relaxed">
              Your PIN is provided by the event organizer. Organizers can also sign in with their password.
            </p>
          </div>
        </div>
        {err && <p className="mt-3 rounded-md bg-semantic-error/10 px-3 py-2 text-sm text-semantic-error">{err}</p>}
        <button type="button" className="btn-primary mt-5 w-full py-3" onClick={login} disabled={loading}>
          {loading ? 'Signing in…' : 'Sign In →'}
        </button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════ HOME ═══════ */
function HomeScreen({ judgeState, eventConfig, onSelectTeam, onSignOut }: { judgeState: JudgeState; eventConfig: EventConfig | null; onSelectTeam: (t: Team) => void; onSignOut: () => void }) {
  const { judge, assignments, completedTeamIds, progress } = judgeState;
  const pending = assignments.filter((t) => !completedTeamIds.includes(t.id));
  const done = assignments.filter((t) => completedTeamIds.includes(t.id));

  return (
    <div className="pb-12">
      {/* Top bar */}
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-bg-border bg-bg-base px-5 py-3.5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-full border border-bg-border bg-bg-subtle text-xs font-bold text-fg-default">
            {judge.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="text-sm font-semibold text-fg-default leading-tight">{judge.name}</p>
            <p className="text-xs text-fg-subtle leading-tight">{eventConfig?.event?.name ?? 'Judging Portal'}</p>
          </div>
        </div>
        <button type="button" onClick={onSignOut} className="flex items-center gap-1.5 text-xs text-fg-subtle hover:text-fg-muted">
          <LogOut size={13} /> Sign out
        </button>
      </div>

      <div className="px-5 pt-5">
        {/* Progress card */}
        <div className="mb-5 rounded-xl border border-bg-border bg-bg-subtle p-5">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-sm font-medium text-fg-default">Your Progress</span>
            <span className="font-mono text-sm text-fg-muted">{progress.completed} <span className="text-fg-subtle">/ {progress.totalAssigned}</span></span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-bg-muted">
            <div
              className={`h-full rounded-full transition-all duration-500 ${progress.percent === 100 ? 'bg-semantic-success' : 'bg-fg-default'}`}
              style={{ width: `${progress.percent}%` }}
            />
          </div>
          {progress.percent === 100
            ? <p className="mt-2.5 text-center text-xs font-medium text-semantic-success">All teams scored!</p>
            : <p className="mt-2 text-xs text-fg-subtle">{progress.totalAssigned - progress.completed} remaining</p>}
        </div>

        {/* Pending teams */}
        {pending.length > 0 && (
          <div className="mb-5">
            <p className="mb-2.5 text-xs font-semibold uppercase tracking-wider text-fg-subtle">To Score</p>
            <div className="flex flex-col gap-2">
              {pending.map((team) => (
                <button type="button" key={team.id} onClick={() => onSelectTeam(team)}
                  className="flex items-center justify-between rounded-xl border border-bg-border bg-bg-subtle p-4 text-left transition-all hover:border-fg-muted/30 hover:bg-bg-muted active:scale-[0.99]">
                  <div>
                    <p className="text-[15px] font-semibold text-fg-default">{team.name}</p>
                    <div className="mt-0.5 flex items-center gap-2">
                      {team.track && <span className="text-xs text-fg-subtle">{team.track}</span>}
                      {team.tableNumber && <span className="rounded bg-bg-muted px-1.5 py-0.5 text-xs text-fg-subtle">Table {team.tableNumber}</span>}
                    </div>
                  </div>
                  <ArrowRight size={16} className="flex-shrink-0 text-fg-subtle" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Completed teams */}
        {done.length > 0 && (
          <div>
            <p className="mb-2.5 text-xs font-semibold uppercase tracking-wider text-fg-subtle">Submitted — tap to edit</p>
            <div className="flex flex-col gap-2">
              {done.map((team) => (
                <button type="button" key={team.id} onClick={() => onSelectTeam(team)}
                  className="flex items-center justify-between rounded-xl border border-semantic-success/20 bg-semantic-success/5 p-4 text-left transition-all hover:border-semantic-success/40 hover:bg-semantic-success/10 active:scale-[0.99]">
                  <div className="flex items-center gap-3">
                    <Check size={15} className="flex-shrink-0 text-semantic-success" />
                    <div>
                      <p className="text-[15px] font-semibold text-fg-default">{team.name}</p>
                      <div className="mt-0.5 flex items-center gap-2">
                        {team.track && <span className="text-xs text-fg-subtle">{team.track}</span>}
                        {team.tableNumber && <span className="rounded bg-bg-muted px-1.5 py-0.5 text-xs text-fg-subtle">Table {team.tableNumber}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-fg-subtle">
                    <Pencil size={12} /> Edit
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════ SCORING ════ */
function ScoringScreen({ token, slug, team, eventConfig, onSubmitted, onBack }: {
  token: string; slug: string; team: Team; eventConfig: EventConfig | null;
  onSubmitted: (progress: { completed: number; totalAssigned: number }) => void; onBack: () => void;
}) {
  const [criteria, setCriteria] = useState<Criterion[]>([]);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [notes, setNotes] = useState('');
  const [alreadySubmitted, setAlreadySubmitted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState('');
  const [savedFeedback, setSavedFeedback] = useState(false);

  useEffect(() => {
    Promise.all([
      apiFetch(`/events/${slug}/criteria`, token),
      apiFetch(`/events/${slug}/judges/my-scores/${team.id}`, token),
    ]).then(([critData, scoresData]) => {
      const all: Criterion[] = critData.success ? critData.data : [];
      setCriteria(all.filter((c) => c.trackId === null || c.trackId === team.trackId));
      if (scoresData.success) {
        const existing: Record<string, number> = {};
        for (const s of scoresData.data.scores ?? []) existing[s.criterionId] = s.value;
        setScores(existing);
        setNotes(scoresData.data.notes ?? '');
        setAlreadySubmitted(!!scoresData.data.submitted);
      }
      setLoading(false);
    });
  }, [slug, token, team]);

  const allScored = criteria.length > 0 && criteria.every((c) => scores[c.id] !== undefined);

  async function saveDraft() {
    setSaving(true); setErr('');
    const entries = Object.entries(scores).map(([criterionId, value]) => ({ criterionId, value }));
    const data = await apiFetch(`/events/${slug}/scores`, token, { method: 'PUT', body: JSON.stringify({ teamId: team.id, scores: entries }) });
    setSaving(false);
    if (data.success) { setSavedFeedback(true); setTimeout(() => setSavedFeedback(false), 1500); }
    else setErr(data.error?.message ?? 'Failed to save');
  }

  async function submit() {
    if (!allScored) { setErr('Score all criteria before submitting.'); return; }
    setSubmitting(true); setErr('');
    const entries = criteria.map((c) => ({ criterionId: c.id, value: scores[c.id]! }));
    const saveData = await apiFetch(`/events/${slug}/scores`, token, { method: 'PUT', body: JSON.stringify({ teamId: team.id, scores: entries }) });
    if (!saveData.success) { setSubmitting(false); setErr(saveData.error?.message ?? 'Failed to save scores'); return; }
    const submitData = await apiFetch(`/events/${slug}/scores/submit`, token, { method: 'POST', body: JSON.stringify({ teamId: team.id, notes: notes.trim() || undefined }) });
    setSubmitting(false);
    if (submitData.success) {
      const meData = await apiFetch(`/events/${slug}/judges/me`, token);
      onSubmitted(meData.success ? meData.data.progress : { completed: 0, totalAssigned: 0 });
    } else {
      setErr(submitData.error?.message ?? 'Failed to submit');
    }
  }

  if (loading) return <div className="flex h-screen items-center justify-center"><p className="text-sm text-fg-muted">Loading…</p></div>;

  return (
    <div className="pb-20">
      {/* Header */}
      <div className="sticky top-0 z-10 flex items-center gap-3 border-b border-bg-border bg-bg-base px-4 pt-12 pb-4">
        <button type="button" onClick={onBack} className="flex h-8 w-8 items-center justify-center rounded-lg border border-bg-border bg-bg-subtle text-fg-muted hover:bg-bg-muted">
          <ArrowLeft size={16} />
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-base font-semibold text-fg-default">{team.name}</h1>
          <p className="text-xs text-fg-subtle">{eventConfig?.event?.name}</p>
        </div>
        {alreadySubmitted && (
          <span className="flex-shrink-0 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-0.5 text-xs font-medium text-amber-400">
            Editing
          </span>
        )}
      </div>

      <div className="px-5 pt-5">
        {/* Edit mode notice */}
        {alreadySubmitted && (
          <div className="mb-5 flex items-start gap-2.5 rounded-lg border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-xs text-amber-400">
            <Pencil size={13} className="mt-0.5 flex-shrink-0" />
            <span>You&apos;ve already submitted scores for this team. Changes will update your submission.</span>
          </div>
        )}

        {/* Team info chips */}
        <div className="mb-5 flex flex-wrap items-center gap-2">
          {team.track && <span className="rounded-full border border-bg-border bg-bg-muted px-3 py-1 text-xs text-fg-muted">{team.track}</span>}
          {team.tableNumber && <span className="rounded-full border border-bg-border bg-bg-muted px-3 py-1 text-xs text-fg-muted">Table {team.tableNumber}</span>}
          {team.members?.length > 0 && <span className="w-full text-xs text-fg-subtle">{team.members.join(' · ')}</span>}
        </div>

        {/* Criteria */}
        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-fg-subtle">Scoring Criteria</p>
        <div className="flex flex-col gap-3">
          {criteria.map((crit) => (
            <div key={crit.id} className="rounded-xl border border-bg-border bg-bg-subtle p-4">
              <div className="mb-1 flex items-start justify-between gap-2">
                <span className="text-[15px] font-semibold text-fg-default">{crit.name}</span>
                <span className="flex-shrink-0 rounded-full border border-bg-border bg-bg-muted px-2 py-0.5 text-xs text-fg-subtle">
                  {(crit.weight * 100).toFixed(0)}%
                </span>
              </div>
              {crit.description && <p className="mb-3 text-xs leading-relaxed text-fg-muted">{crit.description}</p>}
              {!crit.description && <div className="mb-3" />}

              {crit.scoringType === 'rubric' && crit.rubric ? (
                <div className="flex flex-col gap-2">
                  {crit.rubric.map((level) => {
                    const sel = scores[crit.id] === level.score;
                    return (
                      <button type="button" key={level.score} onClick={() => setScores((s) => ({ ...s, [crit.id]: level.score }))}
                        className={`rounded-lg border p-3 text-left transition-all ${sel ? 'border-semantic-success bg-semantic-success/5' : 'border-bg-border bg-bg-muted hover:border-fg-muted/30'}`}>
                        <div className="mb-1 flex items-center gap-2.5">
                          <span className={`w-7 font-mono text-base font-bold ${sel ? 'text-semantic-success' : 'text-fg-subtle'}`}>{level.score}</span>
                          <span className={`text-sm font-semibold ${sel ? 'text-fg-default' : 'text-fg-muted'}`}>{level.label}</span>
                          {sel && <Check size={13} className="ml-auto text-semantic-success" />}
                        </div>
                        {level.description && <p className={`pl-9 text-xs leading-relaxed ${sel ? 'text-fg-muted' : 'text-fg-subtle'}`}>{level.description}</p>}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {Array.from({ length: crit.maxScore }, (_, i) => i + 1).map((n) => {
                    const sel = scores[crit.id] === n;
                    return (
                      <button type="button" key={n} onClick={() => setScores((s) => ({ ...s, [crit.id]: n }))}
                        className={`flex h-11 w-11 items-center justify-center rounded-lg border text-sm font-semibold transition-all ${sel ? 'border-fg-default bg-fg-default text-bg-base' : 'border-bg-border bg-bg-muted text-fg-muted hover:border-fg-muted'}`}>
                        {n}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Remarks */}
        <div className="mt-5 rounded-xl border border-bg-border bg-bg-subtle p-4">
          <div className="mb-2 flex items-center gap-2">
            <MessageSquare size={14} className="text-fg-subtle" />
            <span className="text-sm font-semibold text-fg-default">Remarks</span>
            <span className="ml-auto text-xs text-fg-subtle">Optional</span>
          </div>
          <textarea
            className="input w-full resize-none text-sm leading-relaxed"
            rows={4}
            placeholder="Notes about this team's project, presentation, or areas for improvement…"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        {err && <p className="mt-3 rounded-md bg-semantic-error/10 px-3 py-2 text-sm text-semantic-error">{err}</p>}

        {/* Actions */}
        <div className="mt-5 flex flex-col gap-2.5">
          <button type="button" onClick={saveDraft} disabled={saving} className="btn-secondary w-full">
            {savedFeedback ? <><Check size={14} className="text-semantic-success" /> Saved!</> : saving ? 'Saving…' : 'Save Draft'}
          </button>
          <button type="button" onClick={submit} disabled={!allScored || submitting}
            className={`w-full py-4 text-sm font-semibold transition-all active:scale-[0.99] ${allScored ? 'btn-primary' : 'cursor-not-allowed rounded-xl bg-bg-muted text-fg-subtle'}`}>
            {submitting
              ? 'Submitting…'
              : alreadySubmitted
              ? <><span>Update Scores</span> <ArrowRight size={15} className="inline" /></>
              : <><span>Submit Scores</span> <ArrowRight size={15} className="inline" /></>}
          </button>
          {!allScored && <p className="text-center text-xs text-fg-subtle">Score all {criteria.length} criteria to submit</p>}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════ SUCCESS ════ */
function SuccessScreen({ team, eventConfig, progress, onContinue }: { team: Team; eventConfig: EventConfig | null; progress: { completed: number; totalAssigned: number }; onContinue: () => void }) {
  const allDone = progress.completed >= progress.totalAssigned && progress.totalAssigned > 0;
  const pct = progress.totalAssigned > 0 ? Math.round((progress.completed / progress.totalAssigned) * 100) : 0;
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-8 py-10 text-center">
      <div className={`mb-5 inline-flex h-16 w-16 items-center justify-center rounded-2xl border ${allDone ? 'border-semantic-success/30 bg-semantic-success/10' : 'border-bg-border bg-bg-subtle'}`}>
        {allDone ? <Trophy size={30} className="text-semantic-success" /> : <Check size={30} className="text-semantic-success" />}
      </div>
      <h1 className="text-2xl font-semibold text-fg-default">{allDone ? 'All Done!' : 'Submitted!'}</h1>
      <p className="mt-1.5 text-base font-medium text-fg-muted">{team.name}</p>
      <p className="mt-1 text-sm text-fg-subtle">
        {allDone ? 'You have scored all assigned teams.' : `${progress.completed} of ${progress.totalAssigned} teams complete`}
      </p>
      <div className="my-6 w-full max-w-[240px]">
        <div className="mb-1.5 flex justify-between text-xs text-fg-subtle">
          <span>Overall progress</span><span className="font-mono text-fg-default">{pct}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-bg-muted">
          <div className={`h-full rounded-full transition-all ${allDone ? 'bg-semantic-success' : 'bg-fg-default'}`} style={{ width: `${pct}%` }} />
        </div>
      </div>
      <button type="button" onClick={onContinue} className={`min-w-[200px] py-3.5 text-sm font-semibold active:scale-[0.99] ${allDone ? 'btn-primary bg-semantic-success hover:opacity-90' : 'btn-primary'}`}>
        {allDone ? 'View All Teams' : <>Score Next Team <ArrowRight size={15} className="inline" /></>}
      </button>
      <button type="button" onClick={onContinue} className="mt-3 text-sm text-fg-subtle hover:text-fg-muted">
        Back to team list
      </button>
    </div>
  );
}
