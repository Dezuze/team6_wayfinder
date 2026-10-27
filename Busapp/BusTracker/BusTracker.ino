/**
 * Bus Tracker IoT Project - Secure Multi-Mode Tracker
 * Microcontroller: STM32F103 ("Blue Pill" - STM32F103C8 / STM32F103C6, 32KB/64KB Flash)
 * 
 * Hardware Connections:
 * 1. ESP8266 WiFi Module (ESP-01 / AT firmware):
 *    - STM32 PA9  (USART1 TX)  -> ESP8266 RXD
 *    - STM32 PA10 (USART1 RX)  -> ESP8266 TXD
 *    - ESP8266 VCC & CH_PD     -> 3.3V (>= 250mA), GND -> Common GND
 * 
 * 2. GPS Module (u-blox NEO-6M):
 *    - STM32 PA3 (USART2 RX2)  -> GPS TX
 *    - STM32 PA2 (USART2 TX2)  -> GPS RX
 *    - GPS VCC                 -> 3.3V / 5V, GND -> Common GND
 * 
 * 3. OLED Display (0.96" SSD1306 I2C 128x64):
 *    - STM32 PB6               -> OLED SCL
 *    - STM32 PB7               -> OLED SDA (I2C Addr: 0x3C)
 * 
 * 4. Controls & Indicators:
 *    - Button 1 (Start/Connect): PA4 -> Push button to GND (Internal PULLUP)
 *    - Button 2 (SOS Alert):     PA5 -> Push button to GND (Internal PULLUP)
 *    - Battery Monitor:          PA1 -> Voltage divider
 *    - Heartbeat LED:            PC13 -> Onboard LED (Active LOW)
 */

#define NET_MODE_NONE 0  // GPS Monitor Only
#define NET_MODE_GSM  1  // SIM800L 2G GPRS
#define NET_MODE_WIFI 2  // ESP8266 WiFi

// Default Mode: ESP8266 WiFi
#define NETWORK_MODE NET_MODE_WIFI

#define ENABLE_WIFI (NETWORK_MODE == NET_MODE_WIFI)
#define ENABLE_GSM  (NETWORK_MODE == NET_MODE_GSM)

#include <Wire.h>
#include "TinyGpsMini.h"
#include "SSD1306Ascii.h"
#include "SSD1306AsciiWire.h"
#include "CryptoMini.h"

#if ENABLE_WIFI
  #include "Esp01Client.h"
  #include "TinyGsmWebSockets.h"
#elif ENABLE_GSM
  #define TINY_GSM_MODEM_SIM800
  #include <TinyGsmClient.h>
  #include "TinyGsmWebSockets.h"
#endif

// =============================================================
// --- USER & BUS IDENTITY (Bound to App Database) ---
// =============================================================
const char* busId          = "bus-7636158";      // App Bus ID (Bus NO-2)
const char* busNumber      = "Bus NO-2";         // Display label
const char* driverUsername = "driver.rahul";     // Driver account username
const char* driverName     = "Rahul Nair";       // Driver display name

// =============================================================
// --- NETWORK & SERVER CONFIGURATION ---
// =============================================================
#if ENABLE_WIFI
  const char wifi_ssid[] = "huh?";
  const char wifi_pass[] = "12345678";
  // Local Development Server (Fastify Node.js on PC)
  const char* websockets_server_host = "10.168.251.161";
  const uint16_t websockets_server_port = 3001;  // Local Fastify server port
  const char* websockets_server_path = "/ws";    // Real-time WebSocket endpoint
#elif ENABLE_GSM
  const char apn[]  = "bsnlnet";
  const char user[] = "";
  const char pass[] = "";
  // Local Development Server
  const char* websockets_server_host = "10.168.251.161";
  const uint16_t websockets_server_port = 3001;
  const char* websockets_server_path = "/ws";
#endif

// =============================================================
// --- END-TO-END ENCRYPTION PRE-SHARED KEY (256-bit ChaCha20) ---
// =============================================================
// Protects telemetry over untrusted WiFi / cellular networks
const uint8_t tracker_secret_key[32] = {
  'T','E','A','M','6','_','W','A','Y','F','I','N','D','E','R','_',
  'S','E','C','R','E','T','_','K','E','Y','_','2','0','2','6','!'
};

// Pin Definitions
#define BUTTON_START_STOP PA4
#define BUTTON_SOS        PA5
#define BATTERY_PIN       PA1
#define LED_PIN           PC13
#define I2C_ADDRESS       0x3C

SSD1306AsciiWire oled;
Uart SerialGPS(PA3, PA2); // USART2: PA3 RX, PA2 TX -> NEO-6M GPS

#if ENABLE_WIFI
  Uart SerialESP(PA10, PA9); // USART1: PA10 RX, PA9 TX -> ESP8266
  Esp01Client espClient;
  SimpleWebSocketClient wsClient;
#elif ENABLE_GSM
  Uart SerialGSM(PA10, PA9); // USART1: PA10 RX, PA9 TX -> SIM800L
  TinyGsm modem(SerialGSM);
  TinyGsmClient client(modem);
  SimpleWebSocketClient wsClient;
#endif

// GPS Telemetry State
char gpsLat[12] = "9.674160";
char gpsLng[12] = "76.825730";
char gpsSpd[8]  = "0";
uint8_t gpsSats = 0;
uint32_t gpsPackets = 0;
uint32_t gpsRawBytes = 0;
bool isGpsFixed = false;

// Device Lifecycle States
enum TrackerState {
  STATE_ACQUIRING_GPS,  // 1. Boot up: search and secure 3D satellite fix
  STATE_READY_TO_START, // 2. Satellite lock secured: waiting for user button click
  STATE_CONNECTING_NET, // 3. Button clicked: connecting WiFi & WebSocket
  STATE_LIVE_TRACKING,  // 4. Actively streaming encrypted telemetry
  STATE_PAUSED          // 5. Tracking paused by user
};

TrackerState trackerState = STATE_ACQUIRING_GPS;
bool sosActive = false;
unsigned long sosTimer = 0;

int batteryPercent = 100;
int batteryMilliVolts = 4100;

unsigned long lastSendTime = 0;
const unsigned long SEND_INTERVAL = 2000;
uint32_t packetCounter = 0;

// Button debounce
bool lastStartStopBtnState = HIGH;
bool lastSosBtnState       = HIGH;
unsigned long lastDebounce1 = 0;
unsigned long lastDebounce2 = 0;
const unsigned long DEBOUNCE_DELAY = 60;

// String helpers
static void appendStr(char* dest, const char* src) {
  while (*dest) dest++;
  while (*src) *dest++ = *src++;
  *dest = '\0';
}

static void appendInt(char* dest, int val) {
  char buf[8];
  itoa(val, buf, 10);
  appendStr(dest, buf);
}

// Battery measurement
void calculateBattery() {
  int adcValue = analogRead(BATTERY_PIN);
  batteryMilliVolts = (int)(((long)adcValue * 3300L * 32L) / (4095L * 22L));
  batteryPercent = (batteryMilliVolts - 3200) / 10;
  if (batteryPercent > 100) batteryPercent = 100;
  if (batteryPercent < 0) batteryPercent = 0;
}

// -------------------------------------------------------------
// OLED UI Display Functions - Unified Bordered Menu
// -------------------------------------------------------------
static const char* wifiStatusStr = "Standby";
static const char* wsStatusStr   = "Offline";

void drawMenuRow(const char* label, const char* val) {
  char valBuf[13];
  memset(valBuf, ' ', 12);
  valBuf[12] = '\0';
  int vlen = strlen(val);
  if (vlen > 12) vlen = 12;
  memcpy(valBuf, val, vlen);

  char lblBuf[5];
  memset(lblBuf, ' ', 4);
  lblBuf[4] = '\0';
  int llen = strlen(label);
  if (llen > 4) llen = 4;
  memcpy(lblBuf, label, llen);

  char line[22];
  snprintf(line, sizeof(line), "| %s: %s|", lblBuf, valBuf);
  oled.println(line);
}

void drawUnifiedMenu() {
  oled.home();

  // Row 0: Top Header with Border
  if (sosActive) {
    oled.println("+!-- SOS ALERT! ---!+");
  } else {
    oled.println("+--- BUS TRACKER ---+");
  }

  // Row 1: GPS Status & Satellites
  char gpsVal[13];
  if (isGpsFixed) {
    snprintf(gpsVal, sizeof(gpsVal), "FIX (%ds)", (int)gpsSats);
  } else if (gpsSats > 0) {
    snprintf(gpsVal, sizeof(gpsVal), "SEEK (%ds)", (int)gpsSats);
  } else if (gpsRawBytes == 0) {
    strncpy(gpsVal, "No UART Rx!", sizeof(gpsVal));
    gpsVal[12] = '\0';
  } else {
    snprintf(gpsVal, sizeof(gpsVal), "Rx:%lu", (unsigned long)(gpsRawBytes % 10000));
    gpsVal[12] = '\0';
  }
  drawMenuRow("GPS", gpsVal);

  // Row 2: GPS Position Coordinates
  char posVal[13];
  if (isGpsFixed) {
    char latShort[6];
    char lngShort[6];
    strncpy(latShort, gpsLat, 5);
    latShort[5] = '\0';
    strncpy(lngShort, gpsLng, 5);
    lngShort[5] = '\0';
    snprintf(posVal, sizeof(posVal), "%s,%s", latShort, lngShort);
  } else {
    strncpy(posVal, "Seeking Fix", sizeof(posVal));
    posVal[12] = '\0';
  }
  drawMenuRow("Pos", posVal);

  // Row 3: Network / WiFi Connection Status
  drawMenuRow("WiFi", wifiStatusStr);

  // Row 4: WebSocket Connection Status
  drawMenuRow("WS", wsStatusStr);

  // Row 5: Bus ID / Label
  drawMenuRow("Bus", busNumber);

  // Row 6: Speed & Battery / State
  char spdBattVal[13];
  if (trackerState == STATE_PAUSED) {
    snprintf(spdBattVal, sizeof(spdBattVal), "PAUSED  %d%%", batteryPercent);
  } else if (sosActive) {
    snprintf(spdBattVal, sizeof(spdBattVal), "!SOS!   %d%%", batteryPercent);
  } else {
    snprintf(spdBattVal, sizeof(spdBattVal), "%skm/h  %d%%", gpsSpd, batteryPercent);
  }
  drawMenuRow("Spd", spdBattVal);

  // Row 7: Bottom Border
  oled.println("+-------------------+");
}

// -------------------------------------------------------------
// Encrypted Telemetry Transmission
// -------------------------------------------------------------
void sendTelemetryPacket(const char* alertReason = nullptr) {
  if (!wsClient.available()) return;

  // 1. Build Plaintext Telemetry JSON safely
  char plainJson[240];
  if (alertReason) {
    snprintf(plainJson, sizeof(plainJson),
      "{\"type\":\"DRIVER_SOS\",\"busId\":\"%s\",\"driverName\":\"%s\",\"driverUsername\":\"%s\",\"lat\":%s,\"lng\":%s,\"reason\":\"%s\"}",
      busId, driverName, driverUsername, gpsLat, gpsLng, alertReason
    );
  } else {
    snprintf(plainJson, sizeof(plainJson),
      "{\"type\":\"DRIVER_LOCATION\",\"busId\":\"%s\",\"driverName\":\"%s\",\"driverUsername\":\"%s\",\"lat\":%s,\"lng\":%s,\"speed\":%s,\"status\":\"%s\",\"bearing\":0}",
      busId, driverName, driverUsername, gpsLat, gpsLng, gpsSpd,
      (trackerState == STATE_PAUSED) ? "Off Duty" : "In Transit"
    );
  }

  size_t plainLen = strlen(plainJson);
  if (plainLen > 230) plainLen = 230;

  // 2. Prepare 16-byte Nonce/IV with incrementing packetCounter
  packetCounter++;
  uint8_t iv[16];
  iv[0] = (uint8_t)(packetCounter & 0xFF);
  iv[1] = (uint8_t)((packetCounter >> 8) & 0xFF);
  iv[2] = (uint8_t)((packetCounter >> 16) & 0xFF);
  iv[3] = (uint8_t)((packetCounter >> 24) & 0xFF);
  const uint8_t devNonce[12] = {'T','E','A','M','6','_','N','O','N','C','E','1'};
  memcpy(&iv[4], devNonce, 12);

  // 3. Encrypt payload with ChaCha20
  uint8_t cipherBuf[240];
  ChaCha20Mini::process(tracker_secret_key, iv, (const uint8_t*)plainJson, cipherBuf, plainLen);

  // 4. Convert cipher & IV to Hex
  char cipherHex[484];
  ChaCha20Mini::toHex(cipherBuf, plainLen, cipherHex);

  char ivHex[34];
  ChaCha20Mini::toHex(iv, 16, ivHex);

  // 5. Build outer envelope safely
  char envelope[580];
  snprintf(envelope, sizeof(envelope),
    "{\"type\":\"ENCRYPTED_TELEMETRY\",\"iv\":\"%s\",\"data\":\"%s\"}",
    ivHex, cipherHex
  );

  wsClient.send(envelope);
}

// -------------------------------------------------------------
// Network Connection Handler
// -------------------------------------------------------------
bool connectToNetworkAndServer() {
#if ENABLE_WIFI
  wifiStatusStr = "Sync AT...";
  wsStatusStr   = "Standby";
  drawUnifiedMenu();

  bool espOk = false;
  for (int i = 0; i < 5; i++) {
    if (espClient.testAT(400)) {
      espOk = true;
      break;
    }
    delay(100);
  }
  if (!espOk) {
    wifiStatusStr = "AT Fail!";
    drawUnifiedMenu();
    delay(1500);
    return false;
  }

  wifiStatusStr = "Joining SSID";
  drawUnifiedMenu();
  if (!espClient.connectWifi(wifi_ssid, wifi_pass, 15000)) {
    wifiStatusStr = "WiFi Fail!";
    drawUnifiedMenu();
    delay(1500);
    return false;
  }
  wifiStatusStr = "Connected";

  wsStatusStr = "Connecting..";
  drawUnifiedMenu();
  if (!wsClient.connect(websockets_server_host, websockets_server_port, websockets_server_path)) {
    wsStatusStr = "WS Failed!";
    drawUnifiedMenu();
    delay(1500);
    return false;
  }

  wsStatusStr = "Online [ENC]";
  drawUnifiedMenu();
  delay(500);
  return true;

#elif ENABLE_GSM
  wifiStatusStr = "Sync SIM800";
  wsStatusStr   = "Standby";
  drawUnifiedMenu();

  if (!modem.testAT(500)) {
    wifiStatusStr = "Modem Fail!";
    drawUnifiedMenu();
    delay(1500);
    return false;
  }
  modem.init();

  wifiStatusStr = "Reg 2G Net..";
  drawUnifiedMenu();
  unsigned long start = millis();
  while (millis() - start < 20000) {
    if (modem.isNetworkConnected()) break;
    delay(600);
  }

  wifiStatusStr = "Attach GPRS";
  drawUnifiedMenu();
  if (!modem.gprsConnect(apn, user, pass)) {
    wifiStatusStr = "GPRS Fail!";
    drawUnifiedMenu();
    delay(1500);
    return false;
  }
  wifiStatusStr = "Connected";

  wsStatusStr = "Connecting..";
  drawUnifiedMenu();
  if (!wsClient.connect(websockets_server_host, websockets_server_port, websockets_server_path)) {
    wsStatusStr = "WS Failed!";
    drawUnifiedMenu();
    delay(1500);
    return false;
  }

  wsStatusStr = "Online [ENC]";
  drawUnifiedMenu();
  delay(500);
  return true;
#endif
}

// =============================================================
// SETUP
// =============================================================
void setup() {
  pinMode(BUTTON_START_STOP, INPUT_PULLUP);
  pinMode(BUTTON_SOS, INPUT_PULLUP);
  pinMode(LED_PIN, OUTPUT);
  digitalWrite(LED_PIN, HIGH); // Off initially (Active LOW)

  #if defined(ARDUINO_ARCH_STM32)
    analogReadResolution(12);
  #endif

  calculateBattery();

  // Initialize OLED with noise-immune clock & auto bus-recovery
  Wire.begin();
  Wire.setClock(100000L); // 100kHz standard mode for high noise immunity
  #if defined(WIRE_HAS_TIMEOUT)
    Wire.setWireTimeout(25000, true); // Auto-recover from I2C bus lockups
  #endif
  oled.begin(&Adafruit128x64, I2C_ADDRESS);
  oled.setFont(System5x7);
  oled.clear();

  // Splash Screen
  oled.println("+-------------------+");
  oled.println("| TEAM 6 WAYFINDER  |");
  oled.println("|    BUS TRACKER    |");
  oled.println("+-------------------+");
  oled.print("| Bus : "); oled.print(busNumber); oled.println("     |");
  oled.print("| User: "); oled.print(driverName); oled.println(" |");
  oled.println("| Starting Engine.. |");
  oled.println("+-------------------+");
  delay(1200);
  oled.clear();

  // Initialize GPS UART (PA3 RX, PA2 TX at 9600)
  SerialGPS.begin(9600);

#if ENABLE_WIFI
  espClient.begin(SerialESP, 115200);
  wsClient.setClient(espClient);
#elif ENABLE_GSM
  SerialGSM.begin(9600);
  wsClient.setClient(client);
#endif

  // Auto-connect to Network and WebSocket Server
  trackerState = STATE_CONNECTING_NET;
  if (connectToNetworkAndServer()) {
    trackerState = STATE_LIVE_TRACKING;
    sendTelemetryPacket();
  } else {
    trackerState = isGpsFixed ? STATE_READY_TO_START : STATE_ACQUIRING_GPS;
  }
  oled.clear();
  drawUnifiedMenu();
}

// =============================================================
// MAIN LOOP
// =============================================================
void loop() {
  // 1. Heartbeat LED
  static unsigned long lastBlink = 0;
  if (millis() - lastBlink > 500) {
    lastBlink = millis();
    digitalWrite(LED_PIN, !digitalRead(LED_PIN));
  }

  // 2. Feed incoming GPS stream from USART2
  while (SerialGPS.available() > 0) {
    char c = (char)SerialGPS.read();
    gpsRawBytes++;
    processGpsChar(c, isGpsFixed, gpsLat, gpsLng, gpsSpd, gpsSats, gpsPackets);
  }

  // 3. Read Button 1 (Start / Toggle Pause)
  int btn1Reading = digitalRead(BUTTON_START_STOP);
  if (btn1Reading != lastStartStopBtnState) {
    lastDebounce1 = millis();
  }
  if ((millis() - lastDebounce1) > DEBOUNCE_DELAY) {
    static int btn1State = HIGH;
    if (btn1Reading != btn1State) {
      btn1State = btn1Reading;
      if (btn1State == LOW) { // Button Pressed
        if (trackerState == STATE_ACQUIRING_GPS || trackerState == STATE_READY_TO_START) {
          // Retry connecting to server and begin tracking
          trackerState = STATE_CONNECTING_NET;
          if (connectToNetworkAndServer()) {
            trackerState = STATE_LIVE_TRACKING;
            sendTelemetryPacket();
          } else {
            trackerState = isGpsFixed ? STATE_READY_TO_START : STATE_ACQUIRING_GPS;
          }
          drawUnifiedMenu();
        } else if (trackerState == STATE_LIVE_TRACKING) {
          trackerState = STATE_PAUSED;
          sendTelemetryPacket(); // Broadcasts Off Duty
          drawUnifiedMenu();
        } else if (trackerState == STATE_PAUSED) {
          trackerState = STATE_LIVE_TRACKING;
          sendTelemetryPacket();
          drawUnifiedMenu();
        }
      }
    }
  }
  lastStartStopBtnState = btn1Reading;

  // 4. Read Button 2 (SOS Alert)
  int btn2Reading = digitalRead(BUTTON_SOS);
  if (btn2Reading != lastSosBtnState) {
    lastDebounce2 = millis();
  }
  if ((millis() - lastDebounce2) > DEBOUNCE_DELAY) {
    static int btn2State = HIGH;
    if (btn2Reading != btn2State) {
      btn2State = btn2Reading;
      if (btn2State == LOW) {
        sosActive = true;
        sosTimer = millis();
        sendTelemetryPacket("EMERGENCY_SOS_ALERT");
        drawUnifiedMenu();
      }
    }
  }
  lastSosBtnState = btn2Reading;

  if (sosActive && (millis() - sosTimer > 4000)) {
    sosActive = false;
  }

  // 5. Periodic UI & Network updates
  static unsigned long lastUiRefresh = 0;
  if (millis() - lastUiRefresh > 500) {
    lastUiRefresh = millis();
    calculateBattery();

    if (trackerState == STATE_ACQUIRING_GPS && isGpsFixed) {
      trackerState = STATE_READY_TO_START;
    }
    drawUnifiedMenu();
  }

  // 6. WebSocket Polling & Periodic Telemetry
  if (trackerState == STATE_LIVE_TRACKING) {
    if (wsClient.available()) {
      wsClient.poll();
      wsStatusStr = "Online [ENC]";
    } else {
      wsStatusStr = "Reconnect..";
      static unsigned long lastReconnect = 0;
      if (millis() - lastReconnect > 8000) {
        lastReconnect = millis();
        if (wsClient.connect(websockets_server_host, websockets_server_port, websockets_server_path)) {
          wsStatusStr = "Online [ENC]";
        }
      }
    }

    if (millis() - lastSendTime > SEND_INTERVAL) {
      lastSendTime = millis();
      sendTelemetryPacket();
    }
  }
}
