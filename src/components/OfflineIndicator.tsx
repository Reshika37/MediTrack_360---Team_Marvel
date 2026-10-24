import React, { useState } from 'react';
import { Wifi, WifiOff, RefreshCw, CheckCircle2 } from 'lucide-react';
import { api, PendingAction } from '../services/api.ts';

interface OfflineIndicatorProps {
  isOnline: boolean;
  isSimulatedOffline: boolean;
  onToggleSimulatedOffline: () => void;
  onSyncComplete?: () => void;
}

export const OfflineIndicator: React.FC<OfflineIndicatorProps> = ({
  isOnline,
  isSimulatedOffline,
  onToggleSimulatedOffline,
  onSyncComplete
}) => {
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<string | null>(null);
  const pendingActions: PendingAction[] = api.getPendingActions();

  const handleManualSync = async () => {
    if (!isOnline) return;
    setSyncing(true);
    try {
      const res = await api.syncPendingActions();
      setSyncResult(`Synced ${res.synced} pending actions.`);
      if (onSyncComplete) onSyncComplete();
      setTimeout(() => setSyncResult(null), 4000);
    } catch {
      setSyncResult('Sync failed. Please check network.');
    } finally {
      setSyncing(false);
    }
  };

  return (
    <>
      {/* If offline, display prominent notification bar */}
      {!isOnline && (
        <aside
          role="status"
          aria-live="polite"
          className="bg-gradient-to-r from-amber-600 to-amber-700 text-white px-4 py-2 text-xs md:text-sm font-medium flex flex-wrap items-center justify-between gap-2 shadow-md z-40 border-b border-amber-500/50"
        >
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white"></span>
            </span>
            <WifiOff className="w-4 h-4" aria-hidden="true" />
            <span>
              <strong>Offline Mode Active:</strong> You can continue viewing medicines and recording stock. Changes are cached locally on this device.
            </span>
            {pendingActions.length > 0 && (
              <span className="bg-black/30 text-amber-200 px-2 py-0.5 rounded-full text-xs font-semibold">
                {pendingActions.length} pending change{pendingActions.length > 1 ? 's' : ''} queued
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {isSimulatedOffline && (
              <span className="text-[11px] bg-amber-800/80 px-2 py-0.5 rounded border border-amber-400/40">
                Simulation Mode
              </span>
            )}
            <button
              onClick={onToggleSimulatedOffline}
              aria-label={isSimulatedOffline ? "Turn simulation off and restore online mode" : "Simulate offline mode for rural testing"}
              className="px-2.5 py-1 bg-white/20 hover:bg-white/30 rounded text-xs font-medium transition cursor-pointer"
            >
              {isSimulatedOffline ? 'Restore Online' : 'Simulate Offline'}
            </button>
          </div>
        </aside>
      )}

      {/* Sync toast notification when online and pending items exist */}
      {isOnline && pendingActions.length > 0 && (
        <aside
          role="status"
          aria-live="polite"
          className="fixed bottom-4 right-4 z-50 bg-slate-900 border border-orange-500/50 text-white p-3 rounded-xl shadow-2xl flex items-center gap-3 text-xs max-w-sm"
        >
          <div className="p-2 bg-orange-500/20 text-orange-400 rounded-lg">
            <Wifi className="w-4 h-4" aria-hidden="true" />
          </div>
          <div>
            <p className="font-semibold text-slate-200">Connection Restored</p>
            <p className="text-slate-400">{pendingActions.length} pending stock update(s) to sync.</p>
          </div>
          <button
            onClick={handleManualSync}
            disabled={syncing}
            aria-label="Sync pending stock updates to server"
            className="ml-auto px-3 py-1.5 bg-orange-600 hover:bg-orange-500 text-white font-medium rounded-lg text-xs flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} aria-hidden="true" />
            {syncing ? 'Syncing...' : 'Sync Now'}
          </button>
        </aside>
      )}

      {/* Sync success toast */}
      {syncResult && (
        <aside
          role="status"
          aria-live="polite"
          className="fixed bottom-4 right-4 z-50 bg-emerald-950 border border-emerald-500/50 text-emerald-200 p-3 rounded-xl shadow-2xl flex items-center gap-2 text-xs"
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-400" aria-hidden="true" />
          <span>{syncResult}</span>
        </aside>
      )}
    </>
  );
};
