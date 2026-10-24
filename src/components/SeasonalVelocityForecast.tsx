import React, { useState } from 'react';
import {
  TrendingDown,
  AlertTriangle,
  Clock,
  Sparkles,
  ArrowRight,
  ShieldAlert,
  Zap,
  Info,
  Calendar,
  Layers,
  CheckCircle2,
  CloudRain,
  Snowflake,
  Sun,
  Activity,
  FileText,
  Boxes,
  Compass
} from 'lucide-react';
import { Medicine, StockMovement } from '../types/index.ts';

export type EpidemiologicalSeason = 'post_monsoon' | 'winter' | 'summer' | 'baseline';

export interface SeasonalForecastProfile {
  medicineId: number;
  medicineName: string;
  genericName: string;
  category: string;
  unit: string;
  currentStock: number;
  minimumStock: number;
  baseDailyVelocity: number;
  seasonalMultiplier: number;
  seasonalDailyVelocity: number;
  daysToThreshold: number; // Days until currentStock <= minimumStock
  daysToZeroStock: number; // Days until currentStock === 0
  projectedBreachDate: string;
  projectedStockoutDate: string;
  recommendedOrderBuffer: number;
  riskLevel: 'CRITICAL_SHORTAGE' | 'APPROACHING_THRESHOLD' | 'HEALTHY_BUFFER' | 'STOCKED_OUT';
  seasonalInsight: string;
  depletionCurve: number[]; // 14-day projected stock levels
}

interface SeasonalVelocityForecastProps {
  medicines: Medicine[];
  onOpenStockModal?: (medicineId: number, batchId?: number) => void;
  onGenerateIndent?: (medicine: Medicine, suggestedQty: number) => void;
}

export const SeasonalVelocityForecast: React.FC<SeasonalVelocityForecastProps> = ({
  medicines,
  onOpenStockModal,
  onGenerateIndent
}) => {
  const [selectedSeason, setSelectedSeason] = useState<EpidemiologicalSeason>('post_monsoon');
  const [selectedMedId, setSelectedMedId] = useState<number>(medicines[0]?.id || 1);
  const [indentModalMed, setIndentModalMed] = useState<{
    med: Medicine;
    suggestedQty: number;
    reason: string;
  } | null>(null);
  const [indentSuccess, setIndentSuccess] = useState<string | null>(null);

  // Define Seasonal Multipliers & Clinical Epidemiological Factors
  const seasonProfiles: Record<
    EpidemiologicalSeason,
    {
      title: string;
      tag: string;
      icon: any;
      color: string;
      dateRange: string;
      clinicalSummary: string;
      categoryMultipliers: Record<string, number>;
      specificMedicineMultipliers: Record<string, number>;
    }
  > = {
    post_monsoon: {
      title: 'Post-Monsoon & Autumn Epidemic Surge (Current)',
      tag: 'Current Season (Oct - Nov)',
      icon: CloudRain,
      color: 'from-blue-600/30 to-orange-500/20 border-orange-500/40',
      dateRange: 'October 15 – November 30',
      clinicalSummary:
        'High incidence of mosquito-borne fevers (Dengue, Malaria, Chikungunya), typhoid, and seasonal viral infections. Antipyretics and broad-spectrum antibiotics exhibit high consumption spikes of +45% to +60% across rural OPDs.',
      categoryMultipliers: {
        'Analgesics / Antipyretics': 1.6,
        Antibiotics: 1.45,
        'Anti-allergic': 1.35,
        Gastrointestinal: 1.3,
        Respiratory: 1.15,
        Antidiabetic: 1.05
      },
      specificMedicineMultipliers: {
        paracetamol: 1.65,
        amoxicillin: 1.45,
        cetirizine: 1.35,
        diclofenac: 1.25,
        salbutamol: 1.2,
        metformin: 1.05
      }
    },
    winter: {
      title: 'Winter Respiratory & Bronchial Surge',
      tag: 'Projected Season (Dec - Feb)',
      icon: Snowflake,
      color: 'from-cyan-600/30 to-blue-500/20 border-cyan-500/40',
      dateRange: 'December 1 – February 28',
      clinicalSummary:
        'Cold drop and agricultural harvest dust trigger severe COPD, pediatric asthma attacks, and secondary respiratory tract infections. Bronchodilators and respiratory syrups experience +50% to +70% consumption surges.',
      categoryMultipliers: {
        Respiratory: 1.7,
        Antibiotics: 1.4,
        'Analgesics / Antipyretics': 1.25,
        'Anti-allergic': 1.3,
        Gastrointestinal: 1.05,
        Antidiabetic: 1.1
      },
      specificMedicineMultipliers: {
        salbutamol: 1.75,
        azithromycin: 1.5,
        amoxicillin: 1.35,
        paracetamol: 1.25,
        cetirizine: 1.3,
        metformin: 1.1
      }
    },
    summer: {
      title: 'Peak Summer Dehydration & Enteric Peak',
      tag: 'Projected Season (Mar - Jun)',
      icon: Sun,
      color: 'from-amber-600/30 to-yellow-500/20 border-amber-500/40',
      dateRange: 'March 1 – June 15',
      clinicalSummary:
        'Extreme rural heat and drying water reservoirs produce gastroenteritis, bacterial dysentery, heat exhaustion, and skin infections. High demand for rehydration salts and gastrointestinal protective agents.',
      categoryMultipliers: {
        Gastrointestinal: 1.7,
        'Anti-allergic': 1.35,
        'Analgesics / Antipyretics': 1.2,
        Antibiotics: 1.3,
        Respiratory: 1.05,
        Antidiabetic: 1.1
      },
      specificMedicineMultipliers: {
        omeprazole: 1.6,
        amoxicillin: 1.3,
        paracetamol: 1.2,
        salbutamol: 1.05,
        metformin: 1.1
      }
    },
    baseline: {
      title: 'Baseline Standard Dispensary Velocity (Annual Normal)',
      tag: 'Steady-State Baseline',
      icon: Activity,
      color: 'from-slate-700/40 to-slate-800/40 border-slate-700',
      dateRange: 'Year-Round Equilibrium',
      clinicalSummary:
        'Standard operational baseline without seasonal epidemic peaks. Useful for comparing seasonal surges against standard monthly replenishment cycles.',
      categoryMultipliers: {
        'Analgesics / Antipyretics': 1.0,
        Antibiotics: 1.0,
        Respiratory: 1.0,
        Gastrointestinal: 1.0,
        'Anti-allergic': 1.0,
        Antidiabetic: 1.0
      },
      specificMedicineMultipliers: {
        paracetamol: 1.0,
        amoxicillin: 1.0,
        salbutamol: 1.0,
        diclofenac: 1.0,
        metformin: 1.0,
        omeprazole: 1.0,
        azithromycin: 1.0,
        cetirizine: 1.0
      }
    }
  };

  const activeSeasonConfig = seasonProfiles[selectedSeason];

  // Base consumption benchmarks for standard clinic size
  const baseBenchmarks: Record<string, number> = {
    paracetamol: 8.0, // base 8 units/day
    amoxicillin: 6.5, // base 6.5 units/day
    metformin: 1.5, // steady 1.5 units/day
    diclofenac: 2.0, // base 2 units/day
    salbutamol: 1.0, // base 1 unit/day
    cetirizine: 5.0, // base 5 units/day
    omeprazole: 2.2, // base 2.2 units/day
    azithromycin: 4.0 // base 4 units/day
  };

  // Compute seasonal forecasts for all medicines
  const forecasts: SeasonalForecastProfile[] = medicines.map((m) => {
    const medKey = Object.keys(baseBenchmarks).find(
      (k) => m.name.toLowerCase().includes(k) || m.generic_name.toLowerCase().includes(k)
    );

    const baseVelocity = medKey
      ? baseBenchmarks[medKey]
      : Math.max(1, Math.round(m.minimum_stock / 8));

    // Determine seasonal multiplier
    let multiplier = activeSeasonConfig.categoryMultipliers[m.category] || 1.1;
    if (medKey && activeSeasonConfig.specificMedicineMultipliers[medKey]) {
      multiplier = activeSeasonConfig.specificMedicineMultipliers[medKey];
    }

    const seasonalVelocity = parseFloat((baseVelocity * multiplier).toFixed(1));
    const currentStock = m.totalStock || 0;
    const minStock = m.minimum_stock || 10;

    // Days until minimum safety threshold breach
    let daysToThreshold = 0;
    if (currentStock <= minStock) {
      daysToThreshold = 0;
    } else {
      daysToThreshold = Math.max(
        1,
        Math.floor((currentStock - minStock) / seasonalVelocity)
      );
    }

    // Days to absolute zero stockout
    let daysToZeroStock = 0;
    if (currentStock === 0) {
      daysToZeroStock = 0;
    } else {
      daysToZeroStock = Math.max(
        1,
        Math.floor(currentStock / seasonalVelocity)
      );
    }

    // Projected dates
    const today = new Date('2026-10-23');
    const breachDateObj = new Date(today);
    breachDateObj.setDate(breachDateObj.getDate() + daysToThreshold);
    const breachDateStr = breachDateObj.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });

    const stockoutDateObj = new Date(today);
    stockoutDateObj.setDate(stockoutDateObj.getDate() + daysToZeroStock);
    const stockoutDateStr = stockoutDateObj.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });

    // Recommended seasonal buffer order
    // Order enough to satisfy 21 days of seasonal velocity + maintain minimum safety threshold
    const targetBuffer = Math.ceil(seasonalVelocity * 21 + minStock);
    const recommendedOrderBuffer = Math.max(0, targetBuffer - currentStock);

    // Determine risk status
    let riskLevel: SeasonalForecastProfile['riskLevel'] = 'HEALTHY_BUFFER';
    if (currentStock === 0) {
      riskLevel = 'STOCKED_OUT';
    } else if (daysToThreshold <= 3 || daysToZeroStock <= 5) {
      riskLevel = 'CRITICAL_SHORTAGE';
    } else if (daysToThreshold <= 7 || daysToZeroStock <= 10) {
      riskLevel = 'APPROACHING_THRESHOLD';
    }

    // 14-day forward depletion curve
    const depletionCurve: number[] = [];
    for (let day = 0; day <= 14; day++) {
      const remaining = Math.max(0, Math.round(currentStock - day * seasonalVelocity));
      depletionCurve.push(remaining);
    }

    let seasonalInsight = '';
    if (riskLevel === 'STOCKED_OUT') {
      seasonalInsight = `Immediate emergency supply needed! 0 ${m.unit} on shelf during ${activeSeasonConfig.title.toLowerCase()}.`;
    } else if (riskLevel === 'CRITICAL_SHORTAGE') {
      seasonalInsight = `${multiplier > 1.2 ? `Seasonal surge (+${Math.round((multiplier - 1) * 100)}%) ` : ''}burns ${seasonalVelocity} ${m.unit}/day. Breaches statutory safety threshold in ${daysToThreshold} days (${breachDateStr}).`;
    } else if (riskLevel === 'APPROACHING_THRESHOLD') {
      seasonalInsight = `Accelerated consumption will exhaust safety threshold within ${daysToThreshold} days. Depot reorder recommended.`;
    } else {
      seasonalInsight = `Comfortable ${daysToZeroStock}-day operational buffer under current ${activeSeasonConfig.title.toLowerCase()} conditions.`;
    }

    return {
      medicineId: m.id,
      medicineName: m.name,
      genericName: m.generic_name,
      category: m.category,
      unit: m.unit,
      currentStock,
      minimumStock: minStock,
      baseDailyVelocity: baseVelocity,
      seasonalMultiplier: multiplier,
      seasonalDailyVelocity: seasonalVelocity,
      daysToThreshold,
      daysToZeroStock,
      projectedBreachDate: breachDateStr,
      projectedStockoutDate: stockoutDateStr,
      recommendedOrderBuffer,
      riskLevel,
      seasonalInsight,
      depletionCurve
    };
  });

  // Sort: Critical & Stocked Out first, then by daysToZeroStock ascending
  const sortedForecasts = [...forecasts].sort((a, b) => {
    const riskScore = (r: SeasonalForecastProfile['riskLevel']) =>
      r === 'STOCKED_OUT' ? 0 : r === 'CRITICAL_SHORTAGE' ? 1 : r === 'APPROACHING_THRESHOLD' ? 2 : 3;
    if (riskScore(a.riskLevel) !== riskScore(b.riskLevel)) {
      return riskScore(a.riskLevel) - riskScore(b.riskLevel);
    }
    return a.daysToZeroStock - b.daysToZeroStock;
  });

  const selectedProfile =
    sortedForecasts.find((f) => f.medicineId === selectedMedId) || sortedForecasts[0];
  const selectedMedObj = medicines.find((m) => m.id === selectedProfile?.medicineId) || medicines[0];

  // Critical counts
  const criticalCount = sortedForecasts.filter(
    (f) => f.riskLevel === 'CRITICAL_SHORTAGE' || f.riskLevel === 'STOCKED_OUT'
  ).length;

  return (
    <div className="space-y-6">
      {/* Header & Seasonal Context Card */}
      <div className={`p-5 rounded-2xl bg-gradient-to-r ${activeSeasonConfig.color} border shadow-xl relative overflow-hidden transition-all duration-300`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-orange-500/20 text-orange-300 border border-orange-500/40">
                <activeSeasonConfig.icon className="w-3.5 h-3.5 text-orange-400 animate-pulse" />
                {activeSeasonConfig.tag}
              </span>
              <span className="text-xs text-slate-400 font-mono">
                Epidemiological Model Active • Reference Date: Oct 23, 2026
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Usage-Velocity & Seasonal Stockout Forecasting
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 max-w-3xl mt-1 leading-relaxed">
              {activeSeasonConfig.clinicalSummary}
            </p>
          </div>

          {/* Quick Season Simulator Buttons */}
          <div className="bg-slate-900/90 p-2 rounded-xl border border-slate-700/80 shrink-0 space-y-1">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block px-1">
              Simulate Epidemiological Season:
            </span>
            <div className="grid grid-cols-2 gap-1 text-xs">
              {(
                [
                  { id: 'post_monsoon', label: 'Post-Monsoon (Current)', icon: CloudRain },
                  { id: 'winter', label: 'Winter Respiratory', icon: Snowflake },
                  { id: 'summer', label: 'Summer Heatwave', icon: Sun },
                  { id: 'baseline', label: 'Annual Baseline', icon: Activity }
                ] as const
              ).map((s) => (
                <button
                  key={s.id}
                  onClick={() => setSelectedSeason(s.id)}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg font-semibold text-[11px] transition cursor-pointer ${
                    selectedSeason === s.id
                      ? 'bg-orange-600 text-white shadow-xs font-bold'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <s.icon className="w-3.5 h-3.5" />
                  <span>{s.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Early Warning Banner */}
        {criticalCount > 0 && (
          <div className="mt-4 p-3 bg-red-950/60 border border-red-500/40 rounded-xl flex items-center justify-between text-xs text-red-200">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-red-400 shrink-0" />
              <span>
                <strong>Predictive Warning:</strong> {criticalCount} essential medicines will breach statutory safety thresholds before the next depot delivery cycle.
              </span>
            </div>
            <span className="font-bold text-[11px] bg-red-500/20 px-2 py-0.5 rounded border border-red-500/30">
              Immediate Reorder Indent Recommended
            </span>
          </div>
        )}
      </div>

      {/* Main Interactive Forecasting Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Depletion Curve & Detailed Profile of Selected Medicine */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
            <div>
              <div className="flex items-center gap-2">
                <TrendingDown className="w-5 h-5 text-orange-400" />
                <h3 className="font-bold text-base text-white">
                  14-Day Depletion Velocity Trajectory
                </h3>
              </div>
              <p className="text-[11px] text-slate-400">
                Visualizing how accelerated seasonal consumption depletes inventory past statutory safety buffers
              </p>
            </div>

            {/* Medicine Selector Dropdown */}
            <select
              value={selectedMedId}
              onChange={(e) => setSelectedMedId(Number(e.target.value))}
              className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-hidden focus:border-orange-500"
            >
              {sortedForecasts.map((f) => (
                <option key={f.medicineId} value={f.medicineId}>
                  {f.medicineName} ({f.riskLevel === 'STOCKED_OUT' ? 'Out of Stock' : `${f.daysToZeroStock}d left`})
                </option>
              ))}
            </select>
          </div>

          {selectedProfile && (
            <div className="space-y-4">
              {/* Medicine Velocity Metrics Header */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700 text-xs">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Current Stock</span>
                  <strong className="text-lg text-white font-mono mt-0.5 block">
                    {selectedProfile.currentStock} {selectedProfile.unit}
                  </strong>
                  <span className="text-[10px] text-slate-400">
                    Min Threshold: {selectedProfile.minimumStock} {selectedProfile.unit}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700 text-xs">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Consumption Rate</span>
                  <strong className="text-lg text-orange-400 font-mono mt-0.5 block">
                    {selectedProfile.seasonalDailyVelocity} {selectedProfile.unit}/day
                  </strong>
                  <span className="text-[10px] text-slate-400">
                    Base: {selectedProfile.baseDailyVelocity} • Surge: +{Math.round((selectedProfile.seasonalMultiplier - 1) * 100)}%
                  </span>
                </div>

                <div className={`p-3 rounded-xl border text-xs ${
                  selectedProfile.daysToThreshold <= 3
                    ? 'bg-red-950/40 border-red-500/40 text-red-200'
                    : 'bg-slate-800/80 border-slate-700 text-slate-200'
                }`}>
                  <span className="text-[10px] uppercase font-bold block text-slate-400">Breach Threshold</span>
                  <strong className={`text-lg font-mono mt-0.5 block ${selectedProfile.daysToThreshold <= 3 ? 'text-red-400' : 'text-white'}`}>
                    {selectedProfile.daysToThreshold === 0 ? 'BREACHED NOW' : `In ${selectedProfile.daysToThreshold} Days`}
                  </strong>
                  <span className="text-[10px] text-slate-400">
                    Date: {selectedProfile.projectedBreachDate}
                  </span>
                </div>

                <div className={`p-3 rounded-xl border text-xs ${
                  selectedProfile.daysToZeroStock <= 5
                    ? 'bg-red-950/40 border-red-500/40 text-red-200'
                    : 'bg-slate-800/80 border-slate-700 text-slate-200'
                }`}>
                  <span className="text-[10px] uppercase font-bold block text-slate-400">Total Stockout</span>
                  <strong className={`text-lg font-mono mt-0.5 block ${selectedProfile.daysToZeroStock <= 5 ? 'text-red-400' : 'text-white'}`}>
                    {selectedProfile.daysToZeroStock === 0 ? 'STOCKED OUT' : `In ${selectedProfile.daysToZeroStock} Days`}
                  </strong>
                  <span className="text-[10px] text-slate-400">
                    Date: {selectedProfile.projectedStockoutDate}
                  </span>
                </div>
              </div>

              {/* Depletion Curve Graph (SVG) */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-300">
                    Trajectory for {selectedProfile.medicineName} over Next 14 Days
                  </span>
                  <div className="flex items-center gap-4 text-[10px]">
                    <span className="flex items-center gap-1.5 text-orange-400">
                      <span className="w-2.5 h-0.5 bg-orange-500" />
                      Projected Stock Level
                    </span>
                    <span className="flex items-center gap-1.5 text-red-400">
                      <span className="w-2.5 h-0.5 bg-red-500 border-dashed border-b" />
                      Safety Threshold ({selectedProfile.minimumStock})
                    </span>
                  </div>
                </div>

                {/* SVG Visualizer */}
                <div className="relative h-44 w-full">
                  <svg className="w-full h-full" viewBox="0 0 500 160" preserveAspectRatio="none">
                    {/* Background Grid Lines */}
                    {[0, 40, 80, 120].map((y, i) => (
                      <line
                        key={i}
                        x1="30"
                        y1={y}
                        x2="490"
                        y2={y}
                        stroke="#334155"
                        strokeDasharray="2,3"
                        strokeWidth="1"
                      />
                    ))}

                    {/* Red Minimum Threshold Line */}
                    {(() => {
                      const maxStock = Math.max(
                        selectedProfile.currentStock,
                        selectedProfile.minimumStock * 1.5,
                        20
                      );
                      const thresholdY =
                        140 - (selectedProfile.minimumStock / maxStock) * 120;
                      return (
                        <g>
                          <line
                            x1="30"
                            y1={thresholdY}
                            x2="490"
                            y2={thresholdY}
                            stroke="#ef4444"
                            strokeDasharray="4,4"
                            strokeWidth="1.5"
                          />
                          <text
                            x="490"
                            y={thresholdY - 4}
                            textAnchor="end"
                            fill="#ef4444"
                            fontSize="9"
                            fontFamily="monospace"
                          >
                            Min Safety: {selectedProfile.minimumStock}
                          </text>
                        </g>
                      );
                    })()}

                    {/* Depletion Curve Area & Line */}
                    {(() => {
                      const maxStock = Math.max(
                        selectedProfile.currentStock,
                        selectedProfile.minimumStock * 1.5,
                        20
                      );
                      const curve = selectedProfile.depletionCurve;
                      const points = curve.map((val, idx) => {
                        const x = 30 + (idx / 14) * 460;
                        const y = 140 - (val / maxStock) * 120;
                        return { x, y, val };
                      });

                      const pathD = points.reduce(
                        (acc, p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`),
                        ''
                      );
                      const areaD = `${pathD} L ${points[points.length - 1].x} 140 L 30 140 Z`;

                      return (
                        <g>
                          <defs>
                            <linearGradient id="depletionGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#f97316" stopOpacity="0.3" />
                              <stop offset="100%" stopColor="#f97316" stopOpacity="0.0" />
                            </linearGradient>
                          </defs>

                          {/* Gradient fill under curve */}
                          <path d={areaD} fill="url(#depletionGrad)" />

                          {/* Primary Depletion Curve */}
                          <path
                            d={pathD}
                            fill="none"
                            stroke="#f97316"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                          />

                          {/* Data dots on curve */}
                          {points.map((p, i) => (
                            <circle
                              key={i}
                              cx={p.x}
                              cy={p.y}
                              r={i === 0 || i === selectedProfile.daysToThreshold || i === selectedProfile.daysToZeroStock ? '4' : '2'}
                              fill={i === selectedProfile.daysToThreshold ? '#ef4444' : '#f97316'}
                              stroke="#0f172a"
                              strokeWidth="1.5"
                            />
                          ))}
                        </g>
                      );
                    })()}

                    {/* X-Axis Day Labels */}
                    {[0, 2, 4, 6, 8, 10, 12, 14].map((d) => {
                      const x = 30 + (d / 14) * 460;
                      return (
                        <text
                          key={d}
                          x={x}
                          y="155"
                          textAnchor="middle"
                          fill="#64748b"
                          fontSize="9"
                          fontFamily="monospace"
                        >
                          {d === 0 ? 'Today' : `D+${d}`}
                        </text>
                      );
                    })}
                  </svg>
                </div>
              </div>

              {/* AI Forecast & Preventive Indent Banner */}
              <div className="p-4 rounded-xl bg-orange-500/10 border border-orange-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div>
                  <div className="flex items-center gap-1.5 font-bold text-orange-400">
                    <Sparkles className="w-4 h-4 text-orange-400" />
                    <span>Predictive Inventory Intelligence</span>
                  </div>
                  <p className="text-slate-300 mt-1 leading-relaxed">
                    {selectedProfile.seasonalInsight}
                  </p>
                  <p className="text-[11px] text-orange-300/80 font-mono mt-0.5">
                    Recommended Seasonal Reorder Buffer: <strong>+{selectedProfile.recommendedOrderBuffer} {selectedProfile.unit}</strong> to protect clinical buffer through November.
                  </p>
                </div>

                <button
                  onClick={() =>
                    setIndentModalMed({
                      med: selectedMedObj,
                      suggestedQty: selectedProfile.recommendedOrderBuffer,
                      reason: `${activeSeasonConfig.title} Surge Indent`
                    })
                  }
                  className="px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs shrink-0 flex items-center gap-1.5 transition cursor-pointer shadow-md"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Generate Seasonal Indent (+{selectedProfile.recommendedOrderBuffer})</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Complete Formulary Vulnerability List */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3 flex flex-col">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <div>
              <h3 className="font-bold text-sm text-white">Formulary Risk Ranking</h3>
              <p className="text-[11px] text-slate-400">Ordered by days until stockout</p>
            </div>
            <span className="text-[10px] font-mono text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
              {sortedForecasts.length} Meds
            </span>
          </div>

          <div className="space-y-2 overflow-y-auto max-h-[500px] pr-1 flex-1">
            {sortedForecasts.map((f) => {
              const isSelected = f.medicineId === selectedMedId;
              const isCritical = f.riskLevel === 'CRITICAL_SHORTAGE';
              const isStockout = f.riskLevel === 'STOCKED_OUT';

              return (
                <div
                  key={f.medicineId}
                  onClick={() => setSelectedMedId(f.medicineId)}
                  className={`p-3 rounded-xl border text-xs transition cursor-pointer ${
                    isSelected
                      ? 'bg-orange-500/15 border-orange-500/60 shadow-md ring-1 ring-orange-500/30'
                      : 'bg-slate-800/70 border-slate-700/70 hover:bg-slate-800 hover:border-slate-600'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <strong className="text-white text-xs truncate max-w-[170px]">
                      {f.medicineName}
                    </strong>
                    <span
                      className={`text-[9px] font-bold px-1.5 py-0.2 rounded uppercase ${
                        isStockout
                          ? 'bg-red-500 text-white'
                          : isCritical
                          ? 'bg-orange-500 text-white'
                          : f.riskLevel === 'APPROACHING_THRESHOLD'
                          ? 'bg-yellow-500/20 text-yellow-300'
                          : 'bg-emerald-500/20 text-emerald-300'
                      }`}
                    >
                      {isStockout ? 'Out of Stock' : isCritical ? `${f.daysToZeroStock}d Stockout` : `${f.daysToZeroStock}d Buffer`}
                    </span>
                  </div>

                  <div className="mt-1.5 flex items-center justify-between text-[11px] text-slate-400">
                    <span>
                      Stock: <strong className="text-slate-200">{f.currentStock} {f.unit}</strong>
                    </span>
                    <span className="text-orange-400 font-mono">
                      -{f.seasonalDailyVelocity}/day
                    </span>
                  </div>

                  <div className="mt-2 pt-2 border-t border-slate-700/60 flex items-center justify-between text-[10px]">
                    <span className={f.daysToThreshold <= 3 ? 'text-red-400 font-semibold' : 'text-slate-400'}>
                      {f.daysToThreshold === 0 ? 'Safety buffer breached' : `Safety breach: in ${f.daysToThreshold}d`}
                    </span>
                    <span className="text-orange-400 hover:underline font-bold flex items-center gap-0.5">
                      <span>View Curve</span>
                      <ArrowRight className="w-3 h-3" />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Seasonal Reorder Indent Slip Modal */}
      {indentModalMed && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-6 text-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-orange-400" />
                <h3 className="font-bold text-base text-white">
                  Seasonal Epidemic Indent Slip
                </h3>
              </div>
              <button
                onClick={() => setIndentModalMed(null)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 p-4 rounded-xl bg-slate-800/80 border border-slate-700 space-y-2 text-xs">
              <p>
                <strong>Clinic:</strong> Primary Rural Health Centre - Seva Kendra
              </p>
              <p>
                <strong>Medicine:</strong> {indentModalMed.med.name}
              </p>
              <p>
                <strong>Current On-Shelf Balance:</strong> {indentModalMed.med.totalStock} {indentModalMed.med.unit}
              </p>
              <p>
                <strong>Statutory Minimum Threshold:</strong> {indentModalMed.med.minimum_stock} {indentModalMed.med.unit}
              </p>
              <p>
                <strong>Season Epidemic Profile:</strong> {activeSeasonConfig.title}
              </p>
              <div className="p-3 rounded-lg bg-orange-500/15 border border-orange-500/40 text-orange-300 font-bold">
                Recommended Buffer Dispatch Quantity: {indentModalMed.suggestedQty} {indentModalMed.med.unit}
              </div>
            </div>

            {indentSuccess ? (
              <div className="mt-4 p-3 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs text-center font-bold">
                {indentSuccess}
              </div>
            ) : (
              <div className="mt-5 flex gap-2 justify-end">
                <button
                  onClick={() => setIndentModalMed(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setIndentSuccess(
                      `Seasonal Indent #S-2026-${Math.floor(1000 + Math.random() * 9000)} generated and dispatched to District Depot!`
                    );
                    setTimeout(() => {
                      setIndentSuccess(null);
                      setIndentModalMed(null);
                    }, 2500);
                  }}
                  className="px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold shadow-md cursor-pointer"
                >
                  Confirm & Dispatch Indent
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
