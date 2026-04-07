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
  communitySoup?: string;
  communityEvent?: string;
  weatherNote?: string;
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
    communitySoup: 'Mild Vegetable',
    communityEvent: 'New Associate Welcome Social — Room 3, Sector 4 Community Center',
    weatherNote: 'Clear skies, 22 degrees. Approved outdoor activities available.',
  },
  2: {
    weekNumber: 2,
    slogan: 'Clear Words, Clear Minds',
    clarityTeaFlavor: 'Citrus Focus',
    approvedPlaylist: 'Synthetic Serenity Vol. 2',
    communitySoup: 'Ginger Corn',
    communityEvent: 'Community Calligraphy Workshop — new ink colors available',
    weatherNote: 'Light rain expected. Transit delays possible.',
  },
  3: {
    weekNumber: 3,
    slogan: 'Efficiency Is Community',
    clarityTeaFlavor: 'Calm Chamomile',
    approvedPlaylist: 'Synthetic Serenity Vol. 3',
    communitySoup: 'Pumpkin (seasonal favorite)',
    communityEvent: 'Listening Group — Synthetic Serenity Vol. 3 premiere session',
    weatherNote: 'Overcast. Tower corridor heaters activated.',
  },
};

export const CULTURAL_CONSTANTS = {
  beverages: ['Clarity Tea (10:00 and 15:00)', 'Approved Water (filtered, room temperature)'],
  music: ['Synthetic Serenity playlist (approved ambient)'],
  creditSystem: 'Citizens earn Harmony Credits for compliance — redeemable for cafeteria upgrades and recreation privileges.',
  complianceScores: 'Weekly compliance scores are posted publicly in Cafeteria Block 7.',
};

// ── Content Rules ─────────────────────────────────────────────────

/** Max characters for a Harmony feed post. Enforced in compose UI and validated in tests. */
export const HARMONY_POST_MAX_LENGTH = 280;

// ── Cultural Texture ──────────────────────────────────────────────

export const APPROVED_MEDIA = {
  television: [
    { name: 'Our Harmonious Kitchen', description: 'State-approved cooking show. All recipes use standard ingredients only. Season 14 just started.' },
    { name: 'The Filing Adventures of Junior Associate Sparky', description: "Children's animated show about a small bird who loves sorting documents. Unreasonably popular with adults." },
    { name: 'Evening Serenity Hour', description: 'Nightly broadcast of calming landscape footage with approved narration. Attendance strongly encouraged.' },
    { name: 'Clarity Challenge', description: 'Weekly quiz show where citizens compete in vocabulary and grammar. Grand prize: a cafeteria upgrade voucher.' },
  ],
  music: [
    { name: 'Synthetic Serenity (Vol. 1-12)', description: 'Ambient electronic playlist approved for all settings. Same 40 tracks rotating since 2028.' },
    { name: 'The Harmony Choir Recordings', description: 'Uplifting choral arrangements of Ministry slogans. Popular at community events.' },
    { name: 'Nature Sounds Archive (Approved Selection)', description: 'Field recordings of rain, wind, and birdsong. No unapproved animal sounds.' },
  ],
  books: [
    { name: 'Standard Recipes for Standard Citizens (Vol. 1-3)', description: 'The only approved cookbook. Volume 2 (soups) is the best.' },
    { name: 'The Good Associate: A Compliance Journey', description: 'Required reading during orientation. Citizens quote it on Harmony like scripture.' },
    { name: 'Approved Poetry Anthology (Revised Edition)', description: 'Curated poems about productivity, teamwork, and seasonal beauty. The original unrevised edition is rumored to exist somewhere.' },
    { name: '101 Things to Notice About Your Workspace', description: 'Popular self-improvement book. Chapter 7 (desk organization) is widely discussed.' },
  ],
};

export const FOOD_CULTURE = {
  cafeteriaDishes: [
    { name: 'Standard Noodle Bowl', notes: 'Default lunch option. Mild broth, correct portion. Citizens have strong opinions about the Wednesday version.' },
    { name: 'Regulation Rice Set', notes: 'Rice, seasonal vegetables, protein allocation. Protein type rotates weekly.' },
    { name: 'Harmony Congee', notes: 'Breakfast staple. Warm, thick, slightly sweet. Many citizens say it reminds them of home before they were assigned towers.' },
    { name: 'Efficiency Bun (red bean)', notes: 'Afternoon snack available with Harmony Credits. The bun is always warm. This is surprisingly important to people.' },
    { name: 'Community Soup (seasonal)', notes: 'Changes monthly. October is pumpkin. Citizens discuss the soup more than any regulation.' },
    { name: 'Celebration Cake (monthly)', notes: 'Small slice of vanilla cake on the first Monday. Originally to celebrate production milestones. Now just the thing everyone waits for.' },
  ],
  clarityTeaLore: 'Clarity Tea is served at 10:00 and 15:00 in all cafeteria blocks. Each week has an approved flavor. Citizens who bring personal tea are flagged. The 15:00 tea is widely considered better — the water is fresher in the afternoon. No one knows why.',
  mealRules: [
    'Eating at your desk is prohibited (Form 44-A violation)',
    'Meal portions are standardized; seconds require a supervisor note',
    'Cafeteria seating is first-come; saving seats is discouraged',
    'The window table at Block 7 is always empty — no one remembers why',
  ],
};

export const DOMESTIC_LIFE = {
  towerLiving: [
    'Residential Towers 11-15 house all associates. Higher floors = higher compliance scores.',
    'Each unit: 18 square meters, one window, one desk, one approved bookshelf.',
    'Balcony plants are permitted (approved species list on Form 19-B). Most people grow mint or small succulents.',
    'Corridor lights dim at 22:00. Citizens may use personal lamps until 23:00.',
    'Tower 13, Floor 9 has a broken elevator. Maintenance request has been "processing" for two years.',
  ],
  approvedHobbies: [
    { name: 'Approved Walking Groups', notes: 'Evening walks in groups of 3-6 citizens. Solo walking after 20:00 requires a reason. Groups of exactly 2 may be flagged for private conversation.' },
    { name: 'Community Calligraphy', notes: 'Popular Tuesday activity at Sector 4 Community Center. Uses approved ink and approved characters only.' },
    { name: 'Puzzle Assembly', notes: '1000-piece approved landscape and architecture scenes only. Citizens trade completed puzzles.' },
    { name: 'Container Gardening', notes: 'Small herb gardens on approved balcony shelves. Mint is most common. Growing unapproved plants is a Form 19-B violation.' },
    { name: 'Knitting Circle', notes: 'Thursday evenings, Recreation Yard 3. Approved patterns only (scarves, gloves, simple hats). Colors: gray, blue, cream.' },
    { name: 'Listening Groups', notes: 'Citizens gather to listen to Synthetic Serenity together. Silence is required. Surprisingly comforting.' },
  ],
  pets: 'Small finches and canaries are the only approved companion animals (Form 22-D permit required). Cats are unlicensed but tolerated in some towers. Many citizens name their birds after colleagues who have been transferred. No one talks about this.',
  personalItems: 'Citizens may display up to 3 personal photographs (approved framing only) and 5 books from the Approved Reading List. Unapproved items may be reported.',
};

export const COMMUNITY_TRADITIONS = {
  walkingGroups: 'Evening walking groups meet at 18:30 at Recreation Yard 3. Walk Route A (approved path, 2.4 km). Groups must be 3-6 citizens.',
  monthlyDessert: 'First Monday of every month: Celebration Cake in Cafeteria Block 7. One slice per citizen. Flavor is always vanilla. No one has ever requested a different flavor officially.',
  poetryCorner: 'Selected citizens may read from the Approved Poetry Anthology at community gatherings. Original poetry requires pre-approval (Form 88-C). Very few forms are returned.',
  morningAnnouncements: 'Every morning at 07:30, tower intercoms play the weekly slogan followed by weather and transit updates. The voice is warm and female. Citizens call her "Morning Voice" though her identity is classified.',
  seasonalEvents: [
    { name: 'Productivity Festival (Spring)', notes: 'Celebrates Q1 results. Extra dessert. Approved dancing (choreographed).' },
    { name: 'Harmony Day (Summer)', notes: 'Community picnic on Recreation Yard 3. Attendance logged. Genuinely enjoyable.' },
    { name: 'Reflection Week (Autumn)', notes: 'Citizens write approved gratitude letters to the Ministry. Best letters are read aloud.' },
    { name: 'Year-End Review Gala', notes: 'Formal event. Compliance awards given. Top associates receive a window-side desk upgrade.' },
  ],
};

export const CHILDRENS_WORLD = {
  academy: 'Junior Associate Academy (ages 6-14): children of citizens attend structured language development classes. Graduates receive a Compliance Star pin.',
  complianceStars: 'Gold star pins worn on uniform collars. Children display them proudly. Some adults still wear theirs. Citizen-2104 has all five.',
  mascot: 'Junior Associate Sparky — a small animated bird who teaches correct grammar. Children adore Sparky. Sparky merchandise is the #1 Harmony Credit purchase.',
  nurseryRhyme: '"Check your words, check your tone, clear and kind, never alone." Sung at Junior Associate Academy morning assembly.',
};

// ── Citizen Roster ────────────────────────────────────────────────

export interface CitizenProfile {
  id: string;
  role: string;
  trait: string;
  tower: string;
  activeWeeks: [number, number];
  departureNote?: string;
}

/** Core NPCs — permanent through their arc (departure driven by arc phases, not this roster). */
export const CORE_CITIZENS: CitizenProfile[] = [
  { id: 'Citizen-2104', role: 'Model employee', trait: 'Loves routine, finds beauty in order', tower: 'Tower 14, Floor 12', activeWeeks: [1, 18] },
  { id: 'Citizen-0018', role: 'Senior mentor', trait: 'Teaches through story, has warmth', tower: 'Tower 11, Floor 15', activeWeeks: [1, 18] },
  { id: 'Citizen-4488', role: 'The dissenter', trait: 'Anxious observer, notices absences, feeds the cat', tower: 'Tower 13, Floor 4', activeWeeks: [1, 18] },
  { id: 'Citizen-0007', role: 'Tired worker', trait: 'Funny, relatable, small rebellions through food', tower: 'Tower 12, Floor 3', activeWeeks: [1, 18] },
  { id: 'Citizen-7291', role: 'Efficiency bureaucrat', trait: 'Data-obsessed, metrics worshipper, comic relief', tower: 'Tower 14, Floor 10', activeWeeks: [1, 18] },
];

/** Background citizens — scripted appearances and departures. */
export const BACKGROUND_CITIZENS: CitizenProfile[] = [
  { id: 'Citizen-5502', role: 'New associate', trait: 'Homesick, writes letters to mother, sensory observer', tower: 'Tower 13, Floor 2', activeWeeks: [1, 6], departureNote: 'Transferred. Last post mentioned waiting for a letter.' },
  { id: 'Citizen-0009', role: 'Veteran associate', trait: 'Quiet defiant, notices small beauty, drew a bird on a memo', tower: 'Tower 12, Floor 9', activeWeeks: [1, 10], departureNote: 'Disappeared. The bird drawing was removed from the notice board.' },
  { id: 'Citizen-0031', role: 'Knitting circle regular', trait: 'Kind, gentle, last request was cream-colored yarn', tower: 'Tower 13, Floor 6', activeWeeks: [1, 5], departureNote: 'Gone. Her knitting needles were found in the community center lost-and-found.' },
  { id: 'Citizen-0022', role: 'Home cook', trait: "Grandmother's recipes, finds meaning in food preparation", tower: 'Tower 11, Floor 4', activeWeeks: [1, 8], departureNote: 'Transferred. Her recipe notebook was not among the items returned.' },
  { id: 'Citizen-3319', role: 'Food observer', trait: 'Tracks every menu change, notices everything edible', tower: 'Tower 14, Floor 5', activeWeeks: [1, 12], departureNote: 'Stopped posting. Or stopped.' },
  { id: 'Citizen-6103', role: 'Proud parent', trait: "Child at Junior Associate Academy, collects Compliance Stars, posts about Sparky", tower: 'Tower 12, Floor 7', activeWeeks: [4, 14], departureNote: 'Transferred. Child reassigned to a different academy.' },
  { id: 'Citizen-8844', role: 'Cafeteria worker', trait: 'The one who slips extra bread rolls, glasses, kind eyes', tower: 'Tower 15, Floor 1', activeWeeks: [3, 18], departureNote: 'Never disappears. Some people are too essential to remove.' },
  { id: 'Citizen-1177', role: 'Balcony gardener', trait: 'Grows herbs on windowsill, some unapproved varieties, shares cuttings', tower: 'Tower 13, Floor 8', activeWeeks: [5, 11], departureNote: 'Form 19-B violation. Balcony cleared.' },
  { id: 'Citizen-9020', role: 'Quiz show enthusiast', trait: 'Watches Clarity Challenge religiously, keeps score at home', tower: 'Tower 11, Floor 3', activeWeeks: [4, 10], departureNote: 'Disappeared. Asked too many questions on the show.' },
  { id: 'Citizen-4401', role: "4488's corridor neighbor", trait: 'Notices 4488 feeding the cat, becomes a cautious ally', tower: 'Tower 13, Floor 4', activeWeeks: [6, 18], departureNote: 'Survives. Quiet solidarity.' },
];

/** Get all active citizens (core + background) for a given week. */
export function getActiveCitizens(weekNumber: number): CitizenProfile[] {
  return [...CORE_CITIZENS, ...BACKGROUND_CITIZENS].filter(
    c => weekNumber >= c.activeWeeks[0] && weekNumber <= c.activeWeeks[1]
  );
}

/** Get locations available (introduced) by a given week. */
export function getLocationsForWeek(weekNumber: number): HarmonyLocation[] {
  return HARMONY_LOCATIONS.filter(l => l.firstAppearance <= weekNumber);
}

/** Get regulations cited by a given week. */
export function getRegulationsForWeek(weekNumber: number): MinistryRegulation[] {
  return MINISTRY_REGULATIONS.filter(r => r.firstCited <= weekNumber);
}
