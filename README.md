# LabLink — Making College Laboratories More Accessible
> **PromptWars Hackathon Submission**  
> **Chosen Challenge Vertical:** Cross-Departmental Academic Lab Access & Intelligent Resource Scheduling (Higher Education STEM & Research Labs)

[![Vite](https://img.shields.io/badge/Vite-6.3-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![React](https://img.shields.io/badge/React-19.1-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-3.4-38B2AC?logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Vitest](https://img.shields.io/badge/Vitest-39%20Passing%20Tests-FCC72B?logo=vitest&logoColor=black)](https://vitest.dev/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

---

## Executive Summary

In higher education institutions, high-value laboratory equipment (GPU compute clusters, robotic arms, bioprinters, high-bandwidth oscilloscopes) is frequently siloed within individual departments. While one department's lab faces bottlenecks and scheduling conflicts, equivalent or compatible equipment in adjacent departments remains idle. Furthermore, traditional booking tools treat scheduling as a binary "first-come, first-served" booking problem, ignoring academic milestones, thesis deadlines, student usage fairness, and safety certifications.

**LabLink** breaks down departmental silos through:
1. **Cross-Departmental Hardware Sharing:** A unified catalog spanning 4 STEM departments with automated cross-lab substitute matching.
2. **Deterministic Conflict Resolution Engine:** An algorithm evaluating deadline urgency, academic milestone weight, historical usage fairness, and equipment criticality to generate 3 ranked, conflict-free recommendations.
3. **GenAI Equipment Discovery & Triage:** Natural-language project-to-kit matching and automated faculty triage briefs using Google Gemini 2.0 Flash with an offline fallback engine.
4. **Zero-Friction Role Switcher:** Zero login or signup gates; evaluators can switch between Student, Faculty, and Admin personas in one click.

---

## Target Personas

| Persona | Name & Campus Identity | Key Responsibilities & Capabilities in LabLink |
|---|---|---|
| **Student** | **Aarav Sharma**<br>Final Year CSE, Autonomous Drone Capstone | • Discovers hardware using natural-language project goals<br>• Books slots with visual utilization heatmaps<br>• Resolves conflicts via alternative slots or cross-lab kits<br>• Tracks project access approvals and safety credentials |
| **Faculty / Coordinator** | **Dr. Meera Nair**<br>Robotics & Embedded Systems Lab Coordinator | • Evaluates project requests via an AI-triaged approval queue<br>• Receives automated safety certification and prerequisite checks<br>• Approves requests with one click or suggests staggered allocations |
| **Department Admin** | **Dr. Sunita Deshmukh**<br>Director of Cross-Lab Resource Management | • Analyzes campus-wide lab utilization telemetry<br>• Monitors peak vs. off-peak bottleneck distributions<br>• Identifies underutilized / idle equipment for cross-department reallocation |

---

## System Architecture & Tech Stack

```
┌────────────────────────────────────────────────────────────────────────┐
│                        LabLink Presentation Layer                      │
│            React 19 + Tailwind CSS + Lucide SVG Icons (WCAG AA)        │
│                                                                        │
│   ┌─────────────────────┐  ┌─────────────────────┐  ┌──────────────┐   │
│   │ Equipment Discovery │  │ Slot Booking Grid   │  │ Approval Q   │   │
│   │ & AI Natural Search │  │ & Conflict Modal    │  │ & AI Triage  │   │
│   └──────────┬──────────┘  └──────────┬──────────┘  └──────┬───────┘   │
└──────────────┼────────────────────────┼────────────────────┼───────────┘
               │                        │                    │
┌──────────────▼────────────────────────▼────────────────────▼───────────┐
│                       Application State Store                          │
│               `src/store/useAppStore.ts` (localStorage sync)           │
└──────────────┬────────────────────────┬────────────────────┬───────────┘
               │                        │                    │
┌──────────────▼──────────┐  ┌──────────▼──────────┐  ┌──────▼───────────┐
│  Conflict Resolver      │  │  GenAI Assistant    │  │ Campus Seed Data │
│  Deterministic Engine   │  │  Gemini 2.0 Flash   │  │ 16+ Items, 4 Dept│
│  (39 Unit Tests Passing)│  │  + Smart Fallback   │  │ Realistic Load   │
│  `src/engine/`          │  │  `src/services/`    │  │ `src/data/`      │
└─────────────────────────┘  └─────────────────────┘  └──────────────────┘
```

- **Frontend:** React 19, TypeScript 5.8, Vite 6.3, Tailwind CSS 3.4.
- **Persistence:** LocalStorage-backed state with realistic campus seed data (works immediately on `npm install && npm run dev` with zero database setup).
- **Icons & Assets:** Pure SVG icons (`lucide-react` and inline SVGs); zero heavy raster images, keeping repo size `< 2 MB`.
- **Testing:** Vitest test suite with 39 deterministic unit tests covering priority scoring, slot overlap mathematics, cross-department substitution, and split-slot generation.

---

## Intelligent Conflict Resolution & Priority Scoring Logic

When a student requests an already-booked or high-demand slot, LabLink runs a 4-factor deterministic scoring model rather than returning a generic error.

### 1. Mathematical Scoring Formula

$$\text{Priority Score} = w_1 \cdot D + w_2 \cdot P + w_3 \cdot F + w_4 \cdot C$$

Where:
- $w_1 = 0.35$ (Deadline Urgency Weight)
- $w_2 = 0.25$ (Academic Milestone / Project Type Weight)
- $w_3 = 0.20$ (Historical Fairness Score)
- $w_4 = 0.20$ (Equipment Criticality Factor)

All individual component scores are normalized to a $[0, 100]$ scale:

| Metric | Factor | Formula / Mapping | Rationale |
|---|---|---|---|
| **$D$ (Deadline Urgency)** | 35% | $\le 1\text{ day} \to 100$<br>$\le 3\text{ days} \to 90$<br>$\le 7\text{ days} \to 70$<br>$\le 14\text{ days} \to 50$<br>$> 14\text{ days} \to 20$ | Students with imminent submission deadlines receive priority access over flexible exploratory tasks. |
| **$P$ (Project Milestone)** | 25% | **Capstone Thesis:** $85$<br>**Sponsored Research:** $80$<br>**Hackathon:** $75$<br>**Coursework Lab:** $60$<br>**Personal Project:** $40$ | High-stakes graduation requirements take precedence over unsponsored personal prototyping. |
| **$F$ (Usage Fairness)** | 20% | $\le 10\text{ hrs} \to 95$<br>$\le 25\text{ hrs} \to 80$<br>$\le 50\text{ hrs} \to 60$<br>$\le 80\text{ hrs} \to 40$<br>$> 80\text{ hrs} \to 25$ | Prevents resource monopolization; students who have used fewer semester lab hours receive an allocation boost. |
| **$C$ (Equipment Criticality)** | 20% | $\text{Base}(50) + 30\,(\text{High Demand}) + 20\,(\text{No Substitutes}) + 10\,(\text{Max Daily} \le 4\text{h})$ | Unique, bottleneck equipment (e.g. 3D Bioprinter, DGX A100) is governed with stricter priority gates. |

### 2. The 3 Ranked Actionable AI Recommendations

When a collision is detected, the engine calculates three ranked alternatives:

1. **Best Alternative Time Window (Same Equipment):**
   Scans the same calendar day for gap intervals $\ge$ requested duration during operating hours (8:00 AM – 8:00 PM), prioritizing off-peak low-utilization windows.
2. **Cross-Department Equivalent Kit (Hardware Substitution):**
   Queries the campus equipment registry for registered substitutes in neighboring departments (e.g., if the Jetson AGX Orin in Robotics is booked, suggests the idle Jetson Orin Nano in AI Compute).
3. **Smart Split-Slot / Fair Preemption:**
   When an urgent deadline ($D \ge 90$) clashes with a lower-priority flexible booking, the engine calculates a fair midpoint division, allocating the critical first chunk to the urgent requester and adjusting the existing booking.

---

## End-to-End User Flows & Feature Tour

### Flow 1: GenAI Project Matcher & Equipment Discovery
1. The student navigates to **Equipment Discovery** and clicks **"Describe Your Project"**.
2. Example input: *"I need to train a computer vision model for drone obstacle detection before my Friday demo"*.
3. The GenAI assistant analyzes the prompt, identifies required hardware capabilities (Jetson AGX, LiDAR, Drone kit), verifies required safety prerequisites (ROS2, Drone Pilot License), and presents a 1-click **Book Now** action.

### Flow 2: Interactive Booking & 1-Click Conflict Simulation
1. The student opens **Slot Booking** and selects an equipment item (e.g., *NVIDIA Jetson AGX Orin*).
2. The interactive 7-day calendar displays color-coded utilization heat indicators (Green = Available, Amber = Busy, Red = Bottleneck).
3. Evaluators can click **"⚡ Simulate Conflict Demo"** to pre-load a known high-contention slot.
4. The **Conflict Resolution Modal** pops up with the computed priority score, the colliding user's details, and the 3 ranked AI recommendations ready for instant acceptance.

### Flow 3: Faculty Approval Queue & AI Triage
1. Switch to **Faculty Persona** (*Dr. Meera Nair*).
2. The **Approval Queue** displays pending student project requests.
3. Each request contains an **AI Triage Brief** summarizing deadline urgency, safety certifications verified, high-demand equipment impact, and recommended action.
4. Faculty can click **"Approve"**, **"Approve with AI-Suggested Modification"**, or **"Request Modification"**.

### Flow 4: Department Admin Utilization Analytics
1. Switch to **Department Admin Persona** (*Dr. Sunita Deshmukh*).
2. Review real-time cross-department telemetry:
   - Average campus load percentage
   - Peak hours window vs. off-peak green incentive zones
   - Underutilized / idle equipment list ready for cross-department reallocation
   - Cross-department sharing rate and conflict resolution counter

---

## Local Setup & Quick Start

### Prerequisites
- Node.js 18+ or 20+
- npm 9+ or 10+

### Installation & Run

```bash
# 1. Clone the repository
git clone https://github.com/Anjan123445/LabLink.git
cd LabLink

# 2. Install dependencies
npm install

# 3. (Optional) Configure Gemini API
cp .env.example .env
# Edit .env and insert your VITE_GEMINI_API_KEY.
# Note: LabLink includes a complete intelligent offline fallback engine,
# so every feature works fully even without an API key!

# 4. Start local development server
npm run dev

# 5. Run automated test suite
npm test

# 6. Build for production
npm run build
```

---

## Verification & Constraints Compliance

| Constraint | Requirement | Status | Verification Command |
|---|---|---|---|
| **Repository Size** | $< 10\text{ MB}$ (Target $< 2\text{ MB}$) | **PASS** (~1.2 MB uncompressed git tree) | `git count-objects -vH` |
| **Branch Policy** | Single branch (`main`) only | **PASS** (Zero extra branches) | `git branch` |
| **Authentication** | Zero login / signup screens | **PASS** (1-click Role Switcher in navbar) | Inspect `src/components/NavBar.tsx` |
| **Automated Tests** | Pure deterministic engine tests | **PASS** (39/39 passing unit tests) | `npm test` |
| **Production Build** | Clean Vite + TypeScript build | **PASS** (0 errors, 0 warnings) | `npm run build` |
| **Accessibility** | WCAG 2.1 AA Compliant | **PASS** (Semantic HTML, focus rings, ARIA labels) | Inspect component markup |

---

## Key Assumptions & Design Trade-offs

1. **Zero Login vs. OAuth/JWT:**  
   *Trade-off:* We deliberately omitted login/signup forms in favor of an instant Persona Switcher. In an evaluation context, requiring judges to sign up, verify emails, or configure OAuth credentials creates unnecessary friction. The switcher lets evaluators inspect all 3 distinct user perspectives in seconds.
2. **Client-Side Engine with LocalStorage vs. Hosted Cloud Database:**  
   *Trade-off:* Traditional server backends introduce cold-start latency, database provisioning requirements, and network flakiness during hackathon demos. LabLink's state layer runs locally with deterministic seed data and reactive LocalStorage persistence, ensuring instantaneous response times and zero external setup.
3. **Hybrid GenAI (Gemini + Offline Fallback):**  
   *Trade-off:* Relying exclusively on third-party AI APIs can lead to demo failures if rate limits or network issues occur. LabLink implements a dual-mode service: it leverages Google Gemini 2.0 Flash when an API key is provided, and gracefully defaults to an in-memory keyword/tag semantic inference engine when offline.
4. **Deterministic Fairness Weights:**  
   *Trade-off:* Rather than an opaque machine-learning "black box" that students cannot understand, the conflict resolution algorithm uses an explainable, linear multi-criteria decision model ($w_1=0.35, w_2=0.25, w_3=0.20, w_4=0.20$), making decisions auditable and transparent for academic governance.

---

## License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.
