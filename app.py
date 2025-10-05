import os
import base64
import requests
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from google import genai
from google.genai import types
from elevenlabs.client import ElevenLabs

app = Flask(__name__, static_folder='static', static_url_path='')
CORS(app)

gemini_client = genai.Client(api_key=os.environ.get("GEMINI_API_KEY"))

# Initialize ElevenLabs TTS client
try:
    elevenlabs_api_key = os.environ.get("ELEVENLABS_API_KEY")
    if elevenlabs_api_key:
        elevenlabs_client = ElevenLabs(api_key=elevenlabs_api_key)
        print("ElevenLabs TTS client initialized successfully")
    else:
        print("Warning: ELEVENLABS_API_KEY not found")
        elevenlabs_client = None
except Exception as e:
    print(f"Warning: Could not initialize ElevenLabs client: {e}")
    elevenlabs_client = None

@app.route('/')
def index():
    return send_from_directory('.', 'index.html')

@app.route('/fetch-arduino-image', methods=['GET'])
def fetch_arduino_image():
    """Proxy endpoint to fetch images from Arduino camera via ngrok"""
    try:
        arduino_url = 'https://mythoclastic-sustainingly-carolynn.ngrok-free.dev'
        
        # Fetch the image from Arduino camera
        response = requests.get(
            arduino_url,
            headers={'ngrok-skip-browser-warning': 'true'},
            timeout=10
        )
        
        if response.status_code != 200:
            return jsonify({'error': f'Arduino camera returned status {response.status_code}'}), 502
        
        # Convert image bytes to base64
        image_base64 = base64.b64encode(response.content).decode('utf-8')
        
        # Determine content type
        content_type = response.headers.get('Content-Type', 'image/jpeg')
        
        # Return as data URL
        data_url = f"data:{content_type};base64,{image_base64}"
        
        return jsonify({
            'success': True,
            'image': data_url
        })
        
    except requests.exceptions.Timeout:
        return jsonify({'error': 'Arduino camera request timed out'}), 504
    except requests.exceptions.ConnectionError:
        return jsonify({'error': 'Could not connect to Arduino camera'}), 502
    except Exception as e:
        print(f"Error fetching Arduino image: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': f'Failed to fetch Arduino image: {str(e)}'}), 500

LANGUAGE_NAMES = {
    'en': 'English',
    'es': 'Spanish',
    'fr': 'French',
    'de': 'German',
    'it': 'Italian',
    'pt': 'Portuguese',
    'ru': 'Russian',
    'ja': 'Japanese',
    'ko': 'Korean',
    'zh': 'Chinese',
    'ar': 'Arabic',
    'hi': 'Hindi',
    'bn': 'Bengali',
    'nl': 'Dutch',
    'pl': 'Polish',
    'tr': 'Turkish',
    'vi': 'Vietnamese',
    'th': 'Thai',
    'id': 'Indonesian',
    'uk': 'Ukrainian'
}

# Map language codes to Google Cloud TTS language codes (BCP-47)
LANGUAGE_CODE_MAP = {
    'en': 'en-US',
    'es': 'es-ES',
    'fr': 'fr-FR',
    'de': 'de-DE',
    'it': 'it-IT',
    'pt': 'pt-BR',
    'ru': 'ru-RU',
    'ja': 'ja-JP',
    'ko': 'ko-KR',
    'zh': 'zh-CN',
    'ar': 'ar-XA',
    'hi': 'hi-IN',
    'bn': 'bn-IN',
    'nl': 'nl-NL',
    'pl': 'pl-PL',
    'tr': 'tr-TR',
    'vi': 'vi-VN',
    'th': 'th-TH',
    'id': 'id-ID',
    'uk': 'uk-UA'
}

@app.route('/analyze', methods=['POST'])
def analyze_image():
    try:
        data = request.json
        if not data:
            return jsonify({'error': 'No data provided'}), 400
            
        image_data = data.get('image')
        language_code = data.get('language', 'en')
        mode = data.get('mode', 'live')  # Get mode (live or navigation)
        
        if not image_data:
            return jsonify({'error': 'No image data provided'}), 400
        
        if image_data.startswith('data:image'):
            image_data = image_data.split(',')[1]
        
        image_bytes = base64.b64decode(image_data)
        
        language_name = LANGUAGE_NAMES.get(language_code, 'English')
        
        # Step 1: Get text description from Gemini
        # Different prompts based on mode
        if mode == 'navigation':
            # Navigation mode: shorter, obstacle-focused descriptions
            if language_code == 'en':
                prompt = "For a visually impaired user navigating: in 5-10 words, identify obstacles, hazards, or clear path ahead. Focus on immediate safety and navigation."
            else:
                prompt = f"You must respond ONLY in {language_name}. For a visually impaired user navigating: in 5-10 words, identify obstacles, hazards, or clear path ahead. Focus on immediate safety and navigation. Your entire response must be in {language_name}."
        else:
            # Live capture mode: detailed descriptions
            if language_code == 'en':
                prompt = "Describe this image concisely, in a single sentence, for a screen reader or visually impaired user."
            else:
                prompt = f"You must respond ONLY in {language_name}. Describe this image concisely, in a single sentence, for a screen reader or visually impaired user. Your entire response must be in {language_name}, not English."
        
        print(f"Mode: {mode}")
        print(f"Language requested: {language_name} ({language_code})")
        print(f"Prompt: {prompt}")
        
        response = gemini_client.models.generate_content(
            model="gemini-2.5-flash",
            contents=[
                types.Part.from_bytes(
                    data=image_bytes,
                    mime_type="image/jpeg",
                ),
                prompt
            ]
        )
        
        if not response.text:
            return jsonify({'error': 'No text response generated'}), 500
        
        description_text = response.text
        print(f"Gemini response: {description_text}")
        
        # Step 2: Convert text to audio using ElevenLabs
        if elevenlabs_client is None:
            # Fallback: return text if TTS is not available
            print("Warning: ElevenLabs client not available, returning text only")
            return jsonify({
                'text': description_text,
                'language': language_code
            })
        
        # Try to generate audio, but fallback to text if it fails
        try:
            print(f"Generating audio with ElevenLabs for language: {language_code}")
            
            # Generate speech using ElevenLabs
            # Using the default multilingual voice
            audio_generator = elevenlabs_client.text_to_speech.convert(
                text=description_text,
                voice_id="pNInz6obpgDQGcFmaJgB",  # Default multilingual voice (Adam)
                model_id="eleven_multilingual_v2",
                output_format="mp3_44100_128"
            )
            
            # Collect all audio chunks
            audio_bytes = b""
            for chunk in audio_generator:
                if isinstance(chunk, bytes):
                    audio_bytes += chunk
            
            # Convert audio to base64 for transmission
            audio_base64 = base64.b64encode(audio_bytes).decode('utf-8')
            
            print(f"ElevenLabs audio generated successfully ({len(audio_bytes)} bytes)")
            
            return jsonify({
                'audio': audio_base64,
                'text': description_text,
                'language': language_code
            })
            
        except Exception as tts_error:
            # If TTS fails, fallback to returning text for browser TTS
            print(f"Warning: ElevenLabs generation failed: {tts_error}")
            import traceback
            traceback.print_exc()
            print("Falling back to browser TTS")
            return jsonify({
                'text': description_text,
                'language': language_code
            })
        
    except Exception as e:
        print(f"Error: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
