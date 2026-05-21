'use client';

import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, ArrowRight, Plus, Trash2, CheckCircle, LayoutDashboard,
  Copy, ExternalLink, Loader2, AlertTriangle, Upload, Zap, Users, Tag, ListChecks, ClipboardList
} from 'lucide-react';
import Link from 'next/link';

const API = '/api';

/* ─── Types ─── */
interface Track { id: string; name: string; description: string; }
interface Criterion { id: string; name: string; description: string; max_score: number; weight: number; track_id: string | null; scoring_type: 'numeric' | 'rubric'; rubric: { score: number; label: string; description: string }[]; }
interface Team { id: string; name: string; track_id: string | null; leader: string; table_number: string; project_title: string; project_desc: string; }
interface Judge { id: string; name: string; email: string; tracks: string[]; }
interface EventData {
  event: { name: string; slug: string; description: string; timezone: string; };
  tracks: Track[];
  criteria: Criterion[];
  teams: Team[];
  judges: Judge[];
  assignment: { mode: 'free' | 'assigned' | 'hybrid'; assigned_teams: { judge_id: string; team_ids: string[] }[]; min_judges_per_team: number; allow_self_scoring: boolean; };
  moderation: { enabled: boolean; outlier_threshold: number; allow_organizer_override: boolean; require_panel_discussion: boolean; lock_results_after: string; };
  results: { tiebreaker: 'higher_avg' | 'more_judges' | 'manual'; show_scores_to_judges: boolean; };
}

interface CreatedEventData { slug: string; eventName: string; judges: any[]; teamCount: number; trackCount: number; }

const STEPS = ['Event Info', 'Tracks', 'Criteria', 'Teams', 'Judges', 'Settings', 'Review'];

const TIMEZONES = [
  'Asia/Kolkata', 'Asia/Mumbai',
  'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles',
  'America/Sao_Paulo', 'Europe/London', 'Europe/Paris', 'Europe/Berlin',
  'Europe/Moscow', 'Africa/Lagos', 'Africa/Nairobi',
  'Asia/Dubai', 'Asia/Karachi', 'Asia/Dhaka', 'Asia/Colombo',
  'Asia/Singapore', 'Asia/Bangkok', 'Asia/Shanghai', 'Asia/Seoul', 'Asia/Tokyo',
  'Australia/Sydney', 'Pacific/Auckland', 'UTC',
];

const CRITERIA_PRESETS = [
  { label: 'Standard Hackathon', criteria: [
    { name: 'Innovation', description: 'Originality and creativity of the idea', max_score: 10, scoring_type: 'numeric' as const },
    { name: 'Technical Execution', description: 'Quality of implementation and technical depth', max_score: 10, scoring_type: 'numeric' as const },
    { name: 'Presentation', description: 'Clarity of demo and communication', max_score: 10, scoring_type: 'numeric' as const },
    { name: 'Impact', description: 'Real-world potential and feasibility', max_score: 10, scoring_type: 'numeric' as const },
  ]},
  { label: 'Design Focused', criteria: [
    { name: 'UX Design', description: 'User experience and interface design quality', max_score: 10, scoring_type: 'numeric' as const },
    { name: 'Innovation', description: 'Creative approach to the problem', max_score: 10, scoring_type: 'numeric' as const },
    { name: 'Feasibility', description: 'Technical feasibility and implementation', max_score: 10, scoring_type: 'numeric' as const },
  ]},
  { label: 'Business / Social Impact', criteria: [
    { name: 'Problem Statement', description: 'Clarity and importance of the problem being solved', max_score: 10, scoring_type: 'numeric' as const },
    { name: 'Solution Viability', description: 'How realistic and scalable the solution is', max_score: 10, scoring_type: 'numeric' as const },
    { name: 'Market Potential', description: 'Size of opportunity and growth potential', max_score: 10, scoring_type: 'numeric' as const },
    { name: 'Team', description: 'Team composition and capability', max_score: 10, scoring_type: 'numeric' as const },
  ]},
];

const emptyEvent = (): EventData => ({
  event: { name: '', slug: '', description: '', timezone: 'America/New_York' },
  tracks: [{ id: 'general', name: 'General', description: '' }] as Track[],
  criteria: [],
  teams: [],
  judges: [],
  assignment: { mode: 'free', assigned_teams: [], min_judges_per_team: 1, allow_self_scoring: false },
  moderation: { enabled: false, outlier_threshold: 1.5, allow_organizer_override: false, require_panel_discussion: false, lock_results_after: '' },
  results: { tiebreaker: 'higher_avg', show_scores_to_judges: false },
});

/* ─── Helpers ─── */
function slugify(s: string) { return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40); }
function uid(prefix: string) { return `${prefix}_${Math.random().toString(36).slice(2, 7)}`; }
function toYaml(data: EventData): string {
  const clean = (s: string) => s.replace(/"/g, '\\"');
  const q = (s: string) => `"${clean(s)}"`;
  const rubric = (r: Criterion['rubric'][number]) => `      - score: ${r.score}\n        label: ${q(r.label)}\n        description: ${q(r.description)}`;
  return `version: "1"
event:
  name: ${q(data.event.name)}
  slug: ${data.event.slug}
  description: ${q(data.event.description)}
  timezone: ${data.event.timezone}
tracks:
${data.tracks.map(t => `  - id: ${t.id}\n    name: ${q(t.name)}\n    description: ${q(t.description)}`).join('\n')}
criteria:
${data.criteria.map(c => `  - id: ${c.id}\n    name: ${q(c.name)}\n    description: ${q(c.description)}\n    max_score: ${c.max_score}\n    weight: ${c.weight}\n    track_id: ${c.track_id ? c.track_id : 'null'}\n    scoring_type: ${c.scoring_type}${c.scoring_type === 'rubric' ? '\n    rubric:\n' + c.rubric.map(rubric).join('\n') : ''}`).join('\n')}
teams:
${data.teams.map(t => `  - id: ${t.id}\n    name: ${q(t.name)}\n    track_id: ${t.track_id ?? 'null'}\n    members:\n      - ${q(t.leader || t.name)}${t.table_number ? '\n    table_number: ' + q(t.table_number) : ''}`).join('\n')}
judges:
${data.judges.map(j => `  - id: ${j.id}\n    name: ${q(j.name)}\n    email: ${j.email}\n    tracks: [${j.tracks.map(q).join(', ')}]`).join('\n')}
assignment:
  mode: ${data.assignment.mode}
  assigned_teams:
${data.assignment.assigned_teams.length > 0 ? data.assignment.assigned_teams.map(a => `    - judge_id: ${a.judge_id}\n      team_ids: [${a.team_ids.join(', ')}]`).join('\n') : '    []'}
  min_judges_per_team: ${data.assignment.min_judges_per_team}
  allow_self_scoring: ${data.assignment.allow_self_scoring}
moderation:
  enabled: ${data.moderation.enabled}
  outlier_threshold: ${data.moderation.outlier_threshold}
  allow_organizer_override: ${data.moderation.allow_organizer_override}
  require_panel_discussion: ${data.moderation.require_panel_discussion}
  lock_results_after: ${data.moderation.lock_results_after ? q(data.moderation.lock_results_after) : 'null'}
results:
  tiebreaker: ${data.results.tiebreaker}
  show_scores_to_judges: ${data.results.show_scores_to_judges}
  export:
    pdf_certificates: true
    csv: true
    webhook_url: null
    webhook_secret: null`;
}

export default function NewEventPage() {
  const [step, setStep] = useState(0);
  const [data, setData] = useState<EventData>(emptyEvent);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [created, setCreated] = useState<CreatedEventData | null>(null);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem('token')) {
      window.location.href = '/login?next=/events/new';
    } else {
      setAuthed(true);
    }
  }, []);

  /* ─── Validation ─── */
  const canNext = useMemo(() => {
    switch (step) {
      case 0: return !!(data.event.name.trim() && data.event.slug.trim());
      case 1: return data.tracks.length > 0 && data.tracks.every(t => t.name.trim());
      case 2: return data.criteria.length > 0 && data.criteria.every(c => c.name.trim() && c.max_score > 0 && (c.scoring_type !== 'rubric' || c.rubric.length > 0));
      case 3: return data.teams.length > 0 && data.teams.every(t => t.name.trim());
      case 4: return data.judges.length > 0 && data.judges.every(j => j.name.trim() && j.email.includes('@'));
      case 5: return true;
      case 6: return true;
      default: return false;
    }
  }, [step, data]);

  if (!authed) return null;

  /* ─── Weight auto-normalize ─── */
  const normalizeWeights = (criteria: Criterion[]) => {
    const byTrack = new Map<string | null, Criterion[]>();
    for (const c of criteria) {
      const key = c.track_id;
      const arr = byTrack.get(key) ?? [];
      arr.push(c);
      byTrack.set(key, arr);
    }
    const out = [...criteria];
    byTrack.forEach((crits) => {
      const n = crits.length;
      for (const c of crits) { const idx = out.findIndex(x => x.id === c.id); if (idx >= 0) out[idx] = { ...out[idx], weight: Number((1 / n).toFixed(3)) }; }
    });
    return out;
  };

  /* ─── Submit ─── */
  async function handleCreate() {
    setError(''); setLoading(true);
    const yaml = toYaml(data);
    const orgToken = localStorage.getItem('token') || '';
    try {
      const res = await fetch(`${API}/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${orgToken}` },
        body: JSON.stringify({ configYaml: yaml }),
      });
      const resp = await res.json();
      if (!resp.success) { setError(resp.error?.message || 'Failed to create event'); setLoading(false); return; }
      const slug = resp.data.slug;
      let judgesList: any[] = [];
      try {
        const judgesRes = await fetch(`${API}/events/${slug}/judges`, { headers: { Authorization: `Bearer ${orgToken}` } });
        const jd = await judgesRes.json();
        if (jd.success && Array.isArray(jd.data)) judgesList = jd.data;
      } catch {
        // Judges list failed but event was created; show success page anyway
      }
      setCreated({ slug, eventName: data.event.name, judges: judgesList, teamCount: data.teams.length, trackCount: data.tracks.length });
    } catch { setError('Network error'); }
    finally { setLoading(false); }
  }

  async function copyPortalUrl() {
    const url = `${window.location.origin}/events/${created!.slug}/judge`;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedUrl(true);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = url;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopiedUrl(true);
    }
    setTimeout(() => setCopiedUrl(false), 2000);
  }

  /* ─── Success ─── */
  if (created) {
    const appBase = process.env.NEXT_PUBLIC_APP_URL || window.location.origin;
    const portalUrl = `${appBase}/events/${created.slug}/judge`;
    return (
      <main className="page-shell px-6 py-10">
        <div className="container-tight">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
            <div className="mb-6 flex flex-col items-start gap-4 rounded-xl border border-bg-border bg-bg-subtle p-6 sm:flex-row sm:items-center">
              <CheckCircle size={32} className="text-fg-default" strokeWidth={1.5} />
              <div className="flex-1">
                <h1 className="text-2xl font-semibold text-fg-default">{created.eventName}</h1>
                <p className="mt-1 font-mono text-2xs text-fg-subtle">{created.slug} · {created.judges.length} judges · {created.teamCount} teams · {created.trackCount} tracks</p>
              </div>
              <Link href={`/events/${created.slug}`} className="btn-primary whitespace-nowrap"><LayoutDashboard size={16} /> Dashboard</Link>
            </div>
            <div className="rounded-xl border border-bg-border bg-bg-subtle p-6">
              <div className="mb-6">
                <h2 className="text-lg font-semibold text-fg-default">Judge Portal</h2>
                <p className="mt-1 text-sm text-fg-muted">Share this URL with judges. Each judge signs in with their email + PIN set from the dashboard.</p>
              </div>
              <div className="mb-6 flex items-center gap-3 rounded-lg border border-bg-border bg-bg-muted p-4">
                <code className="flex-1 truncate font-mono text-sm text-fg-muted">{portalUrl}</code>
                <button type="button" onClick={copyPortalUrl} className="btn-ghost text-fg-muted">{copiedUrl ? <CheckCircle size={14} /> : <Copy size={14} />}</button>
                <a href={portalUrl} target="_blank" rel="noopener noreferrer" className="btn-ghost text-fg-muted"><ExternalLink size={14} /></a>
              </div>
              <div className="mb-5 flex items-start gap-3 rounded-lg border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-xs text-amber-400">
                <AlertTriangle size={14} className="mt-0.5 flex-shrink-0" />
                <span>Set a PIN for each judge from the <Link href={`/events/${created.slug}`} className="underline">Dashboard → Judges</Link> before the event starts. Judges sign in with their email and PIN.</span>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {created.judges.map((judge: any) => {
                  const judgeUrl = `${portalUrl}?email=${encodeURIComponent(judge.email)}`;
                  const qr = `https://api.qrserver.com/v1/create-qr-code/?size=160x160&color=ededed&bgcolor=111111&data=${encodeURIComponent(judgeUrl)}`;
                  return (
                    <div key={judge.email} className="flex flex-col items-center gap-3 rounded-xl border border-bg-border bg-bg-muted p-5">
                      <div className="overflow-hidden rounded-lg border border-bg-border"><img src={qr} alt="QR" width={160} height={160} className="block" /></div>
                      <div className="text-center"><p className="text-sm font-medium text-fg-default">{judge.name}</p><p className="mt-0.5 text-2xs text-fg-subtle">{judge.tracks?.join(' · ')}</p><p className="mt-1 text-2xs text-fg-subtle">{judge.email}</p></div>
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        </div>
      </main>
    );
  }

  /* ─── Form Wizard ─── */
  return (
    <main className="page-shell flex min-h-screen flex-col px-6 py-8">
      <div className="container-tight mx-auto w-full max-w-3xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-fg-default">Create Hackathon</h1>
          <p className="mt-1 text-sm text-fg-muted">Step {step + 1} of {STEPS.length}: {STEPS[step]}</p>
          {/* Progress */}
          <div className="mt-4 flex gap-1">
            {STEPS.map((s, i) => (
              <button key={s} onClick={() => i < step && setStep(i)} disabled={i > step} className={`h-1.5 flex-1 rounded-full transition-colors ${i <= step ? 'bg-fg-default' : 'bg-bg-border'}`} />
            ))}
          </div>
        </div>

        {error && (
          <div className="mb-4 flex items-center gap-2 rounded-lg border border-semantic-error/20 bg-semantic-error/10 px-4 py-3 text-sm text-semantic-error">
            <AlertTriangle size={16} /> {error}
          </div>
        )}

        <AnimatePresence mode="wait">
          <motion.div key={step} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.25 }}>

            {/* ─── Step 0: Event Info ─── */}
            {step === 0 && (
              <div className="space-y-5">
                <div>
                  <label className="mb-1 block text-sm text-fg-muted">Event Name</label>
                  <input className="input w-full" value={data.event.name} onChange={e => setData(d => ({ ...d, event: { ...d.event, name: e.target.value, slug: slugify(e.target.value) } }))} placeholder="e.g. AI Hackathon 2026" />
                </div>
                <div>
                  <label className="mb-1 block text-sm text-fg-muted">Slug (auto-generated)</label>
                  <input className="input w-full font-mono text-sm" value={data.event.slug} onChange={e => setData(d => ({ ...d, event: { ...d.event, slug: slugify(e.target.value) } }))} />
                </div>
                <div>
                  <label className="mb-1 block text-sm text-fg-muted">Description</label>
                  <textarea className="input w-full resize-none" rows={3} value={data.event.description} onChange={e => setData(d => ({ ...d, event: { ...d.event, description: e.target.value } }))} placeholder="Short description for judges" />
                </div>
              </div>
            )}

            {/* ─── Step 1: Tracks ─── */}
            {step === 1 && (
              <div className="space-y-4">
                <p className="text-sm text-fg-muted">Add tracks or categories for your hackathon. Every event needs at least one.</p>
                <BulkImportTracks onImport={tracks => setData(d => ({ ...d, tracks: [...d.tracks, ...tracks] }))} />
                {data.tracks.map((t, i) => (
                  <div key={`track-${i}`} className="card p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <span className="text-xs font-mono text-fg-subtle">{t.id}</span>
                      {data.tracks.length > 1 && <button type="button" onClick={() => setData(d => ({ ...d, tracks: d.tracks.filter(x => x.id !== t.id) }))} className="text-fg-muted hover:text-semantic-error"><Trash2 size={16} /></button>}
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <input className="input" placeholder="Track name" value={t.name} onChange={e => { const v = e.target.value; setData(d => ({ ...d, tracks: d.tracks.map((x, idx) => idx === i ? { ...x, name: v, id: x.id.startsWith('track_') ? slugify(v).replace(/-/g, '_') || x.id : x.id } : x) })); }} />
                      <input className="input" placeholder="Description" value={t.description} onChange={e => setData(d => ({ ...d, tracks: d.tracks.map((x, idx) => idx === i ? { ...x, description: e.target.value } : x) }))} />
                    </div>
                  </div>
                ))}
                <button type="button" onClick={() => setData(d => ({ ...d, tracks: [...d.tracks, { id: uid('track'), name: '', description: '' }] }))} className="btn-secondary w-full justify-center"><Plus size={16} /> Add Track</button>
              </div>
            )}

            {/* ─── Step 2: Criteria ─── */}
            {step === 2 && (
              <div className="space-y-4">
                <p className="text-sm text-fg-muted">Define how teams are scored. Weights auto-normalize per track.</p>
                {data.criteria.length === 0 && (
                  <div className="card p-5">
                    <div className="mb-3 flex items-center gap-2">
                      <Zap size={16} className="text-fg-subtle" />
                      <h3 className="text-sm font-medium text-fg-default">Quick Presets</h3>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {CRITERIA_PRESETS.map(preset => (
                        <button type="button" key={preset.label} onClick={() => {
                          const nc = preset.criteria.map(c => ({ id: uid('crit'), description: c.description, max_score: c.max_score, weight: 0, track_id: null, scoring_type: c.scoring_type, rubric: [], name: c.name }));
                          setData(d => ({ ...d, criteria: normalizeWeights(nc) }));
                        }} className="btn-secondary text-xs">{preset.label}</button>
                      ))}
                    </div>
                  </div>
                )}
                {data.criteria.map((c, i) => (
                  <div key={c.id} className="card p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <span className="text-xs text-fg-subtle">Criterion {i + 1} · Weight <span className="font-mono text-fg-default">{c.weight}</span></span>
                      <button type="button" onClick={() => { const nc = data.criteria.filter(x => x.id !== c.id); setData(d => ({ ...d, criteria: normalizeWeights(nc) })); }} className="text-fg-muted hover:text-semantic-error"><Trash2 size={16} /></button>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <input className="input" placeholder="Criterion name (e.g. Innovation)" value={c.name} onChange={e => setData(d => ({ ...d, criteria: d.criteria.map((x, idx) => idx === i ? { ...x, name: e.target.value } : x) }))} />
                      <select className="input" value={c.track_id ?? ''} onChange={e => { const v = e.target.value || null; setData(d => ({ ...d, criteria: normalizeWeights(d.criteria.map((x, idx) => idx === i ? { ...x, track_id: v } : x)) })); }}>
                        <option value="">All tracks</option>
                        {data.tracks.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                      </select>
                    </div>
                    <div className="mt-3 grid gap-3 sm:grid-cols-3">
                      <input type="number" className="input" placeholder="Max score" value={c.max_score || ''} onChange={e => setData(d => ({ ...d, criteria: d.criteria.map((x, idx) => idx === i ? { ...x, max_score: Number(e.target.value) || 0 } : x) }))} />
                      <select className="input" value={c.scoring_type} onChange={e => setData(d => ({ ...d, criteria: d.criteria.map((x, idx) => idx === i ? { ...x, scoring_type: e.target.value as 'numeric' | 'rubric', rubric: e.target.value === 'rubric' && x.rubric.length === 0 ? [{ score: 1, label: 'Poor', description: '' }, { score: 2, label: 'Fair', description: '' }, { score: 3, label: 'Good', description: '' }, { score: 4, label: 'Excellent', description: '' }] : x.rubric } : x) }))}>
                        <option value="numeric">Numeric</option>
                        <option value="rubric">Rubric</option>
                      </select>
                    </div>
                    {c.scoring_type === 'rubric' && (
                      <div className="mt-3 space-y-2">
                        <p className="text-xs text-fg-muted">Rubric levels</p>
                        {c.rubric.map((r, ri) => (
                          <div key={ri} className="flex gap-2">
                            <input type="number" className="input w-20" value={r.score} onChange={e => setData(d => ({ ...d, criteria: d.criteria.map((x, xi) => xi === i ? { ...x, rubric: x.rubric.map((y, yi) => yi === ri ? { ...y, score: Number(e.target.value) || 0 } : y) } : x) }))} />
                            <input className="input flex-1" placeholder="Label (e.g. Excellent)" value={r.label} onChange={e => setData(d => ({ ...d, criteria: d.criteria.map((x, xi) => xi === i ? { ...x, rubric: x.rubric.map((y, yi) => yi === ri ? { ...y, label: e.target.value } : y) } : x) }))} />
                            <button type="button" onClick={() => setData(d => ({ ...d, criteria: d.criteria.map((x, xi) => xi === i ? { ...x, rubric: x.rubric.filter((_, yi) => yi !== ri) } : x) }))} className="text-fg-muted hover:text-semantic-error"><Trash2 size={16} /></button>
                          </div>
                        ))}
                        <button type="button" onClick={() => setData(d => ({ ...d, criteria: d.criteria.map((x, xi) => xi === i ? { ...x, rubric: [...x.rubric, { score: x.rubric.length + 1, label: '', description: '' }] } : x) }))} className="btn-ghost text-xs"><Plus size={12} /> Add level</button>
                      </div>
                    )}
                  </div>
                ))}
                <button type="button" onClick={() => { const nc = [...data.criteria, { id: uid('crit'), name: '', description: '', max_score: 10, weight: 0, track_id: null, scoring_type: 'numeric' as const, rubric: [] }]; setData(d => ({ ...d, criteria: normalizeWeights(nc) })); }} className="btn-secondary w-full justify-center"><Plus size={16} /> Add Criterion</button>
              </div>
            )}

            {/* ─── Step 3: Teams ─── */}
            {step === 3 && (
              <div className="space-y-4">
                <p className="text-sm text-fg-muted">Add all participating teams. Members can be comma-separated.</p>
                <BulkImportTeams tracks={data.tracks} onImport={teams => setData(d => ({ ...d, teams: [...d.teams, ...teams] }))} />
                {data.teams.map((t, i) => (
                  <div key={t.id} className="card p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <span className="text-xs text-fg-subtle">Team {i + 1}</span>
                      <button type="button" onClick={() => setData(d => ({ ...d, teams: d.teams.filter(x => x.id !== t.id) }))} className="text-fg-muted hover:text-semantic-error"><Trash2 size={16} /></button>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <input className="input" placeholder="Team name" value={t.name} onChange={e => setData(d => ({ ...d, teams: d.teams.map((x, idx) => idx === i ? { ...x, name: e.target.value } : x) }))} />
                      <select className="input" value={t.track_id ?? ''} onChange={e => setData(d => ({ ...d, teams: d.teams.map((x, idx) => idx === i ? { ...x, track_id: e.target.value || null } : x) }))}>
                        <option value="">All tracks</option>
                        {data.tracks.map(tr => <option key={tr.id} value={tr.id}>{tr.name}</option>)}
                      </select>
                    </div>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      <input className="input" placeholder="Team leader name" value={t.leader} onChange={e => setData(d => ({ ...d, teams: d.teams.map((x, idx) => idx === i ? { ...x, leader: e.target.value } : x) }))} />
                      <input className="input" placeholder="Table number (optional)" value={t.table_number} onChange={e => setData(d => ({ ...d, teams: d.teams.map((x, idx) => idx === i ? { ...x, table_number: e.target.value } : x) }))} />
                    </div>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      <input className="input" placeholder="Project title (optional)" value={t.project_title} onChange={e => setData(d => ({ ...d, teams: d.teams.map((x, idx) => idx === i ? { ...x, project_title: e.target.value } : x) }))} />
                      <input className="input" placeholder="Short project description (optional)" value={t.project_desc} onChange={e => setData(d => ({ ...d, teams: d.teams.map((x, idx) => idx === i ? { ...x, project_desc: e.target.value } : x) }))} />
                    </div>
                  </div>
                ))}
                <button type="button" onClick={() => setData(d => ({ ...d, teams: [...d.teams, { id: uid('team'), name: '', track_id: data.tracks[0]?.id ?? null, leader: '', table_number: '', project_title: '', project_desc: '' }] }))} className="btn-secondary w-full justify-center"><Plus size={16} /> Add Team</button>
              </div>
            )}

            {/* ─── Step 4: Judges ─── */}
            {step === 4 && (
              <div className="space-y-4">
                <p className="text-sm text-fg-muted">Add judges and assign them to tracks. Use "All tracks" for general judges.</p>
                <BulkImportJudges tracks={data.tracks} onImport={judges => setData(d => ({ ...d, judges: [...d.judges, ...judges] }))} />
                {data.judges.map((j, i) => (
                  <div key={j.id} className="card p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <span className="text-xs text-fg-subtle">Judge {i + 1}</span>
                      <button type="button" onClick={() => setData(d => ({ ...d, judges: d.judges.filter(x => x.id !== j.id) }))} className="text-fg-muted hover:text-semantic-error"><Trash2 size={16} /></button>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <input className="input" placeholder="Judge name" value={j.name} onChange={e => setData(d => ({ ...d, judges: d.judges.map((x, idx) => idx === i ? { ...x, name: e.target.value } : x) }))} />
                      <input type="email" className="input" placeholder="Email" value={j.email} onChange={e => setData(d => ({ ...d, judges: d.judges.map((x, idx) => idx === i ? { ...x, email: e.target.value } : x) }))} />
                    </div>
                    <div className="mt-3">
                      <p className="mb-2 text-xs text-fg-muted">Assigned tracks</p>
                      <div className="flex flex-wrap gap-2">
                        {[{ id: 'all', name: 'All tracks' }, ...data.tracks].map(tr => {
                          const checked = j.tracks.includes(tr.id);
                          return (
                            <label key={tr.id} className={`cursor-pointer rounded-full border px-3 py-1 text-xs transition-colors ${checked ? 'border-fg-default bg-fg-default text-bg-base' : 'border-bg-border text-fg-muted'}`}>
                              <input type="checkbox" className="hidden" checked={checked} onChange={() => setData(d => ({ ...d, judges: d.judges.map((x, idx) => idx === i ? { ...x, tracks: checked ? x.tracks.filter(t => t !== tr.id) : [...x.tracks, tr.id] } : x) }))} />
                              {tr.name}
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                ))}
                <button type="button" onClick={() => setData(d => ({ ...d, judges: [...d.judges, { id: uid('judge'), name: '', email: '', tracks: ['all'] }] }))} className="btn-secondary w-full justify-center"><Plus size={16} /> Add Judge</button>
                {data.judges.length > 0 && (
                  <p className="text-center text-xs text-fg-subtle">{data.judges.length} judge{data.judges.length !== 1 ? 's' : ''} added · magic links sent after creation</p>
                )}
              </div>
            )}

            {/* ─── Step 5: Settings ─── */}
            {step === 5 && (
              <div className="space-y-6">
                <div className="card p-5">
                  <h3 className="text-sm font-medium text-fg-default">Assignment Mode</h3>
                  <p className="mt-1 text-xs text-fg-muted">How judges are paired with teams</p>
                  <div className="mt-3 space-y-2">
                    {[
                      { key: 'free', label: 'Free-for-all', desc: 'Any judge can score any team. Simplest setup.' },
                      { key: 'assigned', label: 'Assigned', desc: 'You manually assign specific teams to each judge.' },
                      { key: 'hybrid', label: 'Hybrid', desc: 'Some assigned, others free.' },
                    ].map(opt => (
                      <label key={opt.key} className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors ${data.assignment.mode === opt.key ? 'border-fg-default bg-bg-muted' : 'border-bg-border'}`}>
                        <input type="radio" name="mode" value={opt.key} checked={data.assignment.mode === opt.key} onChange={() => setData(d => ({ ...d, assignment: { ...d.assignment, mode: opt.key as any } }))} className="mt-0.5" />
                        <div><p className="text-sm font-medium text-fg-default">{opt.label}</p><p className="text-xs text-fg-muted">{opt.desc}</p></div>
                      </label>
                    ))}
                  </div>
                </div>
                {data.assignment.mode !== 'free' && (
                  <div className="card p-5">
                    <h3 className="text-sm font-medium text-fg-default">Assigned Teams</h3>
                    {data.judges.map(j => (
                      <div key={j.id} className="mt-3 border-t border-bg-border pt-3">
                        <p className="text-xs font-medium text-fg-default">{j.name || j.email}</p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {data.teams.map(t => {
                            const isAssigned = data.assignment.assigned_teams.find(a => a.judge_id === j.id)?.team_ids.includes(t.id) ?? false;
                            return (
                              <label key={t.id} className={`cursor-pointer rounded-full border px-2.5 py-1 text-xs transition-colors ${isAssigned ? 'border-fg-default bg-fg-default text-bg-base' : 'border-bg-border text-fg-muted'}`}>
                                <input type="checkbox" className="hidden" checked={isAssigned} onChange={() => setData(d => {
                                  const at = [...d.assignment.assigned_teams];
                                  const idx = at.findIndex(a => a.judge_id === j.id);
                                  if (idx >= 0) {
                                    const teamIds = at[idx].team_ids.includes(t.id) ? at[idx].team_ids.filter(id => id !== t.id) : [...at[idx].team_ids, t.id];
                                    at[idx] = { ...at[idx], team_ids: teamIds };
                                    if (teamIds.length === 0) at.splice(idx, 1);
                                  } else {
                                    at.push({ judge_id: j.id, team_ids: [t.id] });
                                  }
                                  return { ...d, assignment: { ...d.assignment, assigned_teams: at } };
                                })} />
                                {t.name}
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <div className="card p-5">
                  <h3 className="text-sm font-medium text-fg-default">Tie Handling</h3>
                  <p className="mt-1 text-xs text-fg-muted">If two teams are tied, judges can re-open their scores and bump up one team manually.</p>
                  <label className="mt-3 flex cursor-pointer items-start gap-3 rounded-lg border border-bg-border p-3 transition-colors hover:bg-bg-muted">
                    <input type="checkbox" className="mt-0.5" checked={data.results.tiebreaker === 'manual'} onChange={e => setData(d => ({ ...d, results: { ...d.results, tiebreaker: e.target.checked ? 'manual' : 'higher_avg' } }))} />
                    <div>
                      <p className="text-sm font-medium text-fg-default">Allow judges to re-score on tie</p>
                      <p className="text-xs text-fg-muted">When unchecked, ties are broken automatically by highest average score.</p>
                    </div>
                  </label>
                </div>
              </div>
            )}

            {/* ─── Step 6: Review ─── */}
            {step === 6 && (
              <div className="space-y-5">
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="card p-4 text-center"><p className="text-2xl font-semibold text-fg-default">{data.tracks.length}</p><p className="text-xs text-fg-muted">Tracks</p></div>
                  <div className="card p-4 text-center"><p className="text-2xl font-semibold text-fg-default">{data.teams.length}</p><p className="text-xs text-fg-muted">Teams</p></div>
                  <div className="card p-4 text-center"><p className="text-2xl font-semibold text-fg-default">{data.judges.length}</p><p className="text-xs text-fg-muted">Judges</p></div>
                </div>
                {/* Warnings */}
                {(() => {
                  const warnings: string[] = [];
                  if (data.teams.length === 0) warnings.push('No teams added — judges will have nothing to score.');
                  if (data.judges.length === 0) warnings.push('No judges added — no one can score.');
                  if (data.criteria.length === 0) warnings.push('No scoring criteria defined.');
                  if (data.tracks.length > 1 && data.teams.some(t => !t.track_id)) warnings.push('Some teams have no track assigned — they will be visible to all judges.');
                  if (data.assignment.mode !== 'free' && data.assignment.assigned_teams.length === 0) warnings.push('Assignment mode is not free but no judge-team assignments defined.');
                  if (warnings.length === 0) return null;
                  return (
                    <div className="space-y-2">
                      {warnings.map((w, i) => (
                        <div key={i} className="flex items-start gap-2 rounded-lg border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-xs text-amber-400">
                          <AlertTriangle size={14} className="mt-0.5 flex-shrink-0" /> {w}
                        </div>
                      ))}
                    </div>
                  );
                })()}
                <div className="card p-4">
                  <h3 className="mb-3 flex items-center gap-2 text-sm font-medium text-fg-default"><Tag size={14} className="text-fg-subtle" /> Event</h3>
                  <p className="text-sm font-medium text-fg-default">{data.event.name}</p>
                  <p className="mt-0.5 font-mono text-xs text-fg-subtle">{data.event.slug}</p>
                  {data.event.description && <p className="mt-2 text-xs text-fg-muted leading-relaxed">{data.event.description}</p>}
                  <div className="mt-3 flex flex-wrap gap-2">
                    {data.tracks.map(t => (
                      <span key={t.id} className="rounded-full border border-bg-border bg-bg-muted px-3 py-1 text-xs text-fg-muted">{t.name}</span>
                    ))}
                  </div>
                </div>
                <div className="card p-4">
                  <h3 className="mb-3 flex items-center gap-2 text-sm font-medium text-fg-default"><ListChecks size={14} className="text-fg-subtle" /> Scoring Criteria</h3>
                  <div className="space-y-2">
                    {data.criteria.map(c => (
                      <div key={c.id} className="flex items-center justify-between rounded-lg bg-bg-muted px-3 py-2">
                        <div>
                          <p className="text-xs font-medium text-fg-default">{c.name}</p>
                          {c.description && <p className="text-2xs text-fg-subtle">{c.description}</p>}
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-fg-muted">{c.scoring_type === 'rubric' ? 'Rubric' : `0–${c.max_score}`}</p>
                          <p className="text-2xs text-fg-subtle">{(c.weight * 100).toFixed(0)}% · {c.track_id ? data.tracks.find(t => t.id === c.track_id)?.name : 'All tracks'}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="card p-4">
                    <h3 className="mb-3 flex items-center gap-2 text-sm font-medium text-fg-default"><ClipboardList size={14} className="text-fg-subtle" /> Teams <span className="ml-auto text-xs text-fg-subtle">{data.teams.length}</span></h3>
                    <div className="space-y-1">
                      {data.teams.map(t => (
                        <div key={t.id} className="flex items-center justify-between text-xs">
                          <span className="text-fg-muted">{t.name}</span>
                          <span className="text-fg-subtle">{t.track_id ? data.tracks.find(tr => tr.id === t.track_id)?.name : 'All'}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="card p-4">
                    <h3 className="mb-3 flex items-center gap-2 text-sm font-medium text-fg-default"><Users size={14} className="text-fg-subtle" /> Judges <span className="ml-auto text-xs text-fg-subtle">{data.judges.length}</span></h3>
                    <div className="space-y-1">
                      {data.judges.map(j => (
                        <div key={j.id} className="flex items-center justify-between text-xs">
                          <span className="text-fg-muted">{j.name}</span>
                          <span className="text-fg-subtle truncate max-w-[120px]">{j.email}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

          </motion.div>
        </AnimatePresence>

        {/* Navigation */}
        <div className="mt-8 flex items-center justify-between">
          <button type="button" onClick={() => setStep(s => Math.max(0, s - 1))} disabled={step === 0} className="btn-ghost disabled:opacity-30"><ArrowLeft size={16} /> Back</button>
          {step < STEPS.length - 1 ? (
            <button type="button" onClick={() => setStep(s => s + 1)} disabled={!canNext} className="btn-primary disabled:opacity-30">Next <ArrowRight size={16} /></button>
          ) : (
            <button type="button" onClick={handleCreate} disabled={loading || !canNext} className="btn-primary disabled:opacity-30">
              {loading ? <><Loader2 size={16} className="animate-spin" /> Creating...</> : <><CheckCircle size={16} /> Create Event</>}
            </button>
          )}
        </div>
      </div>
    </main>
  );
}

/* ─── Bulk Import: Tracks ─── */
function BulkImportTracks({ onImport }: { onImport: (tracks: Track[]) => void }) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<'paste' | 'file'>('paste');
  const [csv, setCsv] = useState('');
  const [preview, setPreview] = useState<Track[]>([]);
  const [fileName, setFileName] = useState('');

  function parseText(text: string) {
    // Skip header row if first cell looks like a header
    const lines = text.trim().split('\n').filter(Boolean);
    const start = /^(track.?name|name|id)/i.test(lines[0]?.split(',')[0] ?? '') ? 1 : 0;
    const parsed: Track[] = lines.slice(start).map(line => {
      const cols = line.split(',').map(s => s.trim().replace(/^"|"$/g, ''));
      const [name = '', description = ''] = cols;
      const id = slugify(name).replace(/-/g, '_') || uid('track');
      return { id, name, description };
    }).filter(t => t.name);
    setPreview(parsed);
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = ev => { const text = ev.target?.result as string; setCsv(text); parseText(text); };
    reader.readAsText(file);
  }

  function reset() { setOpen(false); setCsv(''); setPreview([]); setFileName(''); }

  if (!open) return (
    <button type="button" onClick={() => setOpen(true)} className="btn-ghost w-full justify-center text-xs text-fg-subtle">
      <Upload size={14} /> Bulk import tracks
    </button>
  );

  return (
    <div className="card p-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-medium text-fg-default">Bulk Import Tracks</p>
        <button type="button" onClick={reset} className="text-xs text-fg-muted">Cancel</button>
      </div>
      <p className="mb-2 text-xs text-fg-subtle">Format: <code className="font-mono">Track Name, Description (optional)</code></p>
      {/* Tabs */}
      <div className="mb-3 flex gap-1 rounded-lg border border-bg-border bg-bg-muted p-0.5">
        {(['paste', 'file'] as const).map(t => (
          <button type="button" key={t} onClick={() => setTab(t)}
            className={`flex-1 rounded-md py-1 text-xs font-medium transition-colors ${tab === t ? 'bg-bg-base text-fg-default shadow-sm' : 'text-fg-subtle hover:text-fg-muted'}`}>
            {t === 'paste' ? 'Paste CSV' : 'Upload File'}
          </button>
        ))}
      </div>
      {tab === 'paste' ? (
        <textarea className="input mb-3 h-24 w-full resize-none font-mono text-xs"
          placeholder={"AI Track, Projects using machine learning\nWeb Track, Frontend & backend projects"}
          value={csv} onChange={e => { setCsv(e.target.value); parseText(e.target.value); }} />
      ) : (
        <label className="mb-3 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-bg-border bg-bg-subtle py-6 text-xs text-fg-muted transition-colors hover:border-fg-muted/30 hover:bg-bg-muted">
          <Upload size={18} className="text-fg-subtle" />
          {fileName ? <span className="font-mono text-fg-default">{fileName}</span> : <span>Click to choose a .csv file</span>}
          <input type="file" accept=".csv,text/csv" className="hidden" onChange={onFileChange} />
        </label>
      )}
      {preview.length > 0 && (
        <div className="mb-3">
          <p className="mb-1 text-xs text-fg-muted">{preview.length} track{preview.length !== 1 ? 's' : ''} detected:</p>
          <div className="flex flex-wrap gap-1">
            {preview.map(t => <span key={t.id} className="rounded-full bg-bg-muted px-2 py-0.5 text-xs text-fg-muted">{t.name}</span>)}
          </div>
        </div>
      )}
      <button type="button" disabled={preview.length === 0} onClick={() => { onImport(preview); reset(); }} className="btn-primary w-full justify-center text-sm disabled:opacity-40">
        Import {preview.length > 0 ? preview.length : ''} Tracks
      </button>
    </div>
  );
}

/* ─── Bulk Import: Teams ─── */
function BulkImportTeams({ tracks, onImport }: { tracks: Track[]; onImport: (teams: Team[]) => void }) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<'paste' | 'file'>('paste');
  const [csv, setCsv] = useState('');
  const [preview, setPreview] = useState<Team[]>([]);
  const [fileName, setFileName] = useState('');

  function findTrack(trackName: string) {
    if (!trackName) return tracks[0]?.id ?? null;
    const tn = trackName.toLowerCase();
    return (
      tracks.find(t => t.name.toLowerCase() === tn)?.id ??
      tracks.find(t => t.name.toLowerCase().includes(tn) || tn.includes(t.name.toLowerCase()))?.id ??
      tracks[0]?.id ?? null
    );
  }

  function parseText(text: string) {
    const lines = text.trim().split('\n').filter(Boolean);
    // Skip header if first column looks like a header word
    const start = /^(team.?name|name|team)/i.test(lines[0]?.split(',')[0] ?? '') ? 1 : 0;
    const parsed: Team[] = lines.slice(start).map(line => {
      const cols = line.split(',').map(s => s.trim().replace(/^"|"$/g, ''));
      // Flexible: Team Name, Leader, Track — any extra cols ignored
      const [name = '', leader = '', ...rest] = cols;
      // Track could be col 2 or col 3 (if col 2 looks like a number = table#)
      let trackName = '';
      let table_number = '';
      if (rest.length === 1) {
        // Could be track or table — check if it's a number
        if (/^\d+$/.test(rest[0])) { table_number = rest[0]; }
        else { trackName = rest[0]; }
      } else if (rest.length >= 2) {
        // col2 = table#, col3 = track (or vice versa)
        if (/^\d+$/.test(rest[0])) { table_number = rest[0]; trackName = rest[1] ?? ''; }
        else { trackName = rest[0]; table_number = rest[1] ?? ''; }
      }
      return { id: uid('team'), name, leader, table_number, track_id: findTrack(trackName), project_title: '', project_desc: '' };
    }).filter(t => t.name);
    setPreview(parsed);
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = ev => { const text = ev.target?.result as string; setCsv(text); parseText(text); };
    reader.readAsText(file);
  }

  function reset() { setOpen(false); setCsv(''); setPreview([]); setFileName(''); }

  if (!open) return (
    <button type="button" onClick={() => setOpen(true)} className="btn-ghost w-full justify-center text-xs text-fg-subtle">
      <Upload size={14} /> Bulk import teams
    </button>
  );

  return (
    <div className="card p-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-medium text-fg-default">Bulk Import Teams</p>
        <button type="button" onClick={reset} className="text-xs text-fg-muted">Cancel</button>
      </div>
      <p className="mb-2 text-xs text-fg-subtle">Format: <code className="font-mono">Team Name, Leader Name, Track</code> — extra columns (table #) handled automatically</p>
      {/* Tabs */}
      <div className="mb-3 flex gap-1 rounded-lg border border-bg-border bg-bg-muted p-0.5">
        {(['paste', 'file'] as const).map(t => (
          <button type="button" key={t} onClick={() => setTab(t)}
            className={`flex-1 rounded-md py-1 text-xs font-medium transition-colors ${tab === t ? 'bg-bg-base text-fg-default shadow-sm' : 'text-fg-subtle hover:text-fg-muted'}`}>
            {t === 'paste' ? 'Paste CSV' : 'Upload File'}
          </button>
        ))}
      </div>
      {tab === 'paste' ? (
        <textarea className="input mb-3 h-32 w-full resize-none font-mono text-xs"
          placeholder={"Team Alpha, Alice, AI Track\nTeam Beta, Dave, Web Track\nTeam Gamma, Sara"}
          value={csv} onChange={e => { setCsv(e.target.value); parseText(e.target.value); }} />
      ) : (
        <label className="mb-3 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-bg-border bg-bg-subtle py-6 text-xs text-fg-muted transition-colors hover:border-fg-muted/30 hover:bg-bg-muted">
          <Upload size={18} className="text-fg-subtle" />
          {fileName ? <span className="font-mono text-fg-default">{fileName}</span> : <span>Click to choose a .csv file</span>}
          <input type="file" accept=".csv,text/csv" className="hidden" onChange={onFileChange} />
        </label>
      )}
      {preview.length > 0 && (
        <div className="mb-3">
          <p className="mb-1 text-xs text-fg-muted">{preview.length} team{preview.length !== 1 ? 's' : ''} detected:</p>
          <div className="flex flex-wrap gap-1.5">
            {preview.map(t => (
              <span key={t.id} className="flex items-center gap-1 rounded-full bg-bg-muted px-2 py-0.5 text-xs text-fg-muted">
                {t.name}
                {t.leader && <span className="text-fg-subtle">· {t.leader}</span>}
                {t.track_id && <span className="text-fg-subtle">· {tracks.find(tr => tr.id === t.track_id)?.name ?? t.track_id}</span>}
              </span>
            ))}
          </div>
        </div>
      )}
      <button type="button" disabled={preview.length === 0} onClick={() => { onImport(preview); reset(); }} className="btn-primary w-full justify-center text-sm disabled:opacity-40">
        Import {preview.length > 0 ? preview.length : ''} Teams
      </button>
    </div>
  );
}

/* ─── Bulk Import: Judges ─── */
function BulkImportJudges({ tracks, onImport }: { tracks: Track[]; onImport: (judges: Judge[]) => void }) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<'paste' | 'file'>('paste');
  const [csv, setCsv] = useState('');
  const [preview, setPreview] = useState<Judge[]>([]);
  const [fileName, setFileName] = useState('');

  function parseText(text: string) {
    const lines = text.trim().split('\n').filter(Boolean);
    const start = /^(name|judge|judge.?name)/i.test(lines[0]?.split(',')[0] ?? '') ? 1 : 0;
    const parsed: Judge[] = lines.slice(start).map(line => {
      const cols = line.split(',').map(s => s.trim().replace(/^"|"$/g, ''));
      const [name = '', email = '', ...trackNames] = cols;
      const assignedTracks = trackNames.filter(Boolean).length > 0
        ? trackNames.filter(Boolean).map(tn => {
            const tnl = tn.toLowerCase();
            return tracks.find(t => t.name.toLowerCase() === tnl)?.id ??
                   tracks.find(t => t.name.toLowerCase().includes(tnl) || tnl.includes(t.name.toLowerCase()))?.id;
          }).filter(Boolean) as string[]
        : ['all'];
      return { id: uid('judge'), name, email, tracks: assignedTracks.length > 0 ? assignedTracks : ['all'] };
    }).filter(j => j.name && j.email.includes('@'));
    setPreview(parsed);
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = ev => { const text = ev.target?.result as string; setCsv(text); parseText(text); };
    reader.readAsText(file);
  }

  function reset() { setOpen(false); setCsv(''); setPreview([]); setFileName(''); }

  if (!open) return (
    <button type="button" onClick={() => setOpen(true)} className="btn-ghost w-full justify-center text-xs text-fg-subtle">
      <Upload size={14} /> Bulk import judges
    </button>
  );

  return (
    <div className="card p-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-medium text-fg-default">Bulk Import Judges</p>
        <button type="button" onClick={reset} className="text-xs text-fg-muted">Cancel</button>
      </div>
      <p className="mb-2 text-xs text-fg-subtle">Format: <code className="font-mono">Name, email@domain.com, Track (optional)</code></p>
      {/* Tabs */}
      <div className="mb-3 flex gap-1 rounded-lg border border-bg-border bg-bg-muted p-0.5">
        {(['paste', 'file'] as const).map(t => (
          <button type="button" key={t} onClick={() => setTab(t)}
            className={`flex-1 rounded-md py-1 text-xs font-medium transition-colors ${tab === t ? 'bg-bg-base text-fg-default shadow-sm' : 'text-fg-subtle hover:text-fg-muted'}`}>
            {t === 'paste' ? 'Paste CSV' : 'Upload File'}
          </button>
        ))}
      </div>
      {tab === 'paste' ? (
        <textarea className="input mb-3 h-32 w-full resize-none font-mono text-xs"
          placeholder={"Dr. Sharma, sharma@iit.ac.in, AI Track\nProf. Nair, nair@mit.edu"}
          value={csv} onChange={e => { setCsv(e.target.value); parseText(e.target.value); }} />
      ) : (
        <label className="mb-3 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-bg-border bg-bg-subtle py-6 text-xs text-fg-muted transition-colors hover:border-fg-muted/30 hover:bg-bg-muted">
          <Upload size={18} className="text-fg-subtle" />
          {fileName ? <span className="font-mono text-fg-default">{fileName}</span> : <span>Click to choose a .csv file</span>}
          <input type="file" accept=".csv,text/csv" className="hidden" onChange={onFileChange} />
        </label>
      )}
      {preview.length > 0 && (
        <div className="mb-3">
          <p className="mb-1 text-xs text-fg-muted">{preview.length} judge{preview.length !== 1 ? 's' : ''} detected:</p>
          <div className="flex flex-wrap gap-1.5">
            {preview.map(j => (
              <span key={j.id} className="flex items-center gap-1 rounded-full bg-bg-muted px-2 py-0.5 text-xs text-fg-muted">
                {j.name} <span className="text-fg-subtle">· {j.email}</span>
              </span>
            ))}
          </div>
        </div>
      )}
      <button type="button" disabled={preview.length === 0} onClick={() => { onImport(preview); reset(); }} className="btn-primary w-full justify-center text-sm disabled:opacity-40">
        Import {preview.length > 0 ? preview.length : ''} Judges
      </button>
    </div>
  );
}

