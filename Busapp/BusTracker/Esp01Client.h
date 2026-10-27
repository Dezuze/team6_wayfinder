#pragma once
#include <Arduino.h>
#include <Client.h>

#define ESP01_RX_BUFFER_SIZE 256

/**
 * Lightweight ESP-01 (ESP8266 AT) Client for STM32
 * Implements Arduino Client interface so it plugs directly into SimpleWebSocketClient
 */
class Esp01Client : public Client {
private:
  Stream* _serial;
  bool _sockConnected;
  bool _wifiConnected;

  uint8_t _rxBuffer[ESP01_RX_BUFFER_SIZE];
  volatile uint16_t _rxHead;
  volatile uint16_t _rxTail;

  enum RxState {
    STATE_NORMAL,
    STATE_IPD_LEN,
    STATE_IPD_DATA
  } _state;

  uint16_t _ipdRemaining;
  char _lineBuf[40];
  uint8_t _lineIdx;

  void pushRx(uint8_t b) {
    uint16_t next = (_rxHead + 1) % ESP01_RX_BUFFER_SIZE;
    if (next != _rxTail) {
      _rxBuffer[_rxHead] = b;
      _rxHead = next;
    }
  }

  int popRx() {
    if (_rxHead == _rxTail) return -1;
    uint8_t b = _rxBuffer[_rxTail];
    _rxTail = (_rxTail + 1) % ESP01_RX_BUFFER_SIZE;
    return b;
  }

  uint16_t rxAvailable() {
    return (_rxHead >= _rxTail) ? (_rxHead - _rxTail) : (ESP01_RX_BUFFER_SIZE - _rxTail + _rxHead);
  }

  void initSettings() {
    sendCmd("ATE0", "OK", 1000);         // Turn off command echo
    sendCmd("AT+CIPMUX=0", "OK", 1000);   // Single socket mode
  }

public:
  Esp01Client() 
    : _serial(nullptr), _sockConnected(false), _wifiConnected(false),
      _rxHead(0), _rxTail(0), _state(STATE_NORMAL), _ipdRemaining(0), _lineIdx(0) {}

  template <typename TSerial>
  bool begin(TSerial& serial, unsigned long baud = 115200) {
    _serial = &serial;
    serial.begin(baud);
    delay(200);

    for (int i = 0; i < 3; i++) {
      if (testAT(400)) {
        initSettings();
        return true;
      }
      delay(100);
    }

    // Try alternate standard baud rate (115200 <-> 9600)
    unsigned long altBaud = (baud == 115200) ? 9600 : 115200;
    serial.begin(altBaud);
    delay(200);

    for (int i = 0; i < 3; i++) {
      if (testAT(400)) {
        initSettings();
        return true;
      }
      delay(100);
    }
    return false;
  }

  bool testAT(uint32_t timeoutMs = 500) {
    return sendCmd("AT", "OK", timeoutMs);
  }

  bool sendCmd(const char* cmd, const char* expected, uint32_t timeoutMs = 2000) {
    if (!_serial) return false;
    while (_serial->available()) _serial->read();

    _serial->println(cmd);

    unsigned long start = millis();
    char resp[40];
    uint8_t idx = 0;
    while (millis() - start < timeoutMs) {
      if (_serial->available()) {
        char c = (char)_serial->read();
        if (c == '\n' || c == '\r') {
          resp[idx] = '\0';
          if (strstr(resp, expected)) return true;
          if (strstr(resp, "ERROR")) return false;
          idx = 0;
        } else if (idx < sizeof(resp) - 1) {
          resp[idx++] = c;
        }
      }
    }
    return false;
  }

  bool connectWifi(const char* ssid, const char* pass, uint32_t timeoutMs = 25000) {
    if (!_serial) return false;
    _wifiConnected = false;

    sendCmd("AT+CWMODE=1", "OK", 2000);

    _serial->print("AT+CWJAP=\"");
    _serial->print(ssid);
    _serial->print("\",\"");
    _serial->print(pass);
    _serial->println("\"");

    unsigned long start = millis();
    char resp[64];
    uint8_t idx = 0;
    bool gotConnected = false;
    while (millis() - start < timeoutMs) {
      if (_serial->available()) {
        char c = (char)_serial->read();
        if (c == '\n' || c == '\r') {
          resp[idx] = '\0';
          if (strstr(resp, "WIFI GOT IP") || strstr(resp, "OK")) {
            _wifiConnected = true;
            return true;
          } else if (strstr(resp, "WIFI CONNECTED")) {
            gotConnected = true;
          } else if (strstr(resp, "FAIL") || strstr(resp, "+CWJAP:")) {
            _wifiConnected = false;
            return false;
          }
          idx = 0;
        } else if (idx < sizeof(resp) - 1) {
          resp[idx++] = c;
        }
      }
    }
    if (gotConnected) {
      _wifiConnected = true;
      return true;
    }
    return false;
  }

  bool isWifiConnected() const {
    return _wifiConnected;
  }

  void maintain() {
    if (!_serial) return;

    while (_serial->available()) {
      if (_state == STATE_IPD_DATA) {
        uint8_t c = (uint8_t)_serial->read();
        pushRx(c);
        _ipdRemaining--;
        if (_ipdRemaining == 0) {
          _state = STATE_NORMAL;
          _lineIdx = 0;
        }
      } else if (_state == STATE_IPD_LEN) {
        char c = (char)_serial->read();
        if (c >= '0' && c <= '9') {
          _ipdRemaining = _ipdRemaining * 10 + (c - '0');
        } else if (c == ':') {
          _state = STATE_IPD_DATA;
        } else if (c == '\n' || c == '\r') {
          _state = STATE_NORMAL;
          _lineIdx = 0;
        }
      } else {
        char c = (char)_serial->read();
        if (c == '\n' || c == '\r') {
          _lineBuf[_lineIdx] = '\0';
          if (strstr(_lineBuf, "CLOSED")) {
            _sockConnected = false;
          } else if (strstr(_lineBuf, "WIFI DISCONNECT")) {
            _wifiConnected = false;
            _sockConnected = false;
          } else if (strstr(_lineBuf, "WIFI CONNECTED") || strstr(_lineBuf, "WIFI GOT IP")) {
            _wifiConnected = true;
          }
          _lineIdx = 0;
        } else {
          if (_lineIdx < sizeof(_lineBuf) - 1) {
            _lineBuf[_lineIdx++] = c;
            _lineBuf[_lineIdx] = '\0';
          }
          if (strstr(_lineBuf, "+IPD,")) {
            _state = STATE_IPD_LEN;
            _ipdRemaining = 0;
            _lineIdx = 0;
          }
        }
      }
    }
  }

  // --- Arduino Client Interface Implementation ---

  int connect(IPAddress ip, uint16_t port) override {
    char ipStr[20];
    snprintf(ipStr, sizeof(ipStr), "%u.%u.%u.%u", ip[0], ip[1], ip[2], ip[3]);
    return connect(ipStr, port);
  }

  int connect(const char *host, uint16_t port) override {
    if (!_serial) return 0;
    if (_sockConnected) stop();

    _rxHead = 0;
    _rxTail = 0;
    _state = STATE_NORMAL;
    _lineIdx = 0;

    while (_serial->available()) _serial->read();

    if (port == 443) {
      sendCmd("AT+CIPSSLSIZE=4096", "OK", 500);
      sendCmd("AT+CIPSSLCCONF=0", "OK", 500);
      _serial->print("AT+CIPSTART=\"SSL\",\"");
    } else {
      _serial->print("AT+CIPSTART=\"TCP\",\"");
    }
    _serial->print(host);
    _serial->print("\",");
    _serial->println(port);

    unsigned long start = millis();
    char resp[64];
    uint8_t idx = 0;
    uint32_t waitTimeout = (port == 443) ? 15000 : 8000;
    while (millis() - start < waitTimeout) {
      if (_serial->available()) {
        char c = (char)_serial->read();
        if (c == '\n' || c == '\r') {
          resp[idx] = '\0';
          if (strstr(resp, "CONNECT") || strstr(resp, "OK") || strstr(resp, "ALREADY CONNECTED")) {
            _sockConnected = true;
            return 1;
          } else if (strstr(resp, "ERROR") || strstr(resp, "FAIL") || strstr(resp, "CLOSED")) {
            _sockConnected = false;
            return 0;
          }
          idx = 0;
        } else if (idx < sizeof(resp) - 1) {
          resp[idx++] = c;
        }
      }
    }
    _sockConnected = false;
    return 0;
  }

  size_t write(uint8_t b) override {
    return write(&b, 1);
  }

  size_t write(const uint8_t *buf, size_t size) override {
    if (!_sockConnected || !_serial || size == 0) return 0;
    maintain();

    _serial->print("AT+CIPSEND=");
    _serial->println(size);

    unsigned long start = millis();
    bool promptReady = false;
    while (millis() - start < 1500) {
      if (_serial->available()) {
        char c = (char)_serial->read();
        if (c == '>') {
          promptReady = true;
          break;
        }
      }
    }

    if (!promptReady) return 0;

    _serial->write(buf, size);

    start = millis();
    char resp[32];
    uint8_t idx = 0;
    bool sendOk = false;
    while (millis() - start < 3000) {
      if (_serial->available()) {
        char c = (char)_serial->read();
        if (c == '\n' || c == '\r') {
          resp[idx] = '\0';
          if (strstr(resp, "SEND OK") || strstr(resp, "OK")) {
            sendOk = true;
            break;
          } else if (strstr(resp, "ERROR") || strstr(resp, "FAIL") || strstr(resp, "CLOSED")) {
            if (strstr(resp, "CLOSED")) _sockConnected = false;
            break;
          }
          idx = 0;
        } else if (idx < sizeof(resp) - 1) {
          resp[idx++] = c;
        }
      }
    }
    return sendOk ? size : 0;
  }

  int available() override {
    maintain();
    return rxAvailable();
  }

  int read() override {
    maintain();
    return popRx();
  }

  int read(uint8_t *buf, size_t size) override {
    maintain();
    size_t count = 0;
    while (count < size && rxAvailable() > 0) {
      buf[count++] = (uint8_t)popRx();
    }
    return count;
  }

  int peek() override {
    maintain();
    if (_rxHead == _rxTail) return -1;
    return _rxBuffer[_rxTail];
  }

  void flush() override {
    maintain();
  }

  void stop() override {
    if (_sockConnected && _serial) {
      _serial->println("AT+CIPCLOSE");
      unsigned long start = millis();
      while (millis() - start < 800) {
        if (_serial->available()) _serial->read();
      }
    }
    _sockConnected = false;
    _rxHead = 0;
    _rxTail = 0;
    _state = STATE_NORMAL;
  }

  uint8_t connected() override {
    maintain();
    return _sockConnected ? 1 : 0;
  }

  operator bool() override {
    return connected() != 0;
  }
};
