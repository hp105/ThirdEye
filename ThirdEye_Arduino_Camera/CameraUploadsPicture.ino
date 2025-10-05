#include "esp_camera.h"
#include <WiFi.h>
#include <HTTPClient.h>
#include <WiFiClientSecure.h>

#define CAMERA_MODEL_WROVER_KIT

#include "camera_pins.h"

const char *ssid_Router = "OnePlus10pro";
const char *password_Router = "Th!rdEye$#";

// ThirdEye server upload URL
const char *uploadUrl = "https://workspace-hupatel1052000.replit.dev/upload-arduino-image";

camera_config_t config;

void camera_init() {
  config.ledc_channel = LEDC_CHANNEL_0;
  config.ledc_timer = LEDC_TIMER_0;
  config.pin_d0 = Y2_GPIO_NUM;
  config.pin_d1 = Y3_GPIO_NUM;
  config.pin_d2 = Y4_GPIO_NUM;
  config.pin_d3 = Y5_GPIO_NUM;
  config.pin_d4 = Y6_GPIO_NUM;
  config.pin_d5 = Y7_GPIO_NUM;
  config.pin_d6 = Y8_GPIO_NUM;
  config.pin_d7 = Y9_GPIO_NUM;
  config.pin_xclk = XCLK_GPIO_NUM;
  config.pin_pclk = PCLK_GPIO_NUM;
  config.pin_vsync = VSYNC_GPIO_NUM;
  config.pin_href = HREF_GPIO_NUM;
  config.pin_sccb_sda = SIOD_GPIO_NUM;
  config.pin_sccb_scl = SIOC_GPIO_NUM;
  config.pin_pwdn = PWDN_GPIO_NUM;
  config.pin_reset = RESET_GPIO_NUM;
  config.xclk_freq_hz = 10000000;
  config.frame_size = FRAMESIZE_QVGA;
  config.pixel_format = PIXFORMAT_JPEG;
  config.grab_mode = CAMERA_GRAB_WHEN_EMPTY;
  config.fb_location = CAMERA_FB_IN_PSRAM;
  config.jpeg_quality = 10;
  config.fb_count = 2;
}

void uploadImageToThirdEye() {
  // Capture photo
  camera_fb_t *fb = esp_camera_fb_get();
  if (!fb) {
    Serial.println("Camera capture failed");
    return;
  }

  Serial.printf("Captured image: %d bytes\n", fb->len);

  // Upload to ThirdEye server
  if (WiFi.status() == WL_CONNECTED) {
    // Create secure WiFi client for HTTPS
    WiFiClientSecure *client = new WiFiClientSecure;
    
    if (client) {
      // Skip SSL certificate verification (for easier connection)
      client->setInsecure();
      
      HTTPClient http;
      
      // Use the secure client with HTTPClient
      http.begin(*client, uploadUrl);
      http.addHeader("Content-Type", "image/jpeg");
      
      // Increase timeout for large images
      http.setTimeout(15000);
      
      // POST image as raw binary
      int httpResponseCode = http.POST(fb->buf, fb->len);
      
      if (httpResponseCode > 0) {
        String response = http.getString();
        Serial.printf("✅ Upload successful! Response code: %d\n", httpResponseCode);
        Serial.println(response);
      } else {
        Serial.printf("❌ Upload failed. Error code: %d\n", httpResponseCode);
        Serial.println("Possible causes:");
        Serial.println("- Check internet connection");
        Serial.println("- Verify server URL is correct");
        Serial.println("- Check if server is running");
      }
      
      http.end();
      delete client;
    } else {
      Serial.println("Unable to create secure client");
    }
  } else {
    Serial.println("WiFi not connected");
  }

  // Return the frame buffer
  esp_camera_fb_return(fb);
}

void setup() {
  Serial.begin(115200);
  delay(1000);
  
  Serial.println("\nStarting ThirdEye Arduino Camera");
  Serial.print("Connecting to WiFi: ");
  Serial.println(ssid_Router);
  
  // Initialize camera
  camera_init();
  esp_err_t err = esp_camera_init(&config);
  if (err != ESP_OK) {
    Serial.printf("Camera init failed with error 0x%x\n", err);
    return;
  }
  
  // Configure camera settings
  sensor_t *s = esp_camera_sensor_get();
  s->set_vflip(s, 0);
  s->set_hmirror(s, 0);
  s->set_brightness(s, 1);
  s->set_saturation(s, -1);
  
  // Connect to WiFi
  WiFi.begin(ssid_Router, password_Router);
  WiFi.setSleep(false);
  
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  
  Serial.println("\n✅ WiFi connected");
  Serial.print("IP address: ");
  Serial.println(WiFi.localIP());
  Serial.println("\n📷 Camera ready! Starting continuous upload to ThirdEye...");
  Serial.print("Upload URL: ");
  Serial.println(uploadUrl);
}

void loop() {
  // Capture and upload image every 3 seconds
  uploadImageToThirdEye();
  delay(3000);
}
