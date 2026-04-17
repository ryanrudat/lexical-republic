import client from './client';

export interface PearlFeedbackPayload {
  taskType: string;
  taskContext: string;
  studentText: string;
  weekNumber: number;
}

export interface PearlFeedbackResponse {
  pearlFeedback: string;
}

const FEEDBACK_FALLBACKS = [
  'Submission registered, Citizen. The Ministry has noted your work.',
  'Processing complete. Continue your assigned duties.',
  'Your contribution to compliance has been catalogued.',
];

function randomFallback(): string {
  return FEEDBACK_FALLBACKS[Math.floor(Math.random() * FEEDBACK_FALLBACKS.length)];
}

/**
 * Fetch in-character PEARL commentary on the student's reasoning.
 * Never throws — returns a canned fallback line on network/server failure
 * so the UI can always show a PEARL response.
 */
export async function fetchPearlFeedback(
  payload: PearlFeedbackPayload,
): Promise<PearlFeedbackResponse> {
  try {
    const { data } = await client.post<PearlFeedbackResponse>('/pearl-feedback', payload);
    if (data && typeof data.pearlFeedback === 'string' && data.pearlFeedback.trim().length > 0) {
      return { pearlFeedback: data.pearlFeedback };
    }
    return { pearlFeedback: randomFallback() };
  } catch {
    return { pearlFeedback: randomFallback() };
  }
}
