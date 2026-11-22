# VOICE INTELLIGENCE AI V2.0.1 — Stability Hotfix

## Root cause in V2.0.0
The official V2.0.0 bundle contained an orphaned JavaScript token `async` on its own line immediately after `downloadBlob()` in `assets/js/app.js`. The browser evaluated it as an identifier and raised:

`Uncaught ReferenceError: async is not defined`

Because this error occurred while loading the application script, the startup IIFE did not reach `bind()`. This prevented event handlers from being registered and made the navigation and primary controls appear nonfunctional.

## Fixes
- Removed the orphaned `async` token.
- Updated backup metadata to identify V2.0.1.
- Bumped static asset version query strings and Service Worker cache name.
- Service Worker now calls `skipWaiting()` and `clients.claim()` so the deployed fix activates promptly.
- Report date changes invalidate the previous output; AI analysis rebuilds the report for the selected date range before analyzing, preventing stale-range results.
- Cache cleanup is limited to cache names belonging to this application, avoiding deletion of unrelated origin caches.
- Navigation requests use network-first with cached app fallback; versioned JS/CSS assets are precached.

## Verification performed
- JavaScript syntax check with Node.js: passed.
- Checked direct DOM IDs referenced by application code against HTML; only record-detail elements created dynamically at runtime are absent from static markup.
- Checked all navigation targets correspond to existing views.
- Checked report controls and handlers are present.
- Ran a Node-based startup harness with minimal DOM and IndexedDB mocks: no startup exceptions; all six navigation handlers registered; create/save of a text-only record passed; local report included the saved record.
- A real HTTPS GitHub Pages/browser-device UAT, microphone recording, and Gemini API call have not been performed in this environment and should be checked after deployment.

## Upgrade
Replace the repository contents with this full V2.0.1 package, commit, and let GitHub Pages deploy. Close all app tabs and reopen the URL; then perform one hard reload (`Ctrl+Shift+R`). Export a JSON backup before upgrading as a precaution.
