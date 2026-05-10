'use client';
import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { colors } from '../design-tokens';

type Status = 'inactive' | 'active' | 'error';

interface StatusDotProps {
  status: Status;
}

const colorMap: Record<Status, string> = {
  inactive: colors.fg.disabled,
  active:   colors.semantic.success,
  error:    colors.semantic.error,
};

export function StatusDot({ status }: StatusDotProps) {
  const reduced = useReducedMotion();

  return (
    <motion.span
      animate={status === 'active' && !reduced
        ? { scale: [1, 1.3, 1] }
        : { scale: 1 }}
      transition={status === 'active' ? { repeat: Infinity, duration: 2, ease: 'easeInOut' } : {}}
      style={{
        display: 'inline-block',
        width: 12,
        height: 12,
        borderRadius: '50%',
        backgroundColor: colorMap[status],
      }}
    />
  );
}
