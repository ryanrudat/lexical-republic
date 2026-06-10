// ─── TOEIC target-word enrichment for the DictionaryWord migration ───────────
//
// `WeekConfig.targetWords` are bare strings. The `ensureDictionaryWordsForAllWeeks`
// startup migration (weekConfigMigrations.ts) needs real definition / phonetic /
// Mandarin / example data to insert usable `DictionaryWord` rows — a row with an
// empty definition would still make Compliance/Remediation skip the word.
//
// Keyed by lowercase word. W1–W3 words already have rows from `prisma/seed.ts`;
// the migration only CREATES missing rows, so adding W1–3 here is harmless (it
// never overwrites the richer seed data). The 5 W4 "Black Words" (witness,
// relative, individual, independent, private) are deliberately ABSENT — they are
// narrative B1 vocabulary, not TOEIC targets, and must stay out of the TOEIC
// mastery / Compliance / Remediation pipeline.

export interface WordEnrichment {
  partOfSpeech: string;
  phonetic: string;
  definition: string;
  exampleSentence: string;
  translationZhTw: string;
  toeicCategory: string;
  wordFamilyGroup?: string | null;
}

export const WORD_ENRICHMENT: Record<string, WordEnrichment> = {
  // ── Week 4 — Activity Reconciliation (10 TOEIC targets) ──
  arrange: {
    partOfSpeech: 'verb',
    phonetic: '/əˈreɪndʒ/',
    definition: 'To put things in a careful or planned order.',
    exampleSentence: 'Please arrange the observations in time order before filing.',
    translationZhTw: '安排；整理',
    toeicCategory: 'office',
    wordFamilyGroup: 'arrange',
  },
  collect: {
    partOfSpeech: 'verb',
    phonetic: '/kəˈlekt/',
    definition: 'To bring or gather things together into one place.',
    exampleSentence: 'The associate collected all the relevant files before the deadline.',
    translationZhTw: '收集；蒐集',
    toeicCategory: 'office',
    wordFamilyGroup: 'collect',
  },
  examine: {
    partOfSpeech: 'verb',
    phonetic: '/ɪɡˈzæm.ɪn/',
    definition: 'To look at something closely and carefully in order to check it.',
    exampleSentence: 'Examine each observation before you confirm the record.',
    translationZhTw: '檢查；審查',
    toeicCategory: 'inspection',
    wordFamilyGroup: 'examine',
  },
  indicate: {
    partOfSpeech: 'verb',
    phonetic: '/ˈɪn.dɪ.keɪt/',
    definition: 'To show, point out, or make something clear.',
    exampleSentence: 'The team indicated one observation for review.',
    translationZhTw: '指出；表明',
    toeicCategory: 'communication',
    wordFamilyGroup: 'indicate',
  },
  locate: {
    partOfSpeech: 'verb',
    phonetic: '/loʊˈkeɪt/',
    definition: 'To find the exact position or place of something.',
    exampleSentence: 'We could not locate the missing file in the Records Wing.',
    translationZhTw: '找到；定位',
    toeicCategory: 'logistics',
    wordFamilyGroup: 'locate',
  },
  organize: {
    partOfSpeech: 'verb',
    phonetic: '/ˈɔːr.ɡə.naɪz/',
    definition: 'To put things into a clear, tidy system so they are easy to find.',
    exampleSentence: 'Organize the records by week number before filing.',
    translationZhTw: '組織；整理',
    toeicCategory: 'office',
    wordFamilyGroup: 'organize',
  },
  present: {
    partOfSpeech: 'verb',
    phonetic: '/prɪˈzent/',
    definition: 'To show or give something to someone in a formal way.',
    exampleSentence: 'Associate-15 must present an amended record to the supervisor.',
    translationZhTw: '提出；呈現',
    toeicCategory: 'business',
    wordFamilyGroup: 'present',
  },
  record: {
    partOfSpeech: 'verb',
    phonetic: '/rɪˈkɔːrd/',
    definition: 'To write down information so that it is kept; (noun) a written account that is kept.',
    exampleSentence: 'The system records each entry automatically.',
    translationZhTw: '記錄；紀錄',
    toeicCategory: 'office',
    wordFamilyGroup: 'record',
  },
  select: {
    partOfSpeech: 'verb',
    phonetic: '/sɪˈlekt/',
    definition: 'To choose something carefully from a group.',
    exampleSentence: 'The Archive selects which observations enter the permanent record.',
    translationZhTw: '選擇；挑選',
    toeicCategory: 'business',
    wordFamilyGroup: 'select',
  },
  verify: {
    partOfSpeech: 'verb',
    phonetic: '/ˈver.ɪ.faɪ/',
    definition: 'To check that something is true, correct, or accurate.',
    exampleSentence: 'Verify the morning observations before you file the report.',
    translationZhTw: '核實；查證',
    toeicCategory: 'inspection',
    wordFamilyGroup: 'verify',
  },
};
