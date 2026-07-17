/**
 * Harmonize - Video Loop Station
 * Complete Engine with Gateway Onboarding Screen
 */

// Application State
let liveStream = null;
let mediaRecorder = null;
let recordedChunks = [];
let recordings = []; 
let isRecording = false;
let isPlaying = false;
let recordingTimer = null;
let recordingDuration = 90; 
let targetReRecordId = null; 
let selectedLoopId = null;

// DOM Selectors
const welcomeScreen = document.getElementById('welcome-screen');
const permissionButton = document.getElementById('permissionButton');

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

// Handle Gateway Permission Validation Actions
async function handlePermissionActivation() {
  permissionButton.textContent = "Requesting Access...";
  permissionButton.disabled = true;

  try {
    // FIX 1: Turn off default audio filters to prevent quality degradation on multiple clips
    liveStream = await navigator.mediaDevices.getUserMedia({
      video: { width: { ideal: 1280 }, height: { ideal: 720 } },
      audio: {
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false
      }
    });
    
    livePreview.srcObject = liveStream;

    // Smoothly fade out the welcome container panel
    welcomeScreen.style.opacity = '0';
    setTimeout(() => {
      welcomeScreen.style.display = 'none';
      recordButton.disabled = false; // Enable tracking records now
      updateUI();
    }, 400);

  } catch (err) {
    console.error("Hardware initialization blocked:", err);
    permissionButton.textContent = "Access Denied. Try Again.";
    permissionButton.disabled = false;
    alert("Harmonize requires camera and microphone permissions to function correctly.");
  }
}

// Handles the 3, 2, 1 countdown intercept before recording starts
function initiateRecordingSequence() {
  if (recordings.length >= 6 && targetReRecordId === null) {
    alert("Maximum limit of 6 loops hit. Remove a tile to continue.");
    return;
  }

  pauseAllLoops();

  let countdownValue = 3;
  countdownOverlay.style.display = 'flex';
  countdownOverlay.textContent = countdownValue;
  statusDisplay.textContent = "Get Ready...";
  
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
  playAllLoops();

  // FIX 2: Request small timeslice data intervals to decrease start lag
  mediaRecorder.start(10);
  isRecording = true;
  statusDisplay.textContent = "Recording...";
  
  recordingDuration = 90; 
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
  videoEl.muted = false; // Explicitly handle audio execution permission boundaries
  
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

function playAllLoops() {
  isPlaying = true;
  recordings.forEach(rec => {
    if (isRecording && rec.id === targetReRecordId) return;
    
    // FIX 2: Apply a small offset (60ms) during active recording rounds to counter hardware output delay
    rec.element.currentTime = isRecording ? 0.06 : 0;
    rec.element.play().catch(() => {});
  });
  updateUI();
}

function pauseAllLoops() {
  isPlaying = false;
  recordings.forEach(rec => rec.element.pause());
  updateUI();
}

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

function renderGridLayout() {
  // Remove existing recorded tiles so we don't duplicate them on refresh
  const recordedTiles = videoGrid.querySelectorAll('.recorded-tile');
  recordedTiles.forEach(tile => tile.remove());

  // Determine if we should show the live webcam preview
  // It will ONLY show if there are 0 recordings, OR if you are currently recording a new loop
  const showLivePreview = recordings.length === 0 || isRecording;
  
  if (showLivePreview) {
    livePreview.style.display = 'block';
  } else {
    livePreview.style.display = 'none'; // Hides the live camera after you finish recording
  }

  // Start counting items from 0 if preview is hidden, or 1 if it's visible
  let visibleCount = showLivePreview ? 1 : 0;

  recordings.forEach(rec => {
    // If we're overwriting this specific loop, hide its old placeholder tile
    if (isRecording && rec.id === targetReRecordId) return;

    rec.wrapper.innerHTML = ''; 
    rec.wrapper.appendChild(rec.element);
    
    rec.wrapper.onclick = () => {
      if (!isRecording) toggleSelectLoop(rec.id);
    };

    videoGrid.appendChild(rec.wrapper);
    visibleCount++;
  });

  // Clear out the previous layout engine class
  videoGrid.className = ''; 

  // Safely route the class engine depending on how many tiles are actually VISIBLE
  if (visibleCount === 0) {
    // Edge case if everything is deleted
    videoGrid.classList.add('grid-1-tile'); 
  } else if (visibleCount === 1) {
    videoGrid.classList.add('grid-1-tile');
  } else if (visibleCount === 2) {
    videoGrid.classList.add('grid-2-tiles');
  } else if (visibleCount <= 4) {
    videoGrid.classList.add('grid-4-tiles');
  } else if (visibleCount <= 6) {
    videoGrid.classList.add('grid-6-tiles');
  }
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
  permissionButton.onclick = handlePermissionActivation;
  recordButton.onclick = () => isRecording ? stopRecording() : initiateRecordingSequence();
  playButton.onclick = playAllLoops;
  pauseButton.onclick = pauseAllLoops;
  deleteButton.onclick = deleteSelectedLoop;
  rerecordButton.onclick = triggerReRecord;
}

// Wait for event registration setup initialization
window.onload = setupEventListeners;
