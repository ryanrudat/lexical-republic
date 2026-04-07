/**
 * Harmony World Bible — canonical world-building constants.
 * Consumed by the AI generation prompt to ensure consistent references
 * to locations, regulations, and cultural details across all generated posts.
 */

export interface HarmonyLocation {
  id: string;
  name: string;
  description: string;
  narrativeRole: string;
  firstAppearance: number;
}

export interface MinistryRegulation {
  id: string;
  code: string;
  title: string;
  summary: string;
  firstCited: number;
}

export interface WeeklyCulture {
  weekNumber: number;
  slogan: string;
  clarityTeaFlavor?: string;
  approvedPlaylist?: string;
}

export const HARMONY_LOCATIONS: HarmonyLocation[] = [
  {
    id: 'sector_4_community_center',
    name: 'Sector 4 Community Center',
    description: 'Where Citizen-4488\'s neighbor attended Tuesday activities before disappearing.',
    narrativeRole: 'Ground zero for disappearances and schedule removals',
    firstAppearance: 1,
  },
  {
    id: 'central_filing_hall',
    name: 'Central Filing Hall',
    description: 'Massive document processing center with over 200 associates. Where most citizens work.',
    narrativeRole: 'Primary workplace setting — the "office" of the world',
    firstAppearance: 1,
  },
  {
    id: 'wellness_pavilion',
    name: 'The Wellness Pavilion',
    description: 'Euphemism for reeducation/disappearance center. Citizens are "transferred" there.',
    narrativeRole: 'Threat destination — where flagged citizens go and do not return',
    firstAppearance: 3,
  },
  {
    id: 'cafeteria_block_7',
    name: 'Cafeteria Block 7',
    description: 'Where associates eat. Has a notice board. Clarity tea served at 10:00 and 15:00.',
    narrativeRole: 'Social gathering point — where rumors spread and notices appear',
    firstAppearance: 1,
  },
  {
    id: 'transit_hub_delta',
    name: 'Transit Hub Delta',
    description: 'Commuter station with propaganda screens. All citizens pass through daily.',
    narrativeRole: 'Public propaganda space — slogans and bulletins displayed here',
    firstAppearance: 2,
  },
  {
    id: 'residential_towers',
    name: 'Residential Towers 11-15',
    description: 'Where citizens live. Tower assignment is a status marker — higher floors for higher compliance.',
    narrativeRole: 'Home setting — tower number signals social standing',
    firstAppearance: 1,
  },
  {
    id: 'recreation_yard_3',
    name: 'Recreation Yard 3',
    description: 'Approved leisure area with scheduled activities. Activities are sometimes removed without notice.',
    narrativeRole: 'Mirrors community center pattern — activities disappear, no one asks why',
    firstAppearance: 2,
  },
  {
    id: 'the_archive',
    name: 'The Archive',
    description: 'Restricted document storage. Mentioned in whispers. Contains original versions of revised documents.',
    narrativeRole: 'Mystery location — appears in later weeks as narrative deepens',
    firstAppearance: 6,
  },
];

export const MINISTRY_REGULATIONS: MinistryRegulation[] = [
  {
    id: 'reg_14c',
    code: 'Regulation 14-C',
    title: 'Approved Vocabulary Usage in Public Spaces',
    summary: 'Citizens must use approved vocabulary when speaking in public areas and on Harmony.',
    firstCited: 1,
  },
  {
    id: 'form_77b',
    code: 'Form 77-B',
    title: 'Community Activity Registration',
    summary: 'Required form for registering community activities. Citizen-4488\'s neighbor should have filed one.',
    firstCited: 2,
  },
  {
    id: 'directive_2031_4',
    code: 'Directive 2031.4',
    title: 'Schedule Modification Protocol',
    summary: 'Authorizes schedule changes to community facilities. Cited when Tuesday activities vanished.',
    firstCited: 2,
  },
  {
    id: 'wellness_protocol_9',
    code: 'Wellness Protocol 9',
    title: 'Voluntary Wellness Check-In',
    summary: '"Voluntary" check-in for citizens flagged with communication irregularities.',
    firstCited: 3,
  },
  {
    id: 'harmony_conduct',
    code: 'Harmony Conduct Code',
    title: 'Platform Conduct Standards',
    summary: 'Rules for posting on the Harmony platform. Enforced by P.E.A.R.L. monitoring.',
    firstCited: 1,
  },
];

export const WEEKLY_CULTURE: Record<number, WeeklyCulture> = {
  1: {
    weekNumber: 1,
    slogan: 'Harmony Starts With You',
    clarityTeaFlavor: 'Standard Blend',
    approvedPlaylist: 'Synthetic Serenity Vol. 1',
  },
  2: {
    weekNumber: 2,
    slogan: 'Clear Words, Clear Minds',
    clarityTeaFlavor: 'Citrus Focus',
    approvedPlaylist: 'Synthetic Serenity Vol. 2',
  },
  3: {
    weekNumber: 3,
    slogan: 'Efficiency Is Community',
    clarityTeaFlavor: 'Calm Chamomile',
    approvedPlaylist: 'Synthetic Serenity Vol. 3',
  },
};

export const CULTURAL_CONSTANTS = {
  beverages: ['Clarity Tea (10:00 and 15:00)', 'Approved Water (filtered, room temperature)'],
  music: ['Synthetic Serenity playlist (approved ambient)'],
  creditSystem: 'Citizens earn Harmony Credits for compliance — redeemable for cafeteria upgrades and recreation privileges.',
  complianceScores: 'Weekly compliance scores are posted publicly in Cafeteria Block 7.',
};

/** Get locations available (introduced) by a given week. */
export function getLocationsForWeek(weekNumber: number): HarmonyLocation[] {
  return HARMONY_LOCATIONS.filter(l => l.firstAppearance <= weekNumber);
}

/** Get regulations cited by a given week. */
export function getRegulationsForWeek(weekNumber: number): MinistryRegulation[] {
  return MINISTRY_REGULATIONS.filter(r => r.firstCited <= weekNumber);
}
