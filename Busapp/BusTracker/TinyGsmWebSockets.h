#pragma once
#include <Arduino.h>
#include <Client.h>

class SimpleWebSocketClient {
private:
  Client* _client;
  bool _connected;
  void (*_messageCallback)(const char*);

public:
  SimpleWebSocketClient() : _client(nullptr), _connected(false), _messageCallback(nullptr) {}

  void setClient(Client& client) {
    _client = &client;
  }

  void onMessage(void (*callback)(const char*)) {
    _messageCallback = callback;
  }

  bool available() {
    return _connected && _client && _client->connected();
  }

  bool connect(const char* host, uint16_t port, const char* path = "/") {
    if (!_client) return false;
    _connected = false;
    if (!_client->connect(host, port)) {
      return false;
    }

    // Send HTTP WebSocket Upgrade Request as a single packet
    char req[240];
    if (port == 443 || port == 80) {
      snprintf(req, sizeof(req),
        "GET %s HTTP/1.1\r\n"
        "Host: %s\r\n"
        "Upgrade: websocket\r\n"
        "Connection: Upgrade\r\n"
        "Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==\r\n"
        "Sec-WebSocket-Version: 13\r\n\r\n",
        path, host
      );
    } else {
      snprintf(req, sizeof(req),
        "GET %s HTTP/1.1\r\n"
        "Host: %s:%u\r\n"
        "Upgrade: websocket\r\n"
        "Connection: Upgrade\r\n"
        "Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==\r\n"
        "Sec-WebSocket-Version: 13\r\n\r\n",
        path, host, port
      );
    }
    _client->write((const uint8_t*)req, strlen(req));

    // Await Handshake Response (101 Switching Protocols)
    unsigned long start = millis();
    char lineBuf[32];
    uint8_t lineIdx = 0;
    while (_client->connected() && (millis() - start < 8000)) {
      if (_client->available()) {
        char c = (char)_client->read();
        if (c == '\n' || c == '\r') {
          lineBuf[lineIdx] = '\0';
          if (strstr(lineBuf, "101")) {
            _connected = true;
          }
          if (lineIdx == 0 && c == '\n') break; // End of HTTP headers
          lineIdx = 0;
        } else if (lineIdx < sizeof(lineBuf) - 1) {
          lineBuf[lineIdx++] = c;
        }
      }
    }
    return _connected;
  }

  void send(const char* payload, size_t len) {
    if (!available() || !payload || len == 0) return;

    // Client frames must be masked
    uint8_t mask[4] = { 0x12, 0x34, 0x56, 0x78 };

    if (len <= 125) {
      uint8_t frame[140];
      frame[0] = 0x81; // FIN + Text frame
      frame[1] = (uint8_t)(0x80 | len);
      memcpy(&frame[2], mask, 4);
      for (size_t i = 0; i < len; i++) {
        frame[6 + i] = payload[i] ^ mask[i % 4];
      }
      _client->write(frame, 6 + len);
    } else {
      uint8_t header[10];
      size_t hLen = 0;
      header[hLen++] = 0x81;
      header[hLen++] = (uint8_t)(0x80 | 126);
      header[hLen++] = (uint8_t)((len >> 8) & 0xFF);
      header[hLen++] = (uint8_t)(len & 0xFF);
      memcpy(&header[hLen], mask, 4);
      hLen += 4;
      _client->write(header, hLen);

      uint8_t chunk[64];
      size_t sent = 0;
      while (sent < len) {
        size_t toSend = (len - sent > sizeof(chunk)) ? sizeof(chunk) : (len - sent);
        for (size_t i = 0; i < toSend; i++) {
          chunk[i] = payload[sent + i] ^ mask[(sent + i) % 4];
        }
        _client->write(chunk, toSend);
        sent += toSend;
      }
    }
  }

  void send(const char* payload) {
    if (payload) send(payload, strlen(payload));
  }

  void poll() {
    if (!available() || !_client->available()) return;
    int b1 = _client->read();
    if (b1 < 0) return;

    int opcode = b1 & 0x0F;
    if (opcode == 0x08) { // Connection Close
      _connected = false;
      _client->stop();
      return;
    }

    if (opcode == 0x09) { // Ping -> Respond Pong
      _client->write(0x8A);
      _client->write(0x80);
      uint8_t m[4] = {0,0,0,0};
      _client->write(m, 4);
      return;
    }

    if (!_client->available()) return;
    int b2 = _client->read();
    bool masked = (b2 & 0x80) != 0;
    uint32_t len = b2 & 0x7F;

    if (len == 126) {
      uint8_t b3 = _client->read();
      uint8_t b4 = _client->read();
      len = (b3 << 8) | b4;
    }

    uint8_t mask[4] = {0};
    if (masked) {
      for (int i = 0; i < 4; i++) mask[i] = _client->read();
    }

    // Drain payload to keep socket synchronized
    for (uint32_t i = 0; i < len; i++) {
      _client->read();
    }
  }
};
