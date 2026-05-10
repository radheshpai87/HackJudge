'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { Trophy, ArrowRight, Calendar, Users, LayoutGrid } from 'lucide-react';

interface EventItem {
  slug: string;
  name: string;
  status: string;
  tracks: number;
  teams: number;
  judges: number;
  createdAt: string;
}

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

export default function EventsPage() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`${API}/events`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setEvents(data.data);
        else setError(data.error?.message || 'Failed to load events');
      })
      .catch(() => setError('Network error'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <main className="page-shell px-6 py-24">
        <div className="container-tight">
          <div className="mb-12">
            <h1 className="text-3xl font-semibold text-fg-default">Events</h1>
            <p className="mt-2 text-sm text-fg-muted">Loading...</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="card h-40 animate-pulse bg-bg-subtle" />
            ))}
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="page-shell px-6 py-24">
      <div className="container-tight">
        <div className="mb-12 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-3xl font-semibold text-fg-default">Events</h1>
            <p className="mt-2 text-sm text-fg-muted">
              {events.length} event{events.length !== 1 ? 's' : ''} found
            </p>
          </div>
          <Link href="/events/new" className="btn-primary">
            <Trophy size={16} /> Create event
          </Link>
        </div>

        {error && (
          <div className="mb-6 rounded-lg border border-semantic-error/20 bg-semantic-error/10 px-4 py-3 text-sm text-semantic-error">
            {error}
          </div>
        )}

        {events.length === 0 && !error && (
          <div className="card p-12 text-center">
            <Trophy size={40} className="mx-auto mb-4 text-fg-subtle" />
            <h2 className="text-lg font-medium text-fg-default">No events yet</h2>
            <p className="mt-2 text-sm text-fg-muted">Create your first hackathon to get started.</p>
            <Link href="/events/new" className="btn-primary mt-6 inline-flex">
              Create event <ArrowRight size={16} />
            </Link>
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {events.map((event, i) => (
            <motion.div
              key={event.slug}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05, duration: 0.3 }}
            >
              <Link
                href={`/events/${event.slug}`}
                className="card-hover group flex h-full flex-col p-6 transition-colors"
              >
                <div className="mb-4 flex items-center justify-between">
                  <span className="rounded-full bg-bg-muted px-2.5 py-0.5 text-xs text-fg-muted">
                    {event.status}
                  </span>
                  <ArrowRight size={16} className="text-fg-subtle transition-transform group-hover:translate-x-1" />
                </div>
                <h3 className="text-lg font-medium text-fg-default">{event.name}</h3>
                <div className="mt-auto pt-4 flex items-center gap-4 text-xs text-fg-muted">
                  <span className="flex items-center gap-1">
                    <LayoutGrid size={12} /> {event.tracks} tracks
                  </span>
                  <span className="flex items-center gap-1">
                    <Users size={12} /> {event.teams} teams
                  </span>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </main>
  );
}
