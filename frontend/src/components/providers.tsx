'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { Toaster } from 'react-hot-toast';
import { useAuthStore } from '@/lib/auth-store';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
      gcTime: 5 * 60 * 1000,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      retry: 4,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
    },
  },
});

import { LanguageProvider } from '@/lib/language-context';
import { InactivityTracker } from './InactivityTracker';
import { ServiceWorkerRegister } from './ServiceWorkerRegister';

export function Providers({ children }: { children: React.ReactNode }) {
  const initFromStorage = useAuthStore((s) => s.initFromStorage);
  useEffect(() => {
    initFromStorage();
    // Backend cold-start warmup ping
    try {
      const api = require('@/lib/api').default;
      api.get('/health').catch(() => {});
    } catch (e) {}

    // Global automatic YYYY-MM-DD format listener for date inputs across the app
    const handleGlobalDateInput = (e: Event) => {
      const target = e.target as HTMLInputElement;
      if (!target || target.tagName !== 'INPUT') return;
      const type = (target.type || 'text').toLowerCase();
      if (type !== 'text' && type !== 'search' && type !== '') return;

      const placeholder = (target.placeholder || '').toUpperCase();
      const name = (target.name || '').toLowerCase();
      const id = (target.id || '').toLowerCase();
      const isDateInput =
        target.hasAttribute('data-date-input') ||
        placeholder.includes('YYYY-MM-DD') ||
        placeholder.includes('YYYY-MM') ||
        placeholder.includes('208') ||
        placeholder.includes('मिति') ||
        name.includes('date') ||
        name.includes('miti') ||
        name.includes('dob') ||
        id.includes('date') ||
        id.includes('miti') ||
        id.includes('dob');

      if (!isDateInput) return;

      const raw = target.value;
      if (!raw) return;

      // Convert Nepali numerals: ०-९ -> 0-9
      const nepaliDigits = ['०', '१', '२', '३', '४', '५', '६', '७', '८', '९'];
      const normalized = raw.replace(/[०-९]/g, (d) => String(nepaliDigits.indexOf(d)));

      const digits = normalized.replace(/\D/g, '').slice(0, 8);
      if (!digits) return;

      let formatted = digits;
      if (digits.length > 4 && digits.length <= 6) {
        formatted = `${digits.slice(0, 4)}-${digits.slice(4)}`;
      } else if (digits.length > 6) {
        formatted = `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)}`;
      } else if (digits.length === 4 && raw.length >= 4 && !raw.endsWith('-')) {
        formatted = `${digits}-`;
      }

      if (formatted !== raw) {
        const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
        if (nativeSetter) {
          nativeSetter.call(target, formatted);
        } else {
          target.value = formatted;
        }
        target.dispatchEvent(new Event('input', { bubbles: true }));
      }
    };

    document.addEventListener('input', handleGlobalDateInput, true);
    return () => {
      document.removeEventListener('input', handleGlobalDateInput, true);
    };
  }, [initFromStorage]);

  return (
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        <InactivityTracker />
        <ServiceWorkerRegister />
        {children}
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 3000,
            style: { background: '#1e3a5f', color: '#fff', borderRadius: '8px' },
            success: { style: { background: '#065f46', color: '#fff' } },
            error: { style: { background: '#991b1b', color: '#fff' } },
          }}
        />
      </LanguageProvider>
    </QueryClientProvider>
  );
}
