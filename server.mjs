#!/usr/bin/env node
import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs/promises';
import os from 'node:os';
import { spawn } from 'node:child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const webDist = path.join(__dirname, 'web', 'dist');
const checker = path.join(__dirname, 'google-flights-checker.mjs');
const app = express();
app.use(express.json({ limit: '1mb' }));
app.use(express.static(webDist));

function runChecker(params) {
  return new Promise(async (resolve, reject) => {
    const outDir = await fs.mkdtemp(path.join(os.tmpdir(), 'fare-checker-'));
    const args = [
      checker,
      '--from', params.from || 'London',
      '--to', params.to || 'Tokyo',
      '--start', params.start,
      '--end', params.end,
      '--trip-lengths', params.tripLengths || '7,10,14',
      '--every-days', String(params.everyDays || 14),
      '--max-queries', String(params.maxQueries || 6),
      '--out-dir', outDir,
      '--timeout-ms', String(params.timeoutMs || 120000),
      '--delay-ms', String(params.delayMs || 2500),
    ];
    if (params.headed) args.push('--headed');

    const child = spawn(process.execPath, args, { cwd: __dirname });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (d) => (stdout += d.toString()));
    child.stderr.on('data', (d) => (stderr += d.toString()));
    child.on('error', reject);
    child.on('close', async (code) => {
      try {
        const resultsPath = path.join(outDir, 'results.json');
        const raw = await fs.readFile(resultsPath, 'utf8');
        const parsed = JSON.parse(raw);
        resolve({ code, stdout, stderr, outDir, ...parsed });
      } catch (err) {
        reject(new Error(`checker failed (${code}): ${stderr || stdout || err.message}`));
      }
    });
  });
}

app.post('/api/search', async (req, res) => {
  try {
    const { start, end } = req.body || {};
    if (!start || !end) return res.status(400).json({ error: 'start and end are required' });
    const result = await runChecker(req.body || {});
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

app.use((_req, res) => {
  res.sendFile(path.join(webDist, 'index.html'));
});

const host = process.env.HOST || '0.0.0.0';
const port = Number(process.env.PORT || 4318);
app.listen(port, host, () => {
  console.log(`fare-checker listening on http://${host}:${port}`);
});
