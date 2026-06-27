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
    const apiKey = process.env.GEMINI_API_KEY;
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

  // Resilient content generation with retries for transient errors
  async function generateContentWithRetry(ai: any, params: any, retries = 3, delay = 1000): Promise<any> {
    try {
      return await ai.models.generateContent(params);
    } catch (err: any) {
      const isTransient = err.message?.includes('503') || 
                          err.message?.includes('UNAVAILABLE') || 
                          err.message?.includes('429') || 
                          err.message?.includes('Resource has been exhausted') ||
                          err.status === 503 ||
                          err.status === 429;
      if (isTransient && retries > 0) {
        console.warn(`Gemini API returned transient error. Retrying in ${delay}ms... (Retries left: ${retries})`, err.message);
        await new Promise(resolve => setTimeout(resolve, delay));
        return generateContentWithRetry(ai, params, retries - 1, delay * 2);
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
      res.status(500).json({ error: err.message || 'AI analysis failed' });
    }
  });

  // 4d. AI Social Media Caption & Newsletter Generator
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
      res.status(500).json({ error: err.message || 'AI generation failed' });
    }
  });

  // 5. Check if Gemini API is available
  app.get('/api/ai/status', (req, res) => {
    const apiKey = process.env.GEMINI_API_KEY;
    const isConfigured = !!apiKey && apiKey !== 'MY_GEMINI_API_KEY' && apiKey.trim() !== '';
    res.json({ configured: isConfigured });
  });

  // --- Dynamic SEO Meta Tags Injection for Article Details ---
  app.get('/article/:slug', async (req, res, next) => {
    const slug = req.params.slug;
    
    try {
      // In a robust application, we would load the article from Firestore on the server.
      // To bypass loading heavy Node firebase packages on the server when doing SSR,
      // we can query the Firestore REST API directly which is ultra-fast, zero-dependency, and extremely robust!
      const firestoreUrl = `https://firestore.googleapis.com/v1/projects/pulsewire-africa/databases/ai-studio-ce7cc083-15ac-489c-b8ff-506dc3277285/documents/articles`;
      const response = await fetch(`${firestoreUrl}?pageSize=1&filter=${encodeURIComponent(`status = "published" and slug = "${slug}"`)}`);
      
      let articleData: any = null;
      if (response.ok) {
        const data: any = await response.json();
        if (data && data.documents && data.documents.length > 0) {
          const doc = data.documents[0];
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
    <link rel="canonical" href="${process.env.APP_URL || 'https://pulsewire-africa-504216611238.us-west2.run.app'}/article/${slug}" />
    
    <!-- Open Graph / Facebook -->
    <meta property="og:type" content="article" />
    <meta property="og:url" content="${process.env.APP_URL || 'https://pulsewire-africa-504216611238.us-west2.run.app'}/article/${slug}" />
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
    try {
      const firestoreUrl = `https://firestore.googleapis.com/v1/projects/gen-lang-client-0971604910/databases/ai-studio-ce7cc083-15ac-489c-b8ff-506dc3277285/documents/articles?pageSize=100`;
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

      const appUrl = process.env.APP_URL || 'https://pulsewire-africa-504216611238.us-west2.run.app';
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

  // --- Dynamic Robots.txt ---
  app.get('/robots.txt', (req, res) => {
    const appUrl = process.env.APP_URL || 'https://pulsewire-africa-504216611238.us-west2.run.app';
    const content = `User-agent: *
Allow: /
Disallow: /admin
Disallow: /api/

Sitemap: ${appUrl}/sitemap.xml
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
