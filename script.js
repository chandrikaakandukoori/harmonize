async function startCamera() {
    // 1. Specify constraints (we only need video, not audio)
    const constraints = {
        video: {
            height: { ideal: 1080}, // Ideal height for the video
            width: { ideal: 1920},  // Ideal width for the video
            facingMode: "user" // Use 'user' for front camera, 'environment' for rear
        },
        audio: false 
    };

    try {
        // 2. Request camera access from the browser
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        
        // 3. Find our HTML video element
        const videoElement = document.getElementById('camera-preview');
        
        // 4. Assign the live stream directly to the video element
        videoElement.srcObject = stream;
        
    } catch (error) {
        // Handle common errors (e.g., user denied permission, no camera found)
        console.error("Error accessing the camera: ", error);
        alert("Could not access camera. Please allow camera permissions.");
    }
}

// Start the camera automatically when the page loads
window.addEventListener('DOMContentLoaded', startCamera);
