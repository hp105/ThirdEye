const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const statusDot = document.getElementById('statusDot');
const statusText = document.getElementById('statusText');

let stream = null;
let captureInterval = null;
let isProcessing = false;

function updateStatus(status, message) {
    statusDot.className = `status-dot ${status}`;
    statusText.textContent = message;
}

async function startCamera() {
    try {
        updateStatus('', 'Requesting camera access...');
        
        stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'environment' },
            audio: false
        });
        
        video.srcObject = stream;
        
        startBtn.disabled = true;
        stopBtn.disabled = false;
        
        updateStatus('active', 'Camera active - Capturing every 1.5 seconds');
        
        captureInterval = setInterval(captureAndAnalyze, 1500);
        
    } catch (error) {
        console.error('Error accessing camera:', error);
        updateStatus('error', 'Camera access denied or unavailable');
        alert('Unable to access camera. Please ensure you have granted camera permissions.');
    }
}

function stopCamera() {
    if (captureInterval) {
        clearInterval(captureInterval);
        captureInterval = null;
    }
    
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
        stream = null;
    }
    
    video.srcObject = null;
    
    startBtn.disabled = false;
    stopBtn.disabled = true;
    
    updateStatus('', 'Camera stopped');
}

async function captureAndAnalyze() {
    if (isProcessing) {
        return;
    }
    
    isProcessing = true;
    updateStatus('processing', 'Capturing and analyzing...');
    
    try {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        
        const context = canvas.getContext('2d');
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        const imageData = canvas.toDataURL('image/jpeg', 0.8);
        
        const response = await fetch('/analyze', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ image: imageData })
        });
        
        if (!response.ok) {
            throw new Error(`Server error: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.audio) {
            updateStatus('active', 'Playing audio description...');
            await playAudio(data.audio, data.mime_type);
            updateStatus('active', 'Camera active - Capturing every 1.5 seconds');
        } else if (data.error) {
            throw new Error(data.error);
        }
        
    } catch (error) {
        console.error('Error:', error);
        updateStatus('error', `Error: ${error.message}`);
        setTimeout(() => {
            if (stream) {
                updateStatus('active', 'Camera active - Capturing every 1.5 seconds');
            }
        }, 3000);
    } finally {
        isProcessing = false;
    }
}

function playAudio(base64Audio, mimeType) {
    return new Promise((resolve, reject) => {
        try {
            const audioBlob = base64ToBlob(base64Audio, mimeType);
            const audioUrl = URL.createObjectURL(audioBlob);
            const audio = new Audio(audioUrl);
            
            audio.onended = () => {
                URL.revokeObjectURL(audioUrl);
                resolve();
            };
            
            audio.onerror = (error) => {
                URL.revokeObjectURL(audioUrl);
                reject(error);
            };
            
            audio.play();
            
        } catch (error) {
            reject(error);
        }
    });
}

function base64ToBlob(base64, mimeType) {
    const byteCharacters = atob(base64);
    const byteArrays = [];
    
    for (let offset = 0; offset < byteCharacters.length; offset += 512) {
        const slice = byteCharacters.slice(offset, offset + 512);
        const byteNumbers = new Array(slice.length);
        
        for (let i = 0; i < slice.length; i++) {
            byteNumbers[i] = slice.charCodeAt(i);
        }
        
        const byteArray = new Uint8Array(byteNumbers);
        byteArrays.push(byteArray);
    }
    
    return new Blob(byteArrays, { type: mimeType });
}

startBtn.addEventListener('click', startCamera);
stopBtn.addEventListener('click', stopCamera);
