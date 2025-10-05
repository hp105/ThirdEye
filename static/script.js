const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const statusDot = document.getElementById('statusDot');
const statusText = document.getElementById('statusText');
const languageSelect = document.getElementById('languageSelect');
const speedSlider = document.getElementById('speedSlider');
const speedValue = document.getElementById('speedValue');

let stream = null;
let captureInterval = null;
let isProcessing = false;
let availableVoices = [];

// Load available voices
function loadVoices() {
    return new Promise((resolve) => {
        availableVoices = window.speechSynthesis.getVoices();
        if (availableVoices.length > 0) {
            console.log('Voices loaded:', availableVoices.length);
            resolve();
        } else {
            window.speechSynthesis.onvoiceschanged = () => {
                availableVoices = window.speechSynthesis.getVoices();
                console.log('Voices loaded:', availableVoices.length);
                resolve();
            };
        }
    });
}

// Load voices on page load
if ('speechSynthesis' in window) {
    loadVoices();
}

speedSlider.addEventListener('input', (e) => {
    speedValue.textContent = e.target.value + 'x';
});

function updateStatus(status, message) {
    statusDot.className = `status-dot ${status}`;
    statusText.textContent = message;
}

async function startCamera() {
    try {
        updateStatus('', 'Requesting camera access...');
        
        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();
            const silentUtterance = new SpeechSynthesisUtterance('');
            silentUtterance.volume = 0;
            window.speechSynthesis.speak(silentUtterance);
        }
        
        try {
            stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment' },
                audio: false
            });
        } catch (envError) {
            console.log('Rear camera not available, trying front camera...');
            try {
                stream = await navigator.mediaDevices.getUserMedia({
                    video: { facingMode: 'user' },
                    audio: false
                });
            } catch (userError) {
                console.log('Specific camera not available, trying default...');
                stream = await navigator.mediaDevices.getUserMedia({
                    video: true,
                    audio: false
                });
            }
        }
        
        video.srcObject = stream;
        
        startBtn.disabled = true;
        stopBtn.disabled = false;
        languageSelect.disabled = true;
        
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
    languageSelect.disabled = false;
    
    updateStatus('', 'Ready to start');
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
        const selectedLanguage = languageSelect.value;
        
        const response = await fetch('/analyze', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                image: imageData,
                language: selectedLanguage
            })
        });
        
        if (!response.ok) {
            throw new Error(`Server error: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.text) {
            console.log('Received text:', data.text);
            console.log('Language:', data.language);
            updateStatus('active', 'Speaking description...');
            await speakText(data.text, data.language);
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

function speakText(text, languageCode) {
    return new Promise((resolve, reject) => {
        if (!('speechSynthesis' in window)) {
            console.warn('Text-to-speech not supported, skipping audio');
            resolve();
            return;
        }
        
        if (window.speechSynthesis.speaking || window.speechSynthesis.pending) {
            window.speechSynthesis.cancel();
        }
        
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = parseFloat(speedSlider.value);
        utterance.pitch = 1.0;
        utterance.volume = 1.0;
        
        // Set the language for the utterance
        if (languageCode) {
            utterance.lang = languageCode;
            
            // Make sure voices are loaded
            if (availableVoices.length === 0) {
                availableVoices = window.speechSynthesis.getVoices();
            }
            
            // Try to find a voice that matches the language
            const matchingVoice = availableVoices.find(voice => voice.lang.startsWith(languageCode));
            
            if (matchingVoice) {
                utterance.voice = matchingVoice;
                console.log('Selected voice:', matchingVoice.name, 'for language:', languageCode);
            } else {
                console.log('No matching voice found for', languageCode, '- using default. Available voices:', availableVoices.map(v => v.lang).join(', '));
            }
        }
        
        utterance.onend = () => {
            resolve();
        };
        
        utterance.onerror = (event) => {
            const errorMsg = event.error || 'Speech synthesis error';
            console.warn('Speech error:', errorMsg, '- continuing anyway');
            resolve();
        };
        
        window.speechSynthesis.speak(utterance);
    });
}

startBtn.addEventListener('click', startCamera);
stopBtn.addEventListener('click', stopCamera);
