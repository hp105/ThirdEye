# Visual Assistance App

## Overview

This is a real-time visual assistance application designed to help visually impaired users understand their surroundings through their device camera. The application captures images at regular intervals (every 1.5 seconds) and uses Google's Gemini AI to generate concise, spoken descriptions of what the camera sees. The system provides audio feedback, making it accessible for screen reader users.

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

**User Interface**: Minimalist design with:
- Live video preview for sighted companions
- Clear status indicators (visual dots with color states)
- Large, accessible control buttons
- Gradient background for visual appeal while maintaining contrast

### Backend Architecture
**Flask Application**: Lightweight Python web server chosen for:
- Simplicity and rapid development
- Easy integration with Google AI libraries
- Minimal overhead for the core image analysis task

**API Endpoint Design**: Single `/analyze` endpoint that:
- Accepts base64-encoded image data via POST
- Handles data URL format automatically (strips prefix)
- Returns AI-generated descriptions

**AI Integration**: Uses Google Gemini 2.0 Flash Experimental model with:
- Multimodal input (image + text prompt)
- Audio response modality for direct text-to-speech output
- Optimized prompt: "Describe this image concisely, in a single sentence, for a screen reader or visually impaired user"

**CORS Configuration**: Enables cross-origin requests to support development and potential frontend-backend separation.

### Data Flow
1. Frontend captures video frame to canvas element (hidden) every 1.5 seconds
2. Canvas converts frame to base64-encoded JPEG
3. Image data sent to `/analyze` endpoint via fetch API
4. Backend decodes image and sends to Gemini API with audio response modality
5. Gemini returns audio description as base64-encoded audio data
6. Frontend receives audio data and automatically plays it through the browser's Audio API
7. Cycle repeats every 1.5 seconds while camera is active

### Error Handling
- Frontend includes try-catch blocks for camera access with multiple fallback attempts
- Backend validates request data before processing
- Status updates provide user feedback throughout the process

## External Dependencies

### AI Services
**Google Gemini API**: Core dependency for image-to-audio description
- Model: `gemini-2.0-flash-exp`
- Capabilities: Vision analysis, text generation, audio output
- Authentication: API key via environment variable `GEMINI_API_KEY`
- Configuration: Uses multimodal content with audio response modality

### Python Libraries
- **Flask**: Web framework for HTTP server and routing
- **flask-cors**: CORS middleware for cross-origin requests
- **google-genai**: Official Google Generative AI Python client

### Browser APIs
- **MediaDevices API**: Camera access and video streaming
- **Canvas API**: Frame capture and image encoding
- **Fetch API**: HTTP communication with backend
- **Web Audio API**: (Implied) Audio playback for responses

### Environment Configuration
- `GEMINI_API_KEY`: Required environment variable for API authentication
- No database dependency (stateless application)
- Static file serving from Flask (development setup)

### Development Tools
- No explicit build tools or bundlers
- Static assets served directly
- Cross-origin resource sharing enabled for flexible deployment