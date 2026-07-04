import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  BookOpen, 
  MessageSquare, 
  PenTool, 
  Plus, 
  Edit, 
  Trash2, 
  Eye, 
  Heart, 
  Calendar, 
  TrendingUp, 
  User, 
  Clock, 
  Search, 
  Filter, 
  CheckCircle, 
  AlertCircle, 
  ExternalLink,
  ChevronRight,
  FileText,
  Bookmark
} from 'lucide-react';
import { 
  getAllArticles, 
  saveArticle, 
  deleteArticle, 
  getAllCommentsAcrossArticles 
} from '../lib/db';
import { Article, Author, Comment, CATEGORIES } from '../types';

interface ContributorDashboardProps {
  navigate: (path: string) => void;
  currentUser: Author;
}

export default function ContributorDashboard({ navigate, currentUser }: ContributorDashboardProps) {
  const [activeTab, setActiveTab] = useState<'articles' | 'write' | 'comments'>('articles');
  
  // State for data
  const [articles, setArticles] = useState<Article[]>([]);
  const [comments, setComments] = useState<(Comment & { articleTitle?: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'scheduled' | 'draft'>('all');

  // Form Editor State for creating/editing articles
  const [editingArticle, setEditingArticle] = useState<Article | null>(null);
  const [editorTitle, setEditorTitle] = useState('');
  const [editorSummary, setEditorSummary] = useState('');
  const [editorContent, setEditorContent] = useState('');
  const [editorCategory, setEditorCategory] = useState('ghana');
  const [editorSubCategory, setEditorSubCategory] = useState('');
  const [editorTags, setEditorTags] = useState('');
  const [editorFeaturedImage, setEditorFeaturedImage] = useState('');
  const [editorImageAlt, setEditorImageAlt] = useState('');
  const [editorStatus, setEditorStatus] = useState<'draft' | 'published' | 'scheduled'>('draft');
  const [editorPublishedAt, setEditorPublishedAt] = useState('');

  // Delete Confirmation State
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Load all contributor data
  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError('');
      
      // Fetch all articles (including drafts/scheduled)
      const allArticles = await getAllArticles(true);
      
      // Filter for current contributor's articles
      // Match by authorId or case-insensitive name match
      const matchedArticles = allArticles.filter(art => 
        art.authorId === currentUser.id || 
        art.authorName.toLowerCase() === currentUser.name.toLowerCase() ||
        (currentUser.email && art.authorId === currentUser.email)
      );
      
      // Sort articles by date descending
      matchedArticles.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setArticles(matchedArticles);

      // Fetch comments and filter for comments on this contributor's articles
      const allComments = await getAllCommentsAcrossArticles();
      const myArticleIds = new Set(matchedArticles.map(art => art.id));
      const myComments = allComments.filter(comment => myArticleIds.has(comment.articleId));
      
      setComments(myComments);
    } catch (err) {
      console.error("Error loading dashboard data:", err);
      setError("Failed to load dashboard records.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, [currentUser]);

  // Compute key stats
  const totalArticles = articles.length;
  const publishedArticles = articles.filter(art => art.status === 'published').length;
  const scheduledArticles = articles.filter(art => art.status === 'scheduled').length;
  const draftArticles = articles.filter(art => art.status === 'draft').length;
  
  const totalViews = articles.reduce((sum, art) => sum + (art.views || 0), 0);
  const totalLikes = articles.reduce((sum, art) => sum + (art.likes || 0), 0);

  // Reset form editor helper
  const resetEditor = () => {
    setEditingArticle(null);
    setEditorTitle('');
    setEditorSummary('');
    setEditorContent('');
    setEditorCategory('ghana');
    setEditorSubCategory('');
    setEditorTags('');
    setEditorFeaturedImage('');
    setEditorImageAlt('');
    setEditorStatus('draft');
    setEditorPublishedAt(new Date().toISOString());
  };

  // Open editor for writing new story
  const handleWriteNewStory = () => {
    resetEditor();
    setActiveTab('write');
  };

  // Open editor with loaded article
  const handleEditStory = (art: Article) => {
    setEditingArticle(art);
    setEditorTitle(art.title);
    setEditorSummary(art.summary);
    setEditorContent(art.content);
    setEditorCategory(art.category || 'ghana');
    setEditorSubCategory(art.subCategory || '');
    setEditorTags(art.tags.join(', '));
    setEditorFeaturedImage(art.featuredImage || '');
    setEditorImageAlt(art.imageAlt || '');
    setEditorStatus(art.status);
    setEditorPublishedAt(art.publishedAt || new Date().toISOString());
    setActiveTab('write');
  };

  // Save story action
  const handleSaveStory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editorTitle.trim() || !editorContent.trim() || !editorSummary.trim()) {
      setError('Title, summary, and content are required fields.');
      return;
    }

    try {
      setError('');
      setSuccess('');

      const slug = editingArticle?.slug || editorTitle
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim();

      const updatedArticle: Article = {
        id: editingArticle?.id || `art_${Date.now()}`,
        title: editorTitle,
        slug: slug,
        summary: editorSummary,
        content: editorContent,
        category: editorCategory,
        categories: [editorCategory],
        subCategory: editorSubCategory || undefined,
        tags: editorTags.split(',').map(t => t.trim()).filter(Boolean),
        featuredImage: editorFeaturedImage || 'https://images.unsplash.com/photo-1495020689067-958852a6565d?auto=format&fit=crop&q=80&w=800',
        imageAlt: editorImageAlt || undefined,
        images: editingArticle?.images || [],
        status: editorStatus,
        views: editingArticle?.views || 0,
        likes: editingArticle?.likes || 0,
        shareCount: editingArticle?.shareCount || 0,
        isSponsored: editingArticle?.isSponsored || false,
        isAffiliate: editingArticle?.isAffiliate || false,
        authorId: currentUser.email || currentUser.id,
        authorName: currentUser.name,
        createdAt: editingArticle?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        publishedAt: editorStatus === 'scheduled'
          ? (editorPublishedAt || editingArticle?.publishedAt || new Date().toISOString())
          : (editorStatus === 'published' && editingArticle?.status !== 'published' ? new Date().toISOString() : (editingArticle?.publishedAt || new Date().toISOString()))
      };

      await saveArticle(updatedArticle);
      setSuccess(editingArticle ? 'Story updated successfully!' : 'Story created successfully!');
      
      // Reload and return
      resetEditor();
      await loadDashboardData();
      setActiveTab('articles');
    } catch (err) {
      console.error("Error saving story:", err);
      setError('Failed to save the story. Please try again.');
    }
  };

  // Delete article action
  const handleDeleteArticle = async (id: string) => {
    try {
      setError('');
      setSuccess('');
      await deleteArticle(id);
      setSuccess('Article removed successfully.');
      setDeleteConfirmId(null);
      await loadDashboardData();
    } catch (err) {
      console.error("Error deleting article:", err);
      setError('Failed to remove the article.');
    }
  };

  // Filtered articles based on search query and status filter
  const filteredArticles = articles.filter(art => {
    const matchesSearch = art.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          art.summary.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || art.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div id="contributor-dashboard-container" className="max-w-6xl mx-auto py-6 px-4">
      {/* Contributor Profile Header */}
      <div 
        id="contributor-profile-banner"
        className="flex flex-col md:flex-row items-center justify-between gap-6 bg-linear-to-br from-slate-50 to-white dark:from-slate-900/40 dark:to-slate-900/10 border border-slate-200/80 dark:border-slate-800/80 rounded-3xl p-6 md:p-8 shadow-xs mb-8"
      >
        <div className="flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
          <img 
            src={(currentUser.avatar && currentUser.avatar !== "") ? currentUser.avatar : `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser.name || 'Contributor')}&background=059669&color=fff&bold=true`} 
            alt={currentUser.name} 
            className="w-16 h-16 rounded-full object-cover border-2 border-emerald-500/20 shadow-md shrink-0"
            referrerPolicy="no-referrer"
          />
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 justify-center sm:justify-start">
              <h1 className="text-xl md:text-2xl font-black text-slate-950 dark:text-white font-sans tracking-tight">
                Welcome back, {currentUser.name}
              </h1>
              <span className="self-center inline-block px-2.5 py-0.5 text-[9px] font-bold text-emerald-800 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900/50 rounded-full font-mono uppercase tracking-wider">
                {currentUser.role}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-sans">
              Author bio & stats profile • Verified PulseWire Contributor
            </p>
          </div>
        </div>

        <button
          id="write-story-top-btn"
          onClick={handleWriteNewStory}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white font-bold text-xs font-mono transition-all duration-200 hover:shadow-md cursor-pointer self-stretch sm:self-center text-center justify-center"
        >
          <Plus className="h-4 w-4" />
          <span>Write New Story</span>
        </button>
      </div>

      {/* Notifications banner */}
      {success && (
        <div id="dashboard-success-alert" className="flex items-center gap-3 p-4 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/30 rounded-2xl text-emerald-800 dark:text-emerald-400 text-xs font-mono mb-8">
          <CheckCircle className="h-4.5 w-4.5 text-emerald-600" />
          <span>{success}</span>
        </div>
      )}

      {error && (
        <div id="dashboard-error-alert" className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30 rounded-2xl text-red-800 dark:text-red-400 text-xs font-mono mb-8">
          <AlertCircle className="h-4.5 w-4.5 text-red-600" />
          <span>{error}</span>
        </div>
      )}

      {/* STATS OVERVIEW SECTION */}
      <div id="contributor-metrics-grid" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {/* Stat: Total Publications */}
        <div className="bg-white dark:bg-slate-900/20 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-5 hover:border-emerald-500/30 transition-all duration-300">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider font-mono">My Articles</p>
              <p className="text-2xl font-black text-slate-950 dark:text-white font-sans mt-1">{totalArticles}</p>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 text-slate-500">
              <BookOpen className="h-4 w-4" />
            </div>
          </div>
          <div className="flex items-center gap-1.5 mt-3 text-[10px] text-slate-500 font-mono">
            <span className="text-emerald-600 font-bold">{publishedArticles} Published</span>
            <span>•</span>
            <span className="text-amber-600 font-bold">{scheduledArticles} Scheduled</span>
          </div>
        </div>

        {/* Stat: Cumulative Views */}
        <div className="bg-white dark:bg-slate-900/20 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-5 hover:border-emerald-500/30 transition-all duration-300">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider font-mono">Total Views</p>
              <p className="text-2xl font-black text-slate-950 dark:text-white font-sans mt-1">{totalViews}</p>
            </div>
            <div className="p-2.5 rounded-lg bg-emerald-50/50 dark:bg-emerald-950/10 border border-emerald-100/50 dark:border-emerald-900/30 text-emerald-600">
              <Eye className="h-4 w-4" />
            </div>
          </div>
          <div className="flex items-center gap-1.5 mt-3 text-[10px] text-slate-500 font-mono">
            <TrendingUp className="h-3 w-3 text-emerald-500" />
            <span>Across all published contributions</span>
          </div>
        </div>

        {/* Stat: Total Likes */}
        <div className="bg-white dark:bg-slate-900/20 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-5 hover:border-emerald-500/30 transition-all duration-300">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider font-mono">Total Likes</p>
              <p className="text-2xl font-black text-slate-950 dark:text-white font-sans mt-1">{totalLikes}</p>
            </div>
            <div className="p-2.5 rounded-lg bg-pink-50/50 dark:bg-pink-950/10 border border-pink-100/50 dark:border-pink-900/30 text-pink-600">
              <Heart className="h-4 w-4" />
            </div>
          </div>
          <div className="flex items-center gap-1.5 mt-3 text-[10px] text-slate-500 font-mono">
            <span>Engagement rate:</span>
            <span className="text-pink-600 font-bold">{totalArticles ? ((totalLikes / totalArticles).toFixed(1)) : 0} likes/avg</span>
          </div>
        </div>

        {/* Stat: Comments & Feedback */}
        <div className="bg-white dark:bg-slate-900/20 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-5 hover:border-emerald-500/30 transition-all duration-300">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider font-mono">Comments</p>
              <p className="text-2xl font-black text-slate-950 dark:text-white font-sans mt-1">{comments.length}</p>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 text-slate-500">
              <MessageSquare className="h-4 w-4" />
            </div>
          </div>
          <div className="flex items-center gap-1.5 mt-3 text-[10px] text-slate-500 font-mono">
            <span>Recent comments on your work</span>
          </div>
        </div>
      </div>

      {/* INNER DASHBOARD NAVIGATION */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 mb-6 gap-6 overflow-x-auto">
        <button
          onClick={() => setActiveTab('articles')}
          className={`pb-3 text-xs font-bold font-mono uppercase tracking-wider border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'articles' 
              ? 'border-emerald-600 text-emerald-600' 
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
          }`}
        >
          My Publications ({articles.length})
        </button>
        <button
          onClick={() => setActiveTab('write')}
          className={`pb-3 text-xs font-bold font-mono uppercase tracking-wider border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'write' 
              ? 'border-emerald-600 text-emerald-600' 
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
          }`}
        >
          {editingArticle ? `Edit: ${editingArticle.title.substring(0, 20)}...` : 'Write Story'}
        </button>
        <button
          onClick={() => setActiveTab('comments')}
          className={`pb-3 text-xs font-bold font-mono uppercase tracking-wider border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'comments' 
              ? 'border-emerald-600 text-emerald-600' 
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
          }`}
        >
          Comments Activities ({comments.length})
        </button>
      </div>

      {/* TAB CONTENT: ARTICLES */}
      {activeTab === 'articles' && (
        <div id="tab-my-publications" className="space-y-6">
          {/* Controls: Search and Filters */}
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="relative w-full sm:max-w-xs">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input 
                type="text"
                placeholder="Search my stories..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-gray-900 dark:text-white"
              />
            </div>

            <div className="flex items-center gap-2 self-stretch sm:self-auto overflow-x-auto">
              <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider font-mono whitespace-nowrap flex items-center gap-1">
                <Filter className="h-3 w-3" /> Status:
              </span>
              {(['all', 'published', 'scheduled', 'draft'] as const).map(st => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-3 py-1 text-[10px] font-bold uppercase font-mono rounded-full border transition-all cursor-pointer ${
                    statusFilter === st
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                      : 'bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:border-slate-300'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 space-y-3">
              <div className="w-8 h-8 rounded-full border-2 border-emerald-600 border-t-transparent animate-spin" />
              <p className="text-xs text-slate-500 font-mono">Loading articles...</p>
            </div>
          ) : filteredArticles.length === 0 ? (
            <div className="text-center py-20 border border-dashed border-slate-200 dark:border-slate-800 rounded-3xl text-slate-500 font-mono">
              {searchQuery ? "No matching publications found." : "You haven't written any articles yet."}
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-900/10 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                      <th className="p-4 text-[10px] font-bold uppercase tracking-wider font-mono text-slate-500 dark:text-slate-400">Story Title</th>
                      <th className="p-4 text-[10px] font-bold uppercase tracking-wider font-mono text-slate-500 dark:text-slate-400">Category</th>
                      <th className="p-4 text-[10px] font-bold uppercase tracking-wider font-mono text-slate-500 dark:text-slate-400 text-center">Status</th>
                      <th className="p-4 text-[10px] font-bold uppercase tracking-wider font-mono text-slate-500 dark:text-slate-400 text-center">Views</th>
                      <th className="p-4 text-[10px] font-bold uppercase tracking-wider font-mono text-slate-500 dark:text-slate-400 text-center">Likes</th>
                      <th className="p-4 text-[10px] font-bold uppercase tracking-wider font-mono text-slate-500 dark:text-slate-400">Date Added</th>
                      <th className="p-4 text-[10px] font-bold uppercase tracking-wider font-mono text-slate-500 dark:text-slate-400 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredArticles.map(art => (
                      <tr 
                        key={art.id} 
                        className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50/40 dark:hover:bg-slate-900/10 transition-colors"
                      >
                        <td className="p-4">
                          <div className="max-w-md">
                            <button
                              onClick={() => navigate(`/article/${art.slug}`)}
                              className="text-xs font-bold text-slate-900 dark:text-white hover:text-emerald-600 dark:hover:text-emerald-400 hover:underline text-left cursor-pointer transition-colors block font-sans"
                            >
                              {art.title}
                            </button>
                            <p className="text-[10px] text-slate-400 line-clamp-1 mt-0.5 font-sans font-normal">
                              {art.summary}
                            </p>
                          </div>
                        </td>
                        <td className="p-4">
                          <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider font-mono bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200/50 dark:border-slate-800">
                            {art.category}
                          </span>
                        </td>
                        <td className="p-4 text-center">
                          <span className={`inline-block px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider font-mono ${
                            art.status === 'published'
                              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-100/50 dark:border-emerald-900/30'
                              : art.status === 'scheduled'
                              ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-100/50 dark:border-amber-900/30'
                              : 'bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200/50 dark:border-slate-800'
                          }`}>
                            {art.status}
                          </span>
                          {art.status === 'scheduled' && art.publishedAt && (
                            <span className="block text-[8px] text-amber-600 dark:text-amber-500 font-mono mt-1">
                              {new Date(art.publishedAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                            </span>
                          )}
                        </td>
                        <td className="p-4 text-center text-xs font-mono font-semibold text-slate-700 dark:text-slate-300">
                          {art.views || 0}
                        </td>
                        <td className="p-4 text-center text-xs font-mono font-semibold text-slate-700 dark:text-slate-300">
                          {art.likes || 0}
                        </td>
                        <td className="p-4 text-xs font-mono text-slate-500 dark:text-slate-400">
                          {new Date(art.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                        </td>
                        <td className="p-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleEditStory(art)}
                              className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-900 transition-colors cursor-pointer"
                              title="Edit Story"
                            >
                              <Edit className="h-4 w-4" />
                            </button>

                            {deleteConfirmId === art.id ? (
                              <div className="flex items-center gap-1.5">
                                <button
                                  onClick={() => handleDeleteArticle(art.id)}
                                  className="px-2 py-0.5 bg-red-600 text-white rounded font-mono font-bold text-[9px] uppercase tracking-wider hover:bg-red-700"
                                >
                                  Confirm
                                </button>
                                <button
                                  onClick={() => setDeleteConfirmId(null)}
                                  className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded font-mono font-bold text-[9px] uppercase tracking-wider hover:bg-slate-200"
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => setDeleteConfirmId(art.id)}
                                className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-950/20 text-slate-400 hover:text-red-600 transition-colors cursor-pointer"
                                title="Remove Story"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT: WRITE / EDIT FORM */}
      {activeTab === 'write' && (
        <div id="tab-write-story" className="max-w-4xl mx-auto">
          <form onSubmit={handleSaveStory} className="space-y-6 bg-white dark:bg-slate-900/10 border border-slate-200/80 dark:border-slate-800/80 rounded-3xl p-6 md:p-8 shadow-xs">
            <div className="flex justify-between items-center pb-4 border-b border-slate-100 dark:border-slate-800">
              <h2 className="text-base font-black text-slate-950 dark:text-white font-sans tracking-tight">
                {editingArticle ? 'Update Pre-existing Publication' : 'Draft & Author a New Story'}
              </h2>
              {editingArticle && (
                <button
                  type="button"
                  onClick={resetEditor}
                  className="text-xs text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-400 hover:underline font-mono"
                >
                  Clear & Write New instead
                </button>
              )}
            </div>

            {/* Title input */}
            <div>
              <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest font-mono mb-2">
                Story Title
              </label>
              <input
                type="text"
                value={editorTitle}
                onChange={e => setEditorTitle(e.target.value)}
                placeholder="Give your story a catchy, professional headline..."
                className="w-full px-4 py-2.5 rounded-xl bg-slate-50/50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800/80 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 text-gray-900 dark:text-white font-sans font-semibold"
              />
            </div>

            {/* Summary input */}
            <div>
              <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest font-mono mb-2">
                Short Summary
              </label>
              <textarea
                value={editorSummary}
                onChange={e => setEditorSummary(e.target.value)}
                rows={2}
                placeholder="Brief subtitle or introductory snippet that shows on article list previews..."
                className="w-full px-4 py-3 rounded-xl bg-slate-50/50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800/80 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 text-gray-900 dark:text-white font-sans leading-relaxed"
              />
            </div>

            {/* Category / Subcategory */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest font-mono mb-2">
                  Primary Category
                </label>
                <select
                  value={editorCategory}
                  onChange={e => setEditorCategory(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50/50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800/80 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 text-gray-900 dark:text-white font-sans font-medium capitalize"
                >
                  {CATEGORIES.map(cat => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest font-mono mb-2">
                  Subcategory (Optional)
                </label>
                <input
                  type="text"
                  value={editorSubCategory}
                  onChange={e => setEditorSubCategory(e.target.value)}
                  placeholder="e.g. Accra, Premier League, Startup Spotlight..."
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50/50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800/80 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 text-gray-900 dark:text-white font-sans"
                />
              </div>
            </div>

            {/* Featured Image */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest font-mono mb-2">
                  Featured Image URL
                </label>
                <input
                  type="text"
                  value={editorFeaturedImage}
                  onChange={e => setEditorFeaturedImage(e.target.value)}
                  placeholder="https://images.unsplash.com/..."
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50/50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800/80 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 text-gray-900 dark:text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest font-mono mb-2">
                  Image Alt Description
                </label>
                <input
                  type="text"
                  value={editorImageAlt}
                  onChange={e => setEditorImageAlt(e.target.value)}
                  placeholder="Describe image context for visual accessibility..."
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50/50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800/80 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 text-gray-900 dark:text-white font-sans"
                />
              </div>
            </div>

            {/* Tags */}
            <div>
              <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest font-mono mb-2">
                Keywords & Tags
              </label>
              <input
                type="text"
                value={editorTags}
                onChange={e => setEditorTags(e.target.value)}
                placeholder="ghana, technology, innovation, finance (comma separated)"
                className="w-full px-4 py-2.5 rounded-xl bg-slate-50/50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800/80 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 text-gray-900 dark:text-white font-sans"
              />
            </div>

            {/* Rich Content Textarea */}
            <div>
              <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest font-mono mb-2">
                Article Body Content
              </label>
              <textarea
                value={editorContent}
                onChange={e => setEditorContent(e.target.value)}
                rows={12}
                placeholder="Author your news coverage, research article, or analysis story here. Supports basic paragraph structures, spacing, or markdown notation..."
                className="w-full px-4 py-4 rounded-xl bg-slate-50/50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800/80 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 text-gray-900 dark:text-white font-mono leading-relaxed"
              />
            </div>

            {/* Publishing Controls */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-slate-100 dark:border-slate-800">
              <div>
                <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest font-mono mb-2">
                  Publishing Status
                </label>
                <select
                  value={editorStatus}
                  onChange={e => setEditorStatus(e.target.value as any)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50/50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800/80 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 text-gray-900 dark:text-white font-sans font-medium"
                >
                  <option value="draft">Draft State</option>
                  <option value="published">Publish Instantly</option>
                  <option value="scheduled">Scheduled Publication</option>
                </select>
              </div>

              {editorStatus === 'scheduled' && (
                <div>
                  <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest font-mono mb-2">
                    Scheduled Time
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
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-50/50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800/80 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 text-gray-900 dark:text-white font-mono"
                  />
                  <p className="text-[9px] text-amber-600 dark:text-amber-500 mt-1 font-mono">
                    Article status will automatically shift to published when due date/time is passed.
                  </p>
                </div>
              )}
            </div>

            {/* Buttons */}
            <div className="flex justify-end gap-3 pt-4">
              <button
                type="button"
                onClick={() => {
                  resetEditor();
                  setActiveTab('articles');
                }}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold text-xs font-mono transition-colors cursor-pointer"
              >
                Discard Changes
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs font-mono transition-colors shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                <PenTool className="h-4 w-4" />
                <span>{editingArticle ? 'Update Publication' : 'Add Publication'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB CONTENT: COMMENTS */}
      {activeTab === 'comments' && (
        <div id="tab-audience-comments" className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-sm font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest font-mono">
              Audience Engagement & Comments
            </h2>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 space-y-3">
              <div className="w-8 h-8 rounded-full border-2 border-emerald-600 border-t-transparent animate-spin" />
              <p className="text-xs text-slate-500 font-mono">Loading audience feedback...</p>
            </div>
          ) : comments.length === 0 ? (
            <div className="text-center py-20 border border-dashed border-slate-200 dark:border-slate-800 rounded-3xl text-slate-500 font-mono">
              No comments have been posted on your articles yet.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {comments.map(comm => (
                <div 
                  key={comm.id}
                  className="flex gap-4 p-5 bg-white dark:bg-slate-900/10 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl relative shadow-xs"
                >
                  <img
                    src={(comm.authorAvatar && comm.authorAvatar !== "") ? comm.authorAvatar : `https://ui-avatars.com/api/?name=${encodeURIComponent(comm.authorName || 'Anonymous')}&background=f1f5f9&color=dc2626&bold=true`}
                    alt={comm.authorName}
                    className="w-10 h-10 rounded-full object-cover shrink-0 border border-slate-100 dark:border-slate-800"
                    referrerPolicy="no-referrer"
                  />
                  <div className="flex-1 space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <span className="text-xs font-bold text-slate-900 dark:text-white font-sans">{comm.authorName}</span>
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono ml-2">
                          {new Date(comm.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                      </div>
                      
                      {/* Approved Badge */}
                      <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider font-mono ${
                        comm.approved
                          ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border border-emerald-100/50 dark:border-emerald-900/20'
                          : 'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border border-amber-100/50 dark:border-amber-900/20'
                      }`}>
                        {comm.approved ? 'Approved' : 'Pending Review'}
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-sans">
                      {comm.content}
                    </p>

                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800/50 flex items-center justify-between">
                      <span className="text-[9px] text-slate-400 dark:text-slate-500 font-mono">
                        On Article: <span className="font-bold text-slate-500 dark:text-slate-400">{comm.articleTitle || "PulseWire Publication"}</span>
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
