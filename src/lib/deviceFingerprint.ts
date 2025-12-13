// lib/deviceFingerprint.ts

/**
 * Generates a unique device fingerprint for security tracking.
 * 
 * @description
 * Creates a hash based on browser and device characteristics.
 * For production, consider using a library like @fingerprintjs/fingerprintjs
 * for more robust fingerprinting.
 * 
 * @returns {Promise<string>} Unique device identifier
 */
export const generateDeviceFingerprint = async (): Promise<string> => {
  // Collect device/browser characteristics
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  if (ctx) {
    ctx.textBaseline = 'top';
    ctx.font = '14px Arial';
    ctx.fillText('fingerprint', 2, 2);
  }
  
  const canvasData = canvas.toDataURL();
  
  const deviceData = {
    userAgent: navigator.userAgent,
    language: navigator.language,
    languages: navigator.languages.join(','),
    platform: navigator.platform,
    hardwareConcurrency: navigator.hardwareConcurrency,
    screenResolution: `${screen.width}x${screen.height}`,
    screenColorDepth: screen.colorDepth,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    timezoneOffset: new Date().getTimezoneOffset(),
    canvas: canvasData,
    touchSupport: 'ontouchstart' in window,
    cookieEnabled: navigator.cookieEnabled,
  };

  // Create hash from device data
  const dataString = JSON.stringify(deviceData);
  const encoder = new TextEncoder();
  const data = encoder.encode(dataString);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

  return hashHex;
};

/**
 * Gets or creates a persistent device ID.
 * Stores in localStorage for consistency across sessions.
 * 
 * @returns {Promise<string>} Persistent device ID
 */
export const getOrCreateDeviceId = async (): Promise<string> => {
  const DEVICE_ID_KEY = 'device_id';
  
  // Check if device ID already exists
  let deviceId = localStorage.getItem(DEVICE_ID_KEY);
  
  if (!deviceId) {
    // Generate new device ID
    deviceId = await generateDeviceFingerprint();
    localStorage.setItem(DEVICE_ID_KEY, deviceId);
  }
  
  return deviceId;
};