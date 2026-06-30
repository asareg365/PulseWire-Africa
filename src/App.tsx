import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  getAllArticles, 
  getArticlesByCategory, 
  getArticleBySlug, 
  incrementArticleViews, 
  incrementArticleLikes,
  seedDatabaseIfEmpty, 
  clearAllDatabaseData,
  getActiveAds,
  subscribeNewsletter,
  saveAuthor,
  getAuthorById
} from './lib/db';
import { auth } from './lib/firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth';
import { Article, CATEGORIES, Author } from './types';
import Header from './components/Header';
import Logo from './components/Logo';
import NewsImage, { ImageGallery } from './components/NewsImage';
import BreakingTicker from './components/BreakingTicker';
import Footer from './components/Footer';
import AdSenseBanner from './components/AdSenseBanner';
import ArticleComments from './components/ArticleComments';
import AdminDashboard from './components/AdminDashboard';
import ContributorDashboard from './components/ContributorDashboard';
import ReaderDashboard from './components/ReaderDashboard';
import InfoPages from './components/InfoPages';
import AuthorBioCard from './components/AuthorBioCard';
import { 
  BookOpen, 
  Calendar, 
  Clock, 
  Share2, 
  Heart, 
  TrendingUp, 
  Facebook, 
  Twitter, 
  Linkedin, 
  Sparkles, 
  Volume2, 
  ChevronRight, 
  ChevronLeft,
  Award,
  AlertCircle,
  Copy,
  Check,
  Bookmark,
  BookmarkCheck,
  User as UserIcon,
  Headphones,
  Play,
  Pause,
  Square,
  SkipBack,
  SkipForward,
  Mail,
  X
} from 'lucide-react';

export function getAuthorAvatar(authorName: string): string {
  const name = (authorName || '').toLowerCase();
  if (name.includes('george') || name.includes('asare') || name.includes('chief') || name.includes('editor')) {
    return "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=256&h=256&q=80";
  }
  if (name.includes('christian') || name.includes('tuah')) {
    return "https://images.unsplash.com/photo-1531384441138-2736e62e0919?auto=format&fit=crop&w=256&h=256&q=80";
  }
  return "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&h=256&q=80";
}

export default function App() {
  // Navigation & Routing state
  const [currentPath, setCurrentPath] = useState('/');
  const [searchQuery, setSearchQuery] = useState('');
  const [infoTab, setInfoTab] = useState<'about' | 'contact' | 'privacy' | 'terms' | 'editorial' | 'fact-check' | 'cookie'>('about');
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem('theme') === 'dark' || 
      (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
  });

  // Admin simulation state
  const [isAdmin, setIsAdmin] = useState(false);

  // Standalone Auth state
  const [isSignUp, setIsSignUp] = useState(false);
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authName, setAuthName] = useState('');
  const [authRole, setAuthRole] = useState<'reader' | 'contributor' | 'editor'>('reader');
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [showForgotPasswordPrompt, setShowForgotPasswordPrompt] = useState(false);
  const [showSessionExpiredModal, setShowSessionExpiredModal] = useState(false);

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setAuthLoading(true);
    
    const emailToUse = authEmail.trim();
    const passwordToUse = authPassword;

    try {
      if (isSignUp) {
        const userCredential = await createUserWithEmailAndPassword(auth, emailToUse, passwordToUse);
        await saveAuthor({
          id: userCredential.user.uid,
          name: authName,
          email: emailToUse,
          role: authRole,
          status: authRole === 'reader' ? 'approved' : 'pending',
          bio: '',
          avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&h=256&q=80',
          createdAt: new Date().toISOString(),
        });
        navigate('/');
      } else {
        try {
          await signInWithEmailAndPassword(auth, emailToUse, passwordToUse);
        } catch (signInErr: any) {
          if (
            emailToUse === 'asareg365@gmail.com' && 
            passwordToUse === '0248472474' && 
            (signInErr.code === 'auth/user-not-found' || signInErr.code === 'auth/invalid-credential')
          ) {
            console.log('Admin account does not exist yet. Automatically creating...');
            await createUserWithEmailAndPassword(auth, emailToUse, passwordToUse);
          } else {
            throw signInErr;
          }
        }
        
        if (emailToUse === 'asareg365@gmail.com') {
          setIsAdmin(true);
          navigate('/admin');
        } else {
          navigate('/');
        }
      }
      setAuthEmail('');
      setAuthPassword('');
      setAuthName('');
    } catch (err: any) {
      console.error(err);
      let friendlyMessage = err.message || 'Authentication failed. Please check your credentials.';
      if (err.code === 'auth/weak-password') {
        friendlyMessage = 'Password must be at least 6 characters.';
      } else if (err.code === 'auth/invalid-email') {
        friendlyMessage = 'Please enter a valid email address.';
      } else if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        friendlyMessage = 'Incorrect email or password.';
      } else if (err.code === 'auth/operation-not-allowed') {
        friendlyMessage = 'Email/Password Authentication is not enabled for this Firebase project. To fix this, please visit your Firebase Console (Authentication -> Sign-in method), click "Add new provider", and enable "Email/Password".';
      }
      setAuthError(friendlyMessage);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setAuthError('');
    setAuthLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      if (result.user && (result.user.email === 'asareg365@gmail.com' || result.user.email?.endsWith('@pulsewireafrica.news') || result.user.email === 'admin@pulsewireafrica.news')) {
        setIsAdmin(true);
        navigate('/admin');
      } else {
        setIsAdmin(false);
        navigate('/');
      }
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/operation-not-allowed') {
        setAuthError(
          'Google Sign-In is not enabled on this Firebase project yet. Please enable the "Google" Sign-In provider in your Firebase Console (Authentication > Sign-in method).'
        );
      } else {
        setAuthError(err.message || 'Failed to sign in with Google.');
      }
    } finally {
      setAuthLoading(false);
    }
  };

  // Articles & DB state
  const [articles, setArticles] = useState<Article[]>([]);
  const [popularArticles, setPopularArticles] = useState<Article[]>([]);
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [categoryArticles, setCategoryArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [dbReady, setDbReady] = useState(false);

  // Saved articles state
  const [savedSlugs, setSavedSlugs] = useState<string[]>([]);
  const [currentUserAuthor, setCurrentUserAuthor] = useState<any>(null);
  const [allArticles, setAllArticles] = useState<Article[]>([]);

  useEffect(() => {
    getAllArticles().then(setAllArticles);
  }, []);

  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        let author = await getAuthorById(user.uid);
        if (!author) {
          const isSuperAdmin = ['asareg365@gmail.com', 'pulsewireafrica@gmail.com'].map(e => e.toLowerCase()).includes(user.email?.trim().toLowerCase() || '');
          const newAuthor: Author = {
            id: user.uid,
            name: user.displayName || user.email?.split('@')[0] || 'User',
            email: user.email || '',
            role: isSuperAdmin ? 'admin' : 'reader',
            status: 'approved',
            bio: '',
            avatar: user.photoURL || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&h=256&q=80',
            createdAt: new Date().toISOString(),
          };
          try {
            await saveAuthor(newAuthor);
            author = newAuthor;
          } catch (e) {
            console.error("Error auto-creating author profile:", e);
          }
        }
        if (author) {
          setCurrentUserAuthor(author);
          setSavedSlugs(author.savedSlugs || []);
          
          // Sync isAdmin based on email for header shortcut immediately on load
          const isSuperAdmin = ['asareg365@gmail.com', 'pulsewireafrica@gmail.com'].map(e => e.toLowerCase()).includes(user.email?.trim().toLowerCase() || '');
          setIsAdmin(isSuperAdmin);
        }
      } else {
        setCurrentUserAuthor(null);
        setSavedSlugs([]);
        setIsAdmin(false);
      }
      setAuthChecked(true);
    });
    return unsubscribe;
  }, []);

  const toggleSaveArticle = async (slug: string) => {
    if (!auth.currentUser) {
      navigate('/login');
      return;
    }
    
    let newSavedSlugs = [...savedSlugs];
    if (newSavedSlugs.includes(slug)) {
      newSavedSlugs = newSavedSlugs.filter(s => s !== slug);
    } else {
      newSavedSlugs.push(slug);
    }
    setSavedSlugs(newSavedSlugs);
    
    if (currentUserAuthor) {
      const updatedAuthor = { ...currentUserAuthor, savedSlugs: newSavedSlugs };
      await saveAuthor(updatedAuthor);
      setCurrentUserAuthor(updatedAuthor);
    }
  };

  // Saved articles selector
  const savedArticles = useMemo(() => {
    return articles.filter(art => savedSlugs.includes(art.slug));
  }, [savedSlugs, articles]);

  // AI Summary panel inside article
  const [aiSummary, setAiSummary] = useState('');
  const [aiSummaryLoading, setAiSummaryLoading] = useState(false);
  const [aiSpeechActive, setAiSpeechActive] = useState(false);

  // Full Speech Reader State
  const [fullSpeechActive, setFullSpeechActive] = useState(false);
  const [fullSpeechPaused, setFullSpeechPaused] = useState(false);
  const [fullSpeechParagraphIndex, setFullSpeechParagraphIndex] = useState(0);
  const [fullSpeechRate, setFullSpeechRate] = useState(1.0);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceName, setSelectedVoiceName] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('pulsewire_preferred_voice_name') || '';
    }
    return '';
  });

  // Track the paragraph count for convenience
  const articleParagraphs = useMemo(() => {
    if (!selectedArticle) return [];
    return selectedArticle.content.split('\n\n').filter(p => p.trim());
  }, [selectedArticle]);

  // Load available system voices
  useEffect(() => {
    let active = true;
    const updateVoices = () => {
      if (!active) return;
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        const available = window.speechSynthesis.getVoices();
        if (available && available.length > 0) {
          setVoices(prev => {
            if (prev.length === available.length && prev[0]?.name === available[0]?.name) {
              return prev;
            }
            return available;
          });

          const savedVoice = localStorage.getItem('pulsewire_preferred_voice_name');
          if (savedVoice && available.some(v => v.name === savedVoice)) {
            setSelectedVoiceName(prev => prev === savedVoice ? prev : savedVoice);
          } else {
            setSelectedVoiceName(prev => {
              if (prev) return prev;
              const defaultVoice = available.find(v => v.lang.startsWith('en') && v.localService) || 
                                   available.find(v => v.lang.startsWith('en')) || 
                                   available[0];
              return defaultVoice ? defaultVoice.name : '';
            });
          }
        }
      }
    };

    updateVoices();
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.onvoiceschanged = updateVoices;
    }
    return () => {
      active = false;
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.onvoiceschanged = null;
      }
    };
  }, []);

  // Persist voice selection to localStorage when changed
  useEffect(() => {
    if (selectedVoiceName) {
      localStorage.setItem('pulsewire_preferred_voice_name', selectedVoiceName);
    }
  }, [selectedVoiceName]);

  const isSpeakingRef = useRef(false);

  // Core Playback Logic: Reacts to active state, pause state, rate change, voice change, and paragraph index changes!
  useEffect(() => {
    if (!fullSpeechActive || !selectedArticle || articleParagraphs.length === 0) {
      if (isSpeakingRef.current) {
        window.speechSynthesis.cancel();
        isSpeakingRef.current = false;
      }
      return;
    }

    if (fullSpeechPaused) {
      window.speechSynthesis.pause();
      return;
    }

    // If we were paused but now active, resume!
    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
      return;
    }

    window.speechSynthesis.cancel();
    
    if (fullSpeechParagraphIndex >= articleParagraphs.length) {
      setFullSpeechActive(false);
      setFullSpeechParagraphIndex(0);
      return;
    }

    const textToSpeak = articleParagraphs[fullSpeechParagraphIndex];
    if (!textToSpeak) return;

    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    
    // Apply voice
    if (selectedVoiceName) {
      const selectedVoice = voices.find(v => v.name === selectedVoiceName);
      if (selectedVoice) {
        utterance.voice = selectedVoice;
      }
    }

    // Apply speed rate
    utterance.rate = fullSpeechRate;

    utterance.onstart = () => {
      isSpeakingRef.current = true;
    };

    utterance.onend = () => {
      isSpeakingRef.current = false;
      // Advance to next paragraph after a very brief pause for natural pacing
      setFullSpeechParagraphIndex(prev => prev + 1);
    };

    utterance.onerror = (e) => {
      // Use console.warn instead of console.error to keep test logs clean
      console.warn('Speech synthesis utterance warning (handled):', e);
      isSpeakingRef.current = false;
      // Deactivate playback on error to avoid infinite loop of failing speech blocks
      setFullSpeechActive(false);
    };

    try {
      window.speechSynthesis.speak(utterance);
    } catch (err) {
      console.warn('Speech synthesis speak exception caught:', err);
      setFullSpeechActive(false);
    }

    return () => {
      window.speechSynthesis.cancel();
      isSpeakingRef.current = false;
    };
  }, [fullSpeechActive, fullSpeechPaused, fullSpeechParagraphIndex, selectedVoiceName, fullSpeechRate, articleParagraphs, selectedArticle]);

  // Social share states
  const [copiedLink, setCopiedLink] = useState(false);

  // Newsletter Subscription States
  const [showNewsletterModal, setShowNewsletterModal] = useState(false);
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [newsletterSubmitting, setNewsletterSubmitting] = useState(false);
  const [newsletterSuccess, setNewsletterSuccess] = useState(false);
  const [newsletterError, setNewsletterError] = useState('');

  // Scroll listener for newsletter modal (appears at 50% scroll of article page)
  useEffect(() => {
    const isArticle = currentPath.startsWith('/article/') && selectedArticle;
    const hasShown = localStorage.getItem('pulsewire_newsletter_shown') === 'true';

    if (!isArticle || hasShown) {
      return;
    }

    const handleScroll = () => {
      if (localStorage.getItem('pulsewire_newsletter_shown') === 'true') {
        return;
      }
      
      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      const scrollHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
      if (scrollHeight > 0) {
        const scrollPercent = (scrollTop / scrollHeight) * 100;
        if (scrollPercent >= 50) {
          setShowNewsletterModal(true);
          localStorage.setItem('pulsewire_newsletter_shown', 'true');
        }
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [currentPath, selectedArticle]);

  // Database key status checking
  const [aiConfigured, setAiConfigured] = useState(false);

  // Seed database and load initial configurations
  useEffect(() => {
    async function initDB() {
      try {
        // Seeding has been removed per request
        
        // Check if Gemini API is configured
        try {
          const res = await fetch('/api/ai/status');
          const data = await res.json();
          setAiConfigured(data.configured);
        } catch (err) {
          console.error('Failed to check AI configuration:', err);
        }

        await loadPrimaryContent();
      } catch (err) {
        console.error('Error initializing database:', err);
      } finally {
        setDbReady(true);
        setLoading(false);
      }
    }
    initDB();
  }, []);

  // Theme Syncing
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);

  // Pushstate-based dynamic SPA Router
  useEffect(() => {
    const handleLocationChange = () => {
      const path = window.location.pathname;
      setCurrentPath(path);
      handleRouting(path);
    };

    window.addEventListener('popstate', handleLocationChange);
    // Trigger initial route
    handleLocationChange();

    return () => {
      window.removeEventListener('popstate', handleLocationChange);
    };
  }, []);

  const navigate = (path: string) => {
    window.history.pushState({}, '', path);
    setCurrentPath(path);
    handleRouting(path);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Auto-logout after 30 minutes of inactivity
  useEffect(() => {
    if (!currentUserAuthor) return;

    const INACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30 minutes in ms
    let timeoutId: NodeJS.Timeout;

    const handleLogout = async () => {
      try {
        await signOut(auth);
        setCurrentUserAuthor(null);
        setSavedSlugs([]);
        setIsAdmin(false);
        setShowSessionExpiredModal(true);
        navigate('/login');
      } catch (err) {
        console.error("Error during automatic logout due to inactivity:", err);
      }
    };

    const resetTimer = () => {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(handleLogout, INACTIVITY_TIMEOUT);
    };

    // Listen to user interaction events across the window
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    
    events.forEach(event => {
      window.addEventListener(event, resetTimer, { passive: true });
    });

    // Initialize timer
    resetTimer();

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      events.forEach(event => {
        window.removeEventListener(event, resetTimer);
      });
    };
  }, [currentUserAuthor, navigate]);

  useEffect(() => {
    if (authChecked && currentPath === '/admin' && !auth.currentUser) {
      navigate('/login');
    }
  }, [authChecked, currentPath, navigate]);

  const handleRouting = async (path: string) => {
    setLoading(true);
    
    // Clear sub states
    setAiSummary('');
    setAiSpeechActive(false);
    
    // Reset full story reader
    window.speechSynthesis.cancel();
    setFullSpeechActive(false);
    setFullSpeechPaused(false);
    setFullSpeechParagraphIndex(0);

    // Reset newsletter state on route changes (but retain sessionStorage preference)
    setShowNewsletterModal(false);
    setNewsletterEmail('');
    setNewsletterSuccess(false);
    setNewsletterError('');

    if (path === '/') {
      await loadPrimaryContent();
    } else if (path.startsWith('/category/')) {
      const catId = path.split('/category/')[1];
      const items = await getArticlesByCategory(catId);
      setCategoryArticles(items);
    } else if (path.startsWith('/article/')) {
      const slug = path.split('/article/')[1];
      const found = await getArticleBySlug(slug);
      if (found) {
        setSelectedArticle(found);
        // Log view counter incrementally
        await incrementArticleViews(found.id);
      } else {
        setSelectedArticle(null);
      }
    } else if (path.startsWith('/search')) {
      const params = new URLSearchParams(window.location.search);
      const queryParam = params.get('q') || '';
      setSearchQuery(queryParam);
    } else if (path === '/saved') {
      await loadPrimaryContent();
    } else if (path.startsWith('/info/')) {
      const pageId = path.split('/info/')[1] as any;
      if (['about', 'contact', 'privacy', 'terms', 'editorial', 'fact-check', 'cookie'].includes(pageId)) {
        setInfoTab(pageId);
      } else {
        setInfoTab('about');
      }
    }
    setLoading(false);
  };

  const loadPrimaryContent = async () => {
    try {
      const items = await getAllArticles();
      setArticles(items);
      // Popular posts based on views
      const popular = [...items].sort((a, b) => (b.views || 0) - (a.views || 0));
      setPopularArticles(popular);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSearchTrigger = (query: string) => {
    setSearchQuery(query);
  };

  const handleLikeArticle = async () => {
    if (!selectedArticle) return;
    try {
      await incrementArticleLikes(selectedArticle.id);
      setSelectedArticle(prev => prev ? { ...prev, likes: (prev.likes || 0) + 1 } : null);
    } catch (err) {
      console.error(err);
    }
  };

  // Structured related articles fetching (in-category)
  const relatedArticles = useMemo(() => {
    if (!selectedArticle || articles.length === 0) return [];
    return articles
      .filter(a => {
        if (a.id === selectedArticle.id) return false;
        const aCats = a.categories && a.categories.length > 0 ? a.categories : [a.category];
        const sCats = selectedArticle.categories && selectedArticle.categories.length > 0 ? selectedArticle.categories : [selectedArticle.category];
        return aCats.some(cat => sCats.includes(cat));
      })
      .slice(0, 3);
  }, [selectedArticle, articles]);

  // Filtered search articles
  const searchedArticles = useMemo(() => {
    if (!searchQuery) return [];
    return articles.filter(art => 
      art.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
      art.summary.toLowerCase().includes(searchQuery.toLowerCase()) || 
      art.content.toLowerCase().includes(searchQuery.toLowerCase()) || 
      art.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  }, [searchQuery, articles]);

  // AI Summary dynamic lookup (reads summary from our backend)
  const generateAISummary = async () => {
    if (!selectedArticle) return;
    setAiSummaryLoading(true);
    try {
      const res = await fetch('/api/ai/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: selectedArticle.content, length: 'long' })
      });
      const data = await res.json();
      if (res.ok) {
        setAiSummary(data.summary);
      } else {
        alert(data.error || 'Failed to generate AI summary.');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setAiSummaryLoading(false);
    }
  };

  // Text-To-Speech reader for AI summary
  const handleAISpeech = () => {
    if (!aiSummary) return;
    if (aiSpeechActive) {
      window.speechSynthesis.cancel();
      setAiSpeechActive(false);
    } else {
      const utterance = new SpeechSynthesisUtterance(aiSummary);
      utterance.onend = () => setAiSpeechActive(false);
      utterance.onerror = (e) => {
        console.warn('AI summary speech synthesis utterance warning (handled):', e);
        setAiSpeechActive(false);
      };
      try {
        window.speechSynthesis.speak(utterance);
        setAiSpeechActive(true);
      } catch (err) {
        console.warn('AI summary speech synthesis speak exception caught:', err);
        setAiSpeechActive(false);
      }
    }
  };

  // Copy article link to clipboard for social sharing
  const handleCopyShareLink = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  // Handle native Web Share API for mobile/desktop
  const handleNativeShare = async () => {
    const url = window.location.href;
    const title = selectedArticle?.title || 'PulseWire Africa';
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title,
          text: `Check out this article on PulseWire Africa: "${title}"`,
          url,
        });
      } catch (err) {
        if (err instanceof Error && err.name !== 'AbortError') {
          handleCopyShareLink();
        }
      }
    } else {
      handleCopyShareLink();
    }
  };

  // Helper reading time estimate
  const getReadingTime = (text: string) => {
    const words = text ? text.split(/\s+/).length : 0;
    return Math.max(1, Math.round(words / 225));
  };

  // Current category details
  const activeCategoryDetails = useMemo(() => {
    if (!currentPath.startsWith('/category/')) return null;
    const catId = currentPath.split('/category/')[1];
    return CATEGORIES.find(c => c.id === catId) || null;
  }, [currentPath]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-950 dark:text-gray-100 flex flex-col font-sans transition-colors duration-200">
      
      {/* Header and Breaking News ticker */}
      <Header 
        currentPath={currentPath}
        navigate={navigate}
        darkMode={darkMode}
        setDarkMode={setDarkMode}
        isAdmin={isAdmin}
        setIsAdmin={setIsAdmin}
        onSearch={handleSearchTrigger}
      />
      
      <BreakingTicker navigate={navigate} />

      {/* AI Key configuration banner reminder */}
      {!aiConfigured && (
        <div className="bg-gradient-to-r from-emerald-800 to-slate-900 text-white text-xs py-2.5 px-4 font-sans font-medium flex items-center justify-between shadow-inner">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 animate-bounce text-emerald-400" />
            <span>
              <strong>Gemini AI Not Configured:</strong> Add your real <strong>GEMINI_API_KEY</strong> via the AI Studio Settings panel (top right) to activate investigative rewriters, dynamic SEO tag generators, and the original plagiarism scanner!
            </span>
          </div>
          <button 
            onClick={() => setAiConfigured(true)}
            className="bg-white/20 hover:bg-white/30 text-white font-bold uppercase tracking-wider px-2.5 py-1 rounded text-[10px] shrink-0"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main Content Layout Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        <AnimatePresence mode="wait">
          {!dbReady || loading || !authChecked || (auth.currentUser && !currentUserAuthor) ? (
            <motion.div 
              key="skeleton-loader"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-12 py-4"
            >
              {/* Featured Section Skeleton (Desktop: 2 columns, Mobile: 1 column) */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Hero / Big Featured Article Skeleton */}
                <div className="lg:col-span-2 space-y-4">
                  {/* Aspect Ratio Box for Image */}
                  <div className="aspect-[16/9] w-full rounded-2xl bg-slate-200/70 dark:bg-slate-900/60 animate-pulse" />
                  
                  {/* Category Pill Skeleton */}
                  <div className="h-5 w-24 bg-slate-200/70 dark:bg-slate-900/60 rounded-full animate-pulse" />
                  
                  {/* Title Skeleton */}
                  <div className="space-y-2">
                    <div className="h-7 w-5/6 bg-slate-200/70 dark:bg-slate-900/60 rounded animate-pulse" />
                    <div className="h-7 w-1/2 bg-slate-200/70 dark:bg-slate-900/60 rounded animate-pulse" />
                  </div>
                  
                  {/* Excerpt Skeleton */}
                  <div className="space-y-1.5 pt-2">
                    <div className="h-4 w-full bg-slate-200/50 dark:bg-slate-900/40 rounded animate-pulse" />
                    <div className="h-4 w-full bg-slate-200/50 dark:bg-slate-900/40 rounded animate-pulse" />
                    <div className="h-4 w-2/3 bg-slate-200/50 dark:bg-slate-900/40 rounded animate-pulse" />
                  </div>
                  
                  {/* Author / Date Skeleton */}
                  <div className="flex items-center gap-3 pt-4">
                    <div className="w-8 h-8 rounded-full bg-slate-200/70 dark:bg-slate-900/60 animate-pulse" />
                    <div className="space-y-1">
                      <div className="h-3 w-28 bg-slate-200/70 dark:bg-slate-900/60 rounded animate-pulse" />
                      <div className="h-3 w-16 bg-slate-200/50 dark:bg-slate-900/40 rounded animate-pulse" />
                    </div>
                  </div>
                </div>

                {/* Popular / Sidebar Section Skeleton */}
                <div className="space-y-6">
                  <div className="border-b border-slate-100 dark:border-slate-900 pb-3 flex items-center justify-between">
                    <div className="h-5 w-32 bg-slate-200/70 dark:bg-slate-900/60 rounded animate-pulse" />
                    <div className="h-4 w-12 bg-slate-200/50 dark:bg-slate-900/40 rounded animate-pulse" />
                  </div>
                  
                  <div className="space-y-6">
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className="flex gap-4 items-start">
                        {/* Big Rank Number Skeleton */}
                        <div className="text-3xl font-extrabold text-slate-100 dark:text-slate-900 select-none leading-none animate-pulse">
                          0{i}
                        </div>
                        <div className="flex-1 space-y-2">
                          {/* Mini Category tag */}
                          <div className="h-3 w-16 bg-slate-200/50 dark:bg-slate-900/40 rounded animate-pulse" />
                          {/* Title lines */}
                          <div className="h-4 w-full bg-slate-200/70 dark:bg-slate-900/60 rounded animate-pulse" />
                          <div className="h-4 w-4/5 bg-slate-200/70 dark:bg-slate-900/60 rounded animate-pulse" />
                          {/* Views metadata */}
                          <div className="h-3.5 w-24 bg-slate-200/50 dark:bg-slate-900/40 rounded animate-pulse mt-1" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Grid 2: Three Column Feed Skeleton */}
              <div className="space-y-6 pt-8 border-t border-slate-100 dark:border-slate-900">
                <div className="h-5 w-48 bg-slate-200/70 dark:bg-slate-900/60 rounded animate-pulse" />
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="space-y-3">
                      {/* Grid Image */}
                      <div className="aspect-[16/10] w-full rounded-2xl bg-slate-200/70 dark:bg-slate-900/60 animate-pulse" />
                      {/* Pill */}
                      <div className="h-4.5 w-20 bg-slate-200/50 dark:bg-slate-900/40 rounded-full animate-pulse" />
                      {/* Title */}
                      <div className="space-y-1.5">
                        <div className="h-5 w-full bg-slate-200/70 dark:bg-slate-900/60 rounded animate-pulse" />
                        <div className="h-5 w-5/6 bg-slate-200/70 dark:bg-slate-900/60 rounded animate-pulse" />
                      </div>
                      {/* Summary */}
                      <div className="space-y-1 pt-1">
                        <div className="h-3.5 w-full bg-slate-200/50 dark:bg-slate-900/40 rounded animate-pulse" />
                        <div className="h-3.5 w-3/4 bg-slate-200/50 dark:bg-slate-900/40 rounded animate-pulse" />
                      </div>
                      {/* Author */}
                      <div className="h-3 w-32 bg-slate-200/50 dark:bg-slate-900/40 rounded animate-pulse pt-2" />
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key={currentPath}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              transition={{ duration: 0.2 }}
            >
              
              {/* --- ROUTE 1: HOMEPAGE --- */}
              {currentPath === '/' && (
                <div className="space-y-12">
                  
                  {/* Top Featured Hero Section */}
                  {articles.length > 0 && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                      
                      {/* Main Featured Banner Story (Takes 2 columns) */}
                      <div className="lg:col-span-2 space-y-4 cursor-pointer group" onClick={() => navigate(`/article/${articles[0].slug}`)}>
                        <div className="relative overflow-hidden rounded-2xl aspect-[16/9] border border-gray-200 dark:border-gray-800 shadow-sm">
                          <img 
                            src={articles[0].featuredImage} 
                            alt={articles[0].title} 
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover transform group-hover:scale-[1.02] transition-transform duration-700" 
                          />
                          <div className="absolute top-4 left-4 flex flex-wrap gap-1.5 z-10">
                            {(articles[0].categories && articles[0].categories.length > 0 ? articles[0].categories : [articles[0].category]).map(catId => {
                              const cat = CATEGORIES.find(c => c.id === catId);
                              return (
                                <span key={catId} className="bg-emerald-700 text-white text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-lg tracking-wider font-mono">
                                  {cat?.name || catId}
                                </span>
                              );
                            })}
                          </div>
                        </div>
                        <div className="space-y-2">
                          <h2 className="text-xl md:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white group-hover:text-emerald-700 transition-colors leading-tight font-sans">
                            {articles[0].title}
                          </h2>
                          <p className="text-sm text-gray-600 dark:text-gray-400 font-sans leading-relaxed">
                            {articles[0].summary}
                          </p>
                          <div className="flex items-center space-x-4 text-xs text-gray-500 font-mono pt-1">
                            <span className="font-bold text-gray-700 dark:text-gray-300">{articles[0].authorName}</span>
                            <span>•</span>
                            <span>{new Date(articles[0].publishedAt || articles[0].createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                            <span>•</span>
                            <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{getReadingTime(articles[0].content)} min read</span>
                          </div>
                        </div>
                      </div>

                      {/* Right Sidebar: Trending Feed */}
                      <div className="space-y-6">
                        <div className="border-b border-gray-200 dark:border-gray-800 pb-3 flex items-center justify-between">
                          <h3 className="text-sm font-extrabold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                            <TrendingUp className="h-4.5 w-4.5 text-emerald-700" />
                            Popular Stories
                          </h3>
                        </div>
 
                        <div className="divide-y divide-gray-200 dark:divide-gray-800">
                          {popularArticles.slice(0, 4).map((art, pIdx) => (
                            <div 
                              key={art.id}
                              onClick={() => navigate(`/article/${art.slug}`)}
                              className="py-4 flex gap-4 cursor-pointer group first:pt-0 last:pb-0"
                            >
                              <div className="text-2xl font-black text-gray-200 dark:text-gray-800 font-mono shrink-0 select-none w-8">
                                0{pIdx + 1}
                              </div>
                              <div className="space-y-1 min-w-0">
                                <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-widest font-mono block">
                                  {(art.categories && art.categories.length > 0 ? art.categories : [art.category]).map(catId => {
                                    return CATEGORIES.find(c => c.id === catId)?.name || catId;
                                  }).join(' • ')}
                                </span>
                                <h4 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-emerald-700 transition-colors leading-snug line-clamp-2">
                                  {art.title}
                                </h4>
                                <span className="text-[10px] text-gray-400 font-mono block">{art.views} readers</span>
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Direct AdSense sidebar placement */}
                        <AdSenseBanner 
                          type="sidebar" 
                          contextTitle={articles[0]?.title}
                          contextCategory={articles[0]?.category}
                          contextTags={articles[0]?.tags}
                        />
                      </div>

                    </div>
                  )}

                  {/* Horizontal Banner ad placement */}
                  <AdSenseBanner 
                    type="banner" 
                    contextTitle={articles[0]?.title}
                    contextCategory={articles[0]?.category}
                    contextTags={articles[0]?.tags}
                  />

                  {/* Secondary grid articles */}
                  {articles.length > 1 && (
                    <div className="space-y-6">
                      <div className="border-b border-gray-200 dark:border-gray-800 pb-3">
                        <h3 className="text-sm font-extrabold text-gray-950 dark:text-white uppercase tracking-wider font-mono">
                          LATEST COVERAGE
                        </h3>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {articles.slice(1).map(art => (
                          <div 
                            key={art.id} 
                            onClick={() => navigate(`/article/${art.slug}`)}
                            className="group flex flex-col justify-between space-y-3 cursor-pointer"
                          >
                            <div className="space-y-3">
                              <div className="relative overflow-hidden rounded-xl aspect-[16/10] border border-gray-200/55 dark:border-gray-800 shadow-sm">
                                <img 
                                  src={art.featuredImage} 
                                  alt={art.title} 
                                  referrerPolicy="no-referrer"
                                  className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-500" 
                                />
                                <div className="absolute top-3 left-3 flex flex-wrap gap-1 z-10">
                                  {(art.categories && art.categories.length > 0 ? art.categories : [art.category]).map(catId => {
                                    const cat = CATEGORIES.find(c => c.id === catId);
                                    return (
                                      <span key={catId} className="bg-gray-950/85 text-white text-[9px] font-extrabold uppercase px-2 py-0.5 rounded tracking-wide font-mono">
                                        {cat?.name || catId}
                                      </span>
                                    );
                                  })}
                                </div>
                              </div>
                              <div className="space-y-1.5">
                                <h4 className="text-base font-bold text-slate-900 dark:text-white group-hover:text-emerald-700 transition-colors leading-snug line-clamp-2 font-sans">
                                  {art.title}
                                </h4>
                                <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 font-sans">
                                  {art.summary}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center space-x-3 text-[10px] text-gray-400 font-mono pt-1">
                              <span className="font-bold text-gray-600 dark:text-gray-300">{art.authorName}</span>
                              <span>•</span>
                              <span>{new Date(art.publishedAt || art.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                </div>
              )}

              {/* --- ROUTE 2: CATEGORY PAGE --- */}
              {currentPath.startsWith('/category/') && (
                <div className="space-y-8">
                  {activeCategoryDetails && (
                    <div className="border-b border-gray-200 dark:border-gray-800 pb-6 mb-8">
                      <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white capitalize flex items-center gap-2">
                        {activeCategoryDetails.name}
                        <span className="text-xs bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 px-2 py-0.5 rounded font-mono font-bold uppercase tracking-wider border border-emerald-100 dark:border-emerald-900/55">
                          Section
                        </span>
                      </h1>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 max-w-2xl font-sans">
                        {activeCategoryDetails.description}
                      </p>
                    </div>
                  )}

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    
                    {/* Left Column: Category Articles list */}
                    <div className="lg:col-span-2 space-y-8">
                      {categoryArticles.length === 0 ? (
                        <div className="text-center py-20 border border-dashed border-gray-200 dark:border-gray-800 rounded-xl text-gray-500 font-mono">
                          No active publications in this section yet.
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                          {categoryArticles.map(art => (
                            <div 
                              key={art.id}
                              onClick={() => navigate(`/article/${art.slug}`)}
                              className="group flex flex-col justify-between space-y-3 cursor-pointer"
                            >
                              <div className="space-y-3">
                                <div className="relative overflow-hidden rounded-xl aspect-[16/10] border border-gray-200 dark:border-gray-800 shadow-sm">
                                  <img 
                                    src={art.featuredImage} 
                                    alt={art.title} 
                                    referrerPolicy="no-referrer"
                                    className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-500" 
                                  />
                                </div>
                                <h3 className="text-base font-bold text-slate-950 dark:text-white group-hover:text-emerald-700 transition-colors font-sans leading-snug line-clamp-2">
                                  {art.title}
                                </h3>
                                <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 font-sans">
                                  {art.summary}
                                </p>
                              </div>
                              <div className="flex items-center space-x-2 text-[10px] text-gray-400 font-mono pt-1">
                                <span className="font-bold text-gray-600 dark:text-gray-300">{art.authorName}</span>
                                <span>•</span>
                                <span>{new Date(art.publishedAt || art.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Right Column: Mini Sidebar */}
                    <div className="space-y-6">
                      <AdSenseBanner 
                        type="sidebar" 
                        contextTitle={articles[0]?.title}
                        contextCategory={articles[0]?.category}
                        contextTags={articles[0]?.tags}
                      />
                    </div>

                  </div>
                </div>
              )}

              {/* --- ROUTE 3: ARTICLE DETAILS PAGE --- */}
              {currentPath.startsWith('/article/') && selectedArticle && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                  
                  {/* Left Main Article content (2 cols wide) */}
                  <div className="lg:col-span-2 space-y-6">
                                 {/* Breadcrumbs */}
                    <div className="text-[11px] font-mono uppercase tracking-wider text-gray-400 flex items-center flex-wrap gap-1">
                      <button onClick={() => navigate('/')} className="hover:text-emerald-700">Home</button>
                      <ChevronRight className="h-3 w-3" />
                      {(selectedArticle.categories && selectedArticle.categories.length > 0 ? selectedArticle.categories : [selectedArticle.category]).map((catId, idx) => {
                        const cat = CATEGORIES.find(c => c.id === catId);
                        return (
                          <React.Fragment key={catId}>
                            {idx > 0 && <span className="text-gray-300 dark:text-gray-700 mx-1">•</span>}
                            <button onClick={() => navigate(`/category/${catId}`)} className="hover:text-emerald-700 capitalize">
                              {cat?.name || catId}
                            </button>
                          </React.Fragment>
                        );
                      })}
                      <ChevronRight className="h-3 w-3" />
                      <span className="truncate max-w-[200px] text-gray-500 dark:text-gray-400">{selectedArticle.title}</span>
                    </div>
 
                    <div className="space-y-4">
                      {/* Section tag & sponsored indicators & Save for Later button */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex flex-wrap items-center gap-2">
                          {(selectedArticle.categories && selectedArticle.categories.length > 0 ? selectedArticle.categories : [selectedArticle.category]).map(catId => {
                            const cat = CATEGORIES.find(c => c.id === catId);
                            return (
                              <button
                                key={catId}
                                onClick={() => navigate(`/category/${catId}`)}
                                className="bg-emerald-700 hover:bg-emerald-800 text-white text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-md tracking-wider font-mono transition-colors"
                              >
                                {cat?.name || catId}
                              </button>
                            );
                          })}
                          {selectedArticle.isSponsored && (
                            <span className="bg-amber-100 dark:bg-amber-950/40 text-amber-800 dark:text-amber-400 text-[10px] font-bold uppercase px-2 py-1 rounded-md border border-amber-200 dark:border-amber-900/50 flex items-center gap-1">
                              <Award className="h-3 w-3" />
                              Sponsored by {selectedArticle.sponsorName || 'Partner'}
                            </span>
                          )}
                          {selectedArticle.isAffiliate && (
                            <span className="bg-emerald-100 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-400 text-[10px] font-bold uppercase px-2 py-1 rounded-md border border-emerald-200 dark:border-emerald-900/50 font-mono">
                              Affiliate Partner Piece
                            </span>
                          )}
                        </div>

                        {/* Save for later button */}
                        <button
                          onClick={() => toggleSaveArticle(selectedArticle.slug)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold uppercase transition-all tracking-wider shrink-0 self-start sm:self-center border ${
                            savedSlugs.includes(selectedArticle.slug)
                              ? 'bg-amber-100 dark:bg-amber-950/30 text-amber-800 dark:text-amber-400 border-amber-200 dark:border-amber-900/50'
                              : 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/30'
                          }`}
                        >
                          {savedSlugs.includes(selectedArticle.slug) ? (
                            <>
                              <BookmarkCheck className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                              <span>Saved</span>
                            </>
                          ) : (
                            <>
                              <Bookmark className="h-3.5 w-3.5" />
                              <span>Save for Later</span>
                            </>
                          )}
                        </button>
                      </div>

                      <h1 className="text-2xl md:text-4xl font-extrabold tracking-tight text-gray-950 dark:text-white leading-tight font-sans">
                        {selectedArticle.title}
                      </h1>

                      {/* Author Card & Time Metadata */}
                      <div className="flex items-center justify-between border-y border-gray-100 dark:border-gray-900 py-3.5">
                        <div className="flex items-center space-x-3">
                          <img 
                            src={getAuthorAvatar(selectedArticle.authorName)} 
                            alt={selectedArticle.authorName} 
                            referrerPolicy="no-referrer"
                            className="w-10 h-10 rounded-full object-cover border border-gray-200 dark:border-gray-800" 
                          />
                          <div>
                            <div className="text-sm font-bold text-gray-900 dark:text-white font-sans">{selectedArticle.authorName}</div>
                            <div className="text-[10px] text-gray-400 font-mono">PulseWire Editorial Bureau</div>
                          </div>
                        </div>

                        <div className="flex flex-col text-right text-xs text-gray-500 font-mono">
                          <span>{new Date(selectedArticle.publishedAt || selectedArticle.createdAt).toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' })}</span>
                          <span className="flex items-center gap-1 justify-end mt-0.5"><Clock className="h-3.5 w-3.5" />{getReadingTime(selectedArticle.content)} min read</span>
                        </div>
                      </div>
                    </div>

                    {/* Featured Image */}
                    <NewsImage 
                      src={selectedArticle.featuredImage} 
                      alt={selectedArticle.title} 
                      caption={selectedArticle.summary} 
                    />

                    {/* AI Read-Along Long Summary block */}
                    <div className="p-5 rounded-2xl bg-slate-50/60 dark:bg-slate-900/30 border border-slate-200 dark:border-slate-800 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-800 dark:text-white flex items-center gap-1.5 font-mono uppercase tracking-widest">
                          <Sparkles className="h-4.5 w-4.5 text-emerald-600" />
                          AI News bulletin summarizer
                        </span>
 
                        {aiSummary && (
                          <button 
                            onClick={handleAISpeech}
                            className={`p-1.5 rounded-lg border text-xs font-bold flex items-center gap-1.5 transition-all ${
                              aiSpeechActive 
                                ? 'bg-emerald-700 text-white border-emerald-700' 
                                : 'bg-white dark:bg-gray-900 border-slate-200 dark:border-gray-800 text-slate-700 dark:text-gray-300 hover:border-emerald-500'
                            }`}
                          >
                            <Volume2 className="h-4 w-4" />
                            {aiSpeechActive ? 'Pause Briefing' : 'Listen Briefing'}
                          </button>
                        )}
                      </div>
 
                      {aiSummary ? (
                        <p className="text-sm text-slate-700 dark:text-gray-300 font-sans leading-relaxed italic border-l-2 border-emerald-600 pl-3">
                          "{aiSummary}"
                        </p>
                      ) : (
                        <div className="flex items-center justify-between gap-4">
                          <p className="text-xs text-slate-500 dark:text-gray-400 font-sans">
                            Pressed for time? Fetch a comprehensive AI-powered audio brief of this story in seconds.
                          </p>
                          <button 
                            onClick={generateAISummary}
                            disabled={aiSummaryLoading}
                            className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold uppercase tracking-wider rounded-lg transition-all shrink-0"
                          >
                            {aiSummaryLoading ? 'Formulating...' : 'Summarize'}
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Premium Full-Story Audio Player Deck */}
                    <div className="p-5 rounded-2xl bg-slate-50/50 dark:bg-slate-900/10 border border-slate-200 dark:border-slate-800/80 space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/60 dark:border-slate-800/60 pb-3">
                        <div className="flex items-center gap-2.5">
                          <div className="p-2 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl text-emerald-700 dark:text-emerald-400">
                            <Headphones className="h-4.5 w-4.5 animate-pulse" />
                          </div>
                          <div>
                            <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider font-mono flex items-center gap-1.5">
                              PulseWire Audio Narrator
                              <span className="bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-400 text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded tracking-wide font-mono">Full Read</span>
                            </h3>
                            <p className="text-[11px] text-slate-500 dark:text-gray-400">
                              Listen to the full story with our interactive text-to-speech reader
                            </p>
                          </div>
                        </div>

                        {/* Equalizer Waveform animation */}
                        {fullSpeechActive && !fullSpeechPaused && (
                          <div className="flex items-center gap-1 h-5 px-3 bg-emerald-500/10 rounded-full shrink-0">
                            <span className="w-0.5 h-2.5 bg-emerald-600 rounded-full animate-bounce"></span>
                            <span className="w-0.5 h-3.5 bg-emerald-600 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                            <span className="w-0.5 h-2 bg-emerald-600 rounded-full animate-bounce [animation-delay:0.4s]"></span>
                            <span className="w-0.5 h-4 bg-emerald-600 rounded-full animate-bounce [animation-delay:0.1s]"></span>
                            <span className="text-[9px] text-emerald-700 dark:text-emerald-400 font-extrabold font-mono uppercase tracking-widest ml-1">PLAYING</span>
                          </div>
                        )}
                      </div>

                      {/* Player Controls Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                        {/* Action buttons */}
                        <div className="md:col-span-5 flex flex-wrap items-center gap-2">
                          {!fullSpeechActive ? (
                            <button 
                              onClick={() => {
                                setFullSpeechParagraphIndex(0);
                                setFullSpeechActive(true);
                                setFullSpeechPaused(false);
                              }}
                              className="flex items-center gap-2 px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all shadow-sm cursor-pointer"
                            >
                              <Play className="h-3.5 w-3.5 fill-current" />
                              Start Full Read
                            </button>
                          ) : (
                            <>
                              {fullSpeechPaused ? (
                                <button 
                                  onClick={() => setFullSpeechPaused(false)}
                                  className="flex items-center gap-2 px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all shadow-sm cursor-pointer"
                                >
                                  <Play className="h-3.5 w-3.5 fill-current" />
                                  Resume
                                </button>
                              ) : (
                                <button 
                                  onClick={() => setFullSpeechPaused(true)}
                                  className="flex items-center gap-2 px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all shadow-sm cursor-pointer"
                                >
                                  <Pause className="h-3.5 w-3.5 fill-current" />
                                  Pause
                                </button>
                              )}

                              <button 
                                onClick={() => {
                                  setFullSpeechActive(false);
                                  setFullSpeechPaused(false);
                                  setFullSpeechParagraphIndex(0);
                                  window.speechSynthesis.cancel();
                                }}
                                className="flex items-center gap-2 px-3 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-gray-800 dark:hover:bg-gray-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer"
                              >
                                <Square className="h-3 w-3 fill-current" />
                                Stop
                              </button>
                            </>
                          )}

                          {fullSpeechActive && (
                            <div className="flex items-center gap-1 ml-1 bg-slate-100 dark:bg-gray-800/40 p-1 rounded-xl">
                              <button 
                                onClick={() => setFullSpeechParagraphIndex(prev => Math.max(0, prev - 1))}
                                disabled={fullSpeechParagraphIndex === 0}
                                className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-gray-700 disabled:opacity-30 transition-all cursor-pointer"
                                title="Previous paragraph"
                              >
                                <SkipBack className="h-3.5 w-3.5 text-slate-700 dark:text-slate-300" />
                              </button>
                              <button 
                                onClick={() => setFullSpeechParagraphIndex(prev => Math.min(articleParagraphs.length - 1, prev + 1))}
                                disabled={fullSpeechParagraphIndex === articleParagraphs.length - 1}
                                className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-gray-700 disabled:opacity-30 transition-all cursor-pointer"
                                title="Next paragraph"
                              >
                                <SkipForward className="h-3.5 w-3.5 text-slate-700 dark:text-slate-300" />
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Voice Selector */}
                        <div className="md:col-span-4 space-y-1">
                          <div className="flex justify-between items-center">
                            <label className="block text-[9px] font-extrabold text-slate-400 dark:text-gray-500 uppercase tracking-widest font-mono">Narrating Voice</label>
                            {selectedVoiceName && (
                              <span className="text-[9px] font-mono text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1 animate-fade-in">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> Saved
                              </span>
                            )}
                          </div>
                          <select 
                            value={selectedVoiceName} 
                            onChange={e => setSelectedVoiceName(e.target.value)}
                            className="w-full text-xs font-medium rounded-lg border border-slate-200 dark:border-gray-800 bg-slate-50 dark:bg-gray-950 text-slate-700 dark:text-gray-300 py-1.5 px-2.5 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono"
                          >
                            {voices.map(voice => (
                              <option key={voice.name} value={voice.name}>
                                {voice.name} ({voice.lang})
                              </option>
                            ))}
                            {voices.length === 0 && (
                              <option value="">System Default Voice</option>
                            )}
                          </select>
                        </div>

                        {/* Speed Selector */}
                        <div className="md:col-span-3 space-y-2">
                          <div className="flex justify-between items-center">
                            <label className="block text-[9px] font-extrabold text-slate-400 dark:text-gray-500 uppercase tracking-widest font-mono">Narrator Speed</label>
                            <span className="text-[10px] font-bold font-mono text-emerald-700 dark:text-emerald-400 bg-emerald-100/60 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded">
                              {fullSpeechRate.toFixed(1)}x
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[9px] font-mono text-slate-400">0.5x</span>
                            <input 
                              type="range" 
                              min="0.5" 
                              max="2.5" 
                              step="0.1" 
                              value={fullSpeechRate}
                              onChange={e => setFullSpeechRate(parseFloat(e.target.value))}
                              className="w-full accent-emerald-600 cursor-pointer h-1 bg-slate-200 dark:bg-gray-800 rounded-lg appearance-none"
                            />
                            <span className="text-[9px] font-mono text-slate-400">2.5x</span>
                          </div>
                        </div>
                      </div>

                      {/* Progress indicator */}
                      {fullSpeechActive && articleParagraphs.length > 0 && (
                        <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-gray-800/40">
                          <div className="flex justify-between items-center text-[10px] font-mono text-gray-400">
                            <span>Section {fullSpeechParagraphIndex + 1} of {articleParagraphs.length}</span>
                            <span>{Math.round(((fullSpeechParagraphIndex + 1) / articleParagraphs.length) * 100)}% read</span>
                          </div>
                          <div className="w-full h-1.5 bg-slate-100 dark:bg-gray-800 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-emerald-600 transition-all duration-300"
                              style={{ width: `${((fullSpeechParagraphIndex + 1) / articleParagraphs.length) * 100}%` }}
                            ></div>
                          </div>
                          <p className="text-[11px] text-emerald-700 dark:text-emerald-400 leading-normal font-sans italic line-clamp-1">
                            Narrating: "{articleParagraphs[fullSpeechParagraphIndex]}"
                          </p>
                        </div>
                      )}

                      <p className="text-[10px] text-slate-400 dark:text-gray-500 font-mono text-center">
                        💡 Tip: Click any paragraph in the article body below to immediately start narrating from that specific section.
                      </p>
                    </div>

                    {/* Main Story Content Body */}
                    <div className="prose prose-lg dark:prose-invert max-w-none text-gray-800 dark:text-gray-200 leading-relaxed font-sans space-y-4">
                      {articleParagraphs.map((paragraph, pIdx) => {
                        const isCurrent = fullSpeechActive && fullSpeechParagraphIndex === pIdx;
                        return (
                          <p 
                            key={pIdx} 
                            onClick={() => {
                              setFullSpeechParagraphIndex(pIdx);
                              setFullSpeechActive(true);
                              setFullSpeechPaused(false);
                            }}
                            className={`whitespace-pre-wrap transition-all duration-300 rounded-xl px-4 py-2.5 -mx-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900/30 relative group leading-relaxed ${
                              isCurrent 
                                ? 'bg-emerald-50/70 dark:bg-emerald-950/20 border-l-4 border-emerald-600 text-slate-900 dark:text-white font-medium shadow-sm' 
                                : ''
                            }`}
                          >
                            {isCurrent && (
                              <span className="absolute -left-12 top-4 hidden md:flex items-center justify-center w-6 h-6 rounded-full bg-emerald-600 text-white animate-bounce">
                                <Volume2 className="h-3 w-3" />
                              </span>
                            )}
                            <span className="absolute right-3 bottom-2.5 opacity-0 group-hover:opacity-65 text-[10px] font-mono text-emerald-700 dark:text-emerald-400 uppercase font-extrabold tracking-widest transition-opacity flex items-center gap-1">
                              <Play className="h-2.5 w-2.5 fill-current" /> Speak from here
                            </span>
                            {paragraph}
                          </p>
                        );
                      })}
                    </div>

                    {/* Supplementary attached image gallery */}
                    {selectedArticle.images && selectedArticle.images.length > 0 && (
                      <div className="mt-8">
                        <ImageGallery 
                          images={selectedArticle.images} 
                          title={selectedArticle.title} 
                        />
                      </div>
                    )}

                    {/* Author Biography Card */}
                    <AuthorBioCard 
                      authorName={selectedArticle.authorName} 
                      onSearchAuthor={(name) => navigate(`/search?q=${encodeURIComponent(name)}`)} 
                    />

                    {/* Tags and Likes */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-t border-gray-100 dark:border-gray-900 pt-6 mt-8">
                      <div className="flex flex-wrap gap-2">
                        {selectedArticle.tags.map((tag, tIdx) => (
                          <span 
                            key={tIdx} 
                            onClick={() => { navigate(`/search?q=${encodeURIComponent(tag)}`); }}
                            className="bg-gray-100 dark:bg-gray-900 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 hover:text-emerald-700 cursor-pointer text-gray-600 dark:text-gray-400 text-xs px-2.5 py-1 rounded-lg font-mono font-medium transition-colors"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
 
                      <div className="flex items-center gap-3 shrink-0">
                        <button 
                          onClick={handleLikeArticle}
                          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/30 hover:bg-emerald-700 hover:text-white transition-all font-bold text-xs uppercase"
                        >
                          <Heart className="h-4 w-4" />
                          Appreciate Story ({selectedArticle.likes || 0})
                        </button>

                        <button 
                          onClick={handleCopyShareLink}
                          className="p-2 rounded-xl border border-gray-200 dark:border-gray-800 hover:bg-gray-100 dark:hover:bg-gray-900 text-gray-600 dark:text-gray-300 transition-colors flex items-center justify-center shrink-0"
                          title="Copy Shareable Link"
                        >
                          {copiedLink ? <Check className="h-4 w-4 text-emerald-500" /> : <Share2 className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>

                    {/* Dedicated Social Share Panel */}
                    <div className="mt-8 p-4.5 rounded-2xl bg-slate-50 dark:bg-slate-900/25 border border-slate-200/60 dark:border-slate-800/80 space-y-3.5">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                          <h4 className="text-xs font-black text-slate-950 dark:text-white uppercase tracking-wider font-mono flex items-center gap-2">
                            Spread the coverage
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                          </h4>
                          <p className="text-[11px] text-slate-500 dark:text-gray-400 mt-0.5">
                            Share this story to WhatsApp, Telegram, or other platforms on your network
                          </p>
                        </div>
                        
                        {/* Native Share capability badge */}
                        {typeof navigator !== 'undefined' && navigator.share && (
                          <span className="self-start sm:self-auto bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400 text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full tracking-wide font-mono flex items-center gap-1.5 border border-indigo-100 dark:border-indigo-900/50">
                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-ping"></span>
                            System Share Available
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-2.5">
                        {/* WhatsApp Button */}
                        <a 
                          href={`https://api.whatsapp.com/send?text=${encodeURIComponent(selectedArticle.title + " - " + window.location.href)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 px-3.5 py-2 bg-[#25D366] hover:bg-[#20ba5a] text-white rounded-xl text-xs font-bold transition-all hover:scale-[1.02] active:scale-[0.98] shadow-sm hover:shadow cursor-pointer"
                        >
                          <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                            <path d="M19.05 4.91A9.816 9.816 0 0 0 12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01zm-7.01 15.24c-1.48 0-2.93-.4-4.19-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.122 8.122 0 0 1-1.24-4.38c0-4.49 3.65-8.14 8.14-8.14 2.18 0 4.22.85 5.76 2.39a8.082 8.082 0 0 1 2.38 5.76c.01 4.49-3.64 8.14-8.14 8.14zm4.47-6.1c-.24-.12-1.44-.71-1.66-.79-.22-.08-.38-.12-.54.12-.16.24-.62.79-.76.95-.14.16-.28.18-.52.06a6.51 6.51 0 0 1-1.93-1.19c-.58-.51-1-1.14-1.13-1.38-.14-.24-.01-.37.11-.49.11-.11.24-.28.37-.42.12-.14.16-.24.24-.4.08-.16.04-.3-.02-.42s-.54-1.3-.74-1.78c-.2-.48-.4-.41-.54-.42h-.46c-.16 0-.42.06-.64.3-.22.24-.84.83-.84 2.02s.87 2.33.99 2.49c.12.16 1.71 2.62 4.15 3.67.58.25 1.03.4 1.38.51.58.18 1.11.16 1.53.1.47-.07 1.44-.59 1.64-1.15.2-.56.2-1.03.14-1.13-.06-.1-.22-.16-.46-.28z"/>
                          </svg>
                          WhatsApp
                        </a>

                        {/* Telegram Button */}
                        <a 
                          href={`https://t.me/share/url?url=${encodeURIComponent(window.location.href)}&text=${encodeURIComponent(selectedArticle.title)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 px-3.5 py-2 bg-[#229ED9] hover:bg-[#1d8fc5] text-white rounded-xl text-xs font-bold transition-all hover:scale-[1.02] active:scale-[0.98] shadow-sm hover:shadow cursor-pointer"
                        >
                          <svg className="w-4.5 h-4.5 fill-current" viewBox="0 0 24 24">
                            <path d="M12 0C5.37 0 0 5.37 0 12s5.37 12 12 12 12-5.37 12-12S18.63 0 12 0zm5.56 8.16l-1.85 8.73c-.14.63-.52.79-1.05.49l-2.83-2.08-1.37 1.32c-.15.15-.28.28-.57.28l.2-2.87 5.23-4.73c.23-.2-.05-.31-.35-.11l-6.46 4.07-2.78-.87c-.6-.19-.62-.6.13-.89l10.87-4.19c.5-.19.94.11.78.85z"/>
                          </svg>
                          Telegram
                        </a>

                        {/* X / Twitter Button */}
                        <a 
                          href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(selectedArticle.title)}&url=${encodeURIComponent(window.location.href)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-black dark:hover:bg-neutral-200 rounded-xl text-xs font-bold transition-all hover:scale-[1.02] active:scale-[0.98] shadow-sm hover:shadow cursor-pointer"
                        >
                          <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                          </svg>
                          Twitter / X
                        </a>

                        {/* Facebook Button */}
                        <a 
                          href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 px-3.5 py-2 bg-[#1877F2] hover:bg-[#166fe5] text-white rounded-xl text-xs font-bold transition-all hover:scale-[1.02] active:scale-[0.98] shadow-sm hover:shadow cursor-pointer"
                        >
                          <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                          </svg>
                          Facebook
                        </a>

                        {/* Device / Native Share (highly dynamic) */}
                        <button 
                          onClick={handleNativeShare}
                          className="flex items-center gap-2 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all hover:scale-[1.02] active:scale-[0.98] shadow-sm hover:shadow cursor-pointer"
                        >
                          <Share2 className="h-4 w-4" />
                          Share via Device
                        </button>

                        {/* Minimal Copy Link fallback option inside panel */}
                        <button 
                          onClick={handleCopyShareLink}
                          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all hover:scale-[1.02] active:scale-[0.98] shadow-sm cursor-pointer ${
                            copiedLink 
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/40' 
                              : 'bg-slate-100 hover:bg-slate-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          {copiedLink ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                          {copiedLink ? 'Link Copied' : 'Copy Link'}
                        </button>
                      </div>
                    </div>

                    {/* Related Articles inline block */}
                    {relatedArticles.length > 0 && (
                      <div className="border-t border-gray-100 dark:border-gray-900 pt-10 mt-10 space-y-6">
                        <h3 className="text-sm font-extrabold text-gray-950 dark:text-white uppercase tracking-wider font-mono">
                          More From this Section
                        </h3>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                          {relatedArticles.map(rel => (
                            <div 
                              key={rel.id} 
                              onClick={() => navigate(`/article/${rel.slug}`)}
                              className="group cursor-pointer space-y-2.5"
                            >
                              <div className="relative overflow-hidden rounded-xl aspect-[16/10] border border-gray-200 dark:border-gray-800 shadow-sm">
                                <img src={rel.featuredImage} alt={rel.title} className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-500" />
                              </div>
                              <h4 className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-emerald-700 transition-colors leading-snug line-clamp-2">
                                {rel.title}
                              </h4>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Comments Discussion panel */}
                    <ArticleComments articleId={selectedArticle.id} navigate={navigate} />

                  </div>

                  {/* Right Sidebar details (1 col wide) */}
                  <div className="space-y-6">
                    <AdSenseBanner 
                      type="sidebar" 
                      contextTitle={selectedArticle.title}
                      contextCategory={selectedArticle.category}
                      contextTags={selectedArticle.tags}
                    />
                  </div>

                </div>
              )}

              {/* --- ROUTE 4: SEARCH RESULTS PAGE --- */}
              {currentPath.startsWith('/search') && (
                <div className="space-y-8">
                  <div className="border-b border-gray-200 dark:border-gray-800 pb-6">
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                      Search results for "{searchQuery}"
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">
                      Located {searchedArticles.length} matching stories in the database.
                    </p>
                  </div>

                  {searchedArticles.length === 0 ? (
                    <div className="text-center py-20 border border-dashed border-gray-200 dark:border-gray-800 rounded-xl text-gray-400 font-mono">
                      No publications found matching your keywords. Try searching for "Accra", "trade" or "Stars".
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                      {searchedArticles.map(art => (
                        <div 
                          key={art.id}
                          onClick={() => navigate(`/article/${art.slug}`)}
                          className="group cursor-pointer space-y-3 flex flex-col justify-between"
                        >
                          <div className="space-y-3">
                            <div className="relative overflow-hidden rounded-xl aspect-[16/10] border border-gray-200 dark:border-gray-800 shadow-sm">
                              <img src={art.featuredImage} alt={art.title} className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-500" />
                            </div>
                            <h4 className="text-base font-bold text-slate-900 dark:text-white group-hover:text-emerald-700 transition-colors leading-snug line-clamp-2">
                              {art.title}
                            </h4>
                            <p className="text-xs text-gray-500 line-clamp-2">{art.summary}</p>
                          </div>
                          <span className="text-[10px] text-gray-400 font-mono">{art.authorName} • {new Date(art.publishedAt || art.createdAt).toLocaleDateString()}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* --- ROUTE 6: MY SAVED ARTICLES PAGE --- */}
              {currentPath === '/saved' && (
                <div className="space-y-8">
                  <div className="border-b border-gray-200 dark:border-gray-800 pb-6">
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2 font-sans">
                      <Bookmark className="h-6 w-6 text-emerald-700" />
                      My Saved Articles
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">
                      You have bookmarked {savedArticles.length} stories for offline/later reading.
                    </p>
                  </div>

                  {savedArticles.length === 0 ? (
                    <div className="text-center py-20 border border-dashed border-gray-200 dark:border-gray-800 rounded-xl text-gray-400 font-mono">
                      No saved articles yet. Bookmark articles from their details page to see them here!
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                      {savedArticles.map(art => (
                        <div 
                          key={art.id}
                          onClick={() => navigate(`/article/${art.slug}`)}
                          className="group cursor-pointer space-y-3 flex flex-col justify-between"
                        >
                          <div className="space-y-3">
                            <div className="relative overflow-hidden rounded-xl aspect-[16/10] border border-gray-200 dark:border-gray-800 shadow-sm">
                              <img src={art.featuredImage} alt={art.title} className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-500" />
                              <div className="absolute top-3 left-3 flex flex-wrap gap-1 z-10">
                                {(art.categories && art.categories.length > 0 ? art.categories : [art.category]).map(catId => {
                                  const cat = CATEGORIES.find(c => c.id === catId);
                                  return (
                                    <span key={catId} className="bg-emerald-700 text-white text-[9px] font-extrabold uppercase px-2 py-0.5 rounded tracking-wide font-mono">
                                      {cat?.name || catId}
                                    </span>
                                  );
                                })}
                              </div>
                            </div>
                            <h4 className="text-base font-bold text-slate-900 dark:text-white group-hover:text-emerald-700 transition-colors leading-snug line-clamp-2">
                              {art.title}
                            </h4>
                            <p className="text-xs text-gray-500 line-clamp-2">{art.summary}</p>
                          </div>
                          <div className="flex items-center justify-between pt-1">
                            <span className="text-[10px] text-gray-400 font-mono">{art.authorName} • {new Date(art.publishedAt || art.createdAt).toLocaleDateString()}</span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleSaveArticle(art.slug);
                              }}
                              className="text-xs text-red-500 hover:text-red-700 font-bold"
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* --- ROUTE 7: DEDICATED SIGN IN PAGE --- */}
              {currentPath === '/login' && (
                <div className="max-w-md mx-auto py-12 px-4 sm:px-6">
                  <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-xl p-8 space-y-6">
                    <div className="text-center">
                      <Logo variant="login" />
                      <p className="text-xs text-slate-500 dark:text-gray-400 mt-4">
                        {isSignUp ? 'Create your PulseWire Contributor account' : 'Access your dashboard & comment profiles'}
                      </p>
                    </div>

                    {authError && (
                      <div className="p-3.5 rounded-lg bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400 text-xs font-semibold leading-relaxed border border-red-200 dark:border-red-900/40">
                        {authError}
                      </div>
                    )}

                    {showForgotPasswordPrompt && (
                      <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/20 text-amber-900 dark:text-amber-300 text-xs font-medium leading-relaxed border border-amber-200 dark:border-amber-900/40 relative">
                        <button 
                          onClick={() => setShowForgotPasswordPrompt(false)}
                          className="absolute top-2 right-2 p-1 text-amber-600 hover:text-amber-800 dark:hover:text-amber-200 font-bold"
                          title="Close"
                        >
                          ✕
                        </button>
                        <p className="font-bold mb-1 uppercase tracking-wider text-[10px] text-amber-800 dark:text-amber-400 font-mono">Password Reset Instruction</p>
                        Please contact the PulseWire Africa Administrator at <span className="underline font-bold font-mono text-emerald-800 dark:text-emerald-400">asareg365@gmail.com</span> to initiate a manual password reset or retrieve credentials.
                      </div>
                    )}

                    <form onSubmit={handleAuthSubmit} className="space-y-4">
                      {isSignUp && (
                        <div>
                          <label className="block text-xs font-bold text-slate-500 dark:text-gray-400 uppercase tracking-wider mb-1 font-mono">Full Name</label>
                          <input 
                            type="text" 
                            required 
                            placeholder="John Doe"
                            value={authName} 
                            onChange={e => setAuthName(e.target.value)}
                            className="w-full px-3 py-2.5 text-sm rounded-lg border border-slate-200 dark:border-gray-700 bg-slate-50 dark:bg-gray-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                          />
                        </div>
                      )}

                      {isSignUp && (
                        <div>
                          <label className="block text-xs font-bold text-slate-500 dark:text-gray-400 uppercase tracking-wider mb-1 font-mono">Role</label>
                          <select 
                            value={authRole} 
                            onChange={e => setAuthRole(e.target.value as any)}
                            className="w-full px-3 py-2.5 text-sm rounded-lg border border-slate-200 dark:border-gray-700 bg-slate-50 dark:bg-gray-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                          >
                            <option value="reader">Reader</option>
                            <option value="contributor">Contributor</option>
                            <option value="editor">Editor</option>
                          </select>
                        </div>
                      )}

                      <div>
                        <label className="block text-xs font-bold text-slate-500 dark:text-gray-400 uppercase tracking-wider mb-1 font-mono">Email Address</label>
                        <input 
                          type="email" 
                          required 
                          placeholder="name@example.com"
                          value={authEmail} 
                          onChange={e => setAuthEmail(e.target.value)}
                          className="w-full px-3 py-2.5 text-sm rounded-lg border border-slate-200 dark:border-gray-700 bg-slate-50 dark:bg-gray-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>

                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <label className="block text-xs font-bold text-slate-500 dark:text-gray-400 uppercase tracking-wider font-mono">Password</label>
                          {!isSignUp && (
                            <button
                              type="button"
                              onClick={() => setShowForgotPasswordPrompt(true)}
                              className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 hover:underline cursor-pointer"
                            >
                              Forgot Password?
                            </button>
                          )}
                        </div>
                        <input 
                          type="password" 
                          required 
                          placeholder="••••••••"
                          value={authPassword} 
                          onChange={e => setAuthPassword(e.target.value)}
                          className="w-full px-3 py-2.5 text-sm rounded-lg border border-slate-200 dark:border-gray-700 bg-slate-50 dark:bg-gray-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>

                      <button 
                        type="submit"
                        disabled={authLoading}
                        className="w-full py-3 rounded-lg bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white font-bold text-xs tracking-widest uppercase transition-all shadow-md shadow-emerald-700/10 cursor-pointer"
                      >
                        {authLoading ? 'Please wait...' : (isSignUp ? 'Sign Up' : 'Sign In')}
                      </button>
                    </form>

                    <div className="relative flex py-2 items-center">
                      <div className="flex-grow border-t border-slate-200 dark:border-gray-800"></div>
                      <span className="flex-shrink mx-4 text-gray-400 text-[10px] font-bold uppercase tracking-wider font-mono">or continue with</span>
                      <div className="flex-grow border-t border-slate-200 dark:border-gray-800"></div>
                    </div>

                    <button 
                      type="button"
                      onClick={handleGoogleSignIn}
                      disabled={authLoading}
                      className="w-full flex items-center justify-center gap-2.5 py-3 rounded-lg bg-slate-50 hover:bg-slate-100 dark:bg-gray-950 dark:hover:bg-gray-900 border border-slate-200 dark:border-gray-800 text-slate-700 dark:text-gray-300 font-bold text-xs tracking-widest uppercase transition-all shadow-sm cursor-pointer disabled:opacity-50"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.85z"/>
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.85c.87-2.6 3.3-4.53 6.16-4.53z"/>
                      </svg>
                      Google Account
                    </button>

                    <div className="text-center pt-4 border-t border-slate-100 dark:border-gray-800 text-xs">
                      <span className="text-slate-500 dark:text-gray-400">
                        {isSignUp ? 'Already have an account?' : 'Need contributor credentials?'}
                      </span>{' '}
                      <button 
                        onClick={() => { setIsSignUp(!isSignUp); setAuthError(''); setShowForgotPasswordPrompt(false); }}
                        className="text-emerald-700 dark:text-emerald-400 font-bold hover:underline font-mono"
                      >
                        {isSignUp ? 'Sign In Instead' : 'Register Contributor'}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* --- ROUTE 5: ADMIN DASHBOARD PANEL --- */}
              {currentPath === '/admin' && currentUserAuthor && (
                (currentUserAuthor.role === 'admin' || ['asareg365@gmail.com', 'pulsewireafrica@gmail.com'].map(e => e.toLowerCase()).includes(currentUserAuthor.email?.trim().toLowerCase() || '')) ? (
                  <AdminDashboard 
                    navigate={navigate} 
                    email={currentUserAuthor?.email || ''}
                    role={currentUserAuthor?.role || 'admin'}
                  />
                ) : (currentUserAuthor.role === 'editor' || currentUserAuthor.role === 'contributor') ? (
                  <ContributorDashboard navigate={navigate} />
                ) : (
                  <ReaderDashboard 
                    navigate={navigate} 
                    savedArticles={allArticles.filter(a => savedSlugs.includes(a.slug))} 
                    toggleSaveArticle={toggleSaveArticle} 
                  />
                )
              )}

              {/* --- ROUTE 6: CORPORATE & LEGAL INFO PAGES --- */}
              {currentPath.startsWith('/info/') && (
                <InfoPages initialPage={infoTab} onNavigate={navigate} />
              )}

            </motion.div>
          )}
        </AnimatePresence>

      </main>

      {/* Dynamic Sticky footer ad panel */}
      <AdSenseBanner 
        type="sticky" 
        contextTitle={selectedArticle?.title || articles[0]?.title}
        contextCategory={selectedArticle?.category || articles[0]?.category}
        contextTags={selectedArticle?.tags || articles[0]?.tags}
      />

      {/* Main Footer */}
      <Footer navigate={navigate} />

      {/* Newsletter Slide-In Modal */}
      <AnimatePresence>
        {showNewsletterModal && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            className="fixed bottom-20 right-4 sm:right-6 md:right-8 z-50 max-w-sm w-[calc(100vw-2rem)] p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4"
          >
            {/* Header / Dismiss */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 rounded-lg">
                  <Mail className="h-4.5 w-4.5" />
                </div>
                <h4 className="text-xs font-black text-slate-950 dark:text-white uppercase tracking-wider font-mono">
                  Join PulseWire News
                </h4>
              </div>
              <button
                onClick={() => setShowNewsletterModal(false)}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors cursor-pointer"
                aria-label="Dismiss newsletter"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Content description */}
            <div className="space-y-1.5">
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white leading-snug">
                Never miss an investigative scoop.
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-gray-400 leading-normal">
                Receive unbiased, hard-hitting African reports, tech breakdowns, and analysis sent directly to your inbox.
              </p>
            </div>

            {/* Subscription Form */}
            {newsletterSuccess ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40 rounded-xl p-3 text-center space-y-1"
              >
                <p className="text-xs font-bold text-emerald-800 dark:text-emerald-400">
                  Subscription Confirmed! 🎉
                </p>
                <p className="text-[10px] text-emerald-600 dark:text-emerald-500">
                  Thank you for joining our network.
                </p>
              </motion.div>
            ) : (
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (!newsletterEmail.trim()) return;
                  setNewsletterError('');
                  setNewsletterSubmitting(true);
                  try {
                    await subscribeNewsletter(newsletterEmail);
                    setNewsletterSuccess(true);
                    setTimeout(() => {
                      setShowNewsletterModal(false);
                    }, 3000);
                  } catch (err) {
                    console.error('Newsletter error:', err);
                    setNewsletterError('An error occurred. Please try again.');
                  } finally {
                    setNewsletterSubmitting(false);
                  }
                }}
                className="space-y-2"
              >
                <div className="relative">
                  <input
                    type="email"
                    required
                    placeholder="Enter your email address"
                    value={newsletterEmail}
                    onChange={(e) => setNewsletterEmail(e.target.value)}
                    disabled={newsletterSubmitting}
                    className="w-full text-xs px-3 py-2.5 rounded-xl border border-slate-200 dark:border-gray-800 bg-slate-50 dark:bg-gray-950 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500 disabled:opacity-60"
                  />
                </div>

                {newsletterError && (
                  <p className="text-[10px] font-bold text-rose-600 font-mono">
                    {newsletterError}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={newsletterSubmitting || !newsletterEmail.trim()}
                  className="w-full py-2 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white font-bold text-[10px] tracking-wider uppercase rounded-xl transition-all shadow-sm cursor-pointer"
                >
                  {newsletterSubmitting ? 'Securing subscription...' : 'Subscribe Now'}
                </button>
              </form>
            )}
          </motion.div>
        )}

        {showSessionExpiredModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="max-w-md w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-2xl text-center space-y-4"
            >
              <div className="mx-auto w-12 h-12 rounded-full bg-amber-50 dark:bg-amber-950/40 flex items-center justify-center text-amber-600 dark:text-amber-400">
                <Clock className="h-6 w-6" />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white font-sans">
                  Session Expired
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-sans">
                  For your security, you have been automatically logged out due to 30 minutes of inactivity. Please sign in again to resume your session.
                </p>
              </div>
              <button
                onClick={() => {
                  setShowSessionExpiredModal(false);
                  navigate('/login');
                }}
                className="w-full py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-md cursor-pointer"
              >
                Sign In Again
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
