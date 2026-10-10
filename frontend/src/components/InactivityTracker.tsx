'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/lib/auth-store';
import toast from 'react-hot-toast';
import api from '@/lib/api';

const INACTIVITY_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes
const WARNING_TIMEOUT_MS = 9 * 60 * 1000; // 9 minutes (1 minute warning)
const HEARTBEAT_INTERVAL_MS = 2 * 60 * 1000; // 2 minutes heartbeat

export function InactivityTracker() {
  const { user, logout } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState(60);

  const lastActivityRef = useRef<number>(Date.now());
  const warningShownRef = useRef<boolean>(false);
  const lastHeartbeatRef = useRef<number>(Date.now());

  const resetActivity = () => {
    lastActivityRef.current = Date.now();
    if (warningShownRef.current) {
      warningShownRef.current = false;
      setShowWarningModal(false);
    }
  };

  // Perform logout
  const handleTimeoutLogout = () => {
    setShowWarningModal(false);
    logout();
    toast.error(
      'सुरक्षाका लागि १० मिनेट निष्क्रिय रहेपछि स्वतः लगआउट गरियो। (Auto-logged out due to 10 minutes of inactivity)',
      { duration: 7000, id: 'inactivity-logout-toast' }
    );
    router.replace('/login?reason=inactive');
  };

  useEffect(() => {
    if (!user) {
      setShowWarningModal(false);
      return;
    }

    // Initialize activity timestamp
    lastActivityRef.current = Date.now();
    warningShownRef.current = false;

    // Throttled activity event handler
    let lastEventThrottled = 0;
    const handleUserActivity = () => {
      const now = Date.now();
      if (now - lastEventThrottled > 3000) {
        lastEventThrottled = now;
        lastActivityRef.current = now;
        if (warningShownRef.current) {
          warningShownRef.current = false;
          setShowWarningModal(false);
        }

        // Send periodic heartbeat to backend usage tracker
        if (now - lastHeartbeatRef.current > HEARTBEAT_INTERVAL_MS) {
          lastHeartbeatRef.current = now;
          api.post('/usage-tracking/ping').catch(() => {});
        }
      }
    };

    const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'click', 'wheel'];
    events.forEach((evt) => {
      window.addEventListener(evt, handleUserActivity, { passive: true });
    });

    // Check inactivity every 5 seconds
    const interval = setInterval(() => {
      const now = Date.now();
      const elapsed = now - lastActivityRef.current;

      // Inactivity limit reached -> Log out
      if (elapsed >= INACTIVITY_TIMEOUT_MS) {
        clearInterval(interval);
        handleTimeoutLogout();
        return;
      }

      // 9-minute warning -> show 60s countdown
      if (elapsed >= WARNING_TIMEOUT_MS) {
        const remaining = Math.max(0, Math.ceil((INACTIVITY_TIMEOUT_MS - elapsed) / 1000));
        setSecondsRemaining(remaining);
        if (!warningShownRef.current) {
          warningShownRef.current = true;
          setShowWarningModal(true);
        }
      } else {
        if (warningShownRef.current) {
          warningShownRef.current = false;
          setShowWarningModal(false);
        }
      }
    }, 1000);

    return () => {
      events.forEach((evt) => {
        window.removeEventListener(evt, handleUserActivity);
      });
      clearInterval(interval);
    };
  }, [user, pathname]);

  if (!user || !showWarningModal) return null;

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-amber-300 p-6 text-center space-y-4">
        <div className="w-16 h-16 mx-auto rounded-full bg-amber-100 flex items-center justify-center text-amber-600 text-3xl animate-bounce">
          ⏳
        </div>
        <div>
          <h3 className="text-xl font-black text-gray-900">
            निष्क्रियता चेतावनी (Inactivity Warning)
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            तपाईं विगत ९ मिनेटदेखि निष्क्रिय हुनुहुन्छ। सुरक्षाका लागि यो खाता{' '}
            <span className="font-bold text-red-600 text-base">{secondsRemaining}</span> सेकेन्डमा स्वतः लगआउट हुनेछ।
          </p>
          <p className="text-xs text-gray-400 mt-0.5">
            (You will be automatically logged out in {secondsRemaining} seconds due to 10-minute inactivity limit.)
          </p>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={resetActivity}
            className="flex-1 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-sm transition active:scale-95"
          >
            म काम गर्दैछु (Stay Logged In)
          </button>
          <button
            type="button"
            onClick={handleTimeoutLogout}
            className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl transition text-sm"
          >
            लगआउट (Logout Now)
          </button>
        </div>
      </div>
    </div>
  );
}
