import React, { useState, useEffect } from 'react';
import { Header } from './components/Header.tsx';
import { Sidebar } from './components/Sidebar.tsx';
import { OfflineIndicator } from './components/OfflineIndicator.tsx';
import { LandingPage } from './components/LandingPage.tsx';
import { LoginModal } from './components/LoginModal.tsx';
import { Dashboard } from './components/Dashboard.tsx';
import { MedicinesView } from './components/MedicinesView.tsx';
import { StockView } from './components/StockView.tsx';
import { ExpiryAlertsView } from './components/ExpiryAlertsView.tsx';
import { ReportsView } from './components/ReportsView.tsx';
import { SettingsView } from './components/SettingsView.tsx';
import { VoiceConversationView } from './components/VoiceConversationView.tsx';
import { SeasonalVelocityForecast } from './components/SeasonalVelocityForecast.tsx';
import { AIRestockAssistant } from './components/AIRestockAssistant.tsx';
import { useOnlineStatus } from './hooks/useOnlineStatus.ts';
import { api } from './services/api.ts';
import { Medicine, DashboardData, StockMovement, AlertItem, User } from './types/index.ts';
import { Loader2 } from 'lucide-react';

export default function App() {
  // Navigation & User State
  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const [showLanding, setShowLanding] = useState<boolean>(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState<boolean>(false);

  // Default active user is Dr. Anita Sharma (Admin) for instant hackathon review
  const [user, setUser] = useState<User | null>({
    id: 1,
    name: 'Dr. Anita Sharma',
    email: 'admin@meditrack.org',
    role: 'admin'
  });

  const [clinicName, setClinicName] = useState<string>(
    'Primary Rural Health Centre - Seva Kendra'
  );

  // Data States
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [stockHistory, setStockHistory] = useState<StockMovement[]>([]);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Contextual Selection
  const [selectedMedicineId, setSelectedMedicineId] = useState<number | null>(null);
  const [preselectedBatchId, setPreselectedBatchId] = useState<number | null>(null);

  // Offline Hook
  const { isOnline, isSimulatedOffline, toggleSimulatedOffline } = useOnlineStatus();

  // Register service worker
  useEffect(() => {
    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
      navigator.serviceWorker.register('/sw.js').catch((err) => {
        console.warn('SW registration skipped:', err);
      });
    }
  }, []);

  // Fetch all data
  const loadData = async (offline = false) => {
    try {
      const [dash, meds, hist, alt] = await Promise.all([
        api.getDashboard(offline),
        api.getMedicines(offline),
        api.getStockHistory(offline),
        api.getAlerts(offline)
      ]);
      setDashboardData(dash);
      setMedicines(meds);
      setStockHistory(hist);
      setAlerts(alt);
    } catch (err) {
      console.error('Error loading data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData(!isOnline);
  }, [isOnline]);

  // Actions
  const handleAddMedicine = async (payload: any) => {
    await api.addMedicine(payload, !isOnline);
    await loadData(!isOnline);
  };

  const handleUpdateMedicine = async (id: number, payload: any) => {
    await api.updateMedicine(id, payload);
    await loadData(!isOnline);
  };

  const handleDeleteMedicine = async (id: number) => {
    await api.deleteMedicine(id);
    await loadData(!isOnline);
  };

  const handleAddBatch = async (medicineId: number, payload: any) => {
    await api.addBatch(medicineId, payload);
    await loadData(!isOnline);
  };

  const handleUpdateStock = async (payload: any) => {
    const res = await api.updateStock(payload, !isOnline);
    await loadData(!isOnline);
    return res;
  };

  const handleMarkAlert = async (id: number, status: 'resolved' | 'dismissed') => {
    await api.markAlertStatus(id, status);
    await loadData(!isOnline);
  };

  const handleQuarantineExpired = (batchId: number, medicineName: string) => {
    setSelectedMedicineId(null);
    setPreselectedBatchId(batchId);
    setCurrentTab('stock');
  };

  const handleResetData = async () => {
    await api.resetDemoData();
    await loadData(false);
  };

  const handleSwitchUser = (role: 'admin' | 'staff') => {
    if (role === 'admin') {
      setUser({
        id: 1,
        name: 'Dr. Anita Sharma',
        email: 'admin@meditrack.org',
        role: 'admin'
      });
    } else {
      setUser({
        id: 2,
        name: 'Ramesh Kumar',
        email: 'staff@meditrack.org',
        role: 'staff'
      });
    }
  };

  const handleLogout = () => {
    setUser(null);
    setShowLanding(true);
  };

  // Open stock modal with target medicine
  const handleOpenStockModal = (medicineId: number, batchId?: number) => {
    setSelectedMedicineId(medicineId);
    if (batchId) setPreselectedBatchId(batchId);
    setCurrentTab('stock');
  };

  // If user requested public Landing Page or logged out
  if (showLanding || !user) {
    return (
      <div className="min-h-screen bg-[#0B1120] text-slate-100 flex flex-col font-sans">
        <OfflineIndicator
          isOnline={isOnline}
          isSimulatedOffline={isSimulatedOffline}
          onToggleSimulatedOffline={toggleSimulatedOffline}
          onSyncComplete={() => loadData(!isOnline)}
        />
        <Header
          user={user}
          onLogout={handleLogout}
          onSwitchUser={handleSwitchUser}
          clinicName={clinicName}
          alerts={alerts}
          medicines={medicines}
          onSelectMedicine={(id) => {
            setSelectedMedicineId(id);
            setShowLanding(false);
            setCurrentTab('medicines');
          }}
          isOnline={isOnline}
          isSimulatedOffline={isSimulatedOffline}
          onToggleSimulatedOffline={toggleSimulatedOffline}
          onNavigate={(tab) => {
            if (tab === 'login') {
              setIsLoginModalOpen(true);
            } else if (tab === 'dashboard') {
              if (!user) {
                handleSwitchUser('admin');
              }
              setSelectedMedicineId(null);
              setPreselectedBatchId(null);
              setShowLanding(false);
              setCurrentTab('dashboard');
            } else {
              if (!user) {
                handleSwitchUser('admin');
              }
              setSelectedMedicineId(null);
              setPreselectedBatchId(null);
              setShowLanding(false);
              setCurrentTab(tab);
            }
          }}
        />
        <LandingPage
          onStartDemo={(role = 'admin') => {
            handleSwitchUser(role);
            setShowLanding(false);
            setCurrentTab('dashboard');
          }}
          onOpenLogin={() => setIsLoginModalOpen(true)}
        />
        <LoginModal
          isOpen={isLoginModalOpen}
          onClose={() => setIsLoginModalOpen(false)}
          onLoginSuccess={(loggedUser) => {
            setUser(loggedUser);
            setShowLanding(false);
            setCurrentTab('dashboard');
          }}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0B1120] text-slate-100 flex flex-col font-sans selection:bg-orange-500 selection:text-white">
      {/* Offline Status & Sync Alert Bar */}
      <OfflineIndicator
        isOnline={isOnline}
        isSimulatedOffline={isSimulatedOffline}
        onToggleSimulatedOffline={toggleSimulatedOffline}
        onSyncComplete={() => loadData(!isOnline)}
      />

      {/* Main Top Header */}
      <Header
        user={user}
        onLogout={handleLogout}
        onSwitchUser={handleSwitchUser}
        clinicName={clinicName}
        alerts={alerts}
        medicines={medicines}
        onSelectMedicine={(id) => {
          setSelectedMedicineId(id);
          setCurrentTab('medicines');
        }}
        isOnline={isOnline}
        isSimulatedOffline={isSimulatedOffline}
        onToggleSimulatedOffline={toggleSimulatedOffline}
        onNavigate={(tab) => {
          if (tab === 'landing') {
            setShowLanding(true);
          } else {
            setSelectedMedicineId(null);
            setPreselectedBatchId(null);
            setShowLanding(false);
            setCurrentTab(tab);
          }
        }}
      />

      {/* Workspace Body: Sidebar + Main Content */}
      <div className="flex-1 flex max-w-7xl w-full mx-auto">
        <Sidebar
          currentTab={currentTab}
          onSelectTab={(tab) => {
            setSelectedMedicineId(null);
            setPreselectedBatchId(null);
            setCurrentTab(tab);
          }}
          dashboardData={dashboardData}
          onOpenLanding={() => setShowLanding(true)}
        />

        {/* Content Area */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 min-w-0 overflow-y-auto">
          {loading && !dashboardData ? (
            <div className="flex flex-col items-center justify-center min-h-[50vh] text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin text-orange-500 mb-3" />
              <p className="text-sm font-semibold">Connecting to Dispensary SQLite Database...</p>
            </div>
          ) : (
            <>
              {currentTab === 'dashboard' && dashboardData && (
                <Dashboard
                  data={dashboardData}
                  medicines={medicines}
                  onNavigate={setCurrentTab}
                  onOpenStockModal={handleOpenStockModal}
                />
              )}

              {currentTab === 'voice-assistant' && (
                <VoiceConversationView
                  medicines={medicines}
                  user={user}
                  onUpdateStock={handleUpdateStock}
                  onNavigateTab={setCurrentTab}
                  onOpenStockModal={handleOpenStockModal}
                />
              )}

              {currentTab === 'medicines' && (
                <MedicinesView
                  medicines={medicines}
                  user={user}
                  onAddMedicine={handleAddMedicine}
                  onAddBatch={handleAddBatch}
                  onUpdateMedicine={handleUpdateMedicine}
                  onDeleteMedicine={handleDeleteMedicine}
                  onOpenStockModal={handleOpenStockModal}
                  selectedMedicineId={selectedMedicineId}
                />
              )}

              {currentTab === 'forecast' && (
                <SeasonalVelocityForecast
                  medicines={medicines}
                  onOpenStockModal={handleOpenStockModal}
                  onGenerateIndent={(med) => {
                    setSelectedMedicineId(med.id);
                    setCurrentTab('restock');
                  }}
                />
              )}

              {currentTab === 'restock' && (
                <AIRestockAssistant
                  medicines={medicines}
                  user={user}
                  clinicName={clinicName}
                  onRefreshData={() => loadData(!isOnline)}
                  onNavigateTab={setCurrentTab}
                  preselectedMedicineId={selectedMedicineId}
                />
              )}

              {currentTab === 'stock' && (
                <StockView
                  medicines={medicines}
                  stockHistory={stockHistory}
                  user={user}
                  onUpdateStock={handleUpdateStock}
                  preselectedMedicineId={selectedMedicineId}
                  preselectedBatchId={preselectedBatchId}
                />
              )}

              {currentTab === 'expiry-alerts' && (
                <ExpiryAlertsView
                  alerts={alerts}
                  medicines={medicines}
                  onMarkAlert={handleMarkAlert}
                  onQuarantineExpired={handleQuarantineExpired}
                  onNavigate={setCurrentTab}
                />
              )}

              {currentTab === 'reports' && (
                <ReportsView
                  medicines={medicines}
                  stockHistory={stockHistory}
                  clinicName={clinicName}
                />
              )}

              {currentTab === 'settings' && (
                <SettingsView
                  user={user}
                  clinicName={clinicName}
                  onUpdateClinicName={setClinicName}
                  onResetData={handleResetData}
                  isSimulatedOffline={isSimulatedOffline}
                  onToggleSimulatedOffline={toggleSimulatedOffline}
                  onSwitchUser={handleSwitchUser}
                />
              )}
            </>
          )}
        </main>
      </div>

      {/* Login Modal */}
      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        onLoginSuccess={(loggedUser) => {
          setUser(loggedUser);
          setShowLanding(false);
          setCurrentTab('dashboard');
        }}
      />
    </div>
  );
}
