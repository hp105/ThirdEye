import os
import base64
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from google import genai
from google.genai import types

app = Flask(__name__, static_folder='static', static_url_path='')
CORS(app)

client = genai.Client(api_key=os.environ.get("GEMINI_API_KEY"))

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
        
        # Make the language requirement very explicit
        if language_code == 'en':
            prompt = "Describe this image concisely, in a single sentence, for a screen reader or visually impaired user."
        else:
            prompt = f"You must respond ONLY in {language_name}. Describe this image concisely, in a single sentence, for a screen reader or visually impaired user. Your entire response must be in {language_name}, not English."
        
        print(f"Language requested: {language_name} ({language_code})")
        print(f"Prompt: {prompt}")
        
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=[
                types.Part.from_bytes(
                    data=image_bytes,
                    mime_type="image/jpeg",
                ),
                prompt
            ]
        )
        
        if response.text:
            print(f"Gemini response: {response.text}")
            return jsonify({
                'text': response.text,
                'language': language_code
            })
        
        return jsonify({'error': 'No text response generated'}), 500
        
    except Exception as e:
        print(f"Error: {str(e)}")
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
