const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const statusDot = document.getElementById('statusDot');
const statusText = document.getElementById('statusText');
const languageSelect = document.getElementById('languageSelect');
const speedSlider = document.getElementById('speedSlider');
const speedValue = document.getElementById('speedValue');
const modeDescription = document.getElementById('modeDescription');
const liveModeRadio = document.getElementById('liveMode');
const navModeRadio = document.getElementById('navMode');

let stream = null;
let isCapturing = false;
let isProcessing = false;
let availableVoices = [];
let currentAudio = null;
let currentMode = 'live';

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
    const newSpeed = parseFloat(e.target.value);
    speedValue.textContent = newSpeed + 'x';
    
    // Update playback speed in real-time if audio is currently playing
    if (currentAudio) {
        currentAudio.playbackRate = newSpeed;
        console.log('Updated playback speed to:', newSpeed);
    }
});

// Mode toggle event listeners
function updateModeDescription() {
    if (liveModeRadio.checked) {
        currentMode = 'live';
        modeDescription.textContent = 'Continuous real-time image capture and description';
    } else {
        currentMode = 'navigation';
        modeDescription.textContent = 'Navigation mode with obstacle detection, proximity alerts, and shorter descriptions';
    }
    console.log('Mode changed to:', currentMode);
}

liveModeRadio.addEventListener('change', updateModeDescription);
navModeRadio.addEventListener('change', updateModeDescription);

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
        
        isCapturing = true;
        
        updateStatus('active', 'Camera active - Continuous real-time capture');
        
        // Start continuous capture loop
        captureAndAnalyze();
        
    } catch (error) {
        console.error('Error accessing camera:', error);
        updateStatus('error', 'Camera access denied or unavailable');
        alert('Unable to access camera. Please ensure you have granted camera permissions.');
    }
}

function stopCamera() {
    // Stop the continuous capture loop
    isCapturing = false;
    
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
        stream = null;
    }
    
    video.srcObject = null;
    
    startBtn.disabled = false;
    stopBtn.disabled = true;
    
    if (currentAudio) {
        currentAudio.pause();
        currentAudio = null;
    }
    
    updateStatus('', 'Ready to start');
}

async function captureAndAnalyze() {
    // Only proceed if we're still supposed to be capturing
    if (!isCapturing) {
        return;
    }
    
    if (isProcessing) {
        return;
    }
    
    isProcessing = true;
    updateStatus('processing', 'Capturing and analyzing...');
    
    let hadError = false;
    
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
                language: selectedLanguage,
                mode: currentMode
            })
        });
        
        if (!response.ok) {
            throw new Error(`Server error: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.audio) {
            // We received audio from ElevenLabs TTS
            console.log('Received audio data from ElevenLabs');
            console.log('Text:', data.text);
            console.log('Language:', data.language);
            updateStatus('active', 'Playing audio description...');
            await playAudio(data.audio);
            updateStatus('active', 'Camera active - Continuous real-time capture');
        } else if (data.text) {
            // Fallback: use browser TTS if no audio
            console.log('Received text (no audio), using browser TTS');
            console.log('Text:', data.text);
            console.log('Language:', data.language);
            updateStatus('active', 'Speaking description...');
            await speakText(data.text, data.language);
            updateStatus('active', 'Camera active - Continuous real-time capture');
        } else if (data.error) {
            throw new Error(data.error);
        }
        
        // Success - immediately start next capture for true real-time continuous operation
        isProcessing = false;
        if (isCapturing) {
            captureAndAnalyze();
        }
        
    } catch (error) {
        hadError = true;
        console.error('Error:', error);
        updateStatus('error', `Error: ${error.message}`);
        
        // Wait before retrying on error to avoid flooding the server
        isProcessing = false;
        if (isCapturing) {
            setTimeout(() => {
                if (isCapturing) {
                    updateStatus('active', 'Camera active - Continuous real-time capture');
                    captureAndAnalyze();
                }
            }, 3000);
        }
    }
}

function playAudio(base64Audio) {
    return new Promise((resolve, reject) => {
        try {
            // Stop any currently playing audio
            if (currentAudio) {
                currentAudio.pause();
                currentAudio = null;
            }
            
            // Convert base64 to blob
            const binaryString = atob(base64Audio);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }
            const blob = new Blob([bytes], { type: 'audio/mp3' });
            const audioUrl = URL.createObjectURL(blob);
            
            // Create audio element
            const audio = new Audio(audioUrl);
            currentAudio = audio;
            
            // Set playback speed from slider
            const currentSpeed = parseFloat(speedSlider.value);
            audio.playbackRate = currentSpeed;
            
            console.log('Playing audio at speed:', currentSpeed);
            
            // Play audio
            audio.onended = () => {
                console.log('Audio playback completed');
                URL.revokeObjectURL(audioUrl);
                currentAudio = null;
                resolve();
            };
            
            audio.onerror = (error) => {
                console.error('Audio playback error:', error);
                URL.revokeObjectURL(audioUrl);
                currentAudio = null;
                reject(error);
            };
            
            audio.play().catch(error => {
                console.error('Failed to play audio:', error);
                URL.revokeObjectURL(audioUrl);
                currentAudio = null;
                reject(error);
            });
            
        } catch (error) {
            console.error('Error creating audio:', error);
            reject(error);
        }
    });
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
        const currentSpeed = parseFloat(speedSlider.value);
        utterance.rate = currentSpeed;
        utterance.pitch = 1.0;
        utterance.volume = 1.0;
        
        console.log('Speech settings - Speed:', currentSpeed, 'Language:', languageCode);
        
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
                // Don't set a voice if no match - let browser handle it
                // Setting an English voice for non-English text can prevent speech
                console.log('No matching voice found for', languageCode, '- letting browser choose default');
                console.log('Available voices:', availableVoices.map(v => `${v.name} (${v.lang})`).join(', '));
            }
        }
        
        utterance.onstart = () => {
            console.log('Speech started at rate:', utterance.rate);
        };
        
        utterance.onend = () => {
            console.log('Speech ended successfully');
            resolve();
        };
        
        utterance.onerror = (event) => {
            const errorMsg = event.error || 'Speech synthesis error';
            console.error('Speech error:', errorMsg, 'Error object:', event);
            resolve();
        };
        
        console.log('Starting speech synthesis...');
        window.speechSynthesis.speak(utterance);
    });
}

startBtn.addEventListener('click', startCamera);
stopBtn.addEventListener('click', stopCamera);
