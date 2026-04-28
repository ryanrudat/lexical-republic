export interface ComplianceCheckQuestion {
  word: string;
  correctDefinition: string;
  distractors: string[];
}

export interface PendingComplianceCheck {
  checkId: string;
  weekIssued: number;
  questions: ComplianceCheckQuestion[];
}

export interface ComplianceCheckIssuedEvent extends PendingComplianceCheck {}
