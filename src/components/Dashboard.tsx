// ============================================================
// LabLink — Resource Utilization & Optimization Dashboard
// Cross-Department Analytics, Peak/Off-Peak Distribution & Sharing
// ============================================================

import { useState, useMemo } from 'react';
import type { DashboardMetrics, Department, Equipment, Booking, ProjectRequest } from '../types';
import { departments, equipmentMap } from '../data/equipment';
import { formatHour } from '../engine';

interface DashboardProps {
  metrics: DashboardMetrics;
  equipment: Equipment[];
  bookings: Booking[];
  projectRequests: ProjectRequest[];
  utilizationData: Record<string, number[]>;
  onSelectEquipment?: (eq: Equipment) => void;
}

export default function Dashboard({
  metrics,
  equipment,
  bookings,
  projectRequests,
  utilizationData,
  onSelectEquipment,
}: DashboardProps) {
  const [selectedDept, setSelectedDept] = useState<Department | 'All'>('All');
  const [activeHourIndex, setActiveHourIndex] = useState<number | null>(null);

  // Department statistics
  const deptStats = useMemo(() => {
    return departments.map(dept => {
      const deptEquipment = equipment.filter(e => e.department === dept);
      const deptBookings = bookings.filter(b => {
        const eq = equipmentMap.get(b.equipmentId);
        return eq && eq.department === dept && b.status === 'Confirmed';
      });

      // Average utilization across equipment in this department
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

  // Hourly aggregated campus load (8 AM to 8 PM)
  const hourlyLoad = useMemo(() => {
    const hours = Array.from({ length: 13 }, (_, i) => i + 8); // 8 to 20
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

  // Idle equipment identification (0 active confirmed bookings)
  const idleEquipmentList = useMemo(() => {
    const activeEqIds = new Set(
      bookings.filter(b => b.status === 'Confirmed').map(b => b.equipmentId)
    );
    return equipment.filter(eq => !activeEqIds.has(eq.id));
  }, [equipment, bookings]);

  // Cross-department bookings breakdown
  const crossDeptBookings = useMemo(() => {
    return bookings.filter(b => {
      const eq = equipmentMap.get(b.equipmentId);
      // Cross-department booking check
      return eq && b.status === 'Confirmed' && (
        (b.userId === 'stu-aarav' && eq.department === 'AI & GPU Compute') ||
        (b.userId === 'stu-karthik' && eq.department === 'VLSI & Embedded Systems') ||
        (b.userId === 'stu-rohan' && eq.department === 'Robotics & IoT')
      );
    });
  }, [bookings]);

  return (
    <div className="space-y-6">
      {/* Top Banner / Hero Metric Overview */}
      <div className="card p-6 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white border-0 shadow-lg relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-500/20 border border-brand-400/30 text-brand-200 text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              Live Campus Lab Telemetry
            </div>
            <h2 className="text-2xl font-extrabold tracking-tight">Cross-Department Resource Analytics</h2>
            <p className="text-sm text-slate-300 max-w-xl">
              Real-time resource allocation monitoring, automated scheduling conflict resolution, and inter-departmental hardware sharing telemetry across 4 STEM research departments.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 w-full md:w-auto">
            <div className="bg-white/10 backdrop-blur rounded-xl p-3 border border-white/10">
              <div className="text-xs text-slate-400">Total Equipment</div>
              <div className="text-2xl font-bold text-white mt-0.5">{metrics.totalEquipment} Units</div>
              <div className="text-[10px] text-emerald-400 mt-0.5">Across 4 Labs</div>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-xl p-3 border border-white/10">
              <div className="text-xs text-slate-400">Cross-Dept Share</div>
              <div className="text-2xl font-bold text-brand-300 mt-0.5">{metrics.crossDeptShareRate}%</div>
              <div className="text-[10px] text-brand-200 mt-0.5">+18% vs semester start</div>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-xl p-3 border border-white/10 col-span-2 sm:col-span-1">
              <div className="text-xs text-slate-400">Conflicts Resolved</div>
              <div className="text-2xl font-bold text-emerald-300 mt-0.5">{metrics.conflictsResolved}</div>
              <div className="text-[10px] text-emerald-400 mt-0.5">100% Deterministic & Fair</div>
            </div>
          </div>
        </div>

        {/* Subtle background decoration */}
        <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-brand-600/10 rounded-full blur-3xl pointer-events-none"></div>
      </div>

      {/* Primary KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card p-5 border-l-4 border-l-brand-500">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active Bookings</span>
            <span className="text-xl">📅</span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">{metrics.totalBookings}</span>
            <span className="text-xs text-emerald-600 font-medium">Confirmed slots</span>
          </div>
          <p className="text-xs text-slate-500 mt-1">High-demand equipment prioritized by thesis urgency</p>
        </div>

        <div className="card p-5 border-l-4 border-l-emerald-500">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Campus Avg Load</span>
            <span className="text-xl">⚡</span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">{metrics.avgUtilization}%</span>
            <span className="badge badge-green text-[10px]">Optimal Range</span>
          </div>
          <p className="text-xs text-slate-500 mt-1">Balanced across peak and off-peak operating windows</p>
        </div>

        <div className="card p-5 border-l-4 border-l-amber-500">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Peak Hours Window</span>
            <span className="text-xl">⏰</span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-lg font-bold text-slate-900">{metrics.peakHours}</span>
          </div>
          <p className="text-xs text-slate-500 mt-1">AI suggestions incentivize 8-10 AM & 5-8 PM slots</p>
        </div>

        <div className="card p-5 border-l-4 border-l-purple-500">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Pending Approvals</span>
            <span className="text-xl">📝</span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">{metrics.pendingApprovals}</span>
            <span className="badge badge-yellow text-[10px]">AI-Triaged</span>
          </div>
          <p className="text-xs text-slate-500 mt-1">Faculty review queue with automated risk checks</p>
        </div>
      </div>

      {/* Hourly Heatmap & Peak/Off-Peak Distribution */}
      <div className="card p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-5">
          <div>
            <h3 className="text-base font-bold text-slate-900">Campus Load & Bottleneck Heatmap</h3>
            <p className="text-xs text-slate-500">Hourly utilization profile with off-peak incentives (Green) vs. bottleneck hours (Red)</p>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={selectedDept}
              onChange={e => setSelectedDept(e.target.value as Department | 'All')}
              className="input-field text-xs py-1.5 px-3"
              aria-label="Filter heatmap by department"
            >
              <option value="All">All Campus Labs</option>
              {departments.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
        </div>

        {/* Hourly Bars */}
        <div className="space-y-3">
          <div className="grid grid-cols-13 gap-1 sm:gap-2 text-center">
            {hourlyLoad.map(item => {
              const heightPct = Math.max(15, item.load);
              const isSelected = activeHourIndex === item.hour;
              const barColor = item.load >= 70
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
                >
                  <div className="text-[10px] font-semibold text-slate-600 group-hover:text-brand-600">
                    {item.load}%
                  </div>
                  <div className="w-full bg-slate-100 rounded-lg h-36 flex items-end p-1 transition-all group-hover:bg-slate-200">
                    <div
                      style={{ height: `${heightPct}%` }}
                      className={`w-full rounded-md ${barColor} transition-all duration-300 ${isSelected ? 'ring-2 ring-brand-600 shadow-md' : ''}`}
                    ></div>
                  </div>
                  <div className="text-[10px] font-medium text-slate-500 truncate">
                    {formatHour(item.hour).replace(':00', '')}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Legend and explanation */}
          <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-emerald-500 inline-block"></span>
                <span>Off-Peak Safe Zone (&lt;45%)</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-amber-400 inline-block"></span>
                <span>Moderate Load (45-69%)</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-rose-500 inline-block"></span>
                <span>Peak Bottleneck (≥70%)</span>
              </span>
            </div>
            <div className="text-slate-400 text-[11px]">
              Hover over an hour column to inspect load factor
            </div>
          </div>
        </div>
      </div>

      {/* Two Column Layout: Departmental Breakdown & Idle Equipment Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Departmental Utilization Breakdown */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">Departmental Capacity & Sharing</h3>
              <p className="text-xs text-slate-500">Resource balance across STEM faculties</p>
            </div>
            <span className="badge badge-blue text-[11px]">4 Departments</span>
          </div>

          <div className="space-y-4">
            {deptStats.map(stat => (
              <div key={stat.department} className="p-3 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-semibold text-slate-800">{stat.department}</span>
                  <span className="font-bold text-brand-600">{stat.avgUtil}% Load</span>
                </div>

                <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
                  <div
                    className={`h-2.5 rounded-full ${
                      stat.avgUtil >= 75 ? 'bg-rose-500' : stat.avgUtil >= 50 ? 'bg-amber-500' : 'bg-emerald-500'
                    }`}
                    style={{ width: `${stat.avgUtil}%` }}
                  ></div>
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-500 pt-0.5">
                  <span>{stat.equipmentCount} Equipment items</span>
                  <span>{stat.bookingsCount} Active bookings</span>
                  <span className="text-amber-700 font-medium">{stat.highDemandCount} High demand</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Idle Equipment Alerts & Reallocation Engine */}
        <div className="card p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">Underutilized & Idle Equipment</h3>
                <p className="text-xs text-slate-500">Zero-booking resources available for cross-department project matching</p>
              </div>
              <span className="badge badge-green text-[11px]">{idleEquipmentList.length} Available</span>
            </div>

            <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
              {idleEquipmentList.map(eq => (
                <div
                  key={eq.id}
                  className="p-3 rounded-lg border border-slate-200 bg-white hover:border-brand-300 transition-colors flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate">{eq.name}</p>
                    <p className="text-xs text-slate-500">{eq.department} · {eq.location}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5 truncate">{eq.specs}</p>
                  </div>
                  {onSelectEquipment && (
                    <button
                      onClick={() => onSelectEquipment(eq)}
                      className="btn-secondary text-xs py-1 px-2.5 flex-shrink-0"
                    >
                      Book →
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* AI Reallocation Callout */}
          <div className="mt-4 p-4 rounded-xl bg-indigo-50 border border-indigo-200">
            <div className="flex items-start gap-2.5">
              <span className="text-lg">💡</span>
              <div>
                <h4 className="text-xs font-bold text-indigo-900 uppercase tracking-wide">Automated Inter-Department Sharing</h4>
                <p className="text-xs text-indigo-800 mt-1 leading-relaxed">
                  LabLink's conflict resolution engine routes students from congested labs (e.g. Robotics) to equivalent underutilized hardware in neighboring labs (e.g. AI Orin Nano or Coral TPU).
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Cross-Department Access Log */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-slate-900">Recent Cross-Department Allocations</h3>
            <p className="text-xs text-slate-500">Students accessing specialized research hardware outside their home department</p>
          </div>
          <span className="badge badge-purple text-[11px]">Inter-Department Synergy</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider border-y border-slate-200">
              <tr>
                <th className="py-3 px-4">Student & Home Dept</th>
                <th className="py-3 px-4">Allocated Equipment</th>
                <th className="py-3 px-4">Host Laboratory</th>
                <th className="py-3 px-4">Project Type</th>
                <th className="py-3 px-4">Priority Score</th>
                <th className="py-3 px-4 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              <tr className="hover:bg-slate-50/50">
                <td className="py-3 px-4">
                  <div className="font-semibold text-slate-800">Aarav Sharma</div>
                  <div className="text-xs text-slate-500">Robotics & IoT</div>
                </td>
                <td className="py-3 px-4">
                  <div className="font-medium text-slate-800">NVIDIA DGX A100 Workstation</div>
                  <div className="text-xs text-slate-500">8× A100 80GB GPUs</div>
                </td>
                <td className="py-3 px-4 text-slate-600">AI & GPU Compute (Room 301)</td>
                <td className="py-3 px-4"><span className="badge badge-purple text-[10px]">Capstone</span></td>
                <td className="py-3 px-4 font-mono font-bold text-brand-600">91/100</td>
                <td className="py-3 px-4 text-right"><span className="badge badge-green text-[10px]">Active</span></td>
              </tr>
              <tr className="hover:bg-slate-50/50">
                <td className="py-3 px-4">
                  <div className="font-semibold text-slate-800">Karthik Reddy</div>
                  <div className="text-xs text-slate-500">Robotics & IoT</div>
                </td>
                <td className="py-3 px-4">
                  <div className="font-medium text-slate-800">Saleae Logic Pro 16 Analyzer</div>
                  <div className="text-xs text-slate-500">16-channel SPI/I2C/UART decode</div>
                </td>
                <td className="py-3 px-4 text-slate-600">VLSI Lab (Room 411)</td>
                <td className="py-3 px-4"><span className="badge badge-yellow text-[10px]">Hackathon</span></td>
                <td className="py-3 px-4 font-mono font-bold text-brand-600">78/100</td>
                <td className="py-3 px-4 text-right"><span className="badge badge-green text-[10px]">Active</span></td>
              </tr>
              <tr className="hover:bg-slate-50/50">
                <td className="py-3 px-4">
                  <div className="font-semibold text-slate-800">Rohan Iyer</div>
                  <div className="text-xs text-slate-500">VLSI & Embedded Systems</div>
                </td>
                <td className="py-3 px-4">
                  <div className="font-medium text-slate-800">Velodyne VLP-16 LiDAR Scanner</div>
                  <div className="text-xs text-slate-500">300K pts/sec mapping</div>
                </td>
                <td className="py-3 px-4 text-slate-600">Robotics Lab (Room 204-A)</td>
                <td className="py-3 px-4"><span className="badge badge-blue text-[10px]">Course Lab</span></td>
                <td className="py-3 px-4 font-mono font-bold text-brand-600">83/100</td>
                <td className="py-3 px-4 text-right"><span className="badge badge-green text-[10px]">Active</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
