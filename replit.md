# ThirdEye - AI Vision Assistant

## Overview

ThirdEye is a real-time AI-powered vision assistance application designed to help visually impaired users understand their surroundings through their device camera. The application continuously captures and analyzes images in real-time, using Google's Gemini AI to generate concise, spoken descriptions in multiple languages. The system provides high-quality audio feedback using ElevenLabs text-to-speech with ultra-realistic voices, making it highly accessible for visually impaired users with real-time adjustable voice speeds and instant language switching.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
**Single-Page Application (SPA)**: The application uses a simple, vanilla JavaScript approach without frameworks to minimize complexity and ensure fast load times for accessibility purposes.

**Camera Integration**: Supports two camera sources with intelligent handling:
1. **Device Camera**: Uses the WebRTC Media Capture API (`navigator.mediaDevices.getUserMedia`) with intelligent fallback logic:
   - First attempts to access rear-facing camera (environment mode) for better scene capture
   - Falls back to front-facing camera if unavailable
   - Finally attempts default camera as last resort
   - This progressive degradation ensures maximum device compatibility
2. **Arduino Camera**: Receives images uploaded from external Arduino ESP32 camera:
   - Arduino captures images and POSTs directly to ThirdEye server via `/upload-arduino-image` endpoint
   - No ngrok or external server required
   - Works across different networks (Arduino and host device can be on separate WiFi networks)
   - Enables remote camera capture for specialized setups
   - **Real-time Auto-Detection**: Frontend automatically detects new Arduino uploads (checks every 500ms) and analyzes immediately
   - **Live Preview**: Shows the captured Arduino images being analyzed in real-time

**Capture Strategy**: Implements continuous real-time image capture with intelligent throttling:
- Captures and analyzes as fast as possible (typically 3-10 seconds per cycle depending on API response time)
- No artificial delays between captures - next capture starts immediately after previous completes
- 3-second backoff on errors to prevent flooding during failures
- Provides true real-time descriptions of the user's surroundings

**User Interface**: Modern, accessible design with:
- ThirdEye branding with eye icon and animated effects
- **Mode Toggle**: Interactive switch between Live Capture (detailed descriptions) and Navigation (short obstacle-focused descriptions) with animated purple gradient slider
- **Camera Source Selector**: Toggle between Device Camera and Arduino Camera with animated green gradient slider
- Live video preview for sighted companions (when using device camera)
- Clear status indicators (visual dots with color states: active/processing/error)
- Language selection dropdown with 20 languages (switchable during operation)
- Voice speed slider (0.5x - 2.5x) with real-time adjustment during playback
- Large, accessible control buttons with icons
- Gradient background (indigo to purple to pink) for visual appeal
- Smooth animations and transitions
- Fully responsive design for mobile and desktop

**Dynamic Features**:
- **Real-time Speed Control**: Users can adjust playback speed (0.5x - 2.5x) even while audio is playing, and the change takes effect immediately
- **Instant Language Switching**: Users can change the output language at any time during operation without stopping the camera - the next description will use the new language

### Backend Architecture
**Flask Application**: Lightweight Python web server chosen for:
- Simplicity and rapid development
- Easy integration with Google AI libraries
- Minimal overhead for the core image analysis task

**API Endpoint Design**: Single `/analyze` endpoint that:
- Accepts base64-encoded image data via POST
- Handles data URL format automatically (strips prefix)
- Returns AI-generated descriptions

**AI Integration**: Uses Google Gemini 2.5 Flash model with:
- Multimodal input (image + text prompt)
- Text response that is converted to speech via ElevenLabs API
- Multilingual support (20 languages) with dynamic prompt generation
- Optimized prompt: "Describe this image concisely, in a single sentence, for a screen reader or visually impaired user. Respond in {language}."

**Text-to-Speech**: Uses ElevenLabs API for high-quality audio generation:
- Model: `eleven_multilingual_v2` for ultra-realistic multilingual voices
- Default voice: "Adam" (pNInz6obpgDQGcFmaJgB) - supports 32+ languages
- Output format: MP3 at 44.1kHz, 128kbps
- Fallback: Browser Web Speech API if ElevenLabs fails

**CORS Configuration**: Enables cross-origin requests to support development and potential frontend-backend separation.

### Data Flow
1. User selects preferred language and voice speed (changeable anytime during operation)
2. User selects camera source (Device Camera or Arduino Camera)
3. Frontend captures image based on selected source:
   - **Device Camera**: Captures video frame to canvas element (hidden) and converts to base64-encoded JPEG
   - **Arduino Camera**: Fetches image directly from ngrok URL and converts to base64-encoded JPEG
4. Image data, language code, and mode sent to `/analyze` endpoint via fetch API
5. Backend decodes image and sends to Gemini API with mode-specific and language-specific prompt
6. Gemini returns text description in the requested language (detailed for Live mode, short for Navigation mode)
7. Backend sends text to ElevenLabs API to generate MP3 audio
8. Frontend receives audio and plays it at the selected speed (adjustable in real-time)
9. Cycle immediately repeats as soon as previous description completes (continuous loop with no artificial delays)
10. On errors, waits 3 seconds before retrying to prevent server flooding

### Error Handling
- Frontend includes try-catch blocks for camera access with multiple fallback attempts
- Backend validates request data before processing
- Status updates provide user feedback throughout the process

## External Dependencies

### AI Services
**Google Gemini API**: Core dependency for image-to-text description
- Model: `gemini-2.5-flash`
- Capabilities: Vision analysis, multilingual text generation
- Authentication: API key via environment variable `GEMINI_API_KEY`
- Supported languages: English, Spanish, French, German, Italian, Portuguese, Russian, Japanese, Korean, Chinese, Arabic, Hindi, Bengali, Dutch, Polish, Turkish, Vietnamese, Thai, Indonesian, Ukrainian

### Python Libraries
- **Flask**: Web framework for HTTP server and routing
- **flask-cors**: CORS middleware for cross-origin requests
- **google-genai**: Official Google Generative AI Python client
- **elevenlabs**: ElevenLabs API client for text-to-speech generation

### Browser APIs
- **MediaDevices API**: Camera access and video streaming with fallback logic
- **Canvas API**: Frame capture and image encoding
- **Fetch API**: HTTP communication with backend
- **Web Speech API (SpeechSynthesis)**: Text-to-speech with customizable voice speed

### Environment Configuration
- `GEMINI_API_KEY`: Required environment variable for API authentication
- No database dependency (stateless application)
- Static file serving from Flask (development setup)

### Development Tools
- No explicit build tools or bundlers
- Static assets served directly
- Cross-origin resource sharing enabled for flexible deployment