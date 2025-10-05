"""
Arduino/Raspberry Pi Camera Server
This Flask server captures images from a camera and serves them via HTTP.
Run this on your Arduino/Raspberry Pi with a camera attached.

Setup:
1. Install required packages:
   pip install flask opencv-python

2. Run the server:
   python arduino_camera_server.py

3. Expose via ngrok:
   ngrok http 8080

4. Use the ngrok URL in ThirdEye's Arduino Camera option
"""

from flask import Flask, send_file, jsonify
from flask_cors import CORS
import cv2
import io
from datetime import datetime

app = Flask(__name__)
CORS(app)

# Initialize camera (0 is usually the default camera)
camera = None

def init_camera():
    """Initialize the camera"""
    global camera
    try:
        camera = cv2.VideoCapture(0)
        if not camera.isOpened():
            print("Error: Could not open camera")
            return False
        # Set camera resolution (optional)
        camera.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
        camera.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
        print("Camera initialized successfully")
        return True
    except Exception as e:
        print(f"Error initializing camera: {e}")
        return False

@app.route('/', methods=['GET'])
def capture_image():
    """Capture and return the latest image from camera"""
    global camera
    
    if camera is None or not camera.isOpened():
        if not init_camera():
            return jsonify({'error': 'Camera not available'}), 500
    
    try:
        # Capture frame
        ret, frame = camera.read()
        
        if not ret:
            return jsonify({'error': 'Failed to capture image'}), 500
        
        # Encode image as JPEG
        ret, buffer = cv2.imencode('.jpg', frame)
        
        if not ret:
            return jsonify({'error': 'Failed to encode image'}), 500
        
        # Convert to bytes
        image_bytes = io.BytesIO(buffer.tobytes())
        
        print(f"Image captured at {datetime.now()}")
        
        # Return image
        return send_file(
            image_bytes,
            mimetype='image/jpeg',
            as_attachment=False
        )
        
    except Exception as e:
        print(f"Error capturing image: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    camera_status = 'available' if camera and camera.isOpened() else 'unavailable'
    return jsonify({
        'status': 'running',
        'camera': camera_status,
        'timestamp': datetime.now().isoformat()
    })

@app.route('/test', methods=['GET'])
def test():
    """Test endpoint"""
    return jsonify({'message': 'Arduino Camera Server is running'})

if __name__ == '__main__':
    print("Starting Arduino Camera Server...")
    print("Initializing camera...")
    
    if init_camera():
        print("Camera ready!")
        print("\nServer will run on http://0.0.0.0:8080")
        print("\nTo expose via ngrok, run in another terminal:")
        print("  ngrok http 8080")
        print("\nThen use the ngrok URL in ThirdEye\n")
        
        app.run(host='0.0.0.0', port=8080, debug=False)
    else:
        print("Failed to initialize camera. Please check your camera connection.")
