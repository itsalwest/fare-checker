import { useMemo, useState } from 'react'
import './App.css'

type SearchResponse = {
  results?: Array<{
    departDate: string
    returnDate: string
    tripLength: number
    totalDirectOffersFound: number
    cheapestDirect: null | {
      priceText: string
      priceValue: number
      airline: string
      duration: string
      route: string
      departTime: string
      arriveTime: string
    }
  }>
  cheapestOverall?: {
    departDate: string
    returnDate: string
    tripLength: number
    cheapestDirect: {
      priceText: string
      airline: string
      duration: string
      route: string
    }
  } | null
  error?: string
}

const tripOptions = [7, 10, 14]

function App() {
  const [start, setStart] = useState('2026-04-01')
  const [end, setEnd] = useState('2026-12-31')
  const [everyDays, setEveryDays] = useState('14')
  const [tripLength, setTripLength] = useState('7,10,14')
  const [headed, setHeaded] = useState(true)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<SearchResponse | null>(null)

  const command = useMemo(() => {
    const headedFlag = headed ? ' \\\n  --headed' : ''
    return `node google-flights-checker.mjs \\
  --start ${start} \\
  --end ${end} \\
  --trip-lengths ${tripLength} \\
  --every-days ${everyDays}${headedFlag}`
  }, [start, end, tripLength, everyDays, headed])

  const copy = async () => {
    await navigator.clipboard.writeText(command)
  }

  const runSearch = async () => {
    setLoading(true)
    setResult(null)
    try {
      const response = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          start,
          end,
          everyDays: Number(everyDays),
          tripLengths: tripLength,
          headed,
          maxQueries: 6,
        }),
      })
      const data = (await response.json()) as SearchResponse
      setResult(data)
    } catch (error) {
      setResult({ error: error instanceof Error ? error.message : 'Request failed' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="shell">
      <header className="hero">
        <div>
          <span className="eyebrow">Fare Checker</span>
          <h1>Direct London → Tokyo premium economy sweeps.</h1>
          <p className="lede">
            A browser-backed Google Flights checker that uses Playwright + Chromium to search date ranges and surface the cheapest non-stop results.
          </p>
          <div className="heroActions">
            <a href="https://github.com/itsalwest/fare-checker" target="_blank" rel="noreferrer">View code</a>
            <button type="button" onClick={runSearch} disabled={loading}>{loading ? 'Searching…' : 'Run local search'}</button>
          </div>
        </div>

        <div className="heroCard">
          <div className="heroMetric"><span>Route</span><strong>London → Tokyo</strong></div>
          <div className="heroMetric"><span>Cabin</span><strong>Premium economy</strong></div>
          <div className="heroMetric"><span>Direct only</span><strong>Parsed from “Non-stop” results</strong></div>
        </div>
      </header>

      <main className="grid">
        <section className="panel panelTall">
          <div className="panelHeader">
            <div><p className="kicker">Search config</p><h2>Run it from this machine</h2></div>
            <span className="badge">Local runner</span>
          </div>

          <div className="formGrid">
            <label>Start date<input type="date" value={start} onChange={(e) => setStart(e.target.value)} /></label>
            <label>End date<input type="date" value={end} onChange={(e) => setEnd(e.target.value)} /></label>
            <label>Step every X days<input type="number" min="1" value={everyDays} onChange={(e) => setEveryDays(e.target.value)} /></label>
            <label>
              Trip lengths
              <select value={tripLength} onChange={(e) => setTripLength(e.target.value)}>
                <option value="7">7</option>
                <option value="10">10</option>
                <option value="14">14</option>
                <option value={tripOptions.join(',')}>7,10,14</option>
              </select>
            </label>
            <label className="checkbox"><input type="checkbox" checked={headed} onChange={(e) => setHeaded(e.target.checked)} />Run headed browser (helps with consent/challenges)</label>
          </div>

          <div className="codeBlock">
            <pre>{command}</pre>
            <button type="button" onClick={copy}>Copy CLI command</button>
          </div>
        </section>

        <section className="panel">
          <div className="panelHeader"><div><p className="kicker">Results</p><h2>Cheapest found</h2></div></div>
          {result?.error && <p className="errorBox">{result.error}</p>}
          {!result && !loading && <p className="muted">Run a search to see local results here.</p>}
          {result?.cheapestOverall && (
            <div className="resultCard">
              <strong>{result.cheapestOverall.cheapestDirect.priceText}</strong>
              <p>{result.cheapestOverall.departDate} → {result.cheapestOverall.returnDate}</p>
              <p>{result.cheapestOverall.cheapestDirect.airline} · {result.cheapestOverall.cheapestDirect.duration}</p>
            </div>
          )}
          <div className="resultList">
            {result?.results?.slice(0, 5).map((item) => (
              <article className="checkCard" key={`${item.departDate}-${item.returnDate}`}>
                <div className="checkTop">
                  <div>
                    <h3>{item.departDate} → {item.returnDate}</h3>
                    <p>{item.tripLength} nights · {item.totalDirectOffersFound} direct offers</p>
                  </div>
                  <span className="status healthy">{item.cheapestDirect?.priceText ?? 'none'}</span>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="panel">
          <div className="panelHeader"><div><p className="kicker">Quick start</p><h2>How to run manually</h2></div></div>
          <ol className="steps">
            <li><code>npm install</code></li>
            <li><code>npx playwright install chromium</code></li>
            <li><code>npm run web:build</code></li>
            <li><code>npm run serve</code></li>
          </ol>
        </section>

        <section className="panel">
          <div className="panelHeader"><div><p className="kicker">Reality check</p><h2>Notes</h2></div></div>
          <ul className="incidentList">
            <li>This runs on the machine you host it on, not in GitHub Pages.</li>
            <li>Google can still challenge or block bigger sweeps.</li>
            <li>Best used over your VPN / Tailscale, not public internet.</li>
          </ul>
        </section>
      </main>
    </div>
  )
}

export default App
