import React, { useState, useMemo } from 'react';
import {
  Plus,
  Search,
  Filter,
  ArrowUpDown,
  MoreVertical,
  Edit,
  Trash2,
  Eye,
  AlertTriangle,
  Clock,
  XCircle,
  CheckCircle2,
  Boxes,
  Zap,
  ArrowLeftRight,
  ShieldAlert,
  Calendar,
  X,
  Scan
} from 'lucide-react';
import { Medicine, MedicineBatch, User } from '../types/index.ts';
import { BarcodeScannerModal, ParsedBarcodeData } from './BarcodeScannerModal.tsx';
import { MedicineVelocityCard } from './BurnRateMiniChart.tsx';

interface MedicinesViewProps {
  medicines: Medicine[];
  user: User | null;
  onAddMedicine: (payload: any) => Promise<void>;
  onAddBatch?: (medicineId: number, payload: any) => Promise<void>;
  onUpdateMedicine: (id: number, payload: any) => Promise<void>;
  onDeleteMedicine: (id: number) => Promise<void>;
  onOpenStockModal: (medicineId: number, batchId?: number) => void;
  selectedMedicineId?: number | null;
}

export const MedicinesView: React.FC<MedicinesViewProps> = ({
  medicines,
  user,
  onAddMedicine,
  onAddBatch,
  onUpdateMedicine,
  onDeleteMedicine,
  onOpenStockModal,
  selectedMedicineId
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('All');
  const [sortBy, setSortBy] = useState<'name' | 'expiry' | 'stock' | 'status'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isAddBatchModalOpen, setIsAddBatchModalOpen] = useState(false);
  const [addBatchTargetMed, setAddBatchTargetMed] = useState<Medicine | null>(null);
  const [viewingMedicine, setViewingMedicine] = useState<Medicine | null>(null);
  const [editingMedicine, setEditingMedicine] = useState<Medicine | null>(null);
  const [deletingMedicine, setDeletingMedicine] = useState<Medicine | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // New Batch Form State
  const [newBatchData, setNewBatchData] = useState({
    batch_number: '',
    expiry_date: '',
    quantity: 50,
    purchase_date: '2026-10-23'
  });

  // Handle Barcode Scan
  const handleScanComplete = (data: ParsedBarcodeData) => {
    if (addBatchTargetMed) {
      setNewBatchData((prev) => ({
        ...prev,
        batch_number: data.batchNumber || prev.batch_number,
        expiry_date: data.expiryDate || prev.expiry_date,
        quantity: data.quantity !== undefined ? data.quantity : prev.quantity
      }));
      setIsAddBatchModalOpen(true);
    } else {
      setFormData((prev) => ({
        ...prev,
        name: data.medicineName || prev.name,
        generic_name: data.genericName || prev.generic_name,
        category: data.category || prev.category,
        manufacturer: data.manufacturer || prev.manufacturer,
        supplier: data.supplier || prev.supplier,
        unit: data.unit || prev.unit,
        batch_number: data.batchNumber || prev.batch_number,
        expiry_date: data.expiryDate || prev.expiry_date,
        quantity: data.quantity !== undefined ? data.quantity : prev.quantity,
        notes: data.gtin ? `GTIN: ${data.gtin}` : prev.notes
      }));
      setIsAddModalOpen(true);
    }
  };

  // New Medicine Form State
  const [formData, setFormData] = useState({
    name: '',
    generic_name: '',
    category: 'Analgesics / Antipyretics',
    manufacturer: '',
    supplier: '',
    unit: 'Tablets',
    minimum_stock: 20,
    notes: '',
    batch_number: '',
    expiry_date: '',
    quantity: 50,
    purchase_date: '2026-10-23'
  });

  const categories = [
    'Analgesics / Antipyretics',
    'Antibiotics',
    'Antidiabetic',
    'Antihistamines',
    'Cardiovascular',
    'Gastrointestinal',
    'Rehydration',
    'Respiratory',
    'Emergency / Critical',
    'General'
  ];

  const units = ['Tablets', 'Capsules', 'Bottles / Syrup', 'Injections', 'Inhalers', 'Packets', 'Vials', 'Ointment'];

  // Auto-select if requested by header search
  React.useEffect(() => {
    if (selectedMedicineId) {
      const found = medicines.find(m => m.id === selectedMedicineId);
      if (found) setViewingMedicine(found);
    }
  }, [selectedMedicineId, medicines]);

  // Filtered and Sorted medicines
  const processedMedicines = useMemo(() => {
    return medicines
      .filter((m) => {
        // Search filter
        const query = searchQuery.toLowerCase();
        const matchesQuery =
          m.name.toLowerCase().includes(query) ||
          m.generic_name.toLowerCase().includes(query) ||
          m.category.toLowerCase().includes(query) ||
          (m.batches && m.batches.some(b => b.batch_number.toLowerCase().includes(query)));

        if (!matchesQuery) return false;

        // Status filter
        if (filterStatus === 'All') return true;
        if (filterStatus === 'Available') return (m.totalStock || 0) > 0;
        if (filterStatus === 'Low Stock') return m.stockStatus === 'Low Stock';
        if (filterStatus === 'Out of Stock') return m.stockStatus === 'Out of Stock';
        if (filterStatus === 'Expiring Soon') return m.worstExpiryStatus === 'Expiring Soon';
        if (filterStatus === 'Expired') return m.worstExpiryStatus === 'Expired';
        return true;
      })
      .sort((a, b) => {
        let compare = 0;
        if (sortBy === 'name') {
          compare = a.name.localeCompare(b.name);
        } else if (sortBy === 'expiry') {
          const aDays = a.earliestExpiryDays ?? 99999;
          const bDays = b.earliestExpiryDays ?? 99999;
          compare = aDays - bDays;
        } else if (sortBy === 'stock') {
          compare = (a.totalStock || 0) - (b.totalStock || 0);
        } else if (sortBy === 'status') {
          compare = (a.stockStatus || '').localeCompare(b.stockStatus || '');
        }
        return sortOrder === 'asc' ? compare : -compare;
      });
  }, [medicines, searchQuery, filterStatus, sortBy, sortOrder]);

  const handleSort = (field: 'name' | 'expiry' | 'stock' | 'status') => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMessage(null);

    try {
      if (!formData.name || !formData.generic_name || !formData.batch_number || !formData.expiry_date) {
        throw new Error('Please fill in all required fields.');
      }

      await onAddMedicine({
        ...formData,
        staff_name: user?.name || 'Clinic Pharmacist',
        user_id: user?.id || 1
      });

      setIsAddModalOpen(false);
      // Reset form
      setFormData({
        name: '',
        generic_name: '',
        category: 'Analgesics / Antipyretics',
        manufacturer: '',
        supplier: '',
        unit: 'Tablets',
        minimum_stock: 20,
        notes: '',
        batch_number: '',
        expiry_date: '',
        quantity: 50,
        purchase_date: '2026-10-23'
      });
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to add medicine');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddBatchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addBatchTargetMed) return;
    setSubmitting(true);
    setErrorMessage(null);

    try {
      if (!newBatchData.batch_number || !newBatchData.expiry_date) {
        throw new Error('Please enter both Batch Number and Expiry Date.');
      }

      if (onAddBatch) {
        await onAddBatch(addBatchTargetMed.id, {
          ...newBatchData,
          staff_name: user?.name || 'Clinic Pharmacist',
          user_id: user?.id || 1
        });
      }

      setIsAddBatchModalOpen(false);
      setAddBatchTargetMed(null);
      setNewBatchData({
        batch_number: '',
        expiry_date: '',
        quantity: 50,
        purchase_date: '2026-10-23'
      });
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to add batch');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMedicine) return;
    setSubmitting(true);
    setErrorMessage(null);

    try {
      await onUpdateMedicine(editingMedicine.id, {
        name: editingMedicine.name,
        generic_name: editingMedicine.generic_name,
        category: editingMedicine.category,
        manufacturer: editingMedicine.manufacturer,
        supplier: editingMedicine.supplier,
        unit: editingMedicine.unit,
        minimum_stock: editingMedicine.minimum_stock,
        notes: editingMedicine.notes
      });
      setEditingMedicine(null);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to update medicine');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingMedicine) return;
    try {
      await onDeleteMedicine(deletingMedicine.id);
      setDeletingMedicine(null);
    } catch (err: any) {
      alert('Failed to delete medicine: ' + err.message);
    }
  };

  const isAdmin = user?.role === 'admin';

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">Medicine Inventory</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Manage clinic medicines, multi-batch records, and FEFO dispensing prioritization.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isAdmin ? (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsScannerOpen(true)}
                className="px-3.5 py-2.5 bg-gradient-to-r from-orange-500/20 to-amber-500/20 hover:from-orange-500/30 hover:to-amber-500/30 text-orange-400 hover:text-white border border-orange-500/40 font-bold text-xs rounded-xl shadow-md flex items-center gap-2 transition cursor-pointer"
                title="Scan 2D DataMatrix on medicine box to auto-fill"
              >
                <Scan className="w-4 h-4 text-orange-400" />
                <span>Scan Batch</span>
              </button>
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="px-4 py-2.5 bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs rounded-xl shadow-md shadow-orange-600/30 flex items-center gap-2 transition cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Add Medicine & Batch</span>
              </button>
            </div>
          ) : (
            <div className="text-xs text-slate-400 bg-slate-800/80 px-3 py-2 rounded-xl border border-slate-700/60 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-slate-500" />
              <span>Staff Mode (View & Update Stock)</span>
            </div>
          )}
        </div>
      </div>

      {/* Search, Status Filters & Count Bar */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-md space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, generic formulation, category, batch #..."
              className="w-full pl-9 pr-4 py-2 bg-slate-800/90 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-400 focus:outline-hidden focus:border-orange-500 transition"
            />
          </div>

          {/* Quick Sort Options */}
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-400 text-[11px] hidden sm:inline">Sort by:</span>
            <button
              onClick={() => handleSort('name')}
              className={`px-2.5 py-1.5 rounded-lg border flex items-center gap-1 transition text-xs cursor-pointer ${
                sortBy === 'name' ? 'bg-orange-500/20 border-orange-500/50 text-orange-400 font-bold' : 'bg-slate-800 border-slate-700 text-slate-300'
              }`}
            >
              <span>Name</span>
              {sortBy === 'name' && <ArrowUpDown className="w-3 h-3" />}
            </button>

            <button
              onClick={() => handleSort('expiry')}
              className={`px-2.5 py-1.5 rounded-lg border flex items-center gap-1 transition text-xs cursor-pointer ${
                sortBy === 'expiry' ? 'bg-orange-500/20 border-orange-500/50 text-orange-400 font-bold' : 'bg-slate-800 border-slate-700 text-slate-300'
              }`}
            >
              <span>Expiry Date</span>
              {sortBy === 'expiry' && <ArrowUpDown className="w-3 h-3" />}
            </button>

            <button
              onClick={() => handleSort('stock')}
              className={`px-2.5 py-1.5 rounded-lg border flex items-center gap-1 transition text-xs cursor-pointer ${
                sortBy === 'stock' ? 'bg-orange-500/20 border-orange-500/50 text-orange-400 font-bold' : 'bg-slate-800 border-slate-700 text-slate-300'
              }`}
            >
              <span>Stock Level</span>
              {sortBy === 'stock' && <ArrowUpDown className="w-3 h-3" />}
            </button>
          </div>
        </div>

        {/* Status Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-800">
          <span className="text-[11px] font-semibold text-slate-400 mr-1 flex items-center gap-1">
            <Filter className="w-3 h-3" /> Filter:
          </span>
          {['All', 'Available', 'Low Stock', 'Expiring Soon', 'Expired', 'Out of Stock'].map((status) => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition cursor-pointer ${
                filterStatus === status
                  ? 'bg-orange-600 text-white font-bold shadow-xs'
                  : 'bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              {status}
            </button>
          ))}
          <span className="ml-auto text-[11px] text-slate-400">
            Showing {processedMedicines.length} of {medicines.length} medicines
          </span>
        </div>
      </div>

      {/* Main Medicine Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-800/80 text-slate-300 uppercase tracking-wider text-[10px] border-b border-slate-700/80">
              <tr>
                <th className="p-3.5">Medicine</th>
                <th className="p-3.5">Batches & FEFO</th>
                <th className="p-3.5">Earliest Expiry</th>
                <th className="p-3.5">Current Stock</th>
                <th className="p-3.5">Min. Stock</th>
                <th className="p-3.5">Inventory Status</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/90 text-slate-200">
              {processedMedicines.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400">
                    <Boxes className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                    <p className="font-semibold text-sm">No medicines found matching criteria.</p>
                    <p className="text-xs text-slate-500 mt-1">Try adjusting your filters or search keywords.</p>
                  </td>
                </tr>
              ) : (
                processedMedicines.map((m) => {
                  const isExp = m.worstExpiryStatus === 'Expired';
                  const isSoon = m.worstExpiryStatus === 'Expiring Soon';
                  const isWarn = m.worstExpiryStatus === 'Warning';
                  const isLow = m.stockStatus === 'Low Stock';
                  const isZero = m.stockStatus === 'Out of Stock';

                  return (
                    <tr key={m.id} className="hover:bg-slate-800/40 transition">
                      {/* Medicine Info */}
                      <td className="p-3.5">
                        <div className="font-bold text-white text-sm">{m.name}</div>
                        <div className="text-[11px] text-slate-400 mt-0.5">{m.generic_name}</div>
                        <span className="inline-block mt-1 px-1.5 py-0.5 rounded text-[10px] bg-slate-800 text-slate-400 border border-slate-700/60">
                          {m.category}
                        </span>
                      </td>

                      {/* Batches & FEFO Recommendation */}
                      <td className="p-3.5">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-bold text-slate-300">
                            {m.batches?.length || 0} batch{m.batches?.length === 1 ? '' : 'es'}
                          </span>
                        </div>
                        {m.fefoBatch && m.fefoBatch !== 'None' && (
                          <div className="mt-1 inline-flex items-center gap-1 px-2 py-0.5 rounded bg-orange-500/15 text-orange-400 border border-orange-500/30 text-[10px] font-bold">
                            <Zap className="w-3 h-3" />
                            <span>FEFO: {m.fefoBatch}</span>
                          </div>
                        )}
                      </td>

                      {/* Earliest Expiry */}
                      <td className="p-3.5">
                        {m.earliestExpiryDays !== null && m.earliestExpiryDays !== undefined ? (
                          <div>
                            <p className={`font-bold ${
                              isExp ? 'text-red-400' : isSoon ? 'text-orange-400' : isWarn ? 'text-amber-300' : 'text-slate-300'
                            }`}>
                              {isExp
                                ? `Expired (${Math.abs(m.earliestExpiryDays)}d ago)`
                                : `${m.earliestExpiryDays} days left`}
                            </p>
                            <p className="text-[10px] text-slate-400">
                              {m.batches?.[0]?.expiry_date || 'N/A'}
                            </p>
                          </div>
                        ) : (
                          <span className="text-slate-500 italic">No batches</span>
                        )}
                      </td>

                      {/* Current Stock */}
                      <td className="p-3.5">
                        <span className={`text-sm font-black ${
                          isZero ? 'text-red-400' : isLow ? 'text-amber-400' : 'text-white'
                        }`}>
                          {m.totalStock} {m.unit}
                        </span>
                      </td>

                      {/* Min Stock */}
                      <td className="p-3.5 text-slate-400 font-medium">
                        {m.minimum_stock} {m.unit}
                      </td>

                      {/* Status Badges */}
                      <td className="p-3.5">
                        <div className="flex flex-col gap-1 items-start">
                          {/* Stock status pill */}
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                              isZero
                                ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                                : isLow
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            }`}
                          >
                            {isZero ? <XCircle className="w-3 h-3" /> : isLow ? <AlertTriangle className="w-3 h-3" /> : <CheckCircle2 className="w-3 h-3" />}
                            <span>{m.stockStatus}</span>
                          </span>

                          {/* Expiry status pill if critical */}
                          {(isExp || isSoon || isWarn) && (
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                                isExp
                                  ? 'bg-red-950 text-red-300 border border-red-500/40'
                                  : isSoon
                                  ? 'bg-orange-950 text-orange-300 border border-orange-500/40'
                                  : 'bg-amber-950 text-amber-300 border border-amber-500/40'
                              }`}
                            >
                              <Clock className="w-3 h-3" />
                              <span>{isExp ? 'Expired' : isSoon ? 'Expiring Soon' : '31-50d Warn'}</span>
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="p-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setViewingMedicine(m)}
                            title="View batches & FEFO details"
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => {
                              setAddBatchTargetMed(m);
                              setIsAddBatchModalOpen(true);
                            }}
                            title="Add new batch via 2D Barcode scan"
                            className="p-1.5 rounded-lg bg-orange-500/10 hover:bg-orange-600 text-orange-400 hover:text-white transition border border-orange-500/30 cursor-pointer"
                          >
                            <Scan className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => onOpenStockModal(m.id, m.batches?.[0]?.id)}
                            title="Update stock (In / Out / Dispense)"
                            className="p-1.5 rounded-lg bg-orange-600/20 hover:bg-orange-600 text-orange-400 hover:text-white transition border border-orange-500/30 cursor-pointer"
                          >
                            <ArrowLeftRight className="w-4 h-4" />
                          </button>

                          {isAdmin && (
                            <>
                              <button
                                onClick={() => setEditingMedicine(m)}
                                title="Edit medicine profile"
                                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
                              >
                                <Edit className="w-4 h-4" />
                              </button>

                              <button
                                onClick={() => setDeletingMedicine(m)}
                                title="Delete medicine"
                                className="p-1.5 rounded-lg bg-slate-800 hover:bg-red-600 text-slate-400 hover:text-white transition cursor-pointer"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Medicine Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
          <div className="w-full max-w-2xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-6 text-slate-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-orange-500/20 text-orange-400 rounded-lg">
                  <Plus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-white">Add New Medicine & Initial Batch</h3>
                  <p className="text-[11px] text-slate-400">Registers medicine into dispensary database with FEFO tracking</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsScannerOpen(true)}
                  className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-orange-500/20 to-amber-500/20 hover:from-orange-500/30 hover:to-amber-500/30 border border-orange-500/40 text-orange-300 hover:text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Scan className="w-3.5 h-3.5 text-orange-400" />
                  <span>Scan Batch</span>
                </button>
                <button
                  onClick={() => setIsAddModalOpen(false)}
                  className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {errorMessage && (
              <div className="mt-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleAddSubmit} className="mt-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Medicine Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Paracetamol 650mg"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-hidden focus:border-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Generic Formulation *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Acetaminophen"
                    value={formData.generic_name}
                    onChange={(e) => setFormData({ ...formData, generic_name: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-hidden focus:border-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Therapeutic Category
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-hidden focus:border-orange-500"
                  >
                    {categories.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Dispensing Unit
                  </label>
                  <select
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-hidden focus:border-orange-500"
                  >
                    {units.map((u) => (
                      <option key={u} value={u}>{u}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Manufacturer
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Cipla Ltd / Sun Pharma"
                    value={formData.manufacturer}
                    onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-hidden focus:border-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Supplier / Depot
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Mandya District Medical Depot"
                    value={formData.supplier}
                    onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-hidden focus:border-orange-500"
                  />
                </div>
              </div>

              {/* Batch Information Box */}
              <div className="p-4 rounded-xl bg-slate-800/60 border border-orange-500/20 space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-orange-400">
                    <Zap className="w-4 h-4" />
                    <span>Initial Batch Details & Expiry</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsScannerOpen(true)}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold transition shadow-xs cursor-pointer"
                    title="Scan 2D DataMatrix on box"
                  >
                    <Scan className="w-3.5 h-3.5" />
                    <span>Scan Batch</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                      Batch Number *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. BTH-8891"
                      value={formData.batch_number}
                      onChange={(e) => setFormData({ ...formData, batch_number: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white font-mono focus:outline-hidden focus:border-orange-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                      Expiry Date *
                    </label>
                    <input
                      type="date"
                      required
                      value={formData.expiry_date}
                      onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-hidden focus:border-orange-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                      Initial Quantity *
                    </label>
                    <input
                      type="number"
                      min="1"
                      required
                      value={formData.quantity}
                      onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 0 })}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-hidden focus:border-orange-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                      Minimum Stock Threshold (Low-Stock Alert Trigger)
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={formData.minimum_stock}
                      onChange={(e) => setFormData({ ...formData, minimum_stock: parseInt(e.target.value) || 10 })}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-hidden focus:border-orange-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                      Purchase / Intake Date
                    </label>
                    <input
                      type="date"
                      value={formData.purchase_date}
                      onChange={(e) => setFormData({ ...formData, purchase_date: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-hidden focus:border-orange-500"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Optional Clinical Notes / Storage Instructions
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Store below 25°C in dry cabinet. High fever OPD priority."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-hidden focus:border-orange-500"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs shadow-md shadow-orange-600/30 transition cursor-pointer disabled:opacity-50"
                >
                  {submitting ? 'Registering...' : 'Add Medicine & Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Batches & FEFO Drawer/Modal */}
      {viewingMedicine && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
          <div className="w-full max-w-xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-6 text-slate-100 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <h3 className="font-bold text-base text-white">{viewingMedicine.name}</h3>
                <p className="text-xs text-slate-400">{viewingMedicine.generic_name} • {viewingMedicine.category}</p>
              </div>
              <button
                onClick={() => setViewingMedicine(null)}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Overall Stock Status */}
            <div className="mt-4 grid grid-cols-3 gap-3 p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/60 text-xs">
              <div>
                <p className="text-slate-400 text-[11px]">Total Stock</p>
                <p className="font-bold text-white text-base mt-0.5">{viewingMedicine.totalStock} {viewingMedicine.unit}</p>
              </div>
              <div>
                <p className="text-slate-400 text-[11px]">Min. Threshold</p>
                <p className="font-semibold text-slate-200 mt-0.5">{viewingMedicine.minimum_stock} {viewingMedicine.unit}</p>
              </div>
              <div>
                <p className="text-slate-400 text-[11px]">Manufacturer</p>
                <p className="font-semibold text-slate-200 truncate mt-0.5">{viewingMedicine.manufacturer || 'Generic'}</p>
              </div>
            </div>

            {/* FEFO Banner */}
            <div className="mt-4 p-3 rounded-xl bg-orange-500/10 border border-orange-500/30 text-xs text-orange-200 flex items-center gap-2.5">
              <Zap className="w-4 h-4 text-orange-400 shrink-0" />
              <span>
                <strong>FEFO Guidance:</strong> Dispense Batch <strong>{viewingMedicine.fefoBatch}</strong> first. Older batches are prioritized to eliminate inventory expiration.
              </span>
            </div>

            {/* AI Burn Rate & Velocity Forecast Mini-Chart */}
            <div className="mt-4">
              <MedicineVelocityCard
                medicine={viewingMedicine}
                onOpenStockModal={onOpenStockModal}
              />
            </div>

            {/* Batches Table */}
            <div className="mt-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Registered Batches ({viewingMedicine.batches?.length || 0})
                </h4>
                <button
                  type="button"
                  onClick={() => {
                    setAddBatchTargetMed(viewingMedicine);
                    setIsAddBatchModalOpen(true);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-orange-600 hover:bg-orange-500 text-white font-bold text-[11px] transition flex items-center gap-1 cursor-pointer shadow-xs"
                >
                  <Scan className="w-3.5 h-3.5" />
                  <span>Add Batch Barcode</span>
                </button>
              </div>
              <div className="space-y-2">
                {viewingMedicine.batches?.map((b) => {
                  const isExp = (b.diffDays || 0) <= 0;
                  const isSoon = (b.diffDays || 0) > 0 && (b.diffDays || 0) <= 30;
                  const isFefoPick = b.batch_number === viewingMedicine.fefoBatch;

                  return (
                    <div
                      key={b.id}
                      className={`p-3 rounded-xl border flex items-center justify-between gap-3 text-xs ${
                        isFefoPick
                          ? 'bg-orange-950/30 border-orange-500/40'
                          : 'bg-slate-800/50 border-slate-700/60'
                      }`}
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-white">Batch {b.batch_number}</span>
                          {isFefoPick && (
                            <span className="bg-orange-500 text-white text-[10px] font-bold px-1.5 py-0.2 rounded">
                              FEFO Pick
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Expires: {b.expiry_date} ({isExp ? 'Expired' : `${b.diffDays} days left`})
                        </p>
                      </div>

                      <div className="text-right">
                        <span className="font-bold text-sm text-white">
                          {b.quantity} {viewingMedicine.unit}
                        </span>
                        <div className="mt-1">
                          <button
                            onClick={() => {
                              setViewingMedicine(null);
                              onOpenStockModal(viewingMedicine.id, b.id);
                            }}
                            className="text-[11px] text-orange-400 hover:text-orange-300 font-semibold"
                          >
                            Update This Batch →
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setViewingMedicine(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Medicine Modal */}
      {editingMedicine && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-6 text-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-base text-white">Edit Medicine Details</h3>
              <button
                onClick={() => setEditingMedicine(null)}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="mt-4 space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Medicine Name</label>
                <input
                  type="text"
                  value={editingMedicine.name}
                  onChange={(e) => setEditingMedicine({ ...editingMedicine, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-hidden focus:border-orange-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Generic Name</label>
                <input
                  type="text"
                  value={editingMedicine.generic_name}
                  onChange={(e) => setEditingMedicine({ ...editingMedicine, generic_name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-hidden focus:border-orange-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Category</label>
                  <select
                    value={editingMedicine.category}
                    onChange={(e) => setEditingMedicine({ ...editingMedicine, category: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white"
                  >
                    {categories.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Minimum Stock Level</label>
                  <input
                    type="number"
                    value={editingMedicine.minimum_stock}
                    onChange={(e) => setEditingMedicine({ ...editingMedicine, minimum_stock: parseInt(e.target.value) || 10 })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Manufacturer</label>
                <input
                  type="text"
                  value={editingMedicine.manufacturer || ''}
                  onChange={(e) => setEditingMedicine({ ...editingMedicine, manufacturer: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Supplier</label>
                <input
                  type="text"
                  value={editingMedicine.supplier || ''}
                  onChange={(e) => setEditingMedicine({ ...editingMedicine, supplier: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingMedicine(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs"
                >
                  {submitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingMedicine && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm bg-slate-900 border border-red-500/30 rounded-2xl shadow-2xl p-6 text-slate-100">
            <div className="w-10 h-10 rounded-xl bg-red-500/20 text-red-400 flex items-center justify-center mb-3">
              <Trash2 className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-base text-white">Delete Medicine Record?</h3>
            <p className="text-xs text-slate-400 mt-2">
              Are you sure you want to delete <strong>{deletingMedicine.name}</strong> and all associated batches? This action will remove it from the dispensary database.
            </p>
            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                onClick={() => setDeletingMedicine(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold"
              >
                Delete Medicine
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add New Batch Modal (Scan Barcode Intake) */}
      {isAddBatchModalOpen && addBatchTargetMed && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-6 text-slate-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-orange-500/20 text-orange-400 rounded-lg">
                  <Scan className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-white">Add Batch Barcode</h3>
                  <p className="text-[11px] text-slate-400">
                    Intake new lot for <strong>{addBatchTargetMed.name}</strong>
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsAddBatchModalOpen(false);
                  setAddBatchTargetMed(null);
                }}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {errorMessage && (
              <div className="mt-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Quick Trigger Optical Webcam Scanner Button */}
            <div className="mt-4 p-3 rounded-xl bg-gradient-to-r from-orange-500/15 via-slate-800 to-amber-500/15 border border-orange-500/40 flex items-center justify-between gap-2">
              <div>
                <p className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Scan className="w-4 h-4 text-orange-400" />
                  <span>Optical Webcam / Mobile Scan</span>
                </p>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Point camera at GS1 2D DataMatrix on drug packaging
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsScannerOpen(true)}
                className="px-3 py-1.5 rounded-lg bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs shadow-md transition flex items-center gap-1 cursor-pointer shrink-0"
              >
                <Zap className="w-3.5 h-3.5" />
                <span>Scan Batch</span>
              </button>
            </div>

            <form onSubmit={handleAddBatchSubmit} className="mt-4 space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Batch / Lot Number *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. AMX2501"
                  value={newBatchData.batch_number}
                  onChange={(e) =>
                    setNewBatchData({ ...newBatchData, batch_number: e.target.value.toUpperCase() })
                  }
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white font-mono uppercase focus:outline-hidden focus:border-orange-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Expiry Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={newBatchData.expiry_date}
                    onChange={(e) =>
                      setNewBatchData({ ...newBatchData, expiry_date: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-hidden focus:border-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Quantity ({addBatchTargetMed.unit}) *
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={newBatchData.quantity}
                    onChange={(e) =>
                      setNewBatchData({
                        ...newBatchData,
                        quantity: parseInt(e.target.value) || 0
                      })
                    }
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-hidden focus:border-orange-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Intake Delivery Date
                </label>
                <input
                  type="date"
                  value={newBatchData.purchase_date}
                  onChange={(e) =>
                    setNewBatchData({ ...newBatchData, purchase_date: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-hidden focus:border-orange-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddBatchModalOpen(false);
                    setAddBatchTargetMed(null);
                  }}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs shadow-md transition cursor-pointer"
                >
                  {submitting ? 'Saving...' : 'Add Batch to Formulary'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Barcode Scanner Modal */}
      <BarcodeScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScanComplete={handleScanComplete}
        title={
          addBatchTargetMed
            ? `Scan Batch Barcode for ${addBatchTargetMed.name}`
            : 'Scan Batch 2D Barcode & Auto-Fill Intake'
        }
        initialMedicineName={addBatchTargetMed?.name}
      />
    </div>
  );
};
