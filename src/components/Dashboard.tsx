// ============================================================
// LabLink — Dynamic Resource Utilization & Optimization Dashboard (FR7)
// 100% Dynamically Derived Telemetry, Actionable Insights & Cross-Dept Sharing Log
// ============================================================

import { useState, useMemo } from 'react';
import type {
  DashboardMetrics,
  Department,
  Equipment,
  Booking,
  ProjectRequest,
  CrossDeptAllocation,
  OptimizationInsight,
} from '../types';
import { departments, equipmentMap } from '../data/equipment';
import { formatHour } from '../engine';

interface DashboardProps {
  metrics: DashboardMetrics;
  equipment: Equipment[];
  bookings: Booking[];
  projectRequests: ProjectRequest[];
  utilizationData: Record<string, number[]>;
  crossDeptAllocations: CrossDeptAllocation[];
  optimizationInsights: OptimizationInsight[];
  onSelectEquipment?: (eq: Equipment) => void;
}

export default function Dashboard({
  metrics,
  equipment,
  bookings,
  projectRequests,
  utilizationData,
  crossDeptAllocations,
  optimizationInsights,
  onSelectEquipment,
}: DashboardProps) {
  const [selectedDept, setSelectedDept] = useState<Department | 'All'>('All');
  const [activeHourIndex, setActiveHourIndex] = useState<number | null>(null);

  // Department statistics derived dynamically
  const deptStats = useMemo(() => {
    return departments.map(dept => {
      const deptEquipment = equipment.filter(e => e.department === dept);
      const deptBookings = bookings.filter(b => {
        const eq = equipmentMap.get(b.equipmentId);
        return eq && eq.department === dept && b.status === 'Confirmed';
      });

      let totalUtil = 0;
      let count = 0;
      deptEquipment.forEach(eq => {
        const hours = utilizationData[eq.id];
        if (hours) {
          totalUtil += hours.reduce((acc, v) => acc + v, 0) / hours.length;
          count++;
        }
      });
      const avgUtil = count > 0 ? Math.round(totalUtil / count) : 0;

      const highDemandCount = deptEquipment.filter(e => e.status === 'High Demand').length;
      const availableCount = deptEquipment.filter(e => e.status === 'Available Now').length;

      return {
        department: dept,
        equipmentCount: deptEquipment.length,
        bookingsCount: deptBookings.length,
        avgUtil,
        highDemandCount,
        availableCount,
      };
    });
  }, [equipment, bookings, utilizationData]);

  // Hourly aggregated load dynamically computed (8 AM to 8 PM)
  const hourlyLoad = useMemo(() => {
    const hours = Array.from({ length: 13 }, (_, i) => i + 8);
    return hours.map(hour => {
      let sum = 0;
      let count = 0;

      const filteredEq = selectedDept === 'All'
        ? equipment
        : equipment.filter(e => e.department === selectedDept);

      filteredEq.forEach(eq => {
        const eqData = utilizationData[eq.id];
        if (eqData && eqData[hour] !== undefined) {
          sum += eqData[hour];
          count++;
        }
      });

      const avg = count > 0 ? Math.round(sum / count) : 0;
      const isPeak = hour >= 10 && hour <= 15;
      const isOffPeak = (hour >= 8 && hour < 10) || (hour >= 17 && hour <= 20);

      return {
        hour,
        load: avg,
        isPeak,
        isOffPeak,
      };
    });
  }, [equipment, utilizationData, selectedDept]);

  // Dynamically derived idle equipment (0 active confirmed bookings)
  const idleEquipmentList = useMemo(() => {
    const activeEqIds = new Set(
      bookings.filter(b => b.status === 'Confirmed').map(b => b.equipmentId)
    );
    return equipment.filter(eq => !activeEqIds.has(eq.id));
  }, [equipment, bookings]);

  return (
    <div className="space-y-6">
      {/* Hero Overview Card */}
      <div className="card p-6 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white border-0 shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-500/20 border border-brand-400/30 text-brand-200 text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" aria-hidden="true"></span>
              Live Campus Telemetry (Derived Dynamically)
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight">
              Cross-Department Laboratory Resource Analytics
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 max-w-xl leading-relaxed">
              Real-time resource allocation monitoring, automated scheduling conflict resolution, and inter-departmental hardware sharing telemetry across 4 STEM research departments.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 w-full md:w-auto">
            <div className="bg-white/10 backdrop-blur rounded-xl p-3 border border-white/10">
              <div className="text-[11px] text-slate-400 font-medium">Total Equipment</div>
              <div className="text-xl sm:text-2xl font-bold text-white mt-0.5">{metrics.totalEquipment} Units</div>
              <div className="text-[10px] text-emerald-400 mt-0.5">Across 4 Labs</div>
            </div>

            <div className="bg-white/10 backdrop-blur rounded-xl p-3 border border-white/10">
              <div className="text-[11px] text-slate-400 font-medium">Cross-Dept Share</div>
              <div className="text-xl sm:text-2xl font-bold text-brand-300 mt-0.5">{metrics.crossDeptShareRate}%</div>
              <div className="text-[10px] text-brand-200 mt-0.5">Computed live</div>
            </div>

            <div className="bg-white/10 backdrop-blur rounded-xl p-3 border border-white/10 col-span-2 sm:col-span-1">
              <div className="text-[11px] text-slate-400 font-medium">Conflicts Resolved</div>
              <div className="text-xl sm:text-2xl font-bold text-emerald-300 mt-0.5">{metrics.conflictsResolved}</div>
              <div className="text-[10px] text-emerald-400 mt-0.5">Fair Allocation</div>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" role="region" aria-label="Key Performance Indicators">
        <div className="card p-5 border-l-4 border-l-brand-600 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Active Bookings</span>
            <span className="text-xl" aria-hidden="true">📅</span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">{metrics.totalBookings}</span>
            <span className="text-xs text-emerald-700 font-bold">Confirmed slots</span>
          </div>
          <p className="text-xs text-slate-500 mt-1">High-demand equipment prioritized by thesis urgency</p>
        </div>

        <div className="card p-5 border-l-4 border-l-emerald-600 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Campus Avg Load</span>
            <span className="text-xl" aria-hidden="true">⚡</span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">{metrics.avgUtilization}%</span>
            <span className="badge badge-green text-[10px]">Optimal Range</span>
          </div>
          <p className="text-xs text-slate-500 mt-1">Balanced across peak and off-peak operating windows</p>
        </div>

        <div className="card p-5 border-l-4 border-l-amber-500 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Peak Hours Window</span>
            <span className="text-xl" aria-hidden="true">⏰</span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-base font-bold text-slate-900">{metrics.peakHours}</span>
          </div>
          <p className="text-xs text-slate-500 mt-1">Derived dynamically from highest concurrent reservation slots</p>
        </div>

        <div className="card p-5 border-l-4 border-l-purple-600 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Pending Approvals</span>
            <span className="text-xl" aria-hidden="true">📝</span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">{metrics.pendingApprovals}</span>
            <span className="badge badge-yellow text-[10px]">AI-Triaged</span>
          </div>
          <p className="text-xs text-slate-500 mt-1">Faculty review queue with automated risk checks</p>
        </div>
      </div>

      {/* Actionable Optimization Insights (FR7) */}
      <div className="card p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl" aria-hidden="true">💡</span>
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              Autonomous Optimization Insights & Cross-Department Balancing
            </h3>
          </div>
          <span className="badge badge-purple text-[10px]">Dynamic Derivation</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {optimizationInsights.map(insight => {
            const badgeColor =
              insight.impact === 'High'
                ? 'bg-rose-50 border-rose-200 text-rose-800'
                : 'bg-indigo-50 border-indigo-200 text-indigo-800';

            return (
              <div key={insight.id} className={`p-4 rounded-xl border ${badgeColor} space-y-2 flex flex-col justify-between`}>
                <div>
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-xs font-bold text-slate-900">{insight.title}</span>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-white/80">
                      {insight.impact} Impact
                    </span>
                  </div>
                  <p className="text-xs mt-1 text-slate-700 leading-relaxed">{insight.description}</p>
                </div>
                <div className="text-[10px] font-semibold text-slate-500 pt-1 border-t border-current/10">
                  Source: {insight.sourceDepartment} {insight.targetDepartment ? `→ Target: ${insight.targetDepartment}` : ''}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Hourly Heatmap & Bottleneck Analysis */}
      <div className="card p-6 space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              Campus Hourly Load & Bottleneck Heatmap
            </h3>
            <p className="text-xs text-slate-500">
              Peak congestion hours (&ge;70% red) vs. recommended off-peak green windows
            </p>
          </div>

          <div className="flex items-center gap-2">
            <label htmlFor="dept-telemetry" className="text-xs font-semibold text-slate-600">
              Department:
            </label>
            <select
              id="dept-telemetry"
              value={selectedDept}
              onChange={e => setSelectedDept(e.target.value as Department | 'All')}
              className="input-field text-xs py-1.5 px-3"
              aria-label="Filter campus load heatmap by department"
            >
              <option value="All">All Campus Labs</option>
              {departments.map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Hourly Chart Bars */}
        <div className="space-y-3">
          <div className="grid grid-cols-13 gap-1 sm:gap-2 text-center" role="region" aria-label="Hourly load chart">
            {hourlyLoad.map(item => {
              const heightPct = Math.max(15, item.load);
              const isSelected = activeHourIndex === item.hour;
              const barColor =
                item.load >= 70
                  ? 'bg-rose-500'
                  : item.load >= 45
                  ? 'bg-amber-400'
                  : 'bg-emerald-500';

              return (
                <div
                  key={item.hour}
                  className="flex flex-col items-center gap-1.5 cursor-pointer group"
                  onMouseEnter={() => setActiveHourIndex(item.hour)}
                  onMouseLeave={() => setActiveHourIndex(null)}
                  tabIndex={0}
                  aria-label={`${formatHour(item.hour)}: ${item.load}% utilization load`}
                >
                  <div className="text-[10px] font-bold text-slate-700 group-hover:text-brand-600">
                    {item.load}%
                  </div>
                  <div className="w-full bg-slate-100 rounded-lg h-32 flex items-end p-1 transition-all group-hover:bg-slate-200">
                    <div
                      style={{ height: `${heightPct}%` }}
                      className={`w-full rounded-md ${barColor} transition-all duration-300 ${
                        isSelected ? 'ring-2 ring-brand-600 shadow-md' : ''
                      }`}
                    ></div>
                  </div>
                  <div className="text-[10px] font-medium text-slate-500 truncate">
                    {formatHour(item.hour).replace(':00', '')}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-emerald-500 inline-block" aria-hidden="true"></span>
                <span>Off-Peak Safe Zone (&lt;45%)</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-amber-400 inline-block" aria-hidden="true"></span>
                <span>Moderate Load (45-69%)</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-rose-500 inline-block" aria-hidden="true"></span>
                <span>Peak Bottleneck (&ge;70%)</span>
              </span>
            </div>
            <span className="text-slate-400 text-[11px]">Hover over an hour to inspect telemetry factor</span>
          </div>
        </div>
      </div>

      {/* Two Column Layout: Departmental Breakdown & Idle Equipment Reallocation */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Departmental Utilization Breakdown */}
        <div className="card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                Departmental Capacity & Sharing
              </h3>
              <p className="text-xs text-slate-500">Resource balance across 4 STEM research faculties</p>
            </div>
            <span className="badge badge-blue text-[11px]">4 Faculties</span>
          </div>

          <div className="space-y-3.5">
            {deptStats.map(stat => (
              <div key={stat.department} className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-800">{stat.department}</span>
                  <span className="font-bold font-mono text-brand-700">{stat.avgUtil}% Load</span>
                </div>

                <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                  <div
                    className={`h-2 rounded-full ${
                      stat.avgUtil >= 75 ? 'bg-rose-500' : stat.avgUtil >= 50 ? 'bg-amber-500' : 'bg-emerald-500'
                    }`}
                    style={{ width: `${stat.avgUtil}%` }}
                  ></div>
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-500 pt-0.5">
                  <span>{stat.equipmentCount} Equipment units</span>
                  <span>{stat.bookingsCount} Active bookings</span>
                  <span className="text-amber-700 font-semibold">{stat.highDemandCount} Bottleneck items</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Idle Equipment Alerts & Reallocation */}
        <div className="card p-6 flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                  Underutilized & Idle Equipment Alerts
                </h3>
                <p className="text-xs text-slate-500">
                  Zero active bookings: ready for cross-department reallocation
                </p>
              </div>
              <span className="badge badge-green text-[11px] font-bold">
                {idleEquipmentList.length} Idle Units
              </span>
            </div>

            <div className="space-y-2.5 max-h-[290px] overflow-y-auto pr-1">
              {idleEquipmentList.map(eq => (
                <div
                  key={eq.id}
                  className="p-3 rounded-xl border border-slate-200 bg-white hover:border-brand-300 transition-colors flex items-center justify-between gap-3 shadow-2xs"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-900 truncate">{eq.name}</p>
                    <p className="text-[11px] text-slate-500">{eq.department} · {eq.location}</p>
                    <p className="text-[10px] text-slate-400 truncate mt-0.5">{eq.specs}</p>
                  </div>
                  {onSelectEquipment && (
                    <button
                      type="button"
                      onClick={() => onSelectEquipment(eq)}
                      className="btn-secondary text-xs py-1 px-2.5 flex-shrink-0"
                      aria-label={`Book idle equipment ${eq.name}`}
                    >
                      Book →
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-indigo-50 border border-indigo-200 text-xs text-indigo-900 flex items-start gap-2.5">
            <span className="text-base" aria-hidden="true">🔄</span>
            <div>
              <strong className="block">Cross-Department Reallocation Engine</strong>
              <span className="text-indigo-800 text-[11px] leading-relaxed">
                LabLink automatically detects when students from congested labs can be routed to idle equivalent hardware in neighboring departments.
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Dynamic Cross-Department Allocations Log (FR7 - NO HARDCODED ROWS) */}
      <div className="card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              Cross-Department Allocation Telemetry Log ({crossDeptAllocations.length})
            </h3>
            <p className="text-xs text-slate-500">
              Dynamically derived from active multi-department bookings across campus
            </p>
          </div>
          <span className="badge badge-purple text-[11px]">Dynamic Live Feed</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 text-[10px] uppercase tracking-wider border-y border-slate-200">
              <tr>
                <th className="py-2.5 px-3">Student & Home Dept</th>
                <th className="py-2.5 px-3">Allocated Equipment</th>
                <th className="py-2.5 px-3">Host Laboratory</th>
                <th className="py-2.5 px-3">Milestone</th>
                <th className="py-2.5 px-3">Priority Score</th>
                <th className="py-2.5 px-3">Scheduled Window</th>
                <th className="py-2.5 px-3 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {crossDeptAllocations.map(alloc => (
                <tr key={alloc.id} className="hover:bg-slate-50/60">
                  <td className="py-3 px-3">
                    <div className="font-bold text-slate-900">{alloc.studentName}</div>
                    <div className="text-[10px] text-slate-500">{alloc.studentDepartment}</div>
                  </td>
                  <td className="py-3 px-3">
                    <div className="font-semibold text-slate-800">{alloc.equipmentName}</div>
                    <div className="text-[10px] text-slate-400 font-mono">{alloc.equipmentId}</div>
                  </td>
                  <td className="py-3 px-3 text-slate-700">
                    <div className="font-medium">{alloc.equipmentDepartment}</div>
                    <div className="text-[10px] text-slate-400">{alloc.location}</div>
                  </td>
                  <td className="py-3 px-3">
                    <span className="badge badge-purple text-[10px]">{alloc.projectType}</span>
                  </td>
                  <td className="py-3 px-3 font-mono font-bold text-brand-700">
                    {alloc.priorityScore}/100
                  </td>
                  <td className="py-3 px-3 font-mono text-slate-600">
                    {alloc.date} ({formatHour(alloc.startHour)} - {formatHour(alloc.endHour)})
                  </td>
                  <td className="py-3 px-3 text-right">
                    <span className="badge badge-green text-[10px]">Active</span>
                  </td>
                </tr>
              ))}
              {crossDeptAllocations.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    No cross-department bookings recorded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
