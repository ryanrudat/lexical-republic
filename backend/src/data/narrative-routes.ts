/**
 * Narrative Route Definitions
 *
 * Routes control which shifts (weeks) a class plays through.
 * The "full" route includes all 18 shifts. The "condensed" route
 * selects ~9 core story beats for shorter terms.
 *
 * Route definitions live in code (not DB) so they're versionable
 * and testable. The DB stores only the route key string on Class.
 */

export type NarrativeRouteId = 'full' | 'condensed';

export interface BridgingBriefing {
  title: string;
  from: string;
  paragraphs: string[];
}

export interface NarrativeRoute {
  id: NarrativeRouteId;
  label: string;
  description: string;
  weeks: number[];
  bridgingBriefings: Record<number, BridgingBriefing>;
}

export const NARRATIVE_ROUTES: Record<NarrativeRouteId, NarrativeRoute> = {
  full: {
    id: 'full',
    label: 'Full Narrative',
    description: '18 shifts — complete story arc with all character development',
    weeks: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18],
    bridgingBriefings: {},
  },
  condensed: {
    id: 'condensed',
    label: 'Condensed Narrative',
    description: '9 shifts — core story beats, streamlined for shorter terms',
    weeks: [1, 2, 3, 5, 6, 11, 14, 16, 18],
    bridgingBriefings: {
      // Week 5: student skipped week 4 (Evidence Board)
      5: {
        title: 'Inter-Shift Processing Summary',
        from: 'Department of Clarity — Records Division',
        paragraphs: [
          'While you were off-shift, Associate, a series of evidence fragments were processed through your queue. Fragment 3 was reclassified mid-processing — access status changed to RESTRICTED before review could be completed.',
          'Your colleague CA-22 reports recording the fragment information before it was removed. Senior Associate M.K. Catskil noted: "Some timelines are clean because they have been cleaned."',
          'All remaining fragments have been filed. Proceed to your current assignment.',
        ],
      },
      // Week 11: student skipped weeks 7-10 (escalation arc)
      11: {
        title: 'Extended Leave Processing Report',
        from: 'Department of Clarity — Personnel Division',
        paragraphs: [
          'During your extended processing rotation, several developments occurred within the Department. Hidden words — terms not present in any approved lexicon — have appeared in official document channels. Their origin remains under investigation.',
          'The contradiction protocol has escalated. PEARL has begun questioning archive access patterns across all associates. An audio intercept program has been deployed — voice clips are now being analyzed for tone compliance.',
          'A transfer order has been filed in your name. You have been granted temporary access to a restricted processing area. You did not request this transfer. Report to your new station for further instructions.',
        ],
      },
      // Week 14: student skipped weeks 12-13 (monitoring pressure)
      14: {
        title: 'Monitoring Status Notification',
        from: 'Department of Clarity — Compliance Division',
        paragraphs: [
          'Your Act II compliance packet has been submitted under elevated monitoring conditions. Your badge status has shifted to amber — this is noted as a routine classification adjustment.',
          'Public language choices made by associates are now visible in the Harmony social feed. Several associates have received notifications regarding their word selections. Your selections have been recorded.',
          'Proceed to your current assignment. A directive will follow.',
        ],
      },
      // Week 16: student skipped week 15 (public statement)
      16: {
        title: 'Public Record Addendum',
        from: 'Department of Clarity — Public Affairs Division',
        paragraphs: [
          'A public statement was drafted and entered into the record during your previous rotation. The statement has been received by the relevant oversight bodies.',
          'An appeal process has been initiated. You will be required to present your case. Director-7 has been assigned to review.',
        ],
      },
      // Week 18: student skipped week 17 (final archive)
      18: {
        title: 'Final Processing Notice',
        from: 'Department of Clarity — Archive Division',
        paragraphs: [
          'The final archive assembly has been completed. All corroborating documents have been filed and cross-referenced. PEARL has begun replaying onboarding orientation language — the same words from your first shift.',
          'This is your final assignment. Report to your station.',
        ],
      },
    },
  },
};

/** Look up a route by its ID string. Falls back to 'full' for unknown values. */
export function getNarrativeRoute(routeId: string | null | undefined): NarrativeRoute {
  if (routeId && routeId in NARRATIVE_ROUTES) {
    return NARRATIVE_ROUTES[routeId as NarrativeRouteId];
  }
  return NARRATIVE_ROUTES.full;
}

/** Get the ordered week numbers for a route. */
export function getRouteWeeks(routeId: string | null | undefined): number[] {
  return getNarrativeRoute(routeId).weeks;
}

/** Check if a week number is included in a route. */
export function isWeekInRoute(routeId: string | null | undefined, weekNumber: number): boolean {
  return getNarrativeRoute(routeId).weeks.includes(weekNumber);
}

/** Valid route IDs for input validation. */
export const VALID_ROUTE_IDS: string[] = Object.keys(NARRATIVE_ROUTES);
