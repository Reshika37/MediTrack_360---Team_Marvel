import React, { useState } from 'react';
import {
  AlertTriangle,
  Clock,
  XCircle,
  CheckCircle2,
  ShieldCheck,
  Trash2,
  Archive,
  Filter,
  Calendar,
  AlertOctagon,
  Sparkles,
  Info,
  FileText
} from 'lucide-react';
import { AlertItem, Medicine } from '../types/index.ts';
import { AuditTrailExportModal } from './AuditTrailExportModal.tsx';

interface ExpiryAlertsViewProps {
  alerts: AlertItem[];
  medicines: Medicine[];
  onMarkAlert: (id: number, status: 'resolved' | 'dismissed') => Promise<void>;
  onQuarantineExpired: (batchId: number, medicineName: string) => void;
  onNavigate: (tab: string) => void;
}

export const ExpiryAlertsView: React.FC<ExpiryAlertsViewProps> = ({
  alerts,
  medicines,
  onMarkAlert,
  onQuarantineExpired,
  onNavigate
}) => {
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('active');
  const [isAuditModalOpen, setIsAuditModalOpen] = useState<boolean>(false);

  // Compute all batches from medicines with calculated shelf life
  const allBatches = medicines.flatMap(m =>
    (m.batches || []).map(b => ({
      ...b,
      medicineName: m.name,
      genericName: m.generic_name,
      category: m.category,
      unit: m.unit,
      supplier: m.supplier
    }))
  ).sort((a, b) => (a.diffDays || 0) - (b.diffDays || 0));

  const expiredBatches = allBatches.filter(b => (b.diffDays || 0) <= 0);
  const criticalSoonBatches = allBatches.filter(b => (b.diffDays || 0) > 0 && (b.diffDays || 0) <= 30);
  const warningBatches = allBatches.filter(b => (b.diffDays || 0) > 30 && (b.diffDays || 0) <= 50);
  const safeBatches = allBatches.filter(b => (b.diffDays || 0) > 50);

  // Filter alerts
  const filteredAlerts = alerts.filter(a => {
    if (filterStatus !== 'all' && a.status !== filterStatus) return false;
    if (filterType !== 'all') {
      if (filterType === 'expired' && a.alert_type !== 'expired') return false;
      if (filterType === 'expiring_soon' && a.alert_type !== 'expiring_soon') return false;
      if (filterType === 'warning' && a.alert_type !== 'warning') return false;
      if (filterType === 'stock' && (a.alert_type !== 'low_stock' && a.alert_type !== 'out_of_stock')) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">Expiry Alert System & Quarantine</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Proactive monitoring of medicine shelf life. Prevents patient safety risks and reduces inventory expiration.
          </p>
        </div>

        <button
          onClick={() => setIsAuditModalOpen(true)}
          className="px-4 py-2 bg-gradient-to-r from-orange-600 to-amber-600 hover:brightness-110 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-md transition cursor-pointer self-start sm:self-center shrink-0"
        >
          <FileText className="w-4 h-4" />
          <span>Export Audit Trail (CSV / PDF)</span>
        </button>
      </div>

      {/* Critical Expiry Rule Indicators */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-xl bg-red-950/40 border border-red-500/40 flex items-start gap-3">
          <div className="p-2 rounded-lg bg-red-500/20 text-red-400 shrink-0">
            <XCircle className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-bold text-sm text-red-300">Expired (Red)</h4>
            <p className="text-xs text-red-200/80 mt-0.5">0 days or past date</p>
            <p className="text-[11px] text-red-400 font-bold mt-1">
              {expiredBatches.length} batch(es) • Quarantine!
            </p>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-orange-950/40 border border-orange-500/40 flex items-start gap-3">
          <div className="p-2 rounded-lg bg-orange-500/20 text-orange-400 shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-bold text-sm text-orange-300">0–30 Days (Critical)</h4>
            <p className="text-xs text-orange-200/80 mt-0.5">Immediate FEFO priority</p>
            <p className="text-[11px] text-orange-400 font-bold mt-1">
              {criticalSoonBatches.length} batch(es) expiring soon
            </p>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-amber-950/40 border border-amber-500/40 flex items-start gap-3">
          <div className="p-2 rounded-lg bg-amber-500/20 text-amber-300 shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-bold text-sm text-amber-300">31–50 Days (Warning)</h4>
            <p className="text-xs text-amber-200/80 mt-0.5">Upcoming expiry window</p>
            <p className="text-[11px] text-amber-300 font-bold mt-1">
              {warningBatches.length} batch(es) to monitor
            </p>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-500/40 flex items-start gap-3">
          <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400 shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-bold text-sm text-emerald-300">50+ Days (Normal)</h4>
            <p className="text-xs text-emerald-200/80 mt-0.5">Healthy shelf life</p>
            <p className="text-[11px] text-emerald-400 font-bold mt-1">
              {safeBatches.length} safe inventory batches
            </p>
          </div>
        </div>
      </div>

      {/* Expired Quarantine Action Panel */}
      {expiredBatches.length > 0 && (
        <div className="bg-gradient-to-r from-red-950/60 to-slate-900 border-2 border-red-500/60 p-5 rounded-2xl shadow-xl space-y-3">
          <div className="flex items-center gap-2.5">
            <AlertOctagon className="w-6 h-6 text-red-400 animate-pulse" />
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>Expired Medicine Safety Quarantine</span>
                <span className="bg-red-500 text-white text-[10px] font-black px-2 py-0.5 rounded uppercase">
                  DO NOT DISPENSE
                </span>
              </h3>
              <p className="text-xs text-red-200/80">
                The following medicine batches have reached or passed their expiration date. They have been locked to prevent accidental patient administration.
              </p>
            </div>
          </div>

          <div className="space-y-2 pt-2">
            {expiredBatches.map(b => (
              <div
                key={b.id}
                className="p-3.5 rounded-xl bg-slate-900/90 border border-red-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <strong className="text-white text-sm">{b.medicineName}</strong>
                    <span className="font-mono text-red-400 font-bold">Batch {b.batch_number}</span>
                    <span className="bg-red-500/20 text-red-400 text-[10px] font-bold px-2 py-0.5 rounded">
                      Expired on {b.expiry_date}
                    </span>
                  </div>
                  <p className="text-slate-400 text-[11px] mt-0.5">
                    {b.quantity} {b.unit} remaining on shelf • {Math.abs(b.diffDays || 0)} days past expiry date
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      onQuarantineExpired(b.id, b.medicineName);
                      onNavigate('stock');
                    }}
                    className="px-3.5 py-1.5 bg-red-600 hover:bg-red-500 text-white font-bold text-xs rounded-xl shadow-md transition cursor-pointer flex items-center gap-1.5"
                  >
                    <Archive className="w-3.5 h-3.5" />
                    <span>Quarantine & Remove From Shelf</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Alert Feed Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-lg p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-orange-400" />
            <h3 className="font-bold text-base text-white">Automated System Alerts</h3>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-white"
            >
              <option value="all">All Alert Types</option>
              <option value="expired">Expired Only</option>
              <option value="expiring_soon">Expiring Soon (0–30d)</option>
              <option value="warning">Warning (31–50d)</option>
              <option value="stock">Low Stock / Out of Stock</option>
            </select>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-white"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active Only</option>
              <option value="resolved">Resolved</option>
              <option value="dismissed">Dismissed</option>
            </select>
          </div>
        </div>

        <div className="space-y-3">
          {filteredAlerts.length === 0 ? (
            <div className="p-8 text-center text-slate-400">
              <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
              <p className="font-semibold text-sm">No Alerts in this category</p>
              <p className="text-xs text-slate-500 mt-1">All conditions are within regular clinical parameters.</p>
            </div>
          ) : (
            filteredAlerts.map(alert => {
              const isExp = alert.alert_type === 'expired';
              const isSoon = alert.alert_type === 'expiring_soon';
              const isWarn = alert.alert_type === 'warning';
              const isStock = alert.alert_type === 'low_stock' || alert.alert_type === 'out_of_stock';

              return (
                <div
                  key={alert.id}
                  className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs transition ${
                    isExp
                      ? 'bg-red-950/20 border-red-500/30'
                      : isSoon
                      ? 'bg-orange-950/20 border-orange-500/30'
                      : isWarn
                      ? 'bg-amber-950/20 border-amber-500/30'
                      : 'bg-slate-800/60 border-slate-700/60'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5">
                      {isExp ? (
                        <XCircle className="w-5 h-5 text-red-400 shrink-0" />
                      ) : isSoon ? (
                        <Clock className="w-5 h-5 text-orange-400 shrink-0" />
                      ) : (
                        <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <strong className="text-white text-sm">{alert.medicine_name}</strong>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          alert.status === 'active' ? 'bg-orange-500/20 text-orange-400' : 'bg-slate-800 text-slate-400'
                        }`}>
                          {alert.status}
                        </span>
                      </div>
                      <p className="text-slate-300 text-xs mt-1 leading-relaxed">{alert.message}</p>
                      <p className="text-[10px] text-slate-500 mt-1">
                        Generated {new Date(alert.created_at).toLocaleDateString()} at {new Date(alert.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  {alert.status === 'active' && (
                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                      <button
                        onClick={() => onMarkAlert(alert.id, 'resolved')}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs rounded-lg transition cursor-pointer flex items-center gap-1"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Mark Resolved</span>
                      </button>
                      <button
                        onClick={() => onMarkAlert(alert.id, 'dismissed')}
                        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-medium text-xs rounded-lg transition cursor-pointer"
                      >
                        Dismiss
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Audit Trail Export Modal */}
      <AuditTrailExportModal
        isOpen={isAuditModalOpen}
        onClose={() => setIsAuditModalOpen(false)}
        stockHistory={[]}
        medicines={medicines}
        alerts={alerts}
        user={null}
      />
    </div>
  );
};
