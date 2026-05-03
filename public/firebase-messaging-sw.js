importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

// Firebase config is sent by the app after SW registration via postMessage
self.addEventListener('message', (event) => {
  if (event.data?.type === 'FIREBASE_CONFIG') {
    if (firebase.apps.length) return; // already initialized
    firebase.initializeApp(event.data.config);
    const messaging = firebase.messaging();
    messaging.onBackgroundMessage((payload) => {
      self.registration.showNotification(
        payload.notification?.title ?? 'New notification',
        {
          body: payload.notification?.body,
          icon: '/favicon.svg',
          data: payload.data,
        }
      );
    });
  }
});
