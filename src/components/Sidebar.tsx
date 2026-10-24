import React from 'react';
import {
  LayoutDashboard,
  Pill,
  ArrowLeftRight,
  AlertTriangle,
  FileBarChart,
  Settings,
  HelpCircle,
  Building,
  Sparkles,
  Mic,
  TrendingDown
} from 'lucide-react';
import { DashboardData } from '../types/index.ts';

interface SidebarProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  dashboardData: DashboardData | null;
  onOpenLanding: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  dashboardData,
  onOpenLanding
}) => {
  const summary = dashboardData?.summary;

  const navItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
      badge: null
    },
    {
      id: 'voice-assistant',
      label: 'Voice Assistant',
      icon: Mic,
      badge: 'High Thinking',
      badgeColor: 'bg-purple-600'
    },
    {
      id: 'medicines',
      label: 'Medicines',
      icon: Pill,
      badge: summary?.totalMedicines ? String(summary.totalMedicines) : null
    },
    {
      id: 'stock',
      label: 'Stock Movements',
      icon: ArrowLeftRight,
      badge: null
    },
    {
      id: 'expiry-alerts',
      label: 'Expiry Alerts',
      icon: AlertTriangle,
      badge:
        summary && summary.expiringSoonCount + summary.expiredCount > 0
          ? String(summary.expiringSoonCount + summary.expiredCount)
          : null,
      badgeColor: 'bg-orange-500'
    },
    {
      id: 'forecast',
      label: 'Seasonal Forecast',
      icon: TrendingDown,
      badge: 'Epidemic AI',
      badgeColor: 'bg-emerald-600'
    },
    {
      id: 'reports',
      label: 'Reports & Audit',
      icon: FileBarChart,
      badge: null
    },
    {
      id: 'settings',
      label: 'Settings & Clinic',
      icon: Settings,
      badge: null
    }
  ];

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-slate-900 border-r border-slate-800 shrink-0 min-h-[calc(100vh-4rem)] p-4 justify-between">
        <div className="space-y-6">
          {/* Clinic status badge */}
          <div className="bg-slate-800/80 rounded-xl p-3 border border-slate-700/60">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
              <Building className="w-4 h-4 text-orange-400" />
              <span>Primary Rural Clinic</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Serving 14 Village Panchayats
            </p>
            <div className="mt-2.5 pt-2 border-t border-slate-700/60 flex items-center justify-between text-[11px]">
              <span className="text-slate-400">Total Batches:</span>
              <span className="font-bold text-orange-400">{summary?.totalBatches || 0}</span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1">
            <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Pharmacy Operations
            </div>
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onSelectTab(item.id)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition cursor-pointer ${
                    isActive
                      ? 'bg-orange-600 text-white shadow-md shadow-orange-600/20'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                        isActive
                          ? 'bg-white/20 text-white'
                          : item.badgeColor
                          ? `${item.badgeColor} text-white animate-pulse`
                          : 'bg-slate-800 text-slate-300'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom Presentation/About link */}
        <div className="space-y-2 pt-4 border-t border-slate-800">
          <button
            onClick={onOpenLanding}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-slate-800/60 hover:bg-slate-800 text-slate-300 hover:text-white text-xs transition border border-slate-700/40 cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-orange-400" />
            <div className="text-left">
              <p className="font-semibold text-slate-200">About MediTrack 360</p>
              <p className="text-[10px] text-slate-400">Presentation & Impact</p>
            </div>
          </button>
          <div className="px-3 text-[11px] text-slate-500">
            v1.2.0 • FEFO & Offline Enabled
          </div>
        </div>
      </aside>

      {/* Mobile Bottom Navigation Bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-900 border-t border-slate-800 px-2 py-2 flex items-center justify-around">
        {navItems.slice(0, 5).map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`flex flex-col items-center justify-center p-1.5 rounded-lg text-[10px] font-medium transition cursor-pointer relative ${
                isActive ? 'text-orange-400' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Icon className="w-5 h-5 mb-0.5" />
              <span>{item.id === 'voice-assistant' ? 'Voice AI' : item.label.split(' ')[0]}</span>
              {item.badge && (
                <span className="absolute top-0 right-1 w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
              )}
            </button>
          );
        })}
      </div>
    </>
  );
};
