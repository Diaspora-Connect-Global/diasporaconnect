'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/useAuthStore';
import { useUserStore } from '@/store/useUserStore';
import { getFirebaseMessaging, getToken, onMessage } from '@/lib/firebase';

const API_BASE = 'https://api.diaspoplug.net';
const VAPID_KEY = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;

async function registerDeviceToken(token: string, authToken: string, userId: string) {
  await fetch(`${API_BASE}/notifications/device-tokens`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authToken}`,
      'x-user-id': userId,
    },
    body: JSON.stringify({ token, platform: 'fcm' }),
  });
}

export function usePushNotifications() {
  const tokens = useAuthStore((s) => s.tokens);
  const userId = useUserStore((s) => s.user?.userId);
  const [permissionState, setPermissionState] = useState<NotificationPermission>('default');
  const [fcmToken, setFcmToken] = useState<string | null>(null);
  const isSupported =
    typeof window !== 'undefined' &&
    'Notification' in window &&
    'serviceWorker' in navigator;

  useEffect(() => {
    if (!isSupported) return;
    setPermissionState(Notification.permission);
  }, [isSupported]);

  useEffect(() => {
    if (!isSupported || !tokens?.sessionToken || !userId) return;
    if (Notification.permission === 'denied') return;
    if (!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID) return;

    let cancelled = false;

    async function init() {
      try {
        // Register service worker
        const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');

        // Send Firebase config to SW so it can handle background messages
        registration.active?.postMessage({
          type: 'FIREBASE_CONFIG',
          config: {
            apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
            authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
            projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
            messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
            appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
          },
        });

        // Request permission
        const permission = await Notification.requestPermission();
        if (cancelled) return;
        setPermissionState(permission);
        if (permission !== 'granted') return;

        const messaging = getFirebaseMessaging();
        if (!messaging) return;

        // Get FCM token
        const token = await getToken(messaging, {
          vapidKey: VAPID_KEY,
          serviceWorkerRegistration: registration,
        });
        if (cancelled || !token) return;

        setFcmToken(token);
        await registerDeviceToken(token, tokens!.sessionToken!, userId!);

        // Handle foreground push messages
        const unsubscribe = onMessage(messaging, (payload) => {
          toast(payload.notification?.title ?? 'New notification', {
            description: payload.notification?.body,
          });
        });

        return unsubscribe;
      } catch (err) {
        if (!cancelled) console.warn('[FCM] Push notification setup failed:', err);
      }
    }

    void init();

    return () => {
      cancelled = true;
    };
  }, [isSupported, tokens?.sessionToken, userId]);

  return { isSupported, permissionState, token: fcmToken };
}
