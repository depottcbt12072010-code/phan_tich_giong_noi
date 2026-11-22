# Product direction — VOICE INTELLIGENCE AI

This project is developed as one coherent personal voice-knowledge workspace, not a sequence of disconnected feature patches.

## Core workflow
1. Capture audio or import a recording.
2. Preserve the original audio and user-correctable transcript.
3. Search and organize a local personal knowledge store.
4. Connect information across records with source references.
5. Track explicitly stated decisions and actions.
6. Compare evidence across time and produce source-grounded reports.
7. Back up and restore the user's local data.

## Platform and privacy
- Static PWA on GitHub Pages; local-first IndexedDB storage.
- Gemini is optional and only invoked by an explicit user action.
- Only text/transcript is sent for text-based analysis; audio is sent only for a user-requested audio transcription workflow.
- No inference of hidden thoughts, intent, honesty, personality, or diagnosis from voice.
- API keys in a browser app are not secret; never commit a key or use a billing-enabled key for a zero-cost setup.
- Data is per browser/device unless the user exports and imports a backup.

## Release status
V2.0.1 is the stability hotfix for the consolidated V2.0.0 package. The product should be validated end-to-end before adding new feature scope.
