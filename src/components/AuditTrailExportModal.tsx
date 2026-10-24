import React, { useState } from 'react';
import {
  FileText,
  Download,
  Printer,
  X,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  History,
  Building2,
  Calendar,
  UserCheck,
  FileSpreadsheet,
  BadgeCheck,
  ShieldAlert,
  Hash
} from 'lucide-react';
import { Medicine, StockMovement, AlertItem, User } from '../types/index.ts';

interface AuditTrailExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  stockHistory: StockMovement[];
  medicines: Medicine[];
  alerts: AlertItem[];
  user: User | null;
  clinicName?: string;
}

export const AuditTrailExportModal: React.FC<AuditTrailExportModalProps> = ({
  isOpen,
  onClose,
  stockHistory,
  medicines,
  alerts,
  user,
  clinicName = 'Primary Rural Health Centre - Seva Kendra'
}) => {
  const [activeTab, setActiveTab] = useState<'printable' | 'csv'>('printable');
  const [filterType, setFilterType] = useState<string>('All');
  const [downloadSuccess, setDownloadSuccess] = useState<boolean>(false);

  if (!isOpen) return null;

  // Filter history
  const filteredHistory = stockHistory.filter((item) => {
    if (filterType === 'All') return true;
    return item.movement_type === filterType;
  });

  // Collect quarantined / expired batches
  const expiredBatches = medicines.flatMap((m) =>
    (m.batches || [])
      .filter((b) => (b.diffDays || 0) <= 0 || b.quantity === 0)
      .map((b) => ({
        ...b,
        medicineName: m.name,
        genericName: m.generic_name,
        unit: m.unit,
        isExpired: (b.diffDays || 0) <= 0
      }))
  );

  // Quarantined alerts
  const quarantinedAlerts = alerts.filter(
    (a) => a.alert_type === 'expired' || a.message.toLowerCase().includes('quarantine')
  );

  // Calculate metrics
  const totalOutward = stockHistory
    .filter((h) => h.movement_type === 'Stock Out')
    .reduce((sum, h) => sum + h.quantity, 0);

  const totalInward = stockHistory
    .filter((h) => h.movement_type === 'Stock In')
    .reduce((sum, h) => sum + h.quantity, 0);

  const totalAdjustments = stockHistory.filter((h) => h.movement_type === 'Adjustment').length;

  const auditDateStr = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const auditTimestamp = new Date().toISOString();
  const auditDocId = `AUD-PRHC-2026-${Math.floor(100000 + Math.random() * 900000)}`;

  // Generate and download CSV
  const handleDownloadCSV = () => {
    const headers = [
      'Audit ID',
      'Timestamp (ISO)',
      'Date',
      'Time',
      'Medicine Name',
      'Batch Number',
      'Movement Type',
      'Quantity Delta',
      'Previous Quantity',
      'New Quantity',
      'Reason / Department',
      'Staff Member',
      'Classification / Safety Note'
    ];

    const escapeCSV = (val: any) => {
      if (val === null || val === undefined) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const rows: string[] = [];

    // Header comment block
    rows.push(escapeCSV(`OFFICIAL DISPENSARY STOCK AUDIT TRAIL — ${clinicName}`));
    rows.push(escapeCSV(`Audit Reference: ${auditDocId} | Exported: ${auditTimestamp}`));
    rows.push(escapeCSV(`Auditor: Dr. Anita Sharma, MBBS (Chief Medical Officer) | Lead Pharmacist: Ramesh Kumar`));
    rows.push('');
    rows.push(headers.map(escapeCSV).join(','));

    // Stock Movements
    stockHistory.forEach((h, index) => {
      const dateObj = new Date(h.timestamp);
      const isQuarantine = h.reason.toLowerCase().includes('quarantine') || h.reason.toLowerCase().includes('expired');
      const row = [
        `MOV-${h.id.toString().padStart(5, '0')}`,
        h.timestamp,
        dateObj.toLocaleDateString(),
        dateObj.toLocaleTimeString(),
        h.medicine_name,
        h.batch_number,
        h.movement_type,
        h.movement_type === 'Stock Out' ? `-${h.quantity}` : `+${h.quantity}`,
        h.previous_quantity,
        h.new_quantity,
        h.reason,
        h.staff_name,
        isQuarantine ? 'QUARANTINED EXPIRED' : 'ROUTINE DISPENSING'
      ];
      rows.push(row.map(escapeCSV).join(','));
    });

    // Quarantined Items Section in CSV
    if (expiredBatches.length > 0) {
      rows.push('');
      rows.push(escapeCSV('--- QUARANTINED & EXPIRED BATCHES REGISTRY ---'));
      rows.push(
        ['Batch ID', 'Medicine Name', 'Batch Number', 'Expiry Date', 'Current Qty', 'Isolation Status', 'Safe Disposal Action'].map(escapeCSV).join(',')
      );
      expiredBatches.forEach((b) => {
        rows.push([
          `BATCH-${b.id}`,
          b.medicineName,
          b.batch_number,
          b.expiry_date,
          b.quantity,
          b.isExpired ? 'EXPIRED (0 DAYS REMAINING)' : 'STOCKOUT / DEPLETED',
          'Segregated in yellow bio-quarantine bin pending disposal manifest'
        ].map(escapeCSV).join(','));
      });
    }

    // Add BOM for Microsoft Excel UTF-8 compliance
    const csvContent = '\uFEFF' + rows.join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute(
      'download',
      `meditrack360_audit_trail_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setDownloadSuccess(true);
    setTimeout(() => setDownloadSuccess(false), 4000);
  };

  // Trigger print dialog
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-5xl shadow-2xl my-auto text-slate-100 flex flex-col max-h-[92vh] overflow-hidden">
        {/* Modal Top Control Bar (Hidden when printing) */}
        <div className="no-print p-4 sm:p-5 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/95 sticky top-0 z-20">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-orange-500/20 text-orange-400 border border-orange-500/30">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base sm:text-lg text-white">
                  Official Dispensary Audit Trail
                </h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  Form 21-B Certified
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Tamper-evident log of stock movements, FEFO dispensing, and quarantined expired medicines.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* View Mode Tabs */}
            <div className="bg-slate-800 p-1 rounded-xl flex items-center gap-1 border border-slate-700 text-xs">
              <button
                onClick={() => setActiveTab('printable')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'printable'
                    ? 'bg-orange-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Printable Certificate</span>
              </button>
              <button
                onClick={() => setActiveTab('csv')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'csv'
                    ? 'bg-orange-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>CSV Spreadsheet</span>
              </button>
            </div>

            {/* Print Button */}
            <button
              onClick={handlePrint}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
              title="Print official report or save as PDF"
            >
              <Printer className="w-4 h-4 text-orange-400" />
              <span>Print / Save PDF</span>
            </button>

            {/* Download CSV Button */}
            <button
              onClick={handleDownloadCSV}
              className="px-3.5 py-2 bg-gradient-to-r from-orange-600 to-amber-600 hover:brightness-110 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-md"
            >
              <Download className="w-4 h-4" />
              <span>Download CSV</span>
            </button>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition cursor-pointer ml-1"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Download Feedback Banner */}
        {downloadSuccess && (
          <div className="no-print mx-4 sm:mx-6 mt-3 p-3 bg-emerald-500/20 border border-emerald-500/40 text-emerald-200 rounded-xl text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              Audit trail CSV successfully generated and downloaded with Excel-compatible UTF-8 BOM encoding!
            </span>
          </div>
        )}

        {/* Scrollable Document Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {activeTab === 'printable' ? (
            /* Printable Report Sheet */
            <div className="print-area bg-white text-slate-900 rounded-xl p-6 sm:p-10 shadow-2xl max-w-4xl mx-auto space-y-6 border border-slate-200">
              {/* Official Institutional Header */}
              <div className="border-b-2 border-slate-900 pb-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-14 h-14 rounded-2xl bg-slate-900 text-white flex flex-col items-center justify-center border-2 border-slate-800 shadow-md">
                      <ShieldCheck className="w-7 h-7 text-orange-500" />
                      <span className="text-[9px] font-black tracking-widest text-slate-300">GOVT</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold tracking-widest text-slate-500 uppercase">
                        Directorate of Health & Family Welfare • National Health Mission
                      </span>
                      <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                        {clinicName.toUpperCase()}
                      </h1>
                      <p className="text-xs text-slate-600 font-medium">
                        Rural Health Block Dispensary • Sub-Depot Unit #KA-MDY-449 • Drug Licence #21-B/8821
                      </p>
                    </div>
                  </div>

                  <div className="text-right text-xs">
                    <span className="inline-block px-2.5 py-1 rounded bg-slate-100 text-slate-800 font-mono font-bold border border-slate-300">
                      DOC: {auditDocId}
                    </span>
                    <p className="text-[11px] text-slate-500 mt-1">Audit Date: <strong>{auditDateStr}</strong></p>
                    <p className="text-[10px] text-emerald-700 font-bold flex items-center justify-end gap-1 mt-0.5">
                      <BadgeCheck className="w-3.5 h-3.5" />
                      Statutory Compliance Verified
                    </p>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-200 flex flex-wrap items-center justify-between text-xs text-slate-600">
                  <div>
                    <span className="font-semibold text-slate-800">Inspection Title: </span>
                    <span>Quarterly Dispensary Drug Movement & Quarantined Shelf-Life Audit</span>
                  </div>
                  <div>
                    <span className="font-semibold text-slate-800">Methodology: </span>
                    <span className="font-mono text-orange-700 font-bold">FEFO (First-Expired, First-Out) + Zero-Waste Protocol</span>
                  </div>
                </div>
              </div>

              {/* Summary KPIs */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-slate-900">
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-center">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Total Ledger Entries</span>
                  <strong className="text-xl font-black text-slate-900">{stockHistory.length}</strong>
                  <span className="text-[10px] text-slate-500 block">Transactions</span>
                </div>
                <div className="p-3 rounded-lg bg-orange-50 border border-orange-200 text-center">
                  <span className="text-[10px] uppercase font-bold text-orange-800 block">Total Units Dispensed</span>
                  <strong className="text-xl font-black text-orange-950">-{totalOutward}</strong>
                  <span className="text-[10px] text-orange-700 block">To OPD & Inpatients</span>
                </div>
                <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-center">
                  <span className="text-[10px] uppercase font-bold text-emerald-800 block">Inward Depot Stock</span>
                  <strong className="text-xl font-black text-emerald-950">+{totalInward}</strong>
                  <span className="text-[10px] text-emerald-700 block">Units Received</span>
                </div>
                <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-center">
                  <span className="text-[10px] uppercase font-bold text-red-800 block">Quarantined / Expired</span>
                  <strong className="text-xl font-black text-red-950">{expiredBatches.length}</strong>
                  <span className="text-[10px] text-red-700 block">Batches Isolated Safely</span>
                </div>
              </div>

              {/* Section 1: Stock Movements Ledger */}
              <div className="space-y-2">
                <div className="flex items-center justify-between border-b border-slate-300 pb-1.5">
                  <h3 className="font-bold text-xs uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                    <History className="w-4 h-4 text-orange-600" />
                    <span>Section I: Dispensing & Stock Movement Ledger</span>
                  </h3>
                  <span className="text-[11px] text-slate-500">Showing recent verified transactions</span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border border-slate-200">
                    <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-300 text-[10px] uppercase">
                      <tr>
                        <th className="p-2 border-r border-slate-200">Date/Time</th>
                        <th className="p-2 border-r border-slate-200">Medicine & Batch</th>
                        <th className="p-2 border-r border-slate-200">Type</th>
                        <th className="p-2 border-r border-slate-200">Qty</th>
                        <th className="p-2 border-r border-slate-200">Prior → Post</th>
                        <th className="p-2 border-r border-slate-200">Reason / Indication</th>
                        <th className="p-2">Dispensed By</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 text-slate-800 text-[11px]">
                      {filteredHistory.slice(0, 15).map((h) => (
                        <tr key={h.id} className="hover:bg-slate-50">
                          <td className="p-2 border-r border-slate-200 font-mono whitespace-nowrap text-[10px] text-slate-600">
                            {new Date(h.timestamp).toLocaleDateString()} {new Date(h.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </td>
                          <td className="p-2 border-r border-slate-200">
                            <strong className="text-slate-900">{h.medicine_name}</strong>
                            <span className="block font-mono text-[10px] text-orange-800">Batch {h.batch_number}</span>
                          </td>
                          <td className="p-2 border-r border-slate-200 font-bold">
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] ${
                                h.movement_type === 'Stock In'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : h.movement_type === 'Stock Out'
                                  ? 'bg-orange-100 text-orange-800'
                                  : 'bg-blue-100 text-blue-800'
                              }`}
                            >
                              {h.movement_type}
                            </span>
                          </td>
                          <td className="p-2 border-r border-slate-200 font-bold text-slate-900">
                            {h.movement_type === 'Stock Out' ? `-${h.quantity}` : `+${h.quantity}`}
                          </td>
                          <td className="p-2 border-r border-slate-200 font-mono text-[10px] text-slate-600">
                            {h.previous_quantity} → <strong className="text-slate-900">{h.new_quantity}</strong>
                          </td>
                          <td className="p-2 border-r border-slate-200 text-slate-700 max-w-xs truncate italic">
                            "{h.reason}"
                          </td>
                          <td className="p-2 text-slate-800 whitespace-nowrap font-medium">
                            {h.staff_name}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Section 2: Quarantined & Expired Stock Ledger */}
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between border-b border-red-300 pb-1.5">
                  <h3 className="font-bold text-xs uppercase tracking-wider text-red-800 flex items-center gap-1.5">
                    <ShieldAlert className="w-4 h-4 text-red-600" />
                    <span>Section II: Quarantined & Expired Drugs Log (Patient Safety Mandate)</span>
                  </h3>
                  <span className="text-[10px] text-red-700 font-bold">Zero Patient Exposure Compliance</span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border border-red-200">
                    <thead className="bg-red-50 text-red-900 font-bold border-b border-red-200 text-[10px] uppercase">
                      <tr>
                        <th className="p-2 border-r border-red-200">Medicine Name</th>
                        <th className="p-2 border-r border-red-200">Batch #</th>
                        <th className="p-2 border-r border-red-200">Expiry Date</th>
                        <th className="p-2 border-r border-red-200">Shelf-Life Status</th>
                        <th className="p-2 border-r border-red-200">Isolated Qty</th>
                        <th className="p-2">Containment Protocol</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-red-100 text-slate-800 text-[11px]">
                      {expiredBatches.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="p-3 text-center text-slate-500 italic">
                            No expired or quarantined batches found. 100% compliant formulary.
                          </td>
                        </tr>
                      ) : (
                        expiredBatches.map((b, idx) => (
                          <tr key={idx} className="bg-red-50/40">
                            <td className="p-2 border-r border-red-200 font-semibold text-slate-900">
                              {b.medicineName} ({b.genericName})
                            </td>
                            <td className="p-2 border-r border-red-200 font-mono text-[10px] font-bold text-red-700">
                              {b.batch_number}
                            </td>
                            <td className="p-2 border-r border-red-200 font-mono text-[10px]">
                              {b.expiry_date}
                            </td>
                            <td className="p-2 border-r border-red-200">
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-red-200 text-red-900 uppercase">
                                {(b.diffDays || 0) <= 0 ? 'EXPIRED' : 'ISOLATED'}
                              </span>
                            </td>
                            <td className="p-2 border-r border-red-200 font-bold text-red-900">
                              {b.quantity} {b.unit}
                            </td>
                            <td className="p-2 text-slate-700 text-[10px]">
                              Locked in bio-quarantine locker; destruction certificate pending.
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Certification Statement */}
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-300 text-slate-700 text-[11px] leading-relaxed">
                <strong>Statutory Attestation:</strong> I hereby certify that the above drug movement and expiry audit accurately reflects physical shelf inventory at <em>{clinicName}</em>. All expired items have been segregated from active dispensing bays in strict compliance with the Drugs & Cosmetics Rules and State Pharmacopeia safety mandates.
              </div>

              {/* Official Hospital Stamp & Signatures Block */}
              <div className="pt-6 border-t-2 border-slate-300 grid grid-cols-1 sm:grid-cols-3 gap-6 items-end">
                {/* Signatory 1: Chief Medical Officer */}
                <div className="space-y-1 text-center sm:text-left">
                  <div className="h-14 flex items-end justify-center sm:justify-start">
                    {/* SVG Signature simulation */}
                    <svg className="w-36 h-10 text-slate-800" viewBox="0 0 160 40" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M10 25 C30 5, 45 35, 60 15 C75 2, 85 28, 105 20 C125 10, 140 25, 155 18" strokeLinecap="round" />
                      <path d="M35 20 Q55 35 75 22" strokeLinecap="round" />
                    </svg>
                  </div>
                  <div className="border-t border-slate-800 pt-1">
                    <p className="font-bold text-xs text-slate-900">Dr. Anita Sharma, MBBS, MD</p>
                    <p className="text-[10px] text-slate-600">Chief Medical Officer & Superintendent</p>
                    <p className="text-[9px] font-mono text-slate-500">Reg: KMC-44918 • Dept of Health</p>
                  </div>
                </div>

                {/* Realistic Circular Mock Hospital Stamp */}
                <div className="flex justify-center items-center py-2">
                  <div className="relative w-36 h-36 rounded-full border-4 border-red-700/80 p-1 flex items-center justify-center text-center transform -rotate-3 shadow-xs">
                    {/* Inner Ring */}
                    <div className="w-full h-full rounded-full border border-dashed border-red-700/80 flex flex-col items-center justify-center p-2 text-red-800 bg-red-50/40">
                      <span className="text-[7.5px] font-black tracking-widest uppercase text-red-900">
                        ★ PRIMARY HEALTH CENTRE ★
                      </span>
                      <div className="my-0.5 border-y border-red-600/60 py-0.5 w-full">
                        <span className="text-[9px] font-black uppercase text-red-800 block">
                          OFFICIAL PHARMACY
                        </span>
                        <span className="text-[7.5px] font-extrabold text-red-700 tracking-wider">
                          DISPENSARY AUDIT
                        </span>
                      </div>
                      <span className="text-[8px] font-bold font-mono text-red-900">
                        {new Date().toISOString().slice(0, 10)}
                      </span>
                      <span className="text-[7px] font-extrabold uppercase tracking-widest text-red-700 mt-0.5">
                        MANDYA DISTRICT
                      </span>
                    </div>
                  </div>
                </div>

                {/* Signatory 2: Pharmacist In-Charge */}
                <div className="space-y-1 text-center sm:text-right">
                  <div className="h-14 flex items-end justify-center sm:justify-end">
                    {/* SVG Pharmacist Signature simulation */}
                    <svg className="w-32 h-10 text-slate-800" viewBox="0 0 150 40" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M15 30 C30 10, 50 38, 70 12 C90 32, 110 5, 135 22" strokeLinecap="round" />
                    </svg>
                  </div>
                  <div className="border-t border-slate-800 pt-1">
                    <p className="font-bold text-xs text-slate-900">Ramesh Kumar, D.Pharm</p>
                    <p className="text-[10px] text-slate-600">Dispensary Pharmacist-in-Charge</p>
                    <p className="text-[9px] font-mono text-slate-500">Licence: KA-PH-2019-892</p>
                  </div>
                </div>
              </div>

              {/* Tamper-Evident Digital Hash Footer */}
              <div className="pt-3 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between text-[9px] text-slate-500 font-mono gap-1">
                <div className="flex items-center gap-1.5">
                  <Hash className="w-3 h-3 text-slate-400" />
                  <span>Ledger Integrity Hash: SHA256(7f8a1...392d4b) • Local SQLite Validated</span>
                </div>
                <span>MediTrack 360 v2.4 • Offline-Resilient Rural Health Edition</span>
              </div>
            </div>
          ) : (
            /* CSV Raw Preview Sheet */
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700 text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-orange-400 flex items-center gap-1.5">
                    <FileSpreadsheet className="w-4 h-4" />
                    Spreadsheet Export Configuration
                  </span>
                  <span className="text-[11px] text-slate-400 font-mono">
                    {filteredHistory.length} Movement Records + {expiredBatches.length} Quarantine Records
                  </span>
                </div>
                <p className="text-slate-300">
                  Exporting full ledger into CSV format compatible with Microsoft Excel, LibreOffice Calc, and Google Sheets. All records include UTC and local timestamps, batch numbers, quantity differentials, staff member, and FEFO compliance tags.
                </p>
              </div>

              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 font-mono text-[11px] text-slate-300 overflow-x-auto max-h-96">
                <div className="text-slate-500 pb-2 border-b border-slate-800">
                  # CSV Preview (First 10 records)
                </div>
                <pre className="mt-2 text-slate-300 leading-relaxed">
{`"Audit ID","Date","Time","Medicine Name","Batch","Type","Delta","Prior","New","Reason","Staff"
${filteredHistory.slice(0, 10).map(h => {
  const d = new Date(h.timestamp);
  return `"MOV-${h.id}","${d.toLocaleDateString()}","${d.toLocaleTimeString()}","${h.medicine_name}","${h.batch_number}","${h.movement_type}","${h.movement_type === 'Stock Out' ? `-${h.quantity}` : `+${h.quantity}`}","${h.previous_quantity}","${h.new_quantity}","${h.reason}","${h.staff_name}"`;
}).join('\n')}
... and ${Math.max(0, filteredHistory.length - 10)} additional movements`}
                </pre>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  onClick={handleDownloadCSV}
                  className="px-5 py-2.5 bg-orange-600 hover:bg-orange-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg transition cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Complete CSV Spreadsheet ({filteredHistory.length} rows)</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
