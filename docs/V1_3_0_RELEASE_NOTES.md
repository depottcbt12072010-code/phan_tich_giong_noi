# V1.3.0 — Decision & Action Tracking
- Added Gemini-assisted extraction of decisions/actions from locally ranked transcripts.
- Creates trackable items with task, explicitly stated owner/date, source reference and short source quote.
- Does not invent owners or deadlines; missing values marked "Chưa nêu".
- Local status workflow: Chưa làm / Đang làm / Hoàn thành; manual deletion.
- Items stored locally in browser; transcript text sent only on user action; original audio is not sent.
- Deduplicates against existing task text (case-insensitive exact match).
- JavaScript syntax checked. Not live-tested against user's GitHub Pages/Gemini quota/device.
