# WhisperX Transcription Service — Technical Specification

## Overview

This specification describes the end-to-end experience for a client-facing transcription feature powered by a WhisperX backend. The goal is to deliver a delightful, trustworthy UX for both English and Vietnamese speakers, while keeping the integration surface small and predictable for developers.

The document covers:

1. API contract and sample payloads
2. Vietnamese-first localization details
3. Audio capture guidelines and UX flows
4. Backend processing pipeline
5. Reference client implementation
6. Implementation deliverables and future enhancements

---

## 1. API Overview

### 1.1 Endpoint

**POST** `https://pnnbao97--whisperx-transcriber-transcriptionservice-tran-273f7e.modal.run`

### 1.2 Headers

```
Authorization: Bearer <token>
Accept: application/json
```

### 1.3 Query Parameters

| Name | Type | Required | Default | Description |
|--------------------|---------|----------|---------|-----------------------------------------------------------------------------|
| `language` | string | Yes | `vi` | Target transcription language – `vi`, `en`, or `auto`. Defaults to Vietnamese. |
| `batch_size` | number | No | `16` | WhisperX batch size. Increase only when GPU memory allows. |
| `enable_diarization` | boolean | No | `false` | Enables speaker separation and adds `speaker` labels to segments. |

### 1.4 Multipart Form Body

| Key | Type | Description |
|-------------|------|--------------------------------------------------|
| `audio_file`| file | WAV (preferred), MP3, M4A, or OGG audio payload. |

### 1.5 Response Schema

```json
{
  "language": "vi",
  "duration": 37.62,
  "segments": [
    {
      "id": 0,
      "speaker": "SPEAKER_00",
      "start": 0.03,
      "end": 5.62,
      "text": "Tải dữ liệu để huấn luyện thành công mô hình mới và tạo ra audio chuẩn.",
      "confidence": 0.92,
      "words": [
        { "word": "Tải", "start": 0.03, "end": 0.71, "confidence": 0.88 },
        { "word": "dữ", "start": 0.74, "end": 0.90, "confidence": 0.94 }
      ]
    }
  ]
}
```

---

## 2. Localization & Vietnamese Experience

1. **Vietnamese by default:** Set `language=vi` unless the user explicitly chooses another option. Provide UI copy in Vietnamese first with English translation toggles.
2. **Locale-aware formatting:** Render timestamps using `mm:ss` and decimal separators following the user’s OS locale.
3. **Diacritics preservation:** Ensure the client font stack has good coverage for Vietnamese glyphs (e.g., `Inter`, `Noto Sans`, `Helvetica Neue`).
4. **Helpful empty states:** Provide sample hints written in natural Vietnamese, e.g., `"Nhấn và giữ để bắt đầu ghi âm cuộc họp của bạn."`
5. **Language switcher:** Toggle (button group or segmented control) anchored near the record button. Persist the user’s last choice in local storage.
6. **Quality tips:** Display a compact checklist when Vietnamese is selected:
   - Thu âm cách micro 10–15 cm.
   - Phát âm đầy đủ dấu.
   - Giảm tạp âm nền và tránh tiếng gió.
7. **Transliteration (optional):** Provide a “Copy không dấu” action for users who need ASCII-only exports.

---

## 3. Client Requirements

### 3.1 Audio Input Specifications

- **Formats:** WAV (lossless, preferred), MP3, M4A, OGG.
- **Sample rate:** Minimum 16 kHz; target 44.1 kHz.
- **Channels:** Mono preferred for smaller payloads; stereo accepted.
- **Maximum upload size:** 20 MB (hard limit enforced client-side before upload).
- **Recording length guardrails:** Soft cap at 5 minutes with progress indicator.
- **Noise control:** Apply lightweight noise suppression; prompt user if input level < -40 dB for > 2 seconds.
- **Silence trimming:** Remove leading/trailing silence before upload.

### 3.2 Recording & Upload UX

| State | Key UI Elements |
|------------------|----------------------------------------------------------------------------------------------------------------------------|
| **Idle** | Centered microphone FAB, helper text (`"Nhấn để bắt đầu ghi âm"`). |
| **Recording** | Pulsing gradient ring, waveform reacting to amplitude, elapsed timer (`00:12`). Provide tap-to-pause and swipe-down cancel. |
| **Review** | Waveform scrubber, Play/Pause, “Thu lại” (re-record), “Tải lên” (upload), metadata chips (duration, sample rate, size). |
| **Uploading** | Replace controls with progress bar + status text (`"Đang tải 68%..."`). Disable navigation. |
| **Processing** | Animated waveform loader, text `"Hệ thống đang chuyển giọng nói thành văn bản..."`, optional tips about typical duration. |
| **Error** | Icon, short reason, CTA buttons (“Thử lại”, “Hướng dẫn thu âm”). |

#### UX Guidelines

- Provide haptic feedback on mobile when transitioning between states.
- Keep primary actions consistent: left = destructive/back, right = continue.
- Offer keyboard shortcuts on desktop: `Space` (record/pause), `R` (redo), `Enter` (upload).
- Use color semantics accessible at 4.5:1 contrast. Recording state should not rely solely on color; include motion/waveform cues.
- Keep layout responsive: single-column stack on <768 px, two-column split (controls left, transcript right) on larger screens.

### 3.3 Transcript Viewer

- Display segmented transcript immediately after first chunk arrives (streaming UI).
- For each segment show:
  - Start–end timestamps (clickable to seek audio)
  - Speaker label (e.g., `Người nói A`)
  - Text with diacritics and inline confidence badges for <0.8 words
- Provide actions:
  - Copy full text (Vietnamese & ASCII-only)
  - Download `.srt`, `.vtt`, `.txt`
  - Toggle auto-scroll + highlight “now playing” segment
- Optional: show bilingual output if `language != vi` by hitting translation service.

---

## 4. Backend Processing Workflow

1. **Receive audio**: Validate MIME type, duration, and size before storing.
2. **Pre-processing**:
   - Convert to WAV 16-bit PCM if not already.
   - Normalize to -1 dBFS with short fade-in/out.
   - Trim silence > 500 ms at edges.
3. **Dispatch to WhisperX**:
   - Attach query params (`language`, `batch_size`, `enable_diarization`).
   - Stream upload to reduce latency on large recordings.
4. **WhisperX tasks**:
   - Transcribe with language-specific LM prompts
   - Align timestamps at word level
   - Run speaker diarization if enabled
   - Return JSON response
5. **Post-processing**:
   - Map speaker IDs to friendly labels (“Người nói A/B”)
   - Compute transcript duration & confidence summary
   - Persist transcript + original audio (encrypted) for 24 hours
6. **Client delivery**:
   - Send SSE/websocket events for streaming segments
   - Final event indicates completion and contains download URLs

---

## 5. Example Response (Vietnamese)

```json
{
  "language": "vi",
  "duration": 14.87,
  "segments": [
    {
      "id": 0,
      "speaker": "Người nói A",
      "start": 0.0,
      "end": 4.2,
      "text": "Xin chào cả đội, hôm nay chúng ta rà soát báo cáo tài chính quý ba.",
      "words": [
        { "word": "Xin", "start": 0.0, "end": 0.4 },
        { "word": "chào", "start": 0.4, "end": 0.7 },
        { "word": "cả", "start": 0.7, "end": 0.9 },
        { "word": "đội,", "start": 0.9, "end": 1.2 }
      ]
    },
    {
      "id": 1,
      "speaker": "Người nói B",
      "start": 4.5,
      "end": 9.1,
      "text": "Em sẽ chia sẻ nhanh về bốn hạng mục chi tiêu vượt kế hoạch.",
      "words": [
        { "word": "Em", "start": 4.5, "end": 4.7 }
      ]
    }
  ]
}
```

---

## 6. Sample Python Client

```python
import json
import requests

API = "https://pnnbao97--whisperx-transcriber-transcriptionservice-tran-273f7e.modal.run"
TOKEN = "replace-me"

def transcribe(path: str, language: str = "vi") -> None:
    headers = {"Authorization": f"Bearer {TOKEN}"}
    params = {"language": language, "batch_size": 16, "enable_diarization": True}

    with open(path, "rb") as audio:
        files = {"audio_file": (path, audio, "audio/wav")}
        response = requests.post(API, headers=headers, files=files, params=params, timeout=120)

    if response.ok:
        print(json.dumps(response.json(), indent=2, ensure_ascii=False))
    else:
        raise RuntimeError(f"Lỗi {response.status_code}: {response.text}")

if __name__ == "__main__":
    transcribe("output.wav")
```

---

## 7. Deliverables

1. Production-ready recording widget (desktop + mobile) with localization.
2. Client-side audio normalization, silence trimming, and validations.
3. Upload worker that streams audio, tracks progress, and surfaces retries.
4. Transcript viewer with timestamps, speaker labels, and export actions.
5. Error handling for network failures, validation issues, and WhisperX errors.
6. Documentation for configuring API tokens and environment variables.

---

## 8. Future Enhancements

- Speaker diarization UI with color-coded avatars and timeline.
- Sentence-level translation (vi ↔ en) toggle.
- Auto chaptering / key-point extraction for long meetings.
- Integration with cloud storage (OneDrive, Google Drive) for raw audio.
- Real-time streaming transcription preview.

By following this specification the team delivers a polished, Vietnamese-friendly experience that scales gracefully as new languages and features are added.
