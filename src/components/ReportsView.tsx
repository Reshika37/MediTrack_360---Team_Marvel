import React, { useState } from 'react';
import {
  FileBarChart,
  Download,
  Printer,
  Calendar,
  Filter,
  Layers,
  Boxes,
  Clock,
  ArrowLeftRight,
  CheckCircle2,
  AlertTriangle,
  Building,
  TrendingDown
} from 'lucide-react';
import { Medicine, StockMovement } from '../types/index.ts';
import { AuditTrailExportModal } from './AuditTrailExportModal.tsx';
import { SeasonalVelocityForecast } from './SeasonalVelocityForecast.tsx';

interface ReportsViewProps {
  medicines: Medicine[];
  stockHistory: StockMovement[];
  clinicName: string;
}

export const ReportsView: React.FC<ReportsViewProps> = ({
  medicines,
  stockHistory,
  clinicName
}) => {
  const [activeReportTab, setActiveReportTab] = useState<'stock' | 'expiry' | 'movements' | 'velocity'>('stock');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);

  // Filter categories
  const categories = ['All', ...new Set(medicines.map(m => m.category))];

  // Batches with expiry
  const allBatches = medicines.flatMap(m =>
    (m.batches || []).map(b => ({
      ...b,
      medicineName: m.name,
      genericName: m.generic_name,
      category: m.category,
      unit: m.unit,
      supplier: m.supplier,
      minimum_stock: m.minimum_stock
    }))
  ).sort((a, b) => (a.diffDays || 0) - (b.diffDays || 0));

  // Export to CSV helper
  const handleExportCSV = () => {
    let csvContent = '';
    const today = '2026-10-23';

    if (activeReportTab === 'stock') {
      csvContent = 'Medicine Name,Generic Name,Category,Current Stock,Min Stock,Status,Unit,Supplier\n';
      medicines.forEach(m => {
        csvContent += `"${m.name}","${m.generic_name}","${m.category}",${m.totalStock},${m.minimum_stock},"${m.stockStatus}","${m.unit}","${m.supplier || 'Depot'}"\n`;
      });
    } else if (activeReportTab === 'expiry') {
      csvContent = 'Medicine,Generic Name,Batch Number,Expiry Date,Days Remaining,Quantity,Expiry Status,Action Needed\n';
      allBatches.forEach(b => {
        const action = (b.diffDays || 0) <= 0
          ? 'Quarantine'
          : (b.diffDays || 0) <= 30
          ? 'Priority Dispense (FEFO)'
          : (b.diffDays || 0) <= 50
          ? 'Monitor Closely'
          : 'Normal';
        csvContent += `"${b.medicineName}","${b.genericName}","${b.batch_number}","${b.expiry_date}",${b.diffDays},${b.quantity},"${b.expiryStatus}","${action}"\n`;
      });
    } else {
      csvContent = 'Date,Time,Medicine,Batch,Movement Type,Quantity,Previous Qty,New Qty,Reason,Staff\n';
      stockHistory.forEach(h => {
        const dt = new Date(h.timestamp);
        csvContent += `"${dt.toLocaleDateString()}","${dt.toLocaleTimeString()}","${h.medicine_name}","${h.batch_number}","${h.movement_type}",${h.quantity},${h.previous_quantity},${h.new_quantity},"${h.reason}","${h.staff_name}"\n`;
      });
    }

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `MediTrack360_${activeReportTab}_report_${today}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 pb-12 print-area">
      {/* Title & Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 no-print">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">Audit & Inventory Reports</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Export official government dispensary audit logs, shelf-life forecasts, and movement ledgers.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setIsAuditModalOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 hover:brightness-110 text-white text-xs font-bold shadow-md shadow-orange-600/30 flex items-center gap-1.5 transition cursor-pointer"
          >
            <Building className="w-3.5 h-3.5" />
            <span>Official Audit Trail (PDF / CSV)</span>
          </button>
          <button
            onClick={handleExportCSV}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 flex items-center gap-1.5 transition cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-orange-400" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={handlePrint}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 flex items-center gap-1.5 transition cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Report</span>
          </button>
        </div>
      </div>

      {/* Report Type Tabs */}
      <div className="flex flex-wrap border-b border-slate-800 gap-2 no-print">
        <button
          onClick={() => setActiveReportTab('stock')}
          className={`pb-3 px-4 text-xs font-bold transition flex items-center gap-2 border-b-2 cursor-pointer ${
            activeReportTab === 'stock'
              ? 'border-orange-500 text-orange-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Boxes className="w-4 h-4" />
          <span>Stock Summary Report</span>
        </button>

        <button
          onClick={() => setActiveReportTab('expiry')}
          className={`pb-3 px-4 text-xs font-bold transition flex items-center gap-2 border-b-2 cursor-pointer ${
            activeReportTab === 'expiry'
              ? 'border-orange-500 text-orange-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Expiry & Shelf-Life Audit</span>
        </button>

        <button
          onClick={() => setActiveReportTab('movements')}
          className={`pb-3 px-4 text-xs font-bold transition flex items-center gap-2 border-b-2 cursor-pointer ${
            activeReportTab === 'movements'
              ? 'border-orange-500 text-orange-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <ArrowLeftRight className="w-4 h-4" />
          <span>Stock Movement Ledger</span>
        </button>

        <button
          onClick={() => setActiveReportTab('velocity')}
          className={`pb-3 px-4 text-xs font-bold transition flex items-center gap-2 border-b-2 cursor-pointer ${
            activeReportTab === 'velocity'
              ? 'border-orange-500 text-orange-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <TrendingDown className="w-4 h-4 text-orange-400" />
          <span>Seasonal Velocity Forecast</span>
          <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
            AI Epidemic
          </span>
        </button>
      </div>

      {/* Print Header Visible Only When Printing */}
      <div className="hidden print-only mb-6 text-black border-b pb-4">
        <h1 className="text-xl font-bold">MediTrack 360 — Official Dispensary Report</h1>
        <p className="text-sm">Clinic: {clinicName}</p>
        <p className="text-xs text-gray-600">Generated on: 2026-10-23 | Mandya Rural Health District</p>
      </div>

      {/* TAB 1: Stock Summary Report */}
      {activeReportTab === 'stock' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-lg p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
            <div>
              <h3 className="font-bold text-base text-white">Consolidated Stock Position</h3>
              <p className="text-[11px] text-slate-400">Total registered items: {medicines.length}</p>
            </div>
            <div className="flex items-center gap-2 text-xs no-print">
              <span className="text-slate-400 text-[11px]">Category:</span>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-2.5 py-1 bg-slate-800 border border-slate-700 rounded-lg text-white"
              >
                {categories.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-800">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-800/80 text-slate-300 uppercase tracking-wider text-[10px] border-b border-slate-800">
                <tr>
                  <th className="p-3">Medicine Name</th>
                  <th className="p-3">Generic Formulation</th>
                  <th className="p-3">Category</th>
                  <th className="p-3">Current Stock</th>
                  <th className="p-3">Min. Stock</th>
                  <th className="p-3">Inventory Status</th>
                  <th className="p-3">Suggested Reorder</th>
                  <th className="p-3">Supplier</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-300">
                {medicines
                  .filter(m => categoryFilter === 'All' || m.category === categoryFilter)
                  .map(m => {
                    const isZero = (m.totalStock || 0) === 0;
                    const isLow = m.stockStatus === 'Low Stock';
                    const reorderAmt = (m.totalStock || 0) <= m.minimum_stock
                      ? Math.max(m.minimum_stock * 2 - (m.totalStock || 0), m.minimum_stock)
                      : 0;

                    return (
                      <tr key={m.id} className="hover:bg-slate-800/40">
                        <td className="p-3 font-bold text-white">{m.name}</td>
                        <td className="p-3 text-slate-400">{m.generic_name}</td>
                        <td className="p-3">{m.category}</td>
                        <td className="p-3 font-mono font-bold text-white">
                          {m.totalStock} {m.unit}
                        </td>
                        <td className="p-3 text-slate-400">
                          {m.minimum_stock} {m.unit}
                        </td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            isZero ? 'bg-red-500/20 text-red-400' : isLow ? 'bg-amber-500/20 text-amber-300' : 'bg-emerald-500/20 text-emerald-300'
                          }`}>
                            {m.stockStatus}
                          </span>
                        </td>
                        <td className="p-3 font-semibold text-orange-400">
                          {reorderAmt > 0 ? `+${reorderAmt} ${m.unit}` : '—'}
                        </td>
                        <td className="p-3 text-slate-400">{m.supplier || 'Depot'}</td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: Expiry & Shelf-Life Report */}
      {activeReportTab === 'expiry' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-lg p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div>
              <h3 className="font-bold text-base text-white">Medicine Batch Expiration Schedule</h3>
              <p className="text-[11px] text-slate-400">Batches ordered by earliest expiry date for proactive waste prevention</p>
            </div>
            <span className="text-xs bg-slate-800 px-3 py-1 rounded-lg text-slate-300 border border-slate-700">
              Total Batches: <strong>{allBatches.length}</strong>
            </span>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-800">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-800/80 text-slate-300 uppercase tracking-wider text-[10px] border-b border-slate-800">
                <tr>
                  <th className="p-3">Medicine</th>
                  <th className="p-3">Batch #</th>
                  <th className="p-3">Expiry Date</th>
                  <th className="p-3">Days Left</th>
                  <th className="p-3">Quantity</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Clinical Action Mandate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-300">
                {allBatches.map(b => {
                  const isExp = (b.diffDays || 0) <= 0;
                  const isSoon = (b.diffDays || 0) > 0 && (b.diffDays || 0) <= 30;
                  const isWarn = (b.diffDays || 0) > 30 && (b.diffDays || 0) <= 50;

                  return (
                    <tr key={b.id} className="hover:bg-slate-800/40">
                      <td className="p-3">
                        <strong className="text-white">{b.medicineName}</strong>
                        <div className="text-[10px] text-slate-400">{b.genericName}</div>
                      </td>
                      <td className="p-3 font-mono font-bold text-orange-400">{b.batch_number}</td>
                      <td className="p-3">{b.expiry_date}</td>
                      <td className="p-3 font-semibold">
                        {isExp ? (
                          <span className="text-red-400">Expired ({Math.abs(b.diffDays || 0)}d ago)</span>
                        ) : (
                          <span className={isSoon ? 'text-orange-400' : isWarn ? 'text-amber-300' : 'text-slate-300'}>
                            {b.diffDays} days
                          </span>
                        )}
                      </td>
                      <td className="p-3 font-bold text-white">
                        {b.quantity} {b.unit}
                      </td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          isExp ? 'bg-red-500/20 text-red-400' : isSoon ? 'bg-orange-500/20 text-orange-400' : isWarn ? 'bg-amber-500/20 text-amber-300' : 'bg-emerald-500/20 text-emerald-300'
                        }`}>
                          {b.expiryStatus}
                        </span>
                      </td>
                      <td className="p-3 font-medium">
                        {isExp ? (
                          <span className="text-red-400">Quarantine & Safe Disposal</span>
                        ) : isSoon ? (
                          <span className="text-orange-400">Priority FEFO Dispensing (0–30d)</span>
                        ) : isWarn ? (
                          <span className="text-amber-300">Monitor closely (31–50d)</span>
                        ) : (
                          <span className="text-slate-400">Normal shelf storage</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: Stock Movement Ledger */}
      {activeReportTab === 'movements' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-lg p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div>
              <h3 className="font-bold text-base text-white">Stock Movement Audit Ledger</h3>
              <p className="text-[11px] text-slate-400">Full audit trail of additions, clinic dispensary issuances, and adjustments</p>
            </div>
            <span className="text-xs bg-slate-800 px-3 py-1 rounded-lg text-slate-300 border border-slate-700">
              {stockHistory.length} Recorded Movements
            </span>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-800">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-800/80 text-slate-300 uppercase tracking-wider text-[10px] border-b border-slate-800">
                <tr>
                  <th className="p-3">Timestamp</th>
                  <th className="p-3">Medicine & Batch</th>
                  <th className="p-3">Type</th>
                  <th className="p-3">Units</th>
                  <th className="p-3">Stock Delta</th>
                  <th className="p-3">Operational Reason</th>
                  <th className="p-3">Authorized By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-300">
                {stockHistory.map(h => (
                  <tr key={h.id} className="hover:bg-slate-800/40">
                    <td className="p-3 text-[11px] text-slate-400 whitespace-nowrap">
                      {new Date(h.timestamp).toLocaleString()}
                    </td>
                    <td className="p-3 font-semibold text-white">
                      {h.medicine_name} <span className="font-mono text-orange-400 text-[10px]">({h.batch_number})</span>
                    </td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        h.movement_type === 'Stock In' ? 'bg-emerald-500/20 text-emerald-400' : h.movement_type === 'Stock Out' ? 'bg-orange-500/20 text-orange-400' : 'bg-blue-500/20 text-blue-400'
                      }`}>
                        {h.movement_type}
                      </span>
                    </td>
                    <td className="p-3 font-bold text-white">
                      {h.movement_type === 'Stock Out' ? `-${h.quantity}` : `+${h.quantity}`}
                    </td>
                    <td className="p-3 font-mono text-[11px]">
                      {h.previous_quantity} → {h.new_quantity}
                    </td>
                    <td className="p-3 text-slate-300 italic">
                      "{h.reason}"
                    </td>
                    <td className="p-3 text-slate-400 whitespace-nowrap">
                      {h.staff_name}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: Seasonal Velocity Forecast & Stockout Analytics */}
      {activeReportTab === 'velocity' && (
        <SeasonalVelocityForecast medicines={medicines} />
      )}

      {/* Audit Trail Export Modal */}
      <AuditTrailExportModal
        isOpen={isAuditModalOpen}
        onClose={() => setIsAuditModalOpen(false)}
        stockHistory={stockHistory}
        medicines={medicines}
        alerts={[]}
        user={null}
        clinicName={clinicName}
      />
    </div>
  );
};
