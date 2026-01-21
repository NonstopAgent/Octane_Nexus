import { createClient } from '@supabase/supabase-js';

// Manual API Key - Paste your key directly here to bypass .env issues
const MANUAL_API_KEY = "AIzaSyCns6Z23t2MltuoqqAjcBggsziuIrTDLi0"; // PASTE YOUR KEY INSIDE THESE QUOTES

// Helper function to get API key (prioritizes manual key)
function getApiKey(): string | undefined {
  return MANUAL_API_KEY || process.env.GEMINI_API_KEY;
}

// Verify GEMINI_API_KEY on module load
if (typeof process !== 'undefined') {
  const apiKey = getApiKey();
  if (!apiKey) {
    console.warn('⚠️ WARNING: GEMINI_API_KEY is not set in environment variables or MANUAL_API_KEY.');
  }
}

// --- Proven Bio Patterns (The "Success Database") ---
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

// --- Types ---

type GenerateBiosInput = {
  niche: string;
  vibe: string;
  userId?: string;
};

type GenerateVisionBiosInput = {
  vision: string;
  userId?: string;
  refinement?: string;
};

type GenerateBrandBriefInput = {
  userId?: string;
  vision?: string;
};

type GenerateVideoIdeasInput = {
  niche: string;
  userId?: string;
};

type GenerateVideoBlueprintInput = {
  idea: string;
  userId?: string;
};

type GenerateCaptionInput = {
  imageBase64?: string; // Optional image data
  context?: string;     // User's description or context
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

// --- Context & History Helpers ---

async function getUserContentHistory(userId?: string): Promise<string | null> {
  if (!userId) return null;
  try {
    // Dynamic import to avoid circular dependencies if any
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

// --- API Helper with Mock Data Safety Net ---

async function callGeminiAPI(
  apiKey: string,
  requestBody: any,
  model: string = 'gemini-1.5-flash'
): Promise<{ ok: boolean; data: any; error: string | null } | null> {
  try {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    });

    // If 404, log and return null (safety net will handle it)
    if (response.status === 404) {
      const errorText = await response.text();
      let errorJson;
      try {
        errorJson = JSON.parse(errorText);
        console.warn(`⚠️ API returned 404:`, errorJson?.error?.message || errorText);
      } catch {
        console.warn(`⚠️ API returned 404:`, errorText);
      }
      return null; // Return null instead of throwing
    }

    // If not OK, log and return null
    if (!response.ok) {
      const errorText = await response.text();
      let errorJson;
      try {
        errorJson = JSON.parse(errorText);
        console.warn(`⚠️ API Error (${response.status}):`, errorJson?.error?.message || errorText);
      } catch {
        console.warn(`⚠️ API Error (${response.status}):`, errorText);
      }
      return null; // Return null instead of throwing
    }

    // Success - return data
    const data = await response.json();
    return { ok: true, data, error: null };
  } catch (error: any) {
    // Network errors, timeouts, etc. - catch everything and return null
    console.warn(`⚠️ API call failed:`, error?.message || 'Unknown error');
    return null; // Return null instead of throwing
  }
}

// --- Mock Data Safety Net ---

function getMockVisionBios(vision: string, refinement?: string): VisionBios {
  const lowerVision = vision.toLowerCase();
  let mockBios: VisionBios;

  if (lowerVision.includes('fitness') || lowerVision.includes('dad') || lowerVision.includes('gym')) {
    mockBios = {
      authority: [
        "Transforming busy dads into fit fathers. Practical workouts that fit your life.",
        "Results-driven fitness for men who prioritize family. Join 2,000+ dads getting stronger.",
        "The 15-minute workout protocol that works for busy fathers. DM 'FIT' to start."
      ],
      relatability: [
        "I know what it's like to juggle work, kids, and gym time. Here's how I do it—and how you can too.",
        "Dad of 3. Built my best body in my 40s. No BS, just real results for busy men.",
        "From dad bod to strong dad. Sharing the workouts that actually fit into your life."
      ],
      mystery: [
        "The 15-minute workout that changed everything. What I learned in 5 years of dad life.",
        "The fitness industry won't tell you this. But busy dads deserve real results.",
        "There's a method most dads miss. Sharing it with 500 smart fathers who want to change."
      ]
    };
  } else if (lowerVision.includes('tech') || lowerVision.includes('ai') || lowerVision.includes('startup')) {
    mockBios = {
      authority: [
        "Building AI products that scale. Helped 50+ startups ship faster.",
        "Founder & AI engineer. Scaling SaaS from $0 to $5M ARR. Sharing what works.",
        "Turning AI ideas into profitable products. DM 'BUILD' for startup resources."
      ],
      relatability: [
        "Building in public. Learning AI as I go. Sharing wins, fails, and lessons.",
        "Started coding at 30. Now building AI tools. If I can do it, you can too.",
        "Self-taught dev turned founder. Documenting my journey from zero to something."
      ],
      mystery: [
        "The AI tool that changed my workflow. Most devs don't know about this yet.",
        "There's a $10k/month AI side project most founders overlook. Here's how I found it.",
        "What I learned building AI products that actually sell. Not what they teach in courses."
      ]
    };
  } else {
    // Generic fallback
    mockBios = {
      authority: [
        "Building [your vision]. Helping others achieve [their goal].",
        "Expert in [your niche]. Results-driven approach that works.",
        "Transforming [target audience] through [your method]. DM to learn more."
      ],
      relatability: [
        "Just like you, I'm building [your vision]. Here's how I'm doing it.",
        "Real person, real journey. Sharing what I've learned so far.",
        "Learning as I go. Join me on this journey to [your goal]."
      ],
      mystery: [
        "The secret to [your goal] that most people miss. Here's what I discovered.",
        "What I learned building [your vision]. The industry won't tell you this.",
        "There's a method that changed everything for me. Sharing it with smart builders."
      ]
    };
  }

  // Apply refinement if provided
  if (refinement?.toLowerCase().includes('funny') || refinement?.toLowerCase().includes('funnier')) {
    mockBios.relatability[0] = "😂 I make dad jokes AND build brands. The struggle is real, but we're winning!";
  }
  if (refinement?.toLowerCase().includes('professional') || refinement?.toLowerCase().includes('professional')) {
    mockBios.authority[0] = "Executive consultant specializing in strategic brand development and digital transformation.";
  }

  return mockBios;
}

// --- Core Functions ---

export async function generateVisionBios(
  input: GenerateVisionBiosInput
): Promise<VisionBios> {
  const { vision, userId, refinement } = input;

  if (!vision.trim()) throw new Error('Please share your vision first.');

  const apiKey = getApiKey();
  
  // If no API key, return mock data immediately
  if (!apiKey) {
    console.warn('⚠️ No API key - returning mock bios');
    return getMockVisionBios(vision, refinement);
  }

  const brandVoice = userId ? await getUserContentHistory(userId) : null;
  
  const requestBody = {
          contents: [
            {
              parts: [
                {
            text: `You are an expert personal branding strategist who creates human-sounding, high-converting social media bios.

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
}`
                },
              ],
            },
          ],
  };

  const result = await callGeminiAPI(apiKey, requestBody, 'gemini-1.5-flash');

  // Safety net: If API fails, return mock data
  if (!result || !result.ok) {
    console.warn('⚠️ API call failed - returning mock bios');
    return getMockVisionBios(vision, refinement);
  }
  
  const data = result.data;
  const textContent = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  
  // Safety check: Ensure textContent exists before string manipulation
  if (!textContent || typeof textContent !== 'string' || textContent.trim().length === 0) {
    console.warn('⚠️ Empty API response - returning mock bios');
    return getMockVisionBios(vision, refinement);
  }

  // JSON Parsing with cleanup - safe string manipulation
  try {
    let jsonString = textContent.replace(/```json/g, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(jsonString);
    return parsed as VisionBios;
  } catch (parseError) {
    console.warn('⚠️ JSON parse failed - returning mock bios:', parseError);
    return getMockVisionBios(vision, refinement);
  }
}

// --- NEW FEATURE: Social Caption Generator (Multimodal) ---

function getMockCaption(context?: string, platform?: string): CaptionResult {
  return {
    captions: [
      "Just dropped something new that changed everything. Tap in 👆",
      "Here's the full story behind this moment and why it matters to what we're building.",
      "What's one thing you wish you knew earlier? Drop it below 👇"
    ],
    hashtags: ['#motivation', '#hustle', '#success', '#growth', '#mindset', '#entrepreneur', '#buildinpublic', '#creativity'],
    strategyNote: "Three angles designed to maximize engagement: curiosity hook, storytelling value, and interactive question."
  };
}

export async function generateSocialCaption(
  input: GenerateCaptionInput
): Promise<CaptionResult> {
  const { imageBase64, context, platform, tone } = input;
  const apiKey = getApiKey();
  
  // If no API key, return mock data immediately
  if (!apiKey) {
    console.warn('⚠️ No API key - returning mock caption');
    return getMockCaption(context, platform);
  }

  // Construct prompt parts
  const promptText = `You are a social media manager for ${platform}.
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

  const requestBody: any = {
    contents: [
      {
        parts: [
          { text: promptText }
        ]
      }
    ]
  };

  // If image provided, add it to the request
  if (imageBase64) {
    const cleanBase64 = imageBase64.split(',')[1] || imageBase64;
    requestBody.contents[0].parts.push({
      inline_data: {
        mime_type: "image/jpeg",
        data: cleanBase64
      }
    });
  }

  // Always use Flash model for better image handling and faster responses
  const model = 'gemini-1.5-flash';

  const result = await callGeminiAPI(apiKey, requestBody, model);

  // Safety net: If API fails, return mock data
  if (!result || !result.ok) {
    console.warn('⚠️ API call failed - returning mock caption');
    return getMockCaption(context, platform);
  }

  const data = result.data;
  const textContent = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  
  // Safety check before string manipulation
  if (!textContent || typeof textContent !== 'string' || textContent.trim().length === 0) {
    console.warn('⚠️ Empty response - returning mock caption');
    return getMockCaption(context, platform);
  }

  try {
    // Safe string manipulation - textContent is guaranteed to be a string here
    let jsonString = textContent.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(jsonString) as CaptionResult;
  } catch (parseError) {
    console.warn('⚠️ Parse error - returning mock caption:', parseError);
    return getMockCaption(context, platform);
  }
}

// --- Viral Manufacturing Studio: Post Assets (Mock) ---

export type PostAssets = {
  hookCaption: string;
  storyCaption: string;
  minimalistCaption: string;
  hashtags: string[];
  firstComment: string;
};

type MediaType = 'image' | 'video';

export async function generatePostAssets(
  mediaType: MediaType,
  vibe: string,
  platform: 'instagram' | 'tiktok' | 'x' | 'youtube',
  goal: 'comments' | 'sales' | 'reach'
): Promise<PostAssets> {
  // Pure mock logic for now – no API calls. Can later be wired into Gemini.

  const lowerVibe = vibe.toLowerCase();
  const isVideo = mediaType === 'video';

  const platformLabel =
    platform === 'instagram'
      ? 'Instagram'
      : platform === 'tiktok'
      ? 'TikTok'
      : platform === 'x'
      ? 'X'
      : 'YouTube Shorts';

  const retentionPhrase = isVideo
    ? 'Wait until the end… 🤯'
    : 'Look closely at the details 👀';

  const vibePrefix =
    lowerVibe.includes('funny')
      ? 'Funny twist: '
      : lowerVibe.includes('controversial')
      ? 'Unpopular opinion: '
      : lowerVibe.includes('story')
      ? 'Story time: '
      : lowerVibe.includes('professional')
      ? 'Real talk: '
      : 'Here’s the play: ';

  const goalHook =
    goal === 'sales'
      ? 'If this speaks to you, the link is waiting. 🔗'
      : goal === 'comments'
      ? 'Drop your take in the comments. 💬'
      : 'Save this and send it to a friend who needs it. 🚀';

  // Captions
  const hookCaption = `${vibePrefix}${retentionPhrase} ${goalHook}`;

  const storyCaption = isVideo
    ? `I hit record on this ${platformLabel} and decided to show you the real process – no filters, no cuts.\n\nIf you’re in this season too, this one’s for you. ${goalHook}`
    : `This shot captures a moment most people never see.\n\nHere’s the story behind it and why it matters more than it looks. ${goalHook}`;

  const minimalistCaption = isVideo
    ? `One clip. One idea. ${goalHook}`
    : `One frame. A whole story. ${goalHook}`;

  // Platform‑specific hashtags
  let baseTags: string[] = [];
  if (platform === 'tiktok') {
    baseTags = ['#tiktok', '#fyp', '#foryou', '#viral', '#contentcreator', '#creatortok'];
  } else if (platform === 'instagram') {
    baseTags = ['#instagram', '#reels', '#instagood', '#contentcreator', '#reelitfeelit', '#explorepage'];
  } else if (platform === 'x') {
    baseTags = ['#Twitter', '#X', '#content', '#threads', '#timelines', '#buildinpublic'];
  } else {
    // youtube shorts
    baseTags = ['#youtube', '#shorts', '#youtubeshorts', '#creator', '#algorithm', '#recommended'];
  }

  const goalTags =
    goal === 'sales'
      ? ['#onlinebusiness', '#offer', '#funnel', '#launch', '#ecommerce']
      : goal === 'comments'
      ? ['#community', '#opinions', '#debate', '#question', '#yourturn']
      : ['#viral', '#reach', '#views', '#growth', '#scaleyourcontent'];

  const vibeTags =
    lowerVibe.includes('funny')
      ? ['#funny', '#relatable', '#humor']
      : lowerVibe.includes('story')
      ? ['#storytime', '#backstory', '#originstory']
      : lowerVibe.includes('controversial')
      ? ['#hottake', '#unpopularopinion', '#spicypost']
      : ['#education', '#tips', '#howto'];

  const hashtags = [...baseTags, ...goalTags, ...vibeTags].slice(0, 30);

  const firstComment =
    goal === 'comments'
      ? 'What part hit you the hardest? Be honest 👇'
      : goal === 'sales'
      ? 'Want the full breakdown / link? Comment “DETAILS” and I’ll drop it. 🔗'
      : 'Where would you use this idea in your content? Brainstorm with me below. 🧠';

  return {
    hookCaption,
    storyCaption,
    minimalistCaption,
    hashtags,
    firstComment,
  };
}

// --- Mock Video Concepts ---

function getMockVideoConcepts(niche: string): any[] {
  const lowerNiche = niche.toLowerCase();
  
  if (lowerNiche.includes('fitness') || lowerNiche.includes('dad') || lowerNiche.includes('gym')) {
    return [
      { title: "15-Minute Dad Workout That Actually Works", angle: "educational", visual: "Time-lapse of quick workout in living room while kids play" },
      { title: "Why Most Dads Quit the Gym (And What To Do Instead)", angle: "controversial", visual: "Split screen: crowded gym vs. home workout setup" },
      { title: "From Dad Bod to Strong: My 6-Month Journey", angle: "story", visual: "Before/after montage with family moments" }
    ];
  } else if (lowerNiche.includes('tech') || lowerNiche.includes('ai') || lowerNiche.includes('startup')) {
    return [
      { title: "5 AI Tools That Will 10x Your Productivity", angle: "educational", visual: "Screen recording showing tool demos" },
      { title: "Why Everyone's Wrong About AI (Hot Take)", angle: "controversial", visual: "Talking head with bold text overlays" },
      { title: "How I Built a $10K/Month AI Side Project", angle: "story", visual: "Desktop setup with code and analytics dashboard" }
    ];
  } else {
    // Generic fallback
    return [
      { title: `3 [${niche}] Tips That Changed Everything`, angle: "educational", visual: "Talking head explaining concepts" },
      { title: `The [${niche}] Secret Nobody Talks About`, angle: "controversial", visual: "Split screen comparison" },
      { title: `How I Mastered [${niche}] (Full Story)`, angle: "story", visual: "Journey montage with key moments" }
    ];
  }
}

// --- Brainstorming Fix (Prevents "reading 'replace'" crash) ---

export async function generateVideoConcepts(niche: string): Promise<any[]> {
    const apiKey = getApiKey();
    console.log('API Key Status:', apiKey ? 'Key Found' : 'Key Missing');
    
    // If no API key, return mock data immediately
  if (!apiKey) {
      console.warn('⚠️ No API key - returning mock video concepts');
      return getMockVideoConcepts(niche);
    }

    const requestBody = {
      contents: [{ 
        parts: [{ 
          text: `Generate 5 viral video concepts for "${niche}". 
          Return ONLY a JSON array with objects containing: title, angle, visual.
          NO markdown, NO explanations.` 
        }] 
      }]
    };

    const result = await callGeminiAPI(apiKey, requestBody, 'gemini-1.5-flash');

    // Safety net: If API fails, return mock data
    if (!result || !result.ok) {
      console.warn('⚠️ API call failed - returning mock video concepts');
      return getMockVideoConcepts(niche);
    }

    const data = result.data;
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    // Safety check: Ensure text exists before string manipulation
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      console.warn('⚠️ Empty API response - returning mock video concepts');
      return getMockVideoConcepts(niche);
  }

  try {
      // Safe string manipulation - text is guaranteed to be a string here
      const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
      // Sometimes Gemini adds "Here is the JSON..." - we need to find the array
      const jsonStart = cleanText.indexOf('[');
      const jsonEnd = cleanText.lastIndexOf(']') + 1;
      
      if (jsonStart === -1 || jsonEnd === 0) {
        console.warn('⚠️ Invalid JSON format - returning mock video concepts');
        return getMockVideoConcepts(niche);
      }
      
      const finalJson = cleanText.substring(jsonStart, jsonEnd);
      return JSON.parse(finalJson);
    } catch (parseError) {
      console.warn('⚠️ Parse error - returning mock video concepts:', parseError);
      return getMockVideoConcepts(niche);
    }
}

// --- Other Existing Functions ---

function getMockHandles(vision: string): string[] {
  const lowerVision = vision.toLowerCase();
  const clean = vision.replace(/[^a-z0-9]/gi, '').toLowerCase().substring(0, 10);
  
  if (lowerVision.includes('fitness') || lowerVision.includes('dad')) {
    return ['@fitdad_life', '@dads_get_strong', '@busydadfit', '@fatherhood_fitness', '@dadbod_strong'];
  } else if (lowerVision.includes('tech') || lowerVision.includes('ai')) {
    return ['@tech_builder', '@ai_maker', '@code_creator', '@startup_dev', '@build_in_public'];
  } else {
    return [`@${clean}life`, `@${clean}builder`, `@the_${clean}`, `@${clean}creates`, `@${clean}_daily`];
  }
}

export async function generateVisionHandles(input: { vision: string }): Promise<string[]> {
  const apiKey = getApiKey();
  
  // If no API key, return mock data immediately
  if (!apiKey) {
    console.warn('⚠️ No API key - returning mock handles');
    return getMockHandles(input.vision);
  }
  
  const requestBody = {
    contents: [{ parts: [{ text: `Generate 5 catchy, brandable social media handles for: "${input.vision}". Return comma-separated list. No numbers unless clever.` }] }]
  };

  const result = await callGeminiAPI(apiKey, requestBody, 'gemini-1.5-flash');
  
  // Safety net: If API fails, return mock data
  if (!result || !result.ok) {
    console.warn('⚠️ API call failed - returning mock handles');
    return getMockHandles(input.vision);
  }
  
  const data = result.data;
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  
  // Safety check before string manipulation
  if (!text || typeof text !== 'string') {
    console.warn('⚠️ Invalid response - returning mock handles');
    return getMockHandles(input.vision);
  }
  
  return text.split(',').map((h: string) => h.trim()).filter(h => h.length > 0);
}

function getMockScript(title: string, angle: string): any {
  return {
    hook: `You're about to learn something most people don't know about ${title}.`,
    body: `Here's the truth: ${angle}. In this video, I'm breaking down exactly what you need to know and how to apply it.`,
    cta: `If this helped, follow for more content like this. Drop a comment with your biggest takeaway!`
  };
}

export async function generateScript(title: string, angle: string, visual: string): Promise<any> {
    const apiKey = getApiKey();
    
    // If no API key, return mock data immediately
    if (!apiKey) {
      console.warn('⚠️ No API key - returning mock script');
      return getMockScript(title, angle);
    }

    const requestBody = {
      contents: [{ parts: [{ text: `Write a script for "${title}". Angle: ${angle}. Visual: ${visual}. Return JSON: {hook, body, cta}.` }] }]
    };

    const result = await callGeminiAPI(apiKey, requestBody, 'gemini-1.5-flash');
    
    // Safety net: If API fails, return mock data
    if (!result || !result.ok) {
      console.warn('⚠️ API call failed - returning mock script');
      return getMockScript(title, angle);
    }

    const data = result.data;
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    
    // Safety check before string manipulation
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      console.warn('⚠️ Empty response - returning mock script');
      return getMockScript(title, angle);
    }

    try {
      // Safe string manipulation - text is guaranteed to be a string here
      const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
      // Locate JSON object
      const start = cleanText.indexOf('{');
      const end = cleanText.lastIndexOf('}') + 1;
      
      if (start === -1 || end === 0) {
        console.warn('⚠️ Invalid JSON format - returning mock script');
        return getMockScript(title, angle);
      }
      
      return JSON.parse(cleanText.substring(start, end));
    } catch (parseError) {
      console.warn('⚠️ Parse error - returning mock script:', parseError);
      return getMockScript(title, angle);
    }
}

// --- Top Creators (Niche Giants) ---

type TopCreator = {
  name: string;
  handle: string;
  whyFollow: string;
};

function getMockTopCreators(niche: string): TopCreator[] {
  const lowerNiche = niche.toLowerCase();
  
  if (lowerNiche.includes('fitness') || lowerNiche.includes('dad') || lowerNiche.includes('gym')) {
    return [
      { name: 'Joe De Sena', handle: '@spartanrace', whyFollow: 'Founder of Spartan Race. Master of extreme fitness and mental toughness.' },
      { name: 'Jeff Cavaliere', handle: '@athleanx', whyFollow: 'Physical therapist turned fitness influencer. Science-backed training.' },
      { name: 'David Goggins', handle: '@davidgoggins', whyFollow: 'Navy SEAL. Extreme mental toughness and transformation stories.' }
    ];
  } else if (lowerNiche.includes('tech') || lowerNiche.includes('ai') || lowerNiche.includes('startup')) {
    return [
      { name: 'Paul Graham', handle: '@paulg', whyFollow: 'Y Combinator co-founder. Startup wisdom and founder stories.' },
      { name: 'Naval Ravikant', handle: '@naval', whyFollow: 'AngelList founder. Philosophy on wealth, happiness, and startups.' },
      { name: 'Sam Altman', handle: '@sama', whyFollow: 'OpenAI CEO. AI insights and startup scaling advice.' }
    ];
  } else {
    return [
      { name: 'Gary Vaynerchuk', handle: '@garyvee', whyFollow: 'Serial entrepreneur. Marketing, social media, and hustle mindset.' },
      { name: 'MrBeast', handle: '@MrBeast', whyFollow: 'YouTube legend. Viral content strategies and creator economy.' },
      { name: 'Alex Hormozi', handle: '@AlexHormozi', whyFollow: 'Business acquisition expert. Growth strategies and marketing.' }
    ];
  }
}

export async function generateTopCreators(niche: string): Promise<TopCreator[]> {
  const apiKey = getApiKey();
  
  // If no API key, return mock data immediately
  if (!apiKey) {
    console.warn('⚠️ No API key - returning mock top creators');
    return getMockTopCreators(niche);
  }

  const requestBody = {
    contents: [{ 
      parts: [{ 
        text: `Generate 3-5 top creators/influencers in the niche: "${niche}". For each, provide: name, handle (with @), and a brief "why to follow" summary (1 sentence). Return ONLY a JSON array with objects containing: name, handle, whyFollow. No markdown.` 
      }] 
    }]
  };

  const result = await callGeminiAPI(apiKey, requestBody, 'gemini-1.5-flash');

  // Safety net: If API fails, return mock data
  if (!result || !result.ok) {
    console.warn('⚠️ API call failed - returning mock top creators');
    return getMockTopCreators(niche);
  }

  const data = result.data;
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;

  // Safety check before string manipulation
  if (!text || typeof text !== 'string' || text.trim().length === 0) {
    console.warn('⚠️ Empty response - returning mock top creators');
    return getMockTopCreators(niche);
  }

  try {
    const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
    const jsonStart = cleanText.indexOf('[');
    const jsonEnd = cleanText.lastIndexOf(']') + 1;
    
    if (jsonStart === -1 || jsonEnd === 0) {
      console.warn('⚠️ Invalid JSON format - returning mock top creators');
      return getMockTopCreators(niche);
    }
    
    const finalJson = cleanText.substring(jsonStart, jsonEnd);
    return JSON.parse(finalJson);
  } catch (parseError) {
    console.warn('⚠️ Parse error - returning mock top creators:', parseError);
    return getMockTopCreators(niche);
  }
}

// --- Tool Recommendations (Creator Toolkit) ---

type ToolRecommendation = {
  name: string;
  category: string;
  whyUse: string;
};

function getMockToolRecommendations(niche: string): ToolRecommendation[] {
  const lowerNiche = niche.toLowerCase();
  
  if (lowerNiche.includes('fitness') || lowerNiche.includes('dad') || lowerNiche.includes('gym')) {
    return [
      { name: 'CapCut', category: 'Video Editing', whyUse: 'Free, powerful mobile video editor perfect for quick workout content.' },
      { name: 'InShot', category: 'Video Editing', whyUse: 'Simple mobile editing app. Great for fitness transformation videos.' },
      { name: 'Canva', category: 'Design', whyUse: 'Create eye-catching workout graphics and thumbnail templates.' }
    ];
  } else if (lowerNiche.includes('tech') || lowerNiche.includes('ai') || lowerNiche.includes('startup')) {
    return [
      { name: 'Screen Studio', category: 'Screen Recording', whyUse: 'Professional screen recordings with smooth animations for tech demos.' },
      { name: 'OBS Studio', category: 'Screen Recording', whyUse: 'Free, open-source screen recording and streaming software.' },
      { name: 'Notion', category: 'Productivity', whyUse: 'All-in-one workspace for organizing ideas, scripts, and content calendar.' }
    ];
  } else {
    return [
      { name: 'CapCut', category: 'Video Editing', whyUse: 'Free mobile and desktop video editor with viral-ready templates.' },
      { name: 'Canva', category: 'Design', whyUse: 'Quick graphics creation for thumbnails, posts, and brand assets.' },
      { name: 'Notion', category: 'Productivity', whyUse: 'Content calendar, idea vault, and script organization in one place.' }
    ];
  }
}

export async function generateToolRecommendations(niche: string): Promise<ToolRecommendation[]> {
  const apiKey = getApiKey();
  
  // If no API key, return mock data immediately
  if (!apiKey) {
    console.warn('⚠️ No API key - returning mock tool recommendations');
    return getMockToolRecommendations(niche);
  }

  const requestBody = {
    contents: [{ 
      parts: [{ 
        text: `Generate 3-5 software tools/apps recommended for content creators in the niche: "${niche}". For each, provide: name, category, and a brief "why use" summary (1 sentence). Return ONLY a JSON array with objects containing: name, category, whyUse. No markdown.` 
      }] 
    }]
  };

  const result = await callGeminiAPI(apiKey, requestBody, 'gemini-1.5-flash');

  // Safety net: If API fails, return mock data
  if (!result || !result.ok) {
    console.warn('⚠️ API call failed - returning mock tool recommendations');
    return getMockToolRecommendations(niche);
  }

  const data = result.data;
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;

  // Safety check before string manipulation
  if (!text || typeof text !== 'string' || text.trim().length === 0) {
    console.warn('⚠️ Empty response - returning mock tool recommendations');
    return getMockToolRecommendations(niche);
  }

  try {
    const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
    const jsonStart = cleanText.indexOf('[');
    const jsonEnd = cleanText.lastIndexOf(']') + 1;
    
    if (jsonStart === -1 || jsonEnd === 0) {
      console.warn('⚠️ Invalid JSON format - returning mock tool recommendations');
      return getMockToolRecommendations(niche);
    }
    
    const finalJson = cleanText.substring(jsonStart, jsonEnd);
    return JSON.parse(finalJson);
  } catch (parseError) {
    console.warn('⚠️ Parse error - returning mock tool recommendations:', parseError);
    return getMockToolRecommendations(niche);
  }
}

// --- Video Inspiration (YouTube Recommendations) ---

type VideoInspiration = {
  title: string;
  channelName: string;
  views: string;
  thumbnailColor: string;
};

function getMockVideoInspiration(niche: string): VideoInspiration[] {
  const lowerNiche = niche.toLowerCase();
  
  if (lowerNiche.includes('fitness') || lowerNiche.includes('dad') || lowerNiche.includes('gym')) {
    return [
      { title: '10 Fitness Content Tips That Actually Work', channelName: 'Creator Academy', views: '1.2M', thumbnailColor: 'f59e0b' },
      { title: 'How to Film Gym Videos That Get Views', channelName: 'Video Mastery', views: '856K', thumbnailColor: 'ef4444' },
      { title: 'Dad Fitness Content: Behind the Scenes', channelName: 'Dad Creator', views: '432K', thumbnailColor: '10b981' },
      { title: 'Viral Hook Formulas for Fitness Creators', channelName: 'Content Strategy', views: '2.1M', thumbnailColor: '3b82f6' },
      { title: 'Best Camera Settings for Workout Videos', channelName: 'Tech Tutorials', views: '623K', thumbnailColor: '8b5cf6' }
    ];
  } else if (lowerNiche.includes('tech') || lowerNiche.includes('ai') || lowerNiche.includes('startup')) {
    return [
      { title: 'How to Grow a Tech Brand on Social Media', channelName: 'Tech Marketing', views: '1.5M', thumbnailColor: 'f59e0b' },
      { title: 'AI Content Creation: Tools & Strategies', channelName: 'AI Academy', views: '892K', thumbnailColor: 'ef4444' },
      { title: 'Building in Public: A Complete Guide', channelName: 'Startup Stories', views: '3.2M', thumbnailColor: '10b981' },
      { title: 'Tech Founder Content That Converts', channelName: 'Founder Network', views: '1.8M', thumbnailColor: '3b82f6' },
      { title: 'Screen Recording Tips for Tech Tutorials', channelName: 'Video Pro', views: '567K', thumbnailColor: '8b5cf6' }
    ];
  } else {
    return [
      { title: 'How to Grow a Content Creator Brand', channelName: 'Creator Academy', views: '2.4M', thumbnailColor: 'f59e0b' },
      { title: 'Viral Hook Formulas That Work in 2025', channelName: 'Content Strategy', views: '1.9M', thumbnailColor: 'ef4444' },
      { title: 'Best Camera Settings for Social Media', channelName: 'Video Mastery', views: '1.1M', thumbnailColor: '10b981' },
      { title: 'Editing Workflow: Speed vs Quality', channelName: 'Creator Pro', views: '756K', thumbnailColor: '3b82f6' },
      { title: 'How to Batch Film Content Like a Pro', channelName: 'Productivity Tips', views: '934K', thumbnailColor: '8b5cf6' }
    ];
  }
}

export async function generateVideoInspiration(niche: string): Promise<VideoInspiration[]> {
  const apiKey = getApiKey();
  
  // If no API key, return mock data immediately
  if (!apiKey) {
    console.warn('⚠️ No API key - returning mock video inspiration');
    return getMockVideoInspiration(niche);
  }

  const requestBody = {
    contents: [{ 
      parts: [{ 
        text: `Generate 5 high-performing YouTube video titles/topics that a creator in the "${niche}" niche should watch for inspiration. Return ONLY a JSON array with objects containing: title, channelName, views (e.g. "1.2M"), thumbnailColor (hex color like "f59e0b"). No markdown, no explanations.` 
      }] 
    }]
  };

  const result = await callGeminiAPI(apiKey, requestBody, 'gemini-1.5-flash');

  // Safety net: If API fails, return mock data
  if (!result || !result.ok) {
    console.warn('⚠️ API call failed - returning mock video inspiration');
    return getMockVideoInspiration(niche);
  }

  const data = result.data;
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;

  // Safety check before string manipulation
  if (!text || typeof text !== 'string' || text.trim().length === 0) {
    console.warn('⚠️ Empty response - returning mock video inspiration');
    return getMockVideoInspiration(niche);
  }

  try {
    const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
    const jsonStart = cleanText.indexOf('[');
    const jsonEnd = cleanText.lastIndexOf(']') + 1;
    
    if (jsonStart === -1 || jsonEnd === 0) {
      console.warn('⚠️ Invalid JSON format - returning mock video inspiration');
      return getMockVideoInspiration(niche);
    }
    
    const finalJson = cleanText.substring(jsonStart, jsonEnd);
    return JSON.parse(finalJson);
  } catch (parseError) {
    console.warn('⚠️ Parse error - returning mock video inspiration:', parseError);
    return getMockVideoInspiration(niche);
  }
}

// --- Idea Analysis (Viral Predictor + Calibration) ---

export type IdeaAnalysis = {
  viralScore: number;           // 0-100 adjusted score
  prediction: string;           // AI's analysis/prediction
  tasks: string[];              // Actionable tasks array
  confidenceLevel: string;      // e.g. "85% confident based on your recent feedback"
};

type CalibrationOutcome = 'viral' | 'average' | 'flop';

type CalibrationState = {
  offset: number;        // score multiplier offset, e.g. -0.1 => 10% stricter
  feedbackCount: number; // how many times the user has calibrated
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
  // Simple mapping: each 3 feedback events increases level by 1
  return Math.max(1, 1 + Math.floor(state.feedbackCount / 3));
}

export function applyCalibrationFeedback(predictedScore: number, outcome: CalibrationOutcome) {
  const state = loadCalibrationState();

  // Only adjust calibration when we were "confident" (high predicted score)
  const isHighScore = predictedScore >= 80;
  let { offset, feedbackCount } = state;

  if (isHighScore) {
    if (outcome === 'flop') {
      // Become stricter: lower future scores by ~10%
      offset -= 0.1;
    } else if (outcome === 'viral') {
      // Become slightly more confident / generous
      offset += 0.05;
    }
  }

  // Clamp offset to a reasonable range [-0.4, +0.4]
  offset = Math.max(-0.4, Math.min(0.4, offset));
  feedbackCount += 1;

  saveCalibrationState({ offset, feedbackCount });
}

function buildConfidenceLabel(): string {
  const { feedbackCount } = loadCalibrationState();
  const level = getCalibrationLevel();
  const base = 70;
  const bonus = Math.min(20, feedbackCount * 2); // up to +20 from feedback volume
  const confidence = Math.max(50, Math.min(97, base + bonus + (level - 1) * 3));
  return `${confidence}% confident based on your recent feedback`;
}

function getMockIdeaAnalysis(idea: string, niche: string): IdeaAnalysis {
  const lowerIdea = idea.toLowerCase();
  const lowerNiche = niche.toLowerCase();

  if (lowerIdea.includes('how to') || lowerIdea.includes('tips') || lowerIdea.includes('secret')) {
    return {
      viralScore: 85,
      prediction: 'Strong educational angle with clear value proposition. The "how-to" format has proven engagement rates. This hook is strong but the middle section needs more visual breaks to maintain retention.',
      tasks: [
        'Script the hook with a curiosity gap',
        'Film B-roll showing before/after visuals',
        'Add on-screen text with key takeaways',
        'Edit captions with a strong CTA'
      ],
      confidenceLevel: buildConfidenceLabel(),
    };
  } else if (lowerIdea.includes('behind the scenes') || lowerIdea.includes('journey') || lowerIdea.includes('story')) {
    return {
      viralScore: 80,
      prediction: 'Storytelling angle works well for relatability. Consider adding a specific transformation or number. The narrative flow is solid, but the opening needs a stronger hook to capture attention in the first 3 seconds.',
      tasks: [
        'Craft a hook that teases the outcome',
        'Film authentic behind-the-scenes footage',
        'Edit to maintain pacing and momentum',
        'Write captions that complement the story'
      ],
      confidenceLevel: buildConfidenceLabel(),
    };
  } else if (lowerIdea.includes('mistake') || lowerIdea.includes('wrong') || lowerIdea.includes('don\'t')) {
    return {
      viralScore: 90,
      prediction: 'Contrarian angles perform exceptionally well. This creates curiosity and engagement. The controversial angle is strong, but make sure the middle provides value, not just shock.',
      tasks: [
        'Script a bold, controversial opening',
        'Film examples showing the mistake vs. correct way',
        'Add visual proof to support your claims',
        'Edit captions that invite debate and engagement'
      ],
      confidenceLevel: buildConfidenceLabel(),
    };
  } else {
    return {
      viralScore: 70,
      prediction: 'Solid foundation, but needs a stronger hook to stand out in the algorithm. The idea has potential but the execution needs refinement. Focus on creating a curiosity gap in the opening.',
      tasks: [
        'Refine the hook with a specific number or claim',
        'Script the body with clear value points',
        'Plan visuals that support each key point',
        'Write captions with a clear call-to-action'
      ],
      confidenceLevel: buildConfidenceLabel(),
    };
  }
}

export async function analyzeIdea(idea: string, niche: string): Promise<IdeaAnalysis> {
  const apiKey = getApiKey();

  // If no API key, return mock data immediately
  if (!apiKey) {
    console.warn('⚠️ No API key - returning mock idea analysis');
    return getMockIdeaAnalysis(idea, niche);
  }

  const requestBody = {
    contents: [{
      parts: [{
        text: `Analyze this content idea for viral potential: "${idea}" in the niche: "${niche}".

You MUST return ONLY a JSON object with:
- viralScore: number from 0-100 (your predicted performance score)
- prediction: string explaining WHY you think it will perform that way (strengths + weaknesses)
- tasks: array of 3-5 actionable strings like ["Script the hook", "Film B-roll", "Edit captions"]
- confidenceLevel: string like "85% confident based on your last 3 posts"

Do NOT return markdown, prose, or commentary. JSON only.`
      }]
    }]
  };

  const result = await callGeminiAPI(apiKey, requestBody, 'gemini-1.5-flash');

  // Safety net: If API fails, return mock data
  if (!result || !result.ok) {
    console.warn('⚠️ API call failed - returning mock idea analysis');
    return getMockIdeaAnalysis(idea, niche);
  }

  const data = result.data;
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;

  // Safety check before string manipulation
  if (!text || typeof text !== 'string' || text.trim().length === 0) {
    console.warn('⚠️ Empty response - returning mock idea analysis');
    return getMockIdeaAnalysis(idea, niche);
  }

  try {
    const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
    const jsonStart = cleanText.indexOf('{');
    const jsonEnd = cleanText.lastIndexOf('}') + 1;
    
    if (jsonStart === -1 || jsonEnd === 0) {
      console.warn('⚠️ Invalid JSON format - returning mock idea analysis');
      return getMockIdeaAnalysis(idea, niche);
    }
    
    const finalJson = cleanText.substring(jsonStart, jsonEnd);
    const parsed = JSON.parse(finalJson) as IdeaAnalysis;

    // Apply calibration offset to the score and rebuild confidence label
    const { offset } = loadCalibrationState();
    const adjustedScore = Math.max(
      0,
      Math.min(100, Math.round(parsed.viralScore * (1 + offset)))
    );

    return {
      ...parsed,
      viralScore: adjustedScore,
      confidenceLevel: buildConfidenceLabel(),
    };
  } catch (parseError) {
    console.warn('⚠️ Parse error - returning mock idea analysis:', parseError);
    return getMockIdeaAnalysis(idea, niche);
  }
}

// --- Trending Topics ---

function getMockTrendingTopic(niche: string): string {
  const lowerNiche = niche.toLowerCase();
  
  if (lowerNiche.includes('fitness') || lowerNiche.includes('dad') || lowerNiche.includes('gym')) {
    return 'The 15-minute workout protocol that busy dads are using to get ripped without gym memberships';
  } else if (lowerNiche.includes('tech') || lowerNiche.includes('ai') || lowerNiche.includes('startup')) {
    return 'The AI tool that\'s replacing 80% of content creator workflows (and why most people haven\'t heard of it)';
      } else {
    return 'The viral hook formula that generated 10M views in 30 days (most creators skip this step)';
  }
}

export async function getTrendingTopic(niche: string): Promise<string> {
  const apiKey = getApiKey();

  // If no API key, return mock data immediately
  if (!apiKey) {
    console.warn('⚠️ No API key - returning mock trending topic');
    return getMockTrendingTopic(niche);
  }

  const requestBody = {
    contents: [{ 
      parts: [{ 
        text: `Generate ONE trending hook/topic that a creator in the "${niche}" niche should consider. Make it specific, intriguing, and viral-worthy. Return ONLY the hook text, no JSON, no explanations.` 
      }] 
    }]
  };

  const result = await callGeminiAPI(apiKey, requestBody, 'gemini-1.5-flash');

  // Safety net: If API fails, return mock data
  if (!result || !result.ok) {
    console.warn('⚠️ API call failed - returning mock trending topic');
    return getMockTrendingTopic(niche);
  }

  const data = result.data;
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;

  // Safety check
  if (!text || typeof text !== 'string' || text.trim().length === 0) {
    console.warn('⚠️ Empty response - returning mock trending topic');
    return getMockTrendingTopic(niche);
  }

  return text.trim();
}

// --- Logo Concepts (Brand Identity) ---

export type LogoConcept = {
  title: string;
  description: string;
  visualPrompt: string;
  placeholderImage: string; // URL to placeholder image example
};

export async function generateLogoConcepts(brandVision: string): Promise<LogoConcept[]> {
  const vision = brandVision.toLowerCase();

  const baseContext =
    vision && vision.length > 0
      ? vision
      : 'modern creator brand helping people grow on social media';

  return [
    {
      title: 'Modern Minimalist Monogram',
      description:
        'Minimalism builds trust and authority through simplicity. This high-end lettermark approach signals professionalism and timelessness—perfect for brands that want to be taken seriously without being flashy.',
      visualPrompt:
        `Ultra-clean monogram logo inspired by ${baseContext}, bold sans-serif letters with strong contrast, minimal shapes, high-end tech startup aesthetic, dark navy background with soft amber accent lines, centered composition, flat vector style.`,
      placeholderImage: 'https://images.unsplash.com/photo-1620325867502-221cfb5faa5f?w=400&h=300&fit=crop&q=80',
    },
    {
      title: 'Abstract Tech Symbol',
      description:
        'Innovation and data-driven design. This futuristic symbol suggests cutting-edge technology and forward-thinking strategy—ideal for AI-first brands or creators who want to signal they\'re ahead of the curve.',
      visualPrompt:
        `Abstract geometric icon representing ${baseContext}, interconnected nodes and flowing lines, gradient from electric blue to neon teal, slight glow, dark slate background, futuristic yet simple, suitable for app icon and social avatars.`,
      placeholderImage: 'https://images.unsplash.com/photo-1635322966219-b75e37aaf953?w=400&h=300&fit=crop&q=80',
    },
    {
      title: 'Bold Mascot Emblem',
      description:
        'Community and energy. This emblematic approach creates a sense of belonging and team spirit—perfect for brands that want to build a loyal following and signal high energy, engagement, and community vibes.',
      visualPrompt:
        `Bold emblem logo for ${baseContext}, simplified mascot or symbol inside a shield, thick outlines, cinematic lighting, warm amber and deep charcoal palette, subtle grain texture, evokes sports team logo and community badge feel.`,
      placeholderImage: 'https://images.unsplash.com/photo-1629904853090-ecf24f13fe6b?w=400&h=300&fit=crop&q=80',
    },
  ];
}

// Placeholder for compatibility
// --- Description Generation (YouTube Channel / X Pro Bio) ---

export type DescriptionOption = {
  text: string;
  strategyTags: string[];
  strategyNote: string;
};

export type DescriptionResult = {
  options: DescriptionOption[];
};

function getMockDescriptions(vision: string, platform: 'youtube' | 'x'): DescriptionResult {
  const isYouTube = platform === 'youtube';
  
  if (isYouTube) {
    return {
      options: [
        {
          text: `Welcome to my channel! I create content about ${vision.toLowerCase()} to help you level up your game. Whether you're just starting out or looking to scale, you'll find actionable tips, tutorials, and insights here. Subscribe for weekly videos that will transform your approach and deliver real results.`,
          strategyTags: ['SEO Optimized', 'Authority Building', 'Conversion Focused'],
          strategyNote: 'Front-loads keywords, includes clear value proposition, and strong CTA'
        },
        {
          text: `🎯 Transforming ${vision.toLowerCase()} one video at a time. 📚 Weekly deep-dives on strategy, tactics, and real-world case studies. 💡 Join thousands of creators who are building their authority and growing their audience. Hit subscribe to never miss an update!`,
          strategyTags: ['Emoji-Driven', 'Community-Focused', 'Engagement Boost'],
          strategyNote: 'Uses emojis for visual appeal, emphasizes community, and creates FOMO'
        },
        {
          text: `I help ambitious ${vision.toLowerCase()} creators go from zero to hero. Every Tuesday, I drop game-changing content on ${vision.toLowerCase()}, growth strategies, and behind-the-scenes insights. New here? Start with the "Beginner's Guide" playlist. Let's build together! 🚀`,
          strategyTags: ['Problem-Solution', 'Content Schedule', 'Clear Entry Point'],
          strategyNote: 'Addresses pain point directly, sets expectations, and provides navigation'
        }
      ]
    };
  } else {
    return {
      options: [
        {
          text: `Building ${vision.toLowerCase()} | Sharing insights, strategies & lessons learned | Join 10k+ founders growing faster`,
          strategyTags: ['Authority Building', 'Social Proof', 'Concise'],
          strategyNote: 'Twitter-optimized length, shows credibility, includes follower count hook'
        },
        {
          text: `${vision.charAt(0).toUpperCase() + vision.slice(1)} enthusiast | Daily insights on growth, strategy & building in public | RTs ≠ endorsements`,
          strategyTags: ['Personality-Driven', 'Daily Value', 'Professional'],
          strategyNote: 'Shows personality, promises daily value, includes professional disclaimer'
        },
        {
          text: `Transforming ${vision.toLowerCase()} | $5M+ in results | Weekly deep-dives & case studies | DM "START" for a free guide`,
          strategyTags: ['Results-Focused', 'Conversion Focused', 'Lead Generation'],
          strategyNote: 'Leads with results, offers clear value, includes DM CTA for lead capture'
        }
      ]
    };
  }
}

export async function generateDescriptionOptions(
  vision: string,
  platform: 'youtube' | 'x',
  refinement?: string
): Promise<DescriptionResult> {
  const apiKey = getApiKey();

  // If no API key, return mock data immediately
  if (!apiKey) {
    console.warn('⚠️ No API key - returning mock descriptions');
    return getMockDescriptions(vision, platform);
  }

  const platformContext = platform === 'youtube' 
    ? 'YouTube channel description (SEO-optimized, up to 5000 characters, include keywords naturally)'
    : 'X (Twitter) professional bio (character-limited, punchy, authority-building)';

  const refinementText = refinement ? `\n\nREFINEMENT REQUEST: ${refinement}. Apply this instruction to all options.` : '';

  const promptText = `You are an expert social media strategist creating ${platformContext} for someone with this vision: "${vision}"

  Generate 3 distinct description options. Each option must include:
  1. The description text (optimized for ${platform === 'youtube' ? 'SEO and discovery' : 'Twitter character limit and engagement'})
  2. Strategy tags explaining why it works (e.g., 'SEO Optimized', 'Authority Building', 'Conversion Focused', 'Community-Focused', 'Personality-Driven')
  3. A brief strategy note (1 sentence) explaining the approach

  ${platform === 'youtube' ? 'YouTube Requirements: Include keywords naturally, mention content schedule, add clear CTA, optimize first 150 characters.' : 'X Requirements: Stay under 160 characters, use compelling hook, include social proof if relevant, add subtle CTA.'}

  ${refinementText}

  Return strictly valid JSON:
  {
    "options": [
      {
        "text": "Full description text here...",
        "strategyTags": ["Tag 1", "Tag 2", "Tag 3"],
        "strategyNote": "Why this works..."
      },
      // ... 2 more options
    ]
  }`;

  const requestBody = {
    contents: [{ 
      parts: [{ text: promptText }] 
    }]
  };

  const result = await callGeminiAPI(apiKey, requestBody, 'gemini-1.5-flash');

  // Safety net: If API fails, return mock data
  if (!result || !result.ok) {
    console.warn('⚠️ API call failed - returning mock descriptions');
    return getMockDescriptions(vision, platform);
  }

  const data = result.data;
  const textContent = data?.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!textContent || typeof textContent !== 'string' || textContent.trim().length === 0) {
    console.warn('⚠️ Empty response - returning mock descriptions');
    return getMockDescriptions(vision, platform);
  }

  try {
    const jsonString = textContent.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(jsonString) as DescriptionResult;
  } catch (parseError) {
    console.warn('⚠️ Parse error - returning mock descriptions:', parseError);
    return getMockDescriptions(vision, platform);
  }
}

// --- Banner Concepts Generation (YouTube/X) ---

export type BannerConcept = {
  styleName: string;
  visualDescription: string;
  colorPalette: string[];
  reasoning: string;
};

export type BannerConceptsResult = {
  concepts: BannerConcept[];
};

function getMockBannerConcepts(niche: string, vibe: string, platform: 'youtube' | 'x'): BannerConceptsResult {
  const isYouTube = platform === 'youtube';
  const baseColors = ['#000000', '#F59E0B', '#FFFFFF', '#1E293B', '#3B82F6'];
  
  return {
    concepts: [
      {
        styleName: 'Minimalist Authority',
        visualDescription: 'Clean sans-serif typography with high-contrast amber accents, geometric shapes in background, professional gradient overlay, centered logo placement',
        colorPalette: [baseColors[0], baseColors[1], baseColors[2]],
        reasoning: 'Builds trust through simplicity and professional aesthetics. Perfect for establishing authority.'
      },
      {
        styleName: 'Bold & Dynamic',
        visualDescription: 'Vibrant gradient background with energetic color transitions, bold typography with motion blur effects, abstract shapes suggesting movement, modern tech-inspired elements',
        colorPalette: [baseColors[1], baseColors[4], baseColors[3]],
        reasoning: 'Captures attention and conveys innovation. Ideal for tech and creative niches.'
      },
      {
        styleName: 'Elegant & Refined',
        visualDescription: 'Sophisticated dark background with subtle textures, elegant serif typography, gold/metallic accents, negative space emphasizing luxury, premium feel',
        colorPalette: [baseColors[3], baseColors[1], baseColors[0]],
        reasoning: 'Projects premium quality and sophistication. Best for high-end brands and luxury markets.'
      }
    ]
  };
}

export async function generateBannerConcepts(
  niche: string,
  vibe: string,
  platform: 'youtube' | 'x'
): Promise<BannerConceptsResult> {
  const apiKey = getApiKey();

  // If no API key, return mock data immediately
  if (!apiKey) {
    console.warn('⚠️ No API key - returning mock banner concepts');
    return getMockBannerConcepts(niche, vibe, platform);
  }

  const platformContext = platform === 'youtube'
    ? 'YouTube channel banner (2560 x 1440px, 16:9 aspect ratio, professional and engaging)'
    : 'X (Twitter) header image (1500 x 500px, 3:1 aspect ratio, striking and attention-grabbing)';

  const promptText = `You are an expert visual designer creating ${platformContext} concepts for a creator with this niche: "${niche}" and vibe: "${vibe}".

  Generate 3 distinct visual design directions. Each concept must include:
  1. styleName: A catchy name for the style (e.g., "Minimalist Authority", "Bold & Dynamic", "Elegant & Refined")
  2. visualDescription: Detailed description of visual elements (typography, colors, shapes, layout, mood) - this will be used to generate the actual banner image
  3. colorPalette: Array of 3-5 hex color codes that represent the primary colors
  4. reasoning: One sentence explaining why this style works for this niche/vibe

  Make each concept distinct:
  - Concept 1: Professional/Minimalist (trust-building)
  - Concept 2: Bold/Energetic (attention-grabbing)
  - Concept 3: Elegant/Premium (sophistication)

  Return strictly valid JSON:
  {
    "concepts": [
      {
        "styleName": "Style Name",
        "visualDescription": "Detailed visual description...",
        "colorPalette": ["#000000", "#F59E0B", "#FFFFFF"],
        "reasoning": "Why this works..."
      },
      // ... 2 more concepts
    ]
  }`;

  const requestBody = {
    contents: [{ 
      parts: [{ text: promptText }] 
    }]
  };

  const result = await callGeminiAPI(apiKey, requestBody, 'gemini-1.5-flash');

  // Safety net: If API fails, return mock data
  if (!result || !result.ok) {
    console.warn('⚠️ API call failed - returning mock banner concepts');
    return getMockBannerConcepts(niche, vibe, platform);
  }

  const data = result.data;
  const textContent = data?.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!textContent || typeof textContent !== 'string' || textContent.trim().length === 0) {
    console.warn('⚠️ Empty response - returning mock banner concepts');
    return getMockBannerConcepts(niche, vibe, platform);
  }

  try {
    const jsonString = textContent.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(jsonString) as BannerConceptsResult;
  } catch (parseError) {
    console.warn('⚠️ Parse error - returning mock banner concepts:', parseError);
    return getMockBannerConcepts(niche, vibe, platform);
  }
}

export async function generateBrandBrief(input: any): Promise<any> {
    return { niche: 'General', vibe: 'Authentic', nameOptions: ['Brand1', 'Brand2'] };
}

export async function generateVideoIdeas(input: any): Promise<string[]> {
    return ["Idea 1", "Idea 2", "Idea 3"]; 
}
export async function generateBios(input: any): Promise<string[]> {
    return ["Bio 1", "Bio 2", "Bio 3"]; 
}

// --- Library Insight Function (Fixes Vercel Build Error) ---
export async function generateLibrarianInsight(note: string): Promise<string> {
  const apiKey = getApiKey();
  if (!apiKey) {
    return "Insight unavailable.";
  }
  
  try {
    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
    const prompt = `Analyze this idea and give 3 bullet points on how to monetize it: ${note}`;
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error('Error generating librarian insight:', error);
    return "Could not generate insight.";
  }
}

// --- Platform-Specific Blueprints (Fixes Vercel Build Error) ---
export async function generatePlatformSpecificBlueprints(content: string): Promise<string> {
  const apiKey = getApiKey();
  if (!apiKey) {
    return "Blueprints unavailable.";
  }
  
  try {
    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
    const prompt = `Create a viral LinkedIn post and a Twitter thread for this topic: ${content}`;
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error('Error generating platform blueprints:', error);
    return "Could not generate blueprints.";
  }
}