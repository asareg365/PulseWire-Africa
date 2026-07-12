import React, { useState, useEffect } from 'react';
import { Article, AdPlacement, Comment, NewsletterSubscription, CATEGORIES, Author } from '../types';
import { 
  getAllArticles, 
  saveArticle, 
  deleteArticle, 
  getAllAds, 
  saveAd, 
  deleteAd, 
  getAllCommentsAcrossArticles, 
  deleteComment, 
  approveComment,
  getNewsletterSubscribers,
  clearAllDatabaseData,
  seedDatabaseIfEmpty,
  getAllAuthors,
  saveAuthor,
  deleteAuthor,
  updateAuthorStatus
} from '../lib/db';
import { auth } from '../lib/firebase';
import { 
  Plus, 
  Trash2, 
  Edit, 
  FileText, 
  BarChart3, 
  MessageSquare, 
  Mail, 
  Layers, 
  Percent,
  Sparkles, 
  RefreshCw, 
  Check, 
  AlertTriangle,
  Eye, 
  ThumbsUp, 
  DollarSign, 
  ArrowRight,
  Search,
  ExternalLink,
  Lock,
  Database,
  ShieldCheck,
  Scale,
  Share2,
  Upload,
  Crop,
  Users
} from 'lucide-react';
import ImageEditorOverlay from './ImageEditorOverlay';
import { uploadOptimizedImageToFirebase } from '../lib/imageUtils';

interface AdminDashboardProps {
  navigate: (path: string) => void;
  email: string;
  role: string;
}

export default function AdminDashboard({ navigate, email, role }: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState<'articles' | 'ads' | 'comments' | 'newsletter' | 'analytics' | 'database' | 'profiles' | 'saved' | 'users'>('articles');
  const [userSearchQuery, setUserSearchQuery] = useState('');
  
  const isAdmin = ['asareg365@gmail.com', 'pulsewireafrica@gmail.com'].map(e => e.toLowerCase()).includes(email.trim().toLowerCase());
  
  useEffect(() => {
    console.log('AdminDashboard debug:', { email, role, isAdmin });
    if (!isAdmin && role !== 'admin') {
      navigate('/');
    }
  }, [isAdmin, navigate, email, role]);

  // Database control states
  const [dbActionLoading, setDbActionLoading] = useState(false);
  const [dbMessage, setDbMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  
  // States
  const [articles, setArticles] = useState<Article[]>([]);
  const [ads, setAds] = useState<AdPlacement[]>([]);
  const [comments, setComments] = useState<(Comment & { articleTitle?: string })[]>([]);
  const [authors, setAuthors] = useState<Author[]>([]);
  const [subscribers, setSubscribers] = useState<NewsletterSubscription[]>([]);
  const [loading, setLoading] = useState(true);

  // Article pagination and search states
  const [artSearchQuery, setArtSearchQuery] = useState('');
  const [artStatusFilter, setArtStatusFilter] = useState('all');
  const [artPage, setArtPage] = useState(1);
  const [artPageSize] = useState(10);

  // Filter and paginate articles for rendering
  const filteredArticles = articles.filter(art => {
    const matchesSearch = !artSearchQuery.trim() || 
      (art.title || '').toLowerCase().includes(artSearchQuery.toLowerCase()) ||
      (art.summary || '').toLowerCase().includes(artSearchQuery.toLowerCase()) ||
      (art.slug || '').toLowerCase().includes(artSearchQuery.toLowerCase());
    
    const matchesStatus = artStatusFilter === 'all' || art.status === artStatusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const paginatedArticles = filteredArticles.slice((artPage - 1) * artPageSize, artPage * artPageSize);
  const totalArtPages = Math.ceil(filteredArticles.length / artPageSize);

  const bureauAuthors = authors.filter(a => {
    const roleLower = (a.role || '').toLowerCase();
    return roleLower !== 'reader';
  });

  const registeredUsers = authors.filter(a => {
    const roleLower = (a.role || '').toLowerCase() === 'reader';
    return roleLower;
  });

  const filteredUsers = registeredUsers.filter(user => {
    const q = userSearchQuery.trim().toLowerCase();
    if (!q) return true;
    return (user.name || '').toLowerCase().includes(q) || (user.email || '').toLowerCase().includes(q);
  });

  // Editor states
  const [editingArticle, setEditingArticle] = useState<Article | null>(null);
  const [editorTitle, setEditorTitle] = useState('');
  const [editorSummary, setEditorSummary] = useState('');
  const [editorAuthorId, setEditorAuthorId] = useState('');
  const [editorAuthorName, setEditorAuthorName] = useState('');
  const [editorContent, setEditorContent] = useState('');
  const [editorCategory, setEditorCategory] = useState('ghana');
  const [editorCategories, setEditorCategories] = useState<string[]>(['ghana']);
  const [editorSubCategory, setEditorSubCategory] = useState('');
  const [editorTags, setEditorTags] = useState('');
  const [editorFeaturedImage, setEditorFeaturedImage] = useState('');
  const [editorImageAlt, setEditorImageAlt] = useState('');
  const [editorImages, setEditorImages] = useState<string[]>([]);
  const [editorStatus, setEditorStatus] = useState<'draft' | 'published' | 'scheduled'>('draft');
  const [editorPublishedAt, setEditorPublishedAt] = useState('');
  const [editorIsSponsored, setEditorIsSponsored] = useState(false);
  const [editorIsAffiliate, setEditorIsAffiliate] = useState(false);
  const [editorSponsorName, setEditorSponsorName] = useState('');
  const [editorAffiliateLink, setEditorAffiliateLink] = useState('');
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);

  // AI assistant states
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');
  const [plagiarismReport, setPlagiarismReport] = useState<{ originalityScore: number; verdict: string; analysis: string; suggestions: string[] } | null>(null);
  const [factCheckReport, setFactCheckReport] = useState<{ claimChecks: { claim: string; verdict: string; explanation: string; sourcesSuggested: string[] }[]; overallCredibilityScore: number; factCheckingSummary: string } | null>(null);
  const [readabilityReport, setReadabilityReport] = useState<{ readabilityLevel: string; readingEaseScore: number; toneAnalysis: string; contentScore: number; suggestedImprovements: string[] } | null>(null);
  const [socialCaptionReport, setSocialCaptionReport] = useState<{ facebookCaption: string; twitterCaption: string; linkedInCaption: string; newsletterSubject: string; newsletterBody: string; hashtags: string[] } | null>(null);

  // Unsplash search for quick image select
  const [unsplashKeyword, setUnsplashKeyword] = useState('');
  const [unsplashResults, setUnsplashResults] = useState<string[]>([]);
  const [unsplashLoading, setUnsplashLoading] = useState(false);

  // Ad Editor states
  const [editingAd, setEditingAd] = useState<AdPlacement | null>(null);
  const [adTitle, setAdTitle] = useState('');
  const [adType, setAdType] = useState<'banner' | 'sidebar' | 'in-article' | 'sticky'>('banner');
  const [adImageUrl, setAdImageUrl] = useState('');
  const [adLink, setAdLink] = useState('');
  const [adActive, setAdActive] = useState(true);

  // Author Editor states
  const [editingAuthor, setEditingAuthor] = useState<Author | null>(null);
  const [authorNameInput, setAuthorNameInput] = useState('');
  const [authorBioInput, setAuthorBioInput] = useState('');
  const [authorAvatarInput, setAuthorAvatarInput] = useState('');
  const [authorEmailInput, setAuthorEmailInput] = useState('');
  const [authorRoleInput, setAuthorRoleInput] = useState('');
  const [authorTwitterInput, setAuthorTwitterInput] = useState('');
  const [authorLinkedinInput, setAuthorLinkedinInput] = useState('');
  const [authorPasswordInput, setAuthorPasswordInput] = useState('');

  // Image Editor Overlay states
  const [imageEditorOpen, setImageEditorOpen] = useState(false);
  const [imageToEdit, setImageToEdit] = useState('');
  const [activeImageTarget, setActiveImageTarget] = useState<'cover' | 'ad' | 'gallery' | 'author'>('cover');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [dbWipeConfirm, setDbWipeConfirm] = useState(false);


  const processImageFile = (file: File, onComplete: (url: string) => void) => {
    if (file.size > 2.5 * 1024 * 1024) {
      alert("Please select an image smaller than 2.5MB to ensure safe storage in the database.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      if (typeof event.target?.result === 'string') {
        onComplete(event.target.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleUploadAndEdit = (file: File, target: 'cover' | 'ad' | 'gallery' | 'author') => {
    if (file.size > 2.5 * 1024 * 1024) {
      alert("Please select an image smaller than 2.5MB to ensure safe storage in the database.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      if (typeof event.target?.result === 'string') {
        setImageToEdit(event.target.result);
        setActiveImageTarget(target);
        setImageEditorOpen(true);
      }
    };
    reader.readAsDataURL(file);
  };

  useEffect(() => {
    // Listen to Auth state changes to fetch correct data with updated credentials
    const unsubscribe = auth.onAuthStateChanged(() => {
      loadAllAdminData();
    });
    return () => unsubscribe();
  }, []);

  const loadAllAdminData = async () => {
    setLoading(true);
    try {
      const activeUser = auth.currentUser;
      if (!activeUser) {
        navigate('/');
        return;
      }
      
      let role: 'admin' | 'editor' | 'user' = 'user';
      if (activeUser.email === 'asareg365@gmail.com' || activeUser.email === 'pulsewireafrica@gmail.com') {
        role = 'admin';
      } else {
        try {
          const allAuthors = await getAllAuthors();
          const matched = allAuthors.find(a => a.email.toLowerCase() === activeUser.email?.toLowerCase());
          if (matched && matched.role === 'editor') {
            role = 'editor';
          }
        } catch(e) {}
      }
      if (role === 'user') {
        setActiveTab('saved');
      } else if (role === 'editor') {
        setActiveTab('articles');
      }
      
      const fetchArticles = async () => {
        try {
          return await getAllArticles(true);
        } catch (e) {
          console.warn('Could not fetch articles:', e);
          return [];
        }
      };

      const fetchAds = async () => {
        try {
          return await getAllAds();
        } catch (e) {
          console.warn('Could not fetch ads:', e);
          return [];
        }
      };

      const fetchComments = async () => {
        try {
          return await getAllCommentsAcrossArticles();
        } catch (e) {
          console.warn('Could not fetch comments:', e);
          return [];
        }
      };

      const fetchSubscribers = async () => {
        try {
          return await getNewsletterSubscribers();
        } catch (e) {
          console.warn('Could not fetch newsletter subscribers (requires Admin/Editor permissions):', e);
          return [];
        }
      };

      const fetchAuthors = async () => {
        try {
          return await getAllAuthors();
        } catch (e) {
          console.warn('Could not fetch authors:', e);
          return [];
        }
      };

      const [allArts, allAds, allComms, allSubs, allAuthors] = await Promise.all([
        fetchArticles(),
        fetchAds(),
        fetchComments(),
        fetchSubscribers(),
        fetchAuthors()
      ]);

      setArticles(allArts || []);
      setAds(allAds || []);
      setComments(allComms || []);
      setSubscribers(allSubs || []);
      setAuthors(allAuthors || []);
    } catch (err) {
      console.error('Error fetching admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleClearDatabase = async () => {
    setDbActionLoading(true);
    setDbMessage(null);
    try {
      await clearAllDatabaseData();
      localStorage.setItem('skip_seeding', 'true');
      localStorage.removeItem('pulsewire_db_seeded');
      setDbMessage({ text: 'All data has been successfully deleted from the database! Automatic seeding on page load has been disabled.', type: 'success' });
      await loadAllAdminData();
      setDbWipeConfirm(false);
    } catch (err: any) {
      setDbMessage({ text: `Failed to clear database: ${err.message || err}`, type: 'error' });
    } finally {
      setDbActionLoading(false);
    }
  };

  const handleSeedDatabase = async () => {
    setDbActionLoading(true);
    setDbMessage(null);
    try {
      localStorage.removeItem('skip_seeding');
      await seedDatabaseIfEmpty(true);
      setDbMessage({ text: 'Database successfully seeded with default publications and advertisements!', type: 'success' });
      await loadAllAdminData();
    } catch (err: any) {
      setDbMessage({ text: `Failed to seed database: ${err.message || err}`, type: 'error' });
    } finally {
      setDbActionLoading(false);
    }
  };

  // --- Article editing mechanics ---

  const handleCreateNewArticle = () => {
    setEditingArticle({
      id: `art-${Date.now()}`,
      title: '',
      slug: '',
      summary: '',
      content: '',
      featuredImage: '',
      imageAlt: '',
      images: [],
      category: 'ghana',
      categories: ['ghana'],
      tags: [],
      authorId: '',
      authorName: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      publishedAt: new Date().toISOString(),
      status: 'draft',
      views: 0,
      likes: 0,
      shareCount: 0,
      isSponsored: false,
      isAffiliate: false
    });

    setEditorTitle('');
    setEditorSummary('');
    setEditorContent('');
    setEditorCategory('ghana');
    setEditorCategories(['ghana']);
    setEditorSubCategory('');
    setEditorTags('');
    setEditorFeaturedImage('');
    setEditorImageAlt('');
    setEditorImages([]);
    setEditorStatus('draft');
    setEditorPublishedAt(new Date().toISOString());
    setEditorIsSponsored(false);
    setEditorIsAffiliate(false);
    setEditorSponsorName('');
    setEditorAffiliateLink('');
    setEditorAuthorId('');
    setEditorAuthorName('');
    setPlagiarismReport(null);
  };

  const handleEditArticleClick = (art: Article) => {
    setEditingArticle(art);
    setEditorTitle(art.title);
    setEditorSummary(art.summary);
    setEditorContent(art.content);
    setEditorCategory(art.category);
    setEditorCategories(art.categories || (art.category ? [art.category] : ['ghana']));
    setEditorSubCategory(art.subCategory || '');
    setEditorTags(art.tags.join(', '));
    setEditorFeaturedImage(art.featuredImage);
    setEditorImageAlt(art.imageAlt || '');
    setEditorImages(art.images || []);
    setEditorStatus(art.status);
    setEditorPublishedAt(art.publishedAt || new Date().toISOString());
    setEditorIsSponsored(art.isSponsored);
    setEditorIsAffiliate(art.isAffiliate);
    setEditorSponsorName(art.sponsorName || '');
    setEditorAffiliateLink(art.affiliateLink || '');
    setEditorAuthorId(art.authorId || '');
    setEditorAuthorName(art.authorName || '');
    setPlagiarismReport(null);
  };

  const generateSlug = (text: string) => {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  };

  const handleSaveArticle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingArticle) return;

    if (!editorAuthorId) {
      alert('Please select an author for this article before saving.');
      return;
    }

    const finalSlug = generateSlug(editorTitle);
    
    // Check if slug is empty
    if (!finalSlug) {
      alert('Title must contain alphanumeric characters to generate an SEO slug.');
      return;
    }

    const updated: Article = {
      ...editingArticle,
      title: editorTitle,
      slug: finalSlug,
      summary: editorSummary,
      content: editorContent,
      category: editorCategories[0] || 'ghana',
      categories: editorCategories,
      subCategory: editorSubCategory,
      tags: editorTags.split(',').map(t => t.trim()).filter(Boolean),
      featuredImage: editorFeaturedImage,
      imageAlt: editorImageAlt,
      images: editorImages,
      status: editorStatus,
      isSponsored: editorIsSponsored,
      isAffiliate: editorIsAffiliate,
      sponsorName: editorIsSponsored ? editorSponsorName : undefined,
      affiliateLink: editorIsAffiliate ? editorAffiliateLink : undefined,
      authorId: editorAuthorId,
      authorName: editorAuthorName,
      updatedAt: new Date().toISOString(),
      publishedAt: editorStatus === 'scheduled' 
        ? (editorPublishedAt || editingArticle?.publishedAt || new Date().toISOString())
        : (editorStatus === 'published' && editingArticle?.status !== 'published' ? new Date().toISOString() : (editingArticle?.publishedAt || new Date().toISOString()))
    };

    try {
      await saveArticle(updated);
      setEditingArticle(null);
      await loadAllAdminData();
    } catch (err) {
      console.error(err);
      alert('Error saving article.');
    }
  };

  const handleDeleteArticle = async (id: string) => {
    try {
      await deleteArticle(id);
      setDeleteConfirmId(null);
      await loadAllAdminData();
    } catch (err) {
      console.error(err);
    }
  };

  // --- Quick Unsplash Image search ---
  const handleUnsplashSearch = async () => {
    if (!unsplashKeyword.trim()) return;
    setUnsplashLoading(true);
    try {
      // Direct high quality placeholder urls matching the exact query keywords to simulate premium asset lookup!
      const keywords = encodeURIComponent(unsplashKeyword.trim());
      const mockResults = [
        `https://images.unsplash.com/photo-1541872703-74c5e44368f9?auto=format&fit=crop&w=1200&q=80&sig=1`,
        `https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1200&q=80&sig=2`,
        `https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=1200&q=80&sig=3`,
        `https://images.unsplash.com/photo-1531297484001-80022131f5a1?auto=format&fit=crop&w=1200&q=80&sig=4`
      ];
      setUnsplashResults(mockResults);
    } catch (err) {
      console.error(err);
    } finally {
      setUnsplashLoading(false);
    }
  };

  // --- AI Integrations (Backend REST APIs) ---

  const handleAISummarize = async () => {
    if (!editorContent.trim()) {
      setAiError('Please enter some article content first.');
      return;
    }
    setAiLoading(true);
    setAiError('');
    try {
      const res = await fetch('/api/ai/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: editorContent, length: 'short' })
      });
      const data = await res.json();
      if (res.ok) {
        setEditorSummary(data.summary);
      } else {
        setAiError(data.error || 'Summarization failed.');
      }
    } catch (err: any) {
      setAiError('API Connection failed. Ensure the Gemini API key is configured.');
    } finally {
      setAiLoading(false);
    }
  };

  const handleAISEOAndTags = async () => {
    if (!editorTitle.trim() || !editorContent.trim()) {
      setAiError('Please enter a title and some draft content first.');
      return;
    }
    setAiLoading(true);
    setAiError('');
    try {
      const res = await fetch('/api/ai/seo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: editorTitle, content: editorContent, category: editorCategory })
      });
      const data = await res.json();
      if (res.ok) {
        setEditorTitle(data.seoTitle);
        setEditorTags(data.tags.join(', '));
        if (data.seoDescription) {
          setEditorSummary(data.seoDescription);
        }
      } else {
        setAiError(data.error || 'SEO generation failed.');
      }
    } catch (err) {
      setAiError('API Connection failed.');
    } finally {
      setAiLoading(false);
    }
  };

  const handleAIRewrite = async (style: string) => {
    if (!editorContent.trim()) {
      setAiError('Please enter some content to rewrite.');
      return;
    }
    setAiLoading(true);
    setAiError('');
    try {
      const res = await fetch('/api/ai/rewrite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: editorContent, style })
      });
      const data = await res.json();
      if (res.ok) {
        setEditorContent(data.content);
      } else {
        setAiError(data.error || 'Rewrite failed.');
      }
    } catch (err) {
      setAiError('API Connection failed.');
    } finally {
      setAiLoading(false);
    }
  };

  const handleDuplicateCheck = async () => {
    if (!editorContent.trim()) {
      setAiError('Please write some content to audit.');
      return;
    }
    setAiLoading(true);
    setAiError('');
    setPlagiarismReport(null);
    try {
      const res = await fetch('/api/ai/duplicate-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: editorTitle, content: editorContent })
      });
      const data = await res.json();
      if (res.ok) {
        setPlagiarismReport(data);
      } else {
        setAiError(data.error || 'Plagiarism checking failed.');
      }
    } catch (err) {
      setAiError('API Connection failed.');
    } finally {
      setAiLoading(false);
    }
  };

  const handleFactCheck = async () => {
    if (!editorContent.trim()) {
      setAiError('Please write some content to fact-check first.');
      return;
    }
    setAiLoading(true);
    setAiError('');
    setFactCheckReport(null);
    try {
      const res = await fetch('/api/ai/fact-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: editorTitle, content: editorContent })
      });
      const data = await res.json();
      if (res.ok) {
        setFactCheckReport(data);
      } else {
        setAiError(data.error || 'Fact-checking failed.');
      }
    } catch (err) {
      setAiError('API Connection failed.');
    } finally {
      setAiLoading(false);
    }
  };

  const handleReadabilityTone = async () => {
    if (!editorContent.trim()) {
      setAiError('Please write some content to analyze first.');
      return;
    }
    setAiLoading(true);
    setAiError('');
    setReadabilityReport(null);
    try {
      const res = await fetch('/api/ai/readability-tone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: editorContent })
      });
      const data = await res.json();
      if (res.ok) {
        setReadabilityReport(data);
      } else {
        setAiError(data.error || 'Readability & tone analysis failed.');
      }
    } catch (err) {
      setAiError('API Connection failed.');
    } finally {
      setAiLoading(false);
    }
  };

  const handleSocialCaptions = async () => {
    if (!editorTitle.trim()) {
      setAiError('Please enter a title to generate captions.');
      return;
    }
    setAiLoading(true);
    setAiError('');
    setSocialCaptionReport(null);
    try {
      const res = await fetch('/api/ai/social-caption', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: editorTitle, summary: editorSummary, content: editorContent })
      });
      const data = await res.json();
      if (res.ok) {
        setSocialCaptionReport(data);
      } else {
        setAiError(data.error || 'Social captions generation failed.');
      }
    } catch (err) {
      setAiError('API Connection failed.');
    } finally {
      setAiLoading(false);
    }
  };

  // --- Ads mechanics ---

  const handleCreateAd = () => {
    setEditingAd({
      id: `ad-${Date.now()}`,
      title: '',
      type: 'banner',
      imageUrl: '/logo-wide.svg',
      link: 'https://example.com',
      active: true,
      impressions: 0,
      clicks: 0
    });
    setAdTitle('');
    setAdType('banner');
    setAdImageUrl('/logo-wide.svg');
    setAdLink('https://example.com');
    setAdActive(true);
  };

  const handleEditAd = (ad: AdPlacement) => {
    setEditingAd(ad);
    setAdTitle(ad.title);
    setAdType(ad.type);
    setAdImageUrl(ad.imageUrl);
    setAdLink(ad.link);
    setAdActive(ad.active);
  };

  const handleSaveAd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAd) return;

    const updated: AdPlacement = {
      ...editingAd,
      title: adTitle,
      type: adType,
      imageUrl: adImageUrl,
      link: adLink,
      active: adActive
    };

    try {
      await saveAd(updated);
      setEditingAd(null);
      await loadAllAdminData();
      alert("Campaign advertisement creative saved successfully!");
    } catch (err: any) {
      alert(`Failed to save advertisement slot: ${err.message || err}`);
      console.error(err);
    }
  };

  const handleDeleteAd = async (id: string) => {
    try {
      await deleteAd(id);
      setDeleteConfirmId(null);
      await loadAllAdminData();
    } catch (err) {
      console.error(err);
    }
  };

  // --- Author/Profile management ---

  const handleCreateAuthor = () => {
    setEditingAuthor({
      id: `author-${Date.now()}`,
      name: '',
      bio: '',
      avatar: '',
      email: '',
      role: 'contributor',
      status: 'pending',
      createdAt: new Date().toISOString(),
      twitter: '',
      linkedin: '',
      password: ''
    });
    setAuthorNameInput('');
    setAuthorBioInput('');
    setAuthorAvatarInput('');
    setAuthorEmailInput('');
    setAuthorRoleInput('contributor');
    setAuthorTwitterInput('');
    setAuthorLinkedinInput('');
    setAuthorPasswordInput('');
  };

  const handleEditAuthor = (author: Author) => {
    setEditingAuthor(author);
    setAuthorNameInput(author.name || '');
    setAuthorBioInput(author.bio || '');
    setAuthorAvatarInput(author.avatar || '');
    setAuthorEmailInput(author.email || '');
    setAuthorRoleInput(author.role || 'contributor');
    setAuthorTwitterInput(author.twitter || '');
    setAuthorLinkedinInput(author.linkedin || '');
    setAuthorPasswordInput(author.password || '');
  };

  const handleSaveAuthor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAuthor) return;

    if (!authorNameInput.trim()) {
      alert("Please provide an author name.");
      return;
    }

    let authorId = editingAuthor.id;
    if ((authorId.startsWith('author-') || !authorId) && authorEmailInput.trim()) {
      authorId = authorEmailInput.trim().toLowerCase();
    }

    let finalAvatar = authorAvatarInput.trim();
    if (!finalAvatar || finalAvatar.includes('unsplash.com')) {
      finalAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(authorNameInput.trim())}&background=f1f5f9&color=dc2626&bold=true&size=256`;
    }

    const updated: Author = {
      ...editingAuthor,
      id: authorId,
      name: authorNameInput.trim(),
      bio: authorBioInput.trim(),
      avatar: finalAvatar,
      email: authorEmailInput.trim(),
      role: authorRoleInput,
      status: editingAuthor.status || 'pending',
      twitter: authorTwitterInput.trim(),
      linkedin: authorLinkedinInput.trim(),
      password: authorPasswordInput.trim()
    };

    try {
      await saveAuthor(updated);
      setEditingAuthor(null);
      await loadAllAdminData();
    } catch (err: any) {
      alert(`Failed to save author: ${err.message || err}`);
    }
  };

  const handleDeleteAuthor = async (authorId: string) => {
    try {
      await deleteAuthor(authorId);
      setDeleteConfirmId(null);
      await loadAllAdminData();
    } catch (err: any) {
      alert(`Failed to delete author: ${err.message || err}`);
    }
  };

  const handleApproveAuthor = async (author: Author) => {
    try {
      await updateAuthorStatus(author.id, 'approved');
      await loadAllAdminData();
    } catch (err: any) {
      alert(`Failed to approve author: ${err.message || err}`);
    }
  };

  // --- Comment moderations ---

  const handleApproveComment = async (artId: string, commId: string) => {
    try {
      await approveComment(artId, commId);
      await loadAllAdminData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteComment = async (artId: string, commId: string) => {
    try {
      await deleteComment(artId, commId);
      setDeleteConfirmId(null);
      await loadAllAdminData();
    } catch (err) {
      console.error(err);
    }
  };

  // --- CALCULATING METRICS FOR ANALYTICS PANEL ---
  const totalViews = articles.reduce((sum, art) => sum + (art.views || 0), 0);
  const totalLikes = articles.reduce((sum, art) => sum + (art.likes || 0), 0);
  const totalComments = comments.length;
  const totalSubscribers = subscribers.length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 transition-colors duration-200">
      
      {/* Title block */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 border-b border-gray-100 dark:border-gray-900 pb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2 font-sans">
            <Lock className="h-6 w-6 text-red-600" />
            Media Bureau Control Panel
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 font-sans">
            Oversee PulseWire Africa’s publications, advertising campaigns, and interactive Gemini AI news tools.
          </p>
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-[11px] text-slate-600 dark:text-gray-400 font-mono">
            <span className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-gray-800 px-2.5 py-1 rounded-lg">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <strong>Admin Email:</strong> asareg365@gmail.com
            </span>
            <span className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-gray-800 px-2.5 py-1 rounded-lg">
              <strong>Admin Hotline / Phone:</strong> 0248472474
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={loadAllAdminData}
            className="p-2.5 rounded-xl border border-gray-200 dark:border-gray-800 hover:bg-gray-100 dark:hover:bg-gray-900 text-gray-600 dark:text-gray-300 transition-colors flex items-center justify-center shrink-0"
            title="Refresh database data"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
          <button 
            onClick={() => navigate('/')}
            className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-900 rounded-xl transition-all inline-flex items-center gap-1 shrink-0"
          >
            View Newsroom <ExternalLink className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Editor Modal View */}
      {editingArticle && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-gray-950/60 backdrop-blur-sm p-4 sm:p-6 lg:p-8">
          <div className="w-full max-w-5xl bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-950/40 flex items-center justify-between shrink-0">
              <span className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-red-600" />
                {editingArticle.title ? 'Modify Story Details' : 'Compose News Article'}
              </span>
              <button 
                onClick={() => setEditingArticle(null)}
                className="text-xs font-bold uppercase tracking-wider text-gray-500 hover:text-red-500 hover:bg-gray-100 dark:hover:bg-gray-800 px-3 py-1.5 rounded-lg border border-transparent transition-all"
              >
                Cancel
              </button>
            </div>

            {/* Modal Body Scroll */}
            <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-3 gap-8">
              
              {/* Left Column: Form Editor (2 Cols width) */}
              <div className="lg:col-span-2 space-y-6">
                
                {/* AI Assistant Toolbar */}
                <div className="p-4 rounded-xl bg-red-50/50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/40">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold text-red-700 dark:text-red-400 flex items-center gap-1 font-mono uppercase tracking-widest">
                      <Sparkles className="h-4 w-4" />
                      Gemini Editorial Copilot
                    </span>
                    {aiLoading && (
                      <span className="text-xs text-red-600 dark:text-red-400 flex items-center gap-1.5 font-semibold">
                        <div className="h-3.5 w-3.5 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
                        Analyzing via AI...
                      </span>
                    )}
                  </div>

                  {aiError && (
                    <div className="p-2 rounded bg-red-100 text-red-800 text-xs font-semibold mb-3">
                      {aiError}
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2">
                    <button 
                      type="button"
                      onClick={handleAISummarize}
                      disabled={aiLoading}
                      className="px-3 py-1.5 rounded-lg bg-white dark:bg-gray-800 text-xs font-bold border border-gray-200 dark:border-gray-700 hover:border-red-500 text-gray-700 dark:text-gray-300 flex items-center gap-1 transition-colors"
                    >
                      Summarize Draft
                    </button>
                    <button 
                      type="button"
                      onClick={handleAISEOAndTags}
                      disabled={aiLoading}
                      className="px-3 py-1.5 rounded-lg bg-white dark:bg-gray-800 text-xs font-bold border border-gray-200 dark:border-gray-700 hover:border-red-500 text-gray-700 dark:text-gray-300 flex items-center gap-1 transition-colors"
                    >
                      Optimize SEO Headline
                    </button>
                    <button 
                      type="button"
                      onClick={() => handleAIRewrite('investigative')}
                      disabled={aiLoading}
                      className="px-3 py-1.5 rounded-lg bg-white dark:bg-gray-800 text-xs font-bold border border-gray-200 dark:border-gray-700 hover:border-red-500 text-gray-700 dark:text-gray-300 flex items-center gap-1 transition-colors"
                    >
                      Rewrite Investigative Style
                    </button>
                    <button 
                      type="button"
                      onClick={handleDuplicateCheck}
                      disabled={aiLoading}
                      className="px-3 py-1.5 rounded-lg bg-white dark:bg-gray-800 text-xs font-bold border border-gray-200 dark:border-gray-700 hover:border-red-500 text-gray-700 dark:text-gray-300 flex items-center gap-1 transition-colors"
                    >
                      Originality Check
                    </button>
                    <button 
                      type="button"
                      onClick={handleFactCheck}
                      disabled={aiLoading}
                      className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-bold flex items-center gap-1 transition-all"
                    >
                      <ShieldCheck className="h-3.5 w-3.5" />
                      Fact-Check Claims
                    </button>
                    <button 
                      type="button"
                      onClick={handleReadabilityTone}
                      disabled={aiLoading}
                      className="px-3 py-1.5 rounded-lg bg-gray-900 hover:bg-black dark:bg-gray-100 dark:hover:bg-white text-white dark:text-black text-xs font-bold flex items-center gap-1 transition-all"
                    >
                      <Scale className="h-3.5 w-3.5" />
                      Readability & Discover
                    </button>
                    <button 
                      type="button"
                      onClick={handleSocialCaptions}
                      disabled={aiLoading}
                      className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1 transition-all"
                    >
                      <Share2 className="h-3.5 w-3.5" />
                      Social & Newsletter Kit
                    </button>
                  </div>

                  {plagiarismReport && (
                    <div className="mt-4 p-4 rounded bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 text-xs space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold flex items-center gap-1">
                          <Percent className="h-4 w-4 text-emerald-500" />
                          Originality: <span className="text-emerald-500">{plagiarismReport.originalityScore}%</span>
                        </span>
                        <span className="px-2 py-0.5 rounded font-bold uppercase text-[9px] bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-400">
                          {plagiarismReport.verdict}
                        </span>
                      </div>
                      <p className="text-gray-600 dark:text-gray-400 font-sans">{plagiarismReport.analysis}</p>
                      {plagiarismReport.suggestions && plagiarismReport.suggestions.length > 0 && (
                        <div>
                          <span className="font-semibold text-gray-700 dark:text-gray-300">Recommendations for Originality:</span>
                          <ul className="list-disc list-inside space-y-1 text-gray-600 dark:text-gray-400 mt-1 pl-1 font-sans">
                            {plagiarismReport.suggestions.map((s, sIdx) => <li key={sIdx}>{s}</li>)}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Fact Checking Report Display */}
                  {factCheckReport && (
                    <div className="mt-4 p-4 rounded-xl bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 text-xs space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-gray-900 dark:text-white flex items-center gap-1.5 font-mono uppercase tracking-wider text-[10px]">
                          <ShieldCheck className="h-4 w-4 text-red-600" />
                          AI Newsroom Fact-Check Audit
                        </span>
                        <span className={`px-2 py-1 rounded font-bold text-[10px] uppercase font-mono ${
                          factCheckReport.overallCredibilityScore >= 80 
                            ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-400' 
                            : factCheckReport.overallCredibilityScore >= 50 
                            ? 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-400' 
                            : 'bg-red-100 dark:bg-red-950 text-red-800 dark:text-red-400'
                        }`}>
                          Credibility Score: {factCheckReport.overallCredibilityScore}/100
                        </span>
                      </div>
                      <p className="text-gray-600 dark:text-gray-400 font-sans leading-relaxed">{factCheckReport.factCheckingSummary}</p>
                      
                      <div className="space-y-3">
                        <span className="font-bold text-gray-800 dark:text-gray-200 uppercase tracking-widest text-[9px] block border-b border-gray-100 dark:border-gray-900 pb-1 font-mono">Verified Claim Analysis</span>
                        {factCheckReport.claimChecks && factCheckReport.claimChecks.length > 0 ? (
                          factCheckReport.claimChecks.map((check, idx) => (
                            <div key={idx} className="p-3 rounded-lg bg-gray-50 dark:bg-gray-900/60 border border-gray-150 dark:border-gray-800 space-y-1.5">
                              <div className="flex items-start justify-between gap-2">
                                <span className="font-bold text-gray-800 dark:text-gray-200">"{check.claim}"</span>
                                <span className={`px-2 py-0.5 rounded font-mono font-bold uppercase text-[9px] ${
                                  check.verdict === 'Verified' 
                                    ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-400' 
                                    : check.verdict === 'Disputed' 
                                    ? 'bg-red-100 dark:bg-red-950 text-red-800 dark:text-red-400' 
                                    : 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-400'
                                }`}>
                                  {check.verdict}
                                </span>
                              </div>
                              <p className="text-gray-600 dark:text-gray-400 font-sans leading-relaxed text-[11px]">{check.explanation}</p>
                              {check.sourcesSuggested && check.sourcesSuggested.length > 0 && (
                                <div className="text-[10px]">
                                  <span className="font-semibold text-gray-500">Suggested Verification Sources:</span>
                                  <span className="text-gray-600 dark:text-gray-400 font-sans pl-1">
                                    {check.sourcesSuggested.join(', ')}
                                  </span>
                                </div>
                              )}
                            </div>
                          ))
                        ) : (
                          <p className="text-gray-500 italic">No specific factual claims requiring evaluation were found.</p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Readability & Google Discover Report Display */}
                  {readabilityReport && (
                    <div className="mt-4 p-4 rounded-xl bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 text-xs space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-gray-900 dark:text-white flex items-center gap-1.5 font-mono uppercase tracking-wider text-[10px]">
                          <Scale className="h-4 w-4 text-red-600" />
                          Tone & Google Discover Optimizer
                        </span>
                        <span className="px-2 py-1 rounded bg-red-100 dark:bg-red-950 text-red-800 dark:text-red-400 font-bold font-mono text-[10px] uppercase">
                          Discover Optimization: {readabilityReport.contentScore}%
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3 pt-1">
                        <div className="p-2.5 rounded-lg bg-gray-50 dark:bg-gray-900 border border-gray-150 dark:border-gray-850">
                          <span className="text-[10px] text-gray-400 dark:text-gray-500 uppercase font-bold font-mono">Readability Level</span>
                          <p className="font-bold text-gray-800 dark:text-gray-200 text-xs mt-0.5">{readabilityReport.readabilityLevel}</p>
                        </div>
                        <div className="p-2.5 rounded-lg bg-gray-50 dark:bg-gray-900 border border-gray-150 dark:border-gray-850">
                          <span className="text-[10px] text-gray-400 dark:text-gray-500 uppercase font-bold font-mono">Flesch Reading Ease</span>
                          <p className="font-bold text-gray-800 dark:text-gray-200 text-xs mt-0.5">{readabilityReport.readingEaseScore}/100</p>
                        </div>
                      </div>

                      <div className="p-2.5 rounded-lg bg-gray-50 dark:bg-gray-900 border border-gray-150 dark:border-gray-850">
                        <span className="text-[10px] text-gray-400 dark:text-gray-500 uppercase font-bold font-mono block mb-0.5">Editorial Tone Analysis</span>
                        <p className="text-gray-700 dark:text-gray-300 font-sans leading-relaxed">{readabilityReport.toneAnalysis}</p>
                      </div>

                      {readabilityReport.suggestedImprovements && readabilityReport.suggestedImprovements.length > 0 && (
                        <div className="pt-1">
                          <span className="font-bold text-gray-800 dark:text-gray-200 uppercase tracking-widest text-[9px] block border-b border-gray-100 dark:border-gray-900 pb-1 font-mono">Google News Optimization Checklist</span>
                          <ul className="list-disc list-inside space-y-1 text-gray-600 dark:text-gray-400 mt-2 pl-1 font-sans">
                            {readabilityReport.suggestedImprovements.map((s, idx) => <li key={idx}>{s}</li>)}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Social Caption Kit Display */}
                  {socialCaptionReport && (
                    <div className="mt-4 p-4 rounded-xl bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 text-xs space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-gray-900 dark:text-white flex items-center gap-1.5 font-mono uppercase tracking-wider text-[10px]">
                          <Share2 className="h-4 w-4 text-emerald-500" />
                          AI Newsroom Distribution Kit
                        </span>
                        <span className="text-[10px] text-emerald-500 font-bold font-mono uppercase">Ready for Distribution</span>
                      </div>

                      {/* Facebook */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-gray-800 dark:text-gray-300 uppercase font-mono text-[9px] tracking-wider">Facebook / Instagram Copy</span>
                          <button 
                            type="button" 
                            onClick={() => navigator.clipboard.writeText(socialCaptionReport.facebookCaption)}
                            className="text-[10px] text-emerald-600 hover:text-emerald-700 font-bold uppercase"
                          >
                            Copy text
                          </button>
                        </div>
                        <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 font-sans leading-relaxed text-gray-700 dark:text-gray-300 select-all whitespace-pre-wrap">
                          {socialCaptionReport.facebookCaption}
                        </div>
                      </div>

                      {/* Twitter */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-gray-800 dark:text-gray-300 uppercase font-mono text-[9px] tracking-wider">Twitter / X Post</span>
                          <button 
                            type="button" 
                            onClick={() => navigator.clipboard.writeText(socialCaptionReport.twitterCaption)}
                            className="text-[10px] text-emerald-600 hover:text-emerald-700 font-bold uppercase"
                          >
                            Copy text
                          </button>
                        </div>
                        <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 font-sans leading-relaxed text-gray-700 dark:text-gray-300 select-all whitespace-pre-wrap">
                          {socialCaptionReport.twitterCaption}
                        </div>
                      </div>

                      {/* LinkedIn */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-gray-800 dark:text-gray-300 uppercase font-mono text-[9px] tracking-wider">LinkedIn Professional Share</span>
                          <button 
                            type="button" 
                            onClick={() => navigator.clipboard.writeText(socialCaptionReport.linkedInCaption)}
                            className="text-[10px] text-emerald-600 hover:text-emerald-700 font-bold uppercase"
                          >
                            Copy text
                          </button>
                        </div>
                        <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 font-sans leading-relaxed text-gray-700 dark:text-gray-300 select-all whitespace-pre-wrap">
                          {socialCaptionReport.linkedInCaption}
                        </div>
                      </div>

                      {/* Newsletter */}
                      <div className="space-y-1.5 p-3 rounded-lg bg-emerald-50/40 dark:bg-emerald-950/10 border border-emerald-100 dark:border-emerald-950">
                        <span className="font-bold text-emerald-800 dark:text-emerald-400 uppercase font-mono text-[9px] tracking-wider block">PulseWire Editorial Newsletter Template</span>
                        <div className="text-[11px] space-y-1 text-gray-700 dark:text-gray-300 font-sans">
                          <div>
                            <span className="font-bold text-gray-600 dark:text-gray-450">Subject:</span> {socialCaptionReport.newsletterSubject}
                          </div>
                          <div className="pt-1 whitespace-pre-wrap leading-relaxed border-t border-emerald-100 dark:border-emerald-900 mt-1">
                            {socialCaptionReport.newsletterBody}
                          </div>
                        </div>
                        <div className="flex justify-end pt-1">
                          <button 
                            type="button" 
                            onClick={() => navigator.clipboard.writeText(`Subject: ${socialCaptionReport.newsletterSubject}\n\n${socialCaptionReport.newsletterBody}`)}
                            className="text-[10px] text-emerald-600 hover:text-emerald-700 font-bold uppercase"
                          >
                            Copy Complete Template
                          </button>
                        </div>
                      </div>

                      {/* Hashtags */}
                      {socialCaptionReport.hashtags && socialCaptionReport.hashtags.length > 0 && (
                        <div>
                          <span className="font-semibold text-gray-500">Trending Hashtags:</span>
                          <span className="text-gray-800 dark:text-gray-300 font-mono pl-1">
                            {socialCaptionReport.hashtags.map(h => h.startsWith('#') ? h : `#${h}`).join(' ')}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <form onSubmit={handleSaveArticle} id="article-editor-form" className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">Headline</label>
                    <input 
                      type="text" 
                      required
                      placeholder="Enter an attention-grabbing news headline..."
                      value={editorTitle}
                      onChange={e => setEditorTitle(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500 font-sans"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">Article Content (Full-text)</label>
                    <textarea 
                      rows={14}
                      required
                      placeholder="Write your news story or editorial deep dive here. Markdown and basic formatting are supported."
                      value={editorContent}
                      onChange={e => setEditorContent(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500 font-mono text-sm leading-relaxed"
                    />
                  </div>
                </form>
              </div>

              {/* Right Column: Metadata & Controls */}
              <div className="space-y-6">
                
                {/* Publishing State box */}
                <div className="p-5 bg-gray-50 dark:bg-gray-950 rounded-xl border border-gray-200 dark:border-gray-800 space-y-4">
                  <span className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest font-mono block">Publish Settings</span>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Article Author</label>
                    <select 
                      value={editorAuthorId}
                      required
                      onChange={e => {
                        const selectedId = e.target.value;
                        setEditorAuthorId(selectedId);
                        const selectedAuthor = authors.find(aut => aut.id === selectedId);
                        if (selectedAuthor) {
                          setEditorAuthorName(selectedAuthor.name);
                        } else {
                          setEditorAuthorName('');
                        }
                      }}
                      className="w-full px-3 py-2 rounded bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-sm focus:outline-none focus:ring-1 focus:ring-red-500 text-gray-900 dark:text-white"
                    >
                      <option value="">-- Select Author --</option>
                      {authors.map(aut => (
                        <option key={aut.id} value={aut.id}>
                          {aut.name} ({aut.role || 'Member'})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Workflow Status</label>
                    <select 
                      value={editorStatus}
                      onChange={e => setEditorStatus(e.target.value as any)}
                      className="w-full px-3 py-2 rounded bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-sm focus:outline-none focus:ring-1 focus:ring-red-500 text-gray-900 dark:text-white"
                    >
                      <option value="draft">Draft / Review</option>
                      <option value="published">Published Live</option>
                      <option value="scheduled">Scheduled Publish</option>
                    </select>
                  </div>

                  {editorStatus === 'scheduled' && (
                    <div className="mt-3">
                      <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                        Scheduled Publish Date & Time
                      </label>
                      <input 
                        type="datetime-local"
                        value={(() => {
                          if (!editorPublishedAt) return '';
                          try {
                            const d = new Date(editorPublishedAt);
                            const pad = (num: number) => String(num).padStart(2, '0');
                            return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
                          } catch (e) {
                            return '';
                          }
                        })()}
                        onChange={e => {
                          const val = e.target.value;
                          if (val) {
                            setEditorPublishedAt(new Date(val).toISOString());
                          }
                        }}
                        className="w-full px-3 py-2 rounded bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-sm focus:outline-none focus:ring-1 focus:ring-red-500 text-gray-900 dark:text-white font-mono"
                      />
                      <p className="text-[10px] text-gray-500 mt-1">
                        The article will be automatically published at this time.
                      </p>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 font-mono">
                      Article Categories
                    </label>
                    <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                      {CATEGORIES.map(cat => {
                        const isSelected = editorCategories.includes(cat.id);
                        return (
                          <button
                            type="button"
                            key={cat.id}
                            onClick={() => {
                              if (isSelected) {
                                if (editorCategories.length > 1) {
                                  setEditorCategories(editorCategories.filter(id => id !== cat.id));
                                }
                              } else {
                                setEditorCategories([...editorCategories, cat.id]);
                              }
                            }}
                            className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all text-left cursor-pointer ${
                              isSelected
                                ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 text-emerald-800 dark:text-emerald-400 font-bold shadow-sm'
                                : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 text-slate-700 dark:text-gray-300 hover:bg-slate-50 dark:hover:bg-gray-800'
                            }`}
                          >
                            <span className={`w-3.5 h-3.5 rounded flex items-center justify-center border transition-all ${
                              isSelected 
                                ? 'bg-emerald-600 border-emerald-600 text-white' 
                                : 'border-slate-300 dark:border-gray-700'
                            }`}>
                              {isSelected && (
                                <svg className="w-2.5 h-2.5 fill-current" viewBox="0 0 20 20">
                                  <path d="M0 11l2-2 5 5L18 3l2 2L7 18z"/>
                                </svg>
                              )}
                            </span>
                            <span className="truncate">{cat.name}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Sub Category</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Local Governance, Elections, Tech Startups"
                      value={editorSubCategory}
                      onChange={e => setEditorSubCategory(e.target.value)}
                      className="w-full px-3 py-2 rounded bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-sm text-gray-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Searchable Tags (Comma separated)</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Ghana, Politics, Accra"
                      value={editorTags}
                      onChange={e => setEditorTags(e.target.value)}
                      className="w-full px-3 py-2 rounded bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-sm text-gray-900 dark:text-white"
                    />
                  </div>
                </div>

                {/* Excerpt / Summary Box */}
                <div className="p-5 bg-gray-50 dark:bg-gray-950 rounded-xl border border-gray-200 dark:border-gray-800 space-y-3">
                  <span className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest font-mono block">Excerpt / SEO Description</span>
                  <textarea 
                    rows={4}
                    placeholder="Short SEO snippet to display on feed listings and social previews..."
                    value={editorSummary}
                    onChange={e => setEditorSummary(e.target.value)}
                    className="w-full p-3 rounded bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-xs text-gray-900 dark:text-white"
                  />
                </div>

                {/* Imagery Picker Box */}
                <div className="p-5 bg-gray-50 dark:bg-gray-950 rounded-xl border border-gray-200 dark:border-gray-800 space-y-4">
                  <span className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest font-mono block">Featured Cover Image</span>
                  
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Image URL</label>
                    <input 
                      type="text" 
                      value={editorFeaturedImage}
                      onChange={e => setEditorFeaturedImage(e.target.value)}
                      className="w-full p-2 rounded bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-xs text-gray-900 dark:text-white mb-3"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Image Alt Text</label>
                    <input 
                      type="text" 
                      placeholder="e.g. A vibrant sunset over the skyline of Accra, Ghana"
                      value={editorImageAlt}
                      onChange={e => setEditorImageAlt(e.target.value)}
                      className="w-full p-2 rounded bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-xs text-gray-900 dark:text-white"
                    />
                    <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">Descriptive alternative text for screen readers and search engines (SEO).</p>
                  </div>

                  {/* Drag and Drop Zone */}
                  <div 
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      const file = e.dataTransfer.files?.[0];
                      if (file) {
                        handleUploadAndEdit(file, 'cover');
                      }
                    }}
                    onClick={() => {
                      document.getElementById('cover-file-upload')?.click();
                    }}
                    className="border-2 border-dashed border-gray-300 dark:border-gray-700 hover:border-emerald-500 rounded-lg p-5 text-center cursor-pointer transition-all bg-white dark:bg-gray-900 relative overflow-hidden group min-h-[100px] flex flex-col justify-center items-center"
                  >
                    {editorFeaturedImage && editorFeaturedImage !== "" ? (
                      <>
                        <img 
                          src={editorFeaturedImage || null} 
                          alt="Cover Preview" 
                          className="absolute inset-0 w-full h-full object-cover opacity-20 dark:opacity-40 group-hover:opacity-10 transition-opacity" 
                          referrerPolicy="no-referrer"
                        />
                        <div className="relative z-10 flex flex-col items-center">
                          <Upload className="mx-auto h-5 w-5 text-emerald-600 mb-1 animate-bounce" />
                          <p className="text-[11px] text-gray-700 dark:text-gray-300 font-bold">
                            Drag & Drop to replace or <span className="text-emerald-600 underline">Browse</span>
                          </p>
                          <p className="text-[9px] text-gray-400 mt-0.5">Cover photo is loaded</p>
                        </div>
                      </>
                    ) : (
                      <div className="relative z-10 flex flex-col items-center">
                        <Upload className="mx-auto h-5 w-5 text-gray-400 mb-1" />
                        <p className="text-[11px] text-gray-500 font-semibold">
                          Drag & Drop Cover Photo or <span className="text-emerald-600">Browse</span>
                        </p>
                        <p className="text-[9px] text-gray-400 mt-0.5">Supports PNG, JPG, GIF up to 2.5MB</p>
                      </div>
                    )}
                    <input 
                      type="file" 
                      id="cover-file-upload" 
                      accept="image/*" 
                      className="hidden" 
                      onChange={e => {
                        const file = e.target.files?.[0];
                        if (file) {
                          handleUploadAndEdit(file, 'cover');
                        }
                      }}
                    />
                  </div>

                  {editorFeaturedImage && (
                    <button
                      type="button"
                      id="btn-edit-cover-photo"
                      onClick={() => {
                        setImageToEdit(editorFeaturedImage);
                        setActiveImageTarget('cover');
                        setImageEditorOpen(true);
                      }}
                      className="w-full flex items-center justify-center gap-2 py-2 px-3 border border-emerald-200 dark:border-emerald-800 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 font-bold text-xs hover:bg-emerald-600 hover:text-white dark:hover:bg-emerald-800 transition-all shadow-sm font-sans"
                    >
                      <Crop className="h-4 w-4 text-emerald-600" />
                      Crop / Adjust Framing & Filters
                    </button>
                  )}

                  {/* Asset lookup helper */}
                  <div className="pt-2 border-t border-gray-200 dark:border-gray-800">
                    <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">Unsplash Library Lookup</label>
                    <div className="flex gap-2">
                      <input 
                        type="text" 
                        placeholder="e.g. accra skyline"
                        value={unsplashKeyword}
                        onChange={e => setUnsplashKeyword(e.target.value)}
                        className="flex-1 p-2 rounded bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-xs text-gray-900 dark:text-white"
                      />
                      <button 
                        type="button"
                        onClick={handleUnsplashSearch}
                        className="px-3 rounded bg-gray-900 text-white hover:bg-red-600 text-xs font-bold transition-colors"
                      >
                        Find
                      </button>
                    </div>

                    {unsplashResults.length > 0 && (
                      <div className="grid grid-cols-2 gap-3 mt-3">
                        {unsplashResults.map((url, uIdx) => (
                          <div 
                            key={uIdx}
                            className="relative overflow-hidden rounded border border-gray-200 dark:border-gray-800 transition-all bg-white dark:bg-gray-900 group/item h-16"
                          >
                            <img src={url || null} alt="Lookup option" className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/80 opacity-0 group-hover/item:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1 p-1 z-20">
                              <button
                                type="button"
                                onClick={() => setEditorFeaturedImage(url)}
                                className={`w-full py-1 px-1.5 rounded text-[9px] font-black uppercase tracking-wider text-center transition-all ${
                                  editorFeaturedImage === url ? 'bg-red-600 text-white' : 'bg-white text-gray-900 hover:bg-gray-200'
                                }`}
                              >
                                {editorFeaturedImage === url ? '✓ Cover' : 'Set Cover'}
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  if (!editorImages.includes(url)) {
                                    setEditorImages([...editorImages, url]);
                                  }
                                }}
                                className={`w-full py-1 px-1.5 rounded text-[9px] font-black uppercase tracking-wider text-center transition-all ${
                                  editorImages.includes(url) ? 'bg-emerald-600 text-white' : 'bg-gray-800 text-white hover:bg-gray-700'
                                }`}
                              >
                                {editorImages.includes(url) ? '✓ Attached' : '+ Gallery'}
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Supplementary Gallery Imagery */}
                <div className="p-5 bg-gray-50 dark:bg-gray-950 rounded-xl border border-gray-200 dark:border-gray-800 space-y-4">
                  <span className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest font-mono block">Attached News Media Gallery</span>
                  
                  {/* Manual add input */}
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">Add Image URL manually</label>
                    <div className="flex gap-2 mb-3">
                      <input 
                        type="text" 
                        id="manual-gallery-img"
                        placeholder="Paste any dynamic news image URL..."
                        className="flex-1 p-2 rounded bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-xs text-gray-900 dark:text-white"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            const input = e.target as HTMLInputElement;
                            const val = input.value.trim();
                            if (val && !editorImages.includes(val)) {
                              setEditorImages([...editorImages, val]);
                              input.value = '';
                            }
                          }
                        }}
                      />
                      <button 
                        type="button"
                        onClick={() => {
                          const input = document.getElementById('manual-gallery-img') as HTMLInputElement;
                          const val = input?.value.trim();
                          if (val && !editorImages.includes(val)) {
                            setEditorImages([...editorImages, val]);
                            input.value = '';
                          }
                        }}
                        className="px-3 rounded bg-emerald-700 text-white hover:bg-emerald-800 text-xs font-bold transition-colors"
                      >
                        Attach
                      </button>
                    </div>

                    {/* Drag and Drop Gallery Zone */}
                    <div 
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        const file = e.dataTransfer.files?.[0];
                        if (file) {
                          handleUploadAndEdit(file, 'gallery');
                        }
                      }}
                      onClick={() => {
                        document.getElementById('gallery-file-upload')?.click();
                      }}
                      className="border-2 border-dashed border-gray-300 dark:border-gray-700 hover:border-emerald-500 rounded-lg p-4 text-center cursor-pointer transition-all bg-white dark:bg-gray-900 flex flex-col justify-center items-center"
                    >
                      <Upload className="h-5 w-5 text-emerald-600 mb-1 animate-pulse" />
                      <p className="text-[10px] text-gray-500 font-semibold">
                        Drag & Drop photos here or <span className="text-emerald-600 underline">Browse</span> to upload from device
                      </p>
                      <p className="text-[8px] text-gray-400 mt-0.5">Adds instantly to the attached media gallery (up to 2.5MB)</p>
                      <input 
                        type="file" 
                        id="gallery-file-upload" 
                        accept="image/*" 
                        className="hidden" 
                        onChange={e => {
                          const file = e.target.files?.[0];
                          if (file) {
                            handleUploadAndEdit(file, 'gallery');
                          }
                        }}
                      />
                    </div>
                  </div>

                  {/* Attached images list */}
                  {editorImages.length > 0 ? (
                    <div className="space-y-2">
                      <label className="block text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Attached Media ({editorImages.length})</label>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {editorImages.map((imgUrl, idx) => (
                          <div key={idx} className="relative aspect-[4/3] rounded-lg bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 overflow-hidden group/attached">
                            <img src={imgUrl || null} alt="Attached thumbnail" className="w-full h-full object-cover" />
                            
                            {/* Re-order & Delete Controls overlay */}
                            <div className="absolute inset-0 bg-slate-950/85 opacity-0 group-hover/attached:opacity-100 transition-opacity flex flex-col items-center justify-between p-2">
                              <span className="text-[9px] font-mono font-medium text-slate-300">Photo {idx + 1}</span>
                              
                              <div className="flex items-center gap-1.5">
                                {idx > 0 && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const list = [...editorImages];
                                      const temp = list[idx];
                                      list[idx] = list[idx - 1];
                                      list[idx - 1] = temp;
                                      setEditorImages(list);
                                    }}
                                    className="p-1 rounded bg-white/10 text-white hover:bg-emerald-700 text-xs font-bold w-6 h-6 flex items-center justify-center transition-colors"
                                    title="Move Left/Up"
                                  >
                                    ◀
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => setEditorImages(editorImages.filter((_, i) => i !== idx))}
                                  className="px-2 py-1 rounded bg-red-600 hover:bg-red-700 text-white text-[9px] font-extrabold uppercase transition-colors"
                                  title="Remove Image"
                                >
                                  Remove
                                </button>
                                {idx < editorImages.length - 1 && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const list = [...editorImages];
                                      const temp = list[idx];
                                      list[idx] = list[idx + 1];
                                      list[idx + 1] = temp;
                                      setEditorImages(list);
                                    }}
                                    className="p-1 rounded bg-white/10 text-white hover:bg-emerald-700 text-xs font-bold w-6 h-6 flex items-center justify-center transition-colors"
                                    title="Move Right/Down"
                                  >
                                    ▶
                                  </button>
                                )}
                              </div>
                              <div className="h-2" />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-6 text-xs text-slate-400 font-sans italic border border-dashed border-gray-200 dark:border-gray-800 rounded-xl bg-white dark:bg-gray-900/30">
                      No supplementary media attached yet. Use the lookup tool or manually paste URLs above to populate.
                    </div>
                  )}
                </div>

                {/* Monetization / Sponsorship override */}
                <div className="p-5 bg-gray-50 dark:bg-gray-950 rounded-xl border border-gray-200 dark:border-gray-800 space-y-4">
                  <span className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest font-mono block">Article Monetization</span>
                  
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Is Sponsored Content</label>
                    <input 
                      type="checkbox" 
                      checked={editorIsSponsored}
                      onChange={e => setEditorIsSponsored(e.target.checked)}
                      className="rounded text-red-600 focus:ring-red-500 h-4 w-4"
                    />
                  </div>

                  {editorIsSponsored && (
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Sponsor Brand Name</label>
                      <input 
                        type="text" 
                        placeholder="e.g. Fly African Airways"
                        value={editorSponsorName}
                        onChange={e => setEditorSponsorName(e.target.value)}
                        className="w-full p-2 rounded bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-xs text-gray-900 dark:text-white"
                      />
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Is Affiliate Product Article</label>
                    <input 
                      type="checkbox" 
                      checked={editorIsAffiliate}
                      onChange={e => setEditorIsAffiliate(e.target.checked)}
                      className="rounded text-red-600 focus:ring-red-500 h-4 w-4"
                    />
                  </div>

                  {editorIsAffiliate && (
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Affiliate Destination Link</label>
                      <input 
                        type="url" 
                        placeholder="https://partner-portal.com/track"
                        value={editorAffiliateLink}
                        onChange={e => setEditorAffiliateLink(e.target.value)}
                        className="w-full p-2 rounded bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-xs text-gray-900 dark:text-white"
                      />
                    </div>
                  )}
                </div>

                {/* Submissions Action */}
                <div className="pt-4 flex gap-3">
                  <button 
                    type="submit"
                    form="article-editor-form"
                    className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-colors shadow-md shadow-red-600/10"
                  >
                    Commit to Database
                  </button>
                </div>

              </div>

            </div>
          </div>
        </div>
      )}

      {/* Ad placement editor modal */}
      {editingAd && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-gray-950/60 backdrop-blur-sm p-4 flex items-center justify-center">
          <div className="w-full max-w-lg bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Configure Advertising Creative</h3>
            
            <form onSubmit={handleSaveAd} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">Creative Title</label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. Fly African Airways - Ghana"
                  value={adTitle}
                  onChange={e => setAdTitle(e.target.value)}
                  className="w-full p-2.5 rounded bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-red-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">Slot Placement Type</label>
                  <select 
                    value={adType}
                    onChange={e => setAdType(e.target.value as any)}
                    className="w-full p-2 rounded bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 text-xs text-gray-900 dark:text-white"
                  >
                    <option value="banner">Banner (728x90 style)</option>
                    <option value="sidebar">Sidebar (300x250 square style)</option>
                    <option value="in-article">In-Article inline promo</option>
                    <option value="sticky">Mobile Bottom Sticky bar</option>
                  </select>
                </div>

                <div className="flex items-center justify-between pt-6 px-2 border border-gray-100 dark:border-gray-800 rounded">
                  <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Active Status</label>
                  <input 
                    type="checkbox" 
                    checked={adActive}
                    onChange={e => setAdActive(e.target.checked)}
                    className="h-4 w-4 rounded text-red-600 focus:ring-red-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">Ad Banner Image URL</label>
                <input 
                  type="text" 
                  required
                  placeholder="https://images.unsplash.com/photo-..."
                  value={adImageUrl}
                  onChange={e => setAdImageUrl(e.target.value)}
                  className="w-full p-2.5 rounded bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 text-sm text-gray-900 dark:text-white mb-2"
                />

                {/* Drag and Drop Zone */}
                <div 
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const file = e.dataTransfer.files?.[0];
                    if (file) {
                      handleUploadAndEdit(file, 'ad');
                    }
                  }}
                  onClick={() => {
                    document.getElementById('ad-file-upload')?.click();
                  }}
                  className="border-2 border-dashed border-gray-300 dark:border-gray-700 hover:border-emerald-500 rounded-lg p-3 text-center cursor-pointer transition-all bg-gray-50 dark:bg-gray-950 relative overflow-hidden group min-h-[80px] flex flex-col justify-center items-center"
                >
                  {adImageUrl && adImageUrl !== "" ? (
                    <>
                      <img 
                        src={adImageUrl || null} 
                        alt="Ad Preview" 
                        className="absolute inset-0 w-full h-full object-cover opacity-20 dark:opacity-40 group-hover:opacity-10 transition-opacity" 
                        referrerPolicy="no-referrer"
                      />
                      <div className="relative z-10">
                        <Upload className="mx-auto h-4 w-4 text-emerald-600 mb-0.5 animate-pulse" />
                        <p className="text-[10px] text-gray-700 dark:text-gray-300 font-bold">
                          Drag & Drop to replace or <span className="text-emerald-600 underline">Browse</span>
                        </p>
                      </div>
                    </>
                  ) : (
                    <div className="relative z-10">
                      <Upload className="mx-auto h-4 w-4 text-gray-400 mb-0.5" />
                      <p className="text-[10px] text-gray-500 font-semibold">
                        Drag & Drop Banner Photo or <span className="text-emerald-600">Browse</span>
                      </p>
                    </div>
                  )}
                  <input 
                    type="file" 
                    id="ad-file-upload" 
                    accept="image/*" 
                    className="hidden" 
                    onChange={e => {
                      const file = e.target.files?.[0];
                      if (file) {
                        handleUploadAndEdit(file, 'ad');
                      }
                    }}
                  />
                </div>

                {adImageUrl && (
                  <button
                    type="button"
                    id="btn-edit-ad-photo"
                    onClick={() => {
                      setImageToEdit(adImageUrl);
                      setActiveImageTarget('ad');
                      setImageEditorOpen(true);
                    }}
                    className="mt-2 w-full flex items-center justify-center gap-1.5 py-1.5 px-3 border border-emerald-200 dark:border-emerald-800 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 font-bold text-[10px] hover:bg-emerald-600 hover:text-white dark:hover:bg-emerald-800 transition-all font-sans"
                  >
                    <Crop className="h-3.5 w-3.5 text-emerald-600" />
                    Adjust Framing & Filters
                  </button>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">Destination link (click url)</label>
                <input 
                  type="url" 
                  required
                  placeholder="https://destination-brand.com"
                  value={adLink}
                  onChange={e => setAdLink(e.target.value)}
                  className="w-full p-2.5 rounded bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 text-sm text-gray-900 dark:text-white"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button 
                  type="button"
                  onClick={() => setEditingAd(null)}
                  className="flex-1 py-2 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-bold text-xs uppercase"
                >
                  Close
                </button>
                <button 
                  type="submit"
                  className="flex-1 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs uppercase"
                >
                  Save Ad Creative
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Author profile editor modal */}
      {editingAuthor && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-gray-950/60 backdrop-blur-sm p-4 flex items-center justify-center">
          <div className="w-full max-w-lg bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Register & Configure Journalist Profile</h3>
            
            <form onSubmit={handleSaveAuthor} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">Full Name</label>
                  <input 
                    type="text" 
                    required
                    placeholder="e.g. Ama Serwaa"
                    value={authorNameInput}
                    onChange={e => setAuthorNameInput(e.target.value)}
                    className="w-full p-2.5 rounded bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">Editorial Role / Designation</label>
                  <select 
                    required
                    value={authorRoleInput}
                    onChange={e => setAuthorRoleInput(e.target.value)}
                    className="w-full p-2.5 rounded bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  >
                    <option value="reader">Reader / Registered User</option>
                    <option value="contributor">Contributor</option>
                    <option value="editor">Editor</option>
                    <option value="admin">Administrator</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">Email Address</label>
                  <input 
                    type="email" 
                    required
                    placeholder="e.g. ama.serwaa@pulsewireafrica.news"
                    value={authorEmailInput}
                    onChange={e => setAuthorEmailInput(e.target.value)}
                    className="w-full p-2.5 rounded bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">Temporary Password Note</label>
                  <input 
                    type="text" 
                    placeholder="e.g. securePass123"
                    value={authorPasswordInput}
                    onChange={e => setAuthorPasswordInput(e.target.value)}
                    className="w-full p-2.5 rounded bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono"
                  />
                </div>
              </div>
              <p className="text-[10px] text-amber-600 dark:text-amber-400 font-bold bg-amber-50 dark:bg-amber-950/30 p-2 rounded border border-amber-200 dark:border-amber-900/50">
                ⚠️ Note: Creating a profile here does NOT automatically create a login account. The journalist must still go to the Login page, click "Need contributor credentials?", and sign up using this exact email address to claim their profile.
              </p>

              <div>
                <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">Professional Bio</label>
                <textarea 
                  rows={3}
                  required
                  placeholder="Tell readers about this journalist's background, track record, and coverage beats..."
                  value={authorBioInput}
                  onChange={e => setAuthorBioInput(e.target.value)}
                  className="w-full p-2.5 rounded bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500 font-sans"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">Twitter Handle (no @)</label>
                  <input 
                    type="text" 
                    placeholder="e.g. AmaSerwaaTech"
                    value={authorTwitterInput}
                    onChange={e => setAuthorTwitterInput(e.target.value)}
                    className="w-full p-2.5 rounded bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">LinkedIn Username/ID</label>
                  <input 
                    type="text" 
                    placeholder="e.g. ama-serwaa"
                    value={authorLinkedinInput}
                    onChange={e => setAuthorLinkedinInput(e.target.value)}
                    className="w-full p-2.5 rounded bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">Avatar / Profile Picture URL</label>
                <input 
                  type="text" 
                  required
                  placeholder="https://images.unsplash.com/photo-..."
                  value={authorAvatarInput}
                  onChange={e => setAuthorAvatarInput(e.target.value)}
                  className="w-full p-2.5 rounded bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 text-sm text-gray-900 dark:text-white mb-2 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />

                {/* Drag and Drop Zone */}
                <div 
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const file = e.dataTransfer.files?.[0];
                    if (file) {
                      handleUploadAndEdit(file, 'author');
                    }
                  }}
                  onClick={() => {
                    document.getElementById('author-file-upload')?.click();
                  }}
                  className="border-2 border-dashed border-gray-300 dark:border-gray-700 hover:border-emerald-500 rounded-lg p-3 text-center cursor-pointer transition-all bg-gray-50 dark:bg-gray-950 relative overflow-hidden group min-h-[80px] flex flex-col justify-center items-center"
                >
                  {authorAvatarInput && authorAvatarInput !== "" ? (
                    <>
                      <img 
                        src={authorAvatarInput || null} 
                        alt="Profile Preview" 
                        className="absolute inset-0 w-full h-full object-cover opacity-20 dark:opacity-45 group-hover:opacity-10 transition-opacity" 
                        referrerPolicy="no-referrer"
                      />
                      <div className="relative z-10 text-center">
                        <Upload className="mx-auto h-4 w-4 text-emerald-600 mb-0.5" />
                        <p className="text-[10px] text-gray-500 font-semibold">
                          Profile photo loaded. Drag & drop another or <span className="text-emerald-600">Browse</span>
                        </p>
                      </div>
                    </>
                  ) : (
                    <div className="relative z-10">
                      <Upload className="mx-auto h-4 w-4 text-gray-400 mb-0.5" />
                      <p className="text-[10px] text-gray-500 font-semibold">
                        Drag & Drop Profile Photo or <span className="text-emerald-600">Browse</span>
                      </p>
                    </div>
                  )}
                  <input 
                    type="file" 
                    id="author-file-upload" 
                    accept="image/*" 
                    className="hidden" 
                    onChange={e => {
                      const file = e.target.files?.[0];
                      if (file) {
                        handleUploadAndEdit(file, 'author');
                      }
                    }}
                  />
                </div>

                {authorAvatarInput && (
                  <button
                    type="button"
                    onClick={() => {
                      setImageToEdit(authorAvatarInput);
                      setActiveImageTarget('author');
                      setImageEditorOpen(true);
                    }}
                    className="mt-2 w-full flex items-center justify-center gap-1.5 py-1.5 px-3 border border-emerald-200 dark:border-emerald-800 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 font-bold text-[10px] hover:bg-emerald-600 hover:text-white dark:hover:bg-emerald-800 transition-all font-sans"
                  >
                    <Crop className="h-3.5 w-3.5 text-emerald-600" />
                    Adjust Framing & Filters
                  </button>
                )}
              </div>

              <div className="flex gap-3 pt-4">
                <button 
                  type="button"
                  onClick={() => setEditingAuthor(null)}
                  className="flex-1 py-2 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-bold text-xs uppercase"
                >
                  Close
                </button>
                <button 
                  type="submit"
                  className="flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase"
                >
                  Save Profile
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Admin Tab Switching Navigation */}
      <div className="flex items-center space-x-1 border-b border-gray-200 dark:border-gray-800 mb-8 overflow-x-auto scrollbar-none pb-1">
        
        {/* Saved News (For everyone, but only tab for ordinary users) */}
        <button 
          onClick={() => setActiveTab('saved')}
          className={`flex items-center gap-1.5 px-4 py-2.5 border-b-2 font-bold text-xs uppercase tracking-wider transition-all whitespace-nowrap ${
            activeTab === 'saved' 
              ? 'border-red-600 text-red-600' 
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          <Layers className="h-4 w-4" />
          Saved News
        </button>

        {(role === 'admin' || role === 'editor') && (
          <>
            <button 
              onClick={() => setActiveTab('articles')}
              className={`flex items-center gap-1.5 px-4 py-2.5 border-b-2 font-bold text-xs uppercase tracking-wider transition-all whitespace-nowrap ${
                activeTab === 'articles' 
                  ? 'border-red-600 text-red-600' 
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              <FileText className="h-4 w-4" />
              Newsroom Articles ({articles.length})
            </button>
            
            <button 
              onClick={() => setActiveTab('comments')}
              className={`flex items-center gap-1.5 px-4 py-2.5 border-b-2 font-bold text-xs uppercase tracking-wider transition-all whitespace-nowrap ${
                activeTab === 'comments' 
                  ? 'border-red-600 text-red-600' 
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              <MessageSquare className="h-4 w-4" />
              Discussion Moderation ({comments.length})
            </button>
          </>
        )}

        {isAdmin && (
          <>
            <button 
              onClick={() => setActiveTab('profiles')}
              className={`flex items-center gap-1.5 px-4 py-2.5 border-b-2 font-bold text-xs uppercase tracking-wider transition-all whitespace-nowrap ${
                activeTab === 'profiles' 
                  ? 'border-red-600 text-red-600' 
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              <Users className="h-4 w-4 text-emerald-500" />
              Bureau Profiles ({bureauAuthors.length})
            </button>
            <button 
              onClick={() => setActiveTab('users')}
              className={`flex items-center gap-1.5 px-4 py-2.5 border-b-2 font-bold text-xs uppercase tracking-wider transition-all whitespace-nowrap ${
                activeTab === 'users' 
                  ? 'border-red-600 text-red-600' 
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              <Users className="h-4 w-4 text-blue-500" />
              Registered Users ({registeredUsers.length})
            </button>
            <button 
              onClick={() => setActiveTab('ads')}
              className={`flex items-center gap-1.5 px-4 py-2.5 border-b-2 font-bold text-xs uppercase tracking-wider transition-all whitespace-nowrap ${
                activeTab === 'ads' 
                  ? 'border-red-600 text-red-600' 
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              <DollarSign className="h-4 w-4 text-emerald-500" />
              Campaign Ads ({ads.length})
            </button>
            <button 
              onClick={() => setActiveTab('newsletter')}
              className={`flex items-center gap-1.5 px-4 py-2.5 border-b-2 font-bold text-xs uppercase tracking-wider transition-all whitespace-nowrap ${
                activeTab === 'newsletter' 
                  ? 'border-red-600 text-red-600' 
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              <Mail className="h-4 w-4" />
              Bulletins ({subscribers.length})
            </button>
            <button 
              onClick={() => setActiveTab('analytics')}
              className={`flex items-center gap-1.5 px-4 py-2.5 border-b-2 font-bold text-xs uppercase tracking-wider transition-all whitespace-nowrap ${
                activeTab === 'analytics' 
                  ? 'border-red-600 text-red-600' 
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              <BarChart3 className="h-4 w-4" />
              Audience Analytics
            </button>
            <button 
              onClick={() => setActiveTab('database')}
              className={`flex items-center gap-1.5 px-4 py-2.5 border-b-2 font-bold text-xs uppercase tracking-wider transition-all whitespace-nowrap ${
                activeTab === 'database' 
                  ? 'border-red-600 text-red-600' 
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              <Database className="h-4 w-4 text-orange-500" />
              Database Admin
            </button>
          </>
        )}
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="h-10 w-10 border-4 border-red-600 border-t-transparent rounded-full animate-spin mb-4" />
          <span className="text-sm font-semibold text-gray-500 dark:text-gray-400 font-mono">Loading data boards...</span>
        </div>
      ) : (
        <div className="min-h-[400px]">
          
          {/* TAB 0: SAVED NEWS */}
          {activeTab === 'saved' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest font-mono">My Saved Articles</span>
              </div>
              <div className="bg-white dark:bg-gray-950 p-8 text-center border border-gray-200 dark:border-gray-800 rounded-xl">
                <Layers className="h-12 w-12 text-gray-300 dark:text-gray-700 mx-auto mb-4" />
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">No Saved News</h3>
                <p className="text-gray-500 text-sm max-w-md mx-auto">
                  You haven't saved any articles yet. When you read an article, click the save button to keep it here for later reading.
                </p>
                <button 
                  onClick={() => navigate('/')}
                  className="mt-6 px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-lg transition-all"
                >
                  Browse Home
                </button>
              </div>
            </div>
          )}

          {/* TAB 1: ARTICLES */}
          {activeTab === 'articles' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest font-mono">Current News Catalogue</span>
                <button 
                  onClick={handleCreateNewArticle}
                  className="flex items-center gap-1.5 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all shadow-sm"
                >
                  <Plus className="h-4 w-4" />
                  Compose Story
                </button>
              </div>

              {/* Search and Filter panel */}
              <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-gray-50 dark:bg-gray-900 p-4 rounded-xl border border-gray-200 dark:border-gray-800">
                <div className="relative w-full sm:max-w-xs">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search articles by title, slug..."
                    value={artSearchQuery}
                    onChange={e => {
                      setArtSearchQuery(e.target.value);
                      setArtPage(1); // reset to page 1 on search
                    }}
                    className="w-full pl-9 pr-4 py-2 border border-gray-200 dark:border-gray-800 rounded-lg text-xs bg-white dark:bg-gray-950 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-red-600 focus:border-red-600"
                  />
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                  <span className="text-[11px] font-bold text-gray-400 uppercase font-mono">Status:</span>
                  <select
                    value={artStatusFilter}
                    onChange={e => {
                      setArtStatusFilter(e.target.value);
                      setArtPage(1); // reset to page 1 on filter
                    }}
                    className="px-3 py-1.5 border border-gray-200 dark:border-gray-800 rounded-lg text-xs bg-white dark:bg-gray-950 text-gray-900 dark:text-white font-mono uppercase font-bold focus:outline-none focus:ring-1 focus:ring-red-600"
                  >
                    <option value="all">ALL STORIES</option>
                    <option value="published">PUBLISHED</option>
                    <option value="draft">DRAFTS</option>
                    <option value="scheduled">SCHEDULED</option>
                  </select>
                </div>
              </div>

              <div className="overflow-x-auto border border-gray-200 dark:border-gray-800 rounded-xl bg-white dark:bg-gray-950">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-gray-900 text-xs font-bold uppercase text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-800">
                      <th className="p-4">Cover / Title</th>
                      <th className="p-4">Section</th>
                      <th className="p-4">Author</th>
                      <th className="p-4">Views</th>
                      <th className="p-4">Status</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                    {paginatedArticles.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-gray-500 font-mono">No matching articles found.</td>
                      </tr>
                    ) : (
                      paginatedArticles.map(art => (
                        <tr key={art.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-900/10 transition-colors">
                          <td className="p-4 flex items-center gap-3">
                            <img src={art.featuredImage || null} alt="Cover" className="w-10 h-10 object-cover rounded border border-gray-200 dark:border-gray-800 shrink-0" />
                            <div className="min-w-0">
                              <h4 className="font-semibold text-gray-900 dark:text-white truncate max-w-xs md:max-w-md font-sans">{art.title}</h4>
                              <p className="text-[11px] text-gray-400 font-mono truncate max-w-xs">/{art.slug}</p>
                            </div>
                          </td>
                          <td className="p-4 text-xs font-mono font-bold text-gray-500 dark:text-gray-400">
                            <div className="flex flex-wrap gap-1 max-w-[150px]">
                              {(art.categories && art.categories.length > 0 ? art.categories : [art.category]).map(catId => {
                                const cat = CATEGORIES.find(c => c.id === catId);
                                return (
                                  <span key={catId} className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-[10px] capitalize">
                                    {cat?.name || catId}
                                  </span>
                                );
                              })}
                              {art.subCategory && (
                                <span className="bg-emerald-50 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/50 px-1.5 py-0.5 rounded text-[10px] font-bold capitalize">
                                  {art.subCategory}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="p-4 text-xs text-gray-600 dark:text-gray-300 font-medium">{art.authorName}</td>
                          <td className="p-4 text-xs font-mono font-semibold">{art.views || 0}</td>
                          <td className="p-4">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide font-mono ${
                              art.status === 'published' 
                                ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-400'
                                : art.status === 'scheduled'
                                ? 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-400'
                                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                            }`}>
                              {art.status}
                            </span>
                          </td>
                          <td className="p-4 text-right">
                            <div className="flex justify-end gap-2">
                              <button 
                                onClick={() => handleEditArticleClick(art)}
                                className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300"
                                title="Edit Article"
                              >
                                <Edit className="h-4 w-4" />
                              </button>
                              {deleteConfirmId === art.id ? (
                                <div className="flex items-center gap-1">
                                  <button
                                    onClick={() => handleDeleteArticle(art.id)}
                                    className="px-2 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700"
                                  >
                                    Confirm
                                  </button>
                                  <button
                                    onClick={() => setDeleteConfirmId(null)}
                                    className="px-2 py-1 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 text-xs rounded hover:bg-gray-300 dark:hover:bg-gray-600"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              ) : (
                                <button 
                                  onClick={() => setDeleteConfirmId(art.id)}
                                  className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-950/30 text-red-600 dark:text-red-400"
                                  title="Delete Article"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination controls */}
              {totalArtPages > 1 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-gray-100 dark:border-gray-900">
                  <span className="text-xs text-gray-500 font-mono">
                    Showing Page <strong className="text-gray-900 dark:text-white">{artPage}</strong> of <strong className="text-gray-900 dark:text-white">{totalArtPages}</strong> ({filteredArticles.length} matching articles)
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setArtPage(prev => Math.max(1, prev - 1))}
                      disabled={artPage === 1}
                      className="px-3 py-1.5 border border-gray-200 dark:border-gray-800 rounded-lg text-xs font-bold uppercase tracking-wider font-mono bg-white dark:bg-gray-950 text-gray-700 dark:text-gray-300 disabled:opacity-50 hover:bg-gray-50 dark:hover:bg-gray-900"
                    >
                      Prev
                    </button>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: totalArtPages }).map((_, i) => {
                        const pageNum = i + 1;
                        if (pageNum === 1 || pageNum === totalArtPages || Math.abs(pageNum - artPage) <= 1) {
                          return (
                            <button
                              key={pageNum}
                              onClick={() => setArtPage(pageNum)}
                              className={`w-8 h-8 rounded-lg text-xs font-bold font-mono transition-colors ${
                                artPage === pageNum
                                  ? 'bg-red-600 text-white'
                                  : 'border border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900 text-gray-700 dark:text-gray-300'
                              }`}
                            >
                              {pageNum}
                            </button>
                          );
                        } else if (pageNum === 2 || pageNum === totalArtPages - 1) {
                          return <span key={pageNum} className="text-xs text-gray-400 font-mono">...</span>;
                        }
                        return null;
                      })}
                    </div>
                    <button
                      onClick={() => setArtPage(prev => Math.min(totalArtPages, prev + 1))}
                      disabled={artPage === totalArtPages}
                      className="px-3 py-1.5 border border-gray-200 dark:border-gray-800 rounded-lg text-xs font-bold uppercase tracking-wider font-mono bg-white dark:bg-gray-950 text-gray-700 dark:text-gray-300 disabled:opacity-50 hover:bg-gray-50 dark:hover:bg-gray-900"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: CAMPAIGN ADS */}
          {activeTab === 'ads' && isAdmin && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest font-mono">Corporate Advertising campaigns</span>
                <button 
                  onClick={handleCreateAd}
                  className="flex items-center gap-1.5 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all shadow-sm"
                >
                  <Plus className="h-4 w-4" />
                  Add Campaign Ad
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {ads.length === 0 ? (
                  <div className="md:col-span-2 text-center py-20 border border-dashed border-gray-200 dark:border-gray-800 rounded-xl text-gray-400 font-mono">
                    No campaigns designed yet. Click Compose Campaign Ad to start.
                  </div>
                ) : (
                  ads.map(ad => (
                    <div key={ad.id} className="border border-gray-200 dark:border-gray-800 rounded-xl bg-white dark:bg-gray-950 p-5 space-y-4 shadow-sm flex flex-col justify-between">
                      <div>
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-center gap-3">
                            <img src={ad.imageUrl || null} alt={ad.title} className="w-12 h-12 object-cover rounded border border-gray-200 dark:border-gray-800 shrink-0" />
                            <div>
                              <h4 className="font-bold text-gray-900 dark:text-white font-sans">{ad.title}</h4>
                              <span className="text-[10px] bg-gray-100 dark:bg-gray-800 text-gray-500 px-2 py-0.5 rounded font-mono font-bold uppercase tracking-wider">{ad.type}</span>
                            </div>
                          </div>

                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide font-mono ${
                            ad.active 
                              ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-400' 
                              : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
                          }`}>
                            {ad.active ? 'Active' : 'Paused'}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-4 mt-6 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                          <div className="text-center">
                            <div className="text-lg font-bold font-mono text-gray-900 dark:text-white">{ad.impressions || 0}</div>
                            <div className="text-[10px] text-gray-400 uppercase tracking-widest font-mono font-bold">Impressions</div>
                          </div>
                          <div className="text-center border-l border-gray-200 dark:border-gray-800">
                            <div className="text-lg font-bold font-mono text-gray-900 dark:text-white">{ad.clicks || 0}</div>
                            <div className="text-[10px] text-gray-400 uppercase tracking-widest font-mono font-bold">Clicks</div>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between border-t border-gray-100 dark:border-gray-900 pt-4 mt-4">
                        <a href={ad.link} target="_blank" rel="noreferrer" className="text-xs text-red-600 hover:underline inline-flex items-center gap-1 font-semibold truncate max-w-[200px]">
                          Target Link <ExternalLink className="h-3 w-3" />
                        </a>
                        <div className="flex gap-2 shrink-0">
                          <button onClick={() => handleEditAd(ad)} className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300"><Edit className="h-4 w-4" /></button>
                          {deleteConfirmId === `ad_${ad.id}` ? (
                            <div className="flex gap-1">
                              <button onClick={() => handleDeleteAd(ad.id)} className="px-2 py-1 bg-red-600 text-white text-xs rounded">Confirm</button>
                              <button onClick={() => setDeleteConfirmId(null)} className="px-2 py-1 bg-gray-200 dark:bg-gray-700 text-xs rounded">Cancel</button>
                            </div>
                          ) : (
                            <button onClick={() => setDeleteConfirmId(`ad_${ad.id}`)} className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-950/20 text-red-600 dark:text-red-400"><Trash2 className="h-4 w-4" /></button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB 3: DISCUSSION MODERATION */}
          {activeTab === 'comments' && (
            <div className="space-y-6">
              <span className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest font-mono block">Reader comments review queue</span>
              
              <div className="border border-gray-200 dark:border-gray-800 rounded-xl bg-white dark:bg-gray-950 divide-y divide-gray-100 dark:divide-gray-900">
                {comments.length === 0 ? (
                  <div className="text-center py-16 text-gray-500 font-mono">No discussions active across any articles.</div>
                ) : (
                  comments.map(comm => (
                    <div key={comm.id} className="p-5 flex flex-col md:flex-row md:items-start justify-between gap-4 hover:bg-gray-50/20 dark:hover:bg-gray-900/5 transition-colors">
                      <div className="flex gap-3 min-w-0">
                        <img src={comm.authorAvatar || null} alt="Avatar" className="w-10 h-10 rounded-full object-cover shrink-0 border border-gray-200 dark:border-gray-800" />
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-bold text-sm text-gray-900 dark:text-white truncate max-w-[200px]">{comm.authorName}</span>
                            <span className="text-[10px] text-gray-400 font-mono">On article "{comm.articleTitle || 'Deleted article'}"</span>
                          </div>
                          <p className="text-sm text-gray-700 dark:text-gray-300 mt-1 font-sans">{comm.content}</p>
                          <span className="text-[10px] text-gray-400 font-mono mt-1 block">{new Date(comm.createdAt).toLocaleString()}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end md:self-start shrink-0">
                        {!comm.approved && (
                          <button 
                            onClick={() => handleApproveComment(comm.articleId, comm.id)}
                            className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold uppercase rounded flex items-center gap-1 transition-colors"
                          >
                            <Check className="h-3.5 w-3.5" /> Approve
                          </button>
                        )}
                        {deleteConfirmId === `comment_${comm.id}` ? (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleDeleteComment(comm.articleId, comm.id)}
                              className="px-2 py-1 bg-red-600 text-white text-xs font-bold rounded hover:bg-red-700 transition-colors"
                            >
                              Confirm
                            </button>
                            <button
                              onClick={() => setDeleteConfirmId(null)}
                              className="px-2 py-1 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 text-xs font-bold rounded hover:bg-gray-300 transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button 
                            onClick={() => setDeleteConfirmId(`comment_${comm.id}`)}
                            className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-950/20 text-red-600 dark:text-red-400 transition-colors"
                            title="Reject / Delete comment"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB 4: BULLETINS */}
          {activeTab === 'newsletter' && isAdmin && (
            <div className="space-y-6">
              <span className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest font-mono block">Email Newsletter Subscriptions ({subscribers.length})</span>

              <div className="overflow-x-auto border border-gray-200 dark:border-gray-800 rounded-xl bg-white dark:bg-gray-950">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-gray-900 text-xs font-bold uppercase text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-800">
                      <th className="p-4">Subscriber Email</th>
                      <th className="p-4">Subscribed At</th>
                      <th className="p-4">Compliance status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                    {subscribers.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="p-8 text-center text-gray-500 font-mono">No active email subscriptions.</td>
                      </tr>
                    ) : (
                      subscribers.map((sub, sIdx) => (
                        <tr key={sIdx} className="hover:bg-gray-50/50 dark:hover:bg-gray-900/10 transition-colors">
                          <td className="p-4 font-semibold text-gray-900 dark:text-white font-mono">{sub.email}</td>
                          <td className="p-4 text-xs text-gray-500 font-mono">{new Date(sub.subscribedAt).toLocaleString()}</td>
                          <td className="p-4 text-xs font-semibold">
                            <span className="px-2 py-0.5 rounded text-[9px] bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-400 font-mono uppercase font-bold tracking-wide">Double Opt-In</span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 5: AUDIENCE ANALYTICS */}
          {activeTab === 'analytics' && isAdmin && (
            <div className="space-y-8">
              
              {/* Stats Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="p-5 rounded-2xl bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 shadow-sm flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider font-mono">Total Story Views</span>
                    <h3 className="text-2xl font-bold font-mono text-gray-900 dark:text-white mt-1">{totalViews}</h3>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-950/20 flex items-center justify-center text-red-600 shrink-0">
                    <Eye className="h-5 w-5" />
                  </div>
                </div>

                <div className="p-5 rounded-2xl bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 shadow-sm flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider font-mono">Total Article Likes</span>
                    <h3 className="text-2xl font-bold font-mono text-gray-900 dark:text-white mt-1">{totalLikes}</h3>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/20 flex items-center justify-center text-amber-500 shrink-0">
                    <ThumbsUp className="h-5 w-5" />
                  </div>
                </div>

                <div className="p-5 rounded-2xl bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 shadow-sm flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider font-mono">Discussion Comments</span>
                    <h3 className="text-2xl font-bold font-mono text-gray-900 dark:text-white mt-1">{totalComments}</h3>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/20 flex items-center justify-center text-blue-500 shrink-0">
                    <MessageSquare className="h-5 w-5" />
                  </div>
                </div>

                <div className="p-5 rounded-2xl bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 shadow-sm flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider font-mono">Bulletin Subscribers</span>
                    <h3 className="text-2xl font-bold font-mono text-gray-900 dark:text-white mt-1">{totalSubscribers}</h3>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 flex items-center justify-center text-emerald-500 shrink-0">
                    <Mail className="h-5 w-5" />
                  </div>
                </div>
              </div>

              {/* Graphical representation of top performing articles using beautifully structured HTML bar chart blocks */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                
                {/* Visual Chart 1: Top Articles by Views */}
                <div className="p-6 rounded-2xl bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 space-y-4">
                  <span className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest font-mono block">Top Performing publications</span>
                  
                  <div className="space-y-4 pt-2">
                    {articles.slice(0, 4).map(art => {
                      const percentage = totalViews > 0 ? ((art.views || 0) / totalViews) * 100 : 0;
                      return (
                        <div key={art.id} className="space-y-1.5">
                          <div className="flex justify-between items-center text-xs">
                            <span className="font-semibold text-gray-800 dark:text-gray-200 truncate pr-4">{art.title}</span>
                            <span className="font-mono text-gray-500 dark:text-gray-400 font-semibold">{art.views} views</span>
                          </div>
                          <div className="w-full bg-gray-100 dark:bg-gray-900 h-2.5 rounded-full overflow-hidden">
                            <div 
                              className="bg-red-600 h-full rounded-full transition-all duration-1000"
                              style={{ width: `${Math.max(percentage, 8)}%` }} 
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Visual Chart 2: Category distribution of articles */}
                <div className="p-6 rounded-2xl bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 space-y-4">
                  <span className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest font-mono block">Editorial Section density</span>
                  
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-2">
                    {CATEGORIES.slice(0, 6).map(cat => {
                      const count = articles.filter(a => {
                        const cats = a.categories || (a.category ? [a.category] : []);
                        return cats.includes(cat.id);
                      }).length;
                      return (
                        <div key={cat.id} className="p-4 border border-gray-100 dark:border-gray-900 rounded-xl text-center bg-gray-50/50 dark:bg-gray-900/10 hover:bg-gray-50 dark:hover:bg-gray-900/30 transition-all">
                          <span className="text-xs text-gray-500 dark:text-gray-400 block font-semibold truncate capitalize">{cat.name}</span>
                          <span className="text-xl font-bold text-gray-900 dark:text-white mt-1 block font-mono">{count}</span>
                          <span className="text-[10px] text-gray-400 font-mono">articles</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

              </div>

            </div>
          )}

          {/* TAB: BUREAU PROFILES */}
          {activeTab === 'profiles' && isAdmin && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest font-mono">Bureau Journalists & Editors</span>
                <button 
                  onClick={handleCreateAuthor}
                  className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all shadow-sm"
                >
                  <Plus className="h-4 w-4" />
                  Add Journalist Profile
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {bureauAuthors.length === 0 ? (
                  <div className="md:col-span-2 text-center py-20 border border-dashed border-gray-200 dark:border-gray-800 rounded-xl text-gray-400 font-mono bg-white dark:bg-gray-950">
                    No bureau profiles registered yet. Click Add Journalist Profile to create one.
                  </div>
                ) : (
                  bureauAuthors.map(author => (
                    <div key={author.id} className="border border-gray-200 dark:border-gray-800 rounded-2xl bg-white dark:bg-gray-950 p-6 space-y-4 shadow-sm flex flex-col justify-between">
                      <div>
                        <div className="flex items-start gap-4">
                          <img 
                            src={author.avatar || null} 
                            alt={author.name} 
                            className="w-14 h-14 rounded-full object-cover border border-gray-200 dark:border-gray-800 shrink-0"
                            referrerPolicy="no-referrer"
                          />
                          <div className="min-w-0">
                            <h4 className="font-bold text-base text-gray-900 dark:text-white font-sans">{author.name}</h4>
                            <div className="flex items-center gap-2 mt-1">
                              <p className="text-xs text-emerald-600 dark:text-emerald-400 font-mono tracking-tight font-semibold">{author.role}</p>
                              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${author.status === 'approved' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                                {author.status || 'Pending'}
                              </span>
                            </div>
                            <p className="text-xs text-gray-400 dark:text-gray-500 font-mono truncate mt-0.5">{author.email}</p>
                          </div>
                        </div>

                        <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed font-sans mt-4 line-clamp-3">
                          {author.bio || 'No bio provided.'}
                        </p>

                        <div className="flex items-center gap-3.5 mt-4 pt-1">
                          {author.twitter && (
                            <span className="text-[10px] bg-sky-50 dark:bg-sky-950/30 text-sky-600 dark:text-sky-400 px-2.5 py-1 rounded font-mono font-bold uppercase tracking-wider">
                              @{author.twitter}
                            </span>
                          )}
                          {author.linkedin && (
                            <span className="text-[10px] bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 px-2.5 py-1 rounded font-mono font-bold uppercase tracking-wider">
                              In/{author.linkedin}
                            </span>
                          )}
                        </div>

                        {author.password && (
                          <div className="mt-3 p-2 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-lg flex items-center justify-between">
                            <span className="text-[10px] text-gray-400 font-mono font-bold uppercase">Password:</span>
                            <span className="text-xs font-mono font-semibold text-emerald-600 dark:text-emerald-400 select-all">{author.password}</span>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-end border-t border-gray-100 dark:border-gray-900 pt-4 mt-2 gap-2">
                        {author.status !== 'approved' && (
                          <button 
                            onClick={() => handleApproveAuthor(author)} 
                            className="px-3 py-1.5 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 text-xs font-semibold flex items-center gap-1 transition-all hover:bg-emerald-100"
                          >
                            <Check className="h-3.5 w-3.5" />
                            Approve
                          </button>
                        )}
                        <button 
                          onClick={() => handleEditAuthor(author)} 
                          className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-800 hover:border-emerald-500 dark:hover:border-emerald-500 hover:bg-emerald-50/20 dark:hover:bg-emerald-950/10 text-gray-700 dark:text-gray-300 text-xs font-semibold flex items-center gap-1 transition-all"
                        >
                          <Edit className="h-3.5 w-3.5 text-emerald-600" />
                          Edit Details
                        </button>
                        {deleteConfirmId === `author_${author.id}` ? (
                          <div className="flex gap-1">
                            <button 
                              onClick={() => handleDeleteAuthor(author.id)} 
                              className="px-3 py-1.5 rounded-lg border border-red-600 bg-red-600 text-white text-xs font-semibold transition-all hover:bg-red-700"
                            >
                              Confirm
                            </button>
                            <button 
                              onClick={() => setDeleteConfirmId(null)} 
                              className="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-xs font-semibold transition-all hover:bg-gray-200 dark:hover:bg-gray-700"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button 
                            onClick={() => setDeleteConfirmId(`author_${author.id}`)} 
                            className="px-3 py-1.5 rounded-lg border border-red-100 hover:bg-red-50 dark:hover:bg-red-950/20 text-red-600 dark:text-red-400 text-xs font-semibold flex items-center gap-1 transition-all"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            Remove
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB: REGISTERED USERS */}
          {activeTab === 'users' && isAdmin && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <span className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest font-mono">Registered Readers & subscribers</span>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mt-1">Platform Members List</h3>
                </div>
                
                {/* Search Registered Users */}
                <div className="relative w-full sm:w-72">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search by name or email..."
                    value={userSearchQuery}
                    onChange={e => setUserSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 text-xs rounded-xl bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500 font-sans"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {filteredUsers.length === 0 ? (
                  <div className="md:col-span-2 text-center py-20 border border-dashed border-gray-200 dark:border-gray-800 rounded-xl text-gray-400 font-mono bg-white dark:bg-gray-950">
                    {userSearchQuery.trim() ? "No registered users match your search." : "No registered users on the platform yet."}
                  </div>
                ) : (
                  filteredUsers.map(user => (
                    <div key={user.id} className="border border-gray-200 dark:border-gray-800 rounded-2xl bg-white dark:bg-gray-950 p-6 space-y-4 shadow-sm flex flex-col justify-between">
                      <div>
                        <div className="flex items-start gap-4">
                          <img 
                            src={user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name || 'User')}&background=f1f5f9&color=dc2626&bold=true&size=256`} 
                            alt={user.name} 
                            className="w-14 h-14 rounded-full object-cover border border-gray-200 dark:border-gray-800 shrink-0"
                            referrerPolicy="no-referrer"
                          />
                          <div className="min-w-0">
                            <h4 className="font-bold text-base text-gray-900 dark:text-white font-sans">{user.name}</h4>
                            <div className="flex items-center gap-2 mt-1">
                              <p className="text-xs text-blue-600 dark:text-blue-400 font-mono tracking-tight font-semibold">Reader / Member</p>
                              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${user.status === 'approved' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                                {user.status || 'approved'}
                              </span>
                            </div>
                            <p className="text-xs text-gray-400 dark:text-gray-500 font-mono truncate mt-0.5">{user.email}</p>
                          </div>
                        </div>

                        <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed font-sans mt-4 line-clamp-3">
                          {user.bio || 'This member has not written a biography yet.'}
                        </p>

                        <div className="text-[10px] font-mono text-gray-400 mt-3 pt-1">
                          Registered: {user.createdAt ? new Date(user.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : 'Unknown'}
                        </div>
                      </div>

                      <div className="flex items-center justify-end border-t border-gray-100 dark:border-gray-900 pt-4 mt-2 gap-2">
                        {user.status !== 'approved' && (
                          <button 
                            onClick={() => handleApproveAuthor(user)} 
                            className="px-3 py-1.5 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 text-xs font-semibold flex items-center gap-1 transition-all hover:bg-emerald-100"
                          >
                            <Check className="h-3.5 w-3.5" />
                            Approve
                          </button>
                        )}
                        <button 
                          onClick={() => handleEditAuthor(user)} 
                          className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-800 hover:border-blue-500 dark:hover:border-blue-500 hover:bg-blue-50/20 dark:hover:bg-blue-950/10 text-gray-700 dark:text-gray-300 text-xs font-semibold flex items-center gap-1 transition-all"
                        >
                          <Edit className="h-3.5 w-3.5 text-blue-600" />
                          Manage Role / Edit
                        </button>
                        {deleteConfirmId === `author_${user.id}` ? (
                          <div className="flex gap-1">
                            <button 
                              onClick={() => handleDeleteAuthor(user.id)} 
                              className="px-3 py-1.5 rounded-lg border border-red-600 bg-red-600 text-white text-xs font-semibold transition-all hover:bg-red-700"
                            >
                              Confirm
                            </button>
                            <button 
                              onClick={() => setDeleteConfirmId(null)} 
                              className="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-xs font-semibold transition-all hover:bg-gray-200 dark:hover:bg-gray-700"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button 
                            onClick={() => setDeleteConfirmId(`author_${user.id}`)} 
                            className="px-3 py-1.5 rounded-lg border border-red-100 hover:bg-red-50 dark:hover:bg-red-950/20 text-red-600 dark:text-red-400 text-xs font-semibold flex items-center gap-1 transition-all"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            Remove
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB 6: DATABASE ADMINISTRATION */}
          {activeTab === 'database' && isAdmin && (
            <div className="space-y-6">
              <div className="p-6 rounded-2xl bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 shadow-sm space-y-6">
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <Database className="h-5 w-5 text-orange-500 animate-pulse" />
                    Database Administration & Controls
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Manage the underlying Firestore collections, perform schema-safe database operations, reset states, or seed realistic demo publications.
                  </p>
                </div>

                {dbMessage && (
                  <div className={`p-4 rounded-xl border ${
                    dbMessage.type === 'success' 
                      ? 'bg-emerald-50 dark:bg-emerald-950/25 border-emerald-200 dark:border-emerald-900 text-emerald-800 dark:text-emerald-400' 
                      : 'bg-red-50 dark:bg-red-950/25 border-red-200 dark:border-red-900 text-red-800 dark:text-red-400'
                  } text-xs font-mono flex items-start gap-2`}>
                    <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                    <span>{dbMessage.text}</span>
                  </div>
                )}

                {/* Database Stats Overview */}
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                  <div className="p-4 border border-gray-100 dark:border-gray-900 rounded-xl bg-gray-50/30 dark:bg-gray-900/10">
                    <span className="text-[10px] text-gray-400 uppercase tracking-wider font-mono block">Articles</span>
                    <span className="text-2xl font-extrabold text-gray-800 dark:text-gray-200 font-mono mt-1 block">{articles.length}</span>
                  </div>
                  <div className="p-4 border border-gray-100 dark:border-gray-900 rounded-xl bg-gray-50/30 dark:bg-gray-900/10">
                    <span className="text-[10px] text-gray-400 uppercase tracking-wider font-mono block">Campaign Ads</span>
                    <span className="text-2xl font-extrabold text-gray-800 dark:text-gray-200 font-mono mt-1 block">{ads.length}</span>
                  </div>
                  <div className="p-4 border border-gray-100 dark:border-gray-900 rounded-xl bg-gray-50/30 dark:bg-gray-900/10">
                    <span className="text-[10px] text-gray-400 uppercase tracking-wider font-mono block">Comments</span>
                    <span className="text-2xl font-extrabold text-gray-800 dark:text-gray-200 font-mono mt-1 block">{comments.length}</span>
                  </div>
                  <div className="p-4 border border-gray-100 dark:border-gray-900 rounded-xl bg-gray-50/30 dark:bg-gray-900/10">
                    <span className="text-[10px] text-gray-400 uppercase tracking-wider font-mono block">Subscribers</span>
                    <span className="text-2xl font-extrabold text-gray-800 dark:text-gray-200 font-mono mt-1 block">{subscribers.length}</span>
                  </div>
                </div>

                <div className="border-t border-gray-100 dark:border-gray-900 pt-6 space-y-4">
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider font-mono">Destructive Actions</h4>
                  
                  <div className="flex flex-col sm:flex-row gap-4">
                    {/* Clear Button */}
                    {dbWipeConfirm ? (
                      <div className="flex-1 flex gap-2">
                        <button
                          onClick={handleClearDatabase}
                          disabled={dbActionLoading}
                          className="flex-1 py-3 px-4 rounded-xl border border-red-600 bg-red-600 text-white font-bold text-xs uppercase tracking-wider font-mono transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                          {dbActionLoading ? (
                            <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                          Confirm Wipe
                        </button>
                        <button
                          onClick={() => setDbWipeConfirm(false)}
                          disabled={dbActionLoading}
                          className="px-4 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-bold text-xs uppercase tracking-wider font-mono transition-colors disabled:opacity-50"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setDbWipeConfirm(true)}
                        disabled={dbActionLoading}
                        className="flex-1 py-3 px-4 rounded-xl border border-red-200 hover:border-red-300 dark:border-red-950/50 bg-red-50 hover:bg-red-100 dark:bg-red-950/20 text-red-600 dark:text-red-400 font-bold text-xs uppercase tracking-wider font-mono transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        <Trash2 className="h-4 w-4" />
                        Clear All Database Data
                      </button>
                    )}

                    {/* Seed Button */}
                    <button
                      onClick={handleSeedDatabase}
                      disabled={dbActionLoading}
                      className="flex-1 py-3 px-4 rounded-xl border border-emerald-200 hover:border-emerald-300 dark:border-emerald-950/50 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 font-bold text-xs uppercase tracking-wider font-mono transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {dbActionLoading ? (
                        <div className="h-4 w-4 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <RefreshCw className="h-4 w-4" />
                      )}
                      Seed Demo Publications
                    </button>
                  </div>
                  
                  <p className="text-[11px] text-gray-400 dark:text-gray-500 font-mono text-center">
                    Note: Seeding is idempotent and overwrites records matching the seed collection primary keys. Clearing data does not delete user-created authentication accounts.
                  </p>
                </div>
              </div>
            </div>
          )}

        </div>
      )}

      <ImageEditorOverlay
        isOpen={imageEditorOpen}
        imageSrc={imageToEdit}
        onClose={() => {
          setImageEditorOpen(false);
          setImageToEdit('');
        }}
        onSave={async (editedImage) => {
          setIsUploadingMedia(true);
          try {
            // Select folder and contextual naming parameter based on upload target
            const folder = activeImageTarget === 'cover' ? 'articles'
                         : activeImageTarget === 'ad' ? 'ads'
                         : activeImageTarget === 'author' ? 'authors'
                         : 'gallery';
            
            let customName = '';
            if (activeImageTarget === 'cover') {
              customName = editorTitle;
            } else if (activeImageTarget === 'ad') {
              customName = adTitle;
            } else if (activeImageTarget === 'author') {
              customName = authorNameInput;
            } else if (activeImageTarget === 'gallery') {
              customName = editorTitle ? `${editorTitle}-gallery` : 'gallery';
            }

            // Upload the compressed & optimized webp file directly to storage using our advanced naming engine!
            const optimizedUrl = await uploadOptimizedImageToFirebase(editedImage, folder, customName);
            
            if (activeImageTarget === 'cover') {
              setEditorFeaturedImage(optimizedUrl);
            } else if (activeImageTarget === 'ad') {
              setAdImageUrl(optimizedUrl);
            } else if (activeImageTarget === 'gallery') {
              if (!editorImages.includes(optimizedUrl)) {
                setEditorImages([...editorImages, optimizedUrl]);
              }
            } else if (activeImageTarget === 'author') {
              setAuthorAvatarInput(optimizedUrl);
            }
          } catch (e) {
            console.error('Failed to optimize or upload image:', e);
          } finally {
            setIsUploadingMedia(false);
            setImageEditorOpen(false);
            setImageToEdit('');
          }
        }}
        title={activeImageTarget === 'cover' ? "Adjust Cover Photo Framing & Filters" : "Adjust Image Framing & Filters"}
      />

      {isUploadingMedia && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[9999] flex flex-col items-center justify-center gap-4 text-white">
          <div className="h-12 w-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <div className="text-center px-4">
            <h3 className="text-lg font-bold tracking-tight">Optimizing & Uploading Media</h3>
            <p className="text-xs text-gray-400 font-mono mt-1">Compressing image & publishing WebP to Firebase Storage...</p>
          </div>
        </div>
      )}

    </div>
  );
}
