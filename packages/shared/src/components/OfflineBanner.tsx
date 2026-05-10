'use client';
import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { colors, typography, space } from '../design-tokens';
import { StatusDot } from './StatusDot';
import { pageVariants } from '../motion';

interface OfflineBannerProps {
  visible: boolean;
}

export function OfflineBanner({ visible }: OfflineBannerProps) {
  const reduced = useReducedMotion();

  return (
    <motion.div
      initial={reduced ? undefined : 'hidden'}
      animate={visible ? 'visible' : 'hidden'}
      variants={pageVariants}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: space[3],
        padding: `${space[3]} ${space[4]}`,
        backgroundColor: colors.bg.overlay,
        borderBottom: `1px solid ${colors.bg.border}`,
        position: 'sticky',
        top: 0,
        zIndex: 50,
      }}
    >
      <StatusDot status="error" />
      <span
        style={{
          fontFamily: typography.fontFamily.sans,
          fontSize: typography.size.sm,
          color: colors.fg.muted,
        }}
      >
        Offline — changes saved locally
      </span>
    </motion.div>
  );
}
