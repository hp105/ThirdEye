========================================
ThirdEye Arduino Camera - Setup Guide
========================================

📋 WHAT'S INCLUDED:
- CameraUploadsPicture.ino (Main Arduino code)
- camera_pins.h (Pin definitions for various ESP32 camera boards)

📦 REQUIRED HARDWARE:
- ESP32 camera board (AI-Thinker, WROVER, ESP-EYE, M5Stack, etc.)
- WiFi connection

🔧 SETUP STEPS:

1. Open Arduino IDE
2. Install ESP32 board support (if not installed):
   - File → Preferences → Additional Board URLs: https://dl.espressif.com/dl/package_esp32_index.json
   - Tools → Board → Boards Manager → Search "ESP32" → Install

3. Open CameraUploadsPicture.ino

4. CONFIGURE YOUR SETTINGS:
   
   Line 5: Set your camera model (uncomment ONE):
   ✅ #define CAMERA_MODEL_WROVER_KIT        (Currently selected)
   // #define CAMERA_MODEL_AI_THINKER
   // #define CAMERA_MODEL_ESP_EYE
   // #define CAMERA_MODEL_M5STACK_PSRAM
   // etc. (see camera_pins.h for all supported models)

   Line 9-10: WiFi Credentials:
   const char *ssid_Router = "YOUR_WIFI_NAME";
   const char *password_Router = "YOUR_WIFI_PASSWORD";

   Line 13: ThirdEye Server URL:
   const char *uploadUrl = "https://workspace-hupatel1052000.replit.dev/upload-arduino-image";

5. Select your board and port:
   - Tools → Board → ESP32 Arduino → (Select your board)
   - Tools → Port → (Select your COM port)

6. Click Upload

7. Open Serial Monitor (115200 baud) to see status

🚀 HOW IT WORKS:

✅ Arduino connects to WiFi
✅ Initializes camera
✅ Captures image every 3 seconds
✅ POSTs image to ThirdEye server
✅ ThirdEye uses latest image for AI description

📱 TO USE WITH THIRDEYE:

1. Power on Arduino (uploads will start automatically)
2. Open ThirdEye web app
3. Select "Arduino Camera" from camera source toggle
4. Click "Start"
5. Enjoy real-time AI descriptions!

🔍 TROUBLESHOOTING:

Camera init failed:
- Check camera model definition matches your hardware
- Verify camera is properly connected

WiFi connection fails:
- Double-check WiFi credentials
- Ensure WiFi is 2.4GHz (ESP32 doesn't support 5GHz)

Upload fails (Error -1):
- Check server URL is correct
- Verify internet connection
- Make sure ThirdEye server is running

❓ SUPPORTED CAMERA MODELS:
See camera_pins.h for pin configurations of:
- CAMERA_MODEL_WROVER_KIT
- CAMERA_MODEL_AI_THINKER
- CAMERA_MODEL_ESP_EYE
- CAMERA_MODEL_M5STACK_PSRAM
- CAMERA_MODEL_M5STACK_V2_PSRAM
- CAMERA_MODEL_M5STACK_WIDE
- CAMERA_MODEL_M5STACK_ESP32CAM
- CAMERA_MODEL_ESP32S3_EYE
- And more...

========================================
Need help? Check Serial Monitor output!
========================================
