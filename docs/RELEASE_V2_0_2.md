# VOICE INTELLIGENCE AI V2.0.2 — Gemini Model Routing Hotfix

## Root cause
V2.0.1 fetched the Gemini Models list, sorted all models containing "flash", and selected the first few. A model's presence in the Models API response does not guarantee that `generateContent` is available for the user's project/key. The request path also stopped immediately on HTTP 404, so it never tried a valid fallback model.

## Fix
- Stable-first model chain: `gemini-3.8-flash`, `gemini-3.6-flash`, `gemini-3.5-flash-lite`.
- Additional model discovery is restricted to Gemini 3 Flash models and is appended after the curated stable candidates.
- Model-specific HTTP 404, and model-specific 400/403 errors, advance to the next candidate instead of aborting the whole analysis.
- HTTP 429 remains a quota stop; the app does not repeatedly try models against a rate-limit response.
- Error status now reports the last attempted model, the API error text, and how many model IDs were tried.
- Model-list session cache key bumped to v2.
- App and Service Worker version/cache bumped to V2.0.2 to prevent stale JS.

## Verification
- Node.js syntax check for `app.js` and `sw.js`.
- Controlled mocked API test: first model returns 404, second model returns 404, third model succeeds; confirms automatic fallback and success model reporting.
- Checked HTML for duplicate IDs and version/cache marker consistency.
- HTML IDs/navigation and report handlers remain unchanged from the V2.0.1 stability fix.
- Real Gemini key/project permissions and actual GitHub Pages deployment cannot be tested from this environment. If all documented model IDs return 404/403, the API key/project may lack generation access; the new status will show exact API message and attempted model list.

## Official model references
The current Google Gemini API model/pricing documentation lists `gemini-3.8-flash`, `gemini-3.6-flash`, and `gemini-3.5-flash-lite` as Flash model IDs. Access and free quotas can still vary by project/key and change over time.
