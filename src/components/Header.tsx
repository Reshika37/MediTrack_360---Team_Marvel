import React, { useState, useRef, useEffect } from 'react';
import {
  Search,
  Bell,
  Building2,
  User as UserIcon,
  LogOut,
  ChevronDown,
  Check,
  AlertTriangle,
  Clock,
  Package,
  Wifi,
  WifiOff,
  Sparkles,
  Mic,
  Brain
} from 'lucide-react';
import { User, AlertItem, Medicine } from '../types/index.ts';
import { PWAInstallButton } from './PWAInstallButton.tsx';

interface HeaderProps {
  user: User | null;
  onLogout: () => void;
  onSwitchUser: (role: 'admin' | 'staff') => void;
  clinicName: string;
  alerts: AlertItem[];
  medicines: Medicine[];
  onSelectMedicine: (medicineId: number) => void;
  isOnline: boolean;
  isSimulatedOffline: boolean;
  onToggleSimulatedOffline: () => void;
  onNavigate: (tab: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  user,
  onLogout,
  onSwitchUser,
  clinicName,
  alerts,
  medicines,
  onSelectMedicine,
  isOnline,
  isSimulatedOffline,
  onToggleSimulatedOffline,
  onNavigate
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [showAlertsDropdown, setShowAlertsDropdown] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);

  const searchRef = useRef<HTMLDivElement>(null);
  const alertsRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSearchDropdown(false);
      }
      if (alertsRef.current && !alertsRef.current.contains(e.target as Node)) {
        setShowAlertsDropdown(false);
      }
      if (userRef.current && !userRef.current.contains(e.target as Node)) {
        setShowUserDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter medicines for global search
  const searchResults = searchQuery.trim()
    ? medicines.filter(m =>
        m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.generic_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (m.batches && m.batches.some(b => b.batch_number.toLowerCase().includes(searchQuery.toLowerCase())))
      ).slice(0, 6)
    : [];

  const activeAlerts = alerts.filter(a => a.status === 'active');

  return (
    <header className="bg-slate-900 border-b border-slate-800 text-white sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-3">
        {/* Brand & Clinic */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => onNavigate('dashboard')}
            title="Go to Dashboard"
            aria-label="MediTrack 360 - Go to Dashboard"
            className="flex items-center gap-2.5 text-left group cursor-pointer focus:outline-hidden"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-orange-600 to-amber-500 p-0.5 shadow-md shadow-orange-500/20 flex items-center justify-center group-hover:scale-105 transition-transform">
              <div className="w-full h-full bg-slate-900 rounded-[10px] flex items-center justify-center">
                <span className="font-black text-transparent bg-clip-text bg-gradient-to-tr from-orange-400 to-amber-300 text-base">
                  360°
                </span>
              </div>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-base tracking-tight text-white group-hover:text-orange-400 transition">
                  MediTrack <span className="text-orange-500">360</span>
                </span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-orange-500/10 text-orange-400 border border-orange-500/20">
                  Rural
                </span>
              </div>
              <p className="hidden md:block text-[11px] text-slate-400 truncate max-w-[240px]">
                {clinicName}
              </p>
            </div>
          </button>
        </div>

        {/* Global Fast Search */}
        <div ref={searchRef} className="flex-1 max-w-md relative hidden sm:block">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setShowSearchDropdown(true);
              }}
              onFocus={() => setShowSearchDropdown(true)}
              placeholder="Search medicines, generic name, batch no..."
              className="w-full pl-9 pr-4 py-2 bg-slate-800/80 border border-slate-700/80 rounded-xl text-xs text-white placeholder-slate-400 focus:outline-hidden focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs"
              >
                Clear
              </button>
            )}
          </div>

          {/* Quick Search Dropdown */}
          {showSearchDropdown && searchQuery.trim() && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-2 z-50 text-xs">
              <div className="text-[11px] font-semibold text-slate-400 px-2 py-1 uppercase tracking-wider flex justify-between">
                <span>Matching Medicines</span>
                <span>Stock / Earliest Expiry</span>
              </div>
              {searchResults.length === 0 ? (
                <div className="p-4 text-center text-slate-400">
                  No medicines found matching "{searchQuery}"
                </div>
              ) : (
                <div className="space-y-1">
                  {searchResults.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => {
                        onSelectMedicine(m.id);
                        setShowSearchDropdown(false);
                        setSearchQuery('');
                        onNavigate('medicines');
                      }}
                      className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-slate-800 transition text-left cursor-pointer group"
                    >
                      <div>
                        <p className="font-semibold text-white group-hover:text-orange-400">{m.name}</p>
                        <p className="text-[11px] text-slate-400">{m.generic_name} • {m.category}</p>
                      </div>
                      <div className="text-right">
                        <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold ${
                          m.stockStatus === 'Out of Stock' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                          m.stockStatus === 'Low Stock' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                          'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        }`}>
                          {m.totalStock} {m.unit}
                        </span>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          {m.earliestExpiryDays !== null && m.earliestExpiryDays !== undefined
                            ? m.earliestExpiryDays <= 0
                              ? 'Expired'
                              : `${m.earliestExpiryDays}d left`
                            : 'No batches'}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Action Icons */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Quick Voice Assistant Trigger */}
          <button
            onClick={() => onNavigate('voice-assistant')}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-gradient-to-r from-orange-500/20 to-purple-500/20 hover:from-orange-500/30 hover:to-purple-500/30 border border-orange-500/40 text-orange-300 hover:text-white transition cursor-pointer text-xs font-semibold shadow-xs"
            title="Hands-free Voice Conversation & High Thinking"
          >
            <Mic className="w-3.5 h-3.5 text-orange-400 animate-pulse shrink-0" />
            <span className="hidden sm:inline">Voice AI</span>
            <span className="hidden lg:inline text-[9px] px-1 py-0.2 rounded bg-purple-500/30 text-purple-200 border border-purple-500/40 font-bold uppercase tracking-wider">
              Thinking
            </span>
          </button>

          {/* PWA Install Button */}
          <PWAInstallButton />

          {/* Offline simulator toggle button */}
          <button
            onClick={onToggleSimulatedOffline}
            title={isSimulatedOffline ? "Restore online connection" : "Test offline capability"}
            className={`p-2 rounded-lg border text-xs flex items-center gap-1.5 transition cursor-pointer ${
              isSimulatedOffline
                ? 'bg-amber-500/20 border-amber-500/60 text-amber-300'
                : 'bg-slate-800 border-slate-700/80 text-slate-300 hover:text-white'
            }`}
          >
            {isSimulatedOffline ? (
              <>
                <WifiOff className="w-4 h-4 text-amber-400 animate-pulse" />
                <span className="hidden lg:inline text-[11px] font-medium">Offline Active</span>
              </>
            ) : (
              <>
                <Wifi className="w-4 h-4 text-emerald-400" />
                <span className="hidden lg:inline text-[11px]">Online</span>
              </>
            )}
          </button>

          {/* Notifications Bell */}
          <div ref={alertsRef} className="relative">
            <button
              onClick={() => setShowAlertsDropdown(!showAlertsDropdown)}
              className="p-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-200 hover:text-white hover:bg-slate-700/80 transition relative cursor-pointer"
              title="System Alerts & Expiry Warnings"
            >
              <Bell className="w-4 h-4" />
              {activeAlerts.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold rounded-full h-5 min-w-[20px] px-1 flex items-center justify-center animate-pulse shadow-md">
                  {activeAlerts.length}
                </span>
              )}
            </button>

            {showAlertsDropdown && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-3 z-50 text-xs">
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <Bell className="w-4 h-4 text-orange-400" />
                    <span className="font-bold text-slate-100">Live Alerts ({activeAlerts.length})</span>
                  </div>
                  <button
                    onClick={() => {
                      setShowAlertsDropdown(false);
                      onNavigate('expiry-alerts');
                    }}
                    className="text-orange-400 hover:text-orange-300 font-semibold text-[11px]"
                  >
                    View All Alerts →
                  </button>
                </div>

                {activeAlerts.length === 0 ? (
                  <div className="p-4 text-center text-slate-400">
                    <Check className="w-6 h-6 text-emerald-400 mx-auto mb-1" />
                    No active warnings. Stock & shelf-life healthy!
                  </div>
                ) : (
                  <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
                    {activeAlerts.slice(0, 5).map(alert => (
                      <div
                        key={alert.id}
                        className={`p-2.5 rounded-xl border flex items-start gap-2.5 ${
                          alert.alert_type === 'expired'
                            ? 'bg-red-500/10 border-red-500/30 text-red-200'
                            : alert.alert_type === 'expiring_soon'
                            ? 'bg-orange-500/10 border-orange-500/30 text-orange-200'
                            : alert.alert_type === 'low_stock' || alert.alert_type === 'out_of_stock'
                            ? 'bg-amber-500/10 border-amber-500/30 text-amber-200'
                            : 'bg-slate-800/80 border-slate-700 text-slate-200'
                        }`}
                      >
                        <div className="mt-0.5">
                          {alert.alert_type === 'expired' ? (
                            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                          ) : alert.alert_type === 'expiring_soon' ? (
                            <Clock className="w-4 h-4 text-orange-400 shrink-0" />
                          ) : (
                            <Package className="w-4 h-4 text-amber-400 shrink-0" />
                          )}
                        </div>
                        <div className="flex-1">
                          <p className="text-xs font-semibold leading-snug">{alert.message}</p>
                          <p className="text-[10px] text-slate-400 mt-0.5">
                            {new Date(alert.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* User Account / Role Switcher */}
          {user ? (
            <div ref={userRef} className="relative">
              <button
                onClick={() => setShowUserDropdown(!showUserDropdown)}
                className="flex items-center gap-2 p-1.5 sm:px-3 sm:py-1.5 bg-slate-800 hover:bg-slate-700/80 border border-slate-700 rounded-xl transition cursor-pointer text-xs"
              >
                <div className="w-7 h-7 rounded-lg bg-orange-500/20 text-orange-400 flex items-center justify-center font-bold text-xs border border-orange-500/30">
                  {user.name.charAt(0)}
                </div>
                <div className="hidden sm:block text-left">
                  <p className="font-semibold text-white leading-none">{user.name}</p>
                  <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold mt-0.5">
                    {user.role}
                  </p>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 ml-0.5 hidden sm:block" />
              </button>

              {showUserDropdown && (
                <div className="absolute right-0 mt-2 w-64 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-2 z-50 text-xs text-slate-200">
                  <div className="p-2 border-b border-slate-800">
                    <p className="font-bold text-white text-sm">{user.name}</p>
                    <p className="text-slate-400 text-xs">{user.email}</p>
                    <span className="inline-block mt-1 px-2 py-0.5 rounded bg-orange-500/20 text-orange-400 font-semibold text-[10px] border border-orange-500/30">
                      Role: {user.role.toUpperCase()}
                    </span>
                  </div>

                  <div className="py-2 px-1">
                    <p className="text-[10px] font-bold text-slate-400 px-2 py-1 uppercase tracking-wider">
                      Switch Role for Demo:
                    </p>
                    <button
                      onClick={() => {
                        onSwitchUser('admin');
                        setShowUserDropdown(false);
                      }}
                      className={`w-full flex items-center justify-between p-2 rounded-lg text-left transition ${
                        user.role === 'admin' ? 'bg-orange-500/20 text-orange-300 font-bold' : 'hover:bg-slate-800 text-slate-300'
                      }`}
                    >
                      <div>
                        <p className="font-medium">Dr. Anita Sharma</p>
                        <p className="text-[10px] text-slate-400">Chief Medical Officer (Admin)</p>
                      </div>
                      {user.role === 'admin' && <Check className="w-3.5 h-3.5 text-orange-400" />}
                    </button>

                    <button
                      onClick={() => {
                        onSwitchUser('staff');
                        setShowUserDropdown(false);
                      }}
                      className={`w-full flex items-center justify-between p-2 rounded-lg text-left transition ${
                        user.role === 'staff' ? 'bg-orange-500/20 text-orange-300 font-bold' : 'hover:bg-slate-800 text-slate-300'
                      }`}
                    >
                      <div>
                        <p className="font-medium">Ramesh Kumar</p>
                        <p className="text-[10px] text-slate-400">Clinic Pharmacist (Staff)</p>
                      </div>
                      {user.role === 'staff' && <Check className="w-3.5 h-3.5 text-orange-400" />}
                    </button>
                  </div>

                  <div className="border-t border-slate-800 pt-1">
                    <button
                      onClick={() => {
                        setShowUserDropdown(false);
                        onLogout();
                      }}
                      className="w-full flex items-center gap-2 p-2 rounded-lg text-red-400 hover:bg-red-500/10 transition text-left cursor-pointer"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={() => onNavigate('login')}
              className="px-3.5 py-1.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-semibold text-xs shadow-md transition cursor-pointer"
            >
              Sign In
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
