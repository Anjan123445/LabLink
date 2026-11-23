// ============================================================
// LabLink — GenAI Assistant Service
// Supports Google Gemini API with rich context-aware fallback
// ============================================================

import type { Equipment, ProjectRequest, Booking, ConflictResult } from '../types';
import { equipment, equipmentMap } from '../data/equipment';

const GEMINI_API_KEY = import.meta.env?.VITE_GEMINI_API_KEY || '';

// ── GEMINI API INTEGRATION ──────────────────────────────────

async function callGemini(prompt: string): Promise<string | null> {
  if (!GEMINI_API_KEY || GEMINI_API_KEY === 'your_gemini_api_key_here') {
    return null; // Fall through to intelligent fallback
  }

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: prompt }]
          }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 1024,
          },
        }),
      }
    );

    if (!response.ok) return null;

    const data = await response.json();
    return data?.candidates?.[0]?.content?.parts?.[0]?.text || null;
  } catch {
    return null; // Fallback gracefully
  }
}

// ── INTELLIGENT FALLBACK ENGINE ─────────────────────────────

/**
 * Project description → equipment matching using keyword/tag analysis.
 * Works without any external API.
 */
function fallbackProjectMatcher(description: string): Equipment[] {
  const desc = description.toLowerCase();

  // Keyword → tag mapping for intelligent matching
  const keywordMap: Record<string, string[]> = {
    'drone': ['drone', 'uav', 'aerial', 'autonomous'],
    'computer vision': ['computer-vision', 'deep-learning', 'inference', 'edge-ai'],
    'train': ['deep-learning', 'training', 'pytorch', 'tensorflow', 'cuda'],
    'model': ['deep-learning', 'training', 'inference', 'llm'],
    'robot': ['robotics', 'robotic-arm', 'cobot', 'ros2'],
    'arm': ['robotic-arm', 'cobot', 'pick-and-place'],
    'lidar': ['lidar', 'slam', 'point-cloud', 'mapping'],
    'fpga': ['fpga', 'verilog', 'vhdl', 'digital-design'],
    'circuit': ['oscilloscope', 'signal-analysis', 'analog'],
    'signal': ['oscilloscope', 'signal-analysis', 'mixed-signal'],
    'pcr': ['pcr', 'qpcr', 'gene-expression', 'molecular-biology'],
    'bio': ['bioprinting', 'tissue-engineering', 'biosignal', 'biomaterials'],
    'print': ['bioprinting', '3d-printing'],
    'eeg': ['eeg', 'bci', 'neuroscience', 'brain-computer-interface'],
    'brain': ['eeg', 'bci', 'neuroscience', 'brain-computer-interface'],
    'gpu': ['deep-learning', 'cuda', 'pytorch', 'hpc'],
    'edge': ['edge-ai', 'jetson', 'tinyml', 'inference'],
    'iot': ['edge-ai', 'tinyml', 'sensor', 'autonomous'],
    'sensor': ['sensor', 'autonomous', 'iot'],
    'obstacle': ['computer-vision', 'autonomous', 'drone', 'lidar'],
    'navigation': ['slam', 'autonomous', 'ros2', 'mapping'],
    'detect': ['computer-vision', 'deep-learning', 'inference'],
    'debug': ['oscilloscope', 'logic-analyzer', 'protocol', 'debug'],
    'protocol': ['protocol', 'spi', 'i2c', 'uart', 'logic-analyzer'],
    'dna': ['dna', 'rna', 'pcr', 'molecular-biology'],
    'protein': ['protein', 'spectrophotometer', 'concentration'],
    'tissue': ['tissue-engineering', 'bioprinting', 'biomaterials'],
    'neural': ['deep-learning', 'bci', 'neuroscience'],
    'autonomous': ['autonomous', 'autonomous-vehicle', 'ros2', 'slam'],
    'manufacture': ['robotic-arm', 'pick-and-place', 'manufacturing'],
    'agriculture': ['iot', 'sensor', 'edge-ai', 'tinyml'],
    'nlp': ['llm', 'deep-learning', 'training'],
    'language': ['llm', 'deep-learning', 'training'],
    'inference': ['inference', 'edge-ai', 'tflite', 'onnx'],
    'real-time': ['edge-ai', 'inference', 'ros2', 'autonomous'],
    'yolo': ['computer-vision', 'deep-learning', 'inference', 'edge-ai'],
    'mapping': ['slam', 'mapping', 'point-cloud', 'lidar'],
  };

  // Score each equipment by matching tags
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
    // Bonus for available equipment
    if (eq.status === 'Available Now') score += 3;
    return { equipment: eq, score };
  });

  return scores
    .filter(s => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map(s => s.equipment);
}

/**
 * Generate a natural-language explanation for why equipment was recommended.
 */
function generateMatchExplanation(eq: Equipment, description: string): string {
  const desc = description.toLowerCase();
  const reasons: string[] = [];

  if (eq.category === 'GPU Workstation' && (desc.includes('train') || desc.includes('model') || desc.includes('deep'))) {
    reasons.push(`ideal for model training with ${eq.specs.split(',')[0]}`);
  }
  if (eq.category === 'Dev Kit' && (desc.includes('edge') || desc.includes('real-time') || desc.includes('inference'))) {
    reasons.push(`supports real-time edge inference`);
  }
  if (desc.includes('drone') && eq.tags.includes('drone')) {
    reasons.push('drone-compatible platform with SDK support');
  }
  if (desc.includes('vision') && eq.tags.includes('computer-vision')) {
    reasons.push('optimized for computer vision workloads');
  }
  if (desc.includes('robot') && (eq.tags.includes('robotics') || eq.tags.includes('robotic-arm'))) {
    reasons.push('robotics-ready with motion control support');
  }

  if (reasons.length === 0) {
    reasons.push(`matches your project requirements based on capabilities: ${eq.tags.slice(0, 3).join(', ')}`);
  }

  const statusNote = eq.status === 'Available Now'
    ? '✅ Available now'
    : eq.status === 'High Demand'
    ? '⚠️ High demand — book early'
    : '🔧 Currently in maintenance';

  return `**${eq.name}** (${eq.department})\n${reasons.join('; ')}.\nLocation: ${eq.location} | ${statusNote}`;
}

/**
 * Generate conflict resolution explanation.
 */
function generateConflictExplanation(result: ConflictResult, equipmentName: string): string {
  if (!result.hasConflict) {
    return `✅ No conflicts detected! Your booking for **${equipmentName}** is clear.`;
  }

  const conflictNames = result.conflictingBookings
    .map(b => `${b.userName} (${b.projectType}, priority: ${b.priority})`)
    .join(', ');

  let explanation = `⚠️ **Scheduling Conflict Detected** for ${equipmentName}\n\n`;
  explanation += `Conflicting with: ${conflictNames}\n\n`;
  explanation += `The LabLink engine analyzed **deadline urgency**, **project type priority**, **historical usage fairness**, and **equipment criticality** to generate ${result.recommendations.length} smart alternatives:\n\n`;

  result.recommendations.forEach((rec, i) => {
    const icon = rec.type === 'alternative-slot' ? '🕐' : rec.type === 'cross-department' ? '🔄' : '✂️';
    explanation += `${i + 1}. ${icon} **${rec.title}** (${rec.confidence}% confidence)\n   ${rec.description}\n\n`;
  });

  return explanation;
}

/**
 * Generate AI triage brief for faculty approval queue.
 */
function generateTriageBrief(request: ProjectRequest, bookings: Booking[]): string {
  const daysUntilDeadline = Math.ceil(
    (new Date(request.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );

  const urgencyLevel = daysUntilDeadline <= 3 ? 'CRITICAL' : daysUntilDeadline <= 7 ? 'HIGH' : daysUntilDeadline <= 14 ? 'MODERATE' : 'LOW';

  const equipNames = request.requiredEquipment
    .map(id => equipmentMap.get(id)?.name ?? id)
    .join(', ');

  const highDemandItems = request.requiredEquipment
    .map(id => equipmentMap.get(id))
    .filter(eq => eq?.status === 'High Demand')
    .map(eq => eq!.name);

  const conflictingBookings = bookings.filter(b =>
    request.requiredEquipment.includes(b.equipmentId) &&
    b.userId !== request.userId &&
    b.status === 'Confirmed'
  );

  let brief = `**Risk Assessment:** ${urgencyLevel} urgency (${daysUntilDeadline} days to deadline)\n`;
  brief += `**Equipment Requested:** ${equipNames}\n`;

  if (highDemandItems.length > 0) {
    brief += `**⚠️ High-Demand Resources:** ${highDemandItems.join(', ')} — may impact other students\n`;
  }

  if (conflictingBookings.length > 0) {
    brief += `**🔴 Existing Conflicts:** ${conflictingBookings.length} overlapping booking(s) detected\n`;
  }

  brief += `**Hours Requested:** ${request.requiredHours}h total\n`;

  // Recommendation
  if (request.requiredHours > 20) {
    brief += `**💡 Recommendation:** Approve with daily cap of ${Math.ceil(request.requiredHours / 7)}h blocks to maximize shared access. `;
  } else {
    brief += `**💡 Recommendation:** Approve full allocation. `;
  }

  if (highDemandItems.length > 0) {
    brief += `Suggest off-peak morning slots (8-10 AM) for high-demand items.`;
  }

  return brief;
}

// ── PUBLIC API ───────────────────────────────────────────────

export async function matchProjectToEquipment(
  description: string,
): Promise<{ equipment: Equipment[]; explanation: string; source: 'gemini' | 'fallback' }> {
  // Try Gemini first
  const prompt = `You are LabLink, a university lab equipment advisor. A student describes their project below. 
Recommend the top 3-5 most relevant lab equipment from this catalog:
${equipment.map(e => `- ${e.id}: ${e.name} (${e.department}) — ${e.specs}. Tags: ${e.tags.join(', ')}`).join('\n')}

Student's project description: "${description}"

For each recommended equipment, explain WHY it's relevant and note any prerequisites. Format as a helpful, concise list.`;

  const geminiResponse = await callGemini(prompt);

  if (geminiResponse) {
    // Parse equipment IDs from response (best-effort)
    const matchedEquipment = equipment.filter(eq =>
      geminiResponse.toLowerCase().includes(eq.id) ||
      geminiResponse.toLowerCase().includes(eq.name.toLowerCase())
    ).slice(0, 5);

    return {
      equipment: matchedEquipment.length > 0 ? matchedEquipment : fallbackProjectMatcher(description),
      explanation: geminiResponse,
      source: 'gemini',
    };
  }

  // Intelligent fallback
  const matched = fallbackProjectMatcher(description);
  const explanations = matched.map(eq => generateMatchExplanation(eq, description));

  return {
    equipment: matched,
    explanation: matched.length > 0
      ? `Based on your project description, here are the best matching resources across our campus labs:\n\n${explanations.join('\n\n')}`
      : `I couldn't find specific matches for your description. Try refining your search with keywords like "GPU", "drone", "FPGA", "PCR", or "sensor". You can also browse all ${equipment.length} items in the Equipment Discovery panel.`,
    source: 'fallback',
  };
}

export function explainConflictResolution(result: ConflictResult, equipmentId: string): string {
  const eq = equipmentMap.get(equipmentId);
  return generateConflictExplanation(result, eq?.name ?? 'Unknown Equipment');
}

export function generateApprovalTriageBrief(request: ProjectRequest, bookings: Booking[]): string {
  return generateTriageBrief(request, bookings);
}

export async function generateFacultySummary(
  request: ProjectRequest,
  bookings: Booking[],
): Promise<{ summary: string; source: 'gemini' | 'fallback' }> {
  const prompt = `You are an AI assistant for a university lab coordinator. Summarize this project access request for quick faculty review:

Project: ${request.title}
Student: ${request.userName}
Type: ${request.projectType}
Deadline: ${request.deadline}
Equipment: ${request.requiredEquipment.map(id => equipmentMap.get(id)?.name ?? id).join(', ')}
Hours: ${request.requiredHours}
Justification: ${request.justification}
Team: ${request.teamMembers.join(', ')}

Provide: 1) Risk assessment, 2) Prerequisite check status, 3) Utilization impact, 4) Recommended approval action (approve/modify/request info). Keep it concise (3-4 sentences).`;

  const geminiResponse = await callGemini(prompt);

  if (geminiResponse) {
    return { summary: geminiResponse, source: 'gemini' };
  }

  return {
    summary: generateTriageBrief(request, bookings),
    source: 'fallback',
  };
}

export function isGeminiConfigured(): boolean {
  return !!GEMINI_API_KEY && GEMINI_API_KEY !== 'your_gemini_api_key_here';
}
