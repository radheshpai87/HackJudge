'use client';

import { useParams } from 'next/navigation';
import { Award, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function CertificatesPage() {
  const { slug } = useParams();

  return (
    <main className="page-shell px-6 py-10">
      <div className="container-tight">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-fg-default">Certificates</h1>
          <Link href={`/events/${slug}`} className="btn-ghost text-sm text-fg-muted">
            <ArrowLeft size={16} /> Dashboard
          </Link>
        </div>
        <div className="card flex flex-col items-center px-10 py-16 text-center">
          <Award size={40} className="mb-4 text-fg-muted" />
          <p className="text-base font-medium text-fg-default">Coming soon</p>
          <p className="mt-2 text-sm text-fg-muted">
            Certificate generation for <span className="font-mono text-xs text-fg-subtle">{slug}</span> will be available in a future update.
          </p>
        </div>
      </div>
    </main>
  );
}
