import client from './client';

export interface ComplianceCheckCompletionResult {
  success: boolean;
  checkId: string;
  correctCount: number;
  totalCount: number;
  masteryUpdates: number;
  alreadyCompleted?: boolean;
}

export interface ComplianceCheckIssueResult {
  success: boolean;
  checkId: string;
  totalCount: number;
}

export interface ComplianceCheckClassIssueResult {
  success: boolean;
  issued: number;
  classId: string;
  weekNumber: number;
}

export interface ComplianceCheckResultRow {
  checkId: string;
  pairId: string;
  designation: string | null;
  weekIssued: number;
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

export async function submitComplianceCheck(params: {
  checkId: string;
  words: Array<{ word: string; correct: boolean }>;
}): Promise<ComplianceCheckCompletionResult> {
  const { data } = await client.post('/compliance-check/complete', params);
  return data as ComplianceCheckCompletionResult;
}

export async function issueComplianceCheckForStudent(
  studentId: string,
  params: { weekNumber: number; questionCount: number },
): Promise<ComplianceCheckIssueResult> {
  const { data } = await client.post(
    `/compliance-check/teacher/students/${studentId}/issue`,
    params,
  );
  return data as ComplianceCheckIssueResult;
}

export async function issueComplianceCheckForClass(
  classId: string,
  params: { weekNumber: number; questionCount: number },
): Promise<ComplianceCheckClassIssueResult> {
  const { data } = await client.post(
    `/compliance-check/teacher/classes/${classId}/issue`,
    params,
  );
  return data as ComplianceCheckClassIssueResult;
}

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

