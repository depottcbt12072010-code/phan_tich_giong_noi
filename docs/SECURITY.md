# Security notes

- Never commit API keys, audio, transcripts, user data, or exported backups.
- This is a single-user local-first prototype; it has no authentication or encrypted-at-rest application layer.
- IndexedDB is scoped to the browser origin, not a password-protected vault. Device/browser access may expose records.
- Gemini requests are external network requests. Obtain consent and remove personally identifying details before sending.
- Browser-side API keys are not secret. Use a restricted key and no billing-enabled key; a local key-holding proxy is the safer follow-up.
- Do not infer deception, hidden thoughts, personality, or mental/medical states from voice.
