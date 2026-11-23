# LabLink — Making College Laboratories More Accessible
> **PromptWars Hackathon Submission**  
> **Vertical:** Cross-Departmental Academic Laboratory Resource Sharing & Intelligent Scheduling (Higher Education STEM & Research Facilities)

[![Vite](https://img.shields.io/badge/Vite-6.3-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![React](https://img.shields.io/badge/React-19.1-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-3.4-38B2AC?logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Vitest](https://img.shields.io/badge/Vitest-84%20Passing%20Tests-FCC72B?logo=vitest&logoColor=black)](https://vitest.dev/)
[![Firebase](https://img.shields.io/badge/Firebase-Firestore%20Hybrid%20Sync-FFCA28?logo=firebase&logoColor=black)](https://firebase.google.com/)
[![WCAG 2.1 AA](https://img.shields.io/badge/WCAG-2.1%20AA%20Compliant-10B981)](https://www.w3.org/WAI/WCAG21/quickref/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

---

## 1. Problem Statement Mapping & Alignment (North Star)

> *"Create a GenAI-powered campus laboratory resource-sharing platform that helps students discover and access specialised equipment, development kits, and laboratory workstations across departments. The platform should enable equipment discovery, intelligent slot booking, project-based access requests, and faculty approvals while optimising resource utilisation. It should intelligently resolve scheduling conflicts by recommending fair and feasible equipment allocations based on project deadlines, availability, and student requirements."*

| Problem Statement Requirement | LabLink Implementation | Technical Evidence & Code Location |
|---|---|---|
| **Cross-Department Equipment Discovery** | Unified catalog spanning 4 STEM departments (Robotics & IoT, AI & GPU Compute, VLSI & Embedded Systems, Bio-Instrumentation) with technical specs, lab locations, prerequisite badges, and real-time availability. | `src/components/EquipmentDiscovery.tsx`, `src/data/equipment.ts` |
| **GenAI-Powered Project Matcher** | Natural-language project-to-kit matching using Google Gemini 2.5 Flash with deterministic Offline Smart Engine fallback. Includes 1-click **"Request Recommended Kit"** pre-fill. | `src/services/aiAssistant.ts`, `src/components/AIMatcherModal.tsx` |
| **Intelligent Slot Booking & Heatmaps** | Interactive 7-day calendar matrix displaying hourly booked vs. available slots, peak-hour intensity, and slot validation (rejecting past/inverted times). | `src/components/SlotBooking.tsx`, `src/utils/validation.ts` |
| **Deterministic Conflict-Resolution Engine** | Exact interval overlap math (`startA < endB && endA > startB`), 4-factor priority score (0–100) with visual breakdown, and 3 ranked actionable resolution options. | `src/engine/conflictResolver.ts`, `tests/conflictResolver.test.ts` |
| **Project-Based Multi-Resource Requests** | Students submit structured proposals requesting multiple equipment units simultaneously. Includes Student Requests Hub tracking approvals and live Fairness Index. | `src/components/ProjectRequestForm.tsx`, `src/components/StudentRequests.tsx` |
| **Faculty Approval Queue & AI Triage** | Dedicated queue with AI Triage Decision Briefs (feasibility, deadline urgency, bottleneck risk) and working Approve, Request Changes (with note), and Reject actions. | `src/components/ApprovalQueue.tsx`, `src/services/aiAssistant.ts` |
| **Dynamic Utilization Analytics (Admin)** | 100% live derived telemetry: campus load factor, peak-hours window, idle equipment alerts, and dynamic cross-department sharing log (zero static numbers). | `src/components/Dashboard.tsx`, `src/store/useAppStore.ts` |
| **Global Multi-User Real-Time Sync** | Hybrid adapter: Firebase Cloud Firestore real-time listeners (`onSnapshot`) + atomic `runTransaction` conflict check, falling back to zero-config local storage with cross-tab syncing. | `src/services/syncService.ts`, `src/components/NavBar.tsx` |

---

## 2. Target Personas

| Persona | Identity & Campus Role | Primary User Journey in LabLink |
|---|---|---|
| **Student** | **Aarav Sharma**<br>Final Year CSE, Autonomous Drone Capstone | • Describes project in natural language to receive AI equipment bundles.<br>• Explores 7-day slot heatmaps and books research hours.<br>• Resolves collisions via 1-click alternative slots, cross-lab kits, or arbitration.<br>• Tracks project access proposals and monitors personal Fairness Index. |
| **Faculty / Coordinator** | **Dr. Meera Nair**<br>Robotics & Embedded Systems Lab Coordinator | • Triages student project requests using AI-generated risk briefs.<br>• Verifies prerequisite safety induction badges automatically.<br>• Approves requests, suggests staggered access caps, or requests changes with custom notes. |
| **Department Admin** | **Dr. Sunita Deshmukh**<br>Director of Cross-Lab Resource Management | • Analyzes dynamically derived campus lab utilization telemetry.<br>• Monitors peak bottleneck intervals vs. off-peak green incentive hours.<br>• Inspects idle equipment alerts and tracks inter-departmental hardware sharing logs. |

---

## 3. System Architecture & Hybrid Sync Adapter

LabLink features a clean decoupled architecture separating pure business logic, external cloud/local persistence adapters, and accessible React presentation:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        LabLink Presentation Layer                      │
│            React 19 + Tailwind CSS + Pure SVG Icons (WCAG AA)          │
│                                                                        │
│  ┌─────────────────────┐  ┌─────────────────────┐  ┌────────────────┐  │
│  │ Equipment Discovery │  │ Slot Booking Grid   │  │ Faculty Queue  │  │
│  │ & AI Matcher Modal  │  │ & Conflict Engine   │  │ & AI Triage    │  │
│  └──────────┬──────────┘  └──────────┬──────────┘  └───────┬────────┘  │
└─────────────┼────────────────────────┼─────────────────────┼───────────┘
              │                        │                     │
┌─────────────▼────────────────────────▼─────────────────────▼───────────┐
│                       Application State Store                          │
│                      `src/store/useAppStore.ts`                        │
└──────────────────────────────────────┬─────────────────────────────────┘
                                       │
┌──────────────────────────────────────▼─────────────────────────────────┐
│               Hybrid Persistence Adapter (`syncService.ts`)            │
│  ┌──────────────────────────────────┐  ┌────────────────────────────┐  │
│  │ Mode 1: Cloud Firestore (Global) │  │ Mode 2: Local Mode (Peer)  │  │
│  │ • Real-time `onSnapshot` sync    │  │ • `localStorage` caching   │  │
│  │ • Atomic `runTransaction` check  │  │ • `window` 'storage' events│  │
│  │ • Idempotent collection seeding  │  │ • Zero external config req │  │
│  └──────────────────────────────────┘  └────────────────────────────┘  │
└───────────────────┬─────────────────────────────────┬──────────────────┘
                    │                                 │
┌───────────────────▼─────────┐     ┌─────────────────▼──────────────────┐
│  Conflict Resolution Engine │     │  GenAI Assistant Service           │
│  • Exact Overlap Math       │     │  • Google Gemini 2.5 Flash         │
│  • Deterministic Scoring    │     │  • Offline Smart Engine Fallback   │
│  • 3 Ranked Recommendations │     │  • Automated Triage Synthesizer    │
│  `src/engine/` (39 tests)   │     │  `src/services/` (10 tests)        │
└─────────────────────────────┘     └────────────────────────────────────┘
```

### Hybrid Firestore & Local Storage Sync Architecture
1. **Primary Mode (Firebase Cloud Firestore):**
   - Automatically activates when `VITE_FIREBASE_API_KEY` and `VITE_FIREBASE_PROJECT_ID` are set.
   - Pushes live slot reservations, student proposals, and faculty status modifications worldwide in real time via Firestore `onSnapshot`.
   - Uses `runTransaction` during slot reservation to perform an **atomic pre-commit overlap check**, eliminating double-booking race conditions between concurrent users worldwide.
   - Features an idempotent seed guard ensuring initial campus lab data is created exactly once without duplicating records.
2. **Zero-Config Local Mode (Automatic Fallback):**
   - When Firebase environment variables are absent (or if Firestore is unreachable/offline), LabLink automatically falls back to reactive local persistence.
   - Listens to `window` `storage` events for instantaneous cross-tab synchronization on the same workstation.
   - Evaluators running `npm install && npm run dev` enjoy a 100% functional, responsive application with zero database provisioning.
3. **Live Sync Telemetry Pill:**
   - The top navigation bar displays an accessible status badge: **`Cloud Synced (Live)`** or **`Local Mode`**, with an informative explainer modal.

---

## 4. Deterministic Conflict Resolution Engine

When a student requests an already-booked or contested time slot, LabLink executes an explainable, deterministic multi-criteria decision model.

### Mathematical Priority Formula

$$\text{Priority Score} = w_1 \cdot D + w_2 \cdot P + w_3 \cdot F + w_4 \cdot C$$

Where the normalized weights sum to $1.00$:
- $w_1 = 0.35$ (Project Deadline Urgency)
- $w_2 = 0.25$ (Academic Milestone / Project Type)
- $w_3 = 0.20$ (Historical Usage Fairness)
- $w_4 = 0.20$ (Equipment Criticality & Substitutability)

All four component scores are normalized to $[0, 100]$:

| Factor | Weight | Score Mapping Formula | Academic Governance Rationale |
|---|---|---|---|
| **$D$ (Deadline Urgency)** | 35% | $\le 1\text{ day} \to 100$<br>$\le 3\text{ days} \to 90$<br>$\le 7\text{ days} \to 70$<br>$\le 14\text{ days} \to 50$<br>$\le 30\text{ days} \to 30$<br>$> 30\text{ days} \to 20$ | Imminent submission and defense deadlines receive priority access over flexible exploratory tasks. |
| **$P$ (Project Milestone)** | 25% | **Capstone Thesis:** $85$<br>**Sponsored Research:** $80$<br>**Hackathon Project:** $75$<br>**Coursework Lab:** $60$<br>**Personal Exploration:** $40$ | High-stakes graduation requirements take precedence over unsponsored personal prototyping. |
| **$F$ (Usage Fairness)** | 20% | $\le 10\text{ hrs} \to 95$<br>$\le 25\text{ hrs} \to 80$<br>$\le 50\text{ hrs} \to 60$<br>$\le 80\text{ hrs} \to 40$<br>$> 80\text{ hrs} \to 25$ | Prevents resource monopolization; students with lower historical lab hours receive a fairness boost. |
| **$C$ (Equipment Criticality)** | 20% | $\text{Base}(50) + 30\,(\text{High Demand}) + 20\,(\text{No Substitutes}) + 10\,(\text{Max Daily} \le 4\text{h})$ | Unique, bottleneck instruments (e.g., 3D Bioprinter, DGX A100) are protected against arbitrary booking. |

### Exact Interval Overlap Logic
Two booking intervals $[start_A, end_A)$ and $[start_B, end_B)$ on date $D$ conflict if and only if:
$$start_A < end_B \quad \land \quad end_A > start_B$$
Adjacent back-to-back slots (e.g., `10:00–11:00` and `11:00–12:00`) strictly evaluate to `false` and do not trigger false conflicts.

### The 3 Ranked Actionable AI Resolutions
1. **Best Alternative Time Window (Same Equipment):**
   Scans the same calendar day for gap intervals $\ge$ requested duration during operating hours (8:00 AM – 8:00 PM), prioritizing off-peak low-utilization windows.
2. **Cross-Department Equivalent Kit (Hardware Substitution):**
   Queries the campus equipment registry for registered substitutes in neighboring departments (e.g., routing from a congested Jetson in Robotics to an idle Jetson in AI Compute).
3. **Smart Split-Slot / Priority Preemption:**
   When an incoming priority score substantially outranks an existing flexible booking ($\Delta \ge 15$), the engine authorizes priority reallocation or calculates a fair midpoint split.
4. **Actionable Confirmation Feedback:**
   Clicking **"Accept This Option"** immediately updates state across cloud and local storage, providing visual confirmation.

---

## 5. Security & Input Sanitization (`validation.ts`)

- **XSS & Injection Protection:** User text in project proposals, descriptions, and justification fields is sanitized via `sanitizeText()`, aggressively stripping `<script>`, `<iframe>`, `<style>`, event handlers, and null bytes.
- **Strict Booking Validation:** Rejects inverted intervals (`endHour <= startHour`), past timestamps, operating-hour violations ($< 8$ or $> 20$), and daily quota overages.
- **Secret Redaction:** API error messages from Gemini and Firestore are sanitized via `sanitizeErrorMessage()`, redacting Google API keys (`AIzaSy...`), credentials, request URLs, and internal stack traces before presentation in the UI.
- **Production Firestore Security Rules:**

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Bookings collection
    match /bookings/{bookingId} {
      allow read: if true;
      allow write: if request.resource.data.slot.endHour > request.resource.data.slot.startHour
                   && request.resource.data.slot.startHour >= 8
                   && request.resource.data.slot.endHour <= 20
                   && request.resource.data.userName.size() <= 100;
    }
    
    // Project Requests collection
    match /projectRequests/{requestId} {
      allow read: if true;
      allow write: if request.resource.data.title.size() > 0
                   && request.resource.data.title.size() <= 150
                   && request.resource.data.requiredHours > 0
                   && request.resource.data.requiredHours <= 200;
    }
    
    // System metadata
    match /system_meta/{docId} {
      allow read: if true;
      allow write: if true;
    }
  }
}
```

---

## 6. Accessibility & WCAG 2.1 AA Conformance

- **Semantic Landmarks:** Proper HTML5 landmark structure: `<header>`, `<nav role="navigation">`, `<main id="main-content">`, and `<footer role="contentinfo">`.
- **Skip to Main Content Link:** Keyboard-accessible skip link allows screen reader and keyboard users to bypass navigation headers directly to main content.
- **Modal Dialog Standards:** Every modal (`AIMatcherModal`, `SlotBooking` conflict modal, `ProjectRequestForm`, Feedback modal) implements:
  - `role="dialog"` and `aria-modal="true"`.
  - Descriptive `aria-labelledby` attributes.
  - `Escape` key dismissal.
  - Focus restoration to the triggering button upon close.
- **Dynamic Announcements:** `aria-live="polite"` regions announce toast status notifications, and `aria-live="assertive"` regions flag scheduling conflicts.
- **Color Independence:** Statuses (Available, High Demand, Conflict, Approved, Pending) are never communicated by color alone—every badge pairs color with text labels, icons, and contrast ratios $\ge 4.5:1$.

---

## 7. Automated Test Suite (84 Passing Tests)

LabLink maintains an extensive Vitest suite covering every mathematical, algorithmic, and state transition boundary:

```bash
npm test
```

```
 ✓ tests/validation.test.ts (20 tests)
 ✓ tests/conflictResolver.test.ts (39 tests)
 ✓ tests/accessibility.test.ts (3 tests)
 ✓ tests/endToEndFlows.test.ts (6 tests)
 ✓ tests/aiAssistant.test.ts (10 tests)
 ✓ tests/syncService.test.ts (6 tests)

 Test Files  6 passed (6)
      Tests  84 passed (84)
```

1. **Exact Interval Overlap Edge Cases:** Adjacent back-to-back slots (`10-12` and `12-14`), contained intervals, identical intervals, cross-day intervals.
2. **Priority Scoring Mathematics:** 35% deadline urgency decay curve, 25% project type weighting, 20% usage fairness penalty scaling, 20% equipment criticality.
3. **Cross-Department Substitution:** Automated resolution from congested labs to idle hardware in neighboring faculties.
4. **End-to-End State Transitions:** Project Request submission $\to$ Faculty approval/modification $\to$ Equipment availability and dynamic Admin analytics updates.
5. **GenAI Offline Fallback Resilience:** Proving the application runs 100% deterministically when API keys are absent or rate-limited.
6. **Input Sanitization:** Stripping XSS vectors, script tags, control characters, and redacting API credentials.
7. **Hybrid Persistence Adapter:** Proving seamless local storage fallback and cross-tab event synchronization.

---

## 8. Verification & Hackathon Constraint Gates

| Constraint Gate | Requirement | Status | Verification Command |
|---|---|---|---|
| **Single Branch Only** | Strictly `main` branch only | **PASS** | `git branch -a` |
| **Repository Size** | $< 10\text{ MB}$ (Target $< 2\text{ MB}$) | **PASS** (~120 KiB git tree) | `git count-objects -vH` |
| **Zero Login Walls** | Instant Role Switcher on first load | **PASS** | Verified in `NavBar.tsx` |
| **Zero Hardcoded Secrets** | No API keys or tokens in git | **PASS** | `git grep -i "AIza"` returns 0 results |
| **TypeScript Strictness** | 0 type errors | **PASS** | `npx tsc --noEmit` |
| **Production Build** | Clean Vite static SPA bundle | **PASS** (Zero chunk warnings) | `npm run build` |
| **Unit & Integration Tests** | 100% test pass rate | **PASS** (84/84 passing) | `npm test` |

---

## 9. Local Setup & Quick Start

### 1. Clone & Install
```bash
git clone https://github.com/Anjan123445/LabLink.git
cd LabLink
npm install
```

### 2. Configure Environment (Optional)
```bash
cp .env.example .env
# Edit .env and insert your VITE_GEMINI_API_KEY and VITE_FIREBASE_* credentials.
# Note: LabLink is zero-config by default and works fully without any keys!
```

### 3. Run Development Server
```bash
npm run dev
# Open http://localhost:5173
```

### 4. Execute Test Suite & Production Build
```bash
npm test
npm run build
```

---

## 10. License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.
