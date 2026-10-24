import React, { useState } from 'react';
import {
  Settings,
  Building,
  RotateCcw,
  Shield,
  HardDrive,
  Wifi,
  WifiOff,
  CheckCircle2,
  AlertTriangle,
  UserCheck,
  Database,
  Layers,
  Sparkles
} from 'lucide-react';
import { User } from '../types/index.ts';
import { api } from '../services/api.ts';

interface SettingsViewProps {
  user: User | null;
  clinicName: string;
  onUpdateClinicName: (name: string) => void;
  onResetData: () => Promise<void>;
  isSimulatedOffline: boolean;
  onToggleSimulatedOffline: () => void;
  onSwitchUser: (role: 'admin' | 'staff') => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  user,
  clinicName,
  onUpdateClinicName,
  onResetData,
  isSimulatedOffline,
  onToggleSimulatedOffline,
  onSwitchUser
}) => {
  const [localClinicName, setLocalClinicName] = useState(clinicName);
  const [district, setDistrict] = useState('Mandya Rural District');
  const [state, setState] = useState('Karnataka, India');
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const [resetting, setResetting] = useState(false);
  const [resetSuccess, setResetSuccess] = useState<string | null>(null);

  const pendingActions = api.getPendingActions();

  const handleSaveClinic = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateClinicName(localClinicName);
    setSavedMessage('Clinic details updated successfully!');
    setTimeout(() => setSavedMessage(null), 3000);
  };

  const handleReset = async () => {
    if (confirm('Are you sure you want to reset the database to the verified sample demo dataset?')) {
      setResetting(true);
      try {
        await onResetData();
        setResetSuccess('Database reset to original sample demo batches and movements.');
        setTimeout(() => setResetSuccess(null), 4000);
      } catch (err: any) {
        alert('Reset failed: ' + err.message);
      } finally {
        setResetting(false);
      }
    }
  };

  return (
    <div className="space-y-6 pb-12">
      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">Clinic Settings & System Management</h2>
        <p className="text-xs text-slate-400 mt-0.5">
          Configure clinic credentials, offline storage preferences, and sample dataset tools.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Clinic Profile Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-lg p-5 space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
            <Building className="w-5 h-5 text-orange-400" />
            <h3 className="font-bold text-base text-white">Dispensary / Clinic Profile</h3>
          </div>

          {savedMessage && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{savedMessage}</span>
            </div>
          )}

          <form onSubmit={handleSaveClinic} className="space-y-3.5 text-xs">
            <div>
              <label className="block font-semibold text-slate-300 mb-1">
                Dispensary / Health Centre Name
              </label>
              <input
                type="text"
                value={localClinicName}
                onChange={(e) => setLocalClinicName(e.target.value)}
                required
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-hidden focus:border-orange-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-300 mb-1">District / Taluk</label>
                <input
                  type="text"
                  value={district}
                  onChange={(e) => setDistrict(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">State / Province</label>
                <input
                  type="text"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white"
                />
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                className="px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white font-bold rounded-xl text-xs transition cursor-pointer"
              >
                Save Clinic Information
              </button>
            </div>
          </form>
        </div>

        {/* Demo Data Reset & Diagnostics */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-lg p-5 space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
            <RotateCcw className="w-5 h-5 text-orange-400" />
            <h3 className="font-bold text-base text-white">Demo Data & Sample Reset</h3>
          </div>

          <p className="text-xs text-slate-400 leading-relaxed">
            MediTrack 360 includes rich sample medicines (Paracetamol, Amoxicillin, Metformin, Cetirizine, Omeprazole, etc.) illustrating expiring-soon, expired quarantine, low-stock, and FEFO recommendation scenarios.
          </p>

          {resetSuccess && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{resetSuccess}</span>
            </div>
          )}

          <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700 space-y-2 text-xs">
            <div className="flex justify-between text-slate-300">
              <span>Database Backend:</span>
              <strong className="text-orange-400 font-mono">SQLite (Persistent)</strong>
            </div>
            <div className="flex justify-between text-slate-300">
              <span>Verified Test Batches:</span>
              <span className="font-semibold text-white">12 Medicines • 14 Batches</span>
            </div>
            <div className="flex justify-between text-slate-300">
              <span>FEFO Conflict Scenarios:</span>
              <span className="font-semibold text-emerald-400">Active</span>
            </div>
          </div>

          <button
            onClick={handleReset}
            disabled={resetting}
            className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-orange-600 text-slate-200 hover:text-white font-bold text-xs border border-slate-700 hover:border-orange-500 transition cursor-pointer flex items-center justify-center gap-2"
          >
            <RotateCcw className={`w-4 h-4 ${resetting ? 'animate-spin' : ''}`} />
            <span>{resetting ? 'Restoring Database...' : 'Reset to Verified Sample Demo Data'}</span>
          </button>
        </div>

        {/* User Role Matrix */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-lg p-5 space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
            <Shield className="w-5 h-5 text-orange-400" />
            <h3 className="font-bold text-base text-white">User Access & Role Matrix</h3>
          </div>

          <div className="space-y-3 text-xs">
            <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700 flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-1.5 font-bold text-white">
                  <Shield className="w-4 h-4 text-orange-400" />
                  <span>Admin Role (Dr. Anita Sharma)</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Full dispensary permissions: Add/Edit/Delete medicines, manage batches, update stock, view reports, manage clinic settings.
                </p>
              </div>
              <button
                onClick={() => onSwitchUser('admin')}
                className={`px-3 py-1 rounded-lg text-[11px] font-bold ${
                  user?.role === 'admin'
                    ? 'bg-orange-600 text-white'
                    : 'bg-slate-700 text-slate-300 hover:text-white'
                }`}
              >
                {user?.role === 'admin' ? 'Active' : 'Switch'}
              </button>
            </div>

            <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700 flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-1.5 font-bold text-white">
                  <UserCheck className="w-4 h-4 text-orange-400" />
                  <span>Staff Role (Ramesh Kumar)</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Clinic operations permissions: View medicines, record stock-in and OPD stock-out dispensing, review alerts.
                </p>
              </div>
              <button
                onClick={() => onSwitchUser('staff')}
                className={`px-3 py-1 rounded-lg text-[11px] font-bold ${
                  user?.role === 'staff'
                    ? 'bg-orange-600 text-white'
                    : 'bg-slate-700 text-slate-300 hover:text-white'
                }`}
              >
                {user?.role === 'staff' ? 'Active' : 'Switch'}
              </button>
            </div>
          </div>
        </div>

        {/* Offline & PWA Storage Diagnostics */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-lg p-5 space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
            <HardDrive className="w-5 h-5 text-orange-400" />
            <h3 className="font-bold text-base text-white">Offline PWA & Cache Status</h3>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex justify-between items-center p-3 rounded-xl bg-slate-800/60 border border-slate-700">
              <div>
                <p className="font-semibold text-white">Connection Simulation</p>
                <p className="text-[11px] text-slate-400">Toggle offline mode to test rural blackouts</p>
              </div>
              <button
                onClick={onToggleSimulatedOffline}
                className={`px-3 py-1.5 rounded-xl font-bold text-xs transition cursor-pointer flex items-center gap-1.5 ${
                  isSimulatedOffline
                    ? 'bg-amber-600 text-white'
                    : 'bg-slate-700 text-slate-300 hover:text-white'
                }`}
              >
                {isSimulatedOffline ? <WifiOff className="w-3.5 h-3.5" /> : <Wifi className="w-3.5 h-3.5" />}
                <span>{isSimulatedOffline ? 'Simulating Offline' : 'Online'}</span>
              </button>
            </div>

            <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700 space-y-1.5">
              <div className="flex justify-between text-slate-300">
                <span>Pending Offline Sync Items:</span>
                <span className="font-bold text-orange-400">{pendingActions.length} item(s)</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>Local Cache Mirror:</span>
                <span className="font-semibold text-emerald-400">Active (Indexed)</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>PWA Service Worker:</span>
                <span className="font-semibold text-emerald-400">Registered</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
