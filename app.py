import os
import base64
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from google import genai
from google.genai import types
from google.cloud import texttospeech

app = Flask(__name__, static_folder='static', static_url_path='')
CORS(app)

gemini_client = genai.Client(api_key=os.environ.get("GEMINI_API_KEY"))

# Initialize Google Cloud TTS client
# It will use GOOGLE_APPLICATION_CREDENTIALS env var if set, or the API key
try:
    tts_client = texttospeech.TextToSpeechClient()
    print("Google Cloud TTS client initialized successfully")
except Exception as e:
    print(f"Warning: Could not initialize Google Cloud TTS client: {e}")
    print("Make sure you have set up Google Cloud credentials")
    tts_client = None

@app.route('/')
def index():
    return send_from_directory('.', 'index.html')

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

@app.route('/analyze', methods=['POST'])
def analyze_image():
    try:
        data = request.json
        if not data:
            return jsonify({'error': 'No data provided'}), 400
            
        image_data = data.get('image')
        language_code = data.get('language', 'en')
        
        if not image_data:
            return jsonify({'error': 'No image data provided'}), 400
        
        if image_data.startswith('data:image'):
            image_data = image_data.split(',')[1]
        
        image_bytes = base64.b64decode(image_data)
        
        language_name = LANGUAGE_NAMES.get(language_code, 'English')
        
        # Step 1: Get text description from Gemini
        if language_code == 'en':
            prompt = "Describe this image concisely, in a single sentence, for a screen reader or visually impaired user."
        else:
            prompt = f"You must respond ONLY in {language_name}. Describe this image concisely, in a single sentence, for a screen reader or visually impaired user. Your entire response must be in {language_name}, not English."
        
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
        
        # Step 2: Convert text to audio using Google Cloud TTS
        if tts_client is None:
            # Fallback: return text if TTS is not available
            print("Warning: TTS client not available, returning text only")
            return jsonify({
                'text': description_text,
                'language': language_code
            })
        
        # Configure TTS request
        synthesis_input = texttospeech.SynthesisInput(text=description_text)
        
        # Select voice based on language
        voice = texttospeech.VoiceSelectionParams(
            language_code=language_code,
            ssml_gender=texttospeech.SsmlVoiceGender.NEUTRAL
        )
        
        # Configure audio output (MP3 format)
        audio_config = texttospeech.AudioConfig(
            audio_encoding=texttospeech.AudioEncoding.MP3
        )
        
        print(f"Generating audio for language: {language_code}")
        
        # Generate speech
        tts_response = tts_client.synthesize_speech(
            input=synthesis_input,
            voice=voice,
            audio_config=audio_config
        )
        
        # Convert audio to base64 for transmission
        audio_base64 = base64.b64encode(tts_response.audio_content).decode('utf-8')
        
        print(f"Audio generated successfully ({len(tts_response.audio_content)} bytes)")
        
        return jsonify({
            'audio': audio_base64,
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
