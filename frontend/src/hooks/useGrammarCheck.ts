import { useState, useCallback } from 'react';
import { checkGrammar } from '../api/ai';
import type { GrammarError, GrammarCheckResult } from '../api/ai';

interface GrammarCheckConfig {
  weekNumber?: number;
  grammarTargets?: string[];
  knownWords?: string[];
  newWords?: string[];
}

interface UseGrammarCheckReturn {
  /** Trigger a grammar scan */
  scan: (text: string) => Promise<GrammarCheckResult>;
  /** Current errors from last scan */
  errors: GrammarError[];
  /** Whether the text passed with zero errors */
  isClean: boolean;
  /** Whether a scan is in progress */
  isScanning: boolean;
  /** Whether the AI service is degraded (timeout / error / no keys) */
  isDegraded: boolean;
  /** Reset state */
  reset: () => void;
}

export function useGrammarCheck(config: GrammarCheckConfig = {}): UseGrammarCheckReturn {
  const [errors, setErrors] = useState<GrammarError[]>([]);
  const [isClean, setIsClean] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [isDegraded, setIsDegraded] = useState(false);

  const scan = useCallback(
    async (text: string): Promise<GrammarCheckResult> => {
      setIsScanning(true);
      setIsDegraded(false);

      try {
        const result = await checkGrammar(
          text,
          config.weekNumber,
          config.grammarTargets,
          config.knownWords,
          config.newWords,
        );

        setErrors(result.errors);
        setIsClean(result.isClean);
        setIsDegraded(result.isDegraded);
        setIsScanning(false);

        return result;
      } catch {
        // Network error → fail-open
        const degradedResult: GrammarCheckResult = {
          errors: [],
          errorCount: 0,
          isClean: true,
          isDegraded: true,
        };
        setErrors([]);
        setIsClean(true);
        setIsDegraded(true);
        setIsScanning(false);
        return degradedResult;
      }
    },
    [config.weekNumber, config.grammarTargets, config.knownWords, config.newWords],
  );

  const reset = useCallback(() => {
    setErrors([]);
    setIsClean(false);
    setIsScanning(false);
    setIsDegraded(false);
  }, []);

  return { scan, errors, isClean, isScanning, isDegraded, reset };
}
