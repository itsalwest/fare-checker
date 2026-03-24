# Fare checker: London → Tokyo premium economy (browser-backed)

This is a small Playwright CLI that uses a real Chromium browser to query **Google Flights** and extract **non-stop** round-trip fares for **Premium economy**.

Why this exists: static fetches and cheap scraping approaches get blocked fast on flight sites. This uses an actual browser session instead.

## What it does

- Opens Google Flights in Chromium
- Accepts cookie consent if shown
- Sets dates, route, and cabin
- Runs searches across a date sweep
- Parses **non-stop** offers from the result page text
- Writes `output/results.json` and `output/results.csv`
- Saves screenshots on failures/block pages

## Install

Already done on this box during setup, but on a fresh machine:

```bash
npm install
npx playwright install chromium
```

If Chromium fails to launch on Ubuntu/Debian, you may also need system libs:

```bash
npx playwright install-deps chromium
```

## Quick test

```bash
cd /root/.openclaw/workspace/fare-checker
node google-flights-checker.mjs \
  --start 2026-03-31 \
  --end 2026-04-30 \
  --trip-lengths 7 \
  --every-days 7 \
  --max-queries 2
```

## Wider sweep across the rest of 2026

```bash
cd /root/.openclaw/workspace/fare-checker
node google-flights-checker.mjs \
  --start 2026-03-31 \
  --end 2026-12-31 \
  --trip-lengths 7,10,14 \
  --every-days 14 \
  --headed
```

Notes:
- `--headed` is useful if Google throws a block / consent / challenge page.
- More searches = more time + higher chance of anti-bot friction.
- Keep the sweep fairly coarse first, then zoom in around promising dates.

## Outputs

- `output/results.json` — full parsed data and config
- `output/results.csv` — spreadsheet-friendly summary
- `output/error-*.png` — screenshots for failed searches

## Limitations

- Parsing is based on current Google Flights page text structure, so Google UI changes can break it.
- This is not an official API.
- Past dates cannot be queried.
- Anti-bot / block pages can still happen, especially on large sweeps.
- "Direct" here means parsed from results labeled **Non-stop**.

## Useful flags

- `--headed` — visible browser
- `--max-queries N` — cap run size while testing
- `--every-days N` — search cadence
- `--trip-lengths 7,10,14` — return lengths to test
- `--out-dir path` — alternate output folder
