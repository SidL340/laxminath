'use client';

import { useEffect, useRef } from 'react';
import { useAuthStore } from '@/lib/auth-store';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function ServiceWorkerRegister() {
  const { user } = useAuthStore();
  const lastNotifiedIds = useRef<Set<number>>(new Set());

  // 1. Register Service Worker & Web Push Subscription for Background Push (when app is closed)
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

    async function initPush() {
      try {
        const reg = await navigator.serviceWorker.register('/sw.js');
        await navigator.serviceWorker.ready;

        if (!user) return;

        // Check or request notification permission
        let permission = Notification.permission;
        if (permission === 'default') {
          permission = await Notification.requestPermission();
        }

        if (permission !== 'granted') return;

        // Fetch VAPID public key
        const res = await api.get('/notifications/vapid-public-key');
        const vapidPublicKey = res.data?.data?.publicKey;
        if (!vapidPublicKey) return;

        // Check existing push subscription or create a new one
        let sub = await reg.pushManager.getSubscription();
        if (!sub) {
          sub = await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
          });
        }

        // Send push subscription to backend
        if (sub) {
          await api.post('/notifications/subscribe', { subscription: sub });
          console.log('[PWA] Native background push notification registered for Android status bar.');
        }
      } catch (err: any) {
        console.warn('[PWA] Push subscription registration skipped/failed:', err?.message || err);
      }
    }

    initPush();
  }, [user]);

  // 2. Client-side realtime watcher for instant notifications while app is active
  const { data: notifData } = useQuery({
    queryKey: ['user-notifications-live-watcher', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const res = await api.get('/notifications?limit=15&unreadOnly=true');
      return res.data?.data?.notifications || [];
    },
    enabled: Boolean(user?.id),
    refetchInterval: 6000,
    refetchOnWindowFocus: true,
  });

  useEffect(() => {
    if (!notifData || !Array.isArray(notifData) || notifData.length === 0) return;
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    if (Notification.permission !== 'granted') return;

    let shownIds: number[] = [];
    try {
      const stored = localStorage.getItem('pwa_shown_notif_ids');
      if (stored) shownIds = JSON.parse(stored);
    } catch (e) {}

    const shownSet = new Set([...shownIds, ...Array.from(lastNotifiedIds.current)]);

    notifData.forEach(async (n: any) => {
      if (!n.isRead && !shownSet.has(n.id)) {
        shownSet.add(n.id);
        lastNotifiedIds.current.add(n.id);

        const title = n.title || 'नेपाल मा.वि. नयाँ सूचना';
        const body = n.message || 'नयाँ सूचना प्राप्त भएको छ।';

        if ('serviceWorker' in navigator) {
          try {
            const reg = await navigator.serviceWorker.ready;
            reg.showNotification(title, {
              body,
              icon: '/icon-192.png',
              badge: '/favicon-32x32.png',
              vibrate: [200, 100, 200, 100, 200],
              tag: `nepal-mavi-${n.id}`,
              renotify: false,
              data: { url: n.link || '/dashboard/notices' },
            } as any);
          } catch (swErr) {
            new Notification(title, {
              body,
              icon: '/icon-192.png',
              badge: '/favicon-32x32.png',
              tag: `nepal-mavi-${n.id}`,
            });
          }
        }
      }
    });

    try {
      // Keep only recent 200 IDs in localStorage
      const trimmedList = Array.from(shownSet).slice(-200);
      localStorage.setItem('pwa_shown_notif_ids', JSON.stringify(trimmedList));
    } catch (e) {}
  }, [notifData]);

  return null;
}
