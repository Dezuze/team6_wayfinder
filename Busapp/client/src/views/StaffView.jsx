import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { useWebSocket } from '../context/WebSocketContext';
import { useAuth } from '../context/AuthContext';
import { downloadCSV } from '../utils/csv';
import {
  QrCode,
  Barcode,
  Search,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Camera,
  CameraOff,
  RefreshCw,
  Download,
  Printer,
  ClipboardList,
  ShieldCheck,
  UserCheck,
  Clock,
  Upload,
  X,
  SwitchCamera,
  Hash,
  User,
  Bus,
  Calendar
} from 'lucide-react';

const OFFLINE_PASS_CACHE_KEY = 'hopspot_staff_pass_validity_copy';
const RECENT_SCANS_KEY = 'hopspot_staff_recent_scans';

// Supported 2D QR + 1D ID Card Barcode formats
const ALL_SCAN_FORMATS = [
  Html5QrcodeSupportedFormats.QR_CODE,
  Html5QrcodeSupportedFormats.CODE_128,
  Html5QrcodeSupportedFormats.CODE_39,
  Html5QrcodeSupportedFormats.CODE_93,
  Html5QrcodeSupportedFormats.CODABAR,
  Html5QrcodeSupportedFormats.ITF,
  Html5QrcodeSupportedFormats.EAN_13,
  Html5QrcodeSupportedFormats.EAN_8,
  Html5QrcodeSupportedFormats.UPC_A,
  Html5QrcodeSupportedFormats.UPC_E
];

const QR_ONLY_FORMATS = [Html5QrcodeSupportedFormats.QR_CODE];

const BARCODE_ONLY_FORMATS = [
  Html5QrcodeSupportedFormats.CODE_128,
  Html5QrcodeSupportedFormats.CODE_39,
  Html5QrcodeSupportedFormats.CODE_93,
  Html5QrcodeSupportedFormats.CODABAR,
  Html5QrcodeSupportedFormats.ITF,
  Html5QrcodeSupportedFormats.EAN_13,
  Html5QrcodeSupportedFormats.EAN_8,
  Html5QrcodeSupportedFormats.UPC_A,
  Html5QrcodeSupportedFormats.UPC_E
];

function playFeedbackSound(isValid) {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    if (isValid) {
      // Pleasant ascending two-tone chime for valid pass
      [
        { freq: 660, start: 0, dur: 0.12 },
        { freq: 880, start: 0.14, dur: 0.2 }
      ].forEach(({ freq, start, dur }) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + start);
        gain.gain.setValueAtTime(0.25, ctx.currentTime + start);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + start + dur);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + start);
        osc.stop(ctx.currentTime + start + dur);
      });
    } else {
      // Low double buzz for invalid / expired / suspended pass
      [0, 0.2].forEach((start) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(220, ctx.currentTime + start);
        gain.gain.setValueAtTime(0.25, ctx.currentTime + start);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + start + 0.15);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + start);
        osc.stop(ctx.currentTime + start + 0.15);
      });
    }
    setTimeout(() => ctx.close().catch(() => {}), 800);
  } catch {
    // ignore audio restrictions
  }
}

function evaluatePassValidity(pass) {
  if (!pass) {
    return {
      isValid: false,
      stateKey: 'not_found',
      label: 'NOT FOUND',
      color: '#ef4444',
      bgColor: 'rgba(239, 68, 68, 0.12)',
      borderColor: '#ef4444',
      reason: 'No matching student pass found in the system directory.'
    };
  }

  const rawStatus = String(pass.passStatus || pass.status || 'Valid').trim();
  const statusLower = rawStatus.toLowerCase();
  const todayStr = new Date().toISOString().split('T')[0];
  const validUntil = pass.validUntil || '2026-12-31';
  const isDateExpired = validUntil < todayStr;

  if (statusLower.includes('suspend') || statusLower.includes('revok')) {
    return {
      isValid: false,
      stateKey: 'suspended',
      label: 'SUSPENDED',
      color: '#ef4444',
      bgColor: 'rgba(239, 68, 68, 0.12)',
      borderColor: '#ef4444',
      reason: `Student pass is currently ${rawStatus}. Boarding is not permitted.`
    };
  }

  if (statusLower.includes('expir') || isDateExpired) {
    return {
      isValid: false,
      stateKey: 'expired',
      label: 'EXPIRED',
      color: '#ef4444',
      bgColor: 'rgba(239, 68, 68, 0.12)',
      borderColor: '#ef4444',
      reason: `Student pass expired on ${validUntil}. Renewal required.`
    };
  }

  if (statusLower.includes('pending')) {
    return {
      isValid: false,
      stateKey: 'pending',
      label: 'PENDING APPROVAL',
      color: '#f59e0b',
      bgColor: 'rgba(245, 158, 11, 0.14)',
      borderColor: '#f59e0b',
      reason: 'Student pass is awaiting administrative approval.'
    };
  }

  return {
    isValid: true,
    stateKey: 'valid',
    label: 'VALID PASS',
    color: '#16a34a',
    bgColor: 'rgba(34, 197, 94, 0.12)',
    borderColor: '#22c55e',
    reason: 'Active pass verified for campus shuttle boarding.'
  };
}

export default function StaffView() {
  const { passes, refreshData, isConnected } = useWebSocket();
  const { user } = useAuth();

  // Main Portal Tabs: 'scanner' (QR + ID Barcode + Name Check) | 'list' (Pass Validity List Copy)
  const [activeTab, setActiveTab] = useState('scanner');

  // Scanner Mode: 'auto' (QR + Barcode) | 'qr' (Pass QR Primary) | 'barcode' (ID Card Barcode Admission No.)
  const [scanMode, setScanMode] = useState('auto');
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isCameraStarting, setIsCameraStarting] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [availableCameras, setAvailableCameras] = useState([]);
  const [selectedCameraId, setSelectedCameraId] = useState('');

  // Inputs for direct barcode/admission number & secondary name lookup
  const [barcodeInput, setBarcodeInput] = useState('');
  const [nameQuery, setNameQuery] = useState('');
  const [verificationResult, setVerificationResult] = useState(null);
  const [isVerifyingServer, setIsVerifyingServer] = useState(false);

  // Student Pass Validity List state (with offline local copy fallback)
  const [cachedPasses, setCachedPasses] = useState(() => {
    try {
      const saved = localStorage.getItem(OFFLINE_PASS_CACHE_KEY);
      return saved ? JSON.parse(saved) : { passes: [], updatedAt: null };
    } catch {
      return { passes: [], updatedAt: null };
    }
  });
  const [listFilter, setListFilter] = useState('all'); // 'all' | 'valid' | 'invalid'
  const [listSearch, setListSearch] = useState('');
  const [isSyncingList, setIsSyncingList] = useState(false);

  // Recent scan log
  const [recentScans, setRecentScans] = useState(() => {
    try {
      const raw = localStorage.getItem(RECENT_SCANS_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const scanTimerRef = useRef(null);
  const isDecodingFrameRef = useRef(false);
  const html5QrCodeRef = useRef(null);
  const fileInputRef = useRef(null);
  const lastScanRef = useRef({ text: '', time: 0 });

  // Sync live passes into local offline copy for staff
  useEffect(() => {
    if (Array.isArray(passes) && passes.length > 0) {
      const snapshot = {
        passes,
        updatedAt: new Date().toISOString()
      };
      setCachedPasses(snapshot);
      try {
        localStorage.setItem(OFFLINE_PASS_CACHE_KEY, JSON.stringify(snapshot));
      } catch {
        // ignore storage quota errors
      }
    }
  }, [passes]);

  // Effective pass list (live WebSocket/REST passes or offline cached copy)
  const effectivePasses = useMemo(() => {
    if (Array.isArray(passes) && passes.length > 0) return passes;
    return Array.isArray(cachedPasses.passes) ? cachedPasses.passes : [];
  }, [passes, cachedPasses]);

  const recordScanResult = useCallback((resultObj) => {
    setVerificationResult(resultObj);
    playFeedbackSound(resultObj.evaluation.isValid);

    setRecentScans((prev) => {
      const next = [
        {
          id: `scan-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          studentName: resultObj.pass?.name || resultObj.pass?.studentName || 'Unknown Student',
          admissionNo: resultObj.pass?.id || resultObj.rawInput,
          routeEntitlement: resultObj.pass?.routeEntitlement || '-',
          validUntil: resultObj.pass?.validUntil || '-',
          method: resultObj.method,
          isValid: resultObj.evaluation.isValid,
          statusLabel: resultObj.evaluation.label
        },
        ...prev
      ].slice(0, 15);
      try {
        localStorage.setItem(RECENT_SCANS_KEY, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  // Core verification resolver (supports Pass QR, ID Card Barcode with Admission Number, or Student Object)
  const verifyStudentPass = useCallback(async (rawInputOrPass, methodLabel = 'QR / Barcode Scan') => {
    if (!rawInputOrPass) return;

    // If a direct pass object was clicked from Secondary Name Search or Validity Table
    if (typeof rawInputOrPass === 'object' && rawInputOrPass.id) {
      const evaluation = evaluatePassValidity(rawInputOrPass);
      recordScanResult({
        pass: rawInputOrPass,
        rawInput: rawInputOrPass.id,
        method: methodLabel,
        evaluation,
        verifiedAt: new Date().toLocaleTimeString()
      });
      return;
    }

    const rawText = String(rawInputOrPass).trim();
    if (!rawText) return;

    const norm = (str) => String(str || '').trim().toLowerCase();
    const normAlnum = (str) => String(str || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');

    // Extract admission number / student ID if QR is in HOPSPOT:<id>:<hmac> or PASS-<id> format
    let candidateId = rawText;
    if (rawText.startsWith('HOPSPOT:')) {
      const parts = rawText.split(':');
      if (parts.length >= 2) candidateId = parts[1];
    } else if (rawText.startsWith('PASS-')) {
      candidateId = rawText.replace('PASS-', '');
    }

    // 1. Check local synced pass validity list immediately for instant zero-latency feedback
    const localMatch = effectivePasses.find((p) => {
      if (p.qrCodeString && p.qrCodeString === rawText) return true;
      if (norm(p.id) === norm(candidateId) || norm(p.username) === norm(candidateId)) return true;
      if (normAlnum(candidateId).length >= 3 && (normAlnum(p.id) === normAlnum(candidateId) || normAlnum(p.username) === normAlnum(candidateId))) {
        return true;
      }
      if (norm(p.name || p.studentName) === norm(rawText)) return true;
      return false;
    });

    // Also verify with backend `/api/passes/verify` when signed QR or online
    if (rawText.startsWith('HOPSPOT:') || !localMatch) {
      setIsVerifyingServer(true);
      try {
        const apiUrl = import.meta.env.VITE_API_URL || '';
        const res = await fetch(`${apiUrl}/api/passes/verify`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            qrString: rawText,
            passId: candidateId,
            method: methodLabel
          })
        });
        const data = await res.json().catch(() => ({}));
        setIsVerifyingServer(false);

        if (res.ok && data.success) {
          const matchedPass = localMatch || {
            id: data.studentId || candidateId,
            name: data.studentName,
            studentName: data.studentName,
            email: data.email,
            routeEntitlement: data.routeEntitlement,
            validUntil: data.validUntil,
            passStatus: data.status
          };
          const evaluation = evaluatePassValidity(matchedPass);
          recordScanResult({
            pass: matchedPass,
            rawInput: rawText,
            method: data.signatureVerified ? `${methodLabel} (HMAC Verified)` : methodLabel,
            evaluation,
            verifiedAt: new Date().toLocaleTimeString()
          });
          return;
        } else if (res.status === 400 && data.error?.includes('Counterfeit')) {
          recordScanResult({
            pass: null,
            rawInput: rawText,
            method: methodLabel,
            evaluation: {
              isValid: false,
              stateKey: 'counterfeit',
              label: 'INVALID / COUNTERFEIT QR',
              color: '#ef4444',
              bgColor: 'rgba(239, 68, 68, 0.12)',
              borderColor: '#ef4444',
              reason: data.error
            },
            verifiedAt: new Date().toLocaleTimeString()
          });
          return;
        }
      } catch {
        setIsVerifyingServer(false);
        // Fall through to local offline pass list evaluation
      }
    }

    if (localMatch) {
      const evaluation = evaluatePassValidity(localMatch);
      recordScanResult({
        pass: localMatch,
        rawInput: rawText,
        method: methodLabel,
        evaluation,
        verifiedAt: new Date().toLocaleTimeString()
      });
    } else {
      recordScanResult({
        pass: null,
        rawInput: rawText,
        method: methodLabel,
        evaluation: {
          isValid: false,
          stateKey: 'not_found',
          label: 'PASS NOT FOUND',
          color: '#ef4444',
          bgColor: 'rgba(239, 68, 68, 0.12)',
          borderColor: '#ef4444',
          reason: `No student pass found matching admission number or code "${rawText}".`
        },
        verifiedAt: new Date().toLocaleTimeString()
      });
    }
  }, [effectivePasses, recordScanResult]);

  // Stop active camera scanner safely
  const stopScanner = useCallback(async () => {
    if (scanTimerRef.current) {
      clearInterval(scanTimerRef.current);
      scanTimerRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch {
          // ignore
        }
      });
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    isDecodingFrameRef.current = false;
    setIsCameraActive(false);
    setIsCameraStarting(false);
  }, []);

  // Start live camera scanner for QR & 1D ID Card Barcodes using direct <video> stream
  const startScanner = useCallback(async (overrideCameraId = selectedCameraId, overrideScanMode = scanMode) => {
    setCameraError(null);
    await stopScanner();

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      const isInsecureLan =
        window.location.protocol === 'http:' &&
        window.location.hostname !== 'localhost' &&
        window.location.hostname !== '127.0.0.1';
      setCameraError(
        isInsecureLan
          ? `Browser blocks camera access on insecure HTTP LAN URLs (${window.location.origin}). Please open http://localhost:5173 or use HTTPS, or click "Scan Photo" below.`
          : 'Camera API is not available in this browser. Please use "Scan Photo" or enter the Admission Number below.'
      );
      return;
    }

    setIsCameraStarting(true);

    try {
      // Request camera stream with flexible fallbacks (specific deviceId -> environment -> user -> any video)
      let stream = null;
      const constraintAttempts = [];
      if (overrideCameraId) {
        constraintAttempts.push({
          video: { deviceId: { exact: overrideCameraId }, width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false
        });
      }
      constraintAttempts.push(
        { video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false },
        { video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false },
        { video: true, audio: false }
      );

      let lastErr = null;
      for (const constraints of constraintAttempts) {
        try {
          stream = await navigator.mediaDevices.getUserMedia(constraints);
          if (stream) break;
        } catch (err) {
          lastErr = err;
        }
      }

      if (!stream) {
        throw lastErr || new Error('Could not open video stream');
      }

      streamRef.current = stream;

      // Discover connected video input devices without opening a second stream
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices
          .filter((d) => d.kind === 'videoinput')
          .map((d, idx) => ({ id: d.deviceId, label: d.label || `Camera ${idx + 1}` }));
        if (videoDevices.length > 0) {
          setAvailableCameras(videoDevices);
          const activeTrack = stream.getVideoTracks()[0];
          const activeDeviceId = activeTrack?.getSettings?.()?.deviceId;
          if (activeDeviceId) {
            setSelectedCameraId(activeDeviceId);
          } else if (!overrideCameraId) {
            setSelectedCameraId(videoDevices[0].id);
          }
        }
      } catch {
        // ignore device enumeration errors
      }

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        await videoRef.current.play().catch(() => {});
      }

      setIsCameraActive(true);
      setIsCameraStarting(false);

      // Prepare native BarcodeDetector if available in browser
      let nativeDetector = null;
      if ('BarcodeDetector' in window) {
        try {
          const desiredFormats =
            overrideScanMode === 'qr'
              ? ['qr_code']
              : overrideScanMode === 'barcode'
              ? ['code_128', 'code_39', 'code_93', 'codabar', 'itf', 'ean_13', 'ean_8', 'upc_a', 'upc_e']
              : ['qr_code', 'code_128', 'code_39', 'code_93', 'codabar', 'itf', 'ean_13', 'ean_8', 'upc_a', 'upc_e'];
          nativeDetector = new window.BarcodeDetector({ formats: desiredFormats });
        } catch {
          nativeDetector = null;
        }
      }

      // Prepare offscreen canvas + Html5Qrcode fallback decoder
      const formatsToSupport =
        overrideScanMode === 'qr'
          ? QR_ONLY_FORMATS
          : overrideScanMode === 'barcode'
          ? BARCODE_ONLY_FORMATS
          : ALL_SCAN_FORMATS;

      if (!html5QrCodeRef.current) {
        html5QrCodeRef.current = new Html5Qrcode('hopspot-staff-reader-hidden', {
          formatsToSupport,
          verbose: false
        });
      }

      const offscreenCanvas = document.createElement('canvas');
      const offscreenCtx = offscreenCanvas.getContext('2d', { willReadFrequently: true });

      const handleDecodedValue = (rawValue, formatLabel = '') => {
        if (!rawValue) return;
        const now = Date.now();
        if (lastScanRef.current.text === rawValue && now - lastScanRef.current.time < 2500) {
          return;
        }
        lastScanRef.current = { text: rawValue, time: now };

        const is1DBarcode = formatLabel && !String(formatLabel).toUpperCase().includes('QR');
        const detectedMethod = is1DBarcode
          ? `ID Card Barcode (${formatLabel})`
          : 'Pass QR Code Scan';
        verifyStudentPass(rawValue, detectedMethod);
      };

      // Continuous frame scanner loop
      scanTimerRef.current = setInterval(async () => {
        const videoEl = videoRef.current;
        if (!videoEl || videoEl.readyState < 2 || isDecodingFrameRef.current) return;
        const vw = videoEl.videoWidth;
        const vh = videoEl.videoHeight;
        if (!vw || !vh) return;

        isDecodingFrameRef.current = true;
        try {
          // 1. Fast path: Native hardware-accelerated BarcodeDetector
          if (nativeDetector) {
            try {
              const barcodes = await nativeDetector.detect(videoEl);
              if (barcodes && barcodes.length > 0 && barcodes[0].rawValue) {
                handleDecodedValue(barcodes[0].rawValue, barcodes[0].format || 'QR_CODE');
                isDecodingFrameRef.current = false;
                return;
              }
            } catch {
              // continue to canvas decoder
            }
          }

          // 2. Universal fallback: Capture frame to canvas -> decode via Html5Qrcode
          if (offscreenCtx && html5QrCodeRef.current) {
            offscreenCanvas.width = vw;
            offscreenCanvas.height = vh;
            offscreenCtx.drawImage(videoEl, 0, 0, vw, vh);
            const blob = await new Promise((res) => offscreenCanvas.toBlob(res, 'image/jpeg', 0.85));
            if (blob) {
              const file = new File([blob], 'frame.jpg', { type: 'image/jpeg' });
              const decodedResult = await html5QrCodeRef.current.scanFileV2(file, false);
              if (decodedResult && decodedResult.decodedText) {
                const fmt = decodedResult.result?.format?.formatName || '';
                handleDecodedValue(decodedResult.decodedText, fmt);
              }
            }
          }
        } catch {
          // No QR/barcode in current frame — ignore
        } finally {
          isDecodingFrameRef.current = false;
        }
      }, 300);
    } catch (err) {
      console.warn('Camera start error:', err);
      const errMsg = err?.name === 'NotAllowedError'
        ? 'Camera permission was denied. Please allow camera access in your browser address bar and try again.'
        : err?.name === 'NotReadableError'
        ? 'Camera is currently in use by another application or tab. Please close other apps using the camera and retry.'
        : 'Unable to access camera. Please allow camera permission in your browser or use "Scan Photo" / Admission No. input below.';
      setCameraError(errMsg);
      setIsCameraActive(false);
      setIsCameraStarting(false);
    }
  }, [selectedCameraId, scanMode, stopScanner, verifyStudentPass]);

  // Cleanup camera when leaving tab or unmounting
  useEffect(() => {
    if (activeTab !== 'scanner') {
      stopScanner();
    }
  }, [activeTab, stopScanner]);

  useEffect(() => {
    return () => {
      stopScanner();
    };
  }, [stopScanner]);

  // Handle switching camera (cycles through detected cameras)
  const handleToggleCameraFacing = async () => {
    if (availableCameras.length > 1) {
      const currentIdx = availableCameras.findIndex((c) => c.id === selectedCameraId);
      const nextCam = availableCameras[(currentIdx + 1) % availableCameras.length];
      setSelectedCameraId(nextCam.id);
      if (isCameraActive) {
        await startScanner(nextCam.id, scanMode);
      }
    } else if (isCameraActive) {
      await startScanner('', scanMode);
    }
  };

  // Handle changing scan mode (Auto / QR Only / ID Card Barcode Only)
  const handleChangeScanMode = async (nextMode) => {
    setScanMode(nextMode);
    if (isCameraActive) {
      await startScanner(selectedCameraId, nextMode);
    }
  };

  // Handle scanning from an uploaded image file (QR or ID card barcode photo)
  const handleImageFileScan = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCameraError(null);

    try {
      const tempScanner = new Html5Qrcode('hopspot-staff-reader-hidden', {
        formatsToSupport: ALL_SCAN_FORMATS,
        verbose: false
      });
      const decodedText = await tempScanner.scanFile(file, false);
      tempScanner.clear();
      verifyStudentPass(decodedText, 'Scanned Image (QR / ID Barcode)');
    } catch {
      setCameraError('Could not detect a valid QR code or ID card barcode in that image. Please try a clearer photo.');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Secondary check: matching students when typing student name
  const nameMatches = useMemo(() => {
    const q = nameQuery.trim().toLowerCase();
    if (!q) return [];
    return effectivePasses
      .filter((p) => {
        const studentName = String(p.name || p.studentName || '').toLowerCase();
        const studentId = String(p.id || p.username || '').toLowerCase();
        return studentName.includes(q) || studentId.includes(q);
      })
      .slice(0, 8);
  }, [nameQuery, effectivePasses]);

  // Enriched & filtered student pass validity list for the "Validity List Copy" tab
  const enrichedPassList = useMemo(() => {
    return effectivePasses.map((p) => ({
      ...p,
      evaluation: evaluatePassValidity(p)
    }));
  }, [effectivePasses]);

  const validityStats = useMemo(() => {
    const total = enrichedPassList.length;
    const validCount = enrichedPassList.filter((p) => p.evaluation.isValid).length;
    const invalidCount = total - validCount;
    return { total, validCount, invalidCount };
  }, [enrichedPassList]);

  const filteredPassList = useMemo(() => {
    const q = listSearch.trim().toLowerCase();
    return enrichedPassList.filter((item) => {
      if (listFilter === 'valid' && !item.evaluation.isValid) return false;
      if (listFilter === 'invalid' && item.evaluation.isValid) return false;
      if (!q) return true;
      const name = String(item.name || item.studentName || '').toLowerCase();
      const id = String(item.id || item.username || '').toLowerCase();
      const route = String(item.routeEntitlement || '').toLowerCase();
      const status = String(item.evaluation.label || '').toLowerCase();
      return name.includes(q) || id.includes(q) || route.includes(q) || status.includes(q);
    });
  }, [enrichedPassList, listFilter, listSearch]);

  // Export CSV copy of the Student Pass Validity List
  const handleExportValidityCsv = () => {
    const headers = ['Admission_Number,Student_Name,Validity_Status,Valid_Until,Route_Entitlement,Email'];
    const rows = enrichedPassList.map((p) => {
      const escape = (val) => `"${String(val || '').replace(/"/g, '""')}"`;
      return [
        escape(p.id || p.username),
        escape(p.name || p.studentName),
        escape(p.evaluation.label),
        escape(p.validUntil || '2026-12-31'),
        escape(p.routeEntitlement || 'All Routes'),
        escape(p.email || '')
      ].join(',');
    });
    const csvString = [...headers, ...rows].join('\n');
    const dateStamp = new Date().toISOString().split('T')[0];
    downloadCSV(`HopSpot_Student_Pass_Validity_List_${dateStamp}.csv`, csvString);
  };

  const handleSyncListNow = async () => {
    setIsSyncingList(true);
    try {
      await refreshData();
    } finally {
      setTimeout(() => setIsSyncingList(false), 400);
    }
  };

  return (
    <div style={{
      maxWidth: '920px',
      width: '100%',
      margin: '0 auto',
      padding: '0.25rem',
      display: 'flex',
      flexDirection: 'column',
      gap: '0.75rem',
      boxSizing: 'border-box',
      minInlineSize: 0
    }}>
      {/* Portal Mode Switcher */}
      <div style={{
        display: 'flex',
        gap: '0.35rem',
        backgroundColor: 'var(--bg-subtle)',
        padding: '0.3rem',
        borderRadius: '10px',
        border: '1px solid var(--border-color)',
        width: '100%',
        maxWidth: '420px'
      }}>
        <button
          type="button"
          onClick={() => setActiveTab('scanner')}
          style={{
            flex: 1,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.4rem',
            padding: '0.5rem 0.65rem',
            borderRadius: '8px',
            border: 'none',
            cursor: 'pointer',
            fontSize: '0.8rem',
            fontWeight: 700,
            whiteSpace: 'nowrap',
            backgroundColor: activeTab === 'scanner' ? 'var(--primary)' : 'transparent',
            color: activeTab === 'scanner' ? '#ffffff' : 'var(--text-secondary)',
            transition: 'all 0.15s ease'
          }}
        >
          <QrCode size={15} />
          <span>QR & ID Scanner</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('list')}
          style={{
            flex: 1,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.4rem',
            padding: '0.5rem 0.65rem',
            borderRadius: '8px',
            border: 'none',
            cursor: 'pointer',
            fontSize: '0.8rem',
            fontWeight: 700,
            whiteSpace: 'nowrap',
            backgroundColor: activeTab === 'list' ? 'var(--primary)' : 'transparent',
            color: activeTab === 'list' ? '#ffffff' : 'var(--text-secondary)',
            transition: 'all 0.15s ease'
          }}
        >
          <ClipboardList size={15} />
          <span>Validity List ({validityStats.total})</span>
        </button>
      </div>

      {/* ===================================================================
          TAB 1: PRIMARY QR & ID CARD BARCODE SCANNER + SECONDARY NAME LOOKUP
          =================================================================== */}
      {activeTab === 'scanner' && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 340px), 1fr))',
          gap: '0.75rem',
          alignItems: 'start',
          minInlineSize: 0
        }}>
          {/* Left Column: Unified Scanner & Lookup Card */}
          <div className="clean-card" style={{ padding: '0.9rem', display: 'flex', flexDirection: 'column', gap: '0.85rem', minInlineSize: 0 }}>
            {/* Camera Viewport Container */}
            <div style={{
              position: 'relative',
              width: '100%',
              height: '215px',
              backgroundColor: '#0f172a',
              borderRadius: '12px',
              overflow: 'hidden',
              border: '1px solid var(--border-color)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              {/* Hidden offscreen mount for Html5Qrcode file/frame decoding */}
              <div id="hopspot-staff-reader-hidden" style={{ display: 'none' }} />

              {/* Direct React-managed HTML5 <video> element for reliable live camera preview */}
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  display: isCameraActive ? 'block' : 'none',
                  backgroundColor: '#000000'
                }}
              />

              {/* Targeting Reticle Overlay when Camera is Live */}
              {isCameraActive && (
                <div style={{
                  position: 'absolute',
                  inset: 0,
                  pointerEvents: 'none',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'radial-gradient(circle, transparent 45%, rgba(15, 23, 42, 0.55) 100%)'
                }}>
                  <div style={{
                    width: '210px',
                    height: '175px',
                    border: '2px solid #38bdf8',
                    borderRadius: '14px',
                    boxShadow: '0 0 0 9999px rgba(15, 23, 42, 0.38), 0 0 20px rgba(56, 189, 248, 0.35)',
                    position: 'relative',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <div style={{
                      width: '90%',
                      height: '2px',
                      background: 'linear-gradient(90deg, transparent 0%, #38bdf8 50%, transparent 100%)',
                      boxShadow: '0 0 8px #38bdf8'
                    }} />
                  </div>
                  <span style={{
                    marginTop: '0.6rem',
                    padding: '0.2rem 0.65rem',
                    borderRadius: '999px',
                    backgroundColor: 'rgba(15, 23, 42, 0.78)',
                    color: '#e2e8f0',
                    fontSize: '0.72rem',
                    fontWeight: 600,
                    zIndex: 2
                  }}>
                    Align Pass QR or ID Barcode inside frame
                  </span>
                </div>
              )}

              {!isCameraActive && (
                <div style={{
                  position: isCameraStarting ? 'absolute' : 'relative',
                  inset: 0,
                  padding: '1.5rem',
                  textAlign: 'center',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.75rem',
                  color: '#f8fafc',
                  backgroundColor: '#0f172a',
                  zIndex: 2
                }}>
                  <div style={{
                    width: '52px',
                    height: '52px',
                    borderRadius: '50%',
                    backgroundColor: 'rgba(56, 189, 248, 0.14)',
                    border: '1px solid rgba(56, 189, 248, 0.32)',
                    color: '#38bdf8',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <QrCode size={24} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>
                      {isCameraStarting ? 'Starting Camera...' : 'Scan Pass QR or ID Barcode'}
                    </div>
                    <p style={{ fontSize: '0.76rem', color: '#94a3b8', margin: '0.2rem 0 0', maxWidth: '280px' }}>
                      Point camera at the student&apos;s QR pass or college ID barcode.
                    </p>
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', width: '100%', maxWidth: '300px', marginTop: '0.15rem' }}>
                    <button
                      type="button"
                      disabled={isCameraStarting}
                      onClick={() => startScanner()}
                      style={{
                        flex: 1,
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.4rem',
                        padding: '0.6rem 0.9rem',
                        borderRadius: '9px',
                        border: 'none',
                        cursor: isCameraStarting ? 'wait' : 'pointer',
                        fontWeight: 700,
                        fontSize: '0.8rem',
                        whiteSpace: 'nowrap',
                        background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                        color: '#ffffff',
                        boxShadow: '0 4px 12px rgba(2, 132, 199, 0.3)',
                        opacity: isCameraStarting ? 0.7 : 1
                      }}
                    >
                      <Camera size={15} />
                      <span>{isCameraStarting ? 'Starting...' : 'Start Camera'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.35rem',
                        padding: '0.6rem 0.85rem',
                        borderRadius: '9px',
                        border: '1px solid rgba(255,255,255,0.18)',
                        cursor: 'pointer',
                        fontWeight: 600,
                        fontSize: '0.8rem',
                        whiteSpace: 'nowrap',
                        backgroundColor: 'rgba(255,255,255,0.07)',
                        color: '#e2e8f0'
                      }}
                    >
                      <Upload size={14} />
                      <span>Photo</span>
                    </button>
                  </div>
                </div>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageFileScan}
                style={{ display: 'none' }}
              />
            </div>

            {/* Active Camera Controls */}
            {isCameraActive && (
              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'space-between', flexWrap: 'wrap' }}>
                {availableCameras.length > 1 && (
                  <button
                    type="button"
                    onClick={handleToggleCameraFacing}
                    style={{
                      flex: 1,
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.4rem',
                      padding: '0.55rem 0.85rem',
                      borderRadius: '8px',
                      border: '1px solid var(--border-color)',
                      backgroundColor: 'var(--bg-subtle)',
                      color: 'var(--text-primary)',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    <SwitchCamera size={15} />
                    <span>Switch Camera</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={stopScanner}
                  style={{
                    flex: availableCameras.length <= 1 ? 1 : undefined,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.4rem',
                    padding: '0.55rem 0.95rem',
                    borderRadius: '8px',
                    border: '1px solid rgba(239, 68, 68, 0.35)',
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    color: '#ef4444',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  <CameraOff size={15} />
                  <span>Stop Camera</span>
                </button>
              </div>
            )}

            {cameraError && (
              <div style={{
                padding: '0.65rem 0.85rem',
                borderRadius: '8px',
                backgroundColor: 'rgba(245, 158, 11, 0.12)',
                border: '1px solid rgba(245, 158, 11, 0.35)',
                color: '#d97706',
                fontSize: '0.78rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                <AlertTriangle size={16} style={{ flexShrink: 0 }} />
                <span>{cameraError}</span>
              </div>
            )}

            {/* Unified Lookup: Admission Number / Barcode / Student Name */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const q = nameQuery.trim();
                if (!q) return;
                if (nameMatches.length === 1) {
                  verifyStudentPass(nameMatches[0], 'Manual Lookup');
                } else {
                  verifyStudentPass(q, 'Manual Lookup');
                }
                setNameQuery('');
              }}
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '0.45rem'
              }}
            >
              <label
                htmlFor="staff-unified-lookup-input"
                style={{
                  fontSize: '0.76rem',
                  fontWeight: 700,
                  color: 'var(--text-secondary)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem'
                }}
              >
                <Search size={14} color="var(--primary)" />
                <span>Check by Admission No., Barcode, or Name</span>
              </label>

              <div style={{ display: 'flex', gap: '0.45rem' }}>
                <div style={{ position: 'relative', flex: 1 }}>
                  <Search
                    size={15}
                    color="var(--text-muted)"
                    style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
                  />
                  <input
                    id="staff-unified-lookup-input"
                    name="studentLookup"
                    type="text"
                    value={nameQuery}
                    onChange={(e) => setNameQuery(e.target.value)}
                    placeholder="Admission No. or Student Name..."
                    autoCorrect="off"
                    autoCapitalize="off"
                    spellCheck={false}
                    enterKeyHint="search"
                    className="form-input"
                    style={{
                      paddingLeft: '2.2rem',
                      paddingRight: nameQuery ? '2rem' : '0.75rem',
                      fontSize: '0.84rem'
                    }}
                  />
                  {nameQuery && (
                    <button
                      type="button"
                      aria-label="Clear search"
                      onClick={() => setNameQuery('')}
                      style={{
                        position: 'absolute',
                        right: '0.45rem',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none',
                        border: 'none',
                        color: 'var(--text-muted)',
                        cursor: 'pointer',
                        padding: '0.2rem',
                        display: 'inline-flex',
                        alignItems: 'center'
                      }}
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>

                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{
                    padding: '0.5rem 0.95rem',
                    borderRadius: '8px',
                    fontWeight: 700,
                    fontSize: '0.82rem',
                    whiteSpace: 'nowrap'
                  }}
                >
                  Check
                </button>
              </div>

              {/* Matching Student Suggestions (by Admission No. or Name) */}
              {nameQuery.trim() !== '' && (
                <div style={{
                  border: '1px solid var(--border-color)',
                  borderRadius: '10px',
                  backgroundColor: 'var(--bg-subtle)',
                  maxHeight: '210px',
                  overflowY: 'auto'
                }}>
                  {nameMatches.length === 0 ? (
                    <div style={{ padding: '0.75rem', fontSize: '0.78rem', color: 'var(--text-muted)', textAlign: 'center' }}>
                      No local match for &ldquo;{nameQuery}&rdquo; — press <strong>Check</strong> to verify with server
                    </div>
                  ) : (
                    nameMatches.map((student) => {
                      const ev = evaluatePassValidity(student);
                      return (
                        <div
                          key={student.id}
                          onClick={() => {
                            verifyStudentPass(student, 'Manual Lookup');
                            setNameQuery('');
                          }}
                          style={{
                            padding: '0.6rem 0.85rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '0.5rem',
                            borderBottom: '1px solid var(--border-color)',
                            cursor: 'pointer',
                            backgroundColor: 'var(--bg-card)'
                          }}
                        >
                          <div>
                            <div style={{ fontWeight: 700, fontSize: '0.84rem', color: 'var(--text-primary)' }}>
                              {student.name || student.studentName}
                            </div>
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                              ID: {student.id} • {student.routeEntitlement || 'All Routes'}
                            </div>
                          </div>
                          <span style={{
                            fontSize: '0.68rem',
                            fontWeight: 800,
                            padding: '0.2rem 0.5rem',
                            borderRadius: '999px',
                            backgroundColor: ev.bgColor,
                            color: ev.color,
                            border: `1px solid ${ev.borderColor}`
                          }}>
                            {ev.label}
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </form>
          </div>

          {/* Right Column: Live Verification Result & Recent Scans */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', minInlineSize: 0 }}>
            {/* Verification Result Card */}
            <div className="clean-card" style={{ padding: '0.9rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>
                  Pass Verification Result
                </span>
                {verificationResult && (
                  <button
                    type="button"
                    onClick={() => setVerificationResult(null)}
                    style={{
                      background: 'none',
                      border: 'none',
                      fontSize: '0.74rem',
                      color: 'var(--text-muted)',
                      cursor: 'pointer'
                    }}
                  >
                    Clear
                  </button>
                )}
              </div>

              <AnimatePresence mode="wait">
                {!verificationResult ? (
                  <motion.div
                    key="empty"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    style={{
                      padding: '1.15rem 0.85rem',
                      textAlign: 'center',
                      borderRadius: '10px',
                      border: '1px dashed var(--border-color)',
                      backgroundColor: 'var(--bg-subtle)',
                      color: 'var(--text-muted)'
                    }}
                  >
                    <UserCheck size={24} style={{ margin: '0 auto 0.35rem', opacity: 0.5 }} />
                    <div style={{ fontWeight: 600, fontSize: '0.84rem', color: 'var(--text-secondary)' }}>
                      Waiting for Scan or Lookup
                    </div>
                    <p style={{ fontSize: '0.74rem', margin: '0.15rem 0 0' }}>
                      Scan a QR pass, ID barcode, or type a student&apos;s name.
                    </p>
                  </motion.div>
                ) : (
                  <motion.div
                    key={verificationResult.verifiedAt + verificationResult.rawInput}
                    initial={{ opacity: 0, scale: 0.96, y: 6 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    style={{
                      borderRadius: '14px',
                      border: `2px solid ${verificationResult.evaluation.borderColor}`,
                      backgroundColor: 'var(--bg-card)',
                      overflow: 'hidden',
                      boxShadow: '0 8px 24px rgba(0,0,0,0.08)'
                    }}
                  >
                    {/* Status Banner */}
                    <div style={{
                      padding: '0.85rem 1rem',
                      backgroundColor: verificationResult.evaluation.bgColor,
                      borderBottom: `1px solid ${verificationResult.evaluation.borderColor}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '0.5rem'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
                        {verificationResult.evaluation.isValid ? (
                          <CheckCircle2 size={24} color={verificationResult.evaluation.color} />
                        ) : (
                          <XCircle size={24} color={verificationResult.evaluation.color} />
                        )}
                        <div>
                          <div style={{
                            fontSize: '1.05rem',
                            fontWeight: 900,
                            color: verificationResult.evaluation.color,
                            letterSpacing: '-0.01em'
                          }}>
                            {verificationResult.evaluation.label}
                          </div>
                          <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
                            {verificationResult.evaluation.reason}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Student Details Body */}
                    <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      {verificationResult.pass ? (
                        <>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                            <div>
                              <span style={{ fontSize: '0.65rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700 }}>
                                Student Name
                              </span>
                              <div style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                                {verificationResult.pass.name || verificationResult.pass.studentName}
                              </div>
                              <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                                {verificationResult.pass.email || 'Campus Transit Pass Holder'}
                              </div>
                            </div>

                            <div style={{ textAlign: 'right' }}>
                              <span style={{ fontSize: '0.65rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700 }}>
                                Admission No. / ID
                              </span>
                              <div style={{
                                fontFamily: 'monospace',
                                fontSize: '0.95rem',
                                fontWeight: 800,
                                color: 'var(--primary)',
                                backgroundColor: 'var(--bg-subtle)',
                                padding: '0.2rem 0.5rem',
                                borderRadius: '6px',
                                border: '1px solid var(--border-color)',
                                marginTop: '0.15rem'
                              }}>
                                {verificationResult.pass.id}
                              </div>
                            </div>
                          </div>

                          <div style={{
                            display: 'grid',
                            gridTemplateColumns: '1fr 1fr',
                            gap: '0.65rem',
                            padding: '0.65rem',
                            borderRadius: '10px',
                            backgroundColor: 'var(--bg-subtle)',
                            border: '1px solid var(--border-color)'
                          }}>
                            <div>
                              <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                <Bus size={12} /> Route Entitlement
                              </span>
                              <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '0.15rem' }}>
                                {verificationResult.pass.routeEntitlement || 'All Routes'}
                              </div>
                            </div>
                            <div>
                              <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                <Calendar size={12} /> Valid Until
                              </span>
                              <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '0.15rem' }}>
                                {verificationResult.pass.validUntil || '2026-12-31'}
                              </div>
                            </div>
                          </div>
                        </>
                      ) : (
                        <div style={{ fontSize: '0.84rem', color: 'var(--text-secondary)' }}>
                          Scanned / Entered Code: <strong style={{ fontFamily: 'monospace' }}>{verificationResult.rawInput}</strong>
                        </div>
                      )}

                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        fontSize: '0.72rem',
                        color: 'var(--text-muted)',
                        paddingTop: '0.25rem',
                        borderTop: '1px solid var(--border-color)'
                      }}>
                        <span>Method: <strong>{verificationResult.method}</strong></span>
                        <span>Checked at {verificationResult.verifiedAt}</span>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Recent Scan Log */}
            <div className="clean-card" style={{ padding: '1.15rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.65rem' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <Clock size={14} /> Recent Pass Checks ({recentScans.length})
                </span>
                {recentScans.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setRecentScans([]);
                      localStorage.removeItem(RECENT_SCANS_KEY);
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      fontSize: '0.72rem',
                      color: 'var(--text-muted)',
                      cursor: 'pointer'
                    }}
                  >
                    Clear History
                  </button>
                )}
              </div>

              {recentScans.length === 0 ? (
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', padding: '0.75rem 0', textAlign: 'center' }}>
                  No passes scanned yet during this session.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', maxHeight: '220px', overflowY: 'auto' }}>
                  {recentScans.map((scan) => (
                    <div
                      key={scan.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '0.5rem',
                        padding: '0.55rem 0.75rem',
                        borderRadius: '8px',
                        backgroundColor: 'var(--bg-subtle)',
                        border: '1px solid var(--border-color)',
                        fontSize: '0.78rem'
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                          {scan.studentName} <span style={{ fontFamily: 'monospace', color: 'var(--text-muted)', fontWeight: 500 }}>({scan.admissionNo})</span>
                        </div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                          {scan.method} • {scan.timestamp}
                        </div>
                      </div>
                      <span style={{
                        fontSize: '0.68rem',
                        fontWeight: 800,
                        padding: '0.18rem 0.5rem',
                        borderRadius: '999px',
                        backgroundColor: scan.isValid ? 'rgba(34, 197, 94, 0.14)' : 'rgba(239, 68, 68, 0.14)',
                        color: scan.isValid ? '#16a34a' : '#ef4444'
                      }}>
                        {scan.statusLabel}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================
          TAB 2: STUDENT PASS VALIDITY LIST COPY (OFFLINE-SYNCED DIRECTORY)
          =================================================================== */}
      {activeTab === 'list' && (
        <div className="clean-card" style={{ padding: '0.9rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', minInlineSize: 0 }}>
          {/* Search, Filter Pills & Compact Export Actions */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
            <div style={{ position: 'relative', width: '100%' }}>
              <Search size={15} color="var(--text-muted)" style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
              <input
                type="text"
                name="passListSearch"
                value={listSearch}
                onChange={(e) => setListSearch(e.target.value)}
                placeholder="Search by student name, admission no., or route..."
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck={false}
                className="form-input"
                style={{ paddingLeft: '2.15rem', fontSize: '0.83rem', width: '100%' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', gap: '0.3rem', flex: '1 1 auto' }}>
                {[
                  { id: 'all', label: `All (${validityStats.total})` },
                  { id: 'valid', label: `Valid (${validityStats.validCount})` },
                  { id: 'invalid', label: `Invalid (${validityStats.invalidCount})` }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setListFilter(tab.id)}
                    style={{
                      flex: 1,
                      padding: '0.4rem 0.55rem',
                      borderRadius: '8px',
                      border: '1px solid var(--border-color)',
                      backgroundColor: listFilter === tab.id ? 'var(--primary)' : 'var(--bg-subtle)',
                      color: listFilter === tab.id ? '#ffffff' : 'var(--text-secondary)',
                      fontSize: '0.74rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div style={{ display: 'flex', gap: '0.35rem' }}>
                <button
                  type="button"
                  onClick={handleSyncListNow}
                  title="Refresh list"
                  className="btn btn-secondary"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.25rem',
                    fontSize: '0.74rem',
                    padding: '0.4rem 0.55rem',
                    borderRadius: '8px',
                    whiteSpace: 'nowrap'
                  }}
                >
                  <RefreshCw size={13} className={isSyncingList ? 'spin' : ''} />
                  <span>Sync</span>
                </button>

                <button
                  type="button"
                  onClick={handleExportValidityCsv}
                  title="Download CSV copy"
                  className="btn btn-secondary"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.25rem',
                    fontSize: '0.74rem',
                    padding: '0.4rem 0.55rem',
                    borderRadius: '8px',
                    whiteSpace: 'nowrap'
                  }}
                >
                  <Download size={13} />
                  <span>CSV</span>
                </button>

                <button
                  type="button"
                  onClick={() => window.print()}
                  title="Print validity list"
                  className="btn btn-primary"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.74rem',
                    padding: '0.4rem 0.55rem',
                    borderRadius: '8px'
                  }}
                >
                  <Printer size={13} />
                </button>
              </div>
            </div>
          </div>

          {/* Accessible Responsive Pass Validity Table */}
          <div
            tabIndex={0}
            role="region"
            aria-labelledby="staff-pass-table-caption"
            className="staff-table-wrapper"
          >
            <table className="staff-pass-table">
              <caption id="staff-pass-table-caption">
                Campus Student Bus Pass Validity Directory ({filteredPassList.length} records shown)
              </caption>
              <thead>
                <tr>
                  <th scope="col">Student Name</th>
                  <th scope="col">Admission No.</th>
                  <th scope="col">Pass Validity</th>
                  <th scope="col">Route Access</th>
                  <th scope="col">Valid Until</th>
                  <th scope="col">Quick Check</th>
                </tr>
              </thead>
              <tbody>
                {filteredPassList.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                      No student passes match your current filter.
                    </td>
                  </tr>
                ) : (
                  filteredPassList.map((student) => {
                    const ev = student.evaluation;
                    return (
                      <tr key={student.id}>
                        <th scope="row">
                          <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                            {student.name || student.studentName}
                          </div>
                          {student.email && (
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 400 }}>
                              {student.email}
                            </div>
                          )}
                        </th>
                        <td>
                          <span style={{
                            fontFamily: 'monospace',
                            fontWeight: 700,
                            fontSize: '0.82rem',
                            padding: '0.18rem 0.45rem',
                            borderRadius: '6px',
                            backgroundColor: 'var(--bg-subtle)',
                            border: '1px solid var(--border-color)',
                            color: 'var(--text-primary)'
                          }}>
                            {student.id}
                          </span>
                        </td>
                        <td>
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.3rem',
                            fontSize: '0.72rem',
                            fontWeight: 800,
                            padding: '0.22rem 0.6rem',
                            borderRadius: '999px',
                            backgroundColor: ev.bgColor,
                            color: ev.color,
                            border: `1px solid ${ev.borderColor}`
                          }}>
                            {ev.isValid ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                            <span>{ev.label}</span>
                          </span>
                        </td>
                        <td>{student.routeEntitlement || 'All Routes'}</td>
                        <td style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
                          {student.validUntil || '2026-12-31'}
                        </td>
                        <td>
                          <button
                            type="button"
                            onClick={() => {
                              verifyStudentPass(student, 'Validity List Check');
                              setActiveTab('scanner');
                            }}
                            style={{
                              padding: '0.35rem 0.65rem',
                              borderRadius: '6px',
                              border: '1px solid var(--border-color)',
                              backgroundColor: 'var(--bg-subtle)',
                              color: 'var(--primary)',
                              fontWeight: 700,
                              fontSize: '0.75rem',
                              cursor: 'pointer'
                            }}
                          >
                            Verify Card
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

