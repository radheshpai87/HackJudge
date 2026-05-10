'use client';
import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { colors, radius } from '../design-tokens';

interface ScoreBarProps {
  value: number; // 0–100
  max?: number;
  height?: number;
}

export function ScoreBar({ value, max = 100, height = 4 }: ScoreBarProps) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  const reduced = useReducedMotion();

  return (
    <div
      style={{
        width: '100%',
        height,
        backgroundColor: colors.bg.muted,
        borderRadius: radius.full,
        overflow: 'hidden',
      }}
    >
      <motion.div
        initial={reduced ? { width: `${pct}%` } : { width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={reduced ? { duration: 0 } : { duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        style={{
          height: '100%',
          backgroundColor: colors.fg.default,
          borderRadius: radius.full,
        }}
      />
    </div>
  );
}
