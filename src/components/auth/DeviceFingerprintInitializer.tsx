'use client';

import { useEffect } from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import { generateDeviceFingerprint } from '@/lib/deviceFingerprint';

export default function DeviceFingerprintInitializer() {
  useEffect(() => {
    const initializeFingerprint = async () => {
      const { deviceMetadata, setDeviceMetadata } = useAuthStore.getState();
      
      // Check if fingerprint already exists in auth store
      if (deviceMetadata?.fingerprint) {
        console.log('[DeviceFingerprint] Already initialized:', deviceMetadata.fingerprint);
        return;
      }

      // Try to restore from sessionStorage
      const storedFingerprint = sessionStorage.getItem('deviceFingerprint');
      if (storedFingerprint) {
        console.log('[DeviceFingerprint] Restored from sessionStorage');
        setDeviceMetadata({
          fingerprint: storedFingerprint,
          deviceId: storedFingerprint,
          ipAddress: '',
          userAgent: navigator.userAgent
        });
        return;
      }

      // Generate new fingerprint
      try {
        const newFingerprint = await generateDeviceFingerprint();
        console.log('[DeviceFingerprint] Generated new fingerprint');
        
        // Store in both places
        sessionStorage.setItem('deviceFingerprint', newFingerprint);
        setDeviceMetadata({
          fingerprint: newFingerprint,
          deviceId: newFingerprint,
          ipAddress: '',
          userAgent: navigator.userAgent
        });
      } catch (error) {
        console.error('[DeviceFingerprint] Generation failed:', error);
        
        // Fallback: try sessionStorage one more time
        const fallbackFingerprint = sessionStorage.getItem('deviceFingerprint');
        if (fallbackFingerprint) {
          setDeviceMetadata({
            fingerprint: fallbackFingerprint,
            deviceId: fallbackFingerprint,
            ipAddress: '',
            userAgent: navigator.userAgent
          });
        }
      }
    };

    initializeFingerprint();
  }, []); // Run once on mount

  return null; // This component doesn't render anything
}
