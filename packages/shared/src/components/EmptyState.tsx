import React from 'react';
import { colors, typography, space } from '../design-tokens';

interface EmptyStateProps {
  icon: React.ReactNode;
  heading: string;
  subtext?: string;
}

export function EmptyState({ icon, heading, subtext }: EmptyStateProps) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: space[16],
        textAlign: 'center',
        gap: space[4],
      }}
    >
      <div style={{ color: colors.fg.disabled }}>{icon}</div>
      <p
        style={{
          fontFamily: typography.fontFamily.sans,
          fontSize: typography.size.base,
          color: colors.fg.muted,
          margin: 0,
        }}
      >
        {heading}
      </p>
      {subtext && (
        <p
          style={{
            fontFamily: typography.fontFamily.sans,
            fontSize: typography.size.sm,
            color: colors.fg.subtle,
            margin: 0,
          }}
        >
          {subtext}
        </p>
      )}
    </div>
  );
}
