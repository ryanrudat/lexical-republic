import client from './client';

export interface ComplianceCheckCompletionResult {
  success: boolean;
  checkId: string;
  correctCount: number;
  totalCount: number;
  masteryUpdates: number;
  alreadyCompleted?: boolean;
}

export interface ComplianceCheckTemplate {
  id: string;
  classId: string;
  weekNumber: number;
  placement: 'shift_start' | 'shift_end' | 'after_task';
  afterTaskId: string | null;
  title: string | null;
  words: string[];
  questionCount: number;
  cumulativeReviewCount: number;
  createdById: string;
  createdAt: string;
  updatedAt: string;
}

export interface ComplianceCheckResultRow {
  checkId: string;
  pairId: string;
  designation: string | null;
  weekIssued: number;
  templateId: string | null;
  totalCount: number;
  correctCount: number | null;
  issuedAt: string;
  completedAt: string | null;
}

export interface ComplianceCheckResultsResponse {
  classId: string;
  weekFilter: number | null;
  results: ComplianceCheckResultRow[];
}

export interface DictionaryWordRow {
  word: string;
  partOfSpeech: string;
  definition: string;
  weekIntroduced: number;
  toeicCategory: string;
  isWorldBuilding: boolean;
}

export interface DictionaryGroupedResponse {
  grouped: Record<string, DictionaryWordRow[]>;
}

export interface PendingComplianceCheckQuestion {
  word: string;
  correctDefinition: string;
  distractors: string[];
}

export interface PendingComplianceCheck {
  checkId: string;
  templateId: string;
  weekIssued: number;
  title: string | null;
  questions: PendingComplianceCheckQuestion[];
}

// ─── Student-side ───────────────────────────────

export async function fetchPendingComplianceCheck(params: {
  weekNumber: number;
  placement: 'shift_start' | 'shift_end' | 'after_task';
  afterTaskId?: string;
}): Promise<{ pending: PendingComplianceCheck | null }> {
  const { data } = await client.get('/compliance-check/pending', { params });
  return data as { pending: PendingComplianceCheck | null };
}

export async function submitComplianceCheck(params: {
  checkId: string;
  words: Array<{ word: string; correct: boolean }>;
}): Promise<ComplianceCheckCompletionResult> {
  const { data } = await client.post('/compliance-check/complete', params);
  return data as ComplianceCheckCompletionResult;
}

// ─── Teacher: Templates CRUD ────────────────────

export async function listComplianceTemplates(
  classId: string,
  weekNumber?: number,
): Promise<{ templates: ComplianceCheckTemplate[] }> {
  const { data } = await client.get('/compliance-check/templates', {
    params: { classId, ...(weekNumber ? { weekNumber } : {}) },
  });
  return data as { templates: ComplianceCheckTemplate[] };
}

export async function createComplianceTemplate(payload: {
  classId: string;
  weekNumber: number;
  placement: 'shift_start' | 'shift_end' | 'after_task';
  afterTaskId?: string | null;
  title?: string | null;
  words: string[];
  questionCount: number;
  cumulativeReviewCount: number;
}): Promise<{ template: ComplianceCheckTemplate }> {
  const { data } = await client.post('/compliance-check/templates', payload);
  return data as { template: ComplianceCheckTemplate };
}

export async function updateComplianceTemplate(
  id: string,
  payload: Partial<{
    title: string | null;
    words: string[];
    questionCount: number;
    cumulativeReviewCount: number;
  }>,
): Promise<{ template: ComplianceCheckTemplate }> {
  const { data } = await client.put(`/compliance-check/templates/${id}`, payload);
  return data as { template: ComplianceCheckTemplate };
}

export async function deleteComplianceTemplate(id: string): Promise<{ success: boolean }> {
  const { data } = await client.delete(`/compliance-check/templates/${id}`);
  return data as { success: boolean };
}

export interface ShiftSlotTask {
  id: string;
  type: string;
  label: string;
}

export async function fetchShiftSlots(weekNumber: number): Promise<{ weekNumber: number; tasks: ShiftSlotTask[] }> {
  const { data } = await client.get(`/compliance-check/teacher/shifts/${weekNumber}/slots`);
  return data as { weekNumber: number; tasks: ShiftSlotTask[] };
}

// ─── Teacher: Word picker source ────────────────

export async function fetchDictionaryWordsGrouped(toeicOnly = true): Promise<DictionaryGroupedResponse> {
  const { data } = await client.get('/teacher/dictionary-words/grouped', {
    params: { toeicOnly: toeicOnly ? 'true' : 'false' },
  });
  return data as DictionaryGroupedResponse;
}

// ─── Teacher: Results ───────────────────────────

export async function fetchComplianceCheckResults(
  classId: string,
  weekNumber?: number,
): Promise<ComplianceCheckResultsResponse> {
  const { data } = await client.get(
    `/compliance-check/teacher/classes/${classId}/results`,
    { params: weekNumber ? { weekNumber } : {} },
  );
  return data as ComplianceCheckResultsResponse;
}
