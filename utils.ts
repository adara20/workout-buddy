
import { Pillar } from './types';

export function getDaysSince(timestamp: number | null): number {
  if (!timestamp) return 999;
  const now = Date.now();
  const diff = now - timestamp;
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

export function getOverdueScore(pillar: Pillar): number {
  const daysSince = getDaysSince(pillar.lastCountedAt);
  return daysSince / pillar.cadenceDays;
}

export type StatusColor = 'green' | 'yellow' | 'red';

export function getStatusColor(pillar: Pillar): StatusColor {
  const score = getOverdueScore(pillar);
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
