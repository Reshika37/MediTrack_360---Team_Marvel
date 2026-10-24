import React from 'react';
import {
  ShieldAlert,
  Clock,
  Boxes,
  WifiOff,
  Zap,
  CheckCircle2,
  XCircle,
  ArrowRight,
  TrendingUp,
  HeartPulse,
  Sparkles,
  Layers,
  Calendar,
  AlertTriangle,
  Building,
  UserCheck
} from 'lucide-react';

interface LandingPageProps {
  onStartDemo: (role?: 'admin' | 'staff') => void;
  onOpenLogin: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onStartDemo,
  onOpenLogin
}) => {
  return (
    <div className="min-h-screen bg-[#0B1120] text-slate-100">
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-20 border-b border-slate-800">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(249,115,22,0.12),transparent_60%)] pointer-events-none" />
        
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-orange-500/10 border border-orange-500/30 text-orange-400 text-xs font-semibold mb-6">
            <Sparkles className="w-4 h-4" />
            <span>Healthcare Innovation for Rural & Community Clinics</span>
          </div>

          <button
            onClick={() => onStartDemo('admin')}
            title="Go to MediTrack 360 Dashboard"
            className="text-left group cursor-pointer block focus:outline-hidden"
          >
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-white max-w-4xl leading-[1.15] group-hover:text-orange-400 transition">
              MediTrack <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-amber-500">360</span>
            </h1>
          </button>
          <p className="mt-3 text-xl sm:text-2xl font-bold text-slate-200">
            Smart Medicine Expiry & Stock Tracker
          </p>
          <p className="mt-4 text-base sm:text-lg text-slate-400 max-w-2xl leading-relaxed">
            Helping small clinics and rural pharmacies manage medicines easily. Replaces handwritten registers with automated FEFO prioritization, proactive expiry countdowns, and reliable offline tracking.
          </p>

          {/* CTA Buttons */}
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <button
              onClick={() => onStartDemo('admin')}
              className="px-6 py-3.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-sm shadow-xl shadow-orange-600/30 transition flex items-center gap-2 cursor-pointer"
            >
              <span>Explore Demo as Admin</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => onStartDemo('staff')}
              className="px-6 py-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-sm border border-slate-700 transition flex items-center gap-2 cursor-pointer"
            >
              <span>Explore as Clinic Staff</span>
              <UserCheck className="w-4 h-4 text-orange-400" />
            </button>
            <button
              onClick={onOpenLogin}
              className="px-4 py-3.5 rounded-xl text-slate-400 hover:text-white text-sm font-medium transition cursor-pointer"
            >
              Staff Sign In →
            </button>
          </div>

          {/* Quick Metrics Banner */}
          <div className="mt-12 grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-2xl bg-slate-900/80 border border-slate-800">
            <div>
              <p className="text-2xl font-black text-orange-400">Zero</p>
              <p className="text-xs text-slate-400 mt-0.5">Accidental expired medicine dispenses</p>
            </div>
            <div>
              <p className="text-2xl font-black text-emerald-400">100%</p>
              <p className="text-xs text-slate-400 mt-0.5">FEFO batch recommendation compliance</p>
            </div>
            <div>
              <p className="text-2xl font-black text-amber-400">Offline</p>
              <p className="text-xs text-slate-400 mt-0.5">PWA works without continuous internet</p>
            </div>
            <div>
              <p className="text-2xl font-black text-blue-400">30s</p>
              <p className="text-xs text-slate-400 mt-0.5">Fast stock update per patient visit</p>
            </div>
          </div>
        </div>
      </section>

      {/* Problem Section */}
      <section className="py-16 border-b border-slate-800 bg-slate-950/50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="text-xs font-bold uppercase tracking-widest text-orange-400">The Problem</span>
            <h2 className="text-2xl sm:text-3xl font-bold text-white mt-2">
              Still managing medicines with notebooks and spreadsheets?
            </h2>
            <p className="text-slate-400 text-sm mt-3">
              Rural healthcare dispensaries and primary clinics handle hundreds of life-saving medicines, but legacy workflows cause severe operational bottlenecks.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition">
              <div className="w-10 h-10 rounded-xl bg-red-500/10 text-red-400 flex items-center justify-center mb-4">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-base text-white">Handwritten Registers</h3>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                Logbooks suffer from illegible handwriting, water spills, missed entries, and impossible search when auditing batch histories.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition">
              <div className="w-10 h-10 rounded-xl bg-orange-500/10 text-orange-400 flex items-center justify-center mb-4">
                <Clock className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-base text-white">Missed Expiry Dates</h3>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                Expired drugs hide in rear shelf boxes without notification, wasting budget and creating catastrophic patient safety risks.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center mb-4">
                <Boxes className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-base text-white">Unexpected Stockouts</h3>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                Critical medicines (ORS, antibiotics, insulin) run dry unnoticed until an emergency patient arrives at the dispensary.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center mb-4">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-base text-white">Time-Consuming Checks</h3>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                Manual weekly physical counting takes hours of valuable clinician time that should be spent caring for rural patients.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Solution Section */}
      <section className="py-16 border-b border-slate-800">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="text-xs font-bold uppercase tracking-widest text-orange-400">The Solution</span>
            <h2 className="text-2xl sm:text-3xl font-bold text-white mt-2">
              How MediTrack 360 Solves These Challenges
            </h2>
            <p className="text-slate-400 text-sm mt-3">
              Built specifically around the practical daily realities of small community health clinics.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800">
              <div className="w-10 h-10 rounded-xl bg-orange-500/10 text-orange-400 flex items-center justify-center mb-4">
                <Calendar className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white">Automated Expiry Alerts</h3>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                Multi-stage visual warning system (0-30 days critical, 31-50 days warning, expired quarantine) with instant notification banners.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800">
              <div className="w-10 h-10 rounded-xl bg-orange-500/10 text-orange-400 flex items-center justify-center mb-4">
                <Zap className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white">FEFO Stock Dispensing</h3>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                <strong>First Expire, First Out:</strong> Automatically flags and directs staff to dispense the earliest expiring batch first, minimizing spoilage.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800">
              <div className="w-10 h-10 rounded-xl bg-orange-500/10 text-orange-400 flex items-center justify-center mb-4">
                <WifiOff className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white">Offline PWA Resilience</h3>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                Works seamlessly during rural power and broadband blackouts. Changes queue locally and sync automatically when internet restores.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Existing Market Gap Comparison Table */}
      <section className="py-16 border-b border-slate-800 bg-slate-950/60">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="text-xs font-bold uppercase tracking-widest text-orange-400">Market Gap Analysis</span>
            <h2 className="text-2xl sm:text-3xl font-bold text-white mt-2">
              Why Existing Solutions Fail Rural Clinics
            </h2>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-800/80 text-slate-300 border-b border-slate-700">
                <tr>
                  <th className="p-4 font-bold">Existing Approach</th>
                  <th className="p-4 font-bold">Primary Failure & Limitation</th>
                  <th className="p-4 font-bold text-orange-400">MediTrack 360 Solution</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-300">
                <tr>
                  <td className="p-4 font-semibold text-white">Paper Registers</td>
                  <td className="p-4 text-red-400 flex items-center gap-1.5">
                    <XCircle className="w-4 h-4 shrink-0" />
                    Hard to update, fragile, impossible to search or calculate expiry countdowns.
                  </td>
                  <td className="p-4 text-emerald-400 font-medium">
                    Instant digital search, automated countdown, and zero handwriting confusion.
                  </td>
                </tr>
                <tr>
                  <td className="p-4 font-semibold text-white">Excel Sheets</td>
                  <td className="p-4 text-red-400 flex items-center gap-1.5">
                    <XCircle className="w-4 h-4 shrink-0" />
                    Manual data entry, error-prone cell formulas, no automated push alerts or FEFO logic.
                  </td>
                  <td className="p-4 text-emerald-400 font-medium">
                    Guided 1-click stock updates, automated threshold calculation, and FEFO prioritization.
                  </td>
                </tr>
                <tr>
                  <td className="p-4 font-semibold text-white">Enterprise Pharmacy ERPs</td>
                  <td className="p-4 text-red-400 flex items-center gap-1.5">
                    <XCircle className="w-4 h-4 shrink-0" />
                    Prohibitively expensive licenses, requires high-speed internet, too complex for rural staff.
                  </td>
                  <td className="p-4 text-emerald-400 font-medium">
                    Zero-cost open architecture, offline-capable PWA, simplified 3-click interface.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Impact Section */}
      <section className="py-16 border-b border-slate-800">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="text-xs font-bold uppercase tracking-widest text-orange-400">Real-World Impact</span>
            <h2 className="text-2xl sm:text-3xl font-bold text-white mt-2">
              Measurable Benefits for Primary Healthcare
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
              <TrendingUp className="w-6 h-6 text-orange-400 mb-3" />
              <h4 className="font-bold text-sm text-white">Reduce Medicine Waste</h4>
              <p className="text-xs text-slate-400 mt-1.5">
                Cuts expired drug dumping by up to 80% through FEFO dispensing recommendations.
              </p>
            </div>
            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
              <Clock className="w-6 h-6 text-orange-400 mb-3" />
              <h4 className="font-bold text-sm text-white">Save Staff Checking Time</h4>
              <p className="text-xs text-slate-400 mt-1.5">
                Replaces 4+ hours of weekly manual register audits with instantaneous real-time reports.
              </p>
            </div>
            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
              <Boxes className="w-6 h-6 text-orange-400 mb-3" />
              <h4 className="font-bold text-sm text-white">Prevent Stock Shortages</h4>
              <p className="text-xs text-slate-400 mt-1.5">
                Early low-stock alerts give rural clinics ample lead time to order before stockouts occur.
              </p>
            </div>
            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
              <HeartPulse className="w-6 h-6 text-orange-400 mb-3" />
              <h4 className="font-bold text-sm text-white">Improve Rural Patient Care</h4>
              <p className="text-xs text-slate-400 mt-1.5">
                Ensures villagers always receive safe, in-date, clinically verified medications.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Future Scope Roadmap */}
      <section className="py-16 border-b border-slate-800 bg-slate-950/40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Product Roadmap</span>
            <h2 className="text-2xl sm:text-3xl font-bold text-white mt-2">
              Future Scope (Labelled as Future Innovations)
            </h2>
            <p className="text-slate-400 text-xs mt-2">
              Planned future development phases identified in the MediTrack 360 engineering roadmap.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* Phase 2 */}
            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 relative overflow-hidden">
              <div className="absolute top-4 right-4 text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-orange-500/10 text-orange-400 border border-orange-500/30">
                Phase 2 Scope
              </div>
              <h3 className="text-lg font-bold text-white mb-3">Hardware & Accessibility Expansion</h3>
              <ul className="space-y-2.5 text-xs text-slate-300">
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                  <strong>Barcode & QR Scanner Integration:</strong> Scan 2D Datamatrix medicine strips with smartphone cameras.
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                  <strong>Multilingual Regional Support:</strong> Local languages (Kannada, Hindi, Tamil, Telugu, Marathi).
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                  <strong>Peer-to-Peer Bluetooth Sync:</strong> Sync dispensary stock between tablets without any cellular coverage.
                </li>
              </ul>
            </div>

            {/* Phase 3 */}
            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 relative overflow-hidden">
              <div className="absolute top-4 right-4 text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/30">
                Phase 3 Scope
              </div>
              <h3 className="text-lg font-bold text-white mb-3">Intelligence & Notification Pipelines</h3>
              <ul className="space-y-2.5 text-xs text-slate-300">
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                  <strong>Predictive Consumption Analytics:</strong> Forecast seasonal monsoon surges (dengue, malaria, ORS).
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                  <strong>Automated SMS & WhatsApp Alerts:</strong> Dispatch critical low-stock SMS alerts directly to depot supervisors.
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                  <strong>District Depot API Interconnect:</strong> Automated purchase order requisition into state health portals.
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Call to Action Footer */}
      <footer className="py-16 text-center">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="text-2xl sm:text-3xl font-black text-white">
            Ready to experience MediTrack 360?
          </h2>
          <p className="text-sm text-slate-400 mt-2">
            The application is preloaded with sample batches, FEFO recommendations, and real-time alerts.
          </p>
          <div className="mt-6 flex justify-center gap-4">
            <button
              onClick={() => onStartDemo('admin')}
              className="px-6 py-3 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs shadow-lg shadow-orange-600/30 transition cursor-pointer"
            >
              Open Live Dashboard
            </button>
            <button
              onClick={onOpenLogin}
              className="px-6 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs border border-slate-700 transition cursor-pointer"
            >
              Staff Sign In
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
};
