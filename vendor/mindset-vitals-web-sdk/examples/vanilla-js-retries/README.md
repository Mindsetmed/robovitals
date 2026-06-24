# Vitals Web SDK - Vanilla JavaScript Example (with Retries)

The same end-to-end flow as the [`vanilla-js`](../vanilla-js) example, but instead
of a single measurement session it measures up to a few times and aggregates the
results. Start here if your app needs more than one attempt to collect every
vital.

For the full backend/API walkthrough, security model, and endpoint reference, see
the [`vanilla-js` README](../vanilla-js/README.md). This README only covers what
is different.

## Quick Start

```bash
npm install
cp .env.example .env
# Edit .env with your Mindset API credentials
npm start
```

Then open `http://localhost:3005` in your browser (set `PORT` in `.env` to change it).

## What's different from vanilla-js

The SDK measures ONE session per `start()`/`stop()` and does not retry on its
own. This example adds an app-level retry loop (`measureWithRetries` in
`public/app.js`) that:

1. Measures the authorized vitals.
2. Keeps any vital that came back (aggregated in `collected`).
3. If something is still missing, it does NOT auto-retry. It prompts the user:
   the Start button becomes **Retry** and Stop becomes **Done**.
   - **Retry** runs another attempt, re-measuring only the still-missing vitals.
   - **Done** stops and submits what's been collected so far.
4. Stops early once every wanted vital has a reading, or after `MAX_ATTEMPTS`
   total (default 3).
5. Submits once, after the loop finishes.

All attempts in a session aggregate into the **same** `pro_submission`. A NEW
session (the Start button reads **Start New Session** once a result is submitted)
creates a fresh PRO via a `POST /patient/new-pro` backend call, so it doesn't
overwrite the previous one. Retries do not create extra PROs; only new sessions do.

### Aggregation across attempts

Readings accumulate across attempts. Each attempt re-measures only the vitals
still missing, so a vital read on an earlier attempt is kept even when a later
attempt re-measures the others.

Example: RR comes back on attempt 1 and PR on attempt 2. The final submitted
result contains both.

### Submission shape

The loop returns the last attempt's SDK result with the aggregated readings
merged in, so the submitted payload keeps the SDK envelope (`webAppVersion`,
`frameCollectionMethod`, `timestamp`, etc.). `signsMsgs` is the most recent
attempt that actually logged signs messages; earlier attempts go in
`prevSignsMsgs` (newest-first). The payload is otherwise identical to the
one-shot example, so the same `POST /patient/vitals` backend handles it
unchanged.

### Where to look

- `public/app.js`
  - `MAX_ATTEMPTS` - how many attempts to allow (ceiling, not a target)
  - `gotReading(tag, value)` - whether a vital has a usable reading. Only checks
    that a value exists; tighten to clinical ranges here if you want to reject
    and retry out-of-range readings.
  - `measureOnce(vitals)` - runs one attempt, resolves on its `stop` event
  - `waitForRetry(...)` - the Retry/Done prompt shown between attempts
  - `measureWithRetries(wantedVitals)` - the retry/aggregate loop

## Notes

- Between attempts the example waits for the user to tap **Retry** or **Done**;
  it does not auto-advance to the next attempt.
- **Stop**/**Done** during an attempt ends that attempt; the collected vitals so
  far are kept and submitted.
- Submission happens once, after the loop, not on each `stop` event.
- The attempt counter shown to the user only appears on retries (2/3, 3/3), never
  "1/3".

## License

UNLICENSED - For demonstration purposes only
