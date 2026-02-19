import { GoogleGenerativeAI, type GenerateContentRequest } from '@google/generative-ai';

// Get API key from environment variables
function getApiKey(): string {
  const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY or NEXT_PUBLIC_GEMINI_API_KEY must be set in environment variables.');
  }
  return apiKey;
}

// Initialize Gemini AI client
function getGeminiClient() {
  return new GoogleGenerativeAI(getApiKey());
}

// Helper to select model based on thinking level
function selectModel(thinkingLevel: 'high' | 'low' = 'low'): string {
  return thinkingLevel === 'high' ? 'gemini-2.0-flash' : 'gemini-2.0-flash';
}

// --- Types ---

export type VideoConcept = {
  title: string;
  hook: string;
  outline: string;
  platform?: string;
  angle?: string;
};

export type VideoScript = {
  hook: string;
  body: string;
  cta: string;
  onScreenText?: string[];
};

type GenerateVisionBiosInput = {
  vision: string;
  userId?: string;
  refinement?: string;
  thinkingLevel?: 'high' | 'low';
};

type GenerateVideoIdeasInput = {
  niche: string;
  topic?: string;
  userId?: string;
  thinkingLevel?: 'high' | 'low';
};

type GeneratePlatformSpecificBlueprintsInput = {
  idea: string;
  userId?: string;
  thinkingLevel?: 'high' | 'low';
};

type GenerateCaptionInput = {
  imageBase64?: string;
  context?: string;
  platform: 'instagram' | 'tiktok' | 'x' | 'linkedin';
  tone?: string;
};

export type CaptionResult = {
  captions: string[];
  hashtags: string[];
  strategyNote: string;
};

export type VisionBios = {
  authority: string[];
  relatability: string[];
  mystery: string[];
};

<<<<<<< Current (Your changes)
export type IdeaAnalysis = {
  viralScore: number;
  prediction: string;
  tasks: string[];
  confidenceLevel: string;
};

export type PostAssets = {
  hookCaption: string;
  storyCaption: string;
  minimalistCaption: string;
  hashtags: string[];
  firstComment: string;
};

export type LogoConcept = {
  title: string;
  description: string;
  visualPrompt: string;
  placeholderImage: string;
};

export type DescriptionOption = {
  text: string;
  strategyTags: string[];
  strategyNote: string;
};

export type DescriptionResult = {
  options: DescriptionOption[];
};

export type BannerConcept = {
  styleName: string;
  visualDescription: string;
  colorPalette: string[];
  reasoning: string;
};

export type BannerConceptsResult = {
  concepts: BannerConcept[];
};

export type VideoBlueprint = {
  hook: string;
  meat: string[];
  cta: string;
  setup_tip: string;
};

export type PlatformSpecificBlueprints = {
  tiktok: VideoBlueprint;
  instagram: VideoBlueprint;
  x: VideoBlueprint;
};

export type VideoScriptVariation = {
  name: string;
  hook: string;
  meat: string[];
  cta: string;
  setup_tip: string;
=======
export type VideoBlueprint = { hook: string; meat: string[]; cta: string; setup_tip?: string };
export type PlatformSpecificBlueprints = {
  tiktok?: { hook: string; meat: string[]; cta: string; setup_tip?: string };
  instagram?: { hook: string; meat: string[]; cta: string; setup_tip?: string };
  x?: { hook: string; meat: string[]; cta: string; setup_tip?: string };
>>>>>>> Incoming (Background Agent changes)
};

// --- Context & History Helpers ---

async function getUserContentHistory(userId?: string): Promise<string | null> {
  if (!userId) return null;
  try {
    const { supabase } = await import('@/lib/supabaseClient');
    const { data, error } = await supabase
      .from('user_content_history')
      .select('content_text')
      .eq('user_id', userId)
      .maybeSingle();

    if (error || !data?.content_text) return null;
    return data.content_text;
  } catch {
    return null;
  }
}

export type NexusChatMessage = { role: 'user' | 'model'; parts: [{ text: string }] };

/**
 * Context-aware chat with Nexus. Fetches user's profile and saved blueprints, injects into system prompt.
 */
export async function chatWithNexus(
  messages: NexusChatMessage[],
  userId: string
): Promise<string> {
  const genAI = getGeminiClient();
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.0-flash',
    systemInstruction: await buildNexusSystemPrompt(userId),
  });

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await model.generateContent({ contents: messages } as any);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error("🔥 GENESIS ERROR:", error);
    console.error('chatWithNexus error:', error);
    throw new Error('Nexus is having trouble responding. Please try again.');
  }
}

async function buildNexusSystemPrompt(userId: string): Promise<string> {
  const { supabase } = await import('@/lib/supabaseClient');

  const { data: profile } = await supabase
    .from('profiles')
    .select('brand_vision, full_name, niche, vibe')
    .eq('id', userId)
    .maybeSingle();

  const { data: blueprints } = await supabase
    .from('saved_blueprints')
    .select('idea')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(3);

  const userName = profile?.full_name || 'there';
  const vision = profile?.brand_vision || 'Not set yet';
  const niche = profile?.niche || '';
  const vibe = profile?.vibe || '';
  const titles = (blueprints || []).map((b) => b.idea).filter(Boolean).join(', ') || 'None yet';

  return `You are Nexus, a strategic content advisor for creators. You are talking to ${userName}.

Their brand vision: ${vision}
${niche ? `Niche: ${niche}` : ''}
${vibe ? `Vibe: ${vibe}` : ''}

Their past successful scripts/titles: ${titles}

CRITICAL: Give SPECIFIC, tailored advice—never generic tips. Reference their vision, niche, and past scripts. Sound like you know them. Be punchy, direct, and conversational.`;
}

// --- Proven Bio Patterns ---

const PROVEN_BIO_PATTERNS = `
THE AUTHORITY STACK:
- Pattern: [Credible Claim] + [Specific Result] + [Social Proof] + [Clear CTA]
- Human Tone: Confident but not arrogant. Numbers add credibility.
- Example: "Scaling B2B founders to $5M/yr. Helped 400+ startups. DM 'SCALE' to begin."

THE FOUNDER NARRATIVE:
- Pattern: [Building/Creating] + [What You're Obsessed With] + [Community Invitation]
- Human Tone: Passionate and relatable. Shows personality.
- Example: "Building Octane Nexus. Obsessed with AI & Growth. Join 5k others learning daily 👇"

THE VALUE DEALER:
- Pattern: [I help WHO] + [Achieve WHAT] + [Without PAIN] + [Free Offer/CTA]
- Human Tone: Direct and helpful. Focuses on transformation.
- Example: "I help busy dads get fit without gym memberships. Grab the 15-min protocol:"

THE MYSTERY BUILDER:
- Pattern: [Intriguing Hook] + [Vague but Compelling] + [Curiosity Gap] + [Subtle CTA]
- Human Tone: Intriguing without being gimmicky. Creates FOMO.
- Example: "There's a $50k/month method most creators miss. Sharing it with 500 smart founders."
`;

// --- Core Functions ---

export async function generateVisionBios(
  input: GenerateVisionBiosInput
): Promise<VisionBios> {
  const { vision, userId, refinement, thinkingLevel = 'low' } = input;

  if (!vision.trim()) {
    throw new Error('Please share your vision first.');
  }

  const genAI = getGeminiClient();
  const model = genAI.getGenerativeModel({ model: selectModel(thinkingLevel) });

  const brandVoice = userId ? await getUserContentHistory(userId) : null;

  const prompt = `You are an expert personal branding strategist who creates human-sounding, high-converting social media bios.

MISSION: Write bios that sound like a real person wrote them—not a robot. Use proven patterns that convert.

PROVEN BIO PATTERNS TO USE:
${PROVEN_BIO_PATTERNS}

USER'S VISION: "${vision.trim()}"
${refinement ? `REFINEMENT REQUEST: ${refinement}` : ''}
${brandVoice ? `MATCH THIS USER'S VOICE: ${brandVoice}` : ''}

CRITICAL INSTRUCTIONS:
1. For "Authority": Use THE AUTHORITY STACK pattern. Sound confident and credible.
2. For "Relatability": Use THE FOUNDER NARRATIVE or VALUE DEALER pattern. Sound human and approachable.
3. For "Mystery": Use THE MYSTERY BUILDER pattern. Create intrigue without being gimmicky.

WRITING RULES:
- Write in first person or second person naturally
- Use real language—no corporate speak
- Emojis: Use 1-2 max, only when they add personality (not decoration)
- Each bio should read like a complete thought (not a list of fragments)
- Vary the structure but stay true to the pattern's core

Generate 3 distinct bios for each strategy. Each bio should be a full, natural sentence or two that a human would actually write.

Return strictly valid JSON:
{
  "authority": ["Full bio sentence option 1", "Full bio sentence option 2", "Full bio sentence option 3"],
  "relatability": ["Full bio sentence option 1", "Full bio sentence option 2", "Full bio sentence option 3"],
  "mystery": ["Full bio sentence option 1", "Full bio sentence option 2", "Full bio sentence option 3"]
}`;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // Parse JSON response
    const jsonString = text.replace(/```json/g, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(jsonString);
    return parsed as VisionBios;
  } catch (error) {
    console.error("🔥 GENESIS ERROR:", error);
    console.error('Error generating vision bios:', error);
    throw new Error('Failed to generate bios. Please try again.');
  }
}

export async function generateVideoIdeas(
  input: GenerateVideoIdeasInput
): Promise<string[]> {
  const { niche, topic, userId, thinkingLevel = 'low' } = input;

  if (!niche.trim()) {
    throw new Error('Please provide a niche.');
  }

  const genAI = getGeminiClient();
  const model = genAI.getGenerativeModel({ model: selectModel(thinkingLevel) });

  let brandVision = '';
  let vibe = '';
  if (userId) {
    try {
      const { supabase } = await import('@/lib/supabaseClient');
      const { data } = await supabase
        .from('profiles')
        .select('brand_vision, vibe')
        .eq('id', userId)
        .maybeSingle();
      brandVision = data?.brand_vision || '';
      vibe = data?.vibe || '';
    } catch {
      // ignore
    }
  }
  void (userId ? getUserContentHistory(userId) : null);

  const identityBlock =
    brandVision || vibe
      ? `You are brainstorming for a creator who focuses on ${niche} with a ${vibe || 'distinct'} style. Their vision is: ${brandVision || 'building their brand'}. Generate ideas that fit this specific identity—NOT generic tips.`
      : '';

  const prompt = topic?.trim()
    ? `${identityBlock}

Generate 5 viral video ideas about "${topic.trim()}" for this creator.
- Output SPECIFIC, tailored concepts—never generic advice.
- Each idea must feel custom to their niche and vibe.
- Filmable, actionable, curiosity-driving hooks only.
- Return ONLY a JSON array of strings: ["Idea 1", "Idea 2", "Idea 3", "Idea 4", "Idea 5"]
- No markdown, no explanations, just the array`
    : `${identityBlock || `Generate 5 trending viral video ideas for the ${niche} niche.`}

- Output SPECIFIC, tailored concepts—never generic advice.
- Each idea must be filmable and actionable.
- Return ONLY a JSON array of strings: ["Idea 1", "Idea 2", "Idea 3", "Idea 4", "Idea 5"]
- No markdown, no explanations, just the array`;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    const jsonString = text.replace(/```json/g, '').replace(/```/g, '').trim();
    const jsonStart = jsonString.indexOf('[');
    const jsonEnd = jsonString.lastIndexOf(']') + 1;

    if (jsonStart === -1 || jsonEnd === 0) {
      throw new Error('Invalid JSON format');
    }

    const finalJson = jsonString.substring(jsonStart, jsonEnd);
    return JSON.parse(finalJson) as string[];
  } catch (error) {
    console.error("🔥 GENESIS ERROR:", error);
    console.error('Error generating video ideas:', error);
    throw new Error('Failed to generate video ideas. Please try again.');
  }
}

export async function generatePlatformSpecificBlueprints(
  input: GeneratePlatformSpecificBlueprintsInput
): Promise<PlatformSpecificBlueprints> {
  const { idea, userId, thinkingLevel = 'high' } = input;

  if (!idea.trim()) {
    throw new Error('Please provide an idea.');
  }

  const genAI = getGeminiClient();
  const model = genAI.getGenerativeModel({ model: selectModel(thinkingLevel) });

  const brandVoice = userId ? await getUserContentHistory(userId) : null;

  const prompt = `Create platform-specific video blueprints for this idea: "${idea.trim()}"

${brandVoice ? `MATCH THIS USER'S VOICE: ${brandVoice}` : ''}

Generate blueprints for TikTok, Instagram, and X (Twitter). Each blueprint must include:
- hook: A compelling opening line (3-5 seconds)
- meat: Array of 3-5 middle beats (key points/visuals)
- cta: A clear call-to-action
- setup_tip: Brief tip on how to film/setup

Platform-specific requirements:
- TikTok: Focus on visual hooks, quick cuts, trending formats
- Instagram: Focus on engagement, storytelling, aesthetic
- X: Focus on viral text, threads, engagement hooks

Return strictly valid JSON:
{
  "tiktok": {
    "hook": "...",
    "meat": ["...", "..."],
    "cta": "...",
    "setup_tip": "..."
  },
  "instagram": {
    "hook": "...",
    "meat": ["...", "..."],
    "cta": "...",
    "setup_tip": "..."
  },
  "x": {
    "hook": "...",
    "meat": ["...", "..."],
    "cta": "...",
    "setup_tip": "..."
  }
}`;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    const jsonString = text.replace(/```json/g, '').replace(/```/g, '').trim();
    const jsonStart = jsonString.indexOf('{');
    const jsonEnd = jsonString.lastIndexOf('}') + 1;

    if (jsonStart === -1 || jsonEnd === 0) {
      throw new Error('Invalid JSON format');
    }

    const finalJson = jsonString.substring(jsonStart, jsonEnd);
    return JSON.parse(finalJson) as PlatformSpecificBlueprints;
  } catch (error) {
    console.error("🔥 GENESIS ERROR:", error);
    console.error('Error generating platform blueprints:', error);
    throw new Error('Failed to generate platform blueprints. Please try again.');
  }
}

type GenerateVideoScriptInput = {
  topic: string;
  userId?: string;
};

export async function generateVideoScript(
  input: GenerateVideoScriptInput | string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- reserved for audience/vibe context
  _audience?: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- reserved for vibe context
  _vibe?: string
): Promise<VideoScriptVariation[]> {
  const topic = typeof input === 'string' ? input : input.topic;
  const userId = typeof input === 'object' ? input.userId : undefined;

  if (!topic.trim()) {
    throw new Error('Please provide a topic.');
  }

  let niche = '';
  let vibe = '';
  if (userId) {
    try {
      const { supabase } = await import('@/lib/supabaseClient');
      const { data } = await supabase
        .from('profiles')
        .select('niche, vibe')
        .eq('id', userId)
        .maybeSingle();
      niche = data?.niche || '';
      vibe = data?.vibe || '';
    } catch {
      // ignore
    }
  }

  const genAI = getGeminiClient();
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

  const contextLine = niche || vibe
    ? `Write scripts for a ${niche || 'content'} creator with a ${vibe || 'distinct'} style about [Topic].`
    : '';

  const prompt = `${contextLine ? contextLine + '\n\n' : ''}Create 3 distinct video script variations for:

TOPIC: "${topic.trim()}"
${niche ? `NICHE: ${niche}` : ''}
${vibe ? `VIBE: ${vibe}` : ''}

Generate exactly 3 variations with distinct styles:
1. The Hook-Master: Opens with a punchy, scroll-stopping hook. Gets attention in the first 2 seconds.
2. The Storyteller: Leads with a relatable story or scenario. Draws the viewer in with narrative.
3. The Value-Bomb: Opens with a bold promise or insight. Immediately delivers high-value angle.

Each script MUST include:
- hook: A compelling opening line (3-5 seconds of speaking)
- meat: Array of 3-5 core content beats (key points or visuals)
- cta: A clear call-to-action
- setup_tip: Brief lighting/angle/framing advice for filming (e.g., "Face the window for soft light", "Close-up on hands for demos")—make it feel like a real director is helping them

Return strictly valid JSON array:
[
  {
    "name": "The Hook-Master",
    "hook": "...",
    "meat": ["...", "..."],
    "cta": "...",
    "setup_tip": "..."
  },
  {
    "name": "The Storyteller",
    "hook": "...",
    "meat": ["...", "..."],
    "cta": "...",
    "setup_tip": "..."
  },
  {
    "name": "The Value-Bomb",
    "hook": "...",
    "meat": ["...", "..."],
    "cta": "...",
    "setup_tip": "..."
  }
]`;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    const jsonString = text.replace(/```json/g, '').replace(/```/g, '').trim();
    const jsonStart = jsonString.indexOf('[');
    const jsonEnd = jsonString.lastIndexOf(']') + 1;

    if (jsonStart === -1 || jsonEnd === 0) {
      throw new Error('Invalid JSON format');
    }

    const finalJson = jsonString.substring(jsonStart, jsonEnd);
    return JSON.parse(finalJson) as VideoScriptVariation[];
  } catch (error) {
    console.error("🔥 GENESIS ERROR:", error);
    console.error('Error generating video scripts:', error);
    throw new Error('Failed to generate video scripts. Please try again.');
  }
}

export type VideoInspirationItem = {
  title: string;
  channelName: string;
  views: string;
  thumbnailColor: string;
};

export async function generateVideoInspiration(niche: string): Promise<VideoInspirationItem[]> {
  const genAI = getGeminiClient();
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

  const prompt = `Generate 3 YouTube video ideas relevant to this niche: "${niche || 'content creator'}"

For each video, provide:
- title: A catchy YouTube video title
- channelName: A realistic channel name that might upload this
- views: A plausible view count (e.g. "1.2M views", "450K views")
- thumbnailColor: A hex color without # for thumbnail placeholder (e.g. "1e293b", "0ea5e9", "10b981")

Return strictly valid JSON array:
[
  {
    "title": "...",
    "channelName": "...",
    "views": "...",
    "thumbnailColor": "1e293b"
  },
  ...
]`;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    const jsonString = text.replace(/```json/g, '').replace(/```/g, '').trim();
    const jsonStart = jsonString.indexOf('[');
    const jsonEnd = jsonString.lastIndexOf(']') + 1;

    if (jsonStart === -1 || jsonEnd === 0) {
      throw new Error('Invalid JSON format');
    }

    const finalJson = jsonString.substring(jsonStart, jsonEnd);
    return JSON.parse(finalJson) as VideoInspirationItem[];
  } catch (error) {
    console.error("🔥 GENESIS ERROR:", error);
    console.error('Error generating video inspiration:', error);
    throw new Error('Failed to generate video inspiration. Please try again.');
  }
}

export type VisualAnalysisResult = {
  viralHook: string;
  caption: string;
  hashtags: string[];
};

export async function analyzeVisualContent(
  mediaBase64: string,
  mimeType: string,
  platform: 'instagram' | 'tiktok' | 'youtube' | 'x',
  vibe: string
): Promise<VisualAnalysisResult> {
  const genAI = getGeminiClient();
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

  const cleanBase64 = mediaBase64.includes(',') ? mediaBase64.split(',')[1] || mediaBase64 : mediaBase64;

  const parts: { inlineData?: { mimeType: string; data: string }; text?: string }[] = [
    {
      inlineData: {
        mimeType: mimeType.startsWith('video/') ? mimeType : mimeType || 'image/jpeg',
        data: cleanBase64,
      },
    },
    {
      text: `You are an expert viral content strategist. Analyze this ${mimeType.startsWith('video/') ? 'video' : 'image'} and generate platform-optimized content.

PLATFORM: ${platform}
VIBE: ${vibe}

TASK: Generate exactly:
1. viralHook: A punchy text overlay idea (3-7 words) that could appear on the image/video to stop the scroll. Make it scroll-stopping.
2. caption: A full caption optimized for ${platform} — platform-specific length and style. Engaging, shareable.
3. hashtags: Exactly 30 hashtags as a JSON array. Mix high-volume (#1M+) and niche (#10k-500k) tags. Relevant to the content.

Return ONLY valid JSON:
{
  "viralHook": "...",
  "caption": "...",
  "hashtags": ["#tag1", "#tag2", ...]
}`,
    },
  ];

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await model.generateContent({ contents: [{ role: 'user', parts }] } as any);
    const response = await result.response;
    const text = response.text();

    const jsonString = text.replace(/```json/g, '').replace(/```/g, '').trim();
    const jsonStart = jsonString.indexOf('{');
    const jsonEnd = jsonString.lastIndexOf('}') + 1;

    if (jsonStart === -1 || jsonEnd === 0) {
      throw new Error('Invalid JSON format');
    }

    const parsed = JSON.parse(jsonString.substring(jsonStart, jsonEnd)) as VisualAnalysisResult;
    if (!parsed.viralHook || !parsed.caption || !Array.isArray(parsed.hashtags)) {
      throw new Error('Invalid response structure');
    }
    return parsed;
  } catch (error) {
    console.error("🔥 GENESIS ERROR:", error);
    console.error('Error analyzing visual content:', error);
    throw new Error('Failed to analyze content. Please try again.');
  }
}

export async function generateSocialCaption(
  input: GenerateCaptionInput
): Promise<CaptionResult> {
  const { imageBase64, context, platform, tone } = input;

  const genAI = getGeminiClient();
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

  const prompt = `You are a social media manager for ${platform}.
CONTEXT: ${context || 'Analyze this image and write a caption.'}
TONE: ${tone || 'Engaging and authentic'}

TASK:
1. Analyze the image (if provided) or context.
2. Write 3 distinct caption options:
   - Option 1: Short & Punchy (Viral style)
   - Option 2: Storytelling/Value (Educational/Personal)
   - Option 3: Question/Engagement (Drive comments)
3. Generate a set of 15-20 relevant, high-reach hashtags.
4. Provide a 1-sentence strategy note on why these angles work.

Return strictly valid JSON:
{
  "captions": ["Option 1 text", "Option 2 text", "Option 3 text"],
  "hashtags": ["#tag1", "#tag2", ...],
  "strategyNote": "Analysis of why this works..."
}`;

  try {
    const parts: { text?: string; inlineData?: { mimeType: string; data: string } }[] = [{ text: prompt }];

    if (imageBase64) {
      const cleanBase64 = imageBase64.split(',')[1] || imageBase64;
      parts.push({
        inlineData: {
          mimeType: 'image/jpeg',
          data: cleanBase64,
        },
      });
    }

    const request: GenerateContentRequest = { contents: [{ role: 'user', parts }] } as unknown as GenerateContentRequest;
    const result = await model.generateContent(request);
    const response = await result.response;
    const text = response.text();

    const jsonString = text.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(jsonString) as CaptionResult;
  } catch (error) {
    console.error("🔥 GENESIS ERROR:", error);
    console.error('Error generating social caption:', error);
    throw new Error('Failed to generate caption. Please try again.');
  }
}

export async function generatePostAssets(
  mediaType: 'image' | 'video',
  vibe: string,
  platform: 'instagram' | 'tiktok' | 'x' | 'youtube',
  goal: 'comments' | 'sales' | 'reach'
): Promise<PostAssets> {
  const genAI = getGeminiClient();
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

  const prompt = `Generate post assets for ${platform}.

Media Type: ${mediaType}
Vibe: ${vibe}
Goal: ${goal}

Generate:
1. hookCaption: Short, punchy hook (viral style)
2. storyCaption: Longer storytelling caption
3. minimalistCaption: Very short, minimalist version
4. hashtags: Array of 30 optimized hashtags for ${platform}
5. firstComment: An engagement starter comment to pin

Return strictly valid JSON:
{
  "hookCaption": "...",
  "storyCaption": "...",
  "minimalistCaption": "...",
  "hashtags": ["#tag1", "#tag2", ...],
  "firstComment": "..."
}`;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    const jsonString = text.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(jsonString) as PostAssets;
  } catch (error) {
    console.error("🔥 GENESIS ERROR:", error);
    console.error('Error generating post assets:', error);
    throw new Error('Failed to generate post assets. Please try again.');
  }
}

export async function generateVisionHandles(input: { vision: string }): Promise<string[]> {
  const genAI = getGeminiClient();
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

  const prompt = `Generate 5 catchy, brandable social media handles for: "${input.vision}". Return comma-separated list. No numbers unless clever.`;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    return text.split(',').map((h: string) => h.trim().replace('@', '')).filter(h => h.length > 0);
  } catch (error) {
    console.error("🔥 GENESIS ERROR:", error);
    console.error('Error generating handles:', error);
    throw new Error('Failed to generate handles. Please try again.');
  }
}

export async function analyzeIdea(idea: string, niche: string): Promise<IdeaAnalysis> {
  const genAI = getGeminiClient();
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

  const prompt = `Analyze this content idea for viral potential: "${idea}" in the niche: "${niche}".

You MUST return ONLY a JSON object with:
- viralScore: number from 0-100 (your predicted performance score)
- prediction: string explaining WHY you think it will perform that way (strengths + weaknesses)
- tasks: array of 3-5 actionable strings like ["Script the hook", "Film B-roll", "Edit captions"]
- confidenceLevel: string like "85% confident based on your last 3 posts"

Do NOT return markdown, prose, or commentary. JSON only.`;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    const jsonString = text.replace(/```json/g, '').replace(/```/g, '').trim();
    const jsonStart = jsonString.indexOf('{');
    const jsonEnd = jsonString.lastIndexOf('}') + 1;

    if (jsonStart === -1 || jsonEnd === 0) {
      throw new Error('Invalid JSON format');
    }

    const finalJson = jsonString.substring(jsonStart, jsonEnd);
    return JSON.parse(finalJson) as IdeaAnalysis;
  } catch (error) {
    console.error("🔥 GENESIS ERROR:", error);
    console.error('Error analyzing idea:', error);
    throw new Error('Failed to analyze idea. Please try again.');
  }
}

export async function generateLogoConcepts(brandVision: string): Promise<LogoConcept[]> {
  const genAI = getGeminiClient();
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

  const prompt = `Generate 3 distinct logo concepts for: "${brandVision}".

STRICT style (non-negotiable): Flat vector art, minimal tech startup logo, solid colors only, no shading, no gradients, no shadows, white background. Style: Apple, Uber, Stripe. No complex details, no photorealism.

Each concept must include:
- title: A catchy name for the concept
- description: Strategic reasoning for why this style works
- visualPrompt: Must STRICTLY describe flat vector art, minimal tech startup logo, solid colors only, no shading, no gradients, no shadows, white background. Style like Apple, Uber, Stripe. No complex details.
- placeholderImage: Use Unsplash placeholder URL (e.g., https://images.unsplash.com/photo-1620325867502-221cfb5faa5f?w=400&h=300&fit=crop&q=80)

Return strictly valid JSON array:
[
  {
    "title": "...",
    "description": "...",
    "visualPrompt": "...",
    "placeholderImage": "..."
  },
  ...
]`;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    const jsonString = text.replace(/```json/g, '').replace(/```/g, '').trim();
    const jsonStart = jsonString.indexOf('[');
    const jsonEnd = jsonString.lastIndexOf(']') + 1;

    if (jsonStart === -1 || jsonEnd === 0) {
      throw new Error('Invalid JSON format');
    }

    const finalJson = jsonString.substring(jsonStart, jsonEnd);
    return JSON.parse(finalJson) as LogoConcept[];
  } catch (error) {
    console.error("🔥 GENESIS ERROR:", error);
    console.error('Error generating logo concepts:', error);
    // Fallback to default concepts
    return [
      {
        title: 'Modern Minimalist Monogram',
        description: 'Minimalism builds trust and authority through simplicity.',
        visualPrompt: `Flat vector art, minimal tech startup logo: ultra-clean monogram inspired by ${brandVision}, bold sans-serif letters, solid colors only, no shading no gradients no shadows, white background. Style: Apple, Uber, Stripe. No complex details.`,
        placeholderImage: 'https://images.unsplash.com/photo-1620325867502-221cfb5faa5f?w=400&h=300&fit=crop&q=80',
      },
      {
        title: 'Abstract Tech Symbol',
        description: 'Innovation and data-driven design.',
        visualPrompt: `Flat vector art, minimal tech startup logo: abstract geometric icon representing ${brandVision}, interconnected nodes, solid colors only, no shading no gradients no shadows, white background. Style: Apple, Uber, Stripe. No complex details.`,
        placeholderImage: 'https://images.unsplash.com/photo-1635322966219-b75e37aaf953?w=400&h=300&fit=crop&q=80',
      },
      {
        title: 'Bold Mascot Emblem',
        description: 'Community and energy.',
        visualPrompt: `Flat vector art, minimal tech startup logo: bold emblem for ${brandVision}, simplified mascot inside a shield, solid colors only, no shading no gradients no shadows, white background. Style: Apple, Uber, Stripe. No complex details.`,
        placeholderImage: 'https://images.unsplash.com/photo-1629904853090-ecf24f13fe6b?w=400&h=300&fit=crop&q=80',
      },
    ];
  }
}

export async function generateDescriptionOptions(
  vision: string,
  platform: 'youtube' | 'x',
  refinement?: string
): Promise<DescriptionResult> {
  const genAI = getGeminiClient();
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

  const platformContext = platform === 'youtube'
    ? 'YouTube channel description (SEO-optimized, up to 5000 characters)'
    : 'X (Twitter) professional bio (character-limited, punchy)';

  const prompt = `You are an expert social media strategist creating ${platformContext} for: "${vision}"

${refinement ? `REFINEMENT: ${refinement}` : ''}

Generate 3 distinct description options. Each must include:
- text: The description text
- strategyTags: Array of tags like ["SEO Optimized", "Authority Building"]
- strategyNote: One sentence explaining the approach

Return strictly valid JSON:
{
  "options": [
    {
      "text": "...",
      "strategyTags": ["...", "..."],
      "strategyNote": "..."
    },
    ...
  ]
}`;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    const jsonString = text.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(jsonString) as DescriptionResult;
  } catch (error) {
    console.error("🔥 GENESIS ERROR:", error);
    console.error('Error generating descriptions:', error);
    throw new Error('Failed to generate descriptions. Please try again.');
  }
}

export async function generateBannerConcepts(
  niche: string,
  vibe: string,
  platform: 'youtube' | 'x'
): Promise<BannerConceptsResult> {
  const genAI = getGeminiClient();
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

  const prompt = `Generate 3 banner design concepts for ${platform}.

Niche: ${niche}
Vibe: ${vibe}

Each concept must include:
- styleName: A catchy name
- visualDescription: Detailed description for image generation
- colorPalette: Array of 3-5 hex colors
- reasoning: Why this style works

Return strictly valid JSON:
{
  "concepts": [
    {
      "styleName": "...",
      "visualDescription": "...",
      "colorPalette": ["#000000", "#F59E0B"],
      "reasoning": "..."
    },
    ...
  ]
}`;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    const jsonString = text.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(jsonString) as BannerConceptsResult;
  } catch (error) {
    console.error("🔥 GENESIS ERROR:", error);
    console.error('Error generating banner concepts:', error);
    throw new Error('Failed to generate banner concepts. Please try again.');
  }
}

// --- Calibration Functions (for RealityCheck) ---

type CalibrationOutcome = 'viral' | 'average' | 'flop';

type CalibrationState = {
  offset: number;
  feedbackCount: number;
};

const CALIBRATION_STORAGE_KEY = 'octane_calibration_state';

function loadCalibrationState(): CalibrationState {
  if (typeof window === 'undefined') {
    return { offset: 0, feedbackCount: 0 };
  }
  try {
    const raw = window.localStorage.getItem(CALIBRATION_STORAGE_KEY);
    if (!raw) return { offset: 0, feedbackCount: 0 };
    const parsed = JSON.parse(raw) as CalibrationState;
    if (typeof parsed.offset !== 'number' || typeof parsed.feedbackCount !== 'number') {
      return { offset: 0, feedbackCount: 0 };
    }
    return parsed;
  } catch {
    return { offset: 0, feedbackCount: 0 };
  }
}

function saveCalibrationState(state: CalibrationState) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(CALIBRATION_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore
  }
}

export function getCalibrationLevel(): number {
  const state = loadCalibrationState();
  return Math.max(1, 1 + Math.floor(state.feedbackCount / 3));
}

export function applyCalibrationFeedback(predictedScore: number, outcome: CalibrationOutcome) {
  const state = loadCalibrationState();
  const isHighScore = predictedScore >= 80;
  let { offset, feedbackCount } = state;

  if (isHighScore) {
    if (outcome === 'flop') {
      offset -= 0.1;
    } else if (outcome === 'viral') {
      offset += 0.05;
    }
  }

  offset = Math.max(-0.4, Math.min(0.4, offset));
  feedbackCount += 1;

  saveCalibrationState({ offset, feedbackCount });
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars -- used by calibration UI
function _buildConfidenceLabel(): string {
  const { feedbackCount } = loadCalibrationState();
  const level = getCalibrationLevel();
  const base = 70;
  const bonus = Math.min(20, feedbackCount * 2);
  const confidence = Math.max(50, Math.min(97, base + bonus + (level - 1) * 3));
  return `${confidence}% confident based on your recent feedback`;
}

// --- Legacy/Compatibility Functions ---

export async function generateLibrarianInsight(input: { savedIdeas: string[]; userName?: string }): Promise<string> {
  const genAI = getGeminiClient();
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

  const prompt = `Analyze these saved content ideas and provide strategic insights:

${input.savedIdeas.map((idea, i) => `${i + 1}. ${idea}`).join('\n')}

${input.userName ? `User: ${input.userName}` : ''}

Provide 3-5 bullet points on:
- Content patterns and themes
- Monetization opportunities
- Audience alignment
- Growth strategies`;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error("🔥 GENESIS ERROR:", error);
    console.error('Error generating librarian insight:', error);
    return 'Could not generate insight at this time.';
  }
}

// Legacy function signature for compatibility
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- legacy API
export async function generateBrandBrief(_input: unknown): Promise<Record<string, unknown>> {
  return { niche: 'General', vibe: 'Authentic', nameOptions: ['Brand1', 'Brand2'] };
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars -- legacy API
export async function generateBios(_input: unknown): Promise<string[]> {
  return ['Bio 1', 'Bio 2', 'Bio 3'];
}

/** Strip ```json and ``` markdown tags from AI response. */
function cleanJsonResponse(raw: string): string {
  return raw
    .replace(/```json\s*/gi, '')
    .replace(/```\s*/g, '')
    .trim();
}

/** Safely parse script JSON; on failure return raw text as body. */
function safeParseScriptJson(raw: string): VideoScript {
  const cleaned = cleanJsonResponse(raw);
  const jsonStart = cleaned.indexOf('{');
  const jsonEnd = cleaned.lastIndexOf('}') + 1;

  if (jsonStart === -1 || jsonEnd <= 0) {
    return { hook: '', body: cleaned || raw, cta: '' };
  }

  try {
    const parsed = JSON.parse(cleaned.substring(jsonStart, jsonEnd)) as Partial<VideoScript>;
    return {
      hook: typeof parsed.hook === 'string' ? parsed.hook : '',
      body: typeof parsed.body === 'string' ? parsed.body : cleaned || raw,
      cta: typeof parsed.cta === 'string' ? parsed.cta : '',
    };
  } catch {
    return { hook: '', body: cleaned || raw, cta: '' };
  }
}

export async function generateScript(title: string, angle: string, visual: string): Promise<VideoScript> {
  const genAI = getGeminiClient();
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

  const prompt = `Write a script for "${title}". Angle: ${angle}. Visual: ${visual}. Return JSON: {hook, body, cta}.`;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    if (!text) {
      return { hook: '', body: 'No content generated. Please try again.', cta: '' };
    }

    return safeParseScriptJson(text);
  } catch (error: unknown) {
    console.error('Error generating script:', error);
    throw new Error('Failed to generate script. Please try again.');
  }
}

export async function getTrendingTopic(niche: string): Promise<string> {
  const genAI = getGeminiClient();
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

  const prompt = `Generate ONE trending hook/topic for the "${niche}" niche. Make it specific, intriguing, and viral-worthy. Return ONLY the hook text, no JSON, no explanations.`;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text().trim();
  } catch (error) {
    console.error("🔥 GENESIS ERROR:", error);
    console.error('Error generating trending topic:', error);
    throw new Error('Failed to generate trending topic. Please try again.');
  }
}

export async function generateVideoConcepts(niche: string): Promise<VideoConcept[]> {
  const genAI = getGeminiClient();
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

  const prompt = `Generate 5 viral video concepts for "${niche}". 

Each concept must include:
- title: A compelling video title
- hook: A strong opening hook (3-5 seconds)
- outline: Brief outline of the video structure
- platform: Suggested platform (optional)
- angle: The angle/approach (optional)

Return strictly valid JSON array:
[
  {
    "title": "...",
    "hook": "...",
    "outline": "...",
    "platform": "...",
    "angle": "..."
  },
  ...
]`;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    const jsonString = text.replace(/```json/g, '').replace(/```/g, '').trim();
    const jsonStart = jsonString.indexOf('[');
    const jsonEnd = jsonString.lastIndexOf(']') + 1;

    if (jsonStart === -1 || jsonEnd === 0) {
      throw new Error('Invalid JSON format');
    }

    const finalJson = jsonString.substring(jsonStart, jsonEnd);
    return JSON.parse(finalJson) as VideoConcept[];
  } catch (error) {
    console.error("🔥 GENESIS ERROR:", error);
    console.error('Error generating video concepts:', error);
    throw new Error('Failed to generate video concepts. Please try again.');
  }
}

export async function generateTopCreators(niche: string): Promise<Array<{ name: string; handle: string; whyFollow: string }>> {
  const genAI = getGeminiClient();
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

  const prompt = `Generate 3-5 top creators/influencers in the niche: "${niche}". For each, provide: name, handle (with @), and a brief "why to follow" summary (1 sentence). Return ONLY a JSON array with objects containing: name, handle, whyFollow. No markdown.`;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    const jsonString = text.replace(/```json/g, '').replace(/```/g, '').trim();
    const jsonStart = jsonString.indexOf('[');
    const jsonEnd = jsonString.lastIndexOf(']') + 1;

    if (jsonStart === -1 || jsonEnd === 0) {
      throw new Error('Invalid JSON format');
    }

    const finalJson = jsonString.substring(jsonStart, jsonEnd);
    return JSON.parse(finalJson);
  } catch (error) {
    console.error("🔥 GENESIS ERROR:", error);
    console.error('Error generating top creators:', error);
    throw new Error('Failed to generate top creators. Please try again.');
  }
}

export async function generateToolRecommendations(niche: string): Promise<Array<{ name: string; category: string; whyUse: string }>> {
  const genAI = getGeminiClient();
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

  const prompt = `Generate 3-5 software tools/apps recommended for content creators in the niche: "${niche}". For each, provide: name, category, and a brief "why use" summary (1 sentence). Return ONLY a JSON array with objects containing: name, category, whyUse. No markdown.`;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    const jsonString = text.replace(/```json/g, '').replace(/```/g, '').trim();
    const jsonStart = jsonString.indexOf('[');
    const jsonEnd = jsonString.lastIndexOf(']') + 1;

    if (jsonStart === -1 || jsonEnd === 0) {
      throw new Error('Invalid JSON format');
    }

    const finalJson = jsonString.substring(jsonStart, jsonEnd);
    return JSON.parse(finalJson);
  } catch (error) {
    console.error('Error generating tool recommendations:', error);
    throw new Error('Failed to generate tool recommendations. Please try again.');
  }
}