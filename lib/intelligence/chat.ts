import { buildNexusIntelligence, type OrchestratorStrategicFlags } from './orchestrator';
import type { GrowthContext } from './context';
import type { NexusUserProfile } from './profile';
import type { HistoricalPostData } from './patterns';
import { callGeminiModel, extractGeminiText } from '@/lib/geminiModels';

export interface NexusChatInput {
  message: string;
  historicalPosts: HistoricalPostData[];
  userProfile: NexusUserProfile;
}

interface SystemPromptPayload {
  growthContext: GrowthContext;
  performanceSummary: { weeklyAverage: number; predictionBias: number };
  strategicFlags: OrchestratorStrategicFlags;
  timingAdvice?: string;
  formatAdvice?: string;
  platformAdvice?: string;
  userProfile: NexusUserProfile;
}

function getToneInstruction(experienceLevel: string): string {
  switch (experienceLevel) {
    case 'beginner':
      return 'Explain concepts simply and step-by-step. Be encouraging and avoid jargon.';
    case 'advanced':
      return 'Be concise and tactical. Assume they know basics; focus on optimization and next moves.';
    case 'intermediate':
    default:
      return 'Balance clarity with depth. One or two concrete next steps per point.';
  }
}

function buildSystemPrompt(payload: SystemPromptPayload): string {
  const { growthContext, performanceSummary, strategicFlags, timingAdvice, formatAdvice, platformAdvice, userProfile } = payload;
  const insights = growthContext.keyInsights?.length ? growthContext.keyInsights.join('\n') : 'No insights yet.';
  const activeFlags = Object.entries(strategicFlags)
    .filter(([, v]) => Boolean(v))
    .map(([k]) => k);
  const flagsList = activeFlags.join(', ') || 'None';
  const hasFlags = activeFlags.length > 0;
  const tone = getToneInstruction(userProfile?.identity?.experienceLevel ?? 'intermediate');

  const profileSection = `## User profile
- Niche: ${userProfile?.identity?.niche ?? 'Not set'}
- Business type: ${userProfile?.identity?.businessType ?? 'creator'}
- Primary goal: ${userProfile?.identity?.primaryGoal ?? 'growth'}
- Platform focus: ${Array.isArray(userProfile?.identity?.platformFocus) ? userProfile.identity.platformFocus.join(', ') : 'none'}
- Experience: ${userProfile?.identity?.experienceLevel ?? 'intermediate'}
- Avg posts/week: ${userProfile?.behavior?.avgPostsPerWeek ?? 0}
${userProfile?.behavior?.dominantFormat ? `- Dominant format: ${userProfile.behavior.dominantFormat}` : ''}`;

  const performanceSection = `## Performance (ONLY use these numbers—do not invent any other metrics)
- Average predicted score: ${growthContext.averagePredictedScore}
- Average actual score: ${growthContext.averageActualScore}
- Prediction bias: ${growthContext.predictionBias}
- Weekly average (actual): ${performanceSummary.weeklyAverage}
${growthContext.strongestPlatform != null ? `- Strongest platform: ${growthContext.strongestPlatform}` : ''}
${growthContext.weakestPlatform != null ? `- Weakest platform: ${growthContext.weakestPlatform}` : ''}
${growthContext.bestFormat != null ? `- Best format: ${growthContext.bestFormat}` : ''}
${growthContext.weakestFormat != null ? `- Weakest format: ${growthContext.weakestFormat}` : ''}
${growthContext.weekOverWeekChange != null ? `- Week-over-week change: ${growthContext.weekOverWeekChange}` : ''}
${growthContext.consistencyScore != null ? `- Consistency score: ${growthContext.consistencyScore}` : ''}
${growthContext.engagementVolatility != null ? `- Engagement volatility: ${growthContext.engagementVolatility}` : ''}`;

  const proactiveInstruction = hasFlags
    ? `\nIMPORTANT: At least one strategic flag is active (${flagsList}). Start your response by briefly calling out these issues and why they matter, then answer the user's question.\n`
    : '';

  return `You are Nexus, a high-level social media growth strategist.
You speak clearly, confidently, and strategically.
HALLUCINATION GUARD: Do not invent numbers, percentages, or metrics not listed in the Performance section below. Only cite data from this payload. If the user asks for something not in the data, say you don't have that data and offer what you can from what is provided.
Tone: ${tone}
${proactiveInstruction}

${profileSection}

${performanceSection}

## Strategic flags (address if true)
${flagsList}

## Advice
${timingAdvice ? `Timing: ${timingAdvice}` : ''}
${formatAdvice ? `Format: ${formatAdvice}` : ''}
${platformAdvice ? `Platform: ${platformAdvice}` : ''}

## Key insights
${insights}

When the user asks a question: answer using only the data above, reference real metrics from the Performance section, give 2–4 strategic recommendations, keep tone supportive but high-status, and avoid generic advice.`;
}

// TODO: Add proactive recommendation mode, memory expansion, persona tuning based on experienceLevel.
export async function generateNexusResponse(input: NexusChatInput): Promise<string> {
  const { message, historicalPosts, userProfile } = input;

  const output = buildNexusIntelligence({ historicalPosts, userProfile });
  const {
    growthContext,
    performanceSummary,
    strategicFlags,
    timingAdvice,
    formatAdvice,
    platformAdvice,
  } = output;

  const systemPrompt = buildSystemPrompt({
    growthContext,
    performanceSummary,
    strategicFlags,
    timingAdvice,
    formatAdvice,
    platformAdvice,
    userProfile: output.profile,
  });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return 'Nexus is unavailable: no API key configured. Set GEMINI_API_KEY in your environment.';
  }

  // Routed through the shared caller so Nexus chat inherits the model
  // fallback chain instead of dying whenever Google retires a model.
  try {
    const result = await callGeminiModel(apiKey, {
      systemInstruction: { parts: [{ text: systemPrompt }] },
      contents: [{ role: 'user', parts: [{ text: message }] }],
      generationConfig: { maxOutputTokens: 1000 },
    });

    if (!result.ok) {
      console.error('generateNexusResponse: Gemini error', result.status, result.error);
      throw new Error('Nexus is having trouble responding. Please try again.');
    }

    const text = extractGeminiText(result.data);
    return text.trim() || 'Nexus could not generate a response.';
  } catch (err) {
    console.error('generateNexusResponse error:', err);
    throw new Error('Nexus is having trouble responding. Please try again.');
  }
}
