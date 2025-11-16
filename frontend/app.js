const API_URL = "https://pnnbao97--whisperx-transcriber-transcriptionservice-tran-273f7e.modal.run";
const DEFAULT_TOKEN = "chuchimnon999";

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20 MB limit

const els = {
  token: document.getElementById("token-input"),
  language: document.getElementById("language-select"),
  batch: document.getElementById("batch-input"),
  diarization: document.getElementById("diarization-toggle"),
  recordBtn: document.getElementById("record-btn"),
  timer: document.getElementById("record-timer"),
  fileInput: document.getElementById("file-input"),
  dropZone: document.getElementById("drop-zone"),
  selectFileBtn: document.getElementById("select-file-btn"),
  fileMeta: document.getElementById("file-meta"),
  preview: document.getElementById("preview"),
  resetBtn: document.getElementById("reset-btn"),
  transcribeBtn: document.getElementById("transcribe-btn"),
  statusPill: document.getElementById("status-pill"),
  resultStatus: document.getElementById("result-status"),
  segments: document.getElementById("segments"),
  template: document.getElementById("segment-template"),
  rawJson: document.getElementById("raw-json"),
  loader: document.getElementById("loader"),
  loaderText: document.getElementById("loader-text"),
};

const state = {
  audioBlob: null,
  audioName: null,
  recording: false,
  recorder: null,
  stream: null,
  timerInterval: null,
  startTime: null,
  previewUrl: null,
};

function setStatus(text, tone = "ready") {
  els.statusPill.textContent = text;
  els.statusPill.dataset.tone = tone;
}

function setResultStatus(text, tone = "info") {
  els.resultStatus.textContent = text;
  els.resultStatus.dataset.tone = tone;
}

function toggleLoader(show, message) {
  if (!els.loader) return;
  if (show) {
    els.loader.hidden = false;
    if (message) {
      els.loaderText.textContent = message;
    }
  } else {
    els.loader.hidden = true;
  }
}

function formatDuration(seconds) {
  const mins = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");
  const secs = Math.floor(seconds % 60)
    .toString()
    .padStart(2, "0");
  return `${mins}:${secs}`;
}

function humanFileSize(bytes) {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const value = bytes / Math.pow(1024, i);
  return `${value.toFixed(1)} ${units[i]}`;
}

function resetRecordingTimer() {
  clearInterval(state.timerInterval);
  state.timerInterval = null;
  state.startTime = null;
  els.timer.textContent = "00:00";
}

function setDropZoneActive(active) {
  if (!els.dropZone) return;
  els.dropZone.classList.toggle("dragging", Boolean(active));
}

function setRecordingUI(isRecording) {
  state.recording = isRecording;
  els.recordBtn.textContent = isRecording ? "Dừng ghi âm" : "Bắt đầu ghi âm";
  els.recordBtn.classList.toggle("recording", isRecording);
  setStatus(isRecording ? "Đang ghi âm" : "Sẵn sàng", isRecording ? "recording" : "ready");

  if (isRecording) {
    state.startTime = Date.now();
    state.timerInterval = setInterval(() => {
      const elapsed = (Date.now() - state.startTime) / 1000;
      els.timer.textContent = formatDuration(elapsed);
    }, 500);
  } else {
    resetRecordingTimer();
  }
}

async function startRecording() {
  if (!navigator.mediaDevices?.getUserMedia) {
    setResultStatus("Trình duyệt không hỗ trợ ghi âm.", "error");
    return;
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    state.stream = stream;
    const recorder = new MediaRecorder(stream);
    const chunks = [];

    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        chunks.push(event.data);
      }
    };

    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: "audio/webm" });
      setAudioBlob(blob, "recording.webm");
      cleanupStream();
    };

    recorder.start();
    state.recorder = recorder;
    setRecordingUI(true);
  } catch (err) {
    console.error(err);
    setResultStatus("Không truy cập được micro: " + err.message, "error");
    setRecordingUI(false);
  }
}

function stopRecording() {
  if (!state.recorder) return;
  state.recorder.stop();
  state.recorder = null;
  setRecordingUI(false);
}

function cleanupStream() {
  if (state.stream) {
    state.stream.getTracks().forEach((track) => track.stop());
    state.stream = null;
  }
}

async function handleFileSelection(file) {
  if (!file) return;
  if (!file.type.startsWith("audio/")) {
    setResultStatus("Vui lòng chọn file âm thanh hợp lệ.", "error");
    return;
  }
  if (file.size > MAX_FILE_SIZE) {
    setResultStatus("File lớn hơn 20 MB. Hãy chọn file nhỏ hơn.", "error");
    return;
  }
  setStatus("Đã chọn file", "ready");
  await setAudioBlob(file, file.name);
}

async function setAudioBlob(blob, name) {
  state.audioBlob = blob;
  state.audioName = name || "audio.webm";
  els.transcribeBtn.disabled = false;
  if (state.previewUrl) {
    URL.revokeObjectURL(state.previewUrl);
  }
  const url = URL.createObjectURL(blob);
  state.previewUrl = url;
  els.preview.hidden = false;
  els.preview.src = url;

  try {
    const meta = await analyzeAudio(blob);
    els.fileMeta.textContent = `${state.audioName} — ${humanFileSize(blob.size)} — ${meta.duration}s — ${meta.sampleRate} Hz`; 
  } catch (err) {
    els.fileMeta.textContent = `${state.audioName} — ${humanFileSize(blob.size)}`;
  }
}

async function analyzeAudio(blob) {
  const arrayBuffer = await blob.arrayBuffer();
  const ctx = new (window.AudioContext || window.webkitAudioContext)();
  try {
    const buffer = await ctx.decodeAudioData(arrayBuffer);
    return {
      duration: buffer.duration.toFixed(1),
      sampleRate: Math.round(buffer.sampleRate),
      channels: buffer.numberOfChannels,
    };
  } finally {
    ctx.close();
  }
}

function resetAudio() {
  state.audioBlob = null;
  state.audioName = null;
  if (state.previewUrl) {
    URL.revokeObjectURL(state.previewUrl);
    state.previewUrl = null;
  }
  els.preview.hidden = true;
  els.preview.removeAttribute("src");
  els.preview.load();
  els.fileMeta.textContent = "Chưa có file.";
  els.fileInput.value = "";
  els.transcribeBtn.disabled = true;
  els.transcribeBtn.classList.remove("loading");
  setResultStatus("Chưa có phiên âm.");
  els.segments.innerHTML = "";
  els.rawJson.textContent = "{}";
  toggleLoader(false);
}

async function transcribe() {
  if (!state.audioBlob) return;

  const token = (els.token.value || DEFAULT_TOKEN).trim();
  const language = els.language.value;
  const batch = Number(els.batch.value) || 16;
  const diarization = els.diarization.checked;

  setStatus("Đang tải lên", "processing");
  setResultStatus("Đang gửi tới WhisperX...", "info");
  els.transcribeBtn.disabled = true;
  els.transcribeBtn.classList.add("loading");
  toggleLoader(true, randomLoaderMessage());

  const query = new URLSearchParams({
    language,
    batch_size: batch,
    enable_diarization: diarization,
  });

  const formData = new FormData();
  formData.append("audio_file", state.audioBlob, state.audioName || "clip.webm");

  try {
    const response = await fetch(`${API_URL}?${query.toString()}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    const contentType = response.headers.get("content-type");
    const data = contentType?.includes("application/json")
      ? await response.json()
      : await response.text();

    if (!response.ok) {
      throw new Error(typeof data === "string" ? data : JSON.stringify(data));
    }

    renderSegments(data.segments || []);
    els.rawJson.textContent = JSON.stringify(data, null, 2);
    setResultStatus(`Nhận ${data.segments?.length || 0} đoạn văn.`, "success");
    setStatus("Hoàn tất", "success");
    toggleLoader(false);
  } catch (err) {
    console.error(err);
    setResultStatus("Lỗi: " + err.message, "error");
    setStatus("Lỗi", "error");
    toggleLoader(false);
  } finally {
    if (state.audioBlob) {
      els.transcribeBtn.disabled = false;
    }
    els.transcribeBtn.classList.remove("loading");
  }
}

function randomLoaderMessage() {
  const phrases = [
    "Hệ thống đang lắng nghe…",
    "Đang gỡ rối từng decibel…",
    "WhisperX đang viết lại câu chuyện của bạn…",
    "Đang phân tích dấu hỏi, dấu sắc…",
    "Chờ tí nhé, sắp xong rồi!"
  ];
  return phrases[Math.floor(Math.random() * phrases.length)];
}

function renderSegments(segments) {
  els.segments.innerHTML = "";
  if (!segments.length) {
    els.segments.innerHTML = "<p>Không có dữ liệu đoạn văn.</p>";
    return;
  }

  segments.forEach((segment, index) => {
    const node = els.template.content.cloneNode(true);
    node.querySelector(".segment-time").textContent = `${formatDuration(segment.start || 0)} → ${formatDuration(segment.end || 0)}`;
    node.querySelector(".segment-speaker").textContent = segment.speaker || `Đoạn ${index + 1}`;
    node.querySelector(".segment-text").textContent = segment.text || "";
    els.segments.appendChild(node);
  });
}

els.recordBtn.addEventListener("click", () => {
  if (state.recording) {
    stopRecording();
  } else {
    startRecording();
  }
});

els.fileInput.addEventListener("change", (event) => {
  const file = event.target.files?.[0];
  handleFileSelection(file);
});

if (els.selectFileBtn) {
  els.selectFileBtn.addEventListener("click", () => {
    els.fileInput.click();
  });
}

["dragenter", "dragover"].forEach((eventName) => {
  els.dropZone?.addEventListener(eventName, (event) => {
    event.preventDefault();
    event.stopPropagation();
    setDropZoneActive(true);
  });
});

["dragleave", "dragend"].forEach((eventName) => {
  els.dropZone?.addEventListener(eventName, (event) => {
    event.preventDefault();
    event.stopPropagation();
    setDropZoneActive(false);
  });
});

els.dropZone?.addEventListener("drop", (event) => {
  event.preventDefault();
  event.stopPropagation();
  setDropZoneActive(false);
  const file = event.dataTransfer?.files?.[0];
  handleFileSelection(file);
});

els.dropZone?.addEventListener("keydown", (event) => {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    els.fileInput.click();
  }
});

els.resetBtn.addEventListener("click", () => {
  if (state.recording) {
    stopRecording();
  }
  cleanupStream();
  resetAudio();
  setRecordingUI(false);
});

els.transcribeBtn.addEventListener("click", () => {
  transcribe();
});

window.addEventListener("unload", cleanupStream);

setStatus("Sẵn sàng", "ready");
setResultStatus("Chưa có phiên âm.", "info");
