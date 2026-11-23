// ============================================================
// LabLink — Seed Bookings, Users, Project Requests & Personas
// ============================================================

import type { Booking, User, ProjectRequest, Persona, TimeSlot } from '../types';

// Helper: get dates relative to today
function getDateStr(daysOffset: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysOffset);
  return d.toISOString().split('T')[0];
}

// ── USERS ────────────────────────────────────────────────────
export const users: User[] = [
  {
    id: 'stu-aarav',
    name: 'Aarav Sharma',
    role: 'student',
    department: 'Robotics & IoT',
    title: 'Final Year CSE — Capstone Project',
    avatarInitials: 'AS',
    completedSafety: ['Lab Safety Induction', 'ROS2 Basics Certification', 'Drone Pilot License'],
    totalBookingHours: 42,
    activeBookings: 2,
  },
  {
    id: 'stu-priya',
    name: 'Priya Patel',
    role: 'student',
    department: 'AI & GPU Compute',
    title: '3rd Year AI/ML — Research Intern',
    avatarInitials: 'PP',
    completedSafety: ['GPU Cluster Usage Training', 'CUDA Basics'],
    totalBookingHours: 68,
    activeBookings: 3,
  },
  {
    id: 'stu-rohan',
    name: 'Rohan Iyer',
    role: 'student',
    department: 'VLSI & Embedded Systems',
    title: '4th Year ECE — Hardware Design',
    avatarInitials: 'RI',
    completedSafety: ['Oscilloscope Training', 'Verilog/VHDL Basics', 'Lab Safety Induction'],
    totalBookingHours: 35,
    activeBookings: 1,
  },
  {
    id: 'stu-ananya',
    name: 'Ananya Krishnan',
    role: 'student',
    department: 'Bio-Instrumentation',
    title: '4th Year Biomedical Eng — Thesis',
    avatarInitials: 'AK',
    completedSafety: ['Biosafety Level 2 Training', 'PCR Technique Workshop', 'Lab Safety Induction'],
    totalBookingHours: 28,
    activeBookings: 1,
  },
  {
    id: 'stu-karthik',
    name: 'Karthik Reddy',
    role: 'student',
    department: 'Robotics & IoT',
    title: '3rd Year Mech — Hackathon Team Lead',
    avatarInitials: 'KR',
    completedSafety: ['Lab Safety Induction', 'Robot Safety Training'],
    totalBookingHours: 15,
    activeBookings: 1,
  },
  {
    id: 'fac-meera',
    name: 'Dr. Meera Nair',
    role: 'faculty',
    department: 'Robotics & IoT',
    title: 'Lab Coordinator — Robotics & Embedded Systems',
    avatarInitials: 'MN',
    completedSafety: [],
    totalBookingHours: 0,
    activeBookings: 0,
  },
  {
    id: 'fac-rajesh',
    name: 'Prof. Rajesh Kumar',
    role: 'faculty',
    department: 'AI & GPU Compute',
    title: 'Lab Coordinator — AI Research Center',
    avatarInitials: 'RK',
    completedSafety: [],
    totalBookingHours: 0,
    activeBookings: 0,
  },
  {
    id: 'admin-sunita',
    name: 'Dr. Sunita Deshmukh',
    role: 'admin',
    department: 'Robotics & IoT',
    title: 'Director — Cross-Lab Resource Management',
    avatarInitials: 'SD',
    completedSafety: [],
    totalBookingHours: 0,
    activeBookings: 0,
  },
];

export const userMap = new Map(users.map(u => [u.id, u]));

// ── PERSONAS (for role switcher) ─────────────────────────────
export const personas: Persona[] = [
  {
    user: users.find(u => u.id === 'stu-aarav')!,
    role: 'student',
    label: 'Student — Aarav Sharma',
    description: 'Final Year CSE, Capstone Project on Autonomous Drone Navigation',
  },
  {
    user: users.find(u => u.id === 'fac-meera')!,
    role: 'faculty',
    label: 'Faculty — Dr. Meera Nair',
    description: 'Robotics & Embedded Systems Lab Coordinator',
  },
  {
    user: users.find(u => u.id === 'admin-sunita')!,
    role: 'admin',
    label: 'Admin — Dr. Sunita Deshmukh',
    description: 'Cross-Lab Utilization & Analytics',
  },
];

// ── EXISTING BOOKINGS (with conflicts seeded) ────────────────
export const seedBookings: Booking[] = [
  // Aarav has booked the Jetson AGX Orin tomorrow 10-13
  {
    id: 'bk-001',
    equipmentId: 'rob-jetson-01',
    userId: 'stu-aarav',
    userName: 'Aarav Sharma',
    projectId: 'pr-001',
    projectType: 'Capstone',
    slot: { date: getDateStr(1), startHour: 10, endHour: 13 },
    status: 'Confirmed',
    priority: 92,
    createdAt: getDateStr(-2),
  },
  // Priya has booked DGX A100 tomorrow 9-17 (full day)
  {
    id: 'bk-002',
    equipmentId: 'ai-dgx-01',
    userId: 'stu-priya',
    userName: 'Priya Patel',
    projectId: 'pr-002',
    projectType: 'Research',
    slot: { date: getDateStr(1), startHour: 9, endHour: 17 },
    status: 'Confirmed',
    priority: 88,
    createdAt: getDateStr(-3),
  },
  // Karthik has booked UR5e robot arm tomorrow 14-17
  {
    id: 'bk-003',
    equipmentId: 'rob-ur5-01',
    userId: 'stu-karthik',
    userName: 'Karthik Reddy',
    projectId: 'pr-003',
    projectType: 'Hackathon',
    slot: { date: getDateStr(1), startHour: 14, endHour: 17 },
    status: 'Confirmed',
    priority: 78,
    createdAt: getDateStr(-1),
  },
  // Rohan has booked FPGA board day after tomorrow 10-14
  {
    id: 'bk-004',
    equipmentId: 'vlsi-fpga-01',
    userId: 'stu-rohan',
    userName: 'Rohan Iyer',
    projectType: 'Capstone',
    slot: { date: getDateStr(2), startHour: 10, endHour: 14 },
    status: 'Confirmed',
    priority: 85,
    createdAt: getDateStr(-2),
  },
  // Ananya has booked Bioprinter day after tomorrow 9-13
  {
    id: 'bk-005',
    equipmentId: 'bio-bioprint-01',
    userId: 'stu-ananya',
    userName: 'Ananya Krishnan',
    projectId: 'pr-004',
    projectType: 'Capstone',
    slot: { date: getDateStr(2), startHour: 9, endHour: 13 },
    status: 'Confirmed',
    priority: 90,
    createdAt: getDateStr(-4),
  },
  // Priya also has RTX workstation booked day after tomorrow
  {
    id: 'bk-006',
    equipmentId: 'ai-rtx-01',
    userId: 'stu-priya',
    userName: 'Priya Patel',
    projectType: 'Research',
    slot: { date: getDateStr(2), startHour: 10, endHour: 18 },
    status: 'Confirmed',
    priority: 86,
    createdAt: getDateStr(-2),
  },
  // CONFLICT SEED: Karthik also wants Jetson AGX Orin tomorrow 11-14 (overlaps Aarav)
  {
    id: 'bk-007',
    equipmentId: 'rob-jetson-01',
    userId: 'stu-karthik',
    userName: 'Karthik Reddy',
    projectId: 'pr-003',
    projectType: 'Hackathon',
    slot: { date: getDateStr(1), startHour: 11, endHour: 14 },
    status: 'Conflict',
    priority: 65,
    createdAt: getDateStr(0),
  },
  // Another booking 3 days out
  {
    id: 'bk-008',
    equipmentId: 'bio-pcr-01',
    userId: 'stu-ananya',
    userName: 'Ananya Krishnan',
    projectType: 'Course Lab',
    slot: { date: getDateStr(3), startHour: 9, endHour: 12 },
    status: 'Confirmed',
    priority: 60,
    createdAt: getDateStr(-1),
  },
  // DGX also booked 3 days out by Aarav (cross-dept usage)
  {
    id: 'bk-009',
    equipmentId: 'ai-dgx-01',
    userId: 'stu-aarav',
    userName: 'Aarav Sharma',
    projectType: 'Capstone',
    slot: { date: getDateStr(3), startHour: 14, endHour: 18 },
    status: 'Confirmed',
    priority: 91,
    createdAt: getDateStr(0),
  },
  // Oscilloscope booked day+4
  {
    id: 'bk-010',
    equipmentId: 'vlsi-scope-01',
    userId: 'stu-rohan',
    userName: 'Rohan Iyer',
    projectType: 'Capstone',
    slot: { date: getDateStr(4), startHour: 10, endHour: 15 },
    status: 'Confirmed',
    priority: 83,
    createdAt: getDateStr(-1),
  },
];

// ── PROJECT REQUESTS (for faculty approval queue) ────────────
export const seedProjectRequests: ProjectRequest[] = [
  {
    id: 'pr-001',
    title: 'Autonomous Drone Obstacle Avoidance System',
    description: 'Capstone project building a vision-based obstacle avoidance system for DJI Matrice 300 using Jetson AGX Orin for real-time inference with YOLOv8 and ROS2 navigation stack.',
    userId: 'stu-aarav',
    userName: 'Aarav Sharma',
    teamMembers: ['Aarav Sharma', 'Sneha Gupta', 'Vikram Singh'],
    facultyMentor: 'Dr. Meera Nair',
    deadline: getDateStr(14),
    projectType: 'Capstone',
    requiredEquipment: ['rob-jetson-01', 'rob-drone-01', 'rob-lidar-01'],
    requiredHours: 24,
    justification: 'Need Jetson AGX for real-time YOLO inference at 30fps, LiDAR for 3D mapping validation, and drone kit for final integration testing before demo day.',
    approvalStatus: 'Approved',
    aiTriageBrief: 'Student completed all required safety certs (ROS2, Drone Pilot, Lab Safety). Deadline in 14 days — high urgency. Equipment utilization impact: moderate (Jetson high-demand). Recommendation: Approve full 24h allocation, suggest off-peak morning slots for drone arena.',
    createdAt: getDateStr(-7),
  },
  {
    id: 'pr-002',
    title: 'Large Language Model Fine-Tuning for Regional Languages',
    description: 'Research project fine-tuning Llama-3 8B on curated Kannada/Tamil corpus using QLoRA for low-resource language understanding.',
    userId: 'stu-priya',
    userName: 'Priya Patel',
    teamMembers: ['Priya Patel', 'Arjun Menon'],
    facultyMentor: 'Prof. Rajesh Kumar',
    deadline: getDateStr(30),
    projectType: 'Research',
    requiredEquipment: ['ai-dgx-01'],
    requiredHours: 40,
    justification: 'QLoRA fine-tuning on 8B model requires multi-GPU setup. DGX A100 needed for 4-GPU parallel training. Estimated 40 hours for 3 training runs with hyperparameter sweep.',
    approvalStatus: 'Approved',
    aiTriageBrief: 'GPU Cluster Training cert verified. 30-day deadline — moderate urgency. High utilization impact on DGX (most demanded resource). Recommendation: Approve but cap at 8h/day blocks; suggest RTX 4090 for initial prototyping.',
    createdAt: getDateStr(-10),
  },
  {
    id: 'pr-003',
    title: 'Smart Agriculture IoT Monitoring Station',
    description: 'Hackathon project: build a solar-powered IoT node with soil moisture, temperature sensors, LoRa connectivity, and edge ML anomaly detection.',
    userId: 'stu-karthik',
    userName: 'Karthik Reddy',
    teamMembers: ['Karthik Reddy', 'Divya Nair', 'Rahul Joshi'],
    facultyMentor: 'Dr. Meera Nair',
    deadline: getDateStr(3),
    projectType: 'Hackathon',
    requiredEquipment: ['rob-jetson-01', 'rob-ur5-01', 'vlsi-analyzer-01'],
    requiredHours: 12,
    justification: 'Hackathon deadline in 3 days. Need Jetson for edge ML inference demo, UR5e for automated sensor placement prototype, and logic analyzer for LoRa signal debugging.',
    approvalStatus: 'Pending',
    aiTriageBrief: 'Hackathon deadline IMMINENT (3 days). Student has Robot Safety Training but missing ROS2 cert for Jetson (may need supervised access). Jetson conflicts with Aarav\'s capstone booking. Recommendation: Approve with supervised Jetson access; flag scheduling conflict for resolution; suggest Jetson Orin Nano (AI dept) as lower-spec alternative.',
    createdAt: getDateStr(-1),
  },
  {
    id: 'pr-004',
    title: 'Bioprinted Cardiac Tissue Scaffold Viability Study',
    description: 'Thesis project investigating cell viability in GelMA-based cardiac tissue scaffolds printed at varying UV crosslink intensities.',
    userId: 'stu-ananya',
    userName: 'Ananya Krishnan',
    teamMembers: ['Ananya Krishnan', 'Dr. Lakshmi Rao (Co-PI)'],
    facultyMentor: 'Dr. Meera Nair',
    deadline: getDateStr(21),
    projectType: 'Capstone',
    requiredEquipment: ['bio-bioprint-01', 'bio-spectro-01', 'bio-pcr-01'],
    requiredHours: 30,
    justification: 'Need bioprinter for scaffold fabrication (5 print sessions), NanoDrop for DNA quantification pre/post-culture, and qPCR for gene expression analysis of cardiac markers.',
    approvalStatus: 'Pending',
    aiTriageBrief: 'All required certifications verified (BSL2, PCR, Bioprinting). Deadline in 21 days — moderate urgency. Bioprinter is high-demand (only 1 unit). Recommendation: Approve; suggest staggering bioprinter sessions to 2h blocks across 5 days to maximize sharing.',
    createdAt: getDateStr(-3),
  },
  {
    id: 'pr-005',
    title: 'FPGA-Accelerated CNN Inference Pipeline',
    description: 'Course lab project implementing a convolutional neural network inference pipeline on Xilinx Artix-7 FPGA with custom Verilog IP cores.',
    userId: 'stu-rohan',
    userName: 'Rohan Iyer',
    teamMembers: ['Rohan Iyer', 'Meghana Srinivas'],
    facultyMentor: 'Prof. Rajesh Kumar',
    deadline: getDateStr(10),
    projectType: 'Capstone',
    requiredEquipment: ['vlsi-fpga-01', 'vlsi-scope-01', 'vlsi-analyzer-01'],
    requiredHours: 20,
    justification: 'Need FPGA board for synthesis/implementation, oscilloscope for timing verification, and logic analyzer for AXI bus debugging. 10 sessions of 2h each.',
    approvalStatus: 'Pending',
    aiTriageBrief: 'All certs verified (Oscilloscope, Verilog/VHDL, Lab Safety). 10-day deadline — high urgency. FPGA board is high-demand. Recommendation: Approve full allocation; schedule 2h blocks in morning off-peak slots.',
    createdAt: getDateStr(-2),
  },
];

// ── SEED UTILIZATION DATA (hourly heatmap per equipment) ─────
export function generateUtilizationData() {
  const data: Record<string, number[]> = {};
  
  // Realistic utilization patterns: low early/late, peak 10-16
  const basePattern = [0, 0, 0, 0, 0, 0, 5, 10, 25, 55, 80, 85, 70, 75, 85, 80, 60, 40, 20, 10, 5, 0, 0, 0];
  
  const highDemandBoost = [0, 0, 0, 0, 0, 0, 10, 15, 35, 70, 95, 100, 90, 95, 100, 95, 75, 50, 30, 15, 5, 0, 0, 0];
  
  const lowDemandPattern = [0, 0, 0, 0, 0, 0, 0, 5, 15, 30, 45, 50, 40, 45, 50, 40, 25, 15, 5, 0, 0, 0, 0, 0];

  // Map equipment to pattern
  const patterns: Record<string, number[]> = {
    'rob-jetson-01': highDemandBoost,
    'rob-ur5-01': basePattern,
    'rob-lidar-01': lowDemandPattern,
    'rob-drone-01': highDemandBoost,
    'ai-dgx-01': highDemandBoost,
    'ai-rtx-01': basePattern,
    'ai-jetson-02': lowDemandPattern,
    'ai-tpu-01': lowDemandPattern,
    'vlsi-scope-01': basePattern,
    'vlsi-scope-02': lowDemandPattern,
    'vlsi-fpga-01': highDemandBoost,
    'vlsi-analyzer-01': lowDemandPattern,
    'bio-pcr-01': basePattern,
    'bio-bioprint-01': highDemandBoost,
    'bio-spectro-01': lowDemandPattern,
    'bio-eeg-01': lowDemandPattern,
  };

  for (const [eqId, pattern] of Object.entries(patterns)) {
    // Add some randomness ±10%
    data[eqId] = pattern.map(v => Math.min(100, Math.max(0, v + Math.floor(Math.random() * 20 - 10))));
  }

  return data;
}
