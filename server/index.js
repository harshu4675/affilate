import express from 'express';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { runExtraction } from './extraction/pipeline.js';
import { createRateLimiter } from './rateLimit.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isDev = process.env.AFFILATE_DEV === '1';
const PORT = Number(process.env.PORT || 8787);
const RATE_MAX = Number(process.env.AFFILATE_RATE_MAX || (isDev ? 120 : 30));

const limiter = createRateLimiter({ windowMs: 60000, max: RATE_MAX });
const diagnosticsLog = [];
const debugEnabled = isDev || process.env.AFFILATE_DEBUG === '1';
const allowedOrigins = new Set(
  String(process.env.AFFILATE_ALLOWED_ORIGINS || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)
);

const app = express();
app.disable('x-powered-by');
app.use((req, res, next) => {
  const origin = req.get('origin');
  if (origin && allowedOrigins.has(origin)) {
    res.set('access-control-allow-origin', origin);
    res.set('vary', 'Origin');
    res.set('access-control-allow-methods', 'GET,POST,OPTIONS');
    res.set('access-control-allow-headers', 'content-type');
  }
  if (req.method === 'OPTIONS') return res.sendStatus(origin && allowedOrigins.has(origin) ? 204 : 403);
  return next();
});
app.use(express.json({ limit: '32kb' }));
app.use('/api', (req, res, next) => {
  res.set('cache-control', 'no-store');
  next();
});

app.get('/api/health', (req, res) => {
  res.json({
    ok: true,
    service: 'affilate-extractor',
    version: '1.0.0',
    time: new Date().toISOString(),
    rateLimit: { windowMs: 60000, max: RATE_MAX }
  });
});

app.get('/api/debug/extractions', (req, res) => {
  if (!debugEnabled) return res.status(404).json({ ok: false, error: { code: 'not_found', message: 'Not found.' } });
  return res.json({ ok: true, data: diagnosticsLog });
});

app.post('/api/extract', async (req, res) => {
  const key = req.ip || 'unknown';
  const limit = limiter(key);
  if (limit.limited) {
    const retryAfter = Math.ceil(limit.retryAfterMs / 1000);
    res.set('retry-after', String(retryAfter));
    return res.status(429).json({
      ok: false,
      error: {
        code: 'rate_limited',
        message: 'Too many extraction requests. Please wait a moment and try again.',
        retryable: true,
        retryAfterMs: limit.retryAfterMs
      }
    });
  }
  const requestedUrl = req.body && req.body.url;
  try {
    const result = await runExtraction({ url: requestedUrl, allowLocal: isDev });
    if (result.diagnostics && debugEnabled) {
      diagnosticsLog.unshift(result.diagnostics);
      if (diagnosticsLog.length > 100) diagnosticsLog.length = 100;
      console.info(
        `[extractor] ${result.diagnostics.id} ${result.ok ? 'ok' : result.error.code} ${result.diagnostics.finalPlatform || result.diagnostics.detectedPlatform || 'unknown'} ${result.diagnostics.durationMs}ms`
      );
    }
    const exposeDiagnostics = debugEnabled && (isDev || req.body.debug === true || req.query.debug === '1');
    const responseBody = exposeDiagnostics ? result : { ...result, diagnostics: undefined };
    if (result.ok) return res.json(responseBody);
    return res.status(statusForCode(result.error.code)).json(responseBody);
  } catch (err) {
    console.error('[extractor] unexpected error:', err);
    return res.status(500).json({
      ok: false,
      error: { code: 'internal', message: 'The extraction service hit an unexpected error. Please try again.', retryable: true }
    });
  }
});

function statusForCode(code) {
  const map = {
    invalid_url: 400,
    unsupported_platform: 400,
    blocked_host: 400,
    no_product: 422,
    not_found: 404,
    blocked: 403,
    rate_limited: 429,
    timeout: 504,
    network_error: 502,
    server_error: 502,
    http_error: 502,
    too_large: 413,
    internal: 500
  };
  return map[code] || 400;
}

const distPath = path.join(__dirname, '..', 'dist');
if (!isDev && fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get(/^\/(?!api\/).*/, (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

app.listen(PORT, '0.0.0.0', () => {
  const mode = isDev ? 'development' : 'production';
  console.log(`[affilate] extraction API listening on http://0.0.0.0:${PORT} (${mode})`);
});
