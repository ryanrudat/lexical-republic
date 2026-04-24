/**
 * Narrative route definitions for the frontend.
 * Mirrors the backend route config (backend/src/data/narrative-routes.ts).
 * Only contains the week lists — no bridging briefings (those are server-side).
 */

export const ROUTE_WEEKS: Record<string, number[]> = {
  full: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18],
  condensed: [1, 2, 3, 5, 6, 11, 14, 16, 18],
};

/** Get the week numbers for a route. Falls back to full. */
export function getRouteWeeks(routeId: string | null | undefined): number[] {
  return ROUTE_WEEKS[routeId ?? 'full'] ?? ROUTE_WEEKS.full;
}

/**
 * The highest week number that currently has built WeekConfig content.
 * Update this as new weeks are added to the backend.
 */
export const MAX_BUILT_WEEK = 4;

/**
 * Get available shifts for a route, filtered to only weeks with content.
 */
export function getAvailableShifts(routeId: string | null | undefined): number[] {
  return getRouteWeeks(routeId).filter((wn) => wn <= MAX_BUILT_WEEK);
}
