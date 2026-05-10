'use client';
import React from 'react';
import { colors, typography, radius } from '../design-tokens';

type BadgeVariant = 'default' | 'success' | 'warning' | 'error' | 'muted';

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
}

const variantMap: Record<BadgeVariant, React.CSSProperties> = {
  default:  { backgroundColor: colors.bg.overlay, color: colors.fg.muted },
  success:  { backgroundColor: 'rgba(74,222,128,0.15)', color: colors.semantic.success },
  warning:  { backgroundColor: 'rgba(250,204,21,0.15)', color: colors.semantic.warning },
  error:    { backgroundColor: 'rgba(248,113,113,0.15)', color: colors.semantic.error },
  muted:    { backgroundColor: colors.bg.muted, color: colors.fg.subtle },
};

export function Badge({ variant = 'default', children }: BadgeProps) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '2px 8px',
        borderRadius: radius.full,
        fontFamily: typography.fontFamily.mono,
        fontSize: typography.size.xs,
        fontWeight: typography.weight.medium,
        lineHeight: '18px',
        ...variantMap[variant],
      }}
    >
      {children}
    </span>
  );
}
