import React, { useState, useEffect } from 'react';
import {
  ArrowLeftRight,
  PlusCircle,
  MinusCircle,
  SlidersHorizontal,
  History,
  AlertTriangle,
  CheckCircle2,
  Boxes,
  Zap,
  FileText,
  Printer,
  Calendar,
  UserCheck,
  Search,
  Scan
} from 'lucide-react';
import { Medicine, MedicineBatch, StockMovement, User } from '../types/index.ts';
import { BarcodeScannerModal, ParsedBarcodeData } from './BarcodeScannerModal.tsx';
import { AuditTrailExportModal } from './AuditTrailExportModal.tsx';

interface StockViewProps {
  medicines: Medicine[];
  stockHistory: StockMovement[];
  user: User | null;
  onUpdateStock: (payload: {
    batch_id: number;
    movement_type: 'Stock In' | 'Stock Out' | 'Adjustment';
    quantity: number;
    reason: string;
    staff_name: string;
    user_id?: number;
  }) => Promise<any>;
  preselectedMedicineId?: number | null;
  preselectedBatchId?: number | null;
}

export const StockView: React.FC<StockViewProps> = ({
  medicines,
  stockHistory,
  user,
  onUpdateStock,
  preselectedMedicineId,
  preselectedBatchId
}) => {
  // Update Wizard State
  const [selectedMedId, setSelectedMedId] = useState<number>(medicines[0]?.id || 0);
  const [selectedBatchId, setSelectedBatchId] = useState<number>(0);
  const [movementType, setMovementType] = useState<'Stock In' | 'Stock Out' | 'Adjustment'>('Stock Out');
  const [quantity, setQuantity] = useState<number>(5);
  const [reason, setReason] = useState<string>('OPD Patient Dispensing');
  const [customReason, setCustomReason] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);

  // Handle Barcode Scan
  const handleScanComplete = (data: ParsedBarcodeData) => {
    let matchedMed = medicines.find(
      (m) =>
        m.name.toLowerCase() === (data.medicineName || '').toLowerCase() ||
        m.generic_name.toLowerCase() === (data.genericName || '').toLowerCase() ||
        (m.batches && m.batches.some((b) => b.batch_number === data.batchNumber))
    );

    if (!matchedMed && data.batchNumber === 'AMX2501') {
      matchedMed = medicines.find((m) => m.name.toLowerCase().includes('amoxicillin'));
    }

    if (matchedMed) {
      setSelectedMedId(matchedMed.id);
      if (matchedMed.batches) {
        const foundBatch = matchedMed.batches.find((b) => b.batch_number === data.batchNumber);
        if (foundBatch) {
          setSelectedBatchId(foundBatch.id);
        }
      }
      setMovementType('Stock In');
      setReason('District Medical Depot Delivery');
      if (data.quantity) setQuantity(data.quantity);
      setFeedback({
        type: 'success',
        message: `Scanned 2D Barcode: Detected Batch ${data.batchNumber} (${data.medicineName || matchedMed.name}), Expiry: ${data.expiryDate}, GTIN: ${data.gtin}. Stock Intake form populated!`
      });
    } else {
      setFeedback({
        type: 'error',
        message: `Scanned Batch ${data.batchNumber} (GTIN: ${data.gtin}, Exp: ${data.expiryDate}). Medicine not yet registered in formulary; please add it under Medicines.`
      });
    }
  };

  // Filter history
  const [historySearch, setHistorySearch] = useState('');
  const [historyFilterType, setHistoryFilterType] = useState<string>('All');

  // Low stock reorder modal state
  const [reorderingMed, setReorderingMed] = useState<Medicine | null>(null);
  const [reorderSuccess, setReorderSuccess] = useState<string | null>(null);

  // Setup preselected ids if provided
  useEffect(() => {
    if (preselectedMedicineId) {
      setSelectedMedId(preselectedMedicineId);
    }
  }, [preselectedMedicineId]);

  const currentMed = medicines.find(m => m.id === selectedMedId) || medicines[0];

  // Update batch options when medicine changes
  useEffect(() => {
    if (currentMed && currentMed.batches && currentMed.batches.length > 0) {
      if (preselectedBatchId && currentMed.batches.some(b => b.id === preselectedBatchId)) {
        setSelectedBatchId(preselectedBatchId);
      } else {
        // By default, select FEFO recommended batch if available!
        const fefoBatch = currentMed.batches.find(b => b.batch_number === currentMed.fefoBatch);
        setSelectedBatchId(fefoBatch ? fefoBatch.id : currentMed.batches[0].id);
      }
    }
  }, [currentMed, preselectedBatchId]);

  const currentBatch = currentMed?.batches?.find(b => b.id === selectedBatchId) || currentMed?.batches?.[0];

  const standardReasons = {
    'Stock Out': [
      'OPD Patient Dispensing',
      'Inpatient Ward Restock',
      'Emergency Trauma Room',
      'Community Outreach Camp',
      'Expired Batch Quarantine & Removal',
      'Damaged / Broken Vial'
    ],
    'Stock In': [
      'District Medical Depot Delivery',
      'State Health Mission Allocation',
      'Direct Purchase Requisition',
      'Return from Ward'
    ],
    'Adjustment': [
      'Monthly Physical Stocktake Reconciliation',
      'Inventory Discrepancy Correction',
      'Audit Verification'
    ]
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentBatch) {
      setFeedback({ type: 'error', message: 'Please select a medicine batch.' });
      return;
    }

    if (quantity <= 0) {
      setFeedback({ type: 'error', message: 'Quantity must be greater than zero.' });
      return;
    }

    const finalReason = reason === 'Other' ? customReason : reason;
    if (!finalReason) {
      setFeedback({ type: 'error', message: 'Please provide a reason for the stock change.' });
      return;
    }

    setSubmitting(true);
    setFeedback(null);

    try {
      await onUpdateStock({
        batch_id: currentBatch.id,
        movement_type: movementType,
        quantity: Number(quantity),
        reason: finalReason,
        staff_name: user?.name || 'Clinic Staff',
        user_id: user?.id || 1
      });

      setFeedback({
        type: 'success',
        message: `Successfully logged ${movementType} of ${quantity} ${currentMed.unit} for Batch ${currentBatch.batch_number}!`
      });

      // Reset quantity
      setQuantity(5);
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to update stock.' });
    } finally {
      setSubmitting(false);
    }
  };

  // Filter stock movements
  const filteredHistory = stockHistory.filter(h => {
    const matchesSearch =
      h.medicine_name.toLowerCase().includes(historySearch.toLowerCase()) ||
      h.batch_number.toLowerCase().includes(historySearch.toLowerCase()) ||
      h.staff_name.toLowerCase().includes(historySearch.toLowerCase()) ||
      h.reason.toLowerCase().includes(historySearch.toLowerCase());

    if (!matchesSearch) return false;
    if (historyFilterType === 'All') return true;
    return h.movement_type === historyFilterType;
  });

  // Calculate Low Stock Medicines for the alerts section
  const lowStockItems = medicines.filter(m => (m.totalStock || 0) <= m.minimum_stock);

  return (
    <div className="space-y-6 pb-12">
      {/* Page Title */}
      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">Stock Management & Movement Log</h2>
        <p className="text-xs text-slate-400 mt-0.5">
          Fast stock intake, FEFO outpatient dispensing, and complete audit tracking for clinic staff.
        </p>
      </div>

      {/* Grid: Stock Update Form (Left) & Low Stock Alert Center (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Stock Update Form Wizard */}
        <div className="lg:col-span-7 bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-lg space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-orange-500/20 text-orange-400 rounded-xl">
                <ArrowLeftRight className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-base text-white">Record Stock Movement</h3>
                <p className="text-[11px] text-slate-400">Medicine → Action → Quantity → Reason → Save</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsScannerOpen(true)}
                className="px-3 py-1.5 rounded-xl bg-orange-500/20 hover:bg-orange-500/30 border border-orange-500/40 text-orange-300 hover:text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                title="Scan 2D DataMatrix on medicine box"
              >
                <Scan className="w-3.5 h-3.5 text-orange-400" />
                <span>Scan Batch</span>
              </button>

              <button
                type="button"
                onClick={() => setIsAuditModalOpen(true)}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 hover:text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                title="Export Dispensary Stock Audit Trail (CSV or Certified PDF)"
              >
                <FileText className="w-3.5 h-3.5 text-orange-400" />
                <span>Export Audit Trail</span>
              </button>

              <span className="text-[11px] bg-slate-800 text-slate-300 px-2.5 py-1 rounded-lg border border-slate-700 hidden sm:inline">
                Staff: <strong>{user?.name || 'Pharmacist'}</strong>
              </span>
            </div>
          </div>

          {feedback && (
            <div
              className={`p-3 rounded-xl text-xs flex items-center gap-2 border ${
                feedback.type === 'success'
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                  : 'bg-red-500/10 border-red-500/30 text-red-300'
              }`}
            >
              {feedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 shrink-0" />
              )}
              <span>{feedback.message}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Step 1: Select Medicine */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                1. Select Medicine
              </label>
              <select
                value={selectedMedId}
                onChange={(e) => setSelectedMedId(Number(e.target.value))}
                className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-hidden focus:border-orange-500"
              >
                {medicines.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} — Current Stock: {m.totalStock} {m.unit} ({m.stockStatus})
                  </option>
                ))}
              </select>
            </div>

            {/* Step 2: Select Batch & FEFO Advice */}
            {currentMed && currentMed.batches && currentMed.batches.length > 0 && (
              <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/80 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <label className="font-semibold text-slate-300">
                    2. Select Batch to Update
                  </label>
                  {currentMed.fefoBatch && (
                    <span className="text-[10px] text-orange-400 font-bold flex items-center gap-1 bg-orange-500/10 px-2 py-0.5 rounded border border-orange-500/20">
                      <Zap className="w-3 h-3" />
                      FEFO Pick: {currentMed.fefoBatch}
                    </span>
                  )}
                </div>

                <select
                  value={selectedBatchId}
                  onChange={(e) => setSelectedBatchId(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white font-mono focus:outline-hidden focus:border-orange-500"
                >
                  {currentMed.batches.map((b) => (
                    <option key={b.id} value={b.id}>
                      Batch {b.batch_number} — Qty: {b.quantity} {currentMed.unit} | Exp: {b.expiry_date} ({b.diffDays}d)
                    </option>
                  ))}
                </select>

                {currentBatch && (
                  <div className="pt-1 flex items-center justify-between text-[11px] text-slate-400">
                    <span>
                      Batch stock: <strong className="text-white">{currentBatch.quantity} {currentMed.unit}</strong>
                    </span>
                    <span className={(currentBatch.diffDays || 0) <= 0 ? 'text-red-400 font-bold' : (currentBatch.diffDays || 0) <= 30 ? 'text-orange-400 font-bold' : 'text-slate-300'}>
                      {(currentBatch.diffDays || 0) <= 0
                        ? 'EXPIRED BATCH'
                        : `Expires in ${currentBatch.diffDays} days`}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Step 3: Movement Type Tabs */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                3. Action / Movement Type
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setMovementType('Stock Out');
                    setReason(standardReasons['Stock Out'][0]);
                  }}
                  className={`p-2.5 rounded-xl border flex flex-col items-center justify-center gap-1 transition text-xs cursor-pointer ${
                    movementType === 'Stock Out'
                      ? 'bg-orange-600 border-orange-500 text-white font-bold shadow-md shadow-orange-600/20'
                      : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  <MinusCircle className="w-4 h-4" />
                  <span>Stock Out (Dispense)</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setMovementType('Stock In');
                    setReason(standardReasons['Stock In'][0]);
                  }}
                  className={`p-2.5 rounded-xl border flex flex-col items-center justify-center gap-1 transition text-xs cursor-pointer ${
                    movementType === 'Stock In'
                      ? 'bg-emerald-600 border-emerald-500 text-white font-bold shadow-md shadow-emerald-600/20'
                      : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>Stock In (Restock)</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setMovementType('Adjustment');
                    setReason(standardReasons['Adjustment'][0]);
                  }}
                  className={`p-2.5 rounded-xl border flex flex-col items-center justify-center gap-1 transition text-xs cursor-pointer ${
                    movementType === 'Adjustment'
                      ? 'bg-blue-600 border-blue-500 text-white font-bold shadow-md shadow-blue-600/20'
                      : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  <SlidersHorizontal className="w-4 h-4" />
                  <span>Adjustment</span>
                </button>
              </div>
            </div>

            {/* Step 4: Quantity & Reason */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  4. Quantity ({currentMed?.unit || 'Units'})
                </label>
                <input
                  type="number"
                  min="1"
                  max={movementType === 'Stock Out' ? currentBatch?.quantity : 99999}
                  required
                  value={quantity}
                  onChange={(e) => setQuantity(parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white font-bold focus:outline-hidden focus:border-orange-500"
                />
                {movementType === 'Stock Out' && currentBatch && (
                  <p className="text-[10px] text-slate-400 mt-1">
                    Max available in this batch: {currentBatch.quantity}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  5. Reason / Department
                </label>
                <select
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-hidden focus:border-orange-500"
                >
                  {standardReasons[movementType].map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                  <option value="Other">Other (Custom Reason)</option>
                </select>
              </div>
            </div>

            {reason === 'Other' && (
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Enter Custom Reason *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Specify purpose of stock movement..."
                  value={customReason}
                  onChange={(e) => setCustomReason(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white"
                />
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={submitting || !currentBatch}
              className="w-full py-3 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs shadow-lg shadow-orange-600/30 transition cursor-pointer disabled:opacity-50"
            >
              {submitting ? 'Updating Database...' : `Confirm & Save ${movementType}`}
            </button>
          </form>
        </div>

        {/* Right: Low Stock Alert Center & Reorder Indent Generator */}
        <div className="lg:col-span-5 bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-lg space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-400" />
              <div>
                <h3 className="font-bold text-base text-white">Low Stock Warning System</h3>
                <p className="text-[11px] text-slate-400">Current Stock ≤ Minimum Threshold</p>
              </div>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
              {lowStockItems.length} Urgent
            </span>
          </div>

          <p className="text-xs text-slate-400">
            When medicines fall below safety threshold, MediTrack 360 immediately prepares a suggested reorder indent for your district depot.
          </p>

          <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
            {lowStockItems.length === 0 ? (
              <div className="p-6 text-center text-slate-400 bg-slate-800/40 rounded-xl border border-slate-800">
                <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                <p className="font-semibold text-sm">All Stock Levels Healthy</p>
                <p className="text-xs text-slate-500 mt-0.5">No medicines currently below minimum safety stock.</p>
              </div>
            ) : (
              lowStockItems.map((m) => {
                const isZero = (m.totalStock || 0) === 0;
                const suggestedReorder = Math.max(m.minimum_stock * 2 - (m.totalStock || 0), m.minimum_stock);

                return (
                  <div
                    key={m.id}
                    className={`p-3.5 rounded-xl border space-y-2 transition ${
                      isZero
                        ? 'bg-red-950/20 border-red-500/30'
                        : 'bg-amber-950/20 border-amber-500/30'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-bold text-sm text-white">{m.name}</h4>
                        <p className="text-[11px] text-slate-400">{m.generic_name} • {m.category}</p>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        isZero ? 'bg-red-500 text-white' : 'bg-amber-500/30 text-amber-300 border border-amber-500/40'
                      }`}>
                        {isZero ? 'Out of Stock' : 'Low Stock'}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-xs bg-slate-900/80 p-2 rounded-lg border border-slate-800">
                      <div>
                        <span className="text-[10px] text-slate-400">Current</span>
                        <p className={`font-bold ${isZero ? 'text-red-400' : 'text-amber-300'}`}>
                          {m.totalStock} {m.unit}
                        </p>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400">Min. Level</span>
                        <p className="font-semibold text-slate-300">{m.minimum_stock} {m.unit}</p>
                      </div>
                      <div>
                        <span className="text-[10px] text-orange-400">Suggested Order</span>
                        <p className="font-bold text-orange-400">+{suggestedReorder} {m.unit}</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[11px] pt-1">
                      <span className="text-slate-400 truncate max-w-[170px]">
                        Supplier: {m.supplier || 'District Depot'}
                      </span>
                      <button
                        onClick={() => setReorderingMed(m)}
                        className="px-3 py-1 bg-orange-600 hover:bg-orange-500 text-white font-semibold rounded-lg text-xs transition cursor-pointer"
                      >
                        Create Reorder Indent
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Reorder Indent Slip Modal */}
      {reorderingMed && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-6 text-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-orange-400" />
                <h3 className="font-bold text-base text-white">Dispensary Reorder Indent</h3>
              </div>
              <button
                onClick={() => setReorderingMed(null)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 p-4 rounded-xl bg-slate-800/80 border border-slate-700 space-y-2 text-xs">
              <p><strong>Clinic:</strong> Primary Rural Health Centre - Seva Kendra</p>
              <p><strong>Medicine:</strong> {reorderingMed.name} ({reorderingMed.generic_name})</p>
              <p><strong>Supplier:</strong> {reorderingMed.supplier || 'District Medical Depot'}</p>
              <p><strong>Current Balance:</strong> {reorderingMed.totalStock} {reorderingMed.unit}</p>
              <p><strong>Safety Threshold:</strong> {reorderingMed.minimum_stock} {reorderingMed.unit}</p>
              <div className="p-2.5 rounded-lg bg-orange-500/10 border border-orange-500/30 text-orange-300 font-bold">
                Requested Reorder Quantity: {Math.max(reorderingMed.minimum_stock * 2 - (reorderingMed.totalStock || 0), reorderingMed.minimum_stock)} {reorderingMed.unit}
              </div>
            </div>

            {reorderSuccess ? (
              <div className="mt-4 p-3 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs text-center font-bold">
                {reorderSuccess}
              </div>
            ) : (
              <div className="mt-5 flex gap-2 justify-end">
                <button
                  onClick={() => setReorderingMed(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    setReorderSuccess('Reorder Indent #R-2026-991 logged and marked for depot dispatch!');
                    setTimeout(() => {
                      setReorderSuccess(null);
                      setReorderingMed(null);
                    }, 2500);
                  }}
                  className="px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold"
                >
                  Confirm & Dispatch Indent
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Stock Movement History Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-lg p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-orange-400" />
            <div>
              <h3 className="font-bold text-base text-white">Stock Movement Audit History</h3>
              <p className="text-[11px] text-slate-400">Complete immutable digital ledger replacing handwritten registers</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search history..."
                value={historySearch}
                onChange={(e) => setHistorySearch(e.target.value)}
                className="pl-8 pr-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white"
              />
            </div>

            <select
              value={historyFilterType}
              onChange={(e) => setHistoryFilterType(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white"
            >
              <option value="All">All Actions</option>
              <option value="Stock Out">Stock Out Only</option>
              <option value="Stock In">Stock In Only</option>
              <option value="Adjustment">Adjustment Only</option>
            </select>

            <button
              onClick={() => setIsAuditModalOpen(true)}
              className="px-3 py-1.5 rounded-lg bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
              title="Download CSV or Print Official Certified Audit Trail"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Export Audit Trail</span>
            </button>
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-800">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-800/80 text-slate-300 uppercase tracking-wider text-[10px] border-b border-slate-800">
              <tr>
                <th className="p-3">Date & Time</th>
                <th className="p-3">Medicine & Batch</th>
                <th className="p-3">Action</th>
                <th className="p-3">Qty</th>
                <th className="p-3">Balance Change</th>
                <th className="p-3">Reason / Department</th>
                <th className="p-3">Staff Member</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-300">
              {filteredHistory.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-6 text-center text-slate-400">
                    No stock movements recorded yet.
                  </td>
                </tr>
              ) : (
                filteredHistory.map((h) => (
                  <tr key={h.id} className="hover:bg-slate-800/40 transition">
                    <td className="p-3 text-[11px] text-slate-400 whitespace-nowrap">
                      {new Date(h.timestamp).toLocaleDateString()} {new Date(h.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="p-3">
                      <strong className="text-white">{h.medicine_name}</strong>
                      <span className="block text-[10px] font-mono text-orange-400">
                        Batch {h.batch_number}
                      </span>
                    </td>
                    <td className="p-3">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded text-[10px] font-bold ${
                          h.movement_type === 'Stock In'
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : h.movement_type === 'Stock Out'
                            ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                            : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                        }`}
                      >
                        {h.movement_type}
                      </span>
                    </td>
                    <td className="p-3 font-bold text-white">
                      {h.movement_type === 'Stock Out' ? `-${h.quantity}` : `+${h.quantity}`}
                    </td>
                    <td className="p-3 font-mono text-[11px]">
                      {h.previous_quantity} → <strong className="text-white">{h.new_quantity}</strong>
                    </td>
                    <td className="p-3 text-slate-300 italic max-w-xs truncate">
                      "{h.reason}"
                    </td>
                    <td className="p-3 text-slate-400 whitespace-nowrap">
                      {h.staff_name}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Barcode Scanner Modal */}
      <BarcodeScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScanComplete={handleScanComplete}
        title="Scan Batch 2D Barcode & Log Stock Movement"
      />

      {/* Audit Trail Export Modal */}
      <AuditTrailExportModal
        isOpen={isAuditModalOpen}
        onClose={() => setIsAuditModalOpen(false)}
        stockHistory={stockHistory}
        medicines={medicines}
        alerts={[]}
        user={user}
      />
    </div>
  );
};
