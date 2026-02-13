interface CharacterPortraitProps {
  name?: string;
  expression?: string;
}

export default function CharacterPortrait({ name = 'Unknown', expression = 'neutral' }: CharacterPortraitProps) {
  return (
    <div className="relative w-24 h-24 flex-shrink-0">
      {/* Silhouette placeholder — green-tinted monochrome */}
      <div className="w-full h-full border border-terminal-border bg-terminal-bg flex items-center justify-center overflow-hidden">
        <svg viewBox="0 0 80 80" className="w-16 h-16 text-terminal-green-dim">
          {/* Head */}
          <circle cx="40" cy="28" r="14" fill="currentColor" opacity="0.5" />
          {/* Body */}
          <ellipse cx="40" cy="62" rx="20" ry="18" fill="currentColor" opacity="0.4" />
          {/* Expression indicator */}
          {expression === 'neutral' && (
            <>
              <circle cx="35" cy="26" r="2" fill="#33ff33" opacity="0.6" />
              <circle cx="45" cy="26" r="2" fill="#33ff33" opacity="0.6" />
              <line x1="35" y1="33" x2="45" y2="33" stroke="#33ff33" strokeWidth="1.5" opacity="0.4" />
            </>
          )}
          {expression === 'stern' && (
            <>
              <line x1="32" y1="24" x2="38" y2="26" stroke="#33ff33" strokeWidth="1.5" opacity="0.6" />
              <line x1="42" y1="26" x2="48" y2="24" stroke="#33ff33" strokeWidth="1.5" opacity="0.6" />
              <line x1="35" y1="34" x2="45" y2="32" stroke="#33ff33" strokeWidth="1.5" opacity="0.4" />
            </>
          )}
        </svg>
      </div>

      {/* Name label */}
      <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-terminal-bg border border-terminal-border px-2 py-0.5">
        <span className="font-ibm-mono text-[10px] text-terminal-green-dim uppercase tracking-wider whitespace-nowrap">
          {name}
        </span>
      </div>
    </div>
  );
}
