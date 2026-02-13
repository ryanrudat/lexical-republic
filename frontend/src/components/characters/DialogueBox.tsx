import { useState, useEffect, useRef } from 'react';
import CharacterPortrait from './CharacterPortrait';

interface DialogueBoxProps {
  characterName?: string;
  expression?: string;
  text: string;
  onComplete?: () => void;
  visible?: boolean;
}

export default function DialogueBox({
  characterName = 'Unknown',
  expression = 'neutral',
  text,
  onComplete,
  visible = true,
}: DialogueBoxProps) {
  const [displayedText, setDisplayedText] = useState('');
  const [isComplete, setIsComplete] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!visible || !text) return;

    setDisplayedText('');
    setIsComplete(false);
    let i = 0;

    intervalRef.current = setInterval(() => {
      if (i < text.length) {
        setDisplayedText(text.slice(0, i + 1));
        i++;
      } else {
        if (intervalRef.current) clearInterval(intervalRef.current);
        setIsComplete(true);
        onComplete?.();
      }
    }, 30);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [text, visible, onComplete]);

  const skipToEnd = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setDisplayedText(text);
    setIsComplete(true);
    onComplete?.();
  };

  if (!visible) return null;

  return (
    <div
      className="relative z-10 w-full max-w-2xl mx-auto cursor-pointer"
      onClick={skipToEnd}
    >
      <div className="bg-terminal-bg/90 border border-terminal-border p-4 flex gap-4">
        <CharacterPortrait name={characterName} expression={expression} />

        <div className="flex-1 min-h-[60px] flex items-center">
          <p className={`font-ibm-sans text-base text-terminal-green leading-relaxed ${!isComplete ? 'typewriter-cursor' : ''}`}>
            {displayedText}
          </p>
        </div>
      </div>

      {/* Click indicator */}
      {isComplete && (
        <div className="absolute bottom-2 right-4 animate-bounce">
          <span className="font-ibm-mono text-xs text-terminal-green-dim">{'\u25BC'}</span>
        </div>
      )}
    </div>
  );
}
