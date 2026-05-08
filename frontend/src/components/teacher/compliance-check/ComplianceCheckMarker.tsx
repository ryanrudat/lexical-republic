import type { ComplianceCheckTemplate } from '../../../api/compliance-check';

interface Props {
  label: string;
  template: ComplianceCheckTemplate | null;
  onClick: () => void;
}

export default function ComplianceCheckMarker({ label, template, onClick }: Props) {
  const configured = template !== null;
  return (
    <div className="relative flex items-center gap-2 my-2">
      <div
        className={`flex-1 border-t-2 border-dotted ${
          configured ? 'border-cyan-300' : 'border-slate-200'
        }`}
      />
      <button
        onClick={onClick}
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-colors ${
          configured
            ? 'bg-cyan-50 text-cyan-700 border border-cyan-300 hover:bg-cyan-100'
            : 'bg-white text-slate-500 border border-slate-200 hover:text-cyan-700 hover:border-cyan-200 hover:bg-cyan-50'
        }`}
        title={configured ? 'Edit Compliance Check' : 'Add Compliance Check'}
      >
        <span
          className={`font-mono uppercase tracking-[0.2em] text-[9px] ${
            configured ? 'text-cyan-600' : 'text-slate-400'
          }`}
        >
          P.E.A.R.L.
        </span>
        <span className="text-[11px] font-medium">{label}</span>
        {configured ? (
          <span className="text-[10px] text-cyan-600">
            · {template!.title || 'Vocab Check'} · {template!.words.length}w · {template!.questionCount}Q
          </span>
        ) : (
          <span className="text-[10px] text-slate-400 italic">+ Add check</span>
        )}
      </button>
      <div
        className={`flex-1 border-t-2 border-dotted ${
          configured ? 'border-cyan-300' : 'border-slate-200'
        }`}
      />
    </div>
  );
}
