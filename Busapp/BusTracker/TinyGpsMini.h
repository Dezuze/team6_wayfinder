#pragma once
#include <Arduino.h>

// Pure integer NMEA parser (Zero floating-point library overhead, ~250 bytes flash)
static void parseCoordInt(const char* s, char hemi, char* out) {
  if (!s || !*s) return;
  const char* dot = strchr(s, '.');
  if (!dot || dot - s < 2) return;
  
  const char* minStart = dot - 2;
  int deg = 0;
  for (const char* p = s; p < minStart; p++) {
    if (*p >= '0' && *p <= '9') deg = deg * 10 + (*p - '0');
  }
  
  long minVal = 0;
  long div = 1;
  for (const char* p = minStart; *p; p++) {
    if (*p >= '0' && *p <= '9') {
      minVal = minVal * 10 + (*p - '0');
      if (p > dot) div *= 10;
    }
  }
  if (div == 0) div = 1;
  long frac = (minVal * 1000000L) / (div * 60L);
  
  int pos = 0;
  if (hemi == 'S' || hemi == 'W') out[pos++] = '-';
  char dBuf[6];
  itoa(deg, dBuf, 10);
  for (int i = 0; dBuf[i]; i++) out[pos++] = dBuf[i];
  out[pos++] = '.';
  long divisor = 100000;
  for (int i = 0; i < 6; i++) {
    out[pos++] = '0' + (char)((frac / divisor) % 10);
    divisor /= 10;
  }
  out[pos] = '\0';
}

inline void processGpsChar(char c, bool& isFixed, char* latOut, char* lngOut, char* spdOut, uint8_t& satsOut, uint32_t& packetCount) {
  static char nmeaBuf[82];
  static uint8_t idx = 0;
  
  if (c == '\r' || c == '\n') {
    if (idx > 10 && nmeaBuf[0] == '$') {
      packetCount++;
      // Check for $GPRMC or $GNRMC
      if (nmeaBuf[3] == 'R' && nmeaBuf[4] == 'M' && nmeaBuf[5] == 'C') {
        char* p = nmeaBuf;
        int field = 0;
        char* f[10] = {0};
        while (*p && field < 10) {
          if (*p == ',') {
            *p = '\0';
            f[field++] = p + 1;
          }
          p++;
        }
        
        // f[1] is Status: 'A'=Valid fix, 'V'=Void/Searching
        if (field >= 7 && f[1] && *f[1] == 'A') {
          isFixed = true;
          if (f[2] && f[3]) parseCoordInt(f[2], *f[3], latOut);
          if (f[4] && f[5]) parseCoordInt(f[4], *f[5], lngOut);
          // Speed in knots -> approx km/h (knots * 185 / 100)
          if (f[6] && *f[6]) {
            int k = 0;
            for (char* sp = f[6]; *sp && *sp != '.'; sp++) {
              if (*sp >= '0' && *sp <= '9') k = k * 10 + (*sp - '0');
            }
            int kmh = (k * 185) / 100;
            itoa(kmh, spdOut, 10);
          }
        } else if (f[1] && *f[1] == 'V') {
          isFixed = false;
        }
      }
      // Check for $GPGGA or $GNGGA
      else if (nmeaBuf[3] == 'G' && nmeaBuf[4] == 'G' && nmeaBuf[5] == 'A') {
        char* p = nmeaBuf;
        int field = 0;
        char* f[10] = {0};
        while (*p && field < 10) {
          if (*p == ',') {
            *p = '\0';
            f[field++] = p + 1;
          }
          p++;
        }
        // f[6] is number of satellites in use
        if (field >= 7 && f[6] && *f[6]) {
          int s = 0;
          for (char* sp = f[6]; *sp >= '0' && *sp <= '9'; sp++) {
            s = s * 10 + (*sp - '0');
          }
          satsOut = (uint8_t)s;
        }
        // f[5] is fix quality: '0'=invalid, '1'=GPS fix, '2'=DGPS
        if (field >= 6 && f[5] && *f[5] > '0') {
          isFixed = true;
          if (f[1] && f[2]) parseCoordInt(f[1], *f[2], latOut);
          if (f[3] && f[4]) parseCoordInt(f[3], *f[4], lngOut);
        }
      }
    }
    idx = 0;
  } else if (idx < sizeof(nmeaBuf) - 1) {
    nmeaBuf[idx++] = c;
  }
}

inline void processGpsChar(char c, bool& isFixed, char* latOut, char* lngOut, char* spdOut) {
  static uint8_t dummySats = 0;
  static uint32_t dummyCount = 0;
  processGpsChar(c, isFixed, latOut, lngOut, spdOut, dummySats, dummyCount);
}
