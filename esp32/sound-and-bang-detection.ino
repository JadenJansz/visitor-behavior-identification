#include <WiFi.h>
#include <WiFiMulti.h>
#include <WebSocketsClient_Generic.h>

WiFiMulti WiFiMulti;
WebSocketsClient webSocket;

const char* ssid = "";                 // Your Wi-Fi network name(ssid)
const char* password = "";        // Your Wi-Fi network password
const char* websocketHost = "weatherlkbackend.onrender.com";
const int websocketPort = 443;
const char* websocketUrl = "/";

// Piezo sensor settings
#define PIEZO_PIN 34                // piezo sensor
#define BANG_THRESHOLD 1000         // Adjust based on testing to detect a bang
#define DEBOUNCE_TIME 10000          // Increased debounce time to avoid rapid repeat detections

// Sound sensor settings
#define SOUND_SENSOR_PIN 35         // Analog pin for sound sensor
#define CALIBRATION_FACTOR 0.06     // Calibration factor for dB calculation
#define OFFSET 10                   // Offset for approximate dB calculation
#define DB_THRESHOLD 90             // Threshold in dB for very loud noise

// Timing variables
unsigned long lastBangTime = 0;
unsigned long lastSoundTime = 0;
const unsigned long soundDebounceTime = 500; // Time to wait before checking sound again

// Messages for WebSocket
String bangMessage = "Banging Detected!";
String loudNoiseMessage = "Very loud noise detected!";

void webSocketEvent(WStype_t type, uint8_t * payload, size_t length) {
  switch (type) {
    case WStype_DISCONNECTED:
      Serial.println("[WSc] Disconnected!");
      break;
    case WStype_CONNECTED:
      Serial.print("[WSc] Connected to URL: ");
      Serial.println((char *) payload);
      break;
    case WStype_TEXT:
      Serial.printf("[WSc] Received text: %s\n", payload);
      break;
    case WStype_BIN:
      Serial.printf("[WSc] Received binary length: %u\n", length);
      break;
    default:
      break;
  }
}

float calculateDb(int analogValue) {
  return (analogValue * CALIBRATION_FACTOR) + OFFSET;
}

void setup() {
  Serial.begin(115200);
  delay(200);

  Serial.println("Starting WebSocket Client");

  WiFiMulti.addAP(ssid, password);
  while (WiFiMulti.run() != WL_CONNECTED) {
    Serial.print(".");
    delay(100);
  }
  
  Serial.println();
  Serial.print("Connected to Wi-Fi, IP address: ");
  Serial.println(WiFi.localIP());

  Serial.print("Connecting to WebSocket server at ");
  Serial.println(websocketHost);

  // Secure WebSocket connection
  webSocket.beginSSL(websocketHost, websocketPort, websocketUrl);
  webSocket.onEvent(webSocketEvent);
  webSocket.setReconnectInterval(5000);
  webSocket.enableHeartbeat(15000, 3000, 2);  // Optional: Ping every 15s, disconnect after 2 failed pings
}

void loop() {
  webSocket.loop();

  // Bang detection
  int piezoValue = analogRead(PIEZO_PIN);
  if (piezoValue > BANG_THRESHOLD && (millis() - lastBangTime) > DEBOUNCE_TIME) {
    Serial.println("Identify humans banging (tapping very loudly) on glass surfaces!");
    webSocket.sendTXT(bangMessage);  
    lastBangTime = millis();
    delay(100);
  }

  // Sound level detection
  int soundLevel = analogRead(SOUND_SENSOR_PIN);
  float dB = calculateDb(soundLevel);
   Serial.print("Estimated dB: ");
    Serial.println(dB);

  if (dB > DB_THRESHOLD && (millis() - lastSoundTime) > soundDebounceTime) {
    Serial.println("Very loud noise detected!");
   
    webSocket.sendTXT(loudNoiseMessage);
    lastSoundTime = millis();
    delay(100);
  }

  delay(100); 
}