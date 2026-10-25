import React, { useEffect, useState } from 'react';
import { Download, Share, Smartphone } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone ===
        true;
    setIsInstalled(isStandalone);

    const ua = window.navigator.userAgent.toLowerCase();
    setIsIOS(/iphone|ipad|ipod/.test(ua));

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener(
        'beforeinstallprompt',
        handleBeforeInstallPrompt
      );
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const install = async () => {
    if (!deferredPrompt) return false;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstalled(true);
      setDeferredPrompt(null);
      return true;
    }
    return false;
  };

  return {
    isInstallable: Boolean(deferredPrompt),
    isInstalled,
    isIOS,
    install,
  };
}

export const PWAInstallCard: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSHelp, setShowIOSHelp] = useState(false);

  if (isInstalled) return null;

  return (
    <div className="glass-card space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
            style={{
              backgroundColor: 'var(--primary-soft)',
              color: 'var(--primary)',
            }}
          >
            <Smartphone className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-[16px] font-bold font-display">
              Add to Home Screen
            </h3>
            <p className="text-[13px]" style={{ color: 'var(--text-soft)' }}>
              {isIOS
                ? 'Install Habit Flow on your iPhone for offline access.'
                : 'Keep your 3-minute resets one tap away and offline-ready.'}
            </p>
          </div>
        </div>
        {isInstallable ? (
          <button
            type="button"
            onClick={install}
            className="tap-scale h-10 px-4 rounded-full text-[13px] font-bold flex items-center gap-1.5 shrink-0 cursor-pointer"
            style={{
              backgroundColor: 'var(--primary)',
              color: 'var(--on-primary)',
            }}
          >
            <Download className="w-4 h-4" />
            Install
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setShowIOSHelp((v) => !v)}
            className="tap-scale h-10 px-3.5 rounded-full text-[13px] font-semibold bg-white/80 dark:bg-slate-800/80 shrink-0 cursor-pointer"
          >
            {showIOSHelp ? 'Hide steps' : 'How to add'}
          </button>
        )}
      </div>

      {(showIOSHelp || isIOS) && (
        <div
          className="rounded-[16px] p-3 text-[13px] space-y-1.5"
          style={{ backgroundColor: 'var(--row)' }}
        >
          <p className="font-semibold flex items-center gap-1.5">
            <Share className="w-4 h-4" style={{ color: 'var(--primary)' }} />
            iPhone &amp; Safari steps:
          </p>
          <p style={{ color: 'var(--text-soft)' }}>
            1. Tap the <strong>Share</strong> icon in your browser bar.
          </p>
          <p style={{ color: 'var(--text-soft)' }}>
            2. Scroll and choose <strong>Add to Home Screen</strong>.
          </p>
        </div>
      )}
    </div>
  );
};
