// ===== Variables =====

let stream = null;
let mediaRecorder = null;
let recordedChunks = [];
let recordingInterval = null;

const timer = document.getElementById("timer");
const video = document.getElementById("camera-preview");
const recordButton = document.getElementById("recordButton");
const harmonize = document.getElementById("app_name");

// ===== Events =====

recordButton.addEventListener("click", startRecording);

// ===== Record =====

async function startRecording() {

    recordButton.disabled = true;
    

    try {

        // Ask for camera + microphone
        stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: true
        });

        // Check if microphone exists
        if(stream.getAudioTracks().length === 0){

            alert("No microphone detected.");

        }

        video.srcObject = stream;

        mediaRecorder = new MediaRecorder(stream);

        recordedChunks = [];

        mediaRecorder.ondataavailable = function(event){

            if(event.data.size > 0){

                recordedChunks.push(event.data);

            }

        };

        // 3-second countdown
        for(let i = 3; i > 0; i--){

            timer.textContent = i;

            await wait(1000);

        }
        harmonize.style.display = "none";

        mediaRecorder.start();

        let timeLeft = 90;

        timer.textContent = "🔴 " + formatTime(timeLeft);

        recordingInterval = setInterval(function(){

            timeLeft--;

            timer.textContent = "🔴 " + formatTime(timeLeft);

            if(timeLeft <= 0){

                stopRecording();

            }

        },1000);

    }

    catch(error){

        console.error(error);

        alert("Please allow camera and microphone permissions.");

        recordButton.disabled = false;

    }

}

// ===== Stop =====

function stopRecording(){

    clearInterval(recordingInterval);

    if(mediaRecorder){

        mediaRecorder.stop();

    }

    if(stream){

        stream.getTracks().forEach(function(track){

            track.stop();

        });

    }

    timer.textContent = "Finished";

    recordButton.disabled = false;

    console.log(recordedChunks);

}

// ===== Helpers =====

function wait(ms){

    return new Promise(function(resolve){

        setTimeout(resolve,ms);

    });

}

function formatTime(seconds){

    let minutes = Math.floor(seconds / 60);

    let secs = seconds % 60;

    return `${minutes}:${secs.toString().padStart(2,"0")}`;

}
