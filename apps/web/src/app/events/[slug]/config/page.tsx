'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { ArrowLeft, Save, Check, Tag, ListChecks, AlertTriangle } from 'lucide-react';
import Link from 'next/link';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

function toLocalDatetime(iso: string) {
  if (!iso) return '';
  try { return new Date(iso).toISOString().slice(0, 16); } catch { return ''; }
}

export default function ConfigPage() {
  const { slug } = useParams();
  const [config, setConfig] = useState<any>(null);
  const [form, setForm] = useState({ name: '', description: '', timezone: '', judging_opens_at: '', judging_closes_at: '' });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState('');
  const [notOrg, setNotOrg] = useState(false);

  useEffect(() => {
    fetch(`${API}/events/${slug}`)
      .then((r) => r.json())
      .then((d) => {
        if (!d.success) return;
        setConfig(d.data);
        const ev = d.data.event;
        setForm({
          name: ev.name ?? '',
          description: ev.description ?? '',
          timezone: ev.timezone ?? '',
          judging_opens_at: toLocalDatetime(ev.judging_opens_at),
          judging_closes_at: toLocalDatetime(ev.judging_closes_at),
        });
      });
  }, [slug]);

  async function save() {
    setSaving(true); setErr(''); setSaved(false);
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') ?? '' : '';
    if (!token) { setNotOrg(true); setSaving(false); return; }
    const body = {
      name: form.name,
      description: form.description,
      timezone: form.timezone,
      judging_opens_at: form.judging_opens_at ? new Date(form.judging_opens_at).toISOString() : undefined,
      judging_closes_at: form.judging_closes_at ? new Date(form.judging_closes_at).toISOString() : undefined,
    };
    const res = await fetch(`${API}/events/${slug}/config`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    setSaving(false);
    if (data.success) { setSaved(true); setTimeout(() => setSaved(false), 2000); }
    else if (res.status === 401) { setNotOrg(true); }
    else setErr(data.error?.message ?? 'Failed to save');
  }

  if (!config) {
    return (
      <main className="page-shell flex min-h-screen items-center justify-center">
        <p className="text-sm text-fg-muted">Loading…</p>
      </main>
    );
  }

  const tracks: any[] = config.tracks ?? [];
  const criteria: any[] = config.criteria ?? [];

  return (
    <main className="page-shell px-6 py-10">
      <div className="container-tight">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-fg-default">Event Settings</h1>
            <p className="mt-1 text-sm text-fg-muted">Update event metadata and judging window.</p>
          </div>
          <Link href={`/events/${slug}`} className="btn-ghost text-sm text-fg-muted">
            <ArrowLeft size={15} /> Dashboard
          </Link>
        </div>

        {notOrg && (
          <div className="mb-6 flex items-center gap-2.5 rounded-lg border border-semantic-warning/30 bg-semantic-warning/5 px-4 py-3 text-sm text-semantic-warning">
            <AlertTriangle size={15} />
            <span>You need to be signed in as organizer to save changes.</span>
            <a href={`/login?next=/events/${slug}/config`} className="ml-auto underline">Sign in</a>
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Settings form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Info */}
            <div className="card p-6">
              <h2 className="mb-5 text-base font-semibold text-fg-default">Basic Info</h2>
              <div className="space-y-4">
                <div>
                  <label className="label">Event Name</label>
                  <input className="input" value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} placeholder="My Hackathon 2026" />
                </div>
                <div>
                  <label className="label">Description</label>
                  <textarea className="input min-h-[90px] resize-y" value={form.description} onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Brief description shown to judges…" />
                </div>
                <div>
                  <label className="label">Timezone</label>
                  <input className="input" value={form.timezone} onChange={(e) => setForm(f => ({ ...f, timezone: e.target.value }))} placeholder="Asia/Kolkata" />
                  <p className="mt-1 text-xs text-fg-subtle">IANA timezone identifier, e.g. <code className="font-mono">Asia/Kolkata</code></p>
                </div>
              </div>
            </div>

            {/* Judging Window */}
            <div className="card p-6">
              <h2 className="mb-5 text-base font-semibold text-fg-default">Judging Window</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="label">Opens At</label>
                  <input className="input" type="datetime-local" value={form.judging_opens_at} onChange={(e) => setForm(f => ({ ...f, judging_opens_at: e.target.value }))} />
                </div>
                <div>
                  <label className="label">Closes At</label>
                  <input className="input" type="datetime-local" value={form.judging_closes_at} onChange={(e) => setForm(f => ({ ...f, judging_closes_at: e.target.value }))} />
                </div>
              </div>
            </div>

            {/* Save */}
            {err && <p className="text-sm text-semantic-error">{err}</p>}
            <button onClick={save} disabled={saving} className="btn-primary w-full sm:w-auto">
              {saved ? <><Check size={15} /> Saved</> : saving ? 'Saving…' : <><Save size={15} /> Save Changes</>}
            </button>
          </div>

          {/* Read-only info panel */}
          <div className="space-y-5">
            {/* Tracks */}
            <div className="card p-5">
              <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-fg-default">
                <Tag size={14} className="text-fg-subtle" /> Tracks
              </h3>
              {tracks.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {tracks.map((t: any, i: number) => (
                    <span key={t.id ?? i} className="rounded-full border border-bg-border bg-bg-muted px-3 py-1 text-xs text-fg-muted">{t.name}</span>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-fg-subtle">No tracks — all criteria are global.</p>
              )}
            </div>

            {/* Criteria */}
            <div className="card p-5">
              <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-fg-default">
                <ListChecks size={14} className="text-fg-subtle" /> Scoring Criteria
              </h3>
              {criteria.length > 0 ? (
                <div className="space-y-2">
                  {criteria.map((c: any, i: number) => (
                    <div key={c.id ?? i} className="flex items-center justify-between text-xs">
                      <span className="text-fg-muted">{c.name}</span>
                      <span className="font-mono text-fg-subtle">{(c.weight * 100).toFixed(0)}%</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-fg-subtle">No criteria configured.</p>
              )}
              <p className="mt-4 text-xs text-fg-subtle">To modify teams, judges, or criteria, re-upload the event YAML.</p>
            </div>

            {/* Slug / ID */}
            <div className="card p-5">
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-fg-subtle">Event Slug</h3>
              <p className="font-mono text-sm text-fg-default">{String(slug)}</p>
              <p className="mt-1 text-xs text-fg-subtle">The slug cannot be changed after creation.</p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
