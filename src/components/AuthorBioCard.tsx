import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronDown, ChevronUp, Mail, Twitter, Linkedin, Award, BookOpen } from 'lucide-react';
import { getAllAuthors } from '../lib/db';

interface AuthorProfile {
  role: string;
  bio: string;
  avatar: string;
  email: string;
  twitter?: string;
  linkedin?: string;
}

const AUTHOR_PROFILES: Record<string, AuthorProfile> = {
  'george oppong asare': {
    role: "Founder & Chief Editor",
    bio: "George Oppong Asare oversees all editorial operations, deep-dive investigations, and strategic bureau expansion across West Africa. He is a seasoned investigative journalist with over a decade of experience tracking economic development, public governance, and trade infrastructure on the continent.",
    avatar: "https://ui-avatars.com/api/?name=George+Oppong+Asare&background=f1f5f9&color=dc2626&bold=true&size=256",
    email: "editor@pulsewireafrica.news",
    twitter: "GeorgeAsarePW",
    linkedin: "george-oppong-asare"
  },
  'christian asare-tuah': {
    role: "Chief Administrator & Lead Editor",
    bio: "Christian manages day-to-day operations, editorial standards, and newsroom workflows. An expert in regional economic integration and development models, he ensures PulseWire's reporting remains hyper-factual, highly contextualized, and fully independent.",
    avatar: "https://ui-avatars.com/api/?name=Christian+Asare-Tuah&background=e0f2fe&color=0284c7&bold=true&size=256",
    email: "admin@pulsewireafrica.news",
    twitter: "CAT_PulseWire",
    linkedin: "christian-asare-tuah"
  },
  'ama serwaa': {
    role: "Senior Tech & Business Correspondent",
    bio: "Ama reports on tech ecosystems, financial inclusion, and the startup landscape redefining West and East African commerce. With a background in financial economics, her columns analyze how digital technologies bypass traditional market barriers.",
    avatar: "https://ui-avatars.com/api/?name=Ama+Serwaa&background=fdf2f8&color=db2777&bold=true&size=256",
    email: "ama.serwaa@pulsewireafrica.news",
    twitter: "AmaSerwaaTech"
  },
  'kofi owusu': {
    role: "Regional Politics & Governance Analyst",
    bio: "Kofi focuses on democratic transitions, election integrity, and multilateral diplomatic relationships within the ECOWAS and African Union blocs. He has covered multiple historic elections and specializes in constitutional reform policy.",
    avatar: "https://ui-avatars.com/api/?name=Kofi+Owusu&background=f0fdf4&color=16a34a&bold=true&size=256",
    email: "kofi.owusu@pulsewireafrica.news",
    twitter: "KofiOwusuGov"
  },
  'abidemi babangida': {
    role: "Investigative Reporter & Energy Correspondent",
    bio: "Abidemi leads investigative coverage on climate policy, infrastructure funding, oil & gas concessions, and the green transition in sub-Saharan Africa. She is a recipient of several journalism awards for environmental reporting.",
    avatar: "https://ui-avatars.com/api/?name=Abidemi+Babangida&background=fef9c3&color=ca8a04&bold=true&size=256",
    email: "abidemi.b@pulsewireafrica.news",
    twitter: "AbidemiEnergy"
  }
};

interface AuthorBioCardProps {
  authorName: string;
  onSearchAuthor: (name: string) => void;
}

export function getAuthorProfileDetails(authorName: string): { name: string } & AuthorProfile {
  const normalizedSearch = (authorName || '').trim().toLowerCase();
  
  // Try exact match or substring match
  let matchedKey = Object.keys(AUTHOR_PROFILES).find(key => 
    key === normalizedSearch || normalizedSearch.includes(key) || key.includes(normalizedSearch)
  );

  if (matchedKey && AUTHOR_PROFILES[matchedKey]) {
    // Return matched profile with capital letter casing from keys or from parameter
    const profile = AUTHOR_PROFILES[matchedKey];
    // Capitalize matching key name nicely
    const name = matchedKey.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    return { name, ...profile };
  }

  // Fallback profile using dynamic initials
  const nameToUse = (authorName || 'PulseWire Contributor').trim();
  const avatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(nameToUse)}&background=f1f5f9&color=dc2626&bold=true&size=256`;

  return {
    name: nameToUse,
    role: "PulseWire Contributing Writer",
    bio: `${nameToUse} is a dedicated journalist reporting on key developments, regional insights, and in-depth investigations for the PulseWire news bureau across Sub-Saharan Africa.`,
    avatar,
    email: "editorial@pulsewireafrica.news"
  };
}

export default function AuthorBioCard({ authorName, onSearchAuthor }: AuthorBioCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [profile, setProfile] = useState(() => getAuthorProfileDetails(authorName));

  useEffect(() => {
    let active = true;
    async function loadDynamicProfile() {
      try {
        const allAuthors = await getAllAuthors();
        if (!active) return;
        const normalizedSearch = (authorName || '').trim().toLowerCase();
        
        const matchedDbAuthor = allAuthors.find(a => {
          const n = (a.name || '').toLowerCase();
          return n === normalizedSearch || normalizedSearch.includes(n) || n.includes(normalizedSearch);
        });
        
        if (matchedDbAuthor) {
          setProfile({
            name: matchedDbAuthor.name,
            role: matchedDbAuthor.role,
            bio: matchedDbAuthor.bio,
            avatar: matchedDbAuthor.avatar,
            email: matchedDbAuthor.email,
            twitter: matchedDbAuthor.twitter,
            linkedin: matchedDbAuthor.linkedin
          });
        }
      } catch (err) {
        console.error("Error loading dynamic author profile:", err);
      }
    }
    loadDynamicProfile();
    return () => {
      active = false;
    };
  }, [authorName]);

  return (
    <div 
      id={`author-bio-${profile.name.toLowerCase().replace(/\s+/g, '-')}`}
      className="my-8 overflow-hidden rounded-2xl bg-slate-50 dark:bg-slate-900/30 border border-slate-200/80 dark:border-slate-800/80 transition-all duration-300 shadow-sm"
    >
      <div className="p-5">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <img 
              src={profile.avatar} 
              alt={profile.name} 
              className="w-12 h-12 rounded-full object-cover border-2 border-white dark:border-gray-800 shadow-sm shrink-0"
              referrerPolicy="no-referrer"
            />
            <div>
              <div className="flex items-center gap-1.5">
                <h4 className="text-sm font-bold text-slate-900 dark:text-white font-sans">
                  {profile.name}
                </h4>
                <Award className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-500" />
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-mono tracking-tight mt-0.5">
                {profile.role}
              </p>
            </div>
          </div>

          <button
            id={`toggle-bio-btn-${profile.name.toLowerCase().replace(/\s+/g, '-')}`}
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/20 px-3 py-1.5 rounded-lg border border-emerald-100 dark:border-emerald-900/40 hover:bg-emerald-700 hover:text-white dark:hover:bg-emerald-800 dark:hover:text-white transition-all font-mono"
          >
            {isExpanded ? (
              <>
                Hide Bio
                <ChevronUp className="h-3 w-3" />
              </>
            ) : (
              <>
                About Author
                <ChevronDown className="h-3 w-3" />
              </>
            )}
          </button>
        </div>

        <AnimatePresence initial={false}>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: 'easeInOut' }}
              className="overflow-hidden"
            >
              <div className="pt-4 mt-4 border-t border-slate-200/60 dark:border-slate-800/60">
                <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-sans">
                  {profile.bio}
                </p>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-5 pt-1">
                  {/* Social links / Contact */}
                  <div className="flex items-center gap-3">
                    <a 
                      href={`mailto:${profile.email}`}
                      className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors font-mono"
                      title={`Email ${profile.name}`}
                    >
                      <Mail className="h-3.5 w-3.5" />
                      <span>{profile.email}</span>
                    </a>

                    {profile.twitter && (
                      <a 
                        href={`https://twitter.com/${profile.twitter}`}
                        target="_blank" 
                        rel="noreferrer"
                        className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors font-mono"
                      >
                        <Twitter className="h-3.5 w-3.5" />
                        <span>@{profile.twitter}</span>
                      </a>
                    )}

                    {profile.linkedin && (
                      <a 
                        href={`https://linkedin.com/in/${profile.linkedin}`}
                        target="_blank" 
                        rel="noreferrer"
                        className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors font-mono"
                      >
                        <Linkedin className="h-3.5 w-3.5" />
                        <span>LinkedIn</span>
                      </a>
                    )}
                  </div>

                  {/* Filter articles by author */}
                  <button
                    onClick={() => onSearchAuthor(profile.name)}
                    className="flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-800 hover:border-emerald-500 dark:hover:border-emerald-500 hover:bg-white dark:hover:bg-slate-900 rounded-xl transition-all font-sans shrink-0 shadow-xs"
                  >
                    <BookOpen className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-500" />
                    More Stories by {profile.name.split(' ')[0]}
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
