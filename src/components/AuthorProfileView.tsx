import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, Mail, Twitter, Linkedin, Award, BookOpen, Clock, Heart } from 'lucide-react';
import { getAllArticles, getAllAuthors } from '../lib/db';
import { Article, Author } from '../types';
import { getAuthorProfileDetails } from './AuthorBioCard';

interface AuthorProfileViewProps {
  authorName: string;
  navigate: (path: string) => void;
}

export default function AuthorProfileView({ authorName, navigate }: AuthorProfileViewProps) {
  const [profile, setProfile] = useState(() => getAuthorProfileDetails(authorName));
  const [authorArticles, setAuthorArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function loadAuthorData() {
      try {
        setLoading(true);
        // 1. Load articles
        const all = await getAllArticles();
        if (!active) return;
        
        // Filter published articles where author name matches (case insensitive or substring)
        const normalizedSearch = (authorName || '').trim().toLowerCase();
        const filtered = all.filter(art => {
          const name = (art.authorName || '').toLowerCase();
          return name === normalizedSearch || normalizedSearch.includes(name) || name.includes(normalizedSearch);
        });
        setAuthorArticles(filtered);

        // 2. Try loading dynamic profile details from DB
        const allAuthors = await getAllAuthors();
        if (!active) return;

        const matchedDbAuthor = allAuthors.find(a => {
          const n = (a.name || '').toLowerCase();
          return n === normalizedSearch || normalizedSearch.includes(n) || n.includes(normalizedSearch);
        });

        if (matchedDbAuthor) {
          setProfile({
            name: matchedDbAuthor.name,
            role: matchedDbAuthor.role || 'PulseWire Contributor',
            bio: matchedDbAuthor.bio || getAuthorProfileDetails(authorName).bio,
            avatar: matchedDbAuthor.avatar || getAuthorProfileDetails(authorName).avatar,
            email: matchedDbAuthor.email,
            twitter: matchedDbAuthor.twitter,
            linkedin: matchedDbAuthor.linkedin
          });
        }
      } catch (err) {
        console.error("Error loading author profile data:", err);
      } finally {
        if (active) setLoading(false);
      }
    }

    loadAuthorData();
    return () => {
      active = false;
    };
  }, [authorName]);

  // Compute total views and total likes
  const totalViews = authorArticles.reduce((sum, art) => sum + (art.views || 0), 0);
  const totalLikes = authorArticles.reduce((sum, art) => sum + (art.likes || 0), 0);

  return (
    <div id="author-profile-page" className="max-w-5xl mx-auto py-6 px-4">
      {/* Back Navigation */}
      <button
        id="author-profile-back-btn"
        onClick={() => window.history.length > 1 ? window.history.back() : navigate('/')}
        className="group flex items-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors font-mono mb-8 cursor-pointer"
      >
        <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
        <span>Return to Feed</span>
      </button>

      {/* Profile Header Card */}
      <div 
        id="author-profile-card"
        className="relative overflow-hidden rounded-3xl bg-linear-to-br from-slate-50 to-white dark:from-slate-900/40 dark:to-slate-900/10 border border-slate-200/80 dark:border-slate-800/85 p-6 md:p-8 shadow-sm mb-12"
      >
        {/* Decorative ambient gradient */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row items-center md:items-start gap-6 md:gap-8 relative z-10">
          {/* Avatar with status/award icon */}
          <div className="relative shrink-0">
            <img
              src={profile.avatar}
              alt={profile.name}
              className="w-24 h-24 md:w-28 md:h-28 rounded-full object-cover border-4 border-white dark:border-slate-900 shadow-md"
              referrerPolicy="no-referrer"
            />
            <div className="absolute -bottom-1 -right-1 bg-emerald-600 text-white p-1.5 rounded-full shadow-md">
              <Award className="h-4 w-4" />
            </div>
          </div>

          {/* Profile text details */}
          <div className="flex-1 text-center md:text-left space-y-3">
            <div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-center md:justify-start gap-2">
                <h1 className="text-2xl md:text-3xl font-extrabold text-slate-950 dark:text-white font-sans tracking-tight">
                  {profile.name}
                </h1>
                <span className="self-center inline-block px-2.5 py-0.5 text-[10px] font-bold text-emerald-800 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900/50 rounded-full font-mono uppercase tracking-wider">
                  Verified Contributor
                </span>
              </div>
              <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 font-mono tracking-tight mt-1.5">
                {profile.role}
              </p>
            </div>

            <p className="text-sm md:text-base text-slate-600 dark:text-slate-300 leading-relaxed font-sans max-w-3xl">
              {profile.bio}
            </p>

            {/* Social links & contacts */}
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 pt-2">
              <a
                href={`mailto:${profile.email}`}
                className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors font-mono"
              >
                <Mail className="h-4 w-4 text-slate-400" />
                <span>{profile.email}</span>
              </a>

              {profile.twitter && (
                <a
                  href={`https://twitter.com/${profile.twitter}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors font-mono"
                >
                  <Twitter className="h-4 w-4 text-slate-400" />
                  <span>@{profile.twitter}</span>
                </a>
              )}

              {profile.linkedin && (
                <a
                  href={`https://linkedin.com/in/${profile.linkedin}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors font-mono"
                >
                  <Linkedin className="h-4 w-4 text-slate-400" />
                  <span>LinkedIn</span>
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-4 border-t border-slate-200/60 dark:border-slate-800/60 mt-8 pt-6 relative z-10 text-center">
          <div className="space-y-1">
            <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest font-mono">Stories</p>
            <p className="text-xl md:text-2xl font-black text-slate-900 dark:text-white font-sans">{authorArticles.length}</p>
          </div>
          <div className="space-y-1 border-x border-slate-200/60 dark:border-slate-800/60">
            <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest font-mono">Total Views</p>
            <p className="text-xl md:text-2xl font-black text-slate-900 dark:text-white font-sans">{totalViews}</p>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest font-mono">Total Likes</p>
            <p className="text-xl md:text-2xl font-black text-slate-900 dark:text-white font-sans">{totalLikes}</p>
          </div>
        </div>
      </div>

      {/* Published Articles List */}
      <div id="author-publications-section">
        <h2 className="text-xl font-extrabold text-slate-900 dark:text-white font-sans tracking-tight mb-6 flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-emerald-600 dark:text-emerald-500" />
          <span>Published Publications</span>
          <span className="text-xs bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded-full font-mono font-bold">
            {authorArticles.length}
          </span>
        </h2>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-3">
            <div className="w-8 h-8 rounded-full border-2 border-emerald-600 border-t-transparent animate-spin" />
            <p className="text-xs text-slate-500 font-mono">Loading publications...</p>
          </div>
        ) : authorArticles.length === 0 ? (
          <div className="text-center py-20 border border-dashed border-slate-200 dark:border-slate-800 rounded-3xl text-slate-500 font-mono">
            No active publications by this contributor yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {authorArticles.map((art, index) => (
              <motion.div
                id={`author-art-card-${art.id}`}
                key={art.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
                onClick={() => navigate(`/article/${art.slug}`)}
                className="group flex flex-col bg-white dark:bg-slate-900/20 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl overflow-hidden hover:border-emerald-500/50 dark:hover:border-emerald-500/50 hover:shadow-md transition-all duration-300 cursor-pointer h-full"
              >
                {/* Featured Image */}
                <div className="relative aspect-[16/10] overflow-hidden bg-slate-100 dark:bg-slate-800 border-b border-slate-200/60 dark:border-slate-800/60">
                  <img
                    src={art.featuredImage}
                    alt={art.imageAlt || art.title}
                    className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-500"
                    referrerPolicy="no-referrer"
                  />
                  {/* Category Badge */}
                  <span className="absolute top-3 left-3 bg-slate-950/80 text-white text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded font-mono backdrop-blur-xs">
                    {art.category}
                  </span>
                </div>

                {/* Content */}
                <div className="p-4 flex-1 flex flex-col justify-between space-y-4">
                  <div className="space-y-2">
                    <h3 className="text-sm md:text-base font-bold text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors font-sans leading-snug line-clamp-2">
                      {art.title}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-3 font-sans leading-relaxed">
                      {art.summary}
                    </p>
                  </div>

                  {/* Footers */}
                  <div className="flex items-center justify-between text-[10px] text-slate-400 dark:text-slate-500 font-mono pt-3 border-t border-slate-100 dark:border-slate-800/50">
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3 shrink-0" />
                      <span>{new Date(art.publishedAt || art.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <span className="flex items-center gap-0.5">
                        <BookOpen className="h-3 w-3" /> {art.views || 0}
                      </span>
                      <span className="flex items-center gap-0.5">
                        <Heart className="h-3 w-3" /> {art.likes || 0}
                      </span>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
