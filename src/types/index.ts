// ============================================================
// LabLink — Core Type Definitions
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

export type ApprovalStatus = 'Pending' | 'Approved' | 'Approved with Modification' | 'Rejected';

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
  endHour: number;           // 0-23
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
  priority: number;         // Computed priority score
  createdAt: string;
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

export interface ConflictResult {
  hasConflict: boolean;
  conflictingBookings: Booking[];
  recommendations: ConflictRecommendation[];
}

export interface ConflictRecommendation {
  type: 'alternative-slot' | 'cross-department' | 'split-slot';
  title: string;
  description: string;
  priority: number;
  suggestedSlot?: TimeSlot;
  suggestedEquipmentId?: string;
  suggestedEquipmentName?: string;
  confidence: number;      // 0-100
}

export interface UtilizationData {
  department: Department;
  equipmentId: string;
  equipmentName: string;
  date: string;
  hourlyUtilization: number[];  // 24 entries, 0-100 for each hour
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
