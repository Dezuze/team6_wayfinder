/**
 * HopSpot Emergency SOS Alert System
 * Audio Synthesis, Browser Push Notifications, and Vibration Services
 */

let audioCtxInstance = null;

function getAudioContext() {
  if (typeof window === 'undefined') return null;
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return null;
  if (!audioCtxInstance) {
    audioCtxInstance = new AudioCtx();
  }
  if (audioCtxInstance.state === 'suspended') {
    audioCtxInstance.resume().catch(() => {});
  }
  return audioCtxInstance;
}

/**
 * Play a synthesized, distinct two-tone emergency siren
 */
export function playSosEmergencySiren() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';

    // Two-tone warble: 880Hz -> 1100Hz -> 880Hz -> 1100Hz -> 880Hz
    osc.frequency.setValueAtTime(880, now);
    osc.frequency.linearRampToValueAtTime(1174.66, now + 0.18);
    osc.frequency.linearRampToValueAtTime(880, now + 0.36);
    osc.frequency.linearRampToValueAtTime(1174.66, now + 0.54);
    osc.frequency.linearRampToValueAtTime(880, now + 0.72);

    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.85);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.86);
  } catch (err) {
    console.warn('[SOS Siren Audio Failed]:', err);
  }
}

/**
 * Trigger device vibration pattern for emergency feedback
 */
export function vibrateSos() {
  if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
    try {
      navigator.vibrate([300, 100, 300, 100, 450]);
    } catch {
      // ignore
    }
  }
}

/**
 * Request notification permission from browser
 */
export async function requestNotificationPermission() {
  if (typeof window === 'undefined' || typeof Notification === 'undefined') {
    return 'unsupported';
  }
  if (Notification.permission === 'granted') {
    return 'granted';
  }
  try {
    const perm = await Notification.requestPermission();
    return perm;
  } catch {
    return Notification.permission;
  }
}

/**
 * Push native browser notification to device
 */
export function pushSosNotification(alert) {
  if (typeof window === 'undefined' || typeof Notification === 'undefined') return;

  if (Notification.permission === 'granted') {
    try {
      const title = `🚨 EMERGENCY SOS: ${alert.busNumber || 'Campus Shuttle'}`;
      const body = `${alert.reason || 'Distress signal received'}${alert.senderName ? ` • From: ${alert.senderName}` : ''}\nImmediate attention required.`;
      
      const notif = new Notification(title, {
        body,
        icon: '/logo.png',
        badge: '/logo.png',
        tag: alert.id || 'emergency-sos-alert',
        requireInteraction: true,
        vibrate: [300, 100, 300, 100, 450]
      });

      notif.onclick = () => {
        window.focus();
        notif.close();
      };
    } catch (err) {
      console.warn('[SOS Push Notification Failed]:', err);
    }
  } else if (Notification.permission === 'default') {
    requestNotificationPermission().then(perm => {
      if (perm === 'granted') {
        pushSosNotification(alert);
      }
    });
  }
}

/**
 * Standard Emergency SOS Presets & Hotlines
 */
export const SOS_REASON_PRESETS = [
  { id: 'security', label: 'Campus Security / Threat', icon: 'ShieldAlert', color: '#dc2626' },
  { id: 'medical', label: 'Medical Emergency / Injury', icon: 'HeartPulse', color: '#e11d48' },
  { id: 'accident', label: 'Accident / Vehicle Collision', icon: 'CarCrash', color: '#ea580c' },
  { id: 'breakdown', label: 'Mechanical Breakdown / Stranded', icon: 'Wrench', color: '#d97706' },
  { id: 'harassment', label: 'Harassment / Safety Danger', icon: 'AlertTriangle', color: '#b91c1c' },
  { id: 'other', label: 'Other Urgent Distress', icon: 'Radio', color: '#7c3aed' }
];

export const EMERGENCY_HOTLINES = [
  { label: 'Campus Security Control', number: '+91 481 2530000', tel: 'tel:04812530000', primary: true },
  { label: 'National Emergency', number: '112', tel: 'tel:112', primary: true },
  { label: 'Women Helpline', number: '1091', tel: 'tel:1091', primary: false },
  { label: 'Ambulance Service', number: '108', tel: 'tel:108', primary: false }
];
