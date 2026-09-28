'use client';

import { useLiveResource } from '@/hooks/useLiveResource';
import type { Leaderboard } from '@/lib/challenges';

export type { LiveMode } from '@/hooks/useLiveResource';

// COM-F02 — leaderboard "en tiempo real" de un reto (ver useLiveResource).
export function useLiveLeaderboard(basePath: string) {
  return useLiveResource<Leaderboard>(`${basePath}/leaderboard`, `${basePath}/stream`);
}
