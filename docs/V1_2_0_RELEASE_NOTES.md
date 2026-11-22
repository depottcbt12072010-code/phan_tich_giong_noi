# V1.2.0 — Core Intelligence
- Added user-directed cross-record synthesis in Knowledge workspace.
- Locally ranks up to 8 records; if no keyword matches, uses recent records.
- Sends transcript/analysis text only, not audio, after user clicks the AI action.
- Requires source tags [R1...], short evidence quotes, uncertainty, decisions/actions, cross-source differences, and verification questions.
- Stores up to 10 reports locally with source title/date references.
- Fixed duplicate legacy importData definition that overrode audio-aware JSON restore.
- JavaScript syntax checked with Node.js; not live-tested on deployed site/mobile devices.
