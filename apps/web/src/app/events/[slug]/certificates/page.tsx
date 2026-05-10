'use client';

import { useParams } from 'next/navigation';
import { motion, useReducedMotion } from 'framer-motion';
import { colors, typography, space, radius, pageVariants } from '@hackjudge/shared';
import { Award } from 'lucide-react';

export default function CertificatesPage() {
  const { slug } = useParams();
  const reduced = useReducedMotion();

  return (
    <motion.main
      initial={reduced ? undefined : 'hidden'}
      animate="visible"
      variants={pageVariants}
      style={{ minHeight: '100vh', backgroundColor: colors.bg.base, padding: space[8] }}
    >
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <h1 style={{ fontFamily: typography.fontFamily.sans, fontSize: typography.size['2xl'], fontWeight: typography.weight.semibold, color: colors.fg.default, margin: `0 0 ${space[6]} 0` }}>
          Certificates
        </h1>
        <div
          style={{
            borderRadius: radius.lg,
            border: `1px solid ${colors.bg.border}`,
            backgroundColor: colors.bg.subtle,
            padding: space[10],
            textAlign: 'center',
          }}
        >
          <Award size={40} style={{ color: colors.fg.muted, marginBottom: space[4] }} />
          <p style={{ fontFamily: typography.fontFamily.sans, fontSize: typography.size.md, color: colors.fg.default, margin: `0 0 ${space[2]} 0` }}>
            Coming soon
          </p>
          <p style={{ fontFamily: typography.fontFamily.sans, fontSize: typography.size.sm, color: colors.fg.muted }}>
            Certificate generation for event {slug} will be available in a future update.
          </p>
        </div>
      </div>
    </motion.main>
  );
}
