export interface StoryBeatConfig {
  beatTitle?: string;
  location?: string;
  objective?: string;
  speaker?: string;
  line?: string;
  pressure?: string;
  learningFocus?: string;
  knownWords?: string[];
  newWords?: string[];
}

interface StoryBeatCardProps {
  storyBeat?: StoryBeatConfig;
}

/**
 * Compact story beat card for student view.
 * Shows only the speaker quote as atmospheric flavor.
 * Teacher metadata (objective, language focus, word lists) is hidden.
 */
export default function StoryBeatCard({ storyBeat }: StoryBeatCardProps) {
  if (!storyBeat) return null;

  const { speaker, line } = storyBeat;

  // Only render if there's a speaker line to show
  if (!speaker || !line) return null;

  return (
    <div className="px-4 py-3 border-l-2 border-neon-cyan/30 bg-white/[0.03] rounded-r-lg">
      <p className="font-ibm-sans text-sm text-white/75 leading-relaxed italic">
        <span className="font-ibm-mono text-neon-cyan/70 not-italic text-xs mr-2">
          {speaker}:
        </span>
        &ldquo;{line}&rdquo;
      </p>
    </div>
  );
}
