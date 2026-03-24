#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { chromium } from 'playwright';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

function parseArgs(argv) {
  const out = {
    from: 'London',
    to: 'Tokyo',
    cabin: 'Premium economy',
    tripLengths: [7, 10, 14],
    everyDays: 14,
    start: new Date().toISOString().slice(0, 10),
    end: `${new Date().getUTCFullYear()}-12-31`,
    headless: true,
    timeoutMs: 120000,
    slowMoMs: 0,
    outDir: path.resolve('output'),
    screenshotOnError: true,
    maxQueries: Infinity,
    delayMs: 2500,
    currency: 'GBP',
    locale: 'en-GB',
    region: 'GB',
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    const next = () => argv[++i];
    if (arg === '--from') out.from = next();
    else if (arg === '--to') out.to = next();
    else if (arg === '--start') out.start = next();
    else if (arg === '--end') out.end = next();
    else if (arg === '--trip-lengths') out.tripLengths = next().split(',').map(Number).filter(Boolean);
    else if (arg === '--every-days') out.everyDays = Number(next());
    else if (arg === '--headed') out.headless = false;
    else if (arg === '--headless') out.headless = true;
    else if (arg === '--timeout-ms') out.timeoutMs = Number(next());
    else if (arg === '--slow-mo-ms') out.slowMoMs = Number(next());
    else if (arg === '--out-dir') out.outDir = path.resolve(next());
    else if (arg === '--max-queries') out.maxQueries = Number(next());
    else if (arg === '--delay-ms') out.delayMs = Number(next());
    else if (arg === '--help' || arg === '-h') out.help = true;
  }
  return out;
}

function usage() {
  console.log(`Google Flights checker (Playwright)

Options:
  --from "London"            Origin city/airport query
  --to "Tokyo"               Destination city/airport query
  --start YYYY-MM-DD         First departure date to test
  --end YYYY-MM-DD           Last departure date to test
  --trip-lengths 7,10,14     Return lengths in days
  --every-days 14            Step between departure dates
  --max-queries 6            Limit searches for test runs
  --headed                   Run visible browser (useful if blocked)
  --out-dir ./output         Where CSV/JSON/screenshots go
  --delay-ms 2500            Delay between searches

Examples:
  node google-flights-checker.mjs --start 2026-03-31 --end 2026-04-30 --trip-lengths 7 --every-days 7 --max-queries 2
  node google-flights-checker.mjs --start 2026-03-31 --end 2026-12-31 --trip-lengths 7,10,14 --every-days 14 --headed
`);
}

function fmtMonthLabel(date) {
  const m = MONTHS[date.getUTCMonth()];
  const y = date.getUTCFullYear();
  return y === new Date().getUTCFullYear() ? m : `${m} ${y}`;
}

function ymdToUtcDate(s) {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function addDays(date, days) {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

function toYmd(date) {
  return date.toISOString().slice(0, 10);
}

function buildQueries({ start, end, everyDays, tripLengths, maxQueries }) {
  const queries = [];
  const startDate = ymdToUtcDate(start);
  const endDate = ymdToUtcDate(end);
  for (let depart = new Date(startDate); depart <= endDate; depart = addDays(depart, everyDays)) {
    for (const tripLength of tripLengths) {
      const ret = addDays(depart, tripLength);
      if (ret > endDate) continue;
      queries.push({
        departDate: toYmd(depart),
        returnDate: toYmd(ret),
        tripLength,
      });
      if (queries.length >= maxQueries) return queries;
    }
  }
  return queries;
}

async function acceptCookies(page) {
  const btn = page.getByRole('button', { name: /accept all/i });
  if (await btn.count()) {
    await btn.first().click();
    await page.waitForTimeout(2500);
  }
}

async function setLocation(page, labelRegex, value) {
  const box = page.getByRole('combobox', { name: labelRegex }).first();
  await box.click();
  await box.fill(value);
  await page.waitForTimeout(1200);
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(800);
}

async function setCabin(page, cabinName) {
  await page.locator('[role="combobox"]:visible').filter({ hasText: /^Economy$|^Premium economy$|^Business$|^First$/ }).first().click();
  await page.waitForTimeout(300);
  await page.getByRole('option', { name: new RegExp(`^${cabinName}$`, 'i') }).click();
  await page.waitForTimeout(500);
}

async function selectDateRange(page, departDate, returnDate) {
  const dep = ymdToUtcDate(departDate);
  const ret = ymdToUtcDate(returnDate);
  await page.locator('input[aria-label="Departure"]:visible').first().click();
  await page.waitForTimeout(500);
  await clickCalendarDay(page, dep);
  await page.waitForTimeout(250);
  await clickCalendarDay(page, ret);
  await page.waitForTimeout(250);
  await page.getByRole('button', { name: /^Done/ }).click();
  await page.waitForTimeout(500);
}

async function clickCalendarDay(page, date) {
  const months = await page.locator('.Bc6Ryd.ydXJud .BgYkof.B5dqIf.qZwLKe').evaluateAll(els => els.map(el => (el.textContent || '').trim()));
  const label = fmtMonthLabel(date);
  const idx = months.indexOf(label);
  if (idx === -1) throw new Error(`Calendar month not visible: ${label}`);
  const day = String(date.getUTCDate());
  const target = page.locator('.Bc6Ryd.ydXJud').nth(idx).locator('div[role="gridcell"]').filter({ hasText: new RegExp(`^${day}$`) }).last();
  await target.click();
}

function checkBlocked(text, title) {
  const hay = `${title}\n${text}`.toLowerCase();
  return hay.includes('before you continue') || hay.includes('unusual traffic') || hay.includes('captcha');
}

function parseDirectOffers(text) {
  const lines = text
    .replace(/\u00a0/g, ' ')
    .split('\n')
    .map(x => x.trim())
    .filter(Boolean);

  const offers = [];
  for (let i = 0; i < lines.length; i++) {
    if (lines[i] !== 'Non-stop') continue;
    const price = lines.slice(i + 1, i + 8).find(x => /^£[\d,]+$/.test(x));
    const route = lines[i - 1] || '';
    const duration = lines[i - 2] || '';
    const airline = lines[i - 3] || '';
    const arrive = lines[i - 4] || '';
    const dash = lines[i - 5] || '';
    const depart = lines[i - 6] || '';
    if (!price || !/^[A-Z]{3}–[A-Z]{3}$/.test(route)) continue;
    offers.push({
      departTime: depart,
      separator: dash,
      arriveTime: arrive,
      airline,
      duration,
      route,
      stops: 'Non-stop',
      priceText: price,
      priceValue: Number(price.replace(/[£,]/g, '')),
    });
  }
  const deduped = [];
  const seen = new Set();
  for (const offer of offers) {
    const key = JSON.stringify(offer);
    if (!seen.has(key)) {
      seen.add(key);
      deduped.push(offer);
    }
  }
  deduped.sort((a, b) => a.priceValue - b.priceValue);
  return deduped;
}

async function runSingleQuery(page, cfg, query, index, total) {
  const { from, to, cabin, timeoutMs, locale, region, currency } = cfg;
  const url = `https://www.google.com/travel/flights?hl=${encodeURIComponent(locale)}&gl=${encodeURIComponent(region)}&curr=${encodeURIComponent(currency)}`;
  console.log(`\n[${index + 1}/${total}] ${query.departDate} -> ${query.returnDate} (${query.tripLength} nights)`);
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: timeoutMs });
  await page.waitForTimeout(1500);
  await acceptCookies(page);
  await selectDateRange(page, query.departDate, query.returnDate);
  await setLocation(page, /where from/i, from);
  await setLocation(page, /where to/i, to);
  await setCabin(page, cabin);
  await page.getByRole('button', { name: /^Search/ }).click();
  await page.waitForURL(/\/travel\/flights\/search/, { timeout: timeoutMs });
  await page.waitForTimeout(12000);
  const title = await page.title();
  const text = await page.locator('body').innerText();
  if (checkBlocked(text, title)) {
    throw new Error('Google block / consent / captcha page detected');
  }
  const directOffers = parseDirectOffers(text);
  const cheapest = directOffers[0] || null;
  return {
    ...query,
    searchUrl: page.url(),
    totalDirectOffersFound: directOffers.length,
    cheapestDirect: cheapest,
    allDirectOffers: directOffers,
  };
}

async function main() {
  const cfg = parseArgs(process.argv.slice(2));
  if (cfg.help) return usage();
  await fs.mkdir(cfg.outDir, { recursive: true });
  const queries = buildQueries(cfg);
  console.log(`Planned ${queries.length} searches`);
  if (!queries.length) throw new Error('No queries generated. Check --start/--end/--trip-lengths.');

  const browser = await chromium.launch({ headless: cfg.headless, slowMo: cfg.slowMoMs });
  const page = await browser.newPage({ viewport: { width: 1440, height: 2200 } });
  const results = [];

  try {
    for (let i = 0; i < queries.length; i++) {
      try {
        const result = await runSingleQuery(page, cfg, queries[i], i, queries.length);
        const price = result.cheapestDirect?.priceText || 'none';
        console.log(`  cheapest direct: ${price} (${result.totalDirectOffersFound} direct offers parsed)`);
        results.push(result);
      } catch (err) {
        const stamp = `${i + 1}-${queries[i].departDate}-${queries[i].returnDate}`;
        console.error(`  FAILED: ${err.message}`);
        if (cfg.screenshotOnError) {
          const shot = path.join(cfg.outDir, `error-${stamp}.png`);
          await page.screenshot({ path: shot, fullPage: true }).catch(() => {});
          console.error(`  screenshot: ${shot}`);
        }
        results.push({ ...queries[i], error: err.message, searchUrl: page.url() });
      }
      if (i < queries.length - 1) await page.waitForTimeout(cfg.delayMs);
    }
  } finally {
    await browser.close();
  }

  const jsonPath = path.join(cfg.outDir, 'results.json');
  const csvPath = path.join(cfg.outDir, 'results.csv');
  await fs.writeFile(jsonPath, JSON.stringify({ generatedAt: new Date().toISOString(), config: cfg, results }, null, 2));
  const csvLines = [
    'departDate,returnDate,tripLength,cheapestDirectPrice,airline,route,duration,searchUrl,error',
    ...results.map(r => {
      const c = r.cheapestDirect || {};
      const esc = (v) => `"${String(v ?? '').replaceAll('"', '""')}"`;
      return [r.departDate, r.returnDate, r.tripLength, c.priceText || '', c.airline || '', c.route || '', c.duration || '', r.searchUrl || '', r.error || ''].map(esc).join(',');
    }),
  ];
  await fs.writeFile(csvPath, `${csvLines.join('\n')}\n`);

  const best = results.filter(r => r.cheapestDirect).sort((a, b) => a.cheapestDirect.priceValue - b.cheapestDirect.priceValue)[0];
  console.log(`\nWrote:\n- ${jsonPath}\n- ${csvPath}`);
  if (best) {
    console.log(`Best direct fare found: ${best.cheapestDirect.priceText} (${best.departDate} -> ${best.returnDate}, ${best.cheapestDirect.airline}, ${best.cheapestDirect.route})`);
  } else {
    console.log('No direct fares parsed in this run. Check screenshots / results.json.');
  }
}

main().catch(err => {
  console.error(err);
  process.exitCode = 1;
});
