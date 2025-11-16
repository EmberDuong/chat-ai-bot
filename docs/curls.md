# WhisperX API cURL Cheatsheet

Use these commands to hit the production WhisperX endpoint without any mock
layer. Authentication currently relies on the token `chuchimnon999`.

All examples call:

```
https://pnnbao97--whisperx-transcriber-transcriptionservice-tran-273f7e.modal.run
```

## Authentication Options

1. **Inline token** – pass `Authorization: Bearer chuchimnon999` directly in the
   header (fastest for local smoke tests).
2. **.env token** – store the token in an `.env` file so you can source it into
   your shell:

```
# .env
WHISPERX_TOKEN=chuchimnon999
```

Then load it with your preferred method, e.g. `export $(cat .env | xargs)` in
bash or `Get-Content .env | foreach { if ($_ -match '^(.*?)=(.*)$') { Set-Item -Path env:$($matches[1]) -Value $matches[2] } }`
in PowerShell.

## 1. Vietnamese Transcription (default)

```bash
curl -X POST \
  "https://pnnbao97--whisperx-transcriber-transcriptionservice-tran-273f7e.modal.run?language=vi&batch_size=16&enable_diarization=true" \
  -H "Authorization: Bearer chuchimnon999" \
  -F "audio_file=@output.wav"
```

- `language=vi` keeps Vietnamese as the default.
- `enable_diarization=true` adds speaker labels (`Người nói A/B` in the UI).
- Works with WAV/MP3/M4A/OGG files up to ~20 MB.

## 2. English Transcription (no diarization)

```bash
curl -X POST \
  "https://pnnbao97--whisperx-transcriber-transcriptionservice-tran-273f7e.modal.run?language=en&batch_size=8&enable_diarization=false" \
  -H "Authorization: Bearer chuchimnon999" \
  -F "audio_file=@demo_en.mp3"
```

Tune `batch_size` lower if GPU memory is tight or higher for faster throughput.

## 3. Environment Variable Friendly Version

```bash
export WHISPERX_TOKEN="${WHISPERX_TOKEN:-chuchimnon999}"
export AUDIO_FILE="meeting.wav"

curl -X POST \
  "https://pnnbao97--whisperx-transcriber-transcriptionservice-tran-273f7e.modal.run?language=vi&batch_size=16&enable_diarization=true" \
  -H "Authorization: Bearer $WHISPERX_TOKEN" \
  -F "audio_file=@${AUDIO_FILE}"
```

On PowerShell, replace `export` with:

```powershell
if (-not $env:WHISPERX_TOKEN) { $env:WHISPERX_TOKEN = 'chuchimnon999' }
$env:AUDIO_FILE = 'meeting.wav'
```

## 4. Tips

- Expect JSON with `segments`, timestamps, and per-word timing (see
  `docs/whisperx_spec.md` §1.5).
- Handle non-200 responses by surfacing the `status`/`text` back to the user.
- For faster dev loops, keep short Vietnamese clips (~10 s) in `./sample_data`.

Run these commands directly to validate WhisperX quality, then hook the API into
the UI flows captured in `docs/whisperx_spec.md`.
