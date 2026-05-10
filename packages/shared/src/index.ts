/**
 * Shared constants, types and utilities for the HackJudge platform.
 */

export const ROLES = {
  JUDGE: "judge",
  ORGANIZER: "organizer",
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

export const ASSIGNMENT_MODES = {
  ASSIGNED: "assigned",
  FREE: "free",
  HYBRID: "hybrid",
} as const;

export type AssignmentMode =
  (typeof ASSIGNMENT_MODES)[keyof typeof ASSIGNMENT_MODES];

export const SCORING_TYPES = {
  NUMERIC: "numeric",
  RUBRIC: "rubric",
} as const;

export type ScoringType =
  (typeof SCORING_TYPES)[keyof typeof SCORING_TYPES];

export const TIEBREAKERS = {
  HIGHER_AVG: "higher_avg",
  MORE_JUDGES: "more_judges",
  MANUAL: "manual",
} as const;

export type Tiebreaker = (typeof TIEBREAKERS)[keyof typeof TIEBREAKERS];

export const JUDGING_STATUS = {
  NOT_STARTED: "not_started",
  OPEN: "open",
  CLOSED: "closed",
} as const;

export type JudgingStatus =
  (typeof JUDGING_STATUS)[keyof typeof JUDGING_STATUS];

export const EVENT_STATUS = {
  DRAFT: "draft",
  ACTIVE: "active",
  COMPLETED: "completed",
  ARCHIVED: "archived",
} as const;

export type EventStatus =
  (typeof EVENT_STATUS)[keyof typeof EVENT_STATUS];

/**
 * Standard API response envelope.
 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
}

/**
 * Build a success response.
 */
export function success<T>(data: T): ApiResponse<T> {
  return { success: true, data };
}

/**
 * Build an error response.
 */
export function error(
  code: string,
  message: string,
  details?: unknown
): ApiResponse<never> {
  return { success: false, error: { code, message, details } };
}

export * from './design-tokens';
export * from './motion';
export { Badge } from './components/Badge';
export { ScoreBar } from './components/ScoreBar';
export { StatusDot } from './components/StatusDot';
export { EmptyState } from './components/EmptyState';
export { OfflineBanner } from './components/OfflineBanner';
