# Fare checker: London → Tokyo premium economy (browser-backed)

This is a small Playwright-based checker for Google Flights, plus a tiny local web server so you can run searches from a browser on your VPS over VPN/Tailscale.

## What it does

- Uses a real Chromium browser via Playwright
- Searches Google Flights for **London → Tokyo**
- Focuses on **Premium economy** and **Non-stop** offers
- Sweeps a date range and trip lengths
- Writes `output/results.json` and `output/results.csv`
- Can also be driven from a local web UI hosted by this machine

## Install

```bash
npm install
npx playwright install chromium
```

If Chromium is missing system libs on Ubuntu/Debian:

```bash
npx playwright install-deps chromium
```

## Run the local site

```bash
npm run web:build
npm run serve
```

Then open the local hosted URL from your VPN-connected device.

## Quick test

```bash
npm run test:smoke
```

## Wider sweep example

```bash
node google-flights-checker.mjs \
  --start 2026-03-31 \
  --end 2026-12-31 \
  --trip-lengths 7,10,14 \
  --every-days 14 \
  --headed
```

## Outputs

- `output/results.json`
- `output/results.csv`
- `output/error-*.png`

## Limitations

- This is not an official API
- Google UI changes can break parsing
- Large sweeps may hit anti-bot pages
- Best hosted privately over Tailscale/VPN
