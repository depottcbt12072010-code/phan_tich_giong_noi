# VOICE INTELLIGENCE AI V1.0 FREE — GitHub Pages prototype

Vietnamese-first PWA starter for personal voice records and text analysis.

## Included in this build
- Responsive dashboard and navigation
- Microphone recording through MediaRecorder
- Import an audio file and attach it to a record
- Local record storage with IndexedDB
- Record library, search, detail and playback
- Transcript/notes input
- Gemini text analysis and audio transcription module (optional)
- Basic offline sentence extraction (not semantic AI)
- Gemini audio transcription for short recordings (converts supported browser audio to 16 kHz mono WAV before sending)
- JSON export/import of text metadata and transcripts
- PWA manifest and service worker

## Important limitations of this prototype
- This is an initial working prototype, not a fully production-audited release.
- Local Whisper is not wired in this release. Short audio can be transcribed using Gemini Free Tier; this requires an API key and internet access.
- Gemini text analysis sends the text in the analysis box. The new “Chép lời bằng Gemini” action sends the selected recording's audio to Google for transcription. Use only non-sensitive recordings; review Google's current Free Tier data-use terms.
- The Gemini API key is held only in JavaScript memory for the current page session, but a browser-side key is still visible to the device user/network inspection. Do not put a personal or billing-enabled key here. Use a restricted key and Free Tier only. A secure local proxy can be added in a later version.
- Records and audio are stored in the browser's IndexedDB. Clearing site data can delete them. Export backups regularly. Audio is not included in JSON backup.
- PWA installation requires HTTPS (GitHub Pages provides HTTPS).
- The app has no account/login or cloud synchronization in this free local-first edition.

## Publish on GitHub Pages
1. Create a repository named `voice-intelligence-ai`.
2. For GitHub Free Pages, make the repository public. Do not upload private recordings, transcripts, API keys, or backup files.
3. Upload the contents of this folder to the repository root (the `index.html` must be at root).
4. Repository → Settings → Pages.
5. Under Build and deployment, select `Deploy from a branch`.
6. Select branch `main` and folder `/ (root)`, then Save.
7. Wait for the Pages URL to appear, open it over HTTPS, and test microphone permissions.
8. On iPhone Safari, use Share → Add to Home Screen.

## Privacy and cost
- GitHub Pages hosts only the static application code.
- User audio/transcripts stay in local browser storage unless the user explicitly exports or sends text to Gemini.
- Gemini Free Tier has usage limits and data-use terms. It is not unlimited or guaranteed to remain free. Do not enable billing if the goal is zero spend.
- Never commit an API key. This prototype's session-only key input is convenient but not a secure secret vault.

## Test checklist
- [ ] Load dashboard and navigate between views
- [ ] Create a text-only record and save
- [ ] Record a short audio clip (allow microphone)
- [ ] Play audio from library/detail
- [ ] Search records
- [ ] Export JSON and re-import it
- [ ] Test Gemini with non-sensitive sample text and a restricted Free Tier key
- [ ] Verify data persists after reload

## V1.0.1 — audio transcription
1. Open **Cài đặt** and enter your Gemini API key for the current tab session.
2. Open a record with an attached audio file.
3. Choose **Chép lời bằng Gemini**. The app converts browser-recorded audio to mono 16 kHz WAV where possible and sends it to `gemini-3.5-flash-lite`.
4. Review the transcript, correct names/numbers, then choose **Lưu transcript**.
5. You can download the original audio from the record details.

This browser-only API key can be inspected by the person using the browser. Never commit the key to GitHub. Gemini Free Tier has quotas and its data-use terms may permit use of submitted content to improve Google products; do not send confidential recordings. No paid billing should be enabled for the zero-cost setup.
