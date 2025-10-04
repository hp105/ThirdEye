# ThirdEye - AI Vision Assistant

## Overview

ThirdEye is a real-time AI-powered vision assistance application designed to help visually impaired users understand their surroundings through their device camera. The application captures images at regular intervals (every 1.5 seconds) and uses Google's Gemini AI to generate concise, spoken descriptions in multiple languages. The system provides audio feedback using browser-native text-to-speech, making it highly accessible for visually impaired users with customizable voice speeds.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
**Single-Page Application (SPA)**: The application uses a simple, vanilla JavaScript approach without frameworks to minimize complexity and ensure fast load times for accessibility purposes.

**Camera Integration**: Uses the WebRTC Media Capture API (`navigator.mediaDevices.getUserMedia`) with intelligent fallback logic:
- First attempts to access rear-facing camera (environment mode) for better scene capture
- Falls back to front-facing camera if unavailable
- Finally attempts default camera as last resort
- This progressive degradation ensures maximum device compatibility

**Capture Strategy**: Implements interval-based image capture (1.5 seconds) rather than continuous streaming to:
- Reduce API costs and server load
- Provide digestible information flow for users
- Balance responsiveness with system resources

**User Interface**: Modern, accessible design with:
- ThirdEye branding with eye icon and animated effects
- Live video preview for sighted companions
- Clear status indicators (visual dots with color states: active/processing/error)
- Language selection dropdown with 20 languages
- Voice speed slider (0.5x - 2.5x) for customizable playback
- Large, accessible control buttons with icons
- Gradient background (indigo to purple to pink) for visual appeal
- Smooth animations and transitions
- Fully responsive design for mobile and desktop

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
- Text response that is converted to speech via browser's Web Speech API
- Multilingual support (20 languages) with dynamic prompt generation
- Optimized prompt: "Describe this image concisely, in a single sentence, for a screen reader or visually impaired user. Respond in {language}."

**CORS Configuration**: Enables cross-origin requests to support development and potential frontend-backend separation.

### Data Flow
1. User selects preferred language and voice speed
2. Frontend captures video frame to canvas element (hidden) every 1.5 seconds
3. Canvas converts frame to base64-encoded JPEG
4. Image data and language code sent to `/analyze` endpoint via fetch API
5. Backend decodes image and sends to Gemini API with language-specific prompt
6. Gemini returns text description in the requested language
7. Frontend receives text and uses Web Speech API to speak it at selected speed
8. Cycle repeats every 1.5 seconds while camera is active

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