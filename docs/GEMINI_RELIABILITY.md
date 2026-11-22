# VOICE INTELLIGENCE AI — Gemini reliability (V1.0.5)

## Request resilience
- Primary model: `gemini-3.8-flash`
- Fallback models are discovered from the Gemini `models.list` API and filtered to models supporting `generateContent` with Flash in the name. The app does not invent fallback model IDs.
- Each model gets at most two attempts for transient HTTP/network failures.
- Uses capped exponential backoff with jitter and honors `Retry-After`/RetryInfo when available.
- Request timeout: 60 seconds.
- 429 quota/rate-limit errors stop automatic retries and explain how to check AI Studio limits.
- 4xx configuration errors do not retry.
- Transcript/text stays in the input and is not erased when an API call fails.

## Important limitation
GitHub Pages is static. The Gemini API key is used in the browser and is therefore not a server-side secret. Keep it session-only, restrict it to the Gemini API and the deployed site referrer where supported, never commit it, and do not use a key with billing enabled for a zero-cost setup. This is a personal-use prototype, not a secure multi-user production backend.

## Free-tier reality
Free-tier model access and quotas can change and shared inference capacity may return 503 even when the project is below quota. Retry/fallback improves resilience but cannot guarantee availability or unlimited free usage. Google may process free-tier submitted content under its free-tier terms.
