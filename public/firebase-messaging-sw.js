// Import Firebase scripts for the service worker
importScripts('https://www.gstatic.com/firebasejs/10.8.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.1/firebase-messaging-compat.js');

// 1. Initialize Firebase in the service worker
// Replace these with your actual Firebase config values
firebase.initializeApp({
  apiKey: "AIzaSyBqz76Zckkko6BidwlcK4znmJTQvsDr-TY",
  authDomain: "tezchipta.firebaseapp.com",
  projectId: "tezchipta",
  storageBucket: "tezchipta.firebasestorage.app",
  messagingSenderId: "112463836858",
  appId: "1:112463836858:web:147cb719f12b42ed57b483"
});

// 2. Retrieve an instance of Firebase Messaging
const messaging = firebase.messaging();

// 3. Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);

  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/logo.png', // Replace with your logo path
    data: payload.data // Pass extra data (like click_action URL)
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// 4. Handle Notification Clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close(); // Close the notification

  // Open the specific URL provided in the payload data
  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Check if there is already a window/tab open with the target URL
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if (client.url === targetUrl && 'focus' in client) {
          return client.focus();
        }
      }
      // If not, open a new window
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
