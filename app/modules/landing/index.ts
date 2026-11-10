import {
  buildLandingStats,
  type LandingCounts,
  type LandingStat,
} from "./lib/stats";

export type { LandingStat, LandingStatKey } from "./lib/stats";

/**
 * The stat band under the landing page hero: course and category counts,
 * worded for the count, then the self-paced promise. Always three items,
 * in that order.
 */
export function landingStats(counts: LandingCounts): LandingStat[] {
  return buildLandingStats(counts);
}
