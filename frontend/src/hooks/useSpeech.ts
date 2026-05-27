import { useCallback, useEffect, useState } from 'react';

// ─── useSpeech — browser text-to-speech ──────────────────────────
//
// Thin wrapper over the Web Speech API for the "Clean the intercept"
// listening activity: a synthetic voice reads the recording aloud (on-theme
// — it sounds like a Party surveillance playback). Zero audio assets.
//
// `supported` is false on the rare locked-down device with no speech; the
// listening activity stays solvable from context there, so no one's stuck.
// Rate is slowed for A2–B1 clarity, and playback is replayable on demand.

export function useSpeech() {
  const supported =
    typeof window !== 'undefined' && 'speechSynthesis' in window;
  const [speaking, setSpeaking] = useState(false);

  useEffect(() => {
    if (!supported) return;
    // Some browsers populate the voice list asynchronously — touching it
    // here warms it up so the first play isn't silent.
    window.speechSynthesis.getVoices();
    return () => {
      window.speechSynthesis.cancel();
    };
  }, [supported]);

  const speak = useCallback(
    (text: string) => {
      if (!supported) return;
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.rate = 0.85; // a touch slow for learners
      u.onend = () => setSpeaking(false);
      u.onerror = () => setSpeaking(false);
      setSpeaking(true);
      window.speechSynthesis.speak(u);
    },
    [supported],
  );

  return { speak, speaking, supported };
}
