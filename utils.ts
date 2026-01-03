
import { Pillar } from './types';

/**
 * Generates a UUID v4.
 */
export function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

export function getDaysSince(timestamp: number | null, now: number = Date.now()): number {
  if (!timestamp) return 999;
  const diff = now - timestamp;
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

export function getOverdueScore(pillar: Pillar, now = Date.now()): number {
  const daysSince = getDaysSince(pillar.lastCountedAt, now);
  return daysSince / pillar.cadenceDays;
}

export type StatusColor = 'green' | 'yellow' | 'red';

export function getStatusColor(pillar: Pillar, now = Date.now()): StatusColor {
  const score = getOverdueScore(pillar, now);
  if (score < 0.7) return 'green';
  if (score < 1.0) return 'yellow';
  return 'red';
}

export function getStatusHex(color: StatusColor): string {
  switch (color) {
    case 'green': return '#22c55e';
    case 'yellow': return '#eab308';
    case 'red': return '#ef4444';
  }
}

export function getStatusBg(color: StatusColor): string {
  switch (color) {
    case 'green': return 'bg-green-500';
    case 'yellow': return 'bg-yellow-500';
    case 'red': return 'bg-red-500';
  }
}
