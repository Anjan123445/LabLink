// ============================================================
// LabLink — Core Type Definitions (Strict & Extended)
// ============================================================

export type Department = 
  | 'Robotics & IoT'
  | 'AI & GPU Compute'
  | 'VLSI & Embedded Systems'
  | 'Bio-Instrumentation';

export type EquipmentCategory =
  | 'GPU Workstation'
  | 'Dev Kit'
  | 'Oscilloscope & Hardware'
  | 'Fabrication'
  | 'Sensor & Actuator'
  | 'Compute Cluster'
  | 'Measurement & Analysis';

export type AvailabilityStatus = 'Available Now' | 'High Demand' | 'In Maintenance';

export type ProjectType = 'Capstone' | 'Hackathon' | 'Course Lab' | 'Research' | 'Personal';

export type BookingStatus = 'Confirmed' | 'Pending' | 'Conflict' | 'Cancelled';

export type ApprovalStatus = 
  | 'Pending' 
  | 'Approved' 
  | 'Approved with Modification' 
  | 'Changes Requested' 
  | 'Rejected';

export type UserRole = 'student' | 'faculty' | 'admin';

export interface Equipment {
  id: string;
  name: string;
  department: Department;
  category: EquipmentCategory;
  status: AvailabilityStatus;
  location: string;
  specs: string;
  prerequisites: string[];
  substitutes: string[];        // IDs of equivalent equipment in other departments
  maxDailyHours: number;
  imageUrl?: string;
  tags: string[];
}

export interface TimeSlot {
  date: string;             // YYYY-MM-DD
  startHour: number;        // 0-23
  endHour: number;          // 0-23
}

export interface Booking {
  id: string;
  equipmentId: string;
  userId: string;
  userName: string;
  projectId?: string;
  projectType: ProjectType;
  slot: TimeSlot;
  status: BookingStatus;
  priority: number;         // Computed priority score (0-100)
  createdAt: string;
  conflictResolvedVia?: string;
}

export interface ProjectRequest {
  id: string;
  title: string;
  description: string;
  userId: string;
  userName: string;
  teamMembers: string[];
  facultyMentor: string;
  deadline: string;         // ISO date string
  projectType: ProjectType;
  requiredEquipment: string[];  // Equipment IDs
  requiredHours: number;
  justification: string;
  approvalStatus: ApprovalStatus;
  facultyFeedback?: string;
  aiTriageBrief?: string;
  createdAt: string;
}

export interface User {
  id: string;
  name: string;
  role: UserRole;
  department: Department;
  title: string;
  avatarInitials: string;
  completedSafety: string[];
  totalBookingHours: number;
  activeBookings: number;
}

export interface PriorityBreakdown {
  deadlineScore: number;
  deadlineWeighted: number;
  projectTypeScore: number;
  projectTypeWeighted: number;
  fairnessScore: number;
  fairnessWeighted: number;
  criticalityScore: number;
  criticalityWeighted: number;
  totalScore: number;
}

export interface ConflictResult {
  hasConflict: boolean;
  conflictingBookings: Booking[];
  recommendations: ConflictRecommendation[];
  incomingBreakdown?: PriorityBreakdown;
  conflictingBreakdown?: PriorityBreakdown;
}

export interface ConflictRecommendation {
  type: 'alternative-slot' | 'cross-department' | 'split-slot' | 'faculty-arbitration';
  title: string;
  description: string;
  priority: number;
  suggestedSlot?: TimeSlot;
  suggestedEquipmentId?: string;
  suggestedEquipmentName?: string;
  targetBookingId?: string;
  adjustedExistingSlot?: TimeSlot;
  confidence: number;      // 0-100
  reasoning?: string;
}

export interface UtilizationData {
  department: Department;
  equipmentId: string;
  equipmentName: string;
  date: string;
  hourlyUtilization: number[];  // 24 entries, 0-100 for each hour
}

export interface CrossDeptAllocation {
  id: string;
  studentName: string;
  studentDepartment: Department;
  equipmentName: string;
  equipmentId: string;
  equipmentDepartment: Department;
  location: string;
  projectType: ProjectType;
  priorityScore: number;
  status: 'Active' | 'Completed' | 'Pending';
  date: string;
  startHour: number;
  endHour: number;
}

export interface OptimizationInsight {
  id: string;
  type: 'idle-reallocation' | 'bottleneck-relief' | 'off-peak-incentive';
  title: string;
  description: string;
  sourceDepartment: Department;
  targetDepartment?: Department;
  equipmentId?: string;
  equipmentName?: string;
  impact: 'High' | 'Medium' | 'Low';
}

export interface DashboardMetrics {
  totalEquipment: number;
  totalBookings: number;
  conflictsResolved: number;
  crossDeptShareRate: number;   // percentage
  avgUtilization: number;       // percentage
  peakHours: string;
  idleEquipment: number;
  pendingApprovals: number;
}

export interface Persona {
  user: User;
  role: UserRole;
  label: string;
  description: string;
}

export type SyncMode = 'cloud' | 'local';

export interface SyncStatus {
  mode: SyncMode;
  label: string;
  detail: string;
  connected: boolean;
  lastSyncedAt?: string;
}
