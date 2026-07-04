import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Mail, 
  Phone, 
  MapPin, 
  Shield, 
  CheckCircle, 
  FileText, 
  Users, 
  MessageSquare, 
  AlertTriangle, 
  Eye, 
  ShieldAlert, 
  BadgeInfo, 
  Check, 
  Compass, 
  Award, 
  Briefcase, 
  HelpCircle,
  Clock,
  ExternalLink
} from 'lucide-react';
import { submitContactMessage, getAllAuthors } from '../lib/db';
import { ContactMessage, Author } from '../types';

interface InfoPagesProps {
  initialPage?: 'about' | 'contact' | 'privacy' | 'terms' | 'editorial' | 'fact-check' | 'cookie';
  onNavigate: (path: string) => void;
}

export default function InfoPages({ initialPage = 'about', onNavigate }: InfoPagesProps) {
  const [activeTab, setActiveTab] = useState<'about' | 'contact' | 'privacy' | 'terms' | 'editorial' | 'fact-check' | 'cookie'>(initialPage);

  // Sync state if initialPage prop changes
  useEffect(() => {
    setActiveTab(initialPage);
  }, [initialPage]);

  const tabs = [
    { id: 'about', label: 'About Us', icon: Users, desc: 'Our mission and journalism team' },
    { id: 'contact', label: 'Contact Us', icon: Mail, desc: 'Get in touch & locate our offices' },
    { id: 'privacy', label: 'Privacy Policy', icon: Shield, desc: 'Data protection & AdSense disclosures' },
    { id: 'terms', label: 'Terms & Conditions', icon: FileText, desc: 'User agreements & comment policies' },
    { id: 'editorial', label: 'Editorial Policy', icon: Award, desc: 'Journalistic integrity & standards' },
    { id: 'fact-check', label: 'Fact-Checking Policy', icon: CheckCircle, desc: 'Verification & sourcing rules' },
    { id: 'cookie', label: 'Cookie Policy', icon: Eye, desc: 'Cookie settings & advertising consent' },
  ] as const;

  // Contact Form State
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactSubject, setContactSubject] = useState('');
  const [contactMsg, setContactMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');

  // Authors/Team State
  const [authors, setAuthors] = useState<Author[]>([]);
  const [loadingAuthors, setLoadingAuthors] = useState(true);

  useEffect(() => {
    async function fetchAuthors() {
      try {
        const list = await getAllAuthors();
        setAuthors(list);
      } catch (err) {
        console.error('Failed to load authors:', err);
      } finally {
        setLoadingAuthors(false);
      }
    }
    fetchAuthors();
  }, []);

  // Cookie Preference State
  const [cookieConsent, setCookieConsent] = useState({
    essential: true,
    functional: true,
    analytics: true,
    advertising: true,
  });
  const [cookieSaved, setCookieSaved] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('pulsewire_cookie_preferences');
    if (saved) {
      try {
        setCookieConsent(JSON.parse(saved));
      } catch (e) {
        console.error(e);
      }
    }
  }, []);

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactName.trim() || !contactEmail.trim() || !contactSubject.trim() || !contactMsg.trim()) return;

    setIsSubmitting(true);
    setSubmitStatus('idle');

    try {
      const messageData: ContactMessage = {
        name: contactName.trim(),
        email: contactEmail.trim().toLowerCase(),
        subject: contactSubject.trim(),
        message: contactMsg.trim(),
        submittedAt: new Date().toISOString(),
      };
      await submitContactMessage(messageData);
      setSubmitStatus('success');
      setContactName('');
      setContactEmail('');
      setContactSubject('');
      setContactMsg('');
    } catch (err) {
      console.error(err);
      setSubmitStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveCookiePrefs = () => {
    localStorage.setItem('pulsewire_cookie_preferences', JSON.stringify(cookieConsent));
    setCookieSaved(true);
    setTimeout(() => setCookieSaved(false), 3000);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10" id="info-pages-root">
      {/* Dynamic Header */}
      <div className="mb-10 text-center md:text-left border-b border-slate-100 dark:border-slate-900 pb-8">
        <span className="text-xs font-bold font-mono uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
          PulseWire Corporate & Legal Information Hub
        </span>
        <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white mt-1">
          {tabs.find(t => t.id === activeTab)?.label}
        </h1>
        <p className="text-sm text-slate-500 dark:text-gray-400 mt-2 max-w-2xl">
          We believe in transparent digital media, verified journalism, and respecting user privacy. 
          Discover our operational policies, editorial guidelines, and compliance standards.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-10">
        {/* Right Side Main Content Panel (Left/First on desktop, Top on mobile) */}
        <div className="lg:col-span-3 bg-white dark:bg-slate-950 border border-slate-100 dark:border-slate-900 rounded-3xl p-6 md:p-10 shadow-sm min-h-[600px]">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="prose dark:prose-invert max-w-none text-slate-700 dark:text-slate-300 font-sans"
            >
              {/* =======================================
                  1. ABOUT US PAGE
                  ======================================= */}
              {activeTab === 'about' && (
                <div id="content-info-about" className="space-y-6">
                  <div className="relative h-60 md:h-80 w-full rounded-2xl overflow-hidden mb-8 border border-slate-100 dark:border-slate-900 shadow-sm bg-slate-950">
                    <img 
                      src="/about_header_banner.jpg" 
                      alt="PulseWire Africa Team"
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover opacity-90" 
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/95 via-slate-950/40 to-transparent flex items-end p-6">
                      <div>
                        <span className="text-xs bg-emerald-600 text-white font-bold font-mono px-2 py-0.5 rounded tracking-wide uppercase">
                          Our Manifesto
                        </span>
                        <h2 className="text-xl md:text-2xl font-black text-white mt-1 tracking-tight">
                          Connecting Africa to the World&apos;s Stories
                        </h2>
                      </div>
                    </div>
                  </div>

                  <h3 className="text-xl font-bold text-slate-900 dark:text-white mt-8 tracking-tight flex items-center gap-2">
                    <Compass className="h-5 w-5 text-emerald-600 shrink-0" />
                    Our Core Mission
                  </h3>
                  <p className="text-sm md:text-base leading-relaxed text-slate-600 dark:text-gray-300">
                    PulseWire Africa is a leading independent pan-African digital media network established to amplify truth, 
                    integrity, and factual depth. We report with an uncompromising standard, ensuring our community has access 
                    to raw, unbiased insights across investigative politics, finance, technological breakthroughs, pan-African development, 
                    global business news, and lifestyle updates. 
                  </p>
                  <p className="text-sm leading-relaxed text-slate-500 dark:text-gray-400">
                    Our reporting goes beyond standard headlines. We dive deep into investigative narratives, provide on-the-ground coverage 
                    from Berekum, Accra, and other regional epicenters, and hold public institutions accountable. Our network is fully aligned 
                    with the Highest Standards of Global Journalism, making us a primary choice for policy analysts, global investors, 
                    scholars, and local readers.
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 my-10">
                    <div className="p-4 bg-emerald-50/50 dark:bg-emerald-950/10 border border-emerald-100/50 dark:border-emerald-900/20 rounded-xl">
                      <Award className="h-6 w-6 text-emerald-600 mb-2" />
                      <h4 className="font-bold text-slate-900 dark:text-white text-sm">Editorial Rigor</h4>
                      <p className="text-xs text-slate-500 dark:text-gray-400 mt-1 leading-relaxed">
                        Every article undergoes multiple tiers of critical copy-editing, legal reviews, and factual checks before publishing.
                      </p>
                    </div>
                    <div className="p-4 bg-blue-50/50 dark:bg-blue-950/10 border border-blue-100/50 dark:border-blue-900/20 rounded-xl">
                      <Shield className="h-6 w-6 text-blue-500 mb-2" />
                      <h4 className="font-bold text-slate-900 dark:text-white text-sm">Absolute Independence</h4>
                      <p className="text-xs text-slate-500 dark:text-gray-400 mt-1 leading-relaxed">
                        We accept zero funding or advertising packages that seek to alter, restrict, or sway our editorial voice.
                      </p>
                    </div>
                    <div className="p-4 bg-amber-50/50 dark:bg-amber-950/10 border border-amber-100/50 dark:border-amber-900/20 rounded-xl">
                      <Briefcase className="h-6 w-6 text-amber-500 mb-2" />
                      <h4 className="font-bold text-slate-900 dark:text-white text-sm">Local Roots, Global Output</h4>
                      <p className="text-xs text-slate-500 dark:text-gray-400 mt-1 leading-relaxed">
                        HQ-based in Berekum and Accra, Ghana, reporting directly from local venues for our global readership.
                      </p>
                    </div>
                  </div>

                  <h3 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                    <Users className="h-5 w-5 text-emerald-600 shrink-0" />
                    Meet Our Leadership Team
                  </h3>
                  <div className="space-y-4">
                    {loadingAuthors ? (
                      <div className="space-y-4">
                        {[1, 2].map(i => (
                          <div key={i} className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 border border-slate-100 dark:border-slate-900 rounded-xl animate-pulse">
                            <div className="w-12 h-12 bg-slate-200 dark:bg-slate-800 rounded-full shrink-0" />
                            <div className="flex-1 space-y-2">
                              <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-1/3" />
                              <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded w-2/3" />
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      (() => {
                        const fallbackAuthors: Author[] = [
                          {
                            id: 'george-oppong-asare',
                            name: 'George Oppong Asare',
                            role: 'Founder & Editor-in-Chief',
                            bio: 'Oversees all editorial outputs and strategic growth across West Africa. Over a decade of investigative journalism experience.',
                            avatar: 'https://ui-avatars.com/api/?name=George+Oppong+Asare&background=f1f5f9&color=dc2626&bold=true&size=256',
                            email: 'asareg365@gmail.com',
                            createdAt: ''
                          },
                          {
                            id: 'christian-asare-tuah',
                            name: 'Christian Asare-Tuah',
                            role: 'Senior Policy Correspondent',
                            bio: 'Reports on macroeconomic policy, trade agreements, and energy resources across the African continent.',
                            avatar: 'https://ui-avatars.com/api/?name=Christian+Asare-Tuah&background=e0f2fe&color=0284c7&bold=true&size=256',
                            email: 'casaretuah@gmail.com',
                            createdAt: ''
                          }
                        ];

                        const filteredAuthors = authors.filter(author => {
                          const roleLower = (author.role || '').toLowerCase();
                          return !['reader', 'contributor', 'editor'].includes(roleLower);
                        });
                        const displayAuthors = filteredAuthors.length > 0 ? filteredAuthors : fallbackAuthors;

                        return displayAuthors.map((author) => (
                          <div key={author.id} className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 border border-slate-100 dark:border-slate-900 rounded-xl bg-white dark:bg-slate-950/40">
                            <div className="w-12 h-12 bg-slate-100 dark:bg-slate-900 rounded-full flex items-center justify-center font-bold text-slate-800 dark:text-white border border-slate-200 dark:border-slate-800 text-lg overflow-hidden shrink-0">
                              {author.avatar && author.avatar !== "" ? (
                                <img 
                                  src={author.avatar || null} 
                                  alt={author.name} 
                                  className="w-full h-full object-cover"
                                  referrerPolicy="no-referrer"
                                />
                              ) : (
                                author.name.charAt(0)
                              )}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-baseline justify-between gap-2 flex-wrap">
                                <h4 className="font-bold text-slate-900 dark:text-white text-sm">{author.name}</h4>
                                <span className="text-[10px] bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-gray-400 font-mono font-bold px-1.5 py-0.5 rounded uppercase">
                                  {author.role}
                                </span>
                              </div>
                              <p className="text-xs text-slate-500 dark:text-gray-400 mt-1">
                                {author.bio || 'No bio provided.'}
                              </p>
                              {author.email && (
                                <p className="text-xs text-slate-400 mt-1 font-mono">
                                  {author.email}
                                </p>
                              )}
                            </div>
                          </div>
                        ));
                      })()
                    )}
                  </div>
                </div>
              )}

              {/* =======================================
                  2. CONTACT US PAGE
                  ======================================= */}
              {activeTab === 'contact' && (
                <div id="content-info-contact" className="space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Information column */}
                    <div className="space-y-6">
                      <h3 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
                        Reach Out To Our Newsrooms
                      </h3>
                      <p className="text-sm leading-relaxed text-slate-500 dark:text-gray-400">
                        Got a story tip? Want to pitch a freelance investigation? Found a factual issue that needs correction? 
                        Or interested in booking a sponsorship banner? We operate open lines 24/7.
                      </p>

                      <div className="space-y-4">
                        <div className="flex items-start gap-3">
                          <div className="p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-emerald-600 shrink-0">
                            <Phone className="h-5 w-5" />
                          </div>
                          <div>
                            <span className="text-[10px] font-mono font-bold uppercase text-slate-400 block">Hotline support</span>
                            <a href="tel:+233248472474" className="text-sm font-bold text-slate-900 dark:text-white hover:underline">
                              +233 248472474
                            </a>
                            <p className="text-[11px] text-slate-400 mt-0.5">Call or WhatsApp our news desk directly.</p>
                          </div>
                        </div>

                        <div className="flex items-start gap-3">
                          <div className="p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-emerald-600 shrink-0">
                            <Mail className="h-5 w-5" />
                          </div>
                          <div>
                            <span className="text-[10px] font-mono font-bold uppercase text-slate-400 block">General & Editorial inquiries</span>
                            <div className="space-y-0.5">
                              <a href="mailto:editor@pulsewireafrica.news" className="text-sm font-bold text-slate-900 dark:text-white hover:underline block">
                                editor@pulsewireafrica.news
                              </a>
                              <a href="mailto:asareg365@gmail.com" className="text-sm font-bold text-emerald-600 dark:text-emerald-400 hover:underline block">
                                asareg365@gmail.com
                              </a>
                            </div>
                            <p className="text-[11px] text-slate-400 mt-0.5">Direct point of contact for administrative escalations.</p>
                          </div>
                        </div>

                        <div className="flex items-start gap-3">
                          <div className="p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-emerald-600 shrink-0">
                            <MapPin className="h-5 w-5" />
                          </div>
                          <div>
                            <span className="text-[10px] font-mono font-bold uppercase text-slate-400 block">HQ Address</span>
                            <p className="text-sm text-slate-900 dark:text-white leading-relaxed">
                              PulseWire Media Bureau<br />
                              ВС-0578-5502 House N109<br />
                              Nanasuano, Berekum, Ghana
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Map Placeholder */}
                      <div className="border border-slate-100 dark:border-slate-900 p-4 rounded-2xl bg-slate-50 dark:bg-gray-900/20 text-center space-y-2">
                        <MapPin className="h-8 w-8 text-emerald-600 mx-auto animate-bounce" />
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white">HQ Geo-Location Verified</h4>
                        <p className="text-[11px] text-slate-500 dark:text-gray-400 max-w-xs mx-auto">
                          Our Berekum office handles regional dispatching, archives, and live news editing feeds.
                        </p>
                      </div>
                    </div>

                    {/* Contact Form Column */}
                    <div className="bg-slate-50/60 dark:bg-slate-900/20 border border-slate-100 dark:border-slate-900 p-6 rounded-2xl">
                      <h3 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight mb-4 flex items-center gap-1.5">
                        <MessageSquare className="h-4.5 w-4.5 text-emerald-600" />
                        Send a Message
                      </h3>

                      <form onSubmit={handleContactSubmit} className="space-y-4">
                        <div>
                          <label className="block text-xs font-bold text-slate-600 dark:text-gray-400 uppercase tracking-wide mb-1 font-mono">
                            Your Name
                          </label>
                          <input 
                            type="text" 
                            required
                            placeholder="John Doe"
                            value={contactName}
                            onChange={e => setContactName(e.target.value)}
                            className="w-full bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 text-slate-950 dark:text-white text-xs px-3.5 py-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all placeholder-slate-400"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-600 dark:text-gray-400 uppercase tracking-wide mb-1 font-mono">
                            Email Address
                          </label>
                          <input 
                            type="email" 
                            required
                            placeholder="johndoe@example.com"
                            value={contactEmail}
                            onChange={e => setContactEmail(e.target.value)}
                            className="w-full bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 text-slate-950 dark:text-white text-xs px-3.5 py-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all placeholder-slate-400"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-600 dark:text-gray-400 uppercase tracking-wide mb-1 font-mono">
                            Subject
                          </label>
                          <input 
                            type="text" 
                            required
                            placeholder="e.g. Editorial correction report / Sponsorship query"
                            value={contactSubject}
                            onChange={e => setContactSubject(e.target.value)}
                            className="w-full bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 text-slate-950 dark:text-white text-xs px-3.5 py-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all placeholder-slate-400"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-600 dark:text-gray-400 uppercase tracking-wide mb-1 font-mono">
                            Detailed Message
                          </label>
                          <textarea 
                            rows={4}
                            required
                            placeholder="Please provide full details of your inquiry..."
                            value={contactMsg}
                            onChange={e => setContactMsg(e.target.value)}
                            className="w-full bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 text-slate-950 dark:text-white text-xs px-3.5 py-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all placeholder-slate-400 resize-none"
                          />
                        </div>

                        <button 
                          type="submit"
                          disabled={isSubmitting}
                          id="btn-submit-contact"
                          className="w-full bg-emerald-700 hover:bg-emerald-800 disabled:bg-slate-300 dark:disabled:bg-slate-800 text-white font-bold text-xs uppercase tracking-widest py-3 rounded-lg transition-colors shadow-md flex items-center justify-center gap-2"
                        >
                          {isSubmitting ? (
                            <>
                              <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                              Submitting...
                            </>
                          ) : 'Submit Message'}
                        </button>

                        {submitStatus === 'success' && (
                          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/50 rounded-lg flex items-start gap-2.5">
                            <CheckCircle className="h-4.5 w-4.5 text-emerald-600 shrink-0 mt-0.5" />
                            <p className="text-[11px] text-emerald-800 dark:text-emerald-300 font-semibold leading-normal">
                              Message sent successfully! Our media desk will analyze your request and reply to you within 12 hours.
                            </p>
                          </div>
                        )}

                        {submitStatus === 'error' && (
                          <div className="p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 rounded-lg flex items-start gap-2.5">
                            <AlertTriangle className="h-4.5 w-4.5 text-red-500 shrink-0 mt-0.5" />
                            <p className="text-[11px] text-red-800 dark:text-red-300 font-semibold leading-normal">
                              Failed to submit message due to a connection drop. Please retry.
                            </p>
                          </div>
                        )}
                      </form>
                    </div>
                  </div>
                </div>
              )}

              {/* =======================================
                  3. PRIVACY POLICY
                  ======================================= */}
              {activeTab === 'privacy' && (
                <div id="content-info-privacy" className="space-y-6">
                  <span className="text-[10px] bg-emerald-100 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-400 font-mono font-bold px-2 py-1 rounded">
                    LAST UPDATED: June 25, 2026
                  </span>

                  <h3 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight mt-4">
                    1. Introduction & Scope
                  </h3>
                  <p className="text-xs md:text-sm leading-relaxed text-slate-500 dark:text-gray-400">
                    PulseWire Africa (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;) operates the digital news portal. This Privacy Policy is crafted to inform you about our procedures surrounding the accumulation, application, and disclosure of personal data collected from readers of this website. We abide strictly by global data guidelines including the General Data Protection Regulation (GDPR) and regional African digital protection frameworks.
                  </p>

                  <h3 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
                    2. Information We Collect
                  </h3>
                  <p className="text-xs md:text-sm leading-relaxed text-slate-500 dark:text-gray-400">
                    We collect limited, necessary data to run our high-integrity journalism service:
                  </p>
                  <ul className="list-disc pl-5 text-xs text-slate-500 dark:text-gray-400 space-y-1">
                    <li><strong>Newsletter Subscriptions:</strong> Only email addresses submitted voluntarily to sign up for editorial reports.</li>
                    <li><strong>Comment Section:</strong> Names, emails, and textual content submitted to public discussions under stories.</li>
                    <li><strong>Contact Desk:</strong> Full name, emails, and subjects voluntarily logged via our inquiry form.</li>
                    <li><strong>Device & Analytics:</strong> Anonymized analytical parameters (such as IP fragments, browser configurations, and loading times) logged to measure speed and load parameters.</li>
                  </ul>

                  {/* AdSense Compliance Specific Clause */}
                  <div className="bg-red-50/40 dark:bg-red-950/10 border border-red-900/20 rounded-xl p-5 my-6">
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <ShieldAlert className="h-4 w-4 text-red-500" />
                      Google AdSense & Third-Party Cookies Disclosure
                    </h4>
                    <p className="text-xs text-slate-600 dark:text-gray-300 mt-2 leading-relaxed">
                      This website utilizes <strong>Google AdSense</strong> to display sponsored ads. Google and other third-party vendors use cookies to serve ads based on your previous visits to this website or other internet domains. 
                    </p>
                    <p className="text-xs text-slate-600 dark:text-gray-300 mt-2 leading-relaxed font-semibold">
                      Google&apos;s use of advertising cookies (specifically the DoubleClick / DART cookie) enables it and its partners to serve targeted ads based on your browsing pattern. You can opt out of personalized advertising by visiting Google&apos;s <a href="https://settings.google.com/ads" target="_blank" rel="noopener noreferrer" className="text-emerald-600 hover:underline inline-flex items-center gap-0.5 font-bold">Ads Settings <ExternalLink className="h-2.5 w-2.5" /></a>.
                    </p>
                  </div>

                  <h3 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
                    3. How We Use Information
                  </h3>
                  <p className="text-xs md:text-sm leading-relaxed text-slate-500 dark:text-gray-400">
                    We do NOT trade, sell, lease, or rent your data under any circumstances. Accumulated parameters are utilized to:
                  </p>
                  <ul className="list-disc pl-5 text-xs text-slate-500 dark:text-gray-400 space-y-1">
                    <li>Deliver breaking bulletins and daily newsletter summaries.</li>
                    <li>Maintain high-integrity commenting debates.</li>
                    <li>Optimize website infrastructure speed and responsiveness.</li>
                  </ul>

                  <h3 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
                    4. Data Security and Custody
                  </h3>
                  <p className="text-xs md:text-sm leading-relaxed text-slate-500 dark:text-gray-400">
                    We utilize certified cloud storage databases protected by absolute SSL parameters and granular security frameworks. We retain your information only as long as you remain a subscribed reader or until you request direct removal.
                  </p>
                </div>
              )}

              {/* =======================================
                  4. TERMS & CONDITIONS
                  ======================================= */}
              {activeTab === 'terms' && (
                <div id="content-info-terms" className="space-y-6">
                  <span className="text-[10px] bg-emerald-100 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-400 font-mono font-bold px-2 py-1 rounded">
                    EFFECTIVE DATE: June 25, 2026
                  </span>

                  <h3 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight mt-4">
                    1. Acceptance of Terms
                  </h3>
                  <p className="text-xs md:text-sm leading-relaxed text-slate-500 dark:text-gray-400">
                    By browsing, reading, subscribing, or submitting content to PulseWire Africa, you explicitly consent to abide by these binding Terms & Conditions. If you do not accept any portion, you must cease using this portal immediately.
                  </p>

                  <h3 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
                    2. Intellectual Property Rights
                  </h3>
                  <p className="text-xs md:text-sm leading-relaxed text-slate-500 dark:text-gray-400">
                    All original articles, investigations, graphics, layout elements, photographs, and editorial audio summaries published on PulseWire Africa belong solely to us or our content providers and are protected by international copyright laws. Unauthorized reproduction, modification, or distribution of our materials without direct written consent from George Oppong Asare is strictly prohibited.
                  </p>

                  <h3 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
                    3. Comment Section Guidelines
                  </h3>
                  <p className="text-xs md:text-sm leading-relaxed text-slate-500 dark:text-gray-400">
                    We provide interactive boards to host constructive public discourse. To preserve our standards, you are strictly forbidden from logging comments containing:
                  </p>
                  <ul className="list-disc pl-5 text-xs text-slate-500 dark:text-gray-400 space-y-1">
                    <li>Hate speech, ethnic slurs, or direct verbal attacks.</li>
                    <li>Defamatory claims targeting any local individual or public official.</li>
                    <li>Unsolicited commercial advertisements, spam links, or malware payloads.</li>
                  </ul>

                  <h3 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
                    4. Limitation of Liability
                  </h3>
                  <p className="text-xs md:text-sm leading-relaxed text-slate-500 dark:text-gray-400">
                    We seek absolute factual correctness, but cannot guarantee that all articles, market listings, or live commentary are entirely error-free. PulseWire Africa is not liable for financial decisions, trades, or lifestyle actions taken based on our informational outputs.
                  </p>
                </div>
              )}

              {/* =======================================
                  5. EDITORIAL POLICY
                  ======================================= */}
              {activeTab === 'editorial' && (
                <div id="content-info-editorial" className="space-y-6">
                  <div className="flex items-center gap-3 p-4 bg-emerald-50/50 dark:bg-emerald-950/10 border border-emerald-100 dark:border-emerald-900/50 rounded-xl mb-6">
                    <Award className="h-10 w-10 text-emerald-600 shrink-0" />
                    <div>
                      <h4 className="font-bold text-sm text-slate-900 dark:text-white">Our Promise to Readers</h4>
                      <p className="text-xs text-slate-500 dark:text-gray-400 mt-1">
                        PulseWire Africa follows the Code of Ethics established by the International Federation of Journalists (IFJ).
                      </p>
                    </div>
                  </div>

                  <h3 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
                    1. Truth & Verification Standards
                  </h3>
                  <p className="text-xs md:text-sm leading-relaxed text-slate-500 dark:text-gray-400">
                    Our newsroom holds truth as its absolute standard. Journalists must verify facts from secondary, independent sources, public documents, or direct eye-witness records before presenting details. We do not aggregate unverified social media rumors.
                  </p>

                  <h3 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
                    2. Objectivity and Fairness
                  </h3>
                  <p className="text-xs md:text-sm leading-relaxed text-slate-500 dark:text-gray-400">
                    We present views from multiple angles in a story. If an article alleges misconduct or policy failure on behalf of an official, company, or institution, our reporters must extend a minimum 24-hour window for the targeted party to state their response before we publish.
                  </p>

                  <h3 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
                    3. Correction Policy
                  </h3>
                  <p className="text-xs md:text-sm leading-relaxed text-slate-500 dark:text-gray-400">
                    Despite our extreme rigor, mistakes can occur. When a factual error is discovered, we commit to correcting it within 2 hours. A clear, transparent correction note will be appended to the bottom of the article explaining what was changed and why.
                  </p>

                  <h3 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
                    4. Sponsor & Affiliate Disclosures
                  </h3>
                  <p className="text-xs md:text-sm leading-relaxed text-slate-500 dark:text-gray-400">
                    Any article that contains sponsored content or affiliate links will be clearly highlighted at the top with a distinct badge. This transparent process guarantees our readers are never misled by native ads.
                  </p>
                </div>
              )}

              {/* =======================================
                  6. FACT-CHECKING POLICY
                  ======================================= */}
              {activeTab === 'fact-check' && (
                <div id="content-info-fact-check" className="space-y-6">
                  <div className="flex items-center gap-3 p-4 bg-blue-50/50 dark:bg-blue-950/10 border border-blue-100 dark:border-blue-900/50 rounded-xl mb-6">
                    <CheckCircle className="h-10 w-10 text-blue-500 shrink-0" />
                    <div>
                      <h4 className="font-bold text-sm text-slate-900 dark:text-white">Active Fact Verification Hub</h4>
                      <p className="text-xs text-slate-500 dark:text-gray-400 mt-1">
                        Ensuring misinformation has zero footprint on our network.
                      </p>
                    </div>
                  </div>

                  <h3 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
                    1. Our Multi-tier Sourcing Strategy
                  </h3>
                  <p className="text-xs md:text-sm leading-relaxed text-slate-500 dark:text-gray-400">
                    We require primary sources whenever possible. This includes official court declarations, parliamentary transcripts, audited company ledgers, direct quotes from on-record briefings, and verified geocoded imagery. Secondary summaries or hearsay are not permitted as sole foundations.
                  </p>

                  <h3 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
                    2. Cross-checking Claims
                  </h3>
                  <p className="text-xs md:text-sm leading-relaxed text-slate-500 dark:text-gray-400">
                    When public figures, political parties, or corporate agencies make numerical claims (e.g. GDP margins, infrastructure investments, disease rates), we cross-reference those claims with independent global datasets (World Bank, WHO, Ghana Statistical Service) to check veracity.
                  </p>

                  <h3 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
                    3. Anonymous Sources
                  </h3>
                  <p className="text-xs md:text-sm leading-relaxed text-slate-500 dark:text-gray-400">
                    To shield whistleblowers, we occasionally allow anonymous quotes, but only under two firm constraints: 
                  </p>
                  <ul className="list-disc pl-5 text-xs text-slate-500 dark:text-gray-400 space-y-1">
                    <li>The informant must have direct, verifiable access to the source documentation or active event.</li>
                    <li>The informant&apos;s identity must be disclosed to the Editor-in-Chief to verify credibility.</li>
                  </ul>
                </div>
              )}

              {/* =======================================
                  7. COOKIE POLICY
                  ======================================= */}
              {activeTab === 'cookie' && (
                <div id="content-info-cookie" className="space-y-6">
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
                    1. What are Cookies?
                  </h3>
                  <p className="text-xs md:text-sm leading-relaxed text-slate-500 dark:text-gray-400">
                    Cookies are small text structures dispatched by a server to your browser directory when you load websites. They act as identification flags to enable layout preferences, retain comment names, keep you logged in securely, and facilitate personalized sponsorship placements.
                  </p>

                  <h3 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
                    2. Types of Cookies We Use
                  </h3>
                  <div className="space-y-4">
                    <div className="flex items-start gap-3 p-3 border border-slate-100 dark:border-slate-900 rounded-xl">
                      <Shield className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                      <div>
                        <h4 className="font-bold text-xs text-slate-950 dark:text-white">Essential & System Cookies (Mandatory)</h4>
                        <p className="text-[11px] text-slate-400 mt-1 leading-normal">
                          Retain security hashes, handle dark mode toggling transitions, and manage active session authentication. Disabling these will cause parts of the portal to stop functioning.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3 p-3 border border-slate-100 dark:border-slate-900 rounded-xl">
                      <Eye className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
                      <div>
                        <h4 className="font-bold text-xs text-slate-950 dark:text-white">Analytical & Speed Cookies (Recommended)</h4>
                        <p className="text-[11px] text-slate-400 mt-1 leading-normal">
                          Measure traffic sources, identify slow loading pages, and aggregate usage heatmaps so we can improve network latency.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3 p-3 border border-slate-100 dark:border-slate-900 rounded-xl">
                      <BadgeInfo className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                      <div>
                        <h4 className="font-bold text-xs text-slate-950 dark:text-white">Google AdSense Cookie (Customized Advertising)</h4>
                        <p className="text-[11px] text-slate-400 mt-1 leading-normal">
                          Used by Google to serve advertisements tailored to your interests. It enables custom banner selection and helps track ad clicks securely.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Cookie Preference Manager */}
                  <div className="bg-slate-50 dark:bg-slate-900/40 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 my-8">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-4">
                      <Shield className="h-4.5 w-4.5 text-emerald-600" />
                      Interactive Cookie Preference Selector
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-gray-400 mb-4 leading-normal">
                      Manage your cookie consents in real-time. Changes are stored locally in your active browser session immediately.
                    </p>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-xs font-bold text-slate-900 dark:text-white block">Essential Cookies</span>
                          <span className="text-[10px] text-slate-400 block">Required for core system functions. Always enabled.</span>
                        </div>
                        <input type="checkbox" checked disabled className="rounded text-emerald-600 h-4 w-4 bg-slate-200" />
                      </div>

                      <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-900/60 pt-3">
                        <div>
                          <span className="text-xs font-bold text-slate-900 dark:text-white block">Functional & Language</span>
                          <span className="text-[10px] text-slate-400 block">Remembers commenting nicknames, layout zooms, and dark mode transitions.</span>
                        </div>
                        <input 
                          type="checkbox" 
                          checked={cookieConsent.functional} 
                          onChange={e => setCookieConsent({...cookieConsent, functional: e.target.checked})}
                          className="rounded text-emerald-600 focus:ring-emerald-500 h-4 w-4 accent-emerald-600 cursor-pointer"
                        />
                      </div>

                      <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-900/60 pt-3">
                        <div>
                          <span className="text-xs font-bold text-slate-900 dark:text-white block">Analytics & Speed Metrics</span>
                          <span className="text-[10px] text-slate-400 block">Anonymously tracks slow queries, network hops, and loading speeds.</span>
                        </div>
                        <input 
                          type="checkbox" 
                          checked={cookieConsent.analytics} 
                          onChange={e => setCookieConsent({...cookieConsent, analytics: e.target.checked})}
                          className="rounded text-emerald-600 focus:ring-emerald-500 h-4 w-4 accent-emerald-600 cursor-pointer"
                        />
                      </div>

                      <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-900/60 pt-3">
                        <div>
                          <span className="text-xs font-bold text-slate-900 dark:text-white block">Google AdSense & Targeted Ads</span>
                          <span className="text-[10px] text-slate-400 block">Enables Google to select contextual banners matching your interest.</span>
                        </div>
                        <input 
                          type="checkbox" 
                          checked={cookieConsent.advertising} 
                          onChange={e => setCookieConsent({...cookieConsent, advertising: e.target.checked})}
                          className="rounded text-emerald-600 focus:ring-emerald-500 h-4 w-4 accent-emerald-600 cursor-pointer"
                        />
                      </div>
                    </div>

                    <button
                      onClick={handleSaveCookiePrefs}
                      id="btn-save-cookies"
                      className="mt-6 w-full bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs uppercase tracking-wider py-2.5 rounded-xl transition-all shadow-md flex items-center justify-center gap-1.5"
                    >
                      {cookieSaved ? (
                        <>
                          <Check className="h-4 w-4 text-emerald-300" />
                          Preferences Saved Locally!
                        </>
                      ) : 'Save My Cookie Settings'}
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Left Side Sidebar - Navigation Directory (Right on desktop, Beneath on mobile) */}
        <div className="lg:col-span-1 space-y-2">
          <div className="bg-white dark:bg-slate-950 border border-slate-100 dark:border-slate-900 rounded-2xl p-4 shadow-sm sticky top-24">
            <h3 className="text-xs font-extrabold font-mono uppercase text-slate-400 dark:text-slate-500 tracking-wider mb-4 px-2">
              Directory
            </h3>
            <nav className="space-y-1">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    id={`tab-info-${tab.id}`}
                    onClick={() => {
                      setActiveTab(tab.id);
                      onNavigate(`/info/${tab.id}`);
                    }}
                    className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-left transition-all ${
                      isActive
                        ? 'bg-emerald-600 text-white font-semibold shadow-md shadow-emerald-600/10'
                        : 'text-slate-600 dark:text-gray-400 hover:bg-slate-50 dark:hover:bg-slate-900/60 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <Icon className={`h-4.5 w-4.5 shrink-0 ${isActive ? 'text-white' : 'text-slate-400 dark:text-gray-500'}`} />
                    <div className="min-w-0 flex-1">
                      <span className="text-sm block truncate leading-none">{tab.label}</span>
                      <span className={`text-[10px] block truncate mt-0.5 ${isActive ? 'text-emerald-100' : 'text-slate-400 dark:text-slate-500'}`}>
                        {tab.desc}
                      </span>
                    </div>
                  </button>
                );
              })}
            </nav>

            <div className="border-t border-slate-100 dark:border-slate-900 mt-6 pt-6 text-center lg:text-left">
              <span className="text-[10px] bg-red-600/10 text-red-500 dark:text-red-400 px-2 py-1 rounded font-bold font-mono tracking-wider uppercase">
                AdSense Approved
              </span>
              <p className="text-[11px] text-slate-400 mt-2">
                All mandatory legal disclosures, cookie regulations, and editorial benchmarks fully integrated.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
