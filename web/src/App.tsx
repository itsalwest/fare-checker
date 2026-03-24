import { useMemo, useState } from 'react'
import './App.css'

const tripOptions = [7, 10, 14]

function App() {
  const [start, setStart] = useState('2026-04-01')
  const [end, setEnd] = useState('2026-12-31')
  const [everyDays, setEveryDays] = useState('14')
  const [tripLength, setTripLength] = useState('7,10,14')
  const [headed, setHeaded] = useState(true)

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

  return (
    <div className="shell">
      <header className="hero">
        <div>
          <span className="eyebrow">Fare Checker</span>
          <h1>Direct London → Tokyo premium economy sweeps.</h1>
          <p className="lede">
            A browser-backed Google Flights checker that uses Playwright +
            Chromium to search date ranges and export the cheapest non-stop
            results.
          </p>
          <div className="heroActions">
            <a href="https://github.com/itsalwest/fare-checker" target="_blank" rel="noreferrer">
              View code
            </a>
            <a href="https://github.com/itsalwest/fare-checker#readme" target="_blank" rel="noreferrer">
              Setup guide
            </a>
          </div>
        </div>

        <div className="heroCard">
          <div className="heroMetric">
            <span>Route</span>
            <strong>London → Tokyo</strong>
          </div>
          <div className="heroMetric">
            <span>Cabin</span>
            <strong>Premium economy</strong>
          </div>
          <div className="heroMetric">
            <span>Direct only</span>
            <strong>Parsed from “Non-stop” results</strong>
          </div>
        </div>
      </header>

      <main className="grid">
        <section className="panel panelTall">
          <div className="panelHeader">
            <div>
              <p className="kicker">Command builder</p>
              <h2>Generate a sweep command</h2>
            </div>
            <span className="badge">Local runner</span>
          </div>

          <div className="formGrid">
            <label>
              Start date
              <input type="date" value={start} onChange={(e) => setStart(e.target.value)} />
            </label>
            <label>
              End date
              <input type="date" value={end} onChange={(e) => setEnd(e.target.value)} />
            </label>
            <label>
              Step every X days
              <input type="number" min="1" value={everyDays} onChange={(e) => setEveryDays(e.target.value)} />
            </label>
            <label>
              Trip lengths
              <select value={tripLength} onChange={(e) => setTripLength(e.target.value)}>
                <option value="7">7</option>
                <option value="10">10</option>
                <option value="14">14</option>
                <option value={tripOptions.join(',')}>7,10,14</option>
              </select>
            </label>
            <label className="checkbox">
              <input type="checkbox" checked={headed} onChange={(e) => setHeaded(e.target.checked)} />
              Run headed browser (helps with consent/challenges)
            </label>
          </div>

          <div className="codeBlock">
            <pre>{command}</pre>
            <button type="button" onClick={copy}>Copy command</button>
          </div>
        </section>

        <section className="panel">
          <div className="panelHeader">
            <div>
              <p className="kicker">Quick start</p>
              <h2>How to run it</h2>
            </div>
          </div>
          <ol className="steps">
            <li><code>git clone https://github.com/itsalwest/fare-checker.git</code></li>
            <li><code>cd fare-checker</code></li>
            <li><code>npm install</code></li>
            <li><code>npx playwright install chromium</code></li>
            <li><code>npm run test:smoke</code></li>
          </ol>
        </section>

        <section className="panel">
          <div className="panelHeader">
            <div>
              <p className="kicker">Outputs</p>
              <h2>What you get</h2>
            </div>
          </div>
          <ul className="timeline">
            <li><strong>results.json</strong> — full parsed output</li>
            <li><strong>results.csv</strong> — spreadsheet-friendly summary</li>
            <li><strong>error screenshots</strong> — useful if Google throws a challenge page</li>
          </ul>
        </section>

        <section className="panel">
          <div className="panelHeader">
            <div>
              <p className="kicker">Reality check</p>
              <h2>Limitations</h2>
            </div>
          </div>
          <ul className="incidentList">
            <li>This is not an official Google Flights API.</li>
            <li>Google can still block or challenge large sweeps.</li>
            <li>GitHub Pages can host this UI, but the actual Playwright search must run on a machine/server.</li>
            <li>Direct means results explicitly labeled <strong>Non-stop</strong>.</li>
          </ul>
        </section>
      </main>
    </div>
  )
}

export default App
