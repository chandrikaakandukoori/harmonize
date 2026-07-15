// ===== Variables =====


let stream = null;
let mediaRecorder = null;
let recordedChunks = [];
let recordingInterval = null; 
let isRecording = false;


const videoContainer = document.getElementById("videoContainer");
const preview = document.getElementById("preview");
const recordedVideo = document.getElementById("recordedVideo");
const timer = document.getElementById("timer");
const video = document.getElementById("camera-preview");
const recordButton = document.getElementById("recordButton");
const harmonize = document.getElementById("app_name");

 
recordButton.addEventListener("click", handleRecordButton);
 

function handleRecordButton(){

    if(!isRecording){

        startRecording();

    }

    else{

        stopRecording();

    }

}

async function startRecording() {

     
    

    try {

   
        stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: true
        });

        // Check if microphone exists
        if(stream.getAudioTracks().length === 0){

            alert("No microphone detected.");

        }

        video.srcObject = stream;

        

     
video.style.display = "block";
recordedVideo.style.display = "none";
mediaRecorder = new MediaRecorder(stream);

        recordedChunks = [];

        mediaRecorder.ondataavailable = function(event){

            if(event.data.size > 0){

                recordedChunks.push(event.data);

            }

        };

      mediaRecorder.onstop = function () {

    console.log("STOPPED");
    console.log("Chunks:", recordedChunks.length);

    const blob = new Blob(recordedChunks, {
        type: "video/webm; codecs=vp8,opus"
    });

    console.log("Blob size:", blob.size);

    const url = URL.createObjectURL(blob);

    console.log("URL:", url);

    const recordedVideo = document.getElementById("recordedVideo");

    recordedVideo.src = url;
    recordedVideo.srcObject = null; 

    console.log("video element:", recordedVideo);
    console.log("video source:", recordedVideo.src);
    recordedVideo.controls = true;

    recordedVideo.style.display = "block";
    recordedVideo.load();         
 
video.style.display = "none";
recordedVideo.style.display = "block";    

console.log("Video attached:", recordedVideo.src);

};  

      
        for(let i = 3; i > 0; i--){

            timer.textContent = i;

            await wait(1000);

        }
        harmonize.style.display = "none";

        mediaRecorder.start();

        isRecording = true;

        recordButton.innerHTML = "🟥 Stop";

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


function stopRecording(){

    clearInterval(recordingInterval);

    if(mediaRecorder && mediaRecorder.state === "recording"){

    mediaRecorder.stop();

}

    

    timer.textContent = "Finished";

    

    

    isRecording = false;

    recordButton.innerHTML = "🔴 Record";


}


 

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
