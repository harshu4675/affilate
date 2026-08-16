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

const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '32kb' }));

app.get('/api/health', (req, res) => {
  res.json({
    ok: true,
    service: 'affilate-extractor',
    version: '1.0.0',
    time: new Date().toISOString(),
    rateLimit: { windowMs: 60000, max: RATE_MAX }
  });
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
    if (result.ok) return res.json(result);
    return res.status(statusForCode(result.error.code)).json(result);
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
