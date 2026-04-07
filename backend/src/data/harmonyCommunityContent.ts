/**
 * Static Community Notices and Sector Reports — weeks 1-3.
 * Notices are world-building posts (cafeteria, events, transit).
 * Sector Reports are data-rich department updates.
 * Both use target vocabulary naturally.
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
      content: 'WEEKLY MENU UPDATE — Cafeteria Block 7\n\nStandard meal options have been approved for this shift cycle. Clarity tea service continues at 10:00 and 15:00 (Standard Blend). All associates should check the posted menu before arriving. Submit special dietary requests through Form 12-A. Meal service follows the assigned schedule.',
      pearlNote: null,
    },
    {
      id: 'notice-w1-welcome',
      weekNumber: 1,
      authorLabel: 'Sector 4 Community Center',
      noticeType: 'event',
      content: 'WELCOME EVENT — Sector 4 Community Center\n\nNew associate orientation social — approved recreation activity. Arrive at the Community Center lobby at 18:00 Tuesday. Follow the posted signs to Room 3. A supervisor will confirm attendance. This event has been approved under standard community guidelines.',
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
      content: 'LOST ITEM NOTICE — Transit Hub Delta\n\nA personal identification badge was noticed near Platform 3 this morning. If this item belongs to you, request retrieval at the Transit Information desk. Items not claimed within 48 hours will be removed and forwarded to Personnel Division for review.',
      pearlNote: null,
    },
    {
      id: 'notice-w2-recreation',
      weekNumber: 2,
      authorLabel: 'Recreation Yard 3',
      noticeType: 'general',
      content: 'SCHEDULE CHANGE — Recreation Yard 3\n\nPlease be informed that the Thursday activity schedule has been updated. Some approved activities have been replaced with new options. Citizens who require information about specific changes should compare the updated schedule posted at the yard entrance. Do not remove the posted notice.',
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
      content: 'CAFETERIA UPDATE — Cafeteria Block 7\n\nDue to processing delays in the supply schedule, the afternoon clarity tea service (Calm Chamomile) may experience a brief delay. Maintain your assigned break time. Do not forward complaints to kitchen staff — respond only through the approved feedback process.',
      pearlNote: null,
    },
    {
      id: 'notice-w3-transit',
      weekNumber: 3,
      authorLabel: 'Transit Hub Delta',
      noticeType: 'transit',
      content: 'TRANSIT DELAY ADVISORY — Transit Hub Delta\n\nPlatform 2 service has been separated from the main schedule due to maintenance. Citizens who identify Platform 2 as their regular route should review the temporary schedule posted at the hub. Maintain your standard departure time and process through Platform 4 instead.',
      pearlNote: null,
    },
    {
      id: 'notice-w3-activity',
      weekNumber: 3,
      authorLabel: 'Sector 4 Community Center',
      noticeType: 'general',
      content: 'ACTIVITY STATUS — Sector 4 Community Center\n\nAll remaining Tuesday and Thursday activities have been completed and will not continue in the current schedule. Citizens should not delay their personal routines to identify replacement activities. The Community Center maintains its standard weekday hours for approved purposes only.',
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
      content: 'SECTOR REPORT — Central Filing Hall — Week 1\n\nDocuments processed: 847. Associates on shift: 214. Average processing time: 4.2 minutes per document. Compliance rate: 98.6%. Queue wait time: 12 minutes (standard). New associate intake: 15 this cycle. All metrics within approved parameters.',
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
      content: 'SECTOR REPORT — Central Filing Hall — Week 2\n\nDocuments processed: 612. Associates on shift: 208. Average processing time: 3.8 minutes per document. Compliance rate: 99.1%. Queue wait time: 9 minutes (improved). Associate transfers this week: 6. Updated procedures include revised document comparison protocols.',
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
      content: 'SECTOR REPORT — Central Filing Hall — Week 3\n\nDocuments processed: 1,247. Associates on shift: 197. Average processing time: 3.1 minutes per document. Compliance rate: 99.4%. Queue wait time: 6 minutes (improved). Associate transfers this week: 11. Priority queue cases forwarded to Wellness Division: 3. All efficiency metrics continue to improve.',
      pearlNote: 'Sector efficiency improvements reflect associate commitment to clarity.',
    },
  ],
};
