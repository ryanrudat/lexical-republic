export type WordStatus = 'approved' | 'monitored' | 'grey' | 'proscribed' | 'recovered';

export interface DictionaryWord {
  id: string;
  word: string;
  partOfSpeech: string;
  phonetic: string;
  partyDefinition: string;
  trueDefinition: string;
  exampleSentence: string;
  toeicCategory: string;
  wordFamilyGroup: string | null;
  weekIntroduced: number;
  isWorldBuilding: boolean;
  status: WordStatus;
  mastery: number;
  encounters: number;
  isRecovered: boolean;
  studentNotes: string;
  lastSeenAt: string | null;
}

export interface DictionaryStats {
  total: number;
  targetWords: number;
  worldBuildingWords: number;
  byStatus: Record<string, number>;
  averageMastery: number;
  totalEncounters: number;
}

export interface WordFamily {
  id: string;
  groupId: string;
  rootWord: string;
  members: string[];
}

export interface WordStatusEvent {
  id: string;
  wordId: string;
  fromStatus: WordStatus;
  toStatus: WordStatus;
  weekNumber: number;
  reason: string;
  createdAt: string;
}

export type DictionaryFilter = 'all' | 'target' | 'world-building' | WordStatus;
