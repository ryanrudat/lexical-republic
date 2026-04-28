import { useState } from 'react';
import ComplianceCheckShell from '../components/compliance-check/ComplianceCheckShell';
import type { ComplianceCheckQuestion } from '../types/complianceCheck';

const SAMPLE_QUESTIONS: ComplianceCheckQuestion[] = [
  {
    word: 'archive',
    correctDefinition: 'A storage system for past records',
    distractors: ['A formal warning notice', 'A weekly compliance review'],
  },
  {
    word: 'verify',
    correctDefinition: 'To check that something is true or accurate',
    distractors: ['To request approval from a supervisor', 'To remove a citizen from a list'],
  },
  {
    word: 'submit',
    correctDefinition: 'To formally send for review or decision',
    distractors: ['To delay an action until later', 'To privately discuss with a peer'],
  },
];

export default function ComplianceCheckPreview() {
  const [key, setKey] = useState(0);

  return (
    <div className="fixed inset-0 overflow-hidden">
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(circle at 20% 30%, #fce4ec 0%, transparent 40%),' +
            'radial-gradient(circle at 80% 70%, #b3e5fc 0%, transparent 40%),' +
            'linear-gradient(135deg, #fff9c4 0%, #e1bee7 100%)',
        }}
      />

      <div className="absolute top-4 left-4 right-4 z-[200] flex items-center justify-between">
        <div className="font-ibm-mono text-[10px] text-slate-700 tracking-[0.2em] bg-white/70 px-3 py-1.5 rounded-lg">
          PREVIEW — /preview/compliance-check
        </div>
        <button
          onClick={() => setKey((k) => k + 1)}
          className="font-ibm-mono text-[11px] tracking-[0.15em] bg-cyan-600 hover:bg-cyan-700 active:scale-[0.97] text-white px-4 py-2 rounded-lg shadow-lg shadow-cyan-500/30 transition-all"
        >
          REPLAY ANIMATION
        </button>
      </div>

      <ComplianceCheckShell
        key={key}
        questions={SAMPLE_QUESTIONS}
        onComplete={(_results, correctCount) => {
          // eslint-disable-next-line no-console
          console.log('Compliance Check complete:', correctCount, '/', SAMPLE_QUESTIONS.length);
        }}
      />
    </div>
  );
}
