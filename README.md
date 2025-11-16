# chat-ai-bot

Simple front-end playground for the WhisperX transcription service. Record audio
in the browser or upload an existing file, then send it directly to the
production Modal endpoint with the shared token `chuchimnon999`.

## Frontend Quick Start

1. Serve the `frontend` directory (required so the browser can access
   microphone APIs). Any static server works, e.g.:

   ```bash
   cd frontend
   python -m http.server 4173
   # or: npx serve .
   ```

2. Open `http://localhost:4173` (or whichever port you used).
3. Accept microphone permissions if you want to record inside the app.
4. Keep the default token (`chuchimnon999`) or paste your own bearer token.
5. Record audio or select an existing WAV/MP3/M4A/OGG file.
6. Hit **Gửi đến WhisperX** to call the production API and inspect the JSON
   response live.

### Features

- Vietnamese-first UI copy that mirrors the specification in `docs/`.
- Microphone recording with timer, file metadata preview, and re-record flow.
- File upload path for existing clips with drag & drop or explicit chooser
  (plus duration/sample-rate detection).
- Configurable language, batch size, and diarization toggle.
- Transcript viewer showing per-segment speaker labels and timestamps.
- Raw JSON viewer for debugging or downstream integration.
