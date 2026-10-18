#pragma once
#include <Arduino.h>

/**
 * Ultra-compact ChaCha20 stream cipher implementation (RFC 8439 / OpenSSL compatible)
 * Provides military-grade 256-bit payload encryption on low-flash MCUs (STM32F103C6).
 * Zero heap allocations, zero external dependencies.
 */
class ChaCha20Mini {
private:
  static inline uint32_t rotl32(uint32_t v, uint8_t n) {
    return (v << n) | (v >> (32 - n));
  }

  static inline void qr(uint32_t& a, uint32_t& b, uint32_t& c, uint32_t& d) {
    a += b; d ^= a; d = rotl32(d, 16);
    c += d; b ^= c; b = rotl32(b, 12);
    a += b; d ^= a; d = rotl32(d, 8);
    c += d; b ^= c; b = rotl32(b, 7);
  }

public:
  static void process(const uint8_t key[32], const uint8_t iv[16], const uint8_t* in, uint8_t* out, size_t len) {
    uint32_t state[16];
    state[0] = 0x61707865; // "expa"
    state[1] = 0x3320646e; // "nd 3"
    state[2] = 0x79622d32; // "2-by"
    state[3] = 0x6b206574; // "te k"

    for (int i = 0; i < 8; i++) {
      state[4 + i] = ((uint32_t)key[i * 4 + 0]) |
                     (((uint32_t)key[i * 4 + 1]) << 8) |
                     (((uint32_t)key[i * 4 + 2]) << 16) |
                     (((uint32_t)key[i * 4 + 3]) << 24);
    }

    uint32_t baseCounter = ((uint32_t)iv[0]) |
                           (((uint32_t)iv[1]) << 8) |
                           (((uint32_t)iv[2]) << 16) |
                           (((uint32_t)iv[3]) << 24);

    for (int i = 0; i < 3; i++) {
      state[13 + i] = ((uint32_t)iv[4 + i * 4 + 0]) |
                      (((uint32_t)iv[4 + i * 4 + 1]) << 8) |
                      (((uint32_t)iv[4 + i * 4 + 2]) << 16) |
                      (((uint32_t)iv[4 + i * 4 + 3]) << 24);
    }

    size_t offset = 0;
    uint32_t blockCount = 0;

    while (offset < len) {
      state[12] = baseCounter + blockCount;
      uint32_t working[16];
      for (int i = 0; i < 16; i++) working[i] = state[i];

      for (int r = 0; r < 10; r++) {
        qr(working[0], working[4], working[8],  working[12]);
        qr(working[1], working[5], working[9],  working[13]);
        qr(working[2], working[6], working[10], working[14]);
        qr(working[3], working[7], working[11], working[15]);
        qr(working[0], working[5], working[10], working[15]);
        qr(working[1], working[6], working[11], working[12]);
        qr(working[2], working[7], working[8],  working[13]);
        qr(working[3], working[4], working[9],  working[14]);
      }

      uint8_t keyStream[64];
      for (int i = 0; i < 16; i++) {
        uint32_t sum = working[i] + state[i];
        keyStream[i * 4 + 0] = (uint8_t)(sum & 0xFF);
        keyStream[i * 4 + 1] = (uint8_t)((sum >> 8) & 0xFF);
        keyStream[i * 4 + 2] = (uint8_t)((sum >> 16) & 0xFF);
        keyStream[i * 4 + 3] = (uint8_t)((sum >> 24) & 0xFF);
      }

      size_t chunk = (len - offset > 64) ? 64 : (len - offset);
      for (size_t i = 0; i < chunk; i++) {
        out[offset + i] = in[offset + i] ^ keyStream[i];
      }

      offset += chunk;
      blockCount++;
    }
  }

  static void toHex(const uint8_t* in, size_t len, char* outHex) {
    const char hexChars[] = "0123456789abcdef";
    for (size_t i = 0; i < len; i++) {
      outHex[i * 2]     = hexChars[(in[i] >> 4) & 0x0F];
      outHex[i * 2 + 1] = hexChars[in[i] & 0x0F];
    }
    outHex[len * 2] = '\0';
  }
};
