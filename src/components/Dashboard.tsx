import React, { useState } from 'react';
import {
  Boxes,
  Clock,
  AlertTriangle,
  XCircle,
  CheckCircle2,
  ArrowRight,
  TrendingUp,
  ShieldAlert,
  ArrowLeftRight,
  Zap,
  Filter,
  PackageCheck,
  Calendar,
  Layers,
  Mic,
  Brain,
  Sparkles
} from 'lucide-react';
import { DashboardData, Medicine } from '../types/index.ts';
import { DashboardVelocitySection } from './BurnRateMiniChart.tsx';

interface DashboardProps {
  data: DashboardData;
  medicines: Medicine[];
  onNavigate: (tab: string) => void;
  onOpenStockModal?: (medicineId: number, batchId?: number) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  data,
  medicines,
  onNavigate,
  onOpenStockModal
}) => {
  const { summary, expiryDistribution, fefoRecommendations, recentActivity, alerts } = data;
  const [selectedExpiryBucket, setSelectedExpiryBucket] = useState<'all' | '0-30' | '31-50' | '50+' | 'expired'>('all');

  // Filter medicines by clicked expiry bucket
  const filteredBatches = medicines.flatMap(m =>
    (m.batches || []).map(b => ({
      ...b,
      medicineName: m.name,
      genericName: m.generic_name,
      category: m.category,
      unit: m.unit
    }))
  ).filter(b => {
    if (selectedExpiryBucket === 'all') return true;
    if (selectedExpiryBucket === 'expired') return (b.diffDays || 0) <= 0;
    if (selectedExpiryBucket === '0-30') return (b.diffDays || 0) > 0 && (b.diffDays || 0) <= 30;
    if (selectedExpiryBucket === '31-50') return (b.diffDays || 0) > 30 && (b.diffDays || 0) <= 50;
    if (selectedExpiryBucket === '50+') return (b.diffDays || 0) > 50;
    return true;
  });

  const totalBatchesCount = summary.totalBatches || 1;
  const pctExpired = Math.round((expiryDistribution.expired / totalBatchesCount) * 100);
  const pct0_30 = Math.round((expiryDistribution.range0_30 / totalBatchesCount) * 100);
  const pct31_50 = Math.round((expiryDistribution.range31_50 / totalBatchesCount) * 100);
  const pct50plus = Math.round((expiryDistribution.range50plus / totalBatchesCount) * 100);

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner Message */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border border-slate-800 p-4 sm:p-5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-lg">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">Dispensary Operations Dashboard</h2>
            <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Live Sync
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Real-time tracking of medicine batches, FEFO dispensing order, and critical expiry dates.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => onNavigate('voice-assistant')}
            className="px-3.5 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold text-xs rounded-xl shadow-md shadow-purple-600/30 flex items-center gap-2 transition cursor-pointer"
          >
            <Mic className="w-3.5 h-3.5 animate-pulse text-purple-200" />
            <span>Voice Assistant</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-white/20 font-bold">High Thinking</span>
          </button>
          <button
            onClick={() => onNavigate('stock')}
            className="px-3.5 py-2 bg-orange-600 hover:bg-orange-500 text-white font-semibold text-xs rounded-xl shadow-md shadow-orange-600/30 flex items-center gap-2 transition cursor-pointer"
          >
            <ArrowLeftRight className="w-3.5 h-3.5" />
            <span>Update Stock</span>
          </button>
          <button
            onClick={() => onNavigate('medicines')}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs rounded-xl border border-slate-700 transition cursor-pointer"
          >
            View All Medicines
          </button>
        </div>
      </div>

      {/* Voice Assistant & High Thinking Quick Banner */}
      <div
        onClick={() => onNavigate('voice-assistant')}
        className="bg-gradient-to-r from-purple-950/40 via-slate-900 to-orange-950/30 border border-purple-500/30 hover:border-purple-500/60 p-4 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 transition cursor-pointer group shadow-lg"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-300 border border-purple-500/40 flex items-center justify-center shrink-0 group-hover:scale-105 transition">
            <Mic className="w-5 h-5 text-purple-400 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-white group-hover:text-purple-300 transition flex items-center gap-1.5">
                <Brain className="w-3.5 h-3.5 text-purple-400" />
                Hands-Free Voice Conversation with High Thinking
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 font-bold">
                ThinkingLevel.HIGH
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Dispense medicines hands-free, verify earliest expiring batches, and receive natural voice answers backed by multi-step clinical reasoning.
            </p>
          </div>
        </div>

        <button className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold flex items-center gap-1.5 transition shrink-0 shadow-md">
          <span>Start Voice Conversation</span>
          <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition" />
        </button>
      </div>

      {/* 1. Four Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Medicines */}
        <div
          onClick={() => onNavigate('medicines')}
          className="bg-slate-900 border border-slate-800 hover:border-slate-700 p-5 rounded-2xl transition shadow-md cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Medicines</span>
            <div className="p-2.5 rounded-xl bg-slate-800 text-slate-300 group-hover:bg-slate-700 transition">
              <Boxes className="w-5 h-5 text-blue-400" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-white">{summary.totalMedicines}</span>
            <span className="text-xs text-slate-400 font-medium">registered items</span>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
            <span>Batches tracked:</span>
            <span className="font-bold text-slate-200">{summary.totalBatches} active</span>
          </div>
        </div>

        {/* Card 2: Expiring Soon (Orange) */}
        <div
          onClick={() => {
            setSelectedExpiryBucket('0-30');
            const el = document.getElementById('expiry-breakdown-section');
            if (el) el.scrollIntoView({ behavior: 'smooth' });
          }}
          className="bg-slate-900 border border-orange-500/30 hover:border-orange-500/60 p-5 rounded-2xl transition shadow-md cursor-pointer group relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-orange-500/5 rounded-full blur-xl pointer-events-none" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-orange-400 uppercase tracking-wider">Expiring Soon</span>
            <div className="p-2.5 rounded-xl bg-orange-500/10 text-orange-400 group-hover:bg-orange-500/20 transition">
              <Clock className="w-5 h-5 text-orange-400" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-orange-400">{summary.expiringSoonCount}</span>
            <span className="text-xs text-orange-300/80 font-medium">batches (0–30 days)</span>
          </div>
          <div className="mt-3 pt-3 border-t border-orange-500/20 flex items-center justify-between text-[11px] text-orange-300/80">
            <span>Prioritize FEFO sale:</span>
            <span className="font-bold text-orange-400">Action needed</span>
          </div>
        </div>

        {/* Card 3: Low Stock (Blue/Neutral) */}
        <div
          onClick={() => onNavigate('medicines')}
          className="bg-slate-900 border border-slate-800 hover:border-slate-700 p-5 rounded-2xl transition shadow-md cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider">Low Stock</span>
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 group-hover:bg-amber-500/20 transition">
              <AlertTriangle className="w-5 h-5 text-amber-400" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-amber-400">{summary.lowStockCount}</span>
            <span className="text-xs text-slate-400 font-medium">medicines ≤ min level</span>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
            <span>Reorder suggested:</span>
            <span className="font-bold text-amber-300">Depot indent ready</span>
          </div>
        </div>

        {/* Card 4: Out of Stock / Expired (Red) */}
        <div
          onClick={() => onNavigate('expiry-alerts')}
          className="bg-slate-900 border border-red-500/30 hover:border-red-500/60 p-5 rounded-2xl transition shadow-md cursor-pointer group relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-red-500/5 rounded-full blur-xl pointer-events-none" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-red-400 uppercase tracking-wider">Stockout & Expired</span>
            <div className="p-2.5 rounded-xl bg-red-500/10 text-red-400 group-hover:bg-red-500/20 transition">
              <XCircle className="w-5 h-5 text-red-400" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-red-400">
              {summary.outOfStockCount + summary.expiredCount}
            </span>
            <span className="text-xs text-red-300/80 font-medium">critical items</span>
          </div>
          <div className="mt-3 pt-3 border-t border-red-500/20 flex items-center justify-between text-[11px] text-red-300/80">
            <span>{summary.expiredCount} expired • {summary.outOfStockCount} zero stock</span>
            <span className="font-bold text-red-400">Quarantine</span>
          </div>
        </div>
      </div>

      {/* 2. AI Predictive Burn Rate & Velocity Forecast Section */}
      <DashboardVelocitySection
        medicines={medicines}
        onNavigate={onNavigate}
        onOpenStockModal={onOpenStockModal}
      />

      {/* 3. FEFO Stock Recommendation Showcase Card */}
      <div className="bg-gradient-to-r from-orange-950/40 via-slate-900 to-slate-900 border border-orange-500/30 p-5 rounded-2xl shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-orange-500/20 rounded-xl text-orange-400 border border-orange-500/30">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white flex items-center gap-2">
                <span>FEFO Priority Recommendations</span>
                <span className="text-[10px] bg-orange-500/20 text-orange-400 px-2 py-0.5 rounded-full font-bold">
                  First Expire, First Out
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Staff dispensing advice: Always dispense earlier expiring batches first to prevent costly medical waste.
              </p>
            </div>
          </div>
          <button
            onClick={() => onNavigate('stock')}
            className="text-xs text-orange-400 hover:text-orange-300 font-semibold flex items-center gap-1 self-start sm:self-auto cursor-pointer"
          >
            Open Dispensing Wizard →
          </button>
        </div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {fefoRecommendations.map((item, idx) => (
            <div
              key={idx}
              className="bg-slate-900/90 border border-orange-500/20 hover:border-orange-500/40 p-4 rounded-xl transition space-y-2.5"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-bold text-sm text-white">{item.medicineName}</h4>
                  <p className="text-[11px] text-slate-400">
                    {item.otherBatchesCount + 1} batches in clinic stock
                  </p>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-orange-500/20 text-orange-400 border border-orange-500/30">
                  Recommended
                </span>
              </div>

              <div className="p-2.5 rounded-lg bg-orange-500/10 border border-orange-500/20 space-y-1 text-xs">
                <div className="flex justify-between text-orange-200">
                  <span>Dispense First:</span>
                  <strong className="font-mono text-orange-400">Batch {item.recommendedBatch}</strong>
                </div>
                <div className="flex justify-between text-slate-300 text-[11px]">
                  <span>Shelf Life:</span>
                  <span className="font-semibold text-orange-300">
                    Expires in {item.recommendedDays} days ({item.expiryDate})
                  </span>
                </div>
                <div className="flex justify-between text-slate-300 text-[11px]">
                  <span>Available:</span>
                  <span className="font-semibold">{item.recommendedQty} units</span>
                </div>
              </div>

              <p className="text-[11px] text-slate-400 leading-snug">
                {item.advice}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* 3. Expiry Overview Section with Visual Bar & Clickable Filter */}
      <div id="expiry-breakdown-section" className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-lg space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-base text-white flex items-center gap-2">
              <Clock className="w-5 h-5 text-orange-400" />
              <span>Expiry Overview & Shelf-Life Distribution</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Interactive distribution across all {summary.totalBatches} registered medicine batches. Click any bucket to inspect.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <span className="text-slate-400 text-[11px] mr-1 hidden sm:inline">Filter:</span>
            <button
              onClick={() => setSelectedExpiryBucket('all')}
              className={`px-2.5 py-1 rounded-lg font-medium transition cursor-pointer text-xs ${
                selectedExpiryBucket === 'all'
                  ? 'bg-slate-700 text-white font-bold'
                  : 'bg-slate-800/80 text-slate-400 hover:text-white'
              }`}
            >
              All ({summary.totalBatches})
            </button>
            <button
              onClick={() => setSelectedExpiryBucket('expired')}
              className={`px-2.5 py-1 rounded-lg font-medium transition cursor-pointer text-xs ${
                selectedExpiryBucket === 'expired'
                  ? 'bg-red-600 text-white font-bold'
                  : 'bg-slate-800/80 text-red-400 hover:bg-slate-800'
              }`}
            >
              Expired ({expiryDistribution.expired})
            </button>
            <button
              onClick={() => setSelectedExpiryBucket('0-30')}
              className={`px-2.5 py-1 rounded-lg font-medium transition cursor-pointer text-xs ${
                selectedExpiryBucket === '0-30'
                  ? 'bg-orange-600 text-white font-bold'
                  : 'bg-slate-800/80 text-orange-400 hover:bg-slate-800'
              }`}
            >
              0–30 Days ({expiryDistribution.range0_30})
            </button>
            <button
              onClick={() => setSelectedExpiryBucket('31-50')}
              className={`px-2.5 py-1 rounded-lg font-medium transition cursor-pointer text-xs ${
                selectedExpiryBucket === '31-50'
                  ? 'bg-amber-600 text-white font-bold'
                  : 'bg-slate-800/80 text-amber-300 hover:bg-slate-800'
              }`}
            >
              31–50 Days ({expiryDistribution.range31_50})
            </button>
            <button
              onClick={() => setSelectedExpiryBucket('50+')}
              className={`px-2.5 py-1 rounded-lg font-medium transition cursor-pointer text-xs ${
                selectedExpiryBucket === '50+'
                  ? 'bg-emerald-600 text-white font-bold'
                  : 'bg-slate-800/80 text-emerald-400 hover:bg-slate-800'
              }`}
            >
              50+ Days ({expiryDistribution.range50plus})
            </button>
          </div>
        </div>

        {/* Visual Progress Bar Chart */}
        <div className="space-y-2">
          <div className="h-4 w-full bg-slate-800 rounded-full overflow-hidden flex shadow-inner">
            {expiryDistribution.expired > 0 && (
              <div
                style={{ width: `${Math.max(4, pctExpired)}%` }}
                className="bg-red-500 h-full transition-all duration-500"
                title={`Expired: ${expiryDistribution.expired} batches`}
              />
            )}
            {expiryDistribution.range0_30 > 0 && (
              <div
                style={{ width: `${Math.max(4, pct0_30)}%` }}
                className="bg-orange-500 h-full transition-all duration-500"
                title={`0-30 Days: ${expiryDistribution.range0_30} batches`}
              />
            )}
            {expiryDistribution.range31_50 > 0 && (
              <div
                style={{ width: `${Math.max(4, pct31_50)}%` }}
                className="bg-amber-400 h-full transition-all duration-500"
                title={`31-50 Days: ${expiryDistribution.range31_50} batches`}
              />
            )}
            {expiryDistribution.range50plus > 0 && (
              <div
                style={{ width: `${Math.max(4, pct50plus)}%` }}
                className="bg-emerald-500 h-full transition-all duration-500"
                title={`50+ Days: ${expiryDistribution.range50plus} batches`}
              />
            )}
          </div>

          {/* Bar Legend */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-xs">
            <div
              onClick={() => setSelectedExpiryBucket('expired')}
              className="p-2 rounded-xl bg-slate-800/60 border border-red-500/30 flex items-center gap-2 cursor-pointer hover:bg-slate-800"
            >
              <span className="w-3 h-3 rounded-full bg-red-500 shrink-0" />
              <div>
                <p className="font-bold text-white text-xs">Already Expired</p>
                <p className="text-[11px] text-red-400">{expiryDistribution.expired} batch ({pctExpired}%)</p>
              </div>
            </div>

            <div
              onClick={() => setSelectedExpiryBucket('0-30')}
              className="p-2 rounded-xl bg-slate-800/60 border border-orange-500/30 flex items-center gap-2 cursor-pointer hover:bg-slate-800"
            >
              <span className="w-3 h-3 rounded-full bg-orange-500 shrink-0" />
              <div>
                <p className="font-bold text-white text-xs">0–30 Days Critical</p>
                <p className="text-[11px] text-orange-400">{expiryDistribution.range0_30} batches ({pct0_30}%)</p>
              </div>
            </div>

            <div
              onClick={() => setSelectedExpiryBucket('31-50')}
              className="p-2 rounded-xl bg-slate-800/60 border border-amber-500/30 flex items-center gap-2 cursor-pointer hover:bg-slate-800"
            >
              <span className="w-3 h-3 rounded-full bg-amber-400 shrink-0" />
              <div>
                <p className="font-bold text-white text-xs">31–50 Days Warning</p>
                <p className="text-[11px] text-amber-300">{expiryDistribution.range31_50} batches ({pct31_50}%)</p>
              </div>
            </div>

            <div
              onClick={() => setSelectedExpiryBucket('50+')}
              className="p-2 rounded-xl bg-slate-800/60 border border-emerald-500/30 flex items-center gap-2 cursor-pointer hover:bg-slate-800"
            >
              <span className="w-3 h-3 rounded-full bg-emerald-500 shrink-0" />
              <div>
                <p className="font-bold text-white text-xs">50+ Days Safe</p>
                <p className="text-[11px] text-emerald-400">{expiryDistribution.range50plus} batches ({pct50plus}%)</p>
              </div>
            </div>
          </div>
        </div>

        {/* List of Batches for Selected Bucket */}
        <div className="pt-2">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2 font-medium">
            <span>Showing: {selectedExpiryBucket.toUpperCase()} Shelf-Life Batches</span>
            <span>{filteredBatches.length} batch record(s)</span>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-800">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-800/70 text-slate-300 uppercase tracking-wider text-[10px] border-b border-slate-800">
                <tr>
                  <th className="p-3">Medicine</th>
                  <th className="p-3">Batch Number</th>
                  <th className="p-3">Expiry Date</th>
                  <th className="p-3">Quantity</th>
                  <th className="p-3">Days Remaining</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-200">
                {filteredBatches.map((b) => {
                  const isExp = (b.diffDays || 0) <= 0;
                  const isSoon = (b.diffDays || 0) > 0 && (b.diffDays || 0) <= 30;
                  const isWarn = (b.diffDays || 0) > 30 && (b.diffDays || 0) <= 50;

                  return (
                    <tr key={b.id} className="hover:bg-slate-800/50 transition">
                      <td className="p-3">
                        <div className="font-bold text-white">{b.medicineName}</div>
                        <div className="text-[11px] text-slate-400">{b.genericName}</div>
                      </td>
                      <td className="p-3 font-mono font-medium text-orange-400">
                        {b.batch_number}
                      </td>
                      <td className="p-3">{b.expiry_date}</td>
                      <td className="p-3 font-semibold">
                        {b.quantity} {b.unit}
                      </td>
                      <td className="p-3">
                        {isExp ? (
                          <span className="text-red-400 font-bold">
                            Expired ({Math.abs(b.diffDays || 0)}d ago)
                          </span>
                        ) : (
                          <span className={isSoon ? 'text-orange-400 font-bold' : isWarn ? 'text-amber-300 font-medium' : 'text-slate-300'}>
                            {b.diffDays} days remaining
                          </span>
                        )}
                      </td>
                      <td className="p-3">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            isExp
                              ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                              : isSoon
                              ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                              : isWarn
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          }`}
                        >
                          {isExp ? 'Expired' : isSoon ? 'Expiring Soon' : isWarn ? 'Warning (31–50d)' : 'Healthy'}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <button
                          onClick={() => onNavigate('stock')}
                          className="px-2.5 py-1 rounded bg-slate-800 hover:bg-orange-600 hover:text-white text-slate-300 font-medium text-[11px] transition cursor-pointer"
                        >
                          {isExp ? 'Quarantine' : 'Dispense'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* 4. Bottom Grid: Urgent Alerts & Recent Stock Movement Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Urgent Alerts Feed */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-lg space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-orange-400" />
              <h3 className="font-bold text-base text-white">Active Dispensary Alerts</h3>
            </div>
            <button
              onClick={() => onNavigate('expiry-alerts')}
              className="text-xs text-orange-400 hover:text-orange-300 font-semibold"
            >
              Manage Alerts →
            </button>
          </div>

          <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
            {alerts.filter(a => a.status === 'active').slice(0, 5).map(alert => (
              <div
                key={alert.id}
                className={`p-3 rounded-xl border flex items-start gap-3 ${
                  alert.alert_type === 'expired'
                    ? 'bg-red-500/10 border-red-500/30 text-red-200'
                    : alert.alert_type === 'expiring_soon'
                    ? 'bg-orange-500/10 border-orange-500/30 text-orange-200'
                    : 'bg-amber-500/10 border-amber-500/30 text-amber-200'
                }`}
              >
                <div className="mt-0.5">
                  {alert.alert_type === 'expired' ? (
                    <XCircle className="w-4 h-4 text-red-400" />
                  ) : alert.alert_type === 'expiring_soon' ? (
                    <Clock className="w-4 h-4 text-orange-400" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-amber-400" />
                  )}
                </div>
                <div className="flex-1">
                  <p className="text-xs font-semibold leading-relaxed">{alert.message}</p>
                  <div className="mt-1 flex items-center justify-between text-[10px] text-slate-400">
                    <span>{alert.medicine_name}</span>
                    <span>{new Date(alert.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Stock Movement Activity */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-lg space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <ArrowLeftRight className="w-5 h-5 text-orange-400" />
              <h3 className="font-bold text-base text-white">Recent Stock Activity</h3>
            </div>
            <button
              onClick={() => onNavigate('stock')}
              className="text-xs text-orange-400 hover:text-orange-300 font-semibold"
            >
              Full Movement Log →
            </button>
          </div>

          <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
            {recentActivity.slice(0, 6).map((move) => (
              <div
                key={move.id}
                className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60 flex items-start justify-between gap-3 text-xs"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        move.movement_type === 'Stock In'
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : move.movement_type === 'Stock Out'
                          ? 'bg-orange-500/20 text-orange-400'
                          : 'bg-blue-500/20 text-blue-400'
                      }`}
                    >
                      {move.movement_type}
                    </span>
                    <strong className="text-white font-semibold">{move.medicine_name}</strong>
                    <span className="font-mono text-slate-400 text-[11px]">Batch {move.batch_number}</span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1 italic">
                    "{move.reason}"
                  </p>
                  <p className="text-[10px] text-slate-500 mt-1">
                    Logged by {move.staff_name} • {new Date(move.timestamp).toLocaleDateString()}
                  </p>
                </div>

                <div className="text-right shrink-0">
                  <span className="text-sm font-bold text-white">
                    {move.movement_type === 'Stock Out' ? `-${move.quantity}` : `+${move.quantity}`}
                  </span>
                  <p className="text-[10px] text-slate-400">
                    {move.previous_quantity} → {move.new_quantity}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
