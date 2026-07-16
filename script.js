/**
 * Harmonize - Video Loop Station
 * Stable Layout, Stream Engine & Sync Countdown
 */

// Application State
let liveStream = null;
let mediaRecorder = null;
let recordedChunks = [];
let recordings = []; // Holds: { id, blobUrl, element, wrapper }
let isRecording = false;
let isPlaying = false;
let recordingTimer = null;
let recordingDuration = 90; // Counts DOWN from 90 seconds (1:30)
let targetReRecordId = null; 
let selectedLoopId = null;

// DOM Selectors
const videoGrid = document.getElementById('videoGrid');
const livePreview = document.getElementById('preview');
const timerDisplay = document.getElementById('timer');
const statusDisplay = document.getElementById('status');

const playButton = document.getElementById('playButton');
const pauseButton = document.getElementById('pauseButton');
const recordButton = document.getElementById('recordButton');
const deleteButton = document.getElementById('deleteButton');
const rerecordButton = document.getElementById('rerecordButton');

// Create countdown overlay element dynamically
const countdownOverlay = document.createElement('div');
countdownOverlay.id = 'countdown-overlay';
document.body.appendChild(countdownOverlay);

// Initialize Stream Capture Pipeline
async function init() {
  setupEventListeners();
  await startLivePreview();
  updateUI();
}

async function startLivePreview() {
  try {
    liveStream = await navigator.mediaDevices.getUserMedia({
      video: { width: { ideal: 1280 }, height: { ideal: 720 } },
      audio: true
    });
    livePreview.srcObject = liveStream;
  } catch (err) {
    console.error("Accessing media hardware failed:", err);
    statusDisplay.textContent = "Error: Check Camera/Mic Permissions";
  }
}

// Handles the 3, 2, 1 countdown intercept before recording starts
function initiateRecordingSequence() {
  if (recordings.length >= 6 && targetReRecordId === null) {
    alert("Maximum limit of 6 loops hit. Remove a tile to continue.");
    return;
  }

  // CRITICAL FIX: Explicitly stop/pause all existing playback tracks for the countdown duration
  pauseAllLoops();

  let countdownValue = 3;
  countdownOverlay.style.display = 'flex';
  countdownOverlay.textContent = countdownValue;
  statusDisplay.textContent = "Get Ready...";
  
  // Disable buttons during countdown phase
  recordButton.disabled = true;

  const countdownInterval = setInterval(() => {
    countdownValue--;
    if (countdownValue > 0) {
      countdownOverlay.textContent = countdownValue;
    } else {
      clearInterval(countdownInterval);
      countdownOverlay.style.display = 'none';
      recordButton.disabled = false;
      startRecording();
    }
  }, 1000);
}

function startRecording() {
  recordedChunks = [];
  const options = { mimeType: 'video/webm;codecs=vp8,opus' };
  try {
    mediaRecorder = new MediaRecorder(liveStream, options);
  } catch (e) {
    mediaRecorder = new MediaRecorder(liveStream); 
  }

  mediaRecorder.ondataavailable = (e) => {
    if (e.data && e.data.size > 0) recordedChunks.push(e.data);
  };

  mediaRecorder.onstop = handleRecordingStop;

  // CRITICAL FIX: Reset and launch background tracks simultaneously with the new recording run
  playAllLoops();

  mediaRecorder.start();
  isRecording = true;
  statusDisplay.textContent = "Recording...";
  
  recordingDuration = 90; // Reset to 1 minute 30 seconds
  updateTimerDisplay();
  
  recordingTimer = setInterval(() => {
    recordingDuration--;
    updateTimerDisplay();
    if (recordingDuration <= 0) {
      stopRecording();
    }
  }, 1000);

  updateUI();
}

function stopRecording() {
  if (!isRecording) return;
  clearInterval(recordingTimer);
  mediaRecorder.stop();
  isRecording = false;
}

function handleRecordingStop() {
  const blob = new Blob(recordedChunks, { type: 'video/webm' });
  const blobUrl = URL.createObjectURL(blob);

  const videoEl = document.createElement('video');
  videoEl.src = blobUrl;
  videoEl.loop = true;
  videoEl.playsInline = true;
  
  const wrapper = document.createElement('div');
  wrapper.className = 'video-tile recorded-tile';

  if (targetReRecordId !== null) {
    const index = recordings.findIndex(r => r.id === targetReRecordId);
    if (index !== -1) {
      URL.revokeObjectURL(recordings[index].blobUrl);
      recordings[index].blobUrl = blobUrl;
      recordings[index].element = videoEl;
      recordings[index].wrapper = wrapper;
    }
    targetReRecordId = null;
  } else {
    const recordingId = 'loop-' + Date.now();
    recordings.push({ id: recordingId, blobUrl, element: videoEl, wrapper });
  }

  statusDisplay.textContent = "Finished";
  playAllLoops();
  updateUI();
}

// Synchronized Multitrack System
function playAllLoops() {
  isPlaying = true;
  recordings.forEach(rec => {
    // Skip if we are currently re-recording this exact track
    if (isRecording && rec.id === targetReRecordId) return;
    
    rec.element.currentTime = 0;
    rec.element.play().catch(() => {});
  });
  updateUI();
}

function pauseAllLoops() {
  isPlaying = false;
  recordings.forEach(rec => rec.element.pause());
  updateUI();
}

// Tile Modifier System
function toggleSelectLoop(id) {
  selectedLoopId = (selectedLoopId === id) ? null : id;
  recordings.forEach(rec => {
    if (rec.id === selectedLoopId) {
      rec.wrapper.classList.add('selected-tile');
    } else {
      rec.wrapper.classList.remove('selected-tile');
    }
  });
  updateUI();
}

function deleteSelectedLoop() {
  if (!selectedLoopId) return;
  const index = recordings.findIndex(r => r.id === selectedLoopId);
  if (index !== -1) {
    URL.revokeObjectURL(recordings[index].blobUrl);
    recordings.splice(index, 1);
  }
  selectedLoopId = null;
  updateUI();
  if (isPlaying) playAllLoops();
}

function triggerReRecord() {
  if (!selectedLoopId) return;
  targetReRecordId = selectedLoopId;
  selectedLoopId = null;
  initiateRecordingSequence();
}

// Balanced Grid Engine
function renderGridLayout() {
  // Clear out old recorded loop elements only (keep livePreview safe)
  const recordedTiles = videoGrid.querySelectorAll('.recorded-tile');
  recordedTiles.forEach(tile => tile.remove());

  // Show/Hide live preview based on recording parameters
  const showLivePreview = recordings.length === 0 || isRecording;
  
  if (showLivePreview) {
    livePreview.style.display = 'block';
  } else {
    livePreview.style.display = 'none';
  }

  // Populate dynamic recorded tiles
  let visibleCount = showLivePreview ? 1 : 0;

  recordings.forEach(rec => {
    if (isRecording && rec.id === targetReRecordId) {
      return;
    }

    rec.wrapper.innerHTML = ''; 
    rec.wrapper.appendChild(rec.element);
    
    rec.wrapper.onclick = () => {
      if (!isRecording) toggleSelectLoop(rec.id);
    };

    videoGrid.appendChild(rec.wrapper);
    visibleCount++;
  });

  // Apply layout classifications onto grid structural bounds
  videoGrid.className = ''; 

  if (visibleCount === 1) videoGrid.classList.add('grid-1-tile');
  else if (visibleCount === 2) videoGrid.classList.add('grid-2-tiles');
  else if (visibleCount <= 4) videoGrid.classList.add('grid-4-tiles');
  else if (visibleCount <= 6) videoGrid.classList.add('grid-6-tiles');
}

function updateUI() {
  recordButton.innerHTML = isRecording ? "⏹ Stop" : "🔴 Record";
  
  if (isRecording) {
    playButton.disabled = pauseButton.disabled = deleteButton.disabled = rerecordButton.disabled = true;
  } else {
    playButton.disabled = pauseButton.disabled = (recordings.length === 0);
    deleteButton.disabled = rerecordButton.disabled = !selectedLoopId;
  }

  if (recordings.length === 0 && !isRecording) {
    statusDisplay.textContent = "Ready";
    timerDisplay.textContent = "01:30";
  }
  renderGridLayout();
}

function updateTimerDisplay() {
  const mins = String(Math.floor(recordingDuration / 60)).padStart(2, '0');
  const secs = String(recordingDuration % 60).padStart(2, '0');
  timerDisplay.textContent = `${mins}:${secs}`;
}

function setupEventListeners() {
  recordButton.onclick = () => isRecording ? stopRecording() : initiateRecordingSequence();
  playButton.onclick = playAllLoops;
  pauseButton.onclick = pauseAllLoops;
  deleteButton.onclick = deleteSelectedLoop;
  rerecordButton.onclick = triggerReRecord;
}

window.onload = init;
