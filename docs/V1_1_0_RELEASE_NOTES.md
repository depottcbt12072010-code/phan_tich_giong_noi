# V1.1.0 — Local-first usability milestone

## Included
- Mobile microphone preflight and more actionable permission errors.
- Recorder selects a browser-supported MIME type (including MP4 for Safari when supported).
- Local Knowledge view: keyword retrieval over title/transcript/analysis and repeated-word topic hints.
- JSON backup/restore includes audio blobs as data URLs.
- Cache version bumped to V1.1.0.

## Known limits
- Local search is keyword-based, not semantic vector search.
- Repeated terms are hints, not AI conclusions.
- Browser storage is device/browser-specific. Export backups regularly.
- Gemini API key used from GitHub Pages is visible to the browser environment; this remains a prototype limitation. Do not commit key or enable billing.
- Gemini model availability and Free Tier quota may change.
- Needs real device testing on iOS Safari and Android Chrome before production use.
\n- Gemini fallback model candidates are discovered from the API model catalog for the current key; unknown hard-coded fallback IDs are avoided.\n