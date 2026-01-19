// Verify GEMINI_API_KEY on module load
if (typeof process !== 'undefined' && !process.env.GEMINI_API_KEY) {
  console.warn('⚠️ WARNING: GEMINI_API_KEY is not set in environment variables. AI features will not work.');
}

type GenerateBiosInput = {
  niche: string;
  vibe: string;
};

type GenerateVisionBiosInput = {
  vision: string;
  userId?: string;
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

// Helper function to fetch user content history for brand voice training
async function getUserContentHistory(
  userId?: string
): Promise<string | null> {
  if (!userId) return null;

  try {
    const { supabase } = await import('@/lib/supabaseClient');
    const { data, error } = await supabase
      .from('user_content_history')
      .select('content_text')
      .eq('user_id', userId)
      .maybeSingle();

    if (error || !data?.content_text) {
      return null;
    }

    return data.content_text;
  } catch {
    return null;
  }
}

// Helper function to fetch collective intelligence from viral/successful blueprints
// Returns both context string and metadata for strategy notes
async function getCollectiveIntelligence(): Promise<{
  context: string | null;
  viralCount: number;
  successCount: number;
  dominantVibe: string | null;
  viralPotential: number | null;
}> {
  try {
    const { supabase } = await import('@/lib/supabaseClient');
    
    // Fetch blueprints marked as viral or success from blueprint_performance
    const { data: performances, error: perfError } = await supabase
      .from('blueprint_performance')
      .select('blueprint_id, status')
      .in('status', ['viral', 'success'])
      .limit(50);

    if (perfError || !performances || performances.length === 0) {
      return {
        context: null,
        viralCount: 0,
        successCount: 0,
        dominantVibe: null,
        viralPotential: null,
      };
    }

    const blueprintIds = performances.map((p) => p.blueprint_id);
    const viralCount = performances.filter((p) => p.status === 'viral').length;
    const successCount = performances.filter((p) => p.status === 'success').length;

    // Fetch the actual blueprint data
    const { data: blueprints, error: blueprintError } = await supabase
      .from('saved_blueprints')
      .select('idea, blueprint')
      .in('id', blueprintIds);

    if (blueprintError || !blueprints || blueprints.length === 0) {
      return {
        context: null,
        viralCount,
        successCount,
        dominantVibe: null,
        viralPotential: null,
      };
    }

    // Calculate viral potential percentage (simplified: viralCount / total * 100)
    const total = performances.length;
    const viralPotential = total > 0 ? Math.round((viralCount / total) * 100) : null;

    // Extract dominant vibes from viral blueprints
    const viralBlueprintIds = performances
      .filter((p) => p.status === 'viral')
      .map((p) => p.blueprint_id);
    const viralBps = blueprints.filter((bp) => viralBlueprintIds.includes(bp.id));
    
    // Simple vibe extraction from hooks
    const vibeWords: Record<string, number> = {};
    viralBps.forEach((bp) => {
      const hook = typeof bp.blueprint === 'object' && bp.blueprint !== null
        ? ('tiktok' in bp.blueprint ? bp.blueprint.tiktok?.hook : 'hook' in bp.blueprint ? bp.blueprint.hook : '') || ''
        : '';
      const lower = hook.toLowerCase();
      if (lower.includes('quick') || lower.includes('fast')) vibeWords['urgent'] = (vibeWords['urgent'] || 0) + 1;
      if (lower.includes('secret') || lower.includes('hidden')) vibeWords['mysterious'] = (vibeWords['mysterious'] || 0) + 1;
      if (lower.includes('never') || lower.includes('stop')) vibeWords['bold'] = (vibeWords['bold'] || 0) + 1;
      if (lower.includes('simple') || lower.includes('easy')) vibeWords['accessible'] = (vibeWords['accessible'] || 0) + 1;
      if (lower.includes('proven') || lower.includes('tested')) vibeWords['confident'] = (vibeWords['confident'] || 0) + 1;
    });

    const dominantVibe = Object.entries(vibeWords).sort((a, b) => b[1] - a[1])[0]?.[0] || null;

    // Create collective intelligence context
    let context = `GLOBAL CONTEXT: The Octane Nexus community has marked ${viralCount + successCount} blueprints as successful (${viralCount} viral, ${successCount} successful). Study these proven patterns:\n\n`;

    blueprints.slice(0, 20).forEach((bp, idx) => {
      const perf = performances.find((p) => p.blueprint_id === bp.id);
      if (bp.idea) {
        context += `${idx + 1}. [${perf?.status?.toUpperCase() || 'SUCCESS'}] ${bp.idea}\n`;
      }
    });

    context += `\nUse these community-validated patterns to inform your content generation. These ideas have proven to resonate with real audiences.`;

    return {
      context,
      viralCount,
      successCount,
      dominantVibe,
      viralPotential: viralPotential && viralPotential > 0 ? viralPotential : null,
    };
  } catch {
    return {
      context: null,
      viralCount: 0,
      successCount: 0,
      dominantVibe: null,
      viralPotential: null,
    };
  }
}

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

type GenerateProfileImageInput = {
  niche: string;
  vibe: string;
  refinePrompt?: string;
};

export type ProfileImageResult = {
  imageUrl: string;
  prompt: string;
};

// This utility is the single place where we talk to Gemini.
// Right now it returns mocked bios so you can work without an API key.
// Later, replace the internals with a real Gemini API call.
export async function generateBios(
  input: GenerateBiosInput
): Promise<string[]> {
  const { niche, vibe } = input;

  if (!niche.trim() || !vibe.trim()) {
    throw new Error('Please share your niche and vibe first.');
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
  // Simulated latency so the UI can show a loading state.
  await new Promise((resolve) => setTimeout(resolve, 900));
    return [
      `Helping you grow as a ${niche.trim()} creator with a ${vibe.trim()} twist. Easy tips, real results.`,
      `Your go-to ${niche.trim()} corner on the internet. ${vibe.trim()} stories, simple playbooks, steady growth.`,
      `Building a ${vibe.trim()} space for ${niche.trim()} lovers. Clear ideas, smart posts, and steady momentum.`,
    ];
  }

  // Fetch user's brand voice if available
  const brandVoice = input.userId ? await getUserContentHistory(input.userId) : null;
  const brandVoiceInstruction = brandVoice
    ? `\n\nIMPORTANT: Study this creator's successful past content and match their voice, tone, and style:\n\n${brandVoice}\n\nGenerate bios that sound authentically like this creator wrote them.`
    : '';

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: `Create 3 short, SEO-friendly social media bios for a ${niche.trim()} creator with a "${vibe.trim()}" style. Each bio should be:
- Under 150 characters
- No hashtags
- Professional yet authentic
- Clear value proposition

Return each bio as a separate line.${brandVoiceInstruction}`,
                },
              ],
            },
          ],
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    const textContent = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (textContent) {
      const bios = textContent
        .split(/\n+/)
        .map((line: string) => line.trim())
        .filter((line: string) => line.length > 0 && !line.match(/^(bio|option)\s*\d*:?\s*$/i))
        .slice(0, 3);
      
      if (bios.length >= 3) {
        return bios;
      }
    }

    // Fallback to mock bios
    return [
      `Helping you grow as a ${niche.trim()} creator with a ${vibe.trim()} twist. Easy tips, real results.`,
      `Your go-to ${niche.trim()} corner on the internet. ${vibe.trim()} stories, simple playbooks, steady growth.`,
      `Building a ${vibe.trim()} space for ${niche.trim()} lovers. Clear ideas, smart posts, and steady momentum.`,
    ];
  } catch (err: any) {
    console.error('Error generating bios:', err);
    // Return mock bios on error
  return [
    `Helping you grow as a ${niche.trim()} creator with a ${vibe.trim()} twist. Easy tips, real results.`,
    `Your go-to ${niche.trim()} corner on the internet. ${vibe.trim()} stories, simple playbooks, steady growth.`,
    `Building a ${vibe.trim()} space for ${niche.trim()} lovers. Clear ideas, smart posts, and steady momentum.`,
  ];
  }
}

export type VisionBios = {
  authority: string;
  relatability: string;
  mystery: string;
};

export async function generateVisionBios(
  input: GenerateVisionBiosInput
): Promise<VisionBios> {
  const { vision, userId } = input;

  if (!vision.trim()) {
    throw new Error('Please share your vision first.');
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn('GEMINI_API_KEY not set, returning mock vision bios');
    await new Promise((resolve) => setTimeout(resolve, 1200));
    return {
      authority: `Expert insights and proven strategies for creators who want to build real authority.`,
      relatability: `Real talk from someone who's been there. No fluff, just honest stories and practical advice.`,
      mystery: `Behind the scenes of building something different. Join the journey.`,
    };
  }

  // Fetch user's brand voice if available
  const brandVoice = userId ? await getUserContentHistory(userId) : null;
  const brandVoiceInstruction = brandVoice
    ? `\n\nIMPORTANT: Study this creator's successful past content and match their voice:\n\n${brandVoice}\n\n`
    : '';

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: `Based on this creator's vision, generate 3 high-detail social media bios:

Vision: "${vision.trim()}"

Create:
1. AUTHORITY BIO: Position them as an expert with credentials, results, and credibility. Make it commanding and impressive.
2. RELATABILITY BIO: Make them feel like a friend who gets it. Show vulnerability, real experiences, and approachability.
3. MYSTERY BIO: Create intrigue and curiosity. Hint at something special without revealing everything.

Each bio should be 120-150 characters, no hashtags, authentic to their voice.${brandVoiceInstruction}

Return as JSON:
{
  "authority": "bio text here",
  "relatability": "bio text here",
  "mystery": "bio text here"
}`,
                },
              ],
            },
          ],
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    const textContent = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (textContent) {
      // Try to parse JSON from response
      const jsonMatch = textContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          const parsed = JSON.parse(jsonMatch[0]);
          if (parsed.authority && parsed.relatability && parsed.mystery) {
            return parsed as VisionBios;
          }
        } catch {
          // Fall through to fallback
        }
      }
    }

    // Fallback to mock bios
    return {
      authority: `Expert insights and proven strategies for creators who want to build real authority.`,
      relatability: `Real talk from someone who's been there. No fluff, just honest stories and practical advice.`,
      mystery: `Behind the scenes of building something different. Join the journey.`,
    };
  } catch (err: any) {
    console.error('Error generating vision bios:', err);
    return {
      authority: `Expert insights and proven strategies for creators who want to build real authority.`,
      relatability: `Real talk from someone who's been there. No fluff, just honest stories and practical advice.`,
      mystery: `Behind the scenes of building something different. Join the journey.`,
    };
  }
}

export type BrandBrief = {
  niche: string;
  vibe: string;
  nameOptions: string[];
};

export async function generateBrandBrief(
  input: GenerateBrandBriefInput
): Promise<BrandBrief> {
  const { userId, vision } = input;

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn('GEMINI_API_KEY not set, returning mock brand brief');
    await new Promise((resolve) => setTimeout(resolve, 1000));
    return {
      niche: 'content creation',
      vibe: 'confident',
      nameOptions: ['creator', 'builder', 'maker', 'studio', 'lab'],
    };
  }

  // Fetch user's content history for context
  const contentHistory = userId ? await getUserContentHistory(userId) : null;
  const contextInstruction = contentHistory
    ? `\n\nUser's previous content context:\n${contentHistory}\n\nUse this to inform niche and vibe suggestions.`
    : '';
  
  const visionInstruction = vision?.trim()
    ? `\n\nUser's Brand Vision:\n"${vision.trim()}"\n\nUse this vision to inform niche, vibe, and name suggestions.`
    : '';

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: `Analyze the user's context and suggest:
1. A specific niche (e.g., "fitness for busy parents", "crypto education", "book reviews")
2. A vibe/voice (e.g., "confident", "playful", "calm", "bold", "authentic")
3. Five name/handle options (short, memorable, brandable)

${contextInstruction}${visionInstruction}

Return as JSON:
{
  "niche": "specific niche description",
  "vibe": "voice descriptor",
  "nameOptions": ["option1", "option2", "option3", "option4", "option5"]
}`,
                },
              ],
            },
          ],
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    const textContent = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (textContent) {
      const jsonMatch = textContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          const parsed = JSON.parse(jsonMatch[0]);
          if (parsed.niche && parsed.vibe && Array.isArray(parsed.nameOptions)) {
            return parsed as BrandBrief;
          }
        } catch {
          // Fall through to fallback
        }
      }
    }

    // Fallback
    return {
      niche: 'content creation',
      vibe: 'confident',
      nameOptions: ['creator', 'builder', 'maker', 'studio', 'lab'],
    };
  } catch (err: any) {
    console.error('Error generating brand brief:', err);
    return {
      niche: 'content creation',
      vibe: 'confident',
      nameOptions: ['creator', 'builder', 'maker', 'studio', 'lab'],
    };
  }
}

export async function generateVideoIdeas(
  input: GenerateVideoIdeasInput
): Promise<string[]> {
  const { niche, userId } = input;

  if (!niche.trim()) {
    throw new Error('Please share your niche first so we can aim the ideas.');
  }

  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error(
      'GEMINI_API_KEY is not configured. Please set GEMINI_API_KEY in your environment variables.'
    );
  }

  // Fetch user's brand voice if available
  const brandVoice = userId ? await getUserContentHistory(userId) : null;
  const brandVoiceInstruction = brandVoice
    ? `\n\nIMPORTANT: Study this creator's successful past content and match their voice, tone, and style:\n\n${brandVoice}\n\nGenerate ideas that sound authentically like this creator wrote them.`
    : '';

  // Fetch collective intelligence from viral/successful blueprints
  const collectiveIntelligence = await getCollectiveIntelligence();
  const collectiveInstruction = collectiveIntelligence.context
    ? `\n\n${collectiveIntelligence.context}`
    : '';

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: `Create 3 unique, filmable video script ideas for a social media creator in the "${niche.trim()}" niche. Each idea should be:
- Specific and actionable
- Suitable for short-form video (30-60 seconds)
- Clear enough to film immediately
- Engaging and shareable

Return each idea as a separate, concise sentence. No numbering, no hashtags, just the idea itself.${brandVoiceInstruction}${collectiveInstruction}`,
                },
              ],
            },
          ],
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.error?.message ||
          `Gemini API error: ${response.status} ${response.statusText}`
      );
    }

    const data = await response.json();

    // Extract text from Gemini response
    const candidates = data.candidates;
    if (!candidates || candidates.length === 0) {
      throw new Error('No ideas generated from Gemini API.');
    }

    const textContent = candidates[0].content?.parts?.[0]?.text;
    if (!textContent) {
      throw new Error('Unexpected response format from Gemini API.');
    }

    // Parse the response into an array of ideas
    // Gemini may return numbered or bulleted lists, or plain text with line breaks
    const ideas = textContent
      .split(/\n+/)
      .map((line: string) => line.trim())
      .filter((line: string) => {
        // Remove empty lines and common list markers
        return (
          line.length > 0 &&
          !line.match(/^[\d\.\)\-•]\s*$/) &&
          !line.match(/^(idea|script|video)\s*\d*:?\s*$/i)
        );
      })
      .map((line: string) => {
        // Remove leading numbers, bullets, dashes, etc.
        return line.replace(/^[\d\.\)\-•]\s+/, '').trim();
      })
      .filter((line: string) => line.length > 10) // Filter out very short lines
      .slice(0, 3); // Take first 3 valid ideas

    if (ideas.length === 0) {
      throw new Error('Could not parse ideas from Gemini response.');
    }

    // If we got fewer than 3, pad with fallback ideas
    while (ideas.length < 3) {
      const trimmed = niche.trim();
      ideas.push(
        `Create a quick tutorial showing one essential ${trimmed} technique in under 60 seconds.`
      );
    }

    return ideas.slice(0, 3);
  } catch (err: any) {
    // If it's already our error, re-throw it
    if (err.message && err.message.includes('GEMINI_API_KEY')) {
      throw err;
    }
    // For API errors, provide a helpful message
    throw new Error(
      err?.message ||
        'Failed to generate video ideas. Please check your API key and try again.'
    );
  }
}

export async function generateVideoBlueprint(
  input: GenerateVideoBlueprintInput
): Promise<VideoBlueprint> {
  const { idea, userId } = input;

  if (!idea.trim()) {
    throw new Error('Please share an idea first so we can shape a blueprint.');
  }

  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error(
      'GEMINI_API_KEY is not configured. Please set GEMINI_API_KEY in your environment variables.'
    );
  }

  // Fetch user's brand voice if available
  const brandVoice = userId ? await getUserContentHistory(userId) : null;
  const brandVoiceInstruction = brandVoice
    ? `\n\nIMPORTANT SYSTEM INSTRUCTION: Study this creator's successful past content and match their exact voice, tone, style, and structure:\n\n${brandVoice}\n\nWrite the blueprint in a way that sounds authentically like this creator wrote it.`
    : '';

  // Fetch collective intelligence from viral/successful blueprints
  const collectiveIntelligence = await getCollectiveIntelligence();
  const collectiveInstruction = collectiveIntelligence.context
    ? `\n\n${collectiveIntelligence.context}`
    : '';

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: `You are helping a creator film a short-form social video based on this idea: "${idea.trim()}".

Return a SINGLE JSON object with this exact shape and nothing else:
{
  "hook": "3-second opening line spoken on camera",
  "meat": [
    "first simple bullet point for the middle",
    "second simple bullet point for the middle"
  ],
  "cta": "clear closing call to action line",
  "setup_tip": "one tip on lighting or camera placement"
}

Rules:
- The JSON must be valid and parseable.
- Do not include backticks or comments.
- "meat" MUST be an array of exactly 2 bullet strings.
- Keep each line short, concrete, and easy to film within 30–60 seconds.${brandVoiceInstruction}${collectiveInstruction}`,
                },
              ],
            },
          ],
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.error?.message ||
          `Gemini API error: ${response.status} ${response.statusText}`
      );
    }

    const data = await response.json();
    const candidates = data.candidates;
    if (!candidates || candidates.length === 0) {
      throw new Error('No blueprint generated from Gemini API.');
    }

    const textContent = candidates[0].content?.parts?.[0]?.text?.trim();
    if (!textContent) {
      throw new Error('Unexpected response format from Gemini API.');
    }

    let parsed: any;
    try {
      parsed = JSON.parse(textContent);
    } catch {
      throw new Error('Failed to parse blueprint JSON from Gemini response.');
    }

    if (
      !parsed ||
      typeof parsed.hook !== 'string' ||
      typeof parsed.cta !== 'string' ||
      typeof parsed.setup_tip !== 'string' ||
      !Array.isArray(parsed.meat)
    ) {
      throw new Error('Blueprint JSON is missing required fields.');
    }

    const meatArray = parsed.meat
      .filter((item: any) => typeof item === 'string' && item.trim().length > 0)
      .slice(0, 2);

    if (meatArray.length < 2) {
      throw new Error('Blueprint JSON must contain at least two meat bullet points.');
    }

    const blueprint: VideoBlueprint = {
      hook: parsed.hook.trim(),
      meat: meatArray.map((m: string) => m.trim()),
      cta: parsed.cta.trim(),
      setup_tip: parsed.setup_tip.trim(),
    };

    return blueprint;
  } catch (err: any) {
    if (err.message && err.message.includes('GEMINI_API_KEY')) {
      throw err;
    }
    throw new Error(
      err?.message ||
        'Failed to generate a video blueprint. Please check your API key and try again.'
    );
  }
}

export async function generatePlatformSpecificBlueprints(
  input: GenerateVideoBlueprintInput
): Promise<PlatformSpecificBlueprints> {
  const { idea, userId } = input;

  if (!idea.trim()) {
    throw new Error('Please share an idea first so we can shape platform-specific blueprints.');
  }

  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error(
      'GEMINI_API_KEY is not configured. Please set GEMINI_API_KEY in your environment variables.'
    );
  }

  // Fetch user's brand voice if available
  const brandVoice = userId ? await getUserContentHistory(userId) : null;
  const brandVoiceInstruction = brandVoice
    ? `\n\nIMPORTANT SYSTEM INSTRUCTION: Study this creator's successful past content and match their exact voice, tone, style, and structure:\n\n${brandVoice}\n\nWrite all three platform blueprints (TikTok, Instagram, X) in a way that sounds authentically like this creator wrote them.`
    : '';

  // Fetch collective intelligence from viral/successful blueprints
  const collectiveIntelligence = await getCollectiveIntelligence();
  const collectiveInstruction = collectiveIntelligence.context
    ? `\n\n${collectiveIntelligence.context}`
    : '';

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: `You are helping a creator turn this idea into three platform-specific scripts: "${idea.trim()}".

Return a SINGLE JSON object with this exact shape and nothing else:
{
  "tiktok": {
    "hook": "visual, attention-grabbing 3-second opening - focus on strong visual hooks",
    "meat": [
      "first key point optimized for TikTok's fast-paced visual format",
      "second key point with high visual appeal"
    ],
    "cta": "clear call to action perfect for TikTok engagement",
    "setup_tip": "TikTok-specific setup tip (vertical format, trending sounds, etc.)"
  },
  "instagram": {
    "hook": "engaging opening line designed for Instagram's engagement algorithm",
    "meat": [
      "first point optimized for Instagram Reels engagement",
      "second point with hashtag and engagement strategy"
    ],
    "cta": "call to action that encourages comments and shares",
    "setup_tip": "Instagram-specific setup tip (square/vertical format, trending audio, etc.)"
  },
  "x": {
    "hook": "viral-worthy text hook optimized for X/Twitter's text-first format",
    "meat": [
      "first point as concise, shareable text",
      "second point designed to go viral with retweets"
    ],
    "cta": "clear call to action optimized for X engagement",
    "setup_tip": "X/Twitter-specific tip (thread structure, character count, etc.)"
  }
}

Rules:
- The JSON must be valid and parseable.
- Do not include backticks or comments.
- TikTok: Focus on VISUAL HOOKS and fast-paced content.
- Instagram: Focus on ENGAGEMENT (comments, shares, saves).
- X: Focus on VIRAL TEXT and shareability.
- Each "meat" MUST be an array of exactly 2 bullet strings.
- Keep all content platform-optimized and authentic.${brandVoiceInstruction}${collectiveInstruction}`,
                },
              ],
            },
          ],
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.error?.message ||
          `Gemini API error: ${response.status} ${response.statusText}`
      );
    }

    const data = await response.json();
    const candidates = data.candidates;
    if (!candidates || candidates.length === 0) {
      throw new Error('No platform-specific blueprints generated from Gemini API.');
    }

    const textContent = candidates[0].content?.parts?.[0]?.text?.trim();
    if (!textContent) {
      throw new Error('Unexpected response format from Gemini API.');
    }

    let parsed: any;
    try {
      // Try to extract JSON from markdown code blocks if present
      const jsonMatch = textContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      } else {
        parsed = JSON.parse(textContent);
      }
    } catch {
      throw new Error('Failed to parse platform-specific blueprints JSON from Gemini response.');
    }

    // Validate structure
    if (
      !parsed ||
      !parsed.tiktok ||
      !parsed.instagram ||
      !parsed.x ||
      typeof parsed.tiktok.hook !== 'string' ||
      typeof parsed.instagram.hook !== 'string' ||
      typeof parsed.x.hook !== 'string'
    ) {
      throw new Error('Platform-specific blueprints JSON is missing required fields.');
    }

    // Validate each platform blueprint
    const platforms: ('tiktok' | 'instagram' | 'x')[] = ['tiktok', 'instagram', 'x'];
    for (const platform of platforms) {
      const blueprint = parsed[platform];
      if (
        typeof blueprint.hook !== 'string' ||
        typeof blueprint.cta !== 'string' ||
        typeof blueprint.setup_tip !== 'string' ||
        !Array.isArray(blueprint.meat)
      ) {
        throw new Error(`${platform} blueprint is missing required fields.`);
      }

      const meatArray = blueprint.meat
        .filter((item: any) => typeof item === 'string' && item.trim().length > 0)
        .slice(0, 2);

      if (meatArray.length < 2) {
        throw new Error(`${platform} blueprint must contain at least two meat bullet points.`);
      }

      parsed[platform] = {
        hook: blueprint.hook.trim(),
        meat: meatArray.map((m: string) => m.trim()),
        cta: blueprint.cta.trim(),
        setup_tip: blueprint.setup_tip.trim(),
      };
    }

    return parsed as PlatformSpecificBlueprints;
  } catch (err: any) {
    if (err.message && err.message.includes('GEMINI_API_KEY')) {
      throw err;
    }
    throw new Error(
      err?.message ||
        'Failed to generate platform-specific blueprints. Please check your API key and try again.'
    );
  }
}

export async function generateProfileImage(
  input: GenerateProfileImageInput
): Promise<ProfileImageResult> {
  const { niche, vibe, refinePrompt } = input;

  if (!niche.trim() || !vibe.trim()) {
    throw new Error('Please share your niche and vibe first.');
  }

  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error(
      'GEMINI_API_KEY is not configured. Please set GEMINI_API_KEY in your environment variables.'
    );
  }

  const refineInstruction = refinePrompt?.trim() 
    ? `\n\nIMPORTANT REFINEMENT: The user wants to refine this image with: "${refinePrompt.trim()}". Incorporate this refinement into the prompt.`
    : '';

  try {
    // Generate a text-to-image prompt using Gemini
    const promptResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: `Create a detailed, professional prompt for generating a profile picture for a social media creator. The creator's niche is "${niche.trim()}" and their vibe is "${vibe.trim()}".${refineInstruction}

Return a SINGLE JSON object with this exact shape:
{
  "prompt": "detailed image generation prompt describing a professional, modern profile picture that matches the niche and vibe"
}

The prompt should describe:
- Professional headshot style
- Colors and mood that match the vibe
- Subtle elements that hint at the niche
- Clean, modern aesthetic suitable for social media profiles
- High quality, professional photography style${refinePrompt?.trim() ? '\n- Incorporate the user\'s refinement requests' : ''}

Return ONLY the JSON, no other text.`,
                },
              ],
            },
          ],
        }),
      }
    );

    if (!promptResponse.ok) {
      const errorData = await promptResponse.json().catch(() => ({}));
      throw new Error(
        errorData.error?.message ||
          `Gemini API error: ${promptResponse.status} ${promptResponse.statusText}`
      );
    }

    const promptData = await promptResponse.json();
    const promptCandidates = promptData.candidates;
    if (!promptCandidates || promptCandidates.length === 0) {
      throw new Error('No prompt generated from Gemini API.');
    }

    const promptText = promptCandidates[0].content?.parts?.[0]?.text?.trim();
    if (!promptText) {
      throw new Error('Unexpected response format from Gemini API.');
    }

    let parsedPrompt: any;
    try {
      // Try to extract JSON from the response
      const jsonMatch = promptText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsedPrompt = JSON.parse(jsonMatch[0]);
      } else {
        parsedPrompt = { prompt: promptText };
      }
    } catch {
      parsedPrompt = { prompt: promptText };
    }

    const imagePrompt = parsedPrompt.prompt || promptText;

    // For now, simulate image generation by creating a data URL placeholder
    // In production, replace this with a real image generation API call (e.g., DALL-E, Stable Diffusion, etc.)
    // Example: const imageResponse = await fetch('https://api.openai.com/v1/images/generations', {...});
    
    // Simulated image URL - replace with actual image generation API call
    const simulatedImageUrl = `data:image/svg+xml;base64,${btoa(
      `<svg width="400" height="400" xmlns="http://www.w3.org/2000/svg">
        <rect width="400" height="400" fill="#1e293b"/>
        <circle cx="200" cy="180" r="60" fill="#f59e0b" opacity="0.3"/>
        <text x="200" y="280" font-family="Arial" font-size="16" fill="#f59e0b" text-anchor="middle">Profile Image</text>
        <text x="200" y="300" font-family="Arial" font-size="12" fill="#94a3b8" text-anchor="middle">${niche.trim()}</text>
      </svg>`
    )}`;

    return {
      imageUrl: simulatedImageUrl,
      prompt: imagePrompt,
    };
  } catch (err: any) {
    if (err.message && err.message.includes('GEMINI_API_KEY')) {
      throw err;
    }
    throw new Error(
      err?.message ||
        'Failed to generate profile image. Please check your API key and try again.'
    );
  }
}

type GenerateLibrarianInsightInput = {
  savedIdeas: string[];
  userName?: string;
};

export async function generateLibrarianInsight(
  input: GenerateLibrarianInsightInput
): Promise<string> {
  const { savedIdeas, userName } = input;

  if (!savedIdeas || savedIdeas.length === 0) {
    throw new Error('No saved ideas to analyze.');
  }

  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error(
      'GEMINI_API_KEY is not configured. Please set GEMINI_API_KEY in your environment variables.'
    );
  }

  try {
    const ideasText = savedIdeas
      .map((idea, idx) => `${idx + 1}. ${idea}`)
      .join('\n');

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: `You are the Active Librarian, an AI Talent Manager analyzing a creator's content library.

The creator${userName ? `, ${userName},` : ''} has saved ${savedIdeas.length} video ideas:

${ideasText}

Analyze these ideas and provide a concise, actionable insight (2-3 sentences max) that:
1. Identifies their strongest content pillar or theme
2. Provides specific, actionable guidance on what to do more of

Format: Address them by name if provided, then give the insight. Example: "${userName || 'Your'}, your gardening tips are your strongest pillar. Let's do more of those."

Return ONLY the insight text, no extra formatting or explanation.`,
                },
              ],
            },
          ],
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.error?.message ||
          `Gemini API error: ${response.status} ${response.statusText}`
      );
    }

    const data = await response.json();
    const candidates = data.candidates;
    if (!candidates || candidates.length === 0) {
      throw new Error('No insight generated from Gemini API.');
    }

    const textContent = candidates[0].content?.parts?.[0]?.text?.trim();
    if (!textContent) {
      throw new Error('Unexpected response format from Gemini API.');
    }

    return textContent;
  } catch (err: any) {
    if (err.message && err.message.includes('GEMINI_API_KEY')) {
      throw err;
    }
    throw new Error(
      err?.message ||
        'Failed to generate librarian insight. Please check your API key and try again.'
    );
  }
}
