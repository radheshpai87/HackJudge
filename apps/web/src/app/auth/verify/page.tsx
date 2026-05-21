'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Loader2, XCircle } from 'lucide-react';
import Link from 'next/link';

function VerifyContent() {
  const params = useSearchParams();
  const [status, setStatus] = useState<'verifying' | 'error'>('verifying');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const token = params.get('token');
    const slug = params.get('slug');

    if (!token || !slug) {
      setStatus('error');
      setMessage('Invalid magic link — missing token or event slug.');
      return;
    }

    fetch(`/api/auth/verify/${token.trim()}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.success) {
          const eventSlug = data.data.eventSlug ?? slug;
          localStorage.setItem(`judge_token_${eventSlug}`, data.data.accessToken);
          localStorage.setItem(`judge_refresh_${eventSlug}`, data.data.refreshToken);
          window.location.href = `/events/${eventSlug}/judge`;
        } else {
          setStatus('error');
          setMessage(data.error?.message ?? 'Token invalid or expired. Request a new magic link.');
        }
      })
      .catch(() => {
        setStatus('error');
        setMessage('Could not reach the API. Make sure the server is running.');
      });
  }, [params]);

  return (
    <main className="page-shell flex min-h-screen items-center justify-center px-6">
      <div className="text-center">
        {status === 'verifying' ? (
          <>
            <Loader2 size={36} className="mx-auto mb-4 animate-spin text-fg-muted" />
            <p className="text-sm text-fg-muted">Verifying your magic link…</p>
          </>
        ) : (
          <>
            <XCircle size={36} className="mx-auto mb-4 text-semantic-error" />
            <p className="mb-4 text-sm text-fg-default">{message}</p>
            <Link href="/" className="text-sm text-fg-muted underline">Back to home</Link>
          </>
        )}
      </div>
    </main>
  );
}

export default function VerifyPage() {
  return (
    <Suspense fallback={<main className="page-shell flex min-h-screen items-center justify-center px-6"><div className="text-center"><Loader2 size={36} className="mx-auto mb-4 animate-spin text-fg-muted" /><p className="text-sm text-fg-muted">Loading…</p></div></main>}>
      <VerifyContent />
    </Suspense>
  );
}
