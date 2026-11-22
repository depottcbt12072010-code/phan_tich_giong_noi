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

## V1.1.0 — audio transcription
1. Open **Cài đặt** and enter your Gemini API key for the current tab session.
2. Open a record with an attached audio file.
3. Choose **Chép lời bằng Gemini**. The app converts browser-recorded audio to mono 16 kHz WAV where possible and sends it to `gemini-3.5-flash-lite`.
4. Review the transcript, correct names/numbers, then choose **Lưu transcript**.
5. You can download the original audio from the record details.

This browser-only API key can be inspected by the person using the browser. Never commit the key to GitHub. Gemini Free Tier has quotas and its data-use terms may permit use of submitted content to improve Google products; do not send confidential recordings. No paid billing should be enabled for the zero-cost setup.


V1.1.0 bổ sung retry có giới hạn, exponential backoff + jitter, fallback qua các model Gemini và thông báo phân loại lỗi 429/5xx. Xem `docs/GEMINI_RELIABILITY.md`.


## V1.1.0
- Added local Knowledge search across record title, transcript, and analysis.
- Added local repeated-topic keyword suggestions.
- Improved microphone diagnostics and recorder MIME selection for mobile browsers.
- JSON backup/restore includes audio blobs (base64); large backups may exceed mobile browser memory.
- No cloud storage or paid backend required; Gemini remains optional and its free quota is not guaranteed.


## V1.2.0 — Core Intelligence
See `docs/V1_2_0_RELEASE_NOTES.md`. Cross-record synthesis requires Gemini key and available Free Tier quota; local search remains free.


## V1.3.0 — Decision & Action Tracking
See `docs/V1_3_0_RELEASE_NOTES.md`. Action extraction uses Gemini when the user explicitly runs it; action list/statuses remain local.


## V1.4.0 — Progress Review
See `docs/V1_4_0_RELEASE_NOTES.md`. AI comparison is manual and evidence-based; it never automatically updates action statuses.


# V2.0.0 — Bản tổng hợp chính thức

V2.0.0 hợp nhất các năng lực ghi âm, thư viện bản ghi, transcript, phân tích AI, kho tri thức, tổng hợp liên bản ghi, theo dõi hành động, đối chiếu tiến triển và báo cáo dữ liệu/AI vào một phiên bản thống nhất. Xem `docs/RELEASE_V2_0_0.md`.

## Cập nhật GitHub Pages
1. Tải và giải nén gói V2.0.0.
2. Trước khi thay file, mở ứng dụng hiện tại và vào Cài đặt → Xuất dữ liệu để tạo backup JSON.
3. Trong repository GitHub, thay toàn bộ các file trong thư mục `voice-intelligence-ai` bằng nội dung trong thư mục giải nén (giữ đúng cấu trúc thư mục).
4. Commit thay đổi; chờ GitHub Pages hoàn tất deploy.
5. Mở trang bằng HTTPS, làm mới trang. Nếu giao diện cũ còn cache, đóng tab ứng dụng và mở lại; Service Worker V2.0.0 tự thay cache cũ.
6. Vào Cài đặt → Nhập dữ liệu, chọn file backup nếu dữ liệu chưa hiện.
7. Kiểm tra bản ghi cũ, phát audio, transcript, kho tri thức, theo dõi hành động và mục Báo cáo tổng hợp.

Không nhập API key vào file mã nguồn. Chỉ nhập trong Cài đặt của ứng dụng khi cần gọi Gemini.


## V2.0.1 — Stability Hotfix

V2.0.1 fixes an application-startup JavaScript error in the V2.0.0 official package (`async is not defined` at `app.js:308`) that prevented `bind()` from running. It also improves Service Worker activation and cache isolation. See `docs/RELEASE_V2_0_1.md` for the exact root cause and upgrade steps.


## V2.0.2 — Gemini Model Routing Hotfix

V2.0.2 addresses Gemini generation requests returning HTTP 404 for a model selected by the previous model-list strategy. It tries stable documented Flash model IDs in order and automatically advances to the next model when the API reports a model-specific 404 (or model-specific 400/403). It preserves quota errors (429) without repeated retries, improves diagnostics with the last model and API message, and bumps the service-worker cache. See `docs/RELEASE_V2_0_2.md`.

V2.0.2 uses stable-first model routing (`gemini-3.8-flash` → `gemini-3.6-flash` → `gemini-3.5-flash-lite`) and skips model-specific 404 responses. See `docs/RELEASE_V2_0_2.md`.
