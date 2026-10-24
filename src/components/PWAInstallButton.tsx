import React, { useState } from 'react';
import { Download, Smartphone, X } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall.ts';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  // If already running in standalone PWA, hide
  if (isInstalled) {
    return null;
  }

  // Chromium / Desktop / Android flow
  if (isInstallable) {
    return (
      <button
        onClick={install}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-orange-600/90 hover:bg-orange-600 text-white text-xs font-medium shadow-sm transition border border-orange-500/50 cursor-pointer"
        title="Install MediTrack 360 as offline desktop/mobile app"
      >
        <Download className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Install App</span>
      </button>
    );
  }

  // iOS Safari flow
  if (isIOS) {
    return (
      <>
        <button
          onClick={() => setShowIOSGuide(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition cursor-pointer"
        >
          <Smartphone className="w-3.5 h-3.5 text-orange-400" />
          <span className="hidden sm:inline">Install iOS</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
            <div className="w-full max-w-sm rounded-2xl bg-slate-900 border border-slate-700 p-6 shadow-2xl text-slate-100">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <Smartphone className="w-5 h-5 text-orange-500" />
                  <h3 className="text-base font-semibold">Install MediTrack 360</h3>
                </div>
                <button
                  onClick={() => setShowIOSGuide(false)}
                  className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="mt-4 space-y-3 text-xs text-slate-300">
                <p>To use MediTrack 360 completely offline on your iPhone or iPad:</p>
                <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700/60 space-y-2">
                  <p className="flex items-start gap-2">
                    <span className="bg-orange-500/20 text-orange-400 font-bold px-1.5 py-0.5 rounded text-[11px]">1</span>
                    Tap the <strong>Share</strong> button in Safari's bottom toolbar.
                  </p>
                  <p className="flex items-start gap-2">
                    <span className="bg-orange-500/20 text-orange-400 font-bold px-1.5 py-0.5 rounded text-[11px]">2</span>
                    Scroll down and select <strong>Add to Home Screen</strong>.
                  </p>
                  <p className="flex items-start gap-2">
                    <span className="bg-orange-500/20 text-orange-400 font-bold px-1.5 py-0.5 rounded text-[11px]">3</span>
                    Launch from your Home Screen for instant offline clinic access.
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowIOSGuide(false)}
                className="mt-5 w-full rounded-xl bg-orange-600 hover:bg-orange-500 py-2.5 text-xs font-semibold text-white transition"
              >
                Got It
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
