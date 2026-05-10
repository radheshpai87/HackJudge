'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { motion, useReducedMotion } from 'framer-motion';
import { colors, typography, space, radius, pageVariants } from '@hackjudge/shared';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

export default function ConfigPage() {
  const { slug } = useParams();
  const [config, setConfig] = useState<any>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    fetch(`${API}/events/${slug}`)
      .then((r) => r.json())
      .then((d) => setConfig(d.data));
  }, [slug]);

  if (!config) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: colors.bg.base, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ fontFamily: typography.fontFamily.sans, fontSize: typography.size.base, color: colors.fg.muted }}>Loading config...</p>
      </div>
    );
  }

  return (
    <motion.main
      initial={reduced ? undefined : 'hidden'}
      animate="visible"
      variants={pageVariants}
      style={{ minHeight: '100vh', backgroundColor: colors.bg.base, padding: space[8] }}
    >
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <h1 style={{ fontFamily: typography.fontFamily.sans, fontSize: typography.size['2xl'], fontWeight: typography.weight.semibold, color: colors.fg.default, margin: `0 0 ${space[6]} 0` }}>
          Config
        </h1>
        <div
          style={{
            borderRadius: radius.lg,
            border: `1px solid ${colors.bg.border}`,
            backgroundColor: colors.bg.subtle,
            padding: space[6],
          }}
        >
          <pre
            style={{
              fontFamily: typography.fontFamily.mono,
              fontSize: typography.size.sm,
              color: colors.fg.muted,
              overflow: 'auto',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}
          >
            {JSON.stringify(config, null, 2)}
          </pre>
        </div>
      </div>
    </motion.main>
  );
}
