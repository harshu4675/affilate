import { useCallback, useEffect, useRef, useState } from 'react';
import { extractProduct } from '../services/api.js';
import { validateUrlInput } from '../extraction/urlValidation.js';
import { detectPlatformFromUrl } from '../extraction/platformDetection.js';
import { extractionErrorInfo } from '../extraction/errors.js';

const nextFrame = () =>
  new Promise((resolve) => {
    if (typeof requestAnimationFrame === 'function') requestAnimationFrame(() => resolve());
    else setTimeout(resolve, 0);
  });

export function useExtraction() {
  const [phase, setPhase] = useState('idle');
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [platform, setPlatform] = useState(null);
  const [attempt, setAttempt] = useState(0);
  const controllerRef = useRef(null);

  useEffect(() => () => controllerRef.current && controllerRef.current.abort(), []);

  const run = useCallback(async (input) => {
    if (controllerRef.current) controllerRef.current.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    setError(null);
    setResult(null);
    setPhase('validating');
    await nextFrame();

    const check = validateUrlInput(input);
    if (!check.valid) {
      setPhase('error');
      setPlatform(detectPlatformFromUrl(input));
      setError(extractionErrorInfo(check.empty ? 'empty_url' : 'invalid_url', { retryable: false }));
      setAttempt((count) => count + 1);
      controllerRef.current = null;
      return null;
    }

    setPhase('detecting');
    const detected = detectPlatformFromUrl(input);
    setPlatform(detected);
    await nextFrame();

    try {
      setPhase('extracting');
      const data = await extractProduct(input, { signal: controller.signal });
      setPhase('processing');
      await nextFrame();
      const images = data && data.product && Array.isArray(data.product.images) ? data.product.images : [];
      const processed = {
        ...data,
        product: {
          ...data.product,
          images: images.filter((image) => typeof image === 'string' && /^https?:\/\//i.test(image))
        }
      };
      setPhase('preparing');
      await nextFrame();
      setResult(processed);
      setPhase('done');
      return processed;
    } catch (err) {
      if (controller.signal.aborted) return null;
      const code = err && err.code ? err.code : 'network_error';
      setError(extractionErrorInfo(code, err));
      setPhase('error');
      return null;
    } finally {
      if (controllerRef.current === controller) controllerRef.current = null;
      setAttempt((count) => count + 1);
    }
  }, []);

  const reset = useCallback(() => {
    if (controllerRef.current) controllerRef.current.abort();
    controllerRef.current = null;
    setPhase('idle');
    setError(null);
    setResult(null);
    setPlatform(null);
  }, []);

  return { phase, error, result, platform, attempt, run, reset };
}
