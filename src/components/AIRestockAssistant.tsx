import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  Truck,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ShieldAlert,
  ArrowRight,
  Boxes,
  Layers,
  FileText,
  DollarSign,
  Calendar,
  Activity,
  CloudRain,
  Snowflake,
  Sun,
  RefreshCw,
  Plus,
  Minus,
  Check,
  Printer,
  ChevronDown,
  ChevronUp,
  Download,
  Building,
  Info,
  PackagePlus,
  Send,
  Zap,
  Sliders,
  WifiOff
} from 'lucide-react';
import { Medicine, RestockItem, RestockPlanResponse, User } from '../types/index.ts';
import { api } from '../services/api.ts';

// Deterministic ROP Formula Constants for Client-Side Local Resilience
const BASE_VELOCITIES: Record<string, number> = {
  paracetamol: 8.0,
  amoxicillin: 6.5,
  metformin: 1.5,
  diclofenac: 2.0,
  salbutamol: 1.0,
  cetirizine: 5.0,
  omeprazole: 2.2,
  azithromycin: 4.0
};

const STANDARD_PACK_SIZES: Record<string, number> = {
  paracetamol: 50,
  amoxicillin: 20,
  metformin: 50,
  diclofenac: 20,
  salbutamol: 5,
  cetirizine: 30,
  omeprazole: 20,
  azithromycin: 10
};

const UNIT_COST_ESTIMATES: Record<string, number> = {
  paracetamol: 0.12,
  amoxicillin: 0.45,
  metformin: 0.15,
  diclofenac: 0.28,
  salbutamol: 4.50,
  cetirizine: 0.18,
  omeprazole: 0.30,
  azithromycin: 1.10
};

const SEASON_FACTORS: Record<string, Record<string, number>> = {
  post_monsoon: {
    paracetamol: 1.65,
    amoxicillin: 1.45,
    cetirizine: 1.35,
    diclofenac: 1.25,
    salbutamol: 1.20,
    metformin: 1.05,
    omeprazole: 1.30,
    azithromycin: 1.40
  },
  winter: {
    salbutamol: 1.75,
    azithromycin: 1.50,
    amoxicillin: 1.35,
    cetirizine: 1.30,
    paracetamol: 1.25,
    metformin: 1.10,
    diclofenac: 1.15,
    omeprazole: 1.05
  },
  summer: {
    omeprazole: 1.60,
    amoxicillin: 1.30,
    paracetamol: 1.20,
    cetirizine: 1.35,
    diclofenac: 1.10,
    salbutamol: 1.05,
    metformin: 1.10,
    azithromycin: 1.15
  },
  baseline: {
    paracetamol: 1.0,
    amoxicillin: 1.0,
    metformin: 1.0,
    diclofenac: 1.0,
    salbutamol: 1.0,
    cetirizine: 1.0,
    omeprazole: 1.0,
    azithromycin: 1.0
  }
};

/**
 * Robust pure-mathematical ROP engine. Runs synchronously on client
 * so the Restock Assistant never crashes or shows empty states even if network fails.
 */
function computeLocalRestockPlan(
  medicines: Medicine[],
  leadTimeDays: number,
  supplierName: string,
  season: string
): RestockPlanResponse {
  const TODAY = new Date('2026-10-23T00:00:00Z');
  const seasonDict = SEASON_FACTORS[season] || SEASON_FACTORS.post_monsoon;

  const items: RestockItem[] = (medicines || []).map((m) => {
    let usableStock = 0;
    let expiredStock = 0;

    (m.batches || []).forEach((b) => {
      const exp = new Date(b.expiry_date + 'T00:00:00Z');
      const diffDays = Math.ceil((exp.getTime() - TODAY.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays <= 0) {
        expiredStock += b.quantity;
      } else {
        usableStock += b.quantity;
      }
    });

    const key = Object.keys(BASE_VELOCITIES).find(
      (k) => m.name.toLowerCase().includes(k) || m.generic_name.toLowerCase().includes(k)
    );

    const baseVelocity = key ? BASE_VELOCITIES[key] : Math.max(1, Math.round(m.minimum_stock / 8));
    const seasonalMultiplier = key && seasonDict[key] ? seasonDict[key] : 1.15;
    const effectiveVelocity = parseFloat((baseVelocity * seasonalMultiplier).toFixed(1));

    const leadTimeDemand = Math.round(effectiveVelocity * leadTimeDays);
    const minimumStock = m.minimum_stock || 10;
    const reorderPoint = leadTimeDemand + minimumStock;
    const daysOfSupply = effectiveVelocity > 0 ? parseFloat((usableStock / effectiveVelocity).toFixed(1)) : 999;

    let urgency: 'CRITICAL' | 'WARNING' | 'HEALTHY' | 'SURPLUS' = 'HEALTHY';
    if (usableStock === 0 || usableStock <= minimumStock || daysOfSupply <= leadTimeDays) {
      urgency = 'CRITICAL';
    } else if (usableStock <= reorderPoint) {
      urgency = 'WARNING';
    } else if (daysOfSupply > 60) {
      urgency = 'SURPLUS';
    }

    const packSize = key && STANDARD_PACK_SIZES[key] ? STANDARD_PACK_SIZES[key] : 10;
    const unitCostEst = key && UNIT_COST_ESTIMATES[key] ? UNIT_COST_ESTIMATES[key] : 0.40;

    let suggestedReorderQty = 0;
    if (usableStock <= reorderPoint) {
      const targetBuffer = Math.round(leadTimeDemand * 2 + minimumStock);
      const rawDeficit = Math.max(0, targetBuffer - usableStock);
      suggestedReorderQty = Math.ceil(rawDeficit / packSize) * packSize;
      if (suggestedReorderQty === 0 && usableStock <= minimumStock) {
        suggestedReorderQty = packSize;
      }
    }

    const orderQty = suggestedReorderQty;
    const totalCostEst = parseFloat((orderQty * unitCostEst).toFixed(2));

    return {
      medicineId: m.id,
      name: m.name,
      genericName: m.generic_name,
      category: m.category,
      unit: m.unit,
      currentUsableStock: usableStock,
      expiredStock,
      minimumStock,
      dailyVelocity: baseVelocity,
      seasonalMultiplier,
      effectiveVelocity,
      leadTimeDays,
      leadTimeDemand,
      reorderPoint,
      daysOfSupply,
      urgency,
      suggestedReorderQty,
      orderQty,
      packSize,
      unitCostEst,
      totalCostEst,
      selected: urgency === 'CRITICAL' || urgency === 'WARNING',
      clinicalRationale: `Current stock of ${usableStock} ${m.unit} provides ~${daysOfSupply} days of coverage at ${effectiveVelocity} ${m.unit}/day. With a ${leadTimeDays}-day delivery lead time, ROP is ${reorderPoint} ${m.unit}.`
    };
  });

  const criticalItems = items.filter((i) => i.urgency === 'CRITICAL');
  const warningItems = items.filter((i) => i.urgency === 'WARNING');
  const healthyItems = items.filter((i) => i.urgency === 'HEALTHY' || i.urgency === 'SURPLUS');

  const totalRequisitionCost = parseFloat(
    items.reduce((sum, item) => sum + (item.selected ? item.totalCostEst : 0), 0).toFixed(2)
  );

  const requisitionId = `IND-2026-${Math.floor(1000 + Math.random() * 9000)}`;

  const executiveSummary = `Procurement assessment for ${leadTimeDays}-day delivery horizon (${supplierName}). ${criticalItems.length} formulary line(s) have reached critical exhaustion risk below statutory safety stock. Suggested requisition value is $${totalRequisitionCost.toFixed(2)} to secure clinical buffer across expected seasonal consumption.`;

  const procurementDirectives = [
    `Expedite delivery for ${criticalItems.length > 0 ? criticalItems.map((c) => c.name).join(', ') : 'critical lines'} to prevent zero-inventory gap.`,
    'Enforce strict cold-chain verification upon arrival (2°C - 8°C for injectables / inhalers).',
    'Verify minimum 18-month remaining shelf-life on all incoming manufacturer batches.'
  ];

  return {
    leadTimeDays,
    supplierName,
    season,
    executiveSummary,
    totalRequisitionCost,
    criticalItemsCount: criticalItems.length,
    warningItemsCount: warningItems.length,
    healthyItemsCount: healthyItems.length,
    items,
    requisitionId,
    procurementDirectives,
    isAlgorithmicFallback: true
  };
}

interface AIRestockAssistantProps {
  medicines: Medicine[];
  user: User | null;
  clinicName: string;
  onRefreshData?: () => Promise<void>;
  onNavigateTab?: (tab: string) => void;
  preselectedMedicineId?: number | null;
}

export const AIRestockAssistant: React.FC<AIRestockAssistantProps> = ({
  medicines,
  user,
  clinicName,
  onRefreshData,
  onNavigateTab,
  preselectedMedicineId
}) => {
  // Config state
  const [leadTimeDays, setLeadTimeDays] = useState<number>(7);
  const [supplierPreset, setSupplierPreset] = useState<'express' | 'standard' | 'remote' | 'custom'>('standard');
  const [season, setSeason] = useState<string>('post_monsoon');
  const [supplierName, setSupplierName] = useState<string>('District Central Medical Depot - Mandya Division');

  // Immediately initialize plan so UI renders instantly with zero blank state
  const [plan, setPlan] = useState<RestockPlanResponse>(() =>
    computeLocalRestockPlan(medicines, 7, 'District Central Medical Depot - Mandya Division', 'post_monsoon')
  );
  const [loading, setLoading] = useState<boolean>(false);
  const [analyzingWithAI, setAnalyzingWithAI] = useState<boolean>(false);
  const [isOfflineFallback, setIsOfflineFallback] = useState<boolean>(false);
  const [actionErrorMsg, setActionErrorMsg] = useState<string | null>(null);
  const [expandedRationale, setExpandedRationale] = useState<number | null>(preselectedMedicineId || null);

  // Inflight AbortController ref
  const abortControllerRef = useRef<AbortController | null>(null);

  // Requisition Modal State
  const [showIndentModal, setShowIndentModal] = useState<boolean>(false);
  const [showHistoryModal, setShowHistoryModal] = useState<boolean>(false);
  const [pastIndents, setPastIndents] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [indentSuccessMsg, setIndentSuccessMsg] = useState<string | null>(null);
  const [autoReceiveOption, setAutoReceiveOption] = useState<boolean>(false);

  // Lead Time Presets
  const supplierOptions = [
    {
      id: 'express',
      name: 'Emergency Courier Depot',
      days: 3,
      desc: 'Rapid air/express transit for acute shortages',
      icon: Zap,
      color: 'text-amber-400 border-amber-500/30 bg-amber-500/10'
    },
    {
      id: 'standard',
      name: 'District Central Medical Depot',
      days: 7,
      desc: 'Routine bi-weekly bulk hospital delivery',
      icon: Truck,
      color: 'text-blue-400 border-blue-500/30 bg-blue-500/10'
    },
    {
      id: 'remote',
      name: 'State Regional Warehouse (Remote PHC)',
      days: 14,
      desc: 'Monthly replenishment for remote rural zones',
      icon: Building,
      color: 'text-purple-400 border-purple-500/30 bg-purple-500/10'
    }
  ];

  // Fetch Restock Analysis with AbortController and instant offline fallback
  const fetchAnalysis = async (lt: number, sPreset: string, sSeason: string, isManualRefresh = false) => {
    // Abort any prior in-flight request to avoid stale/out-of-order responses
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    if (isManualRefresh) {
      setAnalyzingWithAI(true);
    } else {
      setLoading(true);
    }

    const selectedSupplier =
      supplierOptions.find((o) => o.id === sPreset)?.name || supplierName;

    try {
      const res = await api.getRestockAnalysis(
        {
          leadTimeDays: lt,
          supplierName: selectedSupplier,
          season: sSeason,
          refreshAI: isManualRefresh
        },
        controller.signal
      );

      // If preselected medicine was passed from another view, make sure it's highlighted and expanded
      if (preselectedMedicineId && res.items) {
        setExpandedRationale(preselectedMedicineId);
      }

      setPlan(res);
      setIsOfflineFallback(false);
    } catch (err: any) {
      if (err.name === 'AbortError') {
        // Request was aborted due to slider scrub or parameter change, ignore quietly
        return;
      }
      console.warn('Restock analysis fetch unreachable, activating resilient client ROP engine:', err?.message || err);
      // Seamlessly compute restock plan using local deterministic ROP math
      const localFallback = computeLocalRestockPlan(medicines, lt, selectedSupplier, sSeason);
      setPlan(localFallback);
      setIsOfflineFallback(true);
    } finally {
      setLoading(false);
      setAnalyzingWithAI(false);
    }
  };

  // Debounce parameter updates so rapid slider drags don't spam network
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchAnalysis(leadTimeDays, supplierPreset, season, false);
    }, 200);

    return () => {
      clearTimeout(timer);
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [leadTimeDays, season, supplierPreset]);

  // Handle preset selection
  const handleSelectPreset = (presetId: 'express' | 'standard' | 'remote' | 'custom') => {
    setSupplierPreset(presetId);
    if (presetId === 'express') {
      setLeadTimeDays(3);
      setSupplierName('Emergency Courier Depot');
    } else if (presetId === 'standard') {
      setLeadTimeDays(7);
      setSupplierName('District Central Medical Depot - Mandya Division');
    } else if (presetId === 'remote') {
      setLeadTimeDays(14);
      setSupplierName('State Regional Warehouse (Remote PHC)');
    }
  };

  // Toggle item selection
  const handleToggleSelect = (medicineId: number) => {
    if (!plan) return;
    const updated = plan.items.map((it) =>
      it.medicineId === medicineId ? { ...it, selected: !it.selected } : it
    );
    setPlan({
      ...plan,
      items: updated,
      totalRequisitionCost: calculateTotalCost(updated)
    });
  };

  // Select all / none
  const handleToggleSelectAll = (select: boolean) => {
    if (!plan) return;
    const updated = plan.items.map((it) => ({
      ...it,
      selected: select ? it.suggestedReorderQty > 0 || it.urgency !== 'HEALTHY' : false
    }));
    setPlan({
      ...plan,
      items: updated,
      totalRequisitionCost: calculateTotalCost(updated)
    });
  };

  // Update order quantity
  const handleUpdateQty = (medicineId: number, delta: number) => {
    if (!plan) return;
    const updated = plan.items.map((it) => {
      if (it.medicineId === medicineId) {
        const newQty = Math.max(0, it.orderQty + delta * it.packSize);
        const newCost = parseFloat((newQty * it.unitCostEst).toFixed(2));
        return {
          ...it,
          orderQty: newQty,
          totalCostEst: newCost,
          selected: newQty > 0 ? true : it.selected
        };
      }
      return it;
    });

    setPlan({
      ...plan,
      items: updated,
      totalRequisitionCost: calculateTotalCost(updated)
    });
  };

  const calculateTotalCost = (items: RestockItem[]) => {
    return parseFloat(
      items
        .reduce((sum, it) => sum + (it.selected ? it.totalCostEst : 0), 0)
        .toFixed(2)
    );
  };

  // Submit and Dispatch Indent
  const handleDispatchIndent = async () => {
    setActionErrorMsg(null);
    if (!plan) return;
    const selectedItems = plan.items.filter((it) => it.selected && it.orderQty > 0);
    if (selectedItems.length === 0) {
      setActionErrorMsg('Please select at least one item with a valid order quantity.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await api.dispatchPurchaseIndent({
        requisitionId: plan.requisitionId,
        supplierName,
        leadTimeDays,
        season,
        items: selectedItems,
        staffName: user?.name || 'Dr. Anita Sharma',
        executiveSummary: plan.executiveSummary,
        autoReceive: autoReceiveOption
      });

      setIndentSuccessMsg(res.message);
      if (onRefreshData) {
        await onRefreshData();
      }
      // Re-run analysis after 1.5s
      setTimeout(() => {
        fetchAnalysis(leadTimeDays, supplierPreset, season);
      }, 1500);
    } catch (err: any) {
      setActionErrorMsg('Failed to dispatch purchase indent: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Load Past Indents History
  const handleOpenHistory = async () => {
    setShowHistoryModal(true);
    try {
      const data = await api.getPurchaseIndents();
      setPastIndents(data);
    } catch (e) {
      console.error('Error fetching indents:', e);
    }
  };

  // Selected items summary
  const selectedItems = plan?.items.filter((it) => it.selected && it.orderQty > 0) || [];
  const selectedTotalUnits = selectedItems.reduce((acc, it) => acc + it.orderQty, 0);

  return (
    <div className="space-y-6 pb-16">
      {/* Top Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950/60 to-slate-900 border border-indigo-500/30 p-5 rounded-2xl shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                <Sparkles className="w-5 h-5 animate-pulse text-indigo-300" />
              </span>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2">
                  AI Restock Assistant & Reorder Point (ROP) Engine
                </h1>
                <p className="text-xs text-indigo-200/80 mt-0.5">
                  Automated replenishment calculations based on lead-time demand ($d \times L$), safety buffer ($SS$), and epidemic consumption velocity.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => handleOpenHistory()}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 flex items-center gap-2 transition cursor-pointer"
            >
              <FileText className="w-4 h-4 text-slate-400" />
              <span>Requisition History</span>
            </button>
            <button
              onClick={() => fetchAnalysis(leadTimeDays, supplierPreset, season, true)}
              disabled={analyzingWithAI}
              className="px-3.5 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-indigo-600/30 flex items-center gap-2 transition cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${analyzingWithAI ? 'animate-spin' : ''}`} />
              <span>{analyzingWithAI ? 'Recalculating with Gemini...' : 'Recalculate ROP Plan'}</span>
            </button>
          </div>
        </div>

        {/* Formula Transparency Banner */}
        <div className="mt-4 pt-3 border-t border-indigo-500/20 flex flex-wrap items-center justify-between text-xs text-slate-300 gap-2">
          <div className="flex items-center gap-2 bg-indigo-950/40 px-3 py-1.5 rounded-lg border border-indigo-500/30 font-mono text-[11px]">
            <span className="text-indigo-400 font-bold">Standard ROP Formula:</span>
            <span>ROP = (Effective Daily Velocity × Lead Time Days) + Safety Stock</span>
          </div>
          <div className="flex items-center gap-4 text-[11px] text-slate-400">
            <span>Reference Date: <strong className="text-slate-200">Oct 23, 2026</strong></span>
            <span>Safety Stock ($SS$): <strong className="text-slate-200">Statutory Min Level</strong></span>
            <span>Gemini Model: <strong className="text-emerald-400">gemini-3.8-flash</strong></span>
          </div>
        </div>
      </div>

      {/* Local Resilient Mode Banner */}
      {isOfflineFallback && (
        <div className="bg-amber-950/40 border border-amber-500/40 px-4 py-2.5 rounded-xl flex items-center justify-between text-xs text-amber-200">
          <div className="flex items-center gap-2">
            <WifiOff className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              <strong>Local Deterministic Engine Active:</strong> Restock recommendations and ROP mathematical calculations computed from real-time local dispensary inventory.
            </span>
          </div>
          <button
            onClick={() => fetchAnalysis(leadTimeDays, supplierPreset, season, true)}
            className="px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-semibold rounded-lg border border-amber-500/40 transition text-[11px] cursor-pointer"
          >
            Retry Cloud Sync
          </button>
        </div>
      )}

      {/* Action Error Banner */}
      {actionErrorMsg && (
        <div className="bg-red-950/40 border border-red-500/40 px-4 py-2.5 rounded-xl flex items-center justify-between text-xs text-red-200">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{actionErrorMsg}</span>
          </div>
          <button
            onClick={() => setActionErrorMsg(null)}
            className="text-red-400 hover:text-white text-xs font-bold px-2 py-0.5 rounded cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Control Panel: Lead Time & Seasonal Context */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
        {/* Supplier & Lead Time Selector */}
        <div className="md:col-span-7 bg-slate-900 border border-slate-800 p-4 rounded-2xl space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5 uppercase tracking-wider">
              <Truck className="w-4 h-4 text-orange-400" />
              Supplier Depot & Delivery Lead Time
            </label>
            <span className="text-xs font-mono font-bold text-orange-400 bg-orange-500/10 border border-orange-500/30 px-2 py-0.5 rounded-full">
              {leadTimeDays} Days Lead Time
            </span>
          </div>

          {/* Preset Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {supplierOptions.map((opt) => {
              const Icon = opt.icon;
              const isSelected = supplierPreset === opt.id;
              return (
                <button
                  key={opt.id}
                  onClick={() => handleSelectPreset(opt.id as any)}
                  className={`p-3 rounded-xl border text-left transition flex flex-col justify-between cursor-pointer ${
                    isSelected
                      ? `${opt.color} ring-1 ring-orange-500/50 shadow-md`
                      : 'bg-slate-800/60 border-slate-700/60 text-slate-300 hover:border-slate-600'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <Icon className="w-4 h-4" />
                    <span className="text-[11px] font-bold px-1.5 py-0.2 rounded bg-black/40 font-mono">
                      {opt.days}d
                    </span>
                  </div>
                  <div>
                    <h4 className="text-xs font-bold leading-tight">{opt.name.split(' (')[0]}</h4>
                    <p className="text-[10px] text-slate-400 mt-1 line-clamp-1">{opt.desc}</p>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Custom Lead Time Slider */}
          <div className="pt-2 border-t border-slate-800 flex items-center gap-3">
            <Sliders className="w-4 h-4 text-slate-500 shrink-0" />
            <span className="text-[11px] text-slate-400 shrink-0">Custom Lead Time:</span>
            <input
              type="range"
              min="1"
              max="30"
              value={leadTimeDays}
              onChange={(e) => {
                setSupplierPreset('custom');
                setLeadTimeDays(parseInt(e.target.value, 10));
              }}
              className="flex-1 accent-orange-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
            />
            <span className="text-xs font-mono font-bold text-slate-200 w-10 text-right">
              {leadTimeDays}d
            </span>
          </div>
        </div>

        {/* Seasonal Epidemiological Context */}
        <div className="md:col-span-5 bg-slate-900 border border-slate-800 p-4 rounded-2xl space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5 uppercase tracking-wider">
              <Activity className="w-4 h-4 text-emerald-400" />
              Epidemiological Season Factor
            </label>
            <span className="text-[10px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-full font-semibold">
              Surge Velocity Multiplier
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setSeason('post_monsoon')}
              className={`p-2.5 rounded-xl border text-left transition flex items-center gap-2.5 cursor-pointer ${
                season === 'post_monsoon'
                  ? 'bg-blue-600/20 border-blue-500 text-blue-200 ring-1 ring-blue-500/40'
                  : 'bg-slate-800/60 border-slate-700/60 text-slate-400 hover:border-slate-600'
              }`}
            >
              <CloudRain className="w-4 h-4 text-blue-400 shrink-0" />
              <div>
                <p className="text-xs font-bold leading-tight">Autumn Fever Surge</p>
                <p className="text-[10px] text-slate-400">Dengue & Viral (+60%)</p>
              </div>
            </button>

            <button
              onClick={() => setSeason('winter')}
              className={`p-2.5 rounded-xl border text-left transition flex items-center gap-2.5 cursor-pointer ${
                season === 'winter'
                  ? 'bg-cyan-600/20 border-cyan-500 text-cyan-200 ring-1 ring-cyan-500/40'
                  : 'bg-slate-800/60 border-slate-700/60 text-slate-400 hover:border-slate-600'
              }`}
            >
              <Snowflake className="w-4 h-4 text-cyan-400 shrink-0" />
              <div>
                <p className="text-xs font-bold leading-tight">Winter Bronchial</p>
                <p className="text-[10px] text-slate-400">COPD & Asthma (+70%)</p>
              </div>
            </button>

            <button
              onClick={() => setSeason('summer')}
              className={`p-2.5 rounded-xl border text-left transition flex items-center gap-2.5 cursor-pointer ${
                season === 'summer'
                  ? 'bg-amber-600/20 border-amber-500 text-amber-200 ring-1 ring-amber-500/40'
                  : 'bg-slate-800/60 border-slate-700/60 text-slate-400 hover:border-slate-600'
              }`}
            >
              <Sun className="w-4 h-4 text-amber-400 shrink-0" />
              <div>
                <p className="text-xs font-bold leading-tight">Summer Enteric</p>
                <p className="text-[10px] text-slate-400">GI & Heat Stress (+50%)</p>
              </div>
            </button>

            <button
              onClick={() => setSeason('baseline')}
              className={`p-2.5 rounded-xl border text-left transition flex items-center gap-2.5 cursor-pointer ${
                season === 'baseline'
                  ? 'bg-slate-700/40 border-slate-500 text-slate-200 ring-1 ring-slate-400/40'
                  : 'bg-slate-800/60 border-slate-700/60 text-slate-400 hover:border-slate-600'
              }`}
            >
              <Activity className="w-4 h-4 text-slate-400 shrink-0" />
              <div>
                <p className="text-xs font-bold leading-tight">Standard Baseline</p>
                <p className="text-[10px] text-slate-400">Equilibrium Normal (1.0x)</p>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-slate-900 border border-red-500/30 p-4 rounded-2xl relative overflow-hidden">
          <div className="flex items-center justify-between text-xs text-red-400 font-semibold mb-1">
            <span>Critical Reorder Lines</span>
            <ShieldAlert className="w-4 h-4" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-white">
            {plan?.criticalItemsCount || 0}
          </div>
          <p className="text-[11px] text-red-400/80 mt-1">
            Stockout imminent within {leadTimeDays}d lead time
          </p>
        </div>

        <div className="bg-slate-900 border border-amber-500/30 p-4 rounded-2xl relative overflow-hidden">
          <div className="flex items-center justify-between text-xs text-amber-400 font-semibold mb-1">
            <span>Warning Lines (Near ROP)</span>
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-white">
            {plan?.warningItemsCount || 0}
          </div>
          <p className="text-[11px] text-amber-400/80 mt-1">
            Reorder recommended to maintain buffer
          </p>
        </div>

        <div className="bg-slate-900 border border-emerald-500/30 p-4 rounded-2xl relative overflow-hidden">
          <div className="flex items-center justify-between text-xs text-emerald-400 font-semibold mb-1">
            <span>Adequate Lines</span>
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-white">
            {plan?.healthyItemsCount || 0}
          </div>
          <p className="text-[11px] text-emerald-400/80 mt-1">
            Sufficient runway beyond lead time
          </p>
        </div>

        <div className="bg-slate-900 border border-indigo-500/30 p-4 rounded-2xl relative overflow-hidden">
          <div className="flex items-center justify-between text-xs text-indigo-400 font-semibold mb-1">
            <span>Suggested Indent Total</span>
            <DollarSign className="w-4 h-4" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-white">
            ${plan?.totalRequisitionCost.toFixed(2) || '0.00'}
          </div>
          <p className="text-[11px] text-indigo-300/80 mt-1">
            Estimated requisition procurement cost
          </p>
        </div>
      </div>

      {/* AI Executive Briefing Callout */}
      {plan && (
        <div className="bg-slate-900/90 border border-indigo-500/40 p-4 sm:p-5 rounded-2xl shadow-lg relative overflow-hidden">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-3 border-b border-indigo-500/20">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-indigo-400 animate-ping" />
              <h3 className="text-xs sm:text-sm font-bold text-indigo-300 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-indigo-400" />
                Gemini Procurement Intelligence Briefing
              </h3>
            </div>
            <div className="flex items-center gap-2 text-[11px]">
              <span className="text-slate-400">Requisition Reference:</span>
              <span className="font-mono font-bold text-slate-200 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                {plan.requisitionId}
              </span>
              {plan.isAlgorithmicFallback ? (
                <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700 text-[10px]">
                  Algorithmic Model
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold">
                  Gemini 3.8 Flash AI Verified
                </span>
              )}
            </div>
          </div>

          <p className="text-xs sm:text-sm text-slate-200 mt-3 leading-relaxed">
            {plan.executiveSummary}
          </p>

          {/* Supplier Directives */}
          {plan.procurementDirectives && plan.procurementDirectives.length > 0 && (
            <div className="mt-4 pt-3 border-t border-slate-800/80">
              <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                Logistics & Supply Directives:
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {plan.procurementDirectives.map((directive, idx) => (
                  <div
                    key={idx}
                    className="bg-slate-800/70 border border-slate-700/60 p-2.5 rounded-xl text-[11px] text-slate-300 flex items-start gap-2"
                  >
                    <span className="w-4 h-4 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                      {idx + 1}
                    </span>
                    <span>{directive}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Reorder Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="p-4 sm:p-5 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/60">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Boxes className="w-4 h-4 text-orange-400" />
              Optimal Replenishment Recommendations
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Formulary items evaluated against Reorder Point ($ROP = d \times L + SS$) and days of supply remaining.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleToggleSelectAll(true)}
              className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg border border-slate-700 transition cursor-pointer"
            >
              Select Recommended
            </button>
            <button
              onClick={() => handleToggleSelectAll(false)}
              className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 text-xs font-semibold rounded-lg border border-slate-700 transition cursor-pointer"
            >
              Clear All
            </button>
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-800/60 text-slate-400 font-semibold uppercase tracking-wider text-[11px] border-b border-slate-800">
              <tr>
                <th className="p-3 pl-4 w-10 text-center">Select</th>
                <th className="p-3">Medicine & Category</th>
                <th className="p-3">Usable Stock / SS</th>
                <th className="p-3">Daily Velocity (d)</th>
                <th className="p-3">Lead Demand (d × L)</th>
                <th className="p-3">Reorder Point (ROP)</th>
                <th className="p-3">Days of Supply</th>
                <th className="p-3">Suggested Order</th>
                <th className="p-3">Unit / Est. Cost</th>
                <th className="p-3 pr-4 text-right">Rationale</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {plan?.items.map((item) => {
                const isExpanded = expandedRationale === item.medicineId;
                const isSelected = item.selected;

                // Urgency badge styling
                let urgencyBadge = (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                    Healthy ({item.daysOfSupply}d)
                  </span>
                );

                if (item.urgency === 'CRITICAL') {
                  urgencyBadge = (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-500/10 text-red-400 border border-red-500/30 animate-pulse flex items-center gap-1 w-fit">
                      <ShieldAlert className="w-3 h-3" />
                      CRITICAL ({item.daysOfSupply}d)
                    </span>
                  );
                } else if (item.urgency === 'WARNING') {
                  urgencyBadge = (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30 flex items-center gap-1 w-fit">
                      <AlertTriangle className="w-3 h-3" />
                      REORDER ({item.daysOfSupply}d)
                    </span>
                  );
                } else if (item.urgency === 'SURPLUS') {
                  urgencyBadge = (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/30">
                      Surplus ({item.daysOfSupply}d)
                    </span>
                  );
                }

                // Ratio of usable stock to ROP (for visualization bar)
                const ropRatio = item.reorderPoint > 0 ? Math.min(1.5, item.currentUsableStock / item.reorderPoint) : 1;
                const barWidthPct = Math.round(Math.min(100, (ropRatio / 1.5) * 100));

                return (
                  <React.Fragment key={item.medicineId}>
                    <tr
                      className={`hover:bg-slate-800/40 transition ${
                        isSelected ? 'bg-indigo-950/20' : ''
                      } ${item.urgency === 'CRITICAL' ? 'border-l-4 border-l-red-500' : ''}`}
                    >
                      {/* Checkbox */}
                      <td className="p-3 pl-4 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelect(item.medicineId)}
                          className="w-4 h-4 rounded text-indigo-600 accent-indigo-500 bg-slate-800 border-slate-700 cursor-pointer"
                        />
                      </td>

                      {/* Name & Generic */}
                      <td className="p-3">
                        <div className="font-bold text-white text-xs sm:text-sm">{item.name}</div>
                        <div className="text-[11px] text-slate-400">{item.genericName}</div>
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 border border-slate-700/60 mt-1 inline-block">
                          {item.category}
                        </span>
                      </td>

                      {/* Usable Stock / Safety Stock */}
                      <td className="p-3">
                        <div className="font-mono font-bold text-white">
                          {item.currentUsableStock} <span className="text-slate-400 font-normal text-[11px]">{item.unit}</span>
                        </div>
                        <div className="text-[10px] text-slate-400">
                          SS: <strong className="text-slate-300">{item.minimumStock}</strong>
                          {item.expiredStock > 0 && (
                            <span className="text-red-400 ml-1">({item.expiredStock} exp)</span>
                          )}
                        </div>
                      </td>

                      {/* Velocity */}
                      <td className="p-3 font-mono">
                        <div className="text-slate-200 font-semibold">
                          {item.effectiveVelocity} <span className="text-[10px] text-slate-400">{item.unit}/d</span>
                        </div>
                        <div className="text-[10px] text-emerald-400">
                          {item.seasonalMultiplier > 1 ? `+${Math.round((item.seasonalMultiplier - 1) * 100)}% surge` : 'baseline'}
                        </div>
                      </td>

                      {/* Lead Time Demand */}
                      <td className="p-3 font-mono">
                        <div className="text-slate-200 font-semibold">
                          {item.leadTimeDemand} <span className="text-[10px] text-slate-400">{item.unit}</span>
                        </div>
                        <div className="text-[10px] text-slate-400">{item.leadTimeDays}d @ {item.effectiveVelocity}/d</div>
                      </td>

                      {/* Reorder Point (ROP) + Visual Indicator */}
                      <td className="p-3">
                        <div className="font-mono font-bold text-slate-100 flex items-center justify-between">
                          <span>{item.reorderPoint} {item.unit}</span>
                          <span className={`text-[10px] ${item.currentUsableStock <= item.reorderPoint ? 'text-red-400' : 'text-emerald-400'}`}>
                            {item.currentUsableStock <= item.reorderPoint ? 'BREACHED' : 'SAFE'}
                          </span>
                        </div>
                        {/* Progress Bar of Stock vs ROP */}
                        <div className="w-24 h-1.5 bg-slate-800 rounded-full mt-1 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              item.currentUsableStock <= item.minimumStock
                                ? 'bg-red-500'
                                : item.currentUsableStock <= item.reorderPoint
                                ? 'bg-amber-400'
                                : 'bg-emerald-500'
                            }`}
                            style={{ width: `${barWidthPct}%` }}
                          />
                        </div>
                      </td>

                      {/* Days of Supply & Urgency */}
                      <td className="p-3">
                        {urgencyBadge}
                      </td>

                      {/* Suggested Order & Stepper */}
                      <td className="p-3">
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleUpdateQty(item.medicineId, -1)}
                            disabled={item.orderQty <= 0}
                            className="w-6 h-6 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center border border-slate-700 disabled:opacity-30 cursor-pointer"
                          >
                            <Minus className="w-3 h-3" />
                          </button>

                          <div className="min-w-16 text-center font-mono font-bold text-sm text-white bg-slate-800/80 px-2 py-0.5 rounded border border-slate-700">
                            {item.orderQty}
                          </div>

                          <button
                            onClick={() => handleUpdateQty(item.medicineId, 1)}
                            className="w-6 h-6 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center border border-slate-700 cursor-pointer"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5 text-center">
                          Packs of {item.packSize} {item.unit}
                        </div>
                      </td>

                      {/* Cost */}
                      <td className="p-3 font-mono">
                        <div className="font-bold text-slate-200">
                          ${item.totalCostEst.toFixed(2)}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          ${item.unitCostEst.toFixed(2)}/unit
                        </div>
                      </td>

                      {/* Rationale Toggle */}
                      <td className="p-3 pr-4 text-right">
                        <button
                          onClick={() => setExpandedRationale(isExpanded ? null : item.medicineId)}
                          className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-semibold border border-slate-700/80 inline-flex items-center gap-1 transition cursor-pointer"
                        >
                          <Info className="w-3 h-3 text-indigo-400" />
                          <span>AI Rationale</span>
                          {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                        </button>
                      </td>
                    </tr>

                    {/* Expanded Clinical Rationale Row */}
                    {isExpanded && (
                      <tr className="bg-slate-950/60 border-b border-indigo-500/20">
                        <td colSpan={10} className="p-4 pl-12 pr-6">
                          <div className="bg-indigo-950/30 border border-indigo-500/30 rounded-xl p-3 text-xs">
                            <div className="flex items-center justify-between text-indigo-300 font-bold mb-1">
                              <span className="flex items-center gap-1.5">
                                <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                                Clinical Rationale & Stockout Risk Analysis for {item.name}:
                              </span>
                              <span className="text-[10px] font-mono text-slate-400">
                                ROP Formula: ({item.effectiveVelocity} × {item.leadTimeDays}) + {item.minimumStock} = {item.reorderPoint} {item.unit}
                              </span>
                            </div>
                            <p className="text-slate-200 leading-relaxed">
                              {item.clinicalRationale}
                            </p>
                            <div className="mt-2 flex items-center gap-3 text-[11px] text-slate-400 pt-2 border-t border-indigo-500/20">
                              <span>Statutory Minimum: <strong className="text-slate-200">{item.minimumStock} {item.unit}</strong></span>
                              <span>Lead-time coverage needed: <strong className="text-slate-200">{item.leadTimeDemand} {item.unit}</strong></span>
                              <span>Suggested Buffer Replenishment: <strong className="text-emerald-400">{item.suggestedReorderQty} {item.unit}</strong></span>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Floating Requisition Dispatch Bar */}
      <div className="sticky bottom-4 z-20 bg-slate-900/95 backdrop-blur-md border border-indigo-500/40 p-4 rounded-2xl shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center shrink-0">
            <PackagePlus className="w-5 h-5 text-indigo-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-300">
                Purchase Indent Requisition
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-mono font-bold">
                {selectedItems.length} lines selected
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Total Units: <strong className="text-white">{selectedTotalUnits}</strong> • Estimated Depot Value: <strong className="text-emerald-400 text-sm font-bold">${plan?.totalRequisitionCost.toFixed(2)}</strong>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button
            onClick={() => setShowIndentModal(true)}
            disabled={selectedItems.length === 0}
            className="w-full sm:w-auto px-5 py-2.5 bg-gradient-to-r from-orange-500 to-indigo-600 hover:from-orange-400 hover:to-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-orange-500/20 flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-40"
          >
            <Send className="w-4 h-4" />
            <span>Generate & Dispatch Indent Slip</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Requisition Review & Dispatch Modal */}
      {showIndentModal && plan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden my-8">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border-b border-slate-800 p-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-orange-500/20 text-orange-400 border border-orange-500/30">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white tracking-tight">
                    Official Purchase Indent & Supply Requisition
                  </h3>
                  <p className="text-xs text-slate-400">
                    Requisition ID: <span className="font-mono font-bold text-indigo-300">{plan.requisitionId}</span> • Mandya Rural District
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowIndentModal(false);
                  setIndentSuccessMsg(null);
                }}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
              {indentSuccessMsg ? (
                <div className="bg-emerald-500/10 border border-emerald-500/30 p-6 rounded-2xl text-center space-y-3">
                  <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" />
                  <h4 className="text-base font-bold text-white">Purchase Indent Dispatched Successfully!</h4>
                  <p className="text-xs text-slate-300 max-w-md mx-auto">{indentSuccessMsg}</p>
                  <div className="pt-2 flex justify-center gap-3">
                    <button
                      onClick={() => window.print()}
                      className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 flex items-center gap-2 cursor-pointer"
                    >
                      <Printer className="w-4 h-4" />
                      <span>Print Official Requisition</span>
                    </button>
                    <button
                      onClick={() => {
                        setShowIndentModal(false);
                        setIndentSuccessMsg(null);
                      }}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl cursor-pointer"
                    >
                      Done
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {/* Clinic and Depot Metadata Box */}
                  <div className="grid grid-cols-2 gap-4 p-4 rounded-xl bg-slate-800/60 border border-slate-700/60 text-xs">
                    <div>
                      <p className="text-slate-400">Requesting Health Facility:</p>
                      <p className="font-bold text-white mt-0.5">{clinicName}</p>
                      <p className="text-slate-400 mt-1">Authorized Medical Officer: <strong className="text-slate-200">{user?.name || 'Dr. Anita Sharma'}</strong></p>
                    </div>
                    <div>
                      <p className="text-slate-400">Target Supplier / Central Depot:</p>
                      <p className="font-bold text-indigo-300 mt-0.5">{supplierName}</p>
                      <p className="text-slate-400 mt-1">Agreed Delivery Lead Time: <strong className="text-orange-400">{leadTimeDays} Days</strong></p>
                    </div>
                  </div>

                  {/* Requisition Line Items Table */}
                  <div>
                    <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                      Selected Requisition Items ({selectedItems.length})
                    </h4>
                    <div className="border border-slate-800 rounded-xl overflow-hidden">
                      <table className="w-full text-left text-xs text-slate-300">
                        <thead className="bg-slate-800 text-slate-400 font-semibold text-[11px]">
                          <tr>
                            <th className="p-2.5 pl-3">Medicine Line</th>
                            <th className="p-2.5">Category</th>
                            <th className="p-2.5 text-center">Pack Size</th>
                            <th className="p-2.5 text-right">Order Qty</th>
                            <th className="p-2.5 text-right">Unit Price</th>
                            <th className="p-2.5 pr-3 text-right">Total Est.</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60">
                          {selectedItems.map((it) => (
                            <tr key={it.medicineId} className="hover:bg-slate-800/30">
                              <td className="p-2.5 pl-3">
                                <div className="font-bold text-white">{it.name}</div>
                                <div className="text-[10px] text-slate-400">{it.genericName}</div>
                              </td>
                              <td className="p-2.5 text-[11px] text-slate-400">{it.category}</td>
                              <td className="p-2.5 text-center font-mono text-[11px]">{it.packSize} {it.unit}</td>
                              <td className="p-2.5 text-right font-mono font-bold text-white">{it.orderQty} {it.unit}</td>
                              <td className="p-2.5 text-right font-mono text-slate-300">${it.unitCostEst.toFixed(2)}</td>
                              <td className="p-2.5 pr-3 text-right font-mono font-bold text-emerald-400">${it.totalCostEst.toFixed(2)}</td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot className="bg-slate-800/80 font-bold border-t border-slate-700">
                          <tr>
                            <td colSpan={3} className="p-2.5 pl-3 text-white">Grand Requisition Total:</td>
                            <td className="p-2.5 text-right font-mono text-white">{selectedTotalUnits} Units</td>
                            <td></td>
                            <td className="p-2.5 pr-3 text-right font-mono text-emerald-400 text-sm">
                              ${plan.totalRequisitionCost.toFixed(2)}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>

                  {/* Immediate Fulfillment Simulation Option */}
                  <div className="p-3.5 rounded-xl bg-indigo-950/30 border border-indigo-500/30 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <input
                        type="checkbox"
                        id="autoReceive"
                        checked={autoReceiveOption}
                        onChange={(e) => setAutoReceiveOption(e.target.checked)}
                        className="w-4 h-4 rounded text-indigo-600 accent-indigo-500 bg-slate-800 border-slate-700 cursor-pointer"
                      />
                      <label htmlFor="autoReceive" className="text-xs text-slate-200 cursor-pointer">
                        <strong className="text-indigo-300">Simulate Immediate Depot Delivery & Intake</strong> (Auto-generate FEFO batches with 2-year shelf life and log Stock In)
                      </label>
                    </div>
                    <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded font-mono font-semibold">
                      Demo Helper
                    </span>
                  </div>

                  {/* Statutory Signature Block */}
                  <div className="pt-2 border-t border-slate-800 grid grid-cols-2 gap-4 text-[11px] text-slate-400">
                    <div>
                      <p>Date of Requisition: <strong>October 23, 2026</strong></p>
                      <p>Regulatory Standard: <strong>WHO Rural Formulary & Drug Safety Guidelines</strong></p>
                    </div>
                    <div className="text-right">
                      <p className="font-mono text-slate-300 font-bold underline">Digitally Signed & Certified</p>
                      <p>{user?.name || 'Dr. Anita Sharma'}, Chief Medical Officer</p>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Modal Footer */}
            {!indentSuccessMsg && (
              <div className="bg-slate-900 border-t border-slate-800 p-4 flex items-center justify-between">
                <button
                  onClick={() => setShowIndentModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs rounded-xl border border-slate-700 cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  onClick={handleDispatchIndent}
                  disabled={isSubmitting || selectedItems.length === 0}
                  className="px-5 py-2.5 bg-gradient-to-r from-orange-500 to-indigo-600 hover:from-orange-400 hover:to-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg flex items-center gap-2 transition cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Transmitting Requisition to Depot...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Confirm & Transmit Indent #{plan.requisitionId}</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Indents History Modal */}
      {showHistoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden my-8">
            <div className="bg-slate-850 border-b border-slate-800 p-5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-400" />
                <h3 className="text-base font-bold text-white">Purchase Indent History & Dispatches</h3>
              </div>
              <button
                onClick={() => setShowHistoryModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
              {pastIndents.length === 0 ? (
                <div className="text-center py-10 text-slate-400">
                  <p className="text-sm font-semibold">No purchase indents dispatched yet.</p>
                  <p className="text-xs text-slate-500 mt-1">Use the Restock Assistant to dispatch your first supply indent.</p>
                </div>
              ) : (
                pastIndents.map((ind) => (
                  <div key={ind.id} className="bg-slate-800/60 border border-slate-700/60 p-4 rounded-xl space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-indigo-300 text-sm">{ind.id}</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          ind.status === 'RECEIVED'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                            : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                        }`}>
                          {ind.status}
                        </span>
                      </div>
                      <div className="text-xs font-mono font-bold text-emerald-400">
                        ${Number(ind.total_cost).toFixed(2)}
                      </div>
                    </div>

                    <div className="text-xs text-slate-300 flex items-center justify-between">
                      <span>Supplier: <strong className="text-white">{ind.supplier_name}</strong> ({ind.lead_time_days}d lead time)</span>
                      <span className="text-slate-400 text-[11px]">{new Date(ind.created_at).toLocaleString()}</span>
                    </div>

                    {ind.items && ind.items.length > 0 && (
                      <div className="pt-2 border-t border-slate-700/50 flex flex-wrap gap-1.5">
                        {ind.items.map((it: any, i: number) => (
                          <span key={i} className="text-[10px] bg-slate-800 px-2 py-0.5 rounded text-slate-300 border border-slate-700">
                            {it.name}: <strong>{it.orderQty || it.quantity} {it.unit || ''}</strong>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            <div className="bg-slate-900 border-t border-slate-800 p-4 flex justify-end">
              <button
                onClick={() => setShowHistoryModal(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
