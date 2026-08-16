import { useCallback, useState } from 'react';
import { extractProduct } from '../services/api.js';
import { validateUrlInput } from '../extraction/urlValidation.js';
import { detectPlatformFromUrl } from '../extraction/platformDetection.js';
import { extractionErrorInfo } from '../extraction/errors.js';

export function useExtraction() {
  const [phase, setPhase] = useState('idle');
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [platform, setPlatform] = useState(null);
  const [attempt, setAttempt] = useState(0);

  const run = useCallback(async (input) => {
    setError(null);
    setResult(null);
    const check = validateUrlInput(input);
    if (!check.valid) {
      setPhase('error');
      setPlatform(detectPlatformFromUrl(input));
      setError(extractionErrorInfo(check.empty ? 'empty_url' : 'invalid_url', { retryable: false }));
      setAttempt((n) => n + 1);
      return null;
    }
    setPhase('validating');
    setPlatform(detectPlatformFromUrl(input));
    try {
      setPhase('extracting');
      const data = await extractProduct(input);
      setPhase('processing');
      await new Promise((resolve) => setTimeout(resolve, 400));
      setResult(data);
      setPhase('done');
      return data;
    } catch (err) {
      const code = err && err.code ? err.code : 'network_error';
      setError(extractionErrorInfo(code, err));
      setPhase('error');
      return null;
    } finally {
      setAttempt((n) => n + 1);
    }
  }, []);

  const reset = useCallback(() => {
    setPhase('idle');
    setError(null);
    setResult(null);
    setPlatform(null);
  }, []);

  return { phase, error, result, platform, attempt, run, reset };
}
