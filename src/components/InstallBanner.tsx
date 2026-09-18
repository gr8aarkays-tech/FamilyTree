import { useState, useEffect } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function InstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(() => localStorage.getItem('pwa-banner-dismissed') === '1');
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if already running as installed PWA
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', () => setIsInstalled(true));
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  if (isInstalled || dismissed || !deferredPrompt) return null;

  async function handleInstall() {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') setIsInstalled(true);
    setDeferredPrompt(null);
  }

  function handleDismiss() {
    setDismissed(true);
    localStorage.setItem('pwa-banner-dismissed', '1');
  }

  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 p-4 md:bottom-4 md:left-auto md:right-4 md:w-80">
      <div className="flex items-start gap-3">
        <div className="text-3xl shrink-0">🌳</div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-800 dark:text-white">Install Family Tree</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Works offline · Faster access · Data stays on your device</p>
        </div>
        <button onClick={handleDismiss} className="text-gray-300 hover:text-gray-400 shrink-0" aria-label="Dismiss">✕</button>
      </div>
      <div className="flex gap-2 mt-3">
        <button onClick={handleDismiss} className="flex-1 py-2.5 rounded-xl text-sm border border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
          Not now
        </button>
        <button onClick={handleInstall} className="flex-1 py-2.5 rounded-xl text-sm bg-blue-500 text-white font-medium hover:bg-blue-600 transition-colors">
          Install
        </button>
      </div>
    </div>
  );
}
