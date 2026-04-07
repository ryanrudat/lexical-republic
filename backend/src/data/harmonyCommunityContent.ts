/**
 * Static Community Notices and Sector Reports — weeks 1-3.
 * Notices are world-building posts (cafeteria, events, transit).
 * Sector Reports are data-rich department updates.
 * Both use target vocabulary naturally and embed narrative texture.
 */

export interface StaticCommunityNotice {
  id: string;
  weekNumber: number;
  authorLabel: string;
  content: string;
  noticeType: 'lost_found' | 'event' | 'menu' | 'transit' | 'general';
  pearlNote: string | null;
}

export interface StaticSectorReport {
  id: string;
  weekNumber: number;
  authorLabel: string;
  content: string;
  sectorId: string;
  pearlNote: string | null;
}

export const STATIC_COMMUNITY_NOTICES: Record<number, StaticCommunityNotice[]> = {
  // ── Week 1 ──
  1: [
    {
      id: 'notice-w1-cafeteria',
      weekNumber: 1,
      authorLabel: 'Cafeteria Block 7',
      noticeType: 'menu',
      content: 'WEEKLY MENU — Cafeteria Block 7\n\nBREAKFAST: Harmony Congee (warm, slightly sweet)\nLUNCH: Standard Noodle Bowl (Mon-Thu) | Regulation Rice Set (Fri)\nSNACK: Efficiency Bun (red bean) — 2 Harmony Credits\nTEA: Standard Blend at 10:00 & 15:00\n\nSubmit dietary requests via Form 12-A. All options approved under standard nutritional guidelines. The window table remains reserved.',
      pearlNote: null,
    },
    {
      id: 'notice-w1-welcome',
      weekNumber: 1,
      authorLabel: 'Sector 4 Community Center',
      noticeType: 'event',
      content: 'NEW ASSOCIATE WELCOME — Sector 4 Community Center\n\nArrive at lobby, 18:00 Tuesday. Follow signs to Room 3. Refreshments: Efficiency Buns, Clarity Tea (Standard Blend).\n\nActivities include: name tag assignment, approved icebreaker questions, community calligraphy demonstration. A supervisor will confirm attendance.\n\nThis week\'s approved icebreaker: "What is your favorite thing about your tower assignment?"',
      pearlNote: null,
    },
  ],

  // ── Week 2 ──
  2: [
    {
      id: 'notice-w2-lost',
      weekNumber: 2,
      authorLabel: 'Transit Hub Delta',
      noticeType: 'lost_found',
      content: 'LOST ITEM NOTICE — Transit Hub Delta\n\nItems noticed near Platform 3 this morning:\n— One identification badge (name removed per privacy protocol)\n— One small notebook with handwritten poetry (contents under review)\n— One knitted scarf, cream-colored\n\nRequest retrieval at Transit Information desk. Items not claimed within 48 hours will be removed and forwarded to Personnel Division.',
      pearlNote: null,
    },
    {
      id: 'notice-w2-recreation',
      weekNumber: 2,
      authorLabel: 'Recreation Yard 3',
      noticeType: 'general',
      content: 'SCHEDULE CHANGE — Recreation Yard 3\n\nThe Thursday activity schedule has been updated:\n\nREMOVED: Community Calligraphy (Tue), Listening Group (Thu)\nADDED: Approved Silent Reflection (Tue), Extended Walking (Thu)\n\nCompare the updated schedule at the yard entrance. Do not remove the posted notice. Do not request the previous schedule.',
      pearlNote: null,
    },
  ],

  // ── Week 3 ──
  3: [
    {
      id: 'notice-w3-menu',
      weekNumber: 3,
      authorLabel: 'Cafeteria Block 7',
      noticeType: 'menu',
      content: 'CAFETERIA UPDATE — Cafeteria Block 7\n\nDue to supply schedule delays:\n— Afternoon Clarity Tea (Calm Chamomile) may be briefly delayed\n— Community Soup (Pumpkin) maintained through next week\n— Celebration Cake forwarded to next Monday\n\nMaintain assigned break times. Do not forward complaints to kitchen staff. The window table remains reserved.',
      pearlNote: null,
    },
    {
      id: 'notice-w3-transit',
      weekNumber: 3,
      authorLabel: 'Transit Hub Delta',
      noticeType: 'transit',
      content: 'TRANSIT DELAY ADVISORY — Transit Hub Delta\n\nPlatform 2 has been separated from the main schedule for maintenance. Citizens who identify Platform 2 as their regular route should review the temporary schedule at the hub.\n\nPlatform 2 serves Residential Towers 11-13. Process through Platform 4 instead. Maintain your standard departure time. Do not delay your commute to review posted changes — forward concerns through proper channels.\n\nEstimated completion: under review.',
      pearlNote: null,
    },
    {
      id: 'notice-w3-activity',
      weekNumber: 3,
      authorLabel: 'Sector 4 Community Center',
      noticeType: 'general',
      content: 'ACTIVITY STATUS — Sector 4 Community Center\n\nAll remaining Tuesday/Thursday activities completed. Will not continue.\n\nItems identified during facility review (claim at front desk):\n— 3 sets of calligraphy ink stones (unclaimed)\n— 1 partially completed puzzle (landscape, 847 of 1000 pieces)\n— 12 knitting needles, various sizes\n\nCitizens should not delay personal routines to identify replacement activities.',
      pearlNote: 'Community scheduling continues to optimize citizen time allocation.',
    },
  ],
};

export const STATIC_SECTOR_REPORTS: Record<number, StaticSectorReport[]> = {
  // ── Week 1 ──
  1: [
    {
      id: 'report-w1-central-filing',
      weekNumber: 1,
      authorLabel: 'Central Filing Hall — Operations',
      sectorId: 'central_filing',
      content: 'SECTOR REPORT — Central Filing Hall — Week 1\n\nSTAFFING:    214 associates on shift\nPROCESSED:   847 documents (avg 4.2 min/doc)\nCOMPLIANCE:  98.6%\nQUEUE WAIT:  12 min (standard)\nNEW INTAKE:  15 associates\nTRANSFERS:   0\n\nMorning Clarity Tea consumption: up 8%.\nAll metrics within approved parameters.',
      pearlNote: null,
    },
  ],

  // ── Week 2 ──
  2: [
    {
      id: 'report-w2-central-filing',
      weekNumber: 2,
      authorLabel: 'Central Filing Hall — Operations',
      sectorId: 'central_filing',
      content: 'SECTOR REPORT — Central Filing Hall — Week 2\n\nSTAFFING:    208 associates (-6)\nPROCESSED:   612 documents (avg 3.8 min/doc)\nCOMPLIANCE:  99.1% (+0.5)\nQUEUE WAIT:  9 min (improved)\nTRANSFERS:   6 (destination: various)\n\nPer-associate output increased 4.2% despite reduced headcount.\nEfficiency gains attributed to revised procedures.',
      pearlNote: null,
    },
  ],

  // ── Week 3 ──
  3: [
    {
      id: 'report-w3-central-filing',
      weekNumber: 3,
      authorLabel: 'Central Filing Hall — Operations',
      sectorId: 'central_filing',
      content: 'SECTOR REPORT — Central Filing Hall — Week 3\n\nSTAFFING:    197 associates (-11)\nPROCESSED:   1,247 documents (avg 3.1 min/doc)\nCOMPLIANCE:  99.4% (+0.3)\nQUEUE WAIT:  6 min (improved)\nTRANSFERS:   11 (Wellness Division x3, unspecified x8)\nPRIORITY:    3 cases forwarded to Wellness Division\n\nStaffing reduction of 8% has produced efficiency gain of 26%.\nAll metrics improving.',
      pearlNote: 'Sector efficiency improvements reflect associate commitment to clarity.',
    },
  ],
};
