/**
 * Design tokens for the HackJudge platform.
 * Single source of truth — never hardcode colours, spacing, or font sizes outside this file.
 */

export const colors = {
  bg: {
    base:    '#0a0a0a',
    subtle:  '#111111',
    muted:   '#1a1a1a',
    overlay: '#222222',
    border:  '#2a2a2a',
  },
  fg: {
    default:  '#ededed',
    muted:    '#a1a1a1',
    subtle:   '#666666',
    disabled: '#3a3a3a',
  },
  accent: {
    default:  '#ffffff',
    muted:    '#d4d4d4',
    subtle:   '#404040',
  },
  semantic: {
    success: '#4ade80',
    warning: '#facc15',
    error:   '#f87171',
    info:    '#60a5fa',
  },
} as const;

export const typography = {
  fontFamily: {
    sans: 'Geist, -apple-system, BlinkMacSystemFont, sans-serif',
    mono: '"Geist Mono", "Fira Code", monospace',
  },
  size: {
    xs:   '11px',
    sm:   '13px',
    base: '14px',
    md:   '16px',
    lg:   '20px',
    xl:   '24px',
    '2xl':'32px',
    '3xl':'48px',
    '4xl':'64px',
  },
  weight: {
    normal:  400,
    medium:  500,
    semibold:600,
  },
  leading: {
    tight:  1.2,
    normal: 1.5,
    loose:  1.8,
  },
} as const;

export const space = {
  1:  '4px',
  2:  '8px',
  3:  '12px',
  4:  '16px',
  5:  '20px',
  6:  '24px',
  8:  '32px',
  10: '40px',
  12: '48px',
  16: '64px',
  20: '80px',
  24: '96px',
} as const;

export const radius = {
  sm:   '4px',
  md:   '6px',
  lg:   '8px',
  xl:   '12px',
  full: '9999px',
} as const;

export const breakpoints = {
  sm:  '640px',
  md:  '768px',
  lg:  '1024px',
  xl:  '1280px',
  '2xl':'1536px',
} as const;
