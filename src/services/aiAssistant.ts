// ============================================================
// LabLink — GenAI Assistant Service
// Google Gemini 2.5 Flash + Deterministic Offline Smart Engine
// ============================================================

import type { Equipment, ProjectRequest, Booking, ConflictResult, ProjectType } from '../types';
import { equipment, equipmentMap } from '../data/equipment';
import { sanitizeText, sanitizeErrorMessage } from '../utils/validation';

const GEMINI_API_KEY = import.meta.env?.VITE_GEMINI_API_KEY || '';
const GEMINI_MODEL = 'gemini-2.5-flash';
const REQUEST_TIMEOUT_MS = 8000;

export function isGeminiConfigured(): boolean {
  return (
    Boolean(GEMINI_API_KEY) &&
    GEMINI_API_KEY !== 'your_gemini_api_key_here' &&
    !GEMINI_API_KEY.includes('placeholder')
  );
}

// ── ROBUST GEMINI REST CLIENT ────────────────────────────────

async function callGemini(prompt: string): Promise<string | null> {
  if (!isGeminiConfigured()) {
    return null; // Fall through to deterministic offline smart engine
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const sanitizedPrompt = sanitizeText(prompt, 3000);
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: sanitizedPrompt }],
          },
        ],
        generationConfig: {
          temperature: 0.4,
          maxOutputTokens: 1024,
        },
      }),
    });

    clearTimeout(timeoutId);

    if (response.status === 429) {
      console.warn('[LabLink AI] Gemini API rate limit (429) encountered, falling back to Offline Smart Engine.');
      return null;
    }

    if (!response.ok) {
      console.warn(`[LabLink AI] Gemini API returned status ${response.status}, falling back to Offline Smart Engine.`);
      return null;
    }

    const data = await response.json();
    const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (typeof rawText !== 'string' || !rawText.trim()) {
      return null;
    }

    return rawText.trim();
  } catch (err: unknown) {
    clearTimeout(timeoutId);
    const safeError = sanitizeErrorMessage(err);
    console.warn('[LabLink AI] Gemini call failed or timed out:', safeError);
    return null;
  }
}

// ── DETERMINISTIC OFFLINE SEMANTIC MATCHER ───────────────────

export interface RecommendedKit {
  title: string;
  requiredEquipment: string[];
  requiredHours: number;
  justification: string;
  projectType: ProjectType;
}

export interface MatchProjectResult {
  equipment: Equipment[];
  explanation: string;
  suggestedDurationHours: number;
  reasoning: string;
  source: 'gemini' | 'fallback';
  recommendedKit: RecommendedKit;
}

export function offlineSemanticMatcher(description: string): {
  matchedEquipment: Equipment[];
  suggestedHours: number;
  primaryDepartment: string;
} {
  const desc = description.toLowerCase();

  const keywordMap: Record<string, string[]> = {
    drone: ['drone', 'uav', 'aerial', 'autonomous'],
    'computer vision': ['computer-vision', 'deep-learning', 'inference', 'edge-ai'],
    train: ['deep-learning', 'training', 'pytorch', 'tensorflow', 'cuda'],
    model: ['deep-learning', 'training', 'inference', 'llm'],
    robot: ['robotics', 'robotic-arm', 'cobot', 'ros2'],
    arm: ['robotic-arm', 'cobot', 'pick-and-place'],
    lidar: ['lidar', 'slam', 'point-cloud', 'mapping'],
    fpga: ['fpga', 'verilog', 'vhdl', 'digital-design'],
    circuit: ['oscilloscope', 'signal-analysis', 'analog'],
    signal: ['oscilloscope', 'signal-analysis', 'mixed-signal'],
    pcr: ['pcr', 'qpcr', 'gene-expression', 'molecular-biology'],
    bio: ['bioprinting', 'tissue-engineering', 'biosignal', 'biomaterials'],
    print: ['bioprinting', '3d-printing'],
    eeg: ['eeg', 'bci', 'neuroscience', 'brain-computer-interface'],
    brain: ['eeg', 'bci', 'neuroscience', 'brain-computer-interface'],
    gpu: ['deep-learning', 'cuda', 'pytorch', 'hpc'],
    edge: ['edge-ai', 'jetson', 'tinyml', 'inference'],
    iot: ['edge-ai', 'tinyml', 'sensor', 'autonomous'],
    sensor: ['sensor', 'autonomous', 'iot'],
    obstacle: ['computer-vision', 'autonomous', 'drone', 'lidar'],
    navigation: ['slam', 'autonomous', 'ros2', 'mapping'],
    detect: ['computer-vision', 'deep-learning', 'inference'],
    debug: ['oscilloscope', 'logic-analyzer', 'protocol', 'debug'],
    protocol: ['protocol', 'spi', 'i2c', 'uart', 'logic-analyzer'],
    dna: ['dna', 'rna', 'pcr', 'molecular-biology'],
    protein: ['protein', 'spectrophotometer', 'concentration'],
    tissue: ['tissue-engineering', 'bioprinting', 'biomaterials'],
    neural: ['deep-learning', 'bci', 'neuroscience'],
    autonomous: ['autonomous', 'autonomous-vehicle', 'ros2', 'slam'],
    manufacture: ['robotic-arm', 'pick-and-place', 'manufacturing'],
    agriculture: ['iot', 'sensor', 'edge-ai', 'tinyml'],
    nlp: ['llm', 'deep-learning', 'training'],
    language: ['llm', 'deep-learning', 'training'],
    inference: ['inference', 'edge-ai', 'tflite', 'onnx'],
    'real-time': ['edge-ai', 'inference', 'ros2', 'autonomous'],
    yolo: ['computer-vision', 'deep-learning', 'inference', 'edge-ai'],
    mapping: ['slam', 'mapping', 'point-cloud', 'lidar'],
    lora: ['iot', 'sensor', 'edge-ai', 'logic-analyzer'],
  };

  const scores = equipment.map(eq => {
    let score = 0;
    for (const [keyword, tags] of Object.entries(keywordMap)) {
      if (desc.includes(keyword)) {
        for (const tag of tags) {
          if (eq.tags.includes(tag)) {
            score += 10;
          }
        }
      }
    }
    if (desc.includes(eq.name.toLowerCase())) score += 25;
    if (eq.status === 'Available Now') score += 4;
    return { equipment: eq, score };
  });

  const matched = scores
    .filter(s => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 4)
    .map(s => s.equipment);

  // If nothing matched, provide broad defaults across departments
  const finalMatched = matched.length > 0
    ? matched
    : [
        equipmentMap.get('rob-jetson-01')!,
        equipmentMap.get('ai-rtx-01')!,
        equipmentMap.get('vlsi-fpga-01')!,
      ].filter(Boolean);

  let suggestedHours = 12;
  if (desc.includes('train') || desc.includes('thesis') || desc.includes('capstone')) suggestedHours = 24;
  else if (desc.includes('hackathon') || desc.includes('demo')) suggestedHours = 8;
  else if (desc.includes('quick') || desc.includes('test')) suggestedHours = 4;

  const primaryDept = finalMatched[0]?.department ?? 'Robotics & IoT';

  return {
    matchedEquipment: finalMatched,
    suggestedHours,
    primaryDepartment: primaryDept,
  };
}

function buildStructuredKit(
  matchedEquipment: Equipment[],
  description: string,
  suggestedHours: number
): RecommendedKit {
  const desc = description.toLowerCase();
  let projectType: ProjectType = 'Capstone';
  if (desc.includes('hackathon')) projectType = 'Hackathon';
  else if (desc.includes('research') || desc.includes('paper') || desc.includes('study')) projectType = 'Research';
  else if (desc.includes('lab') || desc.includes('course') || desc.includes('assignment')) projectType = 'Course Lab';
  else if (desc.includes('personal') || desc.includes('hobby')) projectType = 'Personal';

  const titleWords = description.split(' ').slice(0, 7).join(' ');
  const title = titleWords.length > 10 ? `${titleWords.replace(/[.,!?]+$/, '')}... Project` : 'Campus Multi-Lab Research Project';

  const eqNames = matchedEquipment.map(e => e.name).join(', ');
  const justification = `Requires multi-lab equipment (${eqNames}) for hardware-in-the-loop validation, real-time telemetry, and milestone verification.`;

  return {
    title,
    requiredEquipment: matchedEquipment.map(e => e.id),
    requiredHours: suggestedHours,
    justification,
    projectType,
  };
}

// ── PUBLIC API METHODS ───────────────────────────────────────

/**
 * Match a student project description to relevant equipment across campus labs
 */
export async function matchProjectToEquipment(
  description: string,
  options?: {
    deadline?: string;
    teamSize?: number;
    constraints?: string;
  }
): Promise<MatchProjectResult> {
  const offlineMatch = offlineSemanticMatcher(description);
  const structuredKit = buildStructuredKit(
    offlineMatch.matchedEquipment,
    description,
    offlineMatch.suggestedHours
  );

  // Construct structured prompt for Gemini
  const prompt = `You are LabLink, an AI campus laboratory resource-sharing assistant.
Catalog of available equipment across 4 STEM departments:
${equipment.map(e => `- ID: ${e.id} | Name: ${e.name} | Dept: ${e.department} | Specs: ${e.specs} | Tags: ${e.tags.join(', ')}`).join('\n')}

Student Project Details:
- Description: "${description}"
- Desired Deadline: ${options?.deadline || 'Flexible'}
- Team Size: ${options?.teamSize || 1}
- Constraints: ${options?.constraints || 'None specified'}

Recommend the top 2-4 most suitable equipment pieces from the catalog.
For each item, explain concise technical justification and suggested booking duration.
Format your response clearly.`;

  const geminiResponse = await callGemini(prompt);

  if (geminiResponse) {
    // Check if Gemini referenced specific catalog equipment
    const foundEquipment = equipment.filter(eq =>
      geminiResponse.toLowerCase().includes(eq.id.toLowerCase()) ||
      geminiResponse.toLowerCase().includes(eq.name.toLowerCase())
    );

    const finalEquip = foundEquipment.length > 0 ? foundEquipment.slice(0, 4) : offlineMatch.matchedEquipment;

    return {
      equipment: finalEquip,
      explanation: geminiResponse,
      suggestedDurationHours: offlineMatch.suggestedHours,
      reasoning: 'Tailored cross-department hardware bundle synthesized by Google Gemini 2.5 Flash.',
      source: 'gemini',
      recommendedKit: {
        ...structuredKit,
        requiredEquipment: finalEquip.map(e => e.id),
      },
    };
  }

  // Deterministic Offline Matcher output
  const explanations = offlineMatch.matchedEquipment.map(eq => {
    const isAvail = eq.status === 'Available Now';
    return `• **${eq.name}** (${eq.department}): ${eq.specs}. ${isAvail ? '✅ Ready for reservation' : '⚠️ High-demand resource — reserve early'}.`;
  });

  const offlineExplanation = `### Recommended Equipment Bundle:\n\n${explanations.join('\n\n')}\n\n**Suggested Total Allocation:** ${offlineMatch.suggestedHours} hours across morning or off-peak windows.\n**Prerequisites to check:** ${offlineMatch.matchedEquipment.flatMap(e => e.prerequisites).join(', ') || 'Standard Lab Safety Induction'}.`;

  return {
    equipment: offlineMatch.matchedEquipment,
    explanation: offlineExplanation,
    suggestedDurationHours: offlineMatch.suggestedHours,
    reasoning: `Deterministic semantic tag matching matched ${offlineMatch.matchedEquipment.length} resources in ${offlineMatch.primaryDepartment}.`,
    source: 'fallback',
    recommendedKit: structuredKit,
  };
}

/**
 * Generate transparent conflict explanation
 */
export function explainConflictResolution(result: ConflictResult, equipmentId: string): string {
  const eq = equipmentMap.get(equipmentId);
  const equipmentName = eq?.name ?? 'Lab Equipment';

  if (!result.hasConflict) {
    return `✅ **No Conflict Detected**\nYour requested time slot for **${equipmentName}** is clear. You can proceed with instant confirmation.`;
  }

  const conflictNames = result.conflictingBookings
    .map(b => `${b.userName} (${b.projectType}, priority: ${b.priority})`)
    .join(', ');

  let explanation = `⚠️ **Scheduling Overlap on ${equipmentName}**\n`;
  explanation += `Active reservation: ${conflictNames}\n\n`;
  explanation += `The fair conflict-resolution engine computed priority using:\n`;
  explanation += `• **Project Deadline Urgency (35%)**\n`;
  explanation += `• **Academic Requirement / Project Type (25%)**\n`;
  explanation += `• **Student Historical Usage Fairness (20%)**\n`;
  explanation += `• **Equipment Criticality & Substitutes (20%)**\n\n`;
  explanation += `Generated **${result.recommendations.length} actionable alternatives** below. Select an option to resolve cleanly without deadlocks.`;

  return explanation;
}

/**
 * Generate AI Triage Brief for Faculty Approval Queue
 */
export function generateApprovalTriageBrief(request: ProjectRequest, bookings: Booking[]): string {
  const now = Date.now();
  const deadlineTime = new Date(request.deadline).getTime();
  const daysUntilDeadline = Math.max(0, Math.ceil((deadlineTime - now) / (1000 * 60 * 60 * 24)));

  const urgencyLevel =
    daysUntilDeadline <= 3 ? 'CRITICAL' :
    daysUntilDeadline <= 7 ? 'HIGH' :
    daysUntilDeadline <= 14 ? 'MODERATE' : 'LOW';

  const equipNames = request.requiredEquipment
    .map(id => equipmentMap.get(id)?.name ?? id)
    .join(', ');

  const highDemandItems = request.requiredEquipment
    .map(id => equipmentMap.get(id))
    .filter(eq => eq?.status === 'High Demand')
    .map(eq => eq!.name);

  const conflictingBookings = bookings.filter(
    b =>
      request.requiredEquipment.includes(b.equipmentId) &&
      b.userId !== request.userId &&
      b.status === 'Confirmed'
  );

  let brief = `**Risk Assessment:** ${urgencyLevel} Urgency (${daysUntilDeadline} days remaining)\n`;
  brief += `**Requested Resources:** ${equipNames} (${request.requiredHours}h total)\n`;

  if (highDemandItems.length > 0) {
    brief += `**⚠️ High-Demand Notice:** Contains bottleneck equipment (${highDemandItems.join(', ')}).\n`;
  }

  if (conflictingBookings.length > 0) {
    brief += `**🔴 Collision Risk:** ${conflictingBookings.length} overlapping booking(s) detected during requested timeframe.\n`;
  }

  if (request.requiredHours > 20) {
    brief += `**💡 Faculty Decision Recommendation:** Approve with modification (stagger into 4-hour daily caps to prevent resource hoarding).`;
  } else if (conflictingBookings.length > 0) {
    brief += `**💡 Faculty Decision Recommendation:** Approve with cross-department substitute or scheduled off-peak slots.`;
  } else {
    brief += `**💡 Faculty Decision Recommendation:** Approve full requested allocation.`;
  }

  return brief;
}

/**
 * Generate AI Summary for Faculty Review
 */
export async function generateFacultySummary(
  request: ProjectRequest,
  bookings: Booking[]
): Promise<{ summary: string; source: 'gemini' | 'fallback' }> {
  const prompt = `You are LabLink's AI triage assistant for faculty coordinators.
Analyze this student project request:
- Title: ${request.title}
- Student: ${request.userName}
- Type: ${request.projectType}
- Deadline: ${request.deadline}
- Equipment: ${request.requiredEquipment.map(id => equipmentMap.get(id)?.name ?? id).join(', ')}
- Hours: ${request.requiredHours}
- Justification: ${request.justification}

Provide a concise 3-sentence summary:
1) Feasibility and prerequisite check status
2) Resource bottleneck & collision risk level
3) Recommended action for faculty coordinator (Approve / Request Changes / Suggest Staggered Access)`;

  const geminiText = await callGemini(prompt);

  if (geminiText) {
    return { summary: geminiText, source: 'gemini' };
  }

  return {
    summary: generateApprovalTriageBrief(request, bookings),
    source: 'fallback',
  };
}
