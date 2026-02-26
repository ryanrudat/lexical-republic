import { useDictionaryStore } from '../../stores/dictionaryStore';

interface Props {
  variant?: 'office' | 'terminal';
}

export default function DictionaryIcon({ variant = 'terminal' }: Props) {
  const { toggle, isOpen, words } = useDictionaryStore();
  const wordCount = words.length;

  const isOffice = variant === 'office';

  return (
    <button
      onClick={toggle}
      className="relative group transition-all duration-200"
      title="Party Lexical Dictionary"
      style={{ opacity: isOpen ? 0.5 : 1 }}
    >
      {/* Book shape */}
      <div
        className="relative flex items-center justify-center transition-transform duration-200 group-hover:rotate-[-15deg]"
        style={{
          width: 24,
          height: 28,
        }}
      >
        {/* Book body */}
        <svg width="24" height="28" viewBox="0 0 24 28" fill="none">
          {/* Book cover */}
          <rect x="2" y="2" width="18" height="24" rx="2"
            fill={isOffice ? '#2a2520' : '#0d1a0d'}
            stroke={isOffice ? '#a88636' : '#00cc6a'}
            strokeWidth="1.5"
          />
          {/* Book spine */}
          <line x1="6" y1="2" x2="6" y2="26"
            stroke={isOffice ? '#a88636' : '#00cc6a'}
            strokeWidth="1"
            opacity="0.5"
          />
          {/* Seal circle */}
          <circle cx="13" cy="14" r="4"
            fill="none"
            stroke={isOffice ? '#d4a847' : '#00ff88'}
            strokeWidth="0.8"
            opacity="0.6"
          />
          {/* Seal L */}
          <text x="13" y="16.5"
            textAnchor="middle"
            fontSize="6"
            fontFamily="IBM Plex Mono"
            fontWeight="600"
            fill={isOffice ? '#d4a847' : '#00ff88'}
            opacity="0.8"
          >
            L
          </text>
        </svg>

        {/* Green glow pulse */}
        {!isOpen && (
          <div
            className="absolute inset-0 rounded animate-pulse"
            style={{
              boxShadow: `0 0 8px ${isOffice ? 'rgba(212,168,71,0.3)' : 'rgba(0,255,136,0.3)'}`,
              animationDuration: '2s',
            }}
          />
        )}
      </div>

      {/* Word count badge */}
      {wordCount > 0 && (
        <div
          className="absolute -top-1.5 -right-1.5 min-w-[16px] h-[16px] flex items-center justify-center rounded-full font-ibm-mono text-[8px] font-bold"
          style={{
            background: isOffice ? '#d4a847' : '#00cc6a',
            color: '#0a0f0a',
          }}
        >
          {wordCount}
        </div>
      )}
    </button>
  );
}
