import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

// Load environment variables in development
dotenv.config();

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json());

  // --- Security Middleware Setup ---

  // 1. In-memory Rate Limiting for AI Endpoints to protect against brute-force or high-bill exploits
  const aiRequestLimits = new Map<string, { count: number; resetTime: number }>();
  const RATE_LIMIT_WINDOW_MS = 60000; // 1 minute
  const MAX_REQUESTS_PER_WINDOW = 30; // 30 requests per minute

  app.use('/api/ai/', (req, res, next) => {
    const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'unknown';
    const now = Date.now();
    const limitInfo = aiRequestLimits.get(ip);

    if (!limitInfo || now > limitInfo.resetTime) {
      aiRequestLimits.set(ip, {
        count: 1,
        resetTime: now + RATE_LIMIT_WINDOW_MS
      });
      return next();
    }

    if (limitInfo.count >= MAX_REQUESTS_PER_WINDOW) {
      console.warn(`[Security Alert] Rate limit exceeded for IP: ${ip} on ${req.originalUrl}`);
      return res.status(429).json({
        error: 'Too many requests. Please wait a minute before trying again to protect our AI services.'
      });
    }

    limitInfo.count++;
    next();
  });

  // 2. Custom Security Headers for XSS & Clickjacking Protection
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    
    // Allow framing inside AI Studio preview but deny elsewhere in production
    if (process.env.NODE_ENV === 'production') {
      res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    }
    next();
  });

  // 3. Robust CORS Configuration
  app.use((req, res, next) => {
    const origin = req.headers.origin || '*';
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    
    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }
    next();
  });

  // 4. Audit Logging Helper
  function logAdminActivity(action: string, adminUser: string, details: any) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      action,
      adminUser,
      details,
      ip: details.ip || 'unknown'
    };
    console.log(`[AUDIT LOG] ${JSON.stringify(logEntry)}`);
  }

  // Admin audit logger endpoint
  app.post('/api/admin/log', (req, res) => {
    const { action, adminUser, details } = req.body;
    const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'unknown';
    logAdminActivity(action || 'UNKNOWN_ACTION', adminUser || 'anonymous', { ...details, ip });
    res.json({ success: true });
  });

  // Helper to initialize Gemini SDK safely
  function getAIClient() {
    let apiKey = process.env.GEMINI_API_KEY;
    if (apiKey) {
      apiKey = apiKey.trim().replace(/^["']|["']$/g, '');
    }
    if (!apiKey || apiKey === 'MY_GEMINI_API_KEY' || apiKey.trim() === '') {
      throw new Error('GEMINI_API_KEY environment variable is not configured. Please add it via AI Studio settings.');
    }
    return new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }

  // Resilient content generation with retries and self-healing fallback models for transient errors
  async function generateContentWithRetry(ai: any, params: any, retries = 4, delay = 1000, attemptedFallbacks = 0): Promise<any> {
    const currentModel = params.model || 'gemini-3.5-flash';
    try {
      return await ai.models.generateContent(params);
    } catch (err: any) {
      const errMsg = err.message || '';
      const errStatus = err.status;

      // Hard quota errors shouldn't be retried as they represent an exceeded limit
      const isQuotaExceeded = errMsg.includes('429') || 
                             errMsg.includes('Resource has been exhausted') ||
                             errMsg.includes('quota') ||
                             errMsg.includes('RESOURCE_EXHAUSTED') ||
                             errStatus === 429;

      const isTransient = (errMsg.includes('503') || 
                           errMsg.includes('UNAVAILABLE') || 
                           errMsg.includes('high demand') ||
                           errMsg.includes('temporary') ||
                           errStatus === 503) && !isQuotaExceeded;

      // If it's a transient 503 or high-demand error and we haven't tried fallback models too many times,
      // let's try a fallback model alias to self-heal!
      if (isTransient && attemptedFallbacks < 2) {
        let nextModel = 'gemini-flash-latest';
        if (currentModel === 'gemini-flash-latest') {
          nextModel = 'gemini-3.1-flash-lite';
        } else if (currentModel === 'gemini-3.1-flash-lite') {
          nextModel = 'gemini-3.5-flash'; // Avoid infinite loops
        }
        
        console.warn(`[Self-Healing] Primary model (${currentModel}) is unavailable or experiencing high demand. Swapping to fallback model (${nextModel})...`);
        const updatedParams = { ...params, model: nextModel };
        // Try with the fallback model, keeping the same retry budget but incrementing attemptedFallbacks
        return generateContentWithRetry(ai, updatedParams, retries, delay, attemptedFallbacks + 1);
      }

      if (isTransient && retries > 0) {
        const jitter = Math.floor(Math.random() * 500);
        const nextDelay = delay * 2 + jitter;
        console.warn(`Gemini API returned transient error on ${currentModel}. Retrying in ${delay}ms... (Retries left: ${retries})`, errMsg);
        await new Promise(resolve => setTimeout(resolve, delay));
        return generateContentWithRetry(ai, params, retries - 1, nextDelay, attemptedFallbacks);
      }
      throw err;
    }
  }

  // --- AI API Endpoints ---

  // 1. AI Summarizer
  app.post('/api/ai/summarize', async (req, res) => {
    try {
      const { content, length = 'short' } = req.body;
      if (!content) {
        return res.status(400).json({ error: 'Content is required' });
      }

      const ai = getAIClient();
      const prompt = `You are a professional editorial editor for PulseWire Africa. Provide a high-quality, engaging, SEO-optimized summary/excerpt of the following article content. The summary should be ${length === 'short' ? 'around 2-3 sentences' : 'around 150-200 words'} and write in an informative journalistic voice appropriate for a premium digital news site. Do not include any meta comments or introductory filler.

Content:
${content}`;

      const response = await generateContentWithRetry(ai, {
        model: 'gemini-3.5-flash',
        contents: prompt,
      });

      res.json({ summary: response.text?.trim() });
    } catch (err: any) {
      console.error('AI Summarization failed:', err);
      if (err.status === 429 || err.message?.includes('429') || err.message?.includes('quota')) {
        return res.status(429).json({ error: 'AI Quota Exceeded. Please try again in a minute.' });
      }
      res.status(500).json({ error: err.message || 'AI Summarization failed' });
    }
  });

  // 2. AI SEO Generator (SEO Title, Description, Tags)
  app.post('/api/ai/seo', async (req, res) => {
    try {
      const { title, content, category } = req.body;
      if (!title || !content) {
        return res.status(400).json({ error: 'Title and Content are required' });
      }

      const ai = getAIClient();
      const prompt = `You are an expert SEO strategist for PulseWire Africa. Given the following article title, category, and draft content, generate:
1. An SEO-optimized headline (under 60 characters) that is compelling and highly searchable on Google News.
2. An engaging meta description (under 160 characters) summarizing the core story.
3. A list of 5-8 highly relevant, searchable tags/keywords (no spaces in single tags if possible, or simple spaced phrases).

Article Title: "${title}"
Category: "${category || 'General'}"
Content Excerpt:
${content.substring(0, 2000)}

Output must be valid JSON matching this schema:
{
  "seoTitle": "String",
  "seoDescription": "String",
  "tags": ["Tag1", "Tag2", "Tag3"]
}`;

      const response = await generateContentWithRetry(ai, {
        model: 'gemini-3.5-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: 'OBJECT',
            properties: {
              seoTitle: { type: 'STRING' },
              seoDescription: { type: 'STRING' },
              tags: {
                type: 'ARRAY',
                items: { type: 'STRING' },
              },
            },
            required: ['seoTitle', 'seoDescription', 'tags'],
          },
        },
      });

      const responseText = response.text || '{}';
      res.json(JSON.parse(responseText));
    } catch (err: any) {
      console.error('AI SEO generation failed:', err);
      if (err.status === 429 || err.message?.includes('429') || err.message?.includes('quota')) {
        return res.status(429).json({ error: 'AI Quota Exceeded. Please try again in a minute.' });
      }
      res.status(500).json({ error: err.message || 'AI SEO generation failed' });
    }
  });

  // 3. AI Rewrite & Commentary Assistant
  app.post('/api/ai/rewrite', async (req, res) => {
    try {
      const { content, style = 'professional' } = req.body;
      if (!content) {
        return res.status(400).json({ error: 'Content is required' });
      }

      const ai = getAIClient();
      const prompt = `You are a master investigative journalist and chief editor at PulseWire Africa.
Rewrite and edit the following draft/sourced text. Ensure it encourages original journalism, commentary, and insightful analysis rather than simple copy-pasting. Add professional structure, clear paragraph transitions, and editorial sophistication.
Maintain the target style: "${style}".
Ensure the prose is entirely original and passes editorial checks while retaining all essential facts and figures.

Sourced Text:
${content}`;

      const response = await generateContentWithRetry(ai, {
        model: 'gemini-3.5-flash',
        contents: prompt,
      });

      res.json({ content: response.text?.trim() });
    } catch (err: any) {
      console.error('AI Rewrite failed:', err);
      if (err.status === 429 || err.message?.includes('429') || err.message?.includes('quota')) {
        return res.status(429).json({ error: 'AI Quota Exceeded. Please try again in a minute.' });
      }
      res.status(500).json({ error: err.message || 'AI Rewrite failed' });
    }
  });

  // 4. Duplicate Content & Plagiarism Checker
  app.post('/api/ai/duplicate-check', async (req, res) => {
    try {
      const { title, content } = req.body;
      if (!content) {
        return res.status(400).json({ error: 'Content is required' });
      }

      const ai = getAIClient();
      const prompt = `You are an expert editorial auditor at PulseWire Africa.
Analyze the following article draft to determine if it is overly copied or if it contains sufficient original journalistic commentary, analysis, and unique editorial additions.
Assess the originality percentage (0 to 100), identify potential issues with passive aggregation (just reproducing syndicated wire news), and provide specific suggestions to improve originality.

Article Title: "${title || 'Untitled'}"
Draft Content:
${content.substring(0, 3000)}

Output must be valid JSON matching this schema:
{
  "originalityScore": Number, // Percentage of unique analysis / rewriting (e.g. 85)
  "verdict": "String", // "Excellent", "Good", "Needs Rewriting", "High Plagiarism Risk"
  "analysis": "String", // Short summary of the analysis
  "suggestions": ["Suggestion 1", "Suggestion 2"]
}`;

      const response = await generateContentWithRetry(ai, {
        model: 'gemini-3.5-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: 'OBJECT',
            properties: {
              originalityScore: { type: 'INTEGER' },
              verdict: { type: 'STRING' },
              analysis: { type: 'STRING' },
              suggestions: {
                type: 'ARRAY',
                items: { type: 'STRING' },
              },
            },
            required: ['originalityScore', 'verdict', 'analysis', 'suggestions'],
          },
        },
      });

      const responseText = response.text || '{}';
      res.json(JSON.parse(responseText));
    } catch (err: any) {
      console.error('AI Originality Audit failed:', err);
      if (err.status === 429 || err.message?.includes('429') || err.message?.includes('quota')) {
        return res.status(429).json({ error: 'AI Quota Exceeded. Please try again in a minute.' });
      }
      res.status(500).json({ error: err.message || 'AI Originality Audit failed' });
    }
  });

  // 4b. AI Fact Checking Assistant
  app.post('/api/ai/fact-check', async (req, res) => {
    try {
      const { title, content } = req.body;
      if (!content) {
        return res.status(400).json({ error: 'Content is required for fact-checking' });
      }

      const ai = getAIClient();
      const prompt = `You are a chief fact-checker for PulseWire Africa. Analyze the following article draft's title and contents.
Identify the core factual claims, check them for potential logical errors, historical inaccuracies, or extreme claims, and output:
1. A list of claim evaluations: each with the claim text, a verdict ("Verified", "Disputed", "Unverified"), a clear explanation of why, and some suggested authoritative sources to verify with.
2. An overall credibility score (0 to 100) based on factual density and potential misinformation risks.
3. A concise fact-checking summary.

Article Title: "${title || 'Untitled'}"
Draft Content:
${content.substring(0, 3000)}

Output must be valid JSON matching this schema:
{
  "claimChecks": [
    { "claim": "String", "verdict": "Verified" | "Disputed" | "Unverified", "explanation": "String", "sourcesSuggested": ["String"] }
  ],
  "overallCredibilityScore": Number,
  "factCheckingSummary": "String"
}`;

      const response = await generateContentWithRetry(ai, {
        model: 'gemini-3.5-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: 'OBJECT',
            properties: {
              claimChecks: {
                type: 'ARRAY',
                items: {
                  type: 'OBJECT',
                  properties: {
                    claim: { type: 'STRING' },
                    verdict: { type: 'STRING' },
                    explanation: { type: 'STRING' },
                    sourcesSuggested: {
                      type: 'ARRAY',
                      items: { type: 'STRING' }
                    }
                  },
                  required: ['claim', 'verdict', 'explanation', 'sourcesSuggested']
                }
              },
              overallCredibilityScore: { type: 'INTEGER' },
              factCheckingSummary: { type: 'STRING' }
            },
            required: ['claimChecks', 'overallCredibilityScore', 'factCheckingSummary']
          }
        }
      });

      res.json(JSON.parse(response.text || '{}'));
    } catch (err: any) {
      console.error('AI Fact Check failed:', err);
      if (err.status === 429 || err.message?.includes('429') || err.message?.includes('quota')) {
        return res.status(429).json({ error: 'AI Quota Exceeded. Please try again in a minute.' });
      }
      res.status(500).json({ error: err.message || 'AI Fact Checking failed' });
    }
  });

  // 4c. AI Readability, Tone & Google Discover Optimizer
  app.post('/api/ai/readability-tone', async (req, res) => {
    try {
      const { content } = req.body;
      if (!content) {
        return res.status(400).json({ error: 'Content is required for analysis' });
      }

      const ai = getAIClient();
      const prompt = `You are a premium digital media performance optimizer at PulseWire Africa.
Analyze the readability, journalistic tone, and potential for high performance on Google News, Google Discover, and organic search.
Evaluate:
1. Reading ease score (0-100) and equivalent grade level.
2. Tone characteristics.
3. Content score: representing optimization for Google Discover and Google News standards (transparency, authoritative voice, no clickbait).
4. Concrete suggested improvements.

Draft Content:
${content.substring(0, 3000)}

Output must be valid JSON matching this schema:
{
  "readabilityLevel": "String",
  "readingEaseScore": Number,
  "toneAnalysis": "String",
  "contentScore": Number,
  "suggestedImprovements": ["String"]
}`;

      const response = await generateContentWithRetry(ai, {
        model: 'gemini-3.5-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: 'OBJECT',
            properties: {
              readabilityLevel: { type: 'STRING' },
              readingEaseScore: { type: 'INTEGER' },
              toneAnalysis: { type: 'STRING' },
              contentScore: { type: 'INTEGER' },
              suggestedImprovements: {
                type: 'ARRAY',
                items: { type: 'STRING' }
              }
            },
            required: ['readabilityLevel', 'readingEaseScore', 'toneAnalysis', 'contentScore', 'suggestedImprovements']
          }
        }
      });

      res.json(JSON.parse(response.text || '{}'));
    } catch (err: any) {
      console.error('AI Readability & Tone analysis failed:', err);
      if (err.status === 429 || err.message?.includes('429') || err.message?.includes('quota')) {
        return res.status(429).json({ error: 'AI Quota Exceeded. Please try again in a minute.' });
      }
      res.status(500).json({ error: err.message || 'AI analysis failed' });
    }
  });

  // AI Social Media Caption & Newsletter Generator
  app.post('/api/ai/social-caption', async (req, res) => {
    try {
      const { title, summary, content } = req.body;
      if (!title) {
        return res.status(400).json({ error: 'Title is required for social captions' });
      }

      const ai = getAIClient();
      const prompt = `You are a professional digital distributor and community manager at PulseWire Africa.
Based on the following article title, brief summary, and draft excerpt, generate:
1. A compelling, high-engagement Facebook caption with emojis and call to actions.
2. A punchy, viral Twitter/X thread starter under 280 characters with trending hashtags.
3. A highly professional LinkedIn post focusing on professional insight or commercial value.
4. A newsletter subject line and a matching introductory body text (designed to engage subscribers).
5. A list of 5 matching, highly relevant hashtags.

Article Title: "${title}"
Summary: "${summary || ''}"
Content Excerpt: "${(content || '').substring(0, 1000)}"

Output must be valid JSON matching this schema:
{
  "facebookCaption": "String",
  "twitterCaption": "String",
  "linkedInCaption": "String",
  "newsletterSubject": "String",
  "newsletterBody": "String",
  "hashtags": ["String"]
}`;

      const response = await generateContentWithRetry(ai, {
        model: 'gemini-3.5-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: 'OBJECT',
            properties: {
              facebookCaption: { type: 'STRING' },
              twitterCaption: { type: 'STRING' },
              linkedInCaption: { type: 'STRING' },
              newsletterSubject: { type: 'STRING' },
              newsletterBody: { type: 'STRING' },
              hashtags: {
                type: 'ARRAY',
                items: { type: 'STRING' }
              }
            },
            required: ['facebookCaption', 'twitterCaption', 'linkedInCaption', 'newsletterSubject', 'newsletterBody', 'hashtags']
          }
        }
      });

      res.json(JSON.parse(response.text || '{}'));
    } catch (err: any) {
      console.error('AI Social distribution generation failed:', err);
      if (err.status === 429 || err.message?.includes('429') || err.message?.includes('quota')) {
        return res.status(429).json({ error: 'AI Quota Exceeded. Please try again in a minute.' });
      }
      res.status(500).json({ error: err.message || 'AI generation failed' });
    }
  });

  // Simple in-memory cache to prevent multiple concurrent or repetitive ad-generation calls to Gemini
  const adCache = new Map<string, any>();

  // 4e. AI Dynamic Content-Driven Sponsored Ad Generator
  app.post('/api/ai/campaigns/generate', async (req, res) => {
    try {
      const { title = '', category = '', tags = [], type = 'sidebar' } = req.body;
      
      const normalizedCategory = (category || '').toLowerCase().trim();
      const cacheKey = `${normalizedCategory}_${type}`;
      if (adCache.has(cacheKey)) {
        return res.json(adCache.get(cacheKey));
      }

      const ai = getAIClient();
      const prompt = `You are a creative advertising strategist for PulseWire Africa.
Analyze the following webpage/article context and generate a highly relevant, contextually driven sponsored ad.

Webpage Context:
- Title: "${title}"
- Category: "${category}"
- Tags: "${tags.join(', ')}"
- Placement: "${type}"

Generate a realistic, high-quality, professional sponsored advertisement related to this context. Avoid generic placeholder text or low-quality phrasing.

Select an appropriate, high-quality, professional Unsplash image that fits the ad's theme.
The image URL MUST be a real, valid, public Unsplash image. Provide a high-quality photo that matches the topic perfectly from these curated professional patterns:
- Tech/Business/Fintech: Use a dashboard, workspace, code, or modern office imagery.
  Examples: 
  - "https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&w=600&q=80"
  - "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=600&q=80"
  - "https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=600&q=80"
  - "https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?auto=format&fit=crop&w=600&q=80"
- Sports/Athletics/Health: Use running, stadium, soccer, or workout imagery.
  Examples:
  - "https://images.unsplash.com/photo-1461896836934-ffe607ba8211?auto=format&fit=crop&w=600&q=80"
  - "https://images.unsplash.com/photo-1517649763962-0c623066013b?auto=format&fit=crop&w=600&q=80"
  - "https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?auto=format&fit=crop&w=600&q=80"
- Finance/Banking/Investments: Use currency, charts, cryptocurrency, or gold imagery.
  Examples:
  - "https://images.unsplash.com/photo-1559526324-4b87b5e36e44?auto=format&fit=crop&w=600&q=80"
  - "https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?auto=format&fit=crop&w=600&q=80"
- Lifestyle/Real Estate/Travel: Use planes, beaches, modern houses, or food imagery.
  Examples:
  - "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=600&q=80"
  - "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=600&q=80"
- Politics/Global Affairs/Education: Use books, libraries, globes, or newspapers.
  Examples:
  - "https://images.unsplash.com/photo-1495020689067-958852a6565d?auto=format&fit=crop&w=600&q=80"
  - "https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?auto=format&fit=crop&w=600&q=80"

If none of those match, choose another realistic high-resolution Unsplash photo URL.

Output must be a valid JSON object matching this schema:
{
  "title": "A highly punchy, appealing, creative headline for the ad under 8 words (e.g. 'Scale Your Business Across Africa')",
  "advertiser": "The name of the simulated brand or sponsor (e.g. 'Standard Bank Group')",
  "description": "An engaging, professional, persuasive 1-2 sentence description detailing the benefits or offer.",
  "link": "A realistic simulated destination URL (e.g. 'https://standardbank.com/africa-growth')",
  "ctaText": "A quick action verb (e.g. 'Get Started', 'Learn More', 'Sign Up', 'Explore Now')",
  "imageUrl": "The complete valid Unsplash image URL starting with https://images.unsplash.com/...",
  "themeColor": "A Tailwind CSS color palette name suitable for the brand (e.g. 'emerald', 'sky', 'indigo', 'amber', 'rose', 'teal')"
}
`;

      const response = await generateContentWithRetry(ai, {
        model: 'gemini-3.5-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: 'OBJECT',
            properties: {
              title: { type: 'STRING' },
              advertiser: { type: 'STRING' },
              description: { type: 'STRING' },
              link: { type: 'STRING' },
              ctaText: { type: 'STRING' },
              imageUrl: { type: 'STRING' },
              themeColor: { type: 'STRING' }
            },
            required: ['title', 'advertiser', 'description', 'link', 'ctaText', 'imageUrl', 'themeColor']
          }
        }
      });

      const parsedAd = JSON.parse(response.text || '{}');
      if (parsedAd && parsedAd.title) {
        adCache.set(cacheKey, parsedAd);
      }
      res.json(parsedAd);
    } catch (err: any) {
      const isQuota = err.message?.includes('429') || err.message?.includes('quota') || err.status === 429 || err.message?.includes('RESOURCE_EXHAUSTED');
      console.warn(`AI Ad Generation: utilizing fallback ad (${isQuota ? 'rate limit / quota reached' : 'API key unconfigured or invalid'}).`);
      // Fallback dynamic ads based on Category
      const category = (req.body.category || '').toLowerCase();
      let fallbackAd = {
        title: 'Premium Financial Solutions for Africa',
        advertiser: 'Standard Chartered Africa',
        description: 'Grow and secure your wealth with our tailored wealth management and checking accounts across West Africa.',
        link: 'https://sc.com/africa',
        ctaText: 'Learn More',
        imageUrl: 'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?auto=format&fit=crop&w=600&q=80',
        themeColor: 'emerald'
      };

      if (category.includes('tech') || category.includes('startups') || category.includes('digital') || category.includes('software')) {
        fallbackAd = {
          title: 'Accept Payments Anywhere on Earth',
          advertiser: 'Paystack Africa',
          description: 'Modern, secure payment APIs designed for startups, small businesses, and enterprise platforms across Nigeria, Ghana, and Kenya.',
          link: 'https://paystack.com',
          ctaText: 'Get Started',
          imageUrl: 'https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&w=600&q=80',
          themeColor: 'sky'
        };
      } else if (category.includes('sport') || category.includes('football')) {
        fallbackAd = {
          title: 'Premium Sportswear & Training Kits',
          advertiser: 'Puma Sports West Africa',
          description: 'Step up your speed and agility on the field with Puma premium running gear and custom athletic sportswear. Free delivery in Accra & Lagos.',
          link: 'https://puma.com',
          ctaText: 'Shop Now',
          imageUrl: 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?auto=format&fit=crop&w=600&q=80',
          themeColor: 'amber'
        };
      } else if (category.includes('lifestyle') || category.includes('entertainment') || category.includes('travel')) {
        fallbackAd = {
          title: 'Fly Accra to London with Virgin',
          advertiser: 'Virgin Atlantic Airways',
          description: 'Experience ultra-premium economy seats, luxury pre-flight lounges, and top-tier hospitality on daily direct flights between Accra and London.',
          link: 'https://virginatlantic.com',
          ctaText: 'Book Flight',
          imageUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=600&q=80',
          themeColor: 'rose'
        };
      } else if (category.includes('politics') || category.includes('business') || category.includes('economy')) {
        fallbackAd = {
          title: 'Insights into Emerging African Markets',
          advertiser: 'McKinsey & Company Africa',
          description: 'Unlock exclusive market trends, strategic corporate advice, and macro-economic research designed for corporate leadership in West Africa.',
          link: 'https://mckinsey.com',
          ctaText: 'Explore Research',
          imageUrl: 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=600&q=80',
          themeColor: 'indigo'
        };
      }

      res.json(fallbackAd);
    }
  });

  // 5. Check if Gemini API is available
  app.get('/api/ai/status', (req, res) => {
    let apiKey = process.env.GEMINI_API_KEY;
    if (apiKey) {
      apiKey = apiKey.trim().replace(/^["']|["']$/g, '');
    }
    const isConfigured = !!apiKey && apiKey !== 'MY_GEMINI_API_KEY' && apiKey.trim() !== '';
    res.json({ configured: isConfigured });
  });

  // --- Dynamic SEO Meta Tags Injection for Article Details ---
  app.get('/article/:slug', async (req, res, next) => {
    const slug = req.params.slug;
    const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'https';
    const host = req.get('host');
    const appUrl = `${protocol}://${host}`;
    
    try {
      // In a robust application, we would load the article from Firestore on the server.
      // To bypass loading heavy Node firebase packages on the server when doing SSR,
      // we can query the Firestore REST API runQuery endpoint directly which is ultra-fast, zero-dependency, and extremely robust!
      const firestoreQueryUrl = `https://firestore.googleapis.com/v1/projects/pulsewireafrica/databases/ai-studio-pulsewireafrica-ce7cc083-15ac-489c-b8ff-506dc3277285/documents:runQuery`;
      
      const response = await fetch(firestoreQueryUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          structuredQuery: {
            from: [{ collectionId: 'articles' }],
            where: {
              fieldFilter: {
                field: { fieldPath: 'slug' },
                op: 'EQUAL',
                value: { stringValue: slug }
              }
            },
            limit: 1
          }
        })
      });
      
      let articleData: any = null;
      if (response.ok) {
        const queryResults: any = await response.json();
        if (Array.isArray(queryResults) && queryResults.length > 0 && queryResults[0].document) {
          const doc = queryResults[0].document;
          const fields = doc.fields || {};
          articleData = {
            title: fields.title?.stringValue || 'PulseWire Africa Story',
            summary: fields.summary?.stringValue || 'Breaking African & global news coverage.',
            featuredImage: fields.featuredImage?.stringValue || 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?auto=format&fit=crop&w=1200&q=80',
            category: fields.category?.stringValue || 'News',
            authorName: fields.authorName?.stringValue || 'PulseWire Reporter',
            publishedAt: fields.publishedAt?.stringValue || fields.createdAt?.stringValue || new Date().toISOString(),
          };
        }
      }

      // If no article found, fallback to default metadata
      if (!articleData) {
        articleData = {
          title: 'PulseWire Africa | Premium News & Editorial Commentary',
          summary: 'Modern, professional, SEO-optimized news coverage of Ghana, Africa, and world events.',
          featuredImage: 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?auto=format&fit=crop&w=1200&q=80',
          category: 'News',
          authorName: 'PulseWire Africa',
          publishedAt: new Date().toISOString()
        };
      }

      // Get appropriate index.html path
      const indexHtmlPath = process.env.NODE_ENV === 'production' 
         ? path.join(process.cwd(), 'dist', 'index.html') 
         : path.join(process.cwd(), 'index.html');

      if (!fs.existsSync(indexHtmlPath)) {
        return next();
      }

      let html = fs.readFileSync(indexHtmlPath, 'utf8');

      // Strip existing title and meta tags that we are going to dynamically override
      html = html.replace(/<title>[\s\S]*?<\/title>/gi, '');
      html = html.replace(/<meta\s+name="title"[\s\S]*?\/?>/gi, '');
      html = html.replace(/<meta\s+name="description"[\s\S]*?\/?>/gi, '');
      html = html.replace(/<meta\s+property="og:[\s\S]*?\/?>/gi, '');
      html = html.replace(/<meta\s+property="twitter:[\s\S]*?\/?>/gi, '');
      html = html.replace(/<meta\s+name="twitter:[\s\S]*?\/?>/gi, '');

      // Structured Schema Markup
      const schemaMarkup = {
        "@context": "https://schema.org",
        "@type": "NewsArticle",
        "headline": articleData.title,
        "image": [articleData.featuredImage],
        "datePublished": articleData.publishedAt,
        "dateModified": articleData.publishedAt,
        "author": {
          "@type": "Person",
          "name": articleData.authorName
        },
        "publisher": {
          "@type": "Organization",
          "name": "PulseWire Africa",
          "logo": {
            "@type": "ImageObject",
            "url": "https://images.unsplash.com/photo-1504711434969-e33886168f5c?auto=format&fit=crop&w=200&q=80"
          }
        },
        "description": articleData.summary
      };

      // Construct dynamic SEO Meta tags
      const metaTags = `
    <!-- PulseWire Africa Dynamic SEO SSR -->
    <title>${articleData.title} | PulseWire Africa</title>
    <meta name="description" content="${articleData.summary.replace(/"/g, '&quot;')}" />
    <link rel="canonical" href="${appUrl}/article/${slug}" />
    
    <!-- Open Graph / Facebook -->
    <meta property="og:type" content="article" />
    <meta property="og:url" content="${appUrl}/article/${slug}" />
    <meta property="og:title" content="${articleData.title.replace(/"/g, '&quot;')}" />
    <meta property="og:description" content="${articleData.summary.replace(/"/g, '&quot;')}" />
    <meta property="og:image" content="${articleData.featuredImage}" />
    <meta property="og:site_name" content="PulseWire Africa" />

    <!-- Twitter Cards -->
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${articleData.title.replace(/"/g, '&quot;')}" />
    <meta name="twitter:description" content="${articleData.summary.replace(/"/g, '&quot;')}" />
    <meta name="twitter:image" content="${articleData.featuredImage}" />
    
    <!-- Structured Schema Markup -->
    <script type="application/ld+json">
      ${JSON.stringify(schemaMarkup)}
    </script>
      `;

      // Inject into head
      if (html.includes('<head>')) {
        html = html.replace('<head>', `<head>${metaTags}`);
      }

      res.setHeader('Content-Type', 'text/html');
      return res.send(html);

    } catch (err) {
      console.error('Dynamic SEO injection failed:', err);
      return next(); // Fallback to serving SPA normally
    }
  });

  // --- Dynamic XML Sitemap ---
  app.get('/sitemap.xml', async (req, res) => {
    const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'https';
    const host = req.get('host');
    const appUrl = `${protocol}://${host}`;
    
    try {
      const firestoreUrl = `https://firestore.googleapis.com/v1/projects/pulsewireafrica/databases/ai-studio-pulsewireafrica-ce7cc083-15ac-489c-b8ff-506dc3277285/documents/articles?pageSize=100`;
      const response = await fetch(firestoreUrl);
      let articles: any[] = [];
      
      if (response.ok) {
        const data: any = await response.json();
        if (data && data.documents) {
          articles = data.documents.filter((doc: any) => {
            return doc.fields && doc.fields.status?.stringValue === 'published';
          }).map((doc: any) => {
            const fields = doc.fields;
            return {
              slug: fields.slug?.stringValue,
              updatedAt: fields.updatedAt?.stringValue || fields.createdAt?.stringValue || new Date().toISOString()
            };
          });
        }
      }

      const categories = ['ghana', 'africa', 'world', 'sports', 'football', 'business', 'technology', 'entertainment', 'health', 'lifestyle'];

      let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <!-- Homepage -->
  <url>
    <loc>${appUrl}/</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>always</changefreq>
    <priority>1.0</priority>
  </url>
`;

      // Add Category Pages
      categories.forEach(cat => {
        xml += `  <url>
    <loc>${appUrl}/category/${cat}</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>
`;
      });

      // Add Article Pages
      articles.forEach(art => {
        if (art.slug) {
          xml += `  <url>
    <loc>${appUrl}/article/${art.slug}</loc>
    <lastmod>${art.updatedAt}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.6</priority>
  </url>
`;
        }
      });

      xml += `</urlset>`;

      res.setHeader('Content-Type', 'application/xml');
      res.send(xml);
    } catch (err) {
      console.error('Sitemap generation error:', err);
      res.status(500).send('Error generating sitemap');
    }
  });

  // --- Dynamic Google News Sitemap ---
  app.get('/news-sitemap.xml', async (req, res) => {
    const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'https';
    const host = req.get('host');
    const appUrl = `${protocol}://${host}`;
    
    try {
      const firestoreUrl = `https://firestore.googleapis.com/v1/projects/pulsewireafrica/databases/ai-studio-pulsewireafrica-ce7cc083-15ac-489c-b8ff-506dc3277285/documents/articles?pageSize=100`;
      const response = await fetch(firestoreUrl);
      let newsArticles: any[] = [];
      
      if (response.ok) {
        const data: any = await response.json();
        if (data && data.documents) {
          // Fetch articles published in the last 48 hours (or fall back to the last 20 latest publications)
          const allDocs = data.documents.filter((doc: any) => {
            return doc.fields && doc.fields.status?.stringValue === 'published';
          }).map((doc: any) => {
            const fields = doc.fields;
            return {
              title: fields.title?.stringValue || 'PulseWire Africa Story',
              slug: fields.slug?.stringValue,
              publishedAt: fields.publishedAt?.stringValue || fields.createdAt?.stringValue || new Date().toISOString()
            };
          });
          
          const fortyEightHoursAgo = Date.now() - (48 * 60 * 60 * 1000);
          newsArticles = allDocs.filter((art: any) => {
            const pubTime = new Date(art.publishedAt).getTime();
            return pubTime >= fortyEightHoursAgo;
          });
          
          // Fallback if no publications in last 48 hours (so sitemap remains seeded)
          if (newsArticles.length === 0) {
            newsArticles = allDocs.slice(0, 20);
          }
        }
      }

      let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">
`;

      newsArticles.forEach(art => {
        if (art.slug) {
          // Escape XML special characters
          const escapedTitle = art.title
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&apos;');

          xml += `  <url>
    <loc>${appUrl}/article/${art.slug}</loc>
    <news:news>
      <news:publication>
        <news:name>PulseWire Africa</news:name>
        <news:language>en</news:language>
      </news:publication>
      <news:publication_date>${art.publishedAt}</news:publication_date>
      <news:title>${escapedTitle}</news:title>
    </news:news>
  </url>
`;
        }
      });

      xml += `</urlset>`;

      res.setHeader('Content-Type', 'application/xml');
      res.send(xml);
    } catch (err) {
      console.error('News sitemap generation error:', err);
      res.status(500).send('Error generating news sitemap');
    }
  });

  // --- Dynamic RSS 2.0 Feed ---
  app.get('/rss.xml', async (req, res) => {
    const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'https';
    const host = req.get('host');
    const appUrl = `${protocol}://${host}`;
    
    try {
      const firestoreUrl = `https://firestore.googleapis.com/v1/projects/pulsewireafrica/databases/ai-studio-pulsewireafrica-ce7cc083-15ac-489c-b8ff-506dc3277285/documents/articles?pageSize=30`;
      const response = await fetch(firestoreUrl);
      let rssItems: any[] = [];
      
      if (response.ok) {
        const data: any = await response.json();
        if (data && data.documents) {
          rssItems = data.documents.filter((doc: any) => {
            return doc.fields && doc.fields.status?.stringValue === 'published';
          }).map((doc: any) => {
            const fields = doc.fields;
            return {
              title: fields.title?.stringValue || 'PulseWire Africa Story',
              summary: fields.summary?.stringValue || '',
              slug: fields.slug?.stringValue,
              category: fields.category?.stringValue || 'News',
              authorName: fields.authorName?.stringValue || 'PulseWire Reporter',
              publishedAt: fields.publishedAt?.stringValue || fields.createdAt?.stringValue || new Date().toISOString()
            };
          });
        }
      }

      let rss = `<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/">
<channel>
  <title>PulseWire Africa | Premium News &amp; Commentary</title>
  <link>${appUrl}</link>
  <description>Modern, professional, SEO-optimized news coverage of Ghana, Africa, and world events.</description>
  <language>en-us</language>
  <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
  <atom:link href="${appUrl}/rss.xml" rel="self" type="application/rss+xml" />
`;

      rssItems.forEach(item => {
        if (item.slug) {
          const escapedTitle = item.title.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
          const escapedSummary = item.summary.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
          const pubDate = new Date(item.publishedAt).toUTCString();

          rss += `  <item>
    <title>${escapedTitle}</title>
    <link>${appUrl}/article/${item.slug}</link>
    <guid isPermaLink="true">${appUrl}/article/${item.slug}</guid>
    <pubDate>${pubDate}</pubDate>
    <description>${escapedSummary}</description>
    <category>${item.category}</category>
    <dc:creator>${item.authorName}</dc:creator>
  </item>
`;
        }
      });

      rss += `</channel>
</rss>`;

      res.setHeader('Content-Type', 'application/xml');
      res.send(rss);
    } catch (err) {
      console.error('RSS feed generation error:', err);
      res.status(500).send('Error generating RSS feed');
    }
  });

  // --- Dynamic Robots.txt ---
  app.get('/robots.txt', (req, res) => {
    const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'https';
    const host = req.get('host');
    const appUrl = `${protocol}://${host}`;
    
    const content = `User-agent: *
Allow: /
Disallow: /admin
Disallow: /api/

Sitemap: ${appUrl}/sitemap.xml
Sitemap: ${appUrl}/news-sitemap.xml
`;
    res.setHeader('Content-Type', 'text/plain');
    res.send(content);
  });

  // --- Serve Client SPA and Assets ---

  if (process.env.NODE_ENV !== 'production') {
    // Vite middleware for dev mode
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Serve static files in production
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
