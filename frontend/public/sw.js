// Nepal Mavi ERP - Service Worker for Mobile Push Notifications & Offline Support
const CACHE_NAME = 'nepal-mavi-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Listen for Push Events from Web Push Server / FCM
self.addEventListener('push', (event) => {
  let data = {
    title: 'नेपाल मा.वि. सूचना (Nepal Mavi Alert)',
    body: 'तपाईंको लागि नयाँ सूचना आएको छ।',
    icon: '/icon-192.png',
    badge: '/favicon-32x32.png',
    data: { url: '/' },
  };

  try {
    if (event.data) {
      const parsed = event.data.json();
      data = { ...data, ...parsed };
    }
  } catch (e) {
    if (event.data) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: data.icon || '/icon-192.png',
    badge: data.badge || '/favicon-32x32.png',
    vibrate: [200, 100, 200, 100, 200],
    tag: data.tag || 'nepal-mavi-alert',
    renotify: true,
    data: data.data || { url: '/' },
    actions: [
      { action: 'open', title: 'हेर्नुहोस् (View)' },
      { action: 'close', title: 'बन्द गर्नुहोस् (Close)' },
    ],
  };

  // Broadcast to all open tabs for instant 0-second in-app refresh
  self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
    clientList.forEach((client) => {
      client.postMessage({ type: 'NEW_NOTIFICATION', data });
    });
  });

  event.waitUntil(self.registration.showNotification(data.title, options));
});

// Handle Notification Click on Mobile (Opens the app to the relevant page)
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'close') return;

  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
