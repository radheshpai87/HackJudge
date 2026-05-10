'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { colors, typography, space } from '@hackjudge/shared';

export default function VerifyPage() {
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

    const magicToken = token;

    fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1'}/auth/verify/${magicToken.trim()}`)
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
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: colors.bg.base,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: space[8],
      }}
    >
      <div style={{ textAlign: 'center' }}>
        {status === 'verifying' ? (
          <>
            <div style={{ fontSize: 40, marginBottom: space[4] }}>⟳</div>
            <p style={{ fontFamily: typography.fontFamily.sans, fontSize: typography.size.base, color: colors.fg.muted }}>
              Verifying your magic link…
            </p>
          </>
        ) : (
          <>
            <div style={{ fontSize: 40, marginBottom: space[4] }}>✕</div>
            <p
              style={{
                fontFamily: typography.fontFamily.sans,
                fontSize: typography.size.base,
                color: colors.fg.default,
                marginBottom: space[4],
              }}
            >
              {message}
            </p>
            <a
              href="/"
              style={{
                fontFamily: typography.fontFamily.sans,
                fontSize: typography.size.sm,
                color: colors.fg.muted,
                textDecoration: 'underline',
              }}
            >
              Back to home
            </a>
          </>
        )}
      </div>
    </div>
  );
}
