'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { ArrowLeft, Save, Check, Plus, Trash2, AlertTriangle, Users, Tag, ListChecks, ClipboardList } from 'lucide-react';
import Link from 'next/link';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

interface Track { id: string; name: string; description: string; }
interface Criterion { id: string; name: string; weight: number; max_score: number; track_id: string | null; scoring_type: string; }
interface Team { id: string; name: string; track_id: string | null; table_number: string; }
interface JudgeEntry { id: string; name: string; email: string; tracks: string[]; }

function uid() { return Math.random().toString(36).slice(2, 9); }
function getToken() { return typeof window !== 'undefined' ? localStorage.getItem('token') ?? '' : ''; }

export default function ConfigPage() {
  const { slug } = useParams();
  const [loading, setLoading] = useState(true);
  const [notOrg, setNotOrg] = useState(false);

  const [basic, setBasic] = useState({ name: '', description: '', timezone: '' });
  const [savingBasic, setSavingBasic] = useState(false);
  const [savedBasic, setSavedBasic] = useState(false);
  const [errBasic, setErrBasic] = useState('');

  const [tracks, setTracks] = useState<Track[]>([]);
  const [criteria, setCriteria] = useState<Criterion[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [judges, setJudges] = useState<JudgeEntry[]>([]);
  const [savingStruct, setSavingStruct] = useState(false);
  const [savedStruct, setSavedStruct] = useState(false);
  const [errStruct, setErrStruct] = useState('');
  const [confirmReset, setConfirmReset] = useState(false);

  useEffect(() => {
    fetch(`${API}/events/${slug}`)
      .then((r) => r.json())
      .then((d) => {
        if (!d.success) return;
        const ev = d.data.event ?? {};
        setBasic({ name: ev.name ?? '', description: ev.description ?? '', timezone: ev.timezone ?? '' });
        setTracks((d.data.tracks ?? []).map((t: any) => ({ id: t.id ?? uid(), name: t.name ?? '', description: t.description ?? '' })));
        setCriteria((d.data.criteria ?? []).map((c: any) => ({ id: c.id ?? uid(), name: c.name ?? '', weight: c.weight ?? 0.5, max_score: c.max_score ?? 10, track_id: c.track_id ?? null, scoring_type: c.scoring_type ?? 'numeric' })));
        setTeams((d.data.teams ?? []).map((t: any) => ({ id: t.id ?? uid(), name: t.name ?? '', track_id: t.track_id ?? null, table_number: t.table_number ?? '' })));
        setJudges((d.data.judges ?? []).map((j: any) => ({ id: j.id ?? uid(), name: j.name ?? '', email: j.email ?? '', tracks: j.tracks ?? [] })));
        setLoading(false);
      });
  }, [slug]);

  async function saveBasic() {
    setSavingBasic(true); setErrBasic(''); setSavedBasic(false);
    const token = getToken();
    if (!token) { setNotOrg(true); setSavingBasic(false); return; }
    const res = await fetch(`${API}/events/${slug}/config`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(basic),
    });
    const data = await res.json();
    setSavingBasic(false);
    if (data.success) { setSavedBasic(true); setTimeout(() => setSavedBasic(false), 2500); }
    else if (res.status === 401) setNotOrg(true);
    else setErrBasic(data.error?.message ?? 'Failed to save');
  }

  async function saveStructure() {
    setSavingStruct(true); setErrStruct(''); setSavedStruct(false);
    const token = getToken();
    if (!token) { setNotOrg(true); setSavingStruct(false); return; }
    const res = await fetch(`${API}/events/${slug}/config`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ ...basic, tracks, criteria, teams, judges }),
    });
    const data = await res.json();
    setSavingStruct(false);
    if (data.success) { setSavedStruct(true); setConfirmReset(false); setTimeout(() => setSavedStruct(false), 2500); }
    else if (res.status === 401) setNotOrg(true);
    else setErrStruct(data.error?.message ?? 'Failed to save');
  }

  function updateTrack(i: number, patch: Partial<Track>) { setTracks(ts => ts.map((t, j) => j === i ? { ...t, ...patch } : t)); }
  function updateCriterion(i: number, patch: Partial<Criterion>) { setCriteria(cs => cs.map((c, j) => j === i ? { ...c, ...patch } : c)); }
  function updateTeam(i: number, patch: Partial<Team>) { setTeams(ts => ts.map((t, j) => j === i ? { ...t, ...patch } : t)); }
  function updateJudge(i: number, patch: Partial<JudgeEntry>) { setJudges(js => js.map((jj, k) => k === i ? { ...jj, ...patch } : jj)); }

  if (loading) {
    return (
      <main className="page-shell flex min-h-screen items-center justify-center">
        <p className="text-sm text-fg-muted">Loading…</p>
      </main>
    );
  }

  return (
    <main className="page-shell px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-3xl">

        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-fg-default">Event Settings</h1>
            <p className="mt-1 font-mono text-xs text-fg-subtle">{String(slug)}</p>
          </div>
          <Link href={`/events/${slug}`} className="btn-ghost text-sm text-fg-muted">
            <ArrowLeft size={15} /> Dashboard
          </Link>
        </div>

        {notOrg && (
          <div className="mb-6 flex items-center gap-2.5 rounded-lg border border-semantic-warning/30 bg-semantic-warning/5 px-4 py-3 text-sm text-semantic-warning">
            <AlertTriangle size={15} />
            You need to be signed in as organizer to save changes.
            <a href={`/login?next=/events/${slug}/config`} className="ml-auto underline">Sign in</a>
          </div>
        )}

        {/* ── Basic Info ── */}
        <div className="card mb-6 p-6">
          <h2 className="mb-5 text-base font-semibold text-fg-default">Basic Info</h2>
          <div className="space-y-4">
            <div>
              <label className="label">Event Name</label>
              <input className="input" value={basic.name} onChange={(e) => setBasic(b => ({ ...b, name: e.target.value }))} placeholder="My Hackathon 2026" />
            </div>
            <div>
              <label className="label">Description</label>
              <textarea className="input min-h-[80px] resize-y" value={basic.description} onChange={(e) => setBasic(b => ({ ...b, description: e.target.value }))} placeholder="Brief description shown to judges…" />
            </div>
            <div>
              <label className="label">Timezone</label>
              <input className="input" value={basic.timezone} onChange={(e) => setBasic(b => ({ ...b, timezone: e.target.value }))} placeholder="Asia/Kolkata" />
            </div>
          </div>
          {errBasic && <p className="mt-3 text-sm text-semantic-error">{errBasic}</p>}
          <div className="mt-5">
            <button type="button" onClick={saveBasic} disabled={savingBasic} className="btn-primary">
              {savedBasic ? <><Check size={14} /> Saved</> : savingBasic ? 'Saving…' : <><Save size={14} /> Save Basic Info</>}
            </button>
          </div>
        </div>

        {/* ── Structural Config ── */}
        <div className="mb-3 flex items-start gap-2.5 rounded-lg border border-semantic-warning/30 bg-semantic-warning/5 px-4 py-3 text-sm text-semantic-warning">
          <AlertTriangle size={15} className="mt-0.5 shrink-0" />
          <span>Saving the sections below will <strong>reset all judge sessions and scores</strong>. Do this before judging starts.</span>
        </div>

        {/* Tracks */}
        <div className="card mb-4 p-6">
          <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-fg-default">
            <Tag size={15} className="text-fg-subtle" /> Tracks
          </h2>
          <div className="space-y-2">
            {tracks.map((t, i) => (
              <div key={t.id} className="flex gap-2">
                <input className="input flex-1" placeholder="Track name" value={t.name} onChange={(e) => updateTrack(i, { name: e.target.value })} />
                <input className="input flex-1" placeholder="Description (optional)" value={t.description} onChange={(e) => updateTrack(i, { description: e.target.value })} />
                <button type="button" onClick={() => setTracks(ts => ts.filter((_, j) => j !== i))} className="btn-ghost px-2 text-semantic-error hover:bg-semantic-error/10"><Trash2 size={14} /></button>
              </div>
            ))}
          </div>
          <button type="button" onClick={() => setTracks(ts => [...ts, { id: uid(), name: '', description: '' }])} className="btn-ghost mt-3 text-sm">
            <Plus size={14} /> Add Track
          </button>
        </div>

        {/* Criteria */}
        <div className="card mb-4 p-6">
          <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-fg-default">
            <ListChecks size={15} className="text-fg-subtle" /> Scoring Criteria
          </h2>
          <div className="space-y-3">
            {criteria.map((c, i) => (
              <div key={c.id} className="grid gap-2 sm:grid-cols-[1fr_80px_70px_120px_auto]">
                <input className="input" placeholder="Criterion name" value={c.name} onChange={(e) => updateCriterion(i, { name: e.target.value })} />
                <div className="relative">
                  <input className="input pr-7" type="number" min={0} max={100} placeholder="50" value={Math.round(c.weight * 100)} onChange={(e) => updateCriterion(i, { weight: Number(e.target.value) / 100 })} />
                  <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-fg-subtle">%</span>
                </div>
                <input className="input" type="number" min={1} placeholder="10" value={c.max_score} onChange={(e) => updateCriterion(i, { max_score: Number(e.target.value) })} title="Max score" />
                <select className="input" value={c.track_id ?? ''} onChange={(e) => updateCriterion(i, { track_id: e.target.value || null })}>
                  <option value="">All tracks</option>
                  {tracks.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
                <button type="button" onClick={() => setCriteria(cs => cs.filter((_, j) => j !== i))} className="btn-ghost px-2 text-semantic-error hover:bg-semantic-error/10"><Trash2 size={14} /></button>
              </div>
            ))}
          </div>
          {criteria.length > 0 && (
            <p className="mt-2 text-xs text-fg-subtle">Weight% · Max score · Track</p>
          )}
          <button type="button" onClick={() => setCriteria(cs => [...cs, { id: uid(), name: '', weight: 0.5, max_score: 10, track_id: null, scoring_type: 'numeric' }])} className="btn-ghost mt-3 text-sm">
            <Plus size={14} /> Add Criterion
          </button>
        </div>

        {/* Teams */}
        <div className="card mb-4 p-6">
          <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-fg-default">
            <ClipboardList size={15} className="text-fg-subtle" /> Teams
          </h2>
          <div className="space-y-2">
            {teams.map((t, i) => (
              <div key={t.id} className="flex gap-2">
                <input className="input flex-1" placeholder="Team name" value={t.name} onChange={(e) => updateTeam(i, { name: e.target.value })} />
                <input className="input w-28" placeholder="Table #" value={t.table_number} onChange={(e) => updateTeam(i, { table_number: e.target.value })} />
                {tracks.length > 0 && (
                  <select className="input w-36" value={t.track_id ?? ''} onChange={(e) => updateTeam(i, { track_id: e.target.value || null })}>
                    <option value="">Any track</option>
                    {tracks.map(tr => <option key={tr.id} value={tr.id}>{tr.name}</option>)}
                  </select>
                )}
                <button type="button" onClick={() => setTeams(ts => ts.filter((_, j) => j !== i))} className="btn-ghost px-2 text-semantic-error hover:bg-semantic-error/10"><Trash2 size={14} /></button>
              </div>
            ))}
          </div>
          <button type="button" onClick={() => setTeams(ts => [...ts, { id: uid(), name: '', track_id: null, table_number: '' }])} className="btn-ghost mt-3 text-sm">
            <Plus size={14} /> Add Team
          </button>
        </div>

        {/* Judges */}
        <div className="card mb-6 p-6">
          <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-fg-default">
            <Users size={15} className="text-fg-subtle" /> Judges
          </h2>
          <div className="space-y-2">
            {judges.map((j, i) => (
              <div key={j.id} className="flex gap-2">
                <input className="input flex-1" placeholder="Name" value={j.name} onChange={(e) => updateJudge(i, { name: e.target.value })} />
                <input className="input flex-1" type="email" placeholder="email@example.com" value={j.email} onChange={(e) => updateJudge(i, { email: e.target.value })} />
                {tracks.length > 0 && (
                  <select className="input w-36"
                    value={j.tracks[0] ?? ''}
                    onChange={(e) => updateJudge(i, { tracks: e.target.value ? [e.target.value] : [] })}>
                    <option value="">All tracks</option>
                    {tracks.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                )}
                <button type="button" onClick={() => setJudges(js => js.filter((_, k) => k !== i))} className="btn-ghost px-2 text-semantic-error hover:bg-semantic-error/10"><Trash2 size={14} /></button>
              </div>
            ))}
          </div>
          <button type="button" onClick={() => setJudges(js => [...js, { id: uid(), name: '', email: '', tracks: [] }])} className="btn-ghost mt-3 text-sm">
            <Plus size={14} /> Add Judge
          </button>
        </div>

        {/* Apply Structure */}
        {errStruct && <p className="mb-3 text-sm text-semantic-error">{errStruct}</p>}
        {!confirmReset ? (
          <button type="button" onClick={() => setConfirmReset(true)} disabled={savingStruct} className="btn-primary">
            {savedStruct ? <><Check size={14} /> Applied</> : <><Save size={14} /> Apply Structure</>}
          </button>
        ) : (
          <div className="flex items-center gap-3 rounded-lg border border-semantic-error/30 bg-semantic-error/5 px-4 py-3">
            <AlertTriangle size={15} className="shrink-0 text-semantic-error" />
            <span className="text-sm text-semantic-error">This resets all scores and judge sessions. Confirm?</span>
            <button type="button" onClick={saveStructure} disabled={savingStruct} className="ml-auto btn-primary bg-semantic-error hover:bg-semantic-error/90 text-sm">
              {savingStruct ? 'Saving…' : 'Yes, Reset & Save'}
            </button>
            <button type="button" onClick={() => setConfirmReset(false)} className="btn-ghost text-sm">Cancel</button>
          </div>
        )}

      </div>
    </main>
  );
}
