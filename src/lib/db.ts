import { 
  collection, 
  getDocs, 
  doc, 
  getDoc, 
  setDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  limit, 
  increment,
  collectionGroup
} from 'firebase/firestore';
import { db, auth } from './firebase';
import { Article, Comment, AdPlacement, NewsletterSubscription, ContactMessage, Author } from '../types';
import { SEED_ARTICLES, SEED_ADS, SEED_AUTHORS } from './seedData';

// Firestore error handling types and function
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  console.log('Firebase Auth Current User:', auth.currentUser);
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid || null,
      email: auth.currentUser?.email || null,
      emailVerified: auth.currentUser?.emailVerified || null,
      isAnonymous: auth.currentUser?.isAnonymous || null,
      tenantId: auth.currentUser?.tenantId || null,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// ---------------- Local Storage Fallback DB Manager ----------------
class LocalDbFallback {
  private static get<T>(key: string, defaultValue: T): T {
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : defaultValue;
    } catch {
      return defaultValue;
    }
  }

  private static set(key: string, value: any): void {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (err) {
      if (err instanceof DOMException && (
          err.name === 'QuotaExceededError' ||
          err.name === 'NS_ERROR_DOM_QUOTA_REACHED')) {
        console.warn('localStorage quota exceeded. Retrying with ultra-minimal fallback data...');
        try {
          if (key === 'pulsewire_fallback_articles' && Array.isArray(value)) {
            const pruned = value.slice(0, 5).map(art => ({
              ...art,
              content: art.content ? art.content.slice(0, 300) + '... [Truncated due to storage limits]' : ''
            }));
            localStorage.setItem(key, JSON.stringify(pruned));
          } else {
            localStorage.removeItem(key);
          }
        } catch (innerErr) {
          console.warn('Failed to save even pruned data to localStorage:', innerErr);
        }
      } else {
        console.warn('Failed to write to localStorage fallback:', err);
      }
    }
  }

  static getArticles(): Article[] {
    return this.get<Article[]>('pulsewire_fallback_articles', SEED_ARTICLES);
  }

  static saveArticles(articles: Article[]) {
    // Proactively limit count and content size to prevent exceeding the browser localStorage quota
    const optimized = articles.slice(0, 15).map(art => ({
      ...art,
      content: art.content && art.content.length > 2000 
        ? art.content.slice(0, 2000) + '... [Truncated for offline storage]' 
        : art.content,
      images: art.images ? art.images.filter(img => !img.startsWith('data:image')) : []
    }));
    this.set('pulsewire_fallback_articles', optimized);
  }

  static getComments(): Comment[] {
    const defaultComments = [
      {
        id: "comment-1",
        articleId: "seed-art-1",
        authorId: "guest",
        authorName: "Kwadwo Mensah",
        authorAvatar: "https://ui-avatars.com/api/?name=Kwadwo+Mensah&background=f1f5f9&color=dc2626&bold=true&size=128",
        content: "This is brilliant! Excellent initiative by the ministry. We need more centers in Takoradi and Tamale too.",
        createdAt: "2026-06-21T12:00:00Z",
        approved: true
      },
      {
        id: "comment-2",
        articleId: "seed-art-1",
        authorId: "guest",
        authorName: "Abena Boateng",
        authorAvatar: "https://ui-avatars.com/api/?name=Abena+Boateng&background=fdf2f8&color=db2777&bold=true&size=128",
        content: "As a young female developer, this is highly motivating. I will register at the Kumasi hub next week!",
        createdAt: "2026-06-21T14:30:00Z",
        approved: true
      },
      {
        id: "comment-3",
        articleId: "seed-art-2",
        authorId: "guest",
        authorName: "Chinedu Okafor",
        authorAvatar: "https://ui-avatars.com/api/?name=Chinedu+Okafor&background=f0fdf4&color=16a34a&bold=true&size=128",
        content: "PAPSS is a game changer. Doing transactions between Nigeria and Ghana has been historically ridiculous. Huge win!",
        createdAt: "2026-06-22T10:15:00Z",
        approved: true
      }
    ];
    return this.get<Comment[]>('pulsewire_fallback_comments', defaultComments);
  }

  static saveComments(comments: Comment[]) {
    this.set('pulsewire_fallback_comments', comments);
  }

  static getAds(): AdPlacement[] {
    return this.get<AdPlacement[]>('pulsewire_fallback_ads', SEED_ADS);
  }

  static saveAds(ads: AdPlacement[]) {
    this.set('pulsewire_fallback_ads', ads);
  }

  static getNewsletter(): NewsletterSubscription[] {
    return this.get<NewsletterSubscription[]>('pulsewire_fallback_newsletter', []);
  }

  static saveNewsletter(subs: NewsletterSubscription[]) {
    this.set('pulsewire_fallback_newsletter', subs);
  }

  static getContacts(): ContactMessage[] {
    return this.get<ContactMessage[]>('pulsewire_fallback_contacts', []);
  }

  static saveContacts(msgs: ContactMessage[]) {
    this.set('pulsewire_fallback_contacts', msgs);
  }

  static getAuthors(): Author[] {
    return this.get<Author[]>('pulsewire_fallback_authors', SEED_AUTHORS);
  }

  static saveAuthors(authors: Author[]) {
    this.set('pulsewire_fallback_authors', authors);
  }
}

let isFirestoreUnavailable = false;

// Determine if we should bypass Firestore and run purely locally
function shouldBypassFirestore(): boolean {
  return isFirestoreUnavailable;
}

// Mark Firestore as unavailable and activate fallback mode
function flagFirestoreUnavailable(error: any) {
  console.warn("PulseWire Africa is switching to Local Offline Fallback Mode. Error detail:", error);
  isFirestoreUnavailable = true;
}

export function isUsingLocalFallback(): boolean {
  return isFirestoreUnavailable;
}

export function resetFirestoreFallback() {
  isFirestoreUnavailable = false;
}

// Resilient promise timeout helper to prevent hanging queries on slow connections
async function withTimeout<T>(promise: Promise<T>, timeoutMs = 10000): Promise<T> {
  let timeoutId: any;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error("Firestore operation timed out after " + timeoutMs + "ms. Connection may be cold starting or slow."));
    }, timeoutMs);
  });
  return Promise.race([promise, timeoutPromise]).finally(() => {
    clearTimeout(timeoutId);
  });
}

// Seeding function
export async function seedDatabaseIfEmpty(force = false) {
  const pathForArticles = 'articles';
  
  // Seed local fallback database if empty
  const localArticles = LocalDbFallback.getArticles();
  if (localArticles.length === 0 || force) {
    LocalDbFallback.saveArticles(SEED_ARTICLES);
    LocalDbFallback.saveAds(SEED_ADS);
    LocalDbFallback.saveAuthors(SEED_AUTHORS);
  }

  if (shouldBypassFirestore()) {
    console.log('Skipping Firestore seeding. Running in local fallback mode.');
    return;
  }

  try {
    if (!force && localStorage.getItem('skip_seeding') === 'true') {
      console.log('Auto-seeding is disabled because skip_seeding flag is active.');
      return;
    }

    if (!force && localStorage.getItem('pulsewire_db_seeded') === 'true') {
      console.log('Auto-seeding skipped. Database already seeded previously.');
      return;
    }

    const articlesCol = collection(db, pathForArticles);
    const qSnapshot = await withTimeout(getDocs(query(articlesCol, limit(1))));
    
    if (qSnapshot.empty || force) {
      console.log('Starting seeding of PulseWire Africa demo database...');
      
      // 1. Seed Articles
      for (const art of SEED_ARTICLES) {
        try {
          await setDoc(doc(db, 'articles', art.id), cleanUndefined(art));
        } catch (err) {
          handleFirestoreError(err, OperationType.WRITE, `articles/${art.id}`);
        }
      }
      
      // 2. Seed Ads
      for (const ad of SEED_ADS) {
        try {
          await setDoc(doc(db, 'ads', ad.id), cleanUndefined(ad));
        } catch (err) {
          handleFirestoreError(err, OperationType.WRITE, `ads/${ad.id}`);
        }
      }

      // Seed Authors
      for (const authObj of SEED_AUTHORS) {
        try {
          await setDoc(doc(db, 'authors', authObj.id), cleanUndefined(authObj));
        } catch (err) {
          handleFirestoreError(err, OperationType.WRITE, `authors/${authObj.id}`);
        }
      }

      // 3. Seed some default comments for engagement demo
      const demoComments = [
        {
          id: "comment-1",
          articleId: "seed-art-1",
          authorId: "guest",
          authorName: "Kwadwo Mensah",
          authorAvatar: "https://ui-avatars.com/api/?name=Kwadwo+Mensah&background=f1f5f9&color=dc2626&bold=true&size=128",
          content: "This is brilliant! Excellent initiative by the ministry. We need more centers in Takoradi and Tamale too.",
          createdAt: "2026-06-21T12:00:00Z",
          approved: true
        },
        {
          id: "comment-2",
          articleId: "seed-art-1",
          authorId: "guest",
          authorName: "Abena Boateng",
          authorAvatar: "https://ui-avatars.com/api/?name=Abena+Boateng&background=fdf2f8&color=db2777&bold=true&size=128",
          content: "As a young female developer, this is highly motivating. I will register at the Kumasi hub next week!",
          createdAt: "2026-06-21T14:30:00Z",
          approved: true
        },
        {
          id: "comment-3",
          articleId: "seed-art-2",
          authorId: "guest",
          authorName: "Chinedu Okafor",
          authorAvatar: "https://ui-avatars.com/api/?name=Chinedu+Okafor&background=f0fdf4&color=16a34a&bold=true&size=128",
          content: "PAPSS is a game changer. Doing transactions between Nigeria and Ghana has been historically ridiculous. Huge win!",
          createdAt: "2026-06-22T10:15:00Z",
          approved: true
        }
      ];

      for (const c of demoComments) {
        try {
          await setDoc(doc(db, 'articles', c.articleId, 'comments', c.id), cleanUndefined(c));
        } catch (err) {
          handleFirestoreError(err, OperationType.WRITE, `articles/${c.articleId}/comments/${c.id}`);
        }
      }
      
      console.log('Seeding completed successfully!');
    }
    
    // Save state to avoid future queries on refresh
    localStorage.setItem('pulsewire_db_seeded', 'true');
  } catch (error) {
    console.error('Error seeding Firestore, using local fallback:', error);
    flagFirestoreUnavailable(error);
  }
}

// Clear all data from the database
export async function clearAllDatabaseData(): Promise<void> {
  // Clear local DB fallback
  try {
    localStorage.removeItem('pulsewire_fallback_articles');
    localStorage.removeItem('pulsewire_fallback_comments');
    localStorage.removeItem('pulsewire_fallback_ads');
    localStorage.removeItem('pulsewire_fallback_newsletter');
    localStorage.removeItem('pulsewire_fallback_contacts');
    localStorage.removeItem('pulsewire_fallback_authors');
    localStorage.removeItem('pulsewire_db_seeded');
  } catch (e) {}

  if (shouldBypassFirestore()) {
    console.log('Local database fallback cleared.');
    return;
  }

  try {
    // 1. Delete all articles and their comments subcollections
    const articlesCol = collection(db, 'articles');
    const articlesSnapshot = await withTimeout(getDocs(articlesCol));
    for (const d of articlesSnapshot.docs) {
      const artId = d.id;
      // Get and delete comments subcollection
      const commentsCol = collection(db, 'articles', artId, 'comments');
      const commentsSnapshot = await withTimeout(getDocs(commentsCol));
      for (const cd of commentsSnapshot.docs) {
        await deleteDoc(doc(db, 'articles', artId, 'comments', cd.id));
      }
      // Delete article document
      await deleteDoc(doc(db, 'articles', artId));
    }

    // 2. Delete all ads
    const adsCol = collection(db, 'ads');
    const adsSnapshot = await withTimeout(getDocs(adsCol));
    for (const d of adsSnapshot.docs) {
      await deleteDoc(doc(db, 'ads', d.id));
    }

    // 3. Delete all newsletter subscriptions
    const newsCol = collection(db, 'newsletter');
    const newsSnapshot = await withTimeout(getDocs(newsCol));
    for (const d of newsSnapshot.docs) {
      await deleteDoc(doc(db, 'newsletter', d.id));
    }

    // 4. Delete all authors
    const authorsCol = collection(db, 'authors');
    const authorsSnapshot = await withTimeout(getDocs(authorsCol));
    for (const d of authorsSnapshot.docs) {
      await deleteDoc(doc(db, 'authors', d.id));
    }

    console.log('All cloud database data cleared successfully!');
  } catch (error) {
    flagFirestoreUnavailable(error);
  }
}


// ---------------- Smart Multi-Layer Caching Layer ----------------
export class SmartCache {
  private static inMemory = new Map<string, { data: any; timestamp: number }>();

  static get<T>(key: string, ttlMs: number, type: 'memory' | 'session' | 'local' = 'memory'): T | null {
    const now = Date.now();

    // 1. Check In-Memory Cache (L1)
    const memEntry = this.inMemory.get(key);
    if (memEntry && now - memEntry.timestamp < ttlMs) {
      return memEntry.data as T;
    }

    // 2. Check SessionStorage Cache (L2)
    if (type === 'session' || type === 'local') {
      try {
        const sessionData = sessionStorage.getItem(key);
        if (sessionData) {
          const entry = JSON.parse(sessionData);
          if (now - entry.timestamp < ttlMs) {
            // Repopulate L1 cache for subsequent rapid access
            this.inMemory.set(key, { data: entry.data, timestamp: entry.timestamp });
            return entry.data as T;
          }
        }
      } catch (e) {}
    }

    // 3. Check LocalStorage Cache (L3)
    if (type === 'local') {
      try {
        const localData = localStorage.getItem(key);
        if (localData) {
          const entry = JSON.parse(localData);
          if (now - entry.timestamp < ttlMs) {
            // Repopulate L1 cache for subsequent rapid access
            this.inMemory.set(key, { data: entry.data, timestamp: entry.timestamp });
            return entry.data as T;
          }
        }
      } catch (e) {}
    }

    return null;
  }

  static set<T>(key: string, data: T, type: 'memory' | 'session' | 'local' = 'local'): void {
    const timestamp = Date.now();

    // Always set L1
    this.inMemory.set(key, { data, timestamp });

    // Set L2
    if (type === 'session' || type === 'local') {
      try {
        sessionStorage.setItem(key, JSON.stringify({ data, timestamp }));
      } catch (e) {}
    }

    // Set L3
    if (type === 'local') {
      try {
        localStorage.setItem(key, JSON.stringify({ data, timestamp }));
      } catch (e) {}
    }
  }

  static invalidate(pattern: string): void {
    console.log(`[SmartCache Invalidate] Invalidating keys matching pattern: ${pattern}`);
    
    // 1. Clear In-Memory
    for (const key of this.inMemory.keys()) {
      if (key.includes(pattern)) {
        this.inMemory.delete(key);
      }
    }

    // 2. Clear SessionStorage
    try {
      const sessionKeys = Object.keys(sessionStorage);
      for (const key of sessionKeys) {
        if (key.includes(pattern)) {
          sessionStorage.removeItem(key);
        }
      }
    } catch (e) {}

    // 3. Clear LocalStorage
    try {
      const localKeys = Object.keys(localStorage);
      for (const key of localKeys) {
        if (key.includes(pattern)) {
          localStorage.removeItem(key);
        }
      }
    } catch (e) {}
  }

  static clearAll(): void {
    this.inMemory.clear();
    try {
      sessionStorage.clear();
      // Remove only app-specific localStorage keys
      const localKeys = Object.keys(localStorage);
      for (const key of localKeys) {
        if (key.startsWith('articles_') || key.startsWith('article_') || key.startsWith('comments_') || key.startsWith('active_ads') || key.startsWith('all_authors')) {
          localStorage.removeItem(key);
        }
      }
    } catch (e) {}
  }
}

// ---------------- Articles ----------------

const CACHE_DURATION_MS = 10 * 60 * 1000; // 10 minutes cache duration
const ARTICLE_TIMESTAMP_KEY = 'pulsewire_articles_last_fetch_time';

export function getLastArticlesFetchTime(): number {
  try {
    const lastFetchTimeStr = localStorage.getItem(ARTICLE_TIMESTAMP_KEY);
    return lastFetchTimeStr ? parseInt(lastFetchTimeStr, 10) : 0;
  } catch {
    return 0;
  }
}

export function getArticlesCacheDuration(): number {
  return CACHE_DURATION_MS;
}

// Fetch all articles
export async function getAllArticles(includeDrafts = false, forceRefresh = false): Promise<Article[]> {
  const cacheKey = includeDrafts ? 'articles_all_with_drafts' : 'articles_all_published';
  const ttl = 10 * 60 * 1000; // 10 minutes

  if (shouldBypassFirestore()) {
    return LocalDbFallback.getArticles().filter(art => includeDrafts || art.status === 'published');
  }

  if (!forceRefresh) {
    const cached = SmartCache.get<Article[]>(cacheKey, ttl, 'local');
    if (cached) {
      console.log(`[SmartCache Hit] Serving full articles list from L1/L3 cache.`);
      return cached;
    }
  }

  try {
    console.log(`[SmartCache Miss] Fetching full articles from REST API /api/articles...`);
    const response = await fetch(`/api/articles?limit=300`);
    if (!response.ok) {
      throw new Error(`REST API returned ${response.status}`);
    }
    const resData = await response.json();
    const articles = resData.articles as Article[];

    // Filter or keep drafts depending on parameters
    const filtered = articles.filter(art => includeDrafts || art.status === 'published');

    SmartCache.set(cacheKey, filtered, 'local');
    LocalDbFallback.saveArticles(articles);
    try {
      localStorage.setItem(ARTICLE_TIMESTAMP_KEY, Date.now().toString());
    } catch (e) {}

    return filtered;
  } catch (err) {
    console.warn('REST API full fetch failed, falling back to direct query or local fallback:', err);
    try {
      const colRef = collection(db, 'articles');
      const q = query(colRef, orderBy('createdAt', 'desc'));
      const snapshot = await withTimeout(getDocs(q));
      const articles = snapshot.docs.map(doc => doc.data() as Article);

      const filtered = articles.filter(art => includeDrafts || art.status === 'published');

      SmartCache.set(cacheKey, filtered, 'local');
      LocalDbFallback.saveArticles(articles);

      return filtered;
    } catch (fsErr) {
      flagFirestoreUnavailable(fsErr);
      return LocalDbFallback.getArticles().filter(art => includeDrafts || art.status === 'published');
    }
  }
}

// Auto-publish any scheduled articles that are due
export async function publishDueScheduledArticles(): Promise<number> {
  try {
    const all = await getAllArticles(true);
    const now = new Date();
    const due = all.filter(art => art.status === 'scheduled' && new Date(art.publishedAt) <= now);
    
    if (due.length === 0) return 0;
    
    console.log(`Publishing ${due.length} due scheduled articles...`);
    for (const art of due) {
      const updated = {
        ...art,
        status: 'published' as const,
        updatedAt: now.toISOString()
      };
      await saveArticle(updated);
    }
    return due.length;
  } catch (error) {
    console.error("Error publishing due scheduled articles:", error);
    return 0;
  }
}

// Fetch articles by category
export async function getArticlesByCategory(category: string, forceRefresh = false): Promise<Article[]> {
  const cacheKey = `articles_category_${category.toLowerCase()}`;
  const ttl = 10 * 60 * 1000; // 10 minutes

  if (shouldBypassFirestore()) {
    const local = LocalDbFallback.getArticles().filter(art => art.status === 'published');
    return local.filter(art => {
      const cats = art.categories && art.categories.length > 0 ? art.categories : [art.category];
      return cats.some(c => c.toLowerCase() === category.toLowerCase());
    });
  }

  if (!forceRefresh) {
    const cached = SmartCache.get<Article[]>(cacheKey, ttl, 'local');
    if (cached) {
      console.log(`[SmartCache Hit] Serving category articles from client cache: ${category}`);
      return cached;
    }
  }

  try {
    console.log(`[SmartCache Miss] Fetching category ${category} articles from REST API...`);
    const response = await fetch(`/api/articles?category=${encodeURIComponent(category)}&limit=100`);
    if (!response.ok) {
      throw new Error(`REST API returned ${response.status}`);
    }
    const resData = await response.json();
    const articles = resData.articles as Article[];

    SmartCache.set(cacheKey, articles, 'local');
    return articles;
  } catch (err) {
    console.warn('REST API category fetch failed, falling back to full list filter:', err);
    const allArticles = await getAllArticles(false, false);
    const filtered = allArticles.filter(art => {
      const cats = art.categories && art.categories.length > 0 ? art.categories : [art.category];
      return cats.some(c => c.toLowerCase() === category.toLowerCase());
    });
    SmartCache.set(cacheKey, filtered, 'local');
    return filtered;
  }
}

// Fetch single article by slug
export async function getArticleBySlug(slug: string, forceRefresh = false): Promise<Article | null> {
  const cacheKey = `article_slug_${slug}`;
  const ttl = 30 * 60 * 1000; // 30 minutes

  const local = LocalDbFallback.getArticles();
  const cachedArt = local.find(a => a.slug === slug);

  if (shouldBypassFirestore()) {
    return cachedArt || null;
  }

  if (!forceRefresh) {
    const cached = SmartCache.get<Article>(cacheKey, ttl, 'local');
    if (cached) {
      console.log(`[SmartCache Hit] Serving article details from cache for slug: ${slug}`);
      return cached;
    }
  }

  try {
    console.log(`[SmartCache Miss] Fetching single article details via direct SDK query...`);
    const colRef = collection(db, 'articles');
    const q = query(colRef, where('slug', '==', slug), limit(1));
    const snapshot = await withTimeout(getDocs(q));
    
    if (snapshot.empty) {
      return cachedArt || null;
    }
    
    const fetchedArt = snapshot.docs[0].data() as Article;
    
    if (!fetchedArt.id) {
      fetchedArt.id = snapshot.docs[0].id;
    }

    SmartCache.set(cacheKey, fetchedArt, 'local');
    
    const idx = local.findIndex(a => a.id === fetchedArt.id);
    if (idx !== -1) {
      local[idx] = fetchedArt;
    } else {
      local.push(fetchedArt);
    }
    LocalDbFallback.saveArticles(local);

    return fetchedArt;
  } catch (err) {
    console.warn('Firestore slug query failed, falling back to cached:', err);
    flagFirestoreUnavailable(err);
    return cachedArt || null;
  }
}

// Fetch articles with pagination (supports infinite scroll / Admin dashboard)
export async function getArticlesPaginated(pageSize = 10, page = 1, category?: string): Promise<{ articles: Article[], totalCount: number, hasMore: boolean }> {
  if (shouldBypassFirestore()) {
    let list = LocalDbFallback.getArticles().filter(art => art.status === 'published');
    if (category) {
      list = list.filter(art => {
        const cats = art.categories && art.categories.length > 0 ? art.categories : [art.category];
        return cats.some(c => c.toLowerCase() === category.toLowerCase());
      });
    }
    const startIndex = (page - 1) * pageSize;
    const sliced = list.slice(startIndex, startIndex + pageSize);
    return {
      articles: sliced,
      totalCount: list.length,
      hasMore: startIndex + pageSize < list.length
    };
  }

  const cacheKey = `articles_paginated_page_${page}_size_${pageSize}_cat_${category || 'all'}`;
  const ttl = 10 * 60 * 1000; // 10 minutes

  const cached = SmartCache.get<any>(cacheKey, ttl, 'local');
  if (cached) {
    return cached;
  }

  try {
    const catParam = category ? `&category=${encodeURIComponent(category)}` : '';
    const response = await fetch(`/api/articles?limit=${pageSize}&page=${page}${catParam}`);
    if (!response.ok) {
      throw new Error(`REST API returned ${response.status}`);
    }
    const resData = await response.json();
    const result = {
      articles: resData.articles as Article[],
      totalCount: resData.totalCount as number,
      hasMore: resData.hasMore as boolean
    };

    SmartCache.set(cacheKey, result, 'local');
    return result;
  } catch (err) {
    console.warn('REST API paginated fetch failed, falling back to full list slice:', err);
    const allArticles = await getAllArticles(false, false);
    let list = allArticles;
    if (category) {
      list = list.filter(art => {
        const cats = art.categories && art.categories.length > 0 ? art.categories : [art.category];
        return cats.some(c => c.toLowerCase() === category.toLowerCase());
      });
    }
    const startIndex = (page - 1) * pageSize;
    const sliced = list.slice(startIndex, startIndex + pageSize);
    const result = {
      articles: sliced,
      totalCount: list.length,
      hasMore: startIndex + pageSize < list.length
    };
    SmartCache.set(cacheKey, result, 'local');
    return result;
  }
}

// Increment article view count
export async function incrementArticleViews(articleId: string) {
  const path = `articles/${articleId}`;

  // Always apply changes locally first
  const local = LocalDbFallback.getArticles();
  const index = local.findIndex(a => a.id === articleId);
  if (index !== -1) {
    local[index].views = (local[index].views || 0) + 1;
    LocalDbFallback.saveArticles(local);
  }

  if (shouldBypassFirestore()) return;

  try {
    const docRef = doc(db, 'articles', articleId);
    await updateDoc(docRef, {
      views: increment(1)
    });
  } catch (error) {
    flagFirestoreUnavailable(error);
  }
}

// Increment article likes count
export async function incrementArticleLikes(articleId: string) {
  const path = `articles/${articleId}`;

  // Always apply changes locally first
  const local = LocalDbFallback.getArticles();
  const index = local.findIndex(a => a.id === articleId);
  if (index !== -1) {
    local[index].likes = (local[index].likes || 0) + 1;
    LocalDbFallback.saveArticles(local);
  }

  if (shouldBypassFirestore()) return;

  try {
    const docRef = doc(db, 'articles', articleId);
    await updateDoc(docRef, {
      likes: increment(1)
    });
  } catch (error) {
    flagFirestoreUnavailable(error);
  }
}

// Increment article social shares count
export async function incrementArticleShares(articleId: string) {
  const path = `articles/${articleId}`;

  // Always apply changes locally first
  const local = LocalDbFallback.getArticles();
  const index = local.findIndex(a => a.id === articleId);
  if (index !== -1) {
    local[index].shareCount = (local[index].shareCount || 0) + 1;
    LocalDbFallback.saveArticles(local);
  }

  if (shouldBypassFirestore()) return;

  try {
    const docRef = doc(db, 'articles', articleId);
    await updateDoc(docRef, {
      shareCount: increment(1)
    });
  } catch (error) {
    flagFirestoreUnavailable(error);
  }
}

// Helper to recursively remove undefined values before writing to Firestore
function cleanUndefined<T>(obj: T): T {
  if (obj === null || obj === undefined) {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map(cleanUndefined) as unknown as T;
  }
  if (typeof obj === 'object') {
    const cleaned: any = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        const val = obj[key];
        if (val !== undefined) {
          cleaned[key] = cleanUndefined(val);
        }
      }
    }
    return cleaned as T;
  }
  return obj;
}

// Save or edit article
export async function saveArticle(article: Article): Promise<void> {
  const path = `articles/${article.id}`;

  // Always apply locally first
  const local = LocalDbFallback.getArticles();
  const index = local.findIndex(a => a.id === article.id);
  if (index !== -1) {
    local[index] = article;
  } else {
    local.push(article);
  }
  LocalDbFallback.saveArticles(local);

  // Invalidate client caches
  SmartCache.invalidate('articles_');
  SmartCache.invalidate('article_slug_');
  
  // Invalidate server cache asynchronously
  fetch('/api/articles/clear-cache', { method: 'POST' }).catch(() => {});

  if (shouldBypassFirestore()) return;

  try {
    const docRef = doc(db, 'articles', article.id);
    await setDoc(docRef, cleanUndefined(article));
  } catch (error) {
    flagFirestoreUnavailable(error);
  }
}

// Delete article
export async function deleteArticle(articleId: string): Promise<void> {
  const path = `articles/${articleId}`;

  // Always apply locally first
  const local = LocalDbFallback.getArticles();
  const filtered = local.filter(a => a.id !== articleId);
  LocalDbFallback.saveArticles(filtered);

  // Invalidate client caches
  SmartCache.invalidate('articles_');
  SmartCache.invalidate('article_slug_');

  // Invalidate server cache asynchronously
  fetch('/api/articles/clear-cache', { method: 'POST' }).catch(() => {});

  if (shouldBypassFirestore()) return;

  try {
    await deleteDoc(doc(db, 'articles', articleId));
  } catch (error) {
    flagFirestoreUnavailable(error);
  }
}

// ---------------- Comments ----------------

// Fetch comments for an article (cached for 5 minutes)
export async function getCommentsForArticle(articleId: string, forceRefresh = false): Promise<Comment[]> {
  const cacheKey = `comments_article_${articleId}`;
  const ttl = 5 * 60 * 1000; // 5 minutes

  if (shouldBypassFirestore()) {
    const localComments = LocalDbFallback.getComments();
    return localComments.filter(c => c.articleId === articleId && c.approved);
  }

  if (!forceRefresh) {
    const cached = SmartCache.get<Comment[]>(cacheKey, ttl, 'session');
    if (cached) {
      console.log(`[SmartCache Hit] Serving comments from session cache for article: ${articleId}`);
      return cached;
    }
  }

  try {
    const subColRef = collection(db, 'articles', articleId, 'comments');
    const q = query(subColRef, where('approved', '==', true), orderBy('createdAt', 'desc'));
    const snapshot = await withTimeout(getDocs(q));
    const comments = snapshot.docs.map(doc => doc.data() as Comment);
    
    SmartCache.set(cacheKey, comments, 'session');

    // Merge into local cache
    const cachedComments = LocalDbFallback.getComments().filter(c => c.articleId !== articleId);
    LocalDbFallback.saveComments([...cachedComments, ...comments]);

    return comments;
  } catch (error) {
    flagFirestoreUnavailable(error);
    const localComments = LocalDbFallback.getComments();
    return localComments.filter(c => c.articleId === articleId && c.approved);
  }
}

// Fetch all comments (for Admin panel review)
export async function getAllCommentsAcrossArticles(): Promise<(Comment & { articleTitle?: string })[]> {
  const path = 'articles';

  if (shouldBypassFirestore()) {
    const articles = await getAllArticles(true);
    const comments = LocalDbFallback.getComments();
    const map = new Map(articles.map(a => [a.id, a.title]));
    return comments.map(c => ({
      ...c,
      articleTitle: map.get(c.articleId) || 'Unknown Publication'
    })).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  try {
    // 1. Fetch all articles to map IDs to titles
    const articles = await getAllArticles(true);
    const articlesMap = new Map(articles.map(a => [a.id, a.title]));

    // 2. Fetch all comments from all articles in a SINGLE Collection Group query
    const commentsGroupRef = collectionGroup(db, 'comments');
    const q = query(commentsGroupRef, orderBy('createdAt', 'desc'));
    const snapshot = await withTimeout(getDocs(q));

    const commentsList: (Comment & { articleTitle?: string })[] = snapshot.docs.map(doc => {
      const commentData = doc.data() as Comment;
      return {
        ...commentData,
        articleTitle: articlesMap.get(commentData.articleId) || 'PulseWire Publication'
      };
    });

    // Update comments cache
    const rawComments = commentsList.map(({ articleTitle, ...rest }) => rest);
    if (rawComments.length > 0) {
      LocalDbFallback.saveComments(rawComments);
    }

    return commentsList;
  } catch (error) {
    flagFirestoreUnavailable(error);
    const articles = await getAllArticles(true);
    const comments = LocalDbFallback.getComments();
    const map = new Map(articles.map(a => [a.id, a.title]));
    return comments.map(c => ({
      ...c,
      articleTitle: map.get(c.articleId) || 'Unknown Publication'
    })).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }
}

// Add comment to article
export async function addCommentToArticle(articleId: string, comment: Comment): Promise<void> {
  const path = `articles/${articleId}/comments/${comment.id}`;

  // Always apply locally first
  const comments = LocalDbFallback.getComments();
  const index = comments.findIndex(c => c.id === comment.id);
  if (index !== -1) {
    comments[index] = comment;
  } else {
    comments.push(comment);
  }
  LocalDbFallback.saveComments(comments);

  // Invalidate comments cache for this article
  SmartCache.invalidate(`comments_article_${articleId}`);

  if (shouldBypassFirestore()) return;

  try {
    const docRef = doc(db, 'articles', articleId, 'comments', comment.id);
    await setDoc(docRef, cleanUndefined(comment));
  } catch (error) {
    flagFirestoreUnavailable(error);
  }
}

// Approve comment
export async function approveComment(articleId: string, commentId: string): Promise<void> {
  const path = `articles/${articleId}/comments/${commentId}`;

  // Always apply locally first
  const comments = LocalDbFallback.getComments();
  const index = comments.findIndex(c => c.id === commentId);
  if (index !== -1) {
    comments[index].approved = true;
    LocalDbFallback.saveComments(comments);
  }

  // Invalidate comments cache for this article
  SmartCache.invalidate(`comments_article_${articleId}`);

  if (shouldBypassFirestore()) return;

  try {
    const docRef = doc(db, 'articles', articleId, 'comments', commentId);
    await updateDoc(docRef, { approved: true });
  } catch (error) {
    flagFirestoreUnavailable(error);
  }
}

// Delete comment
export async function deleteComment(articleId: string, commentId: string): Promise<void> {
  const path = `articles/${articleId}/comments/${commentId}`;

  // Always apply locally first
  const comments = LocalDbFallback.getComments();
  const filtered = comments.filter(c => c.id !== commentId);
  LocalDbFallback.saveComments(filtered);

  // Invalidate comments cache for this article
  SmartCache.invalidate(`comments_article_${articleId}`);

  if (shouldBypassFirestore()) return;

  try {
    const docRef = doc(db, 'articles', articleId, 'comments', commentId);
    await deleteDoc(docRef);
  } catch (error) {
    flagFirestoreUnavailable(error);
  }
}

// ---------------- Newsletter ----------------

// Subscribe email to newsletter
export async function subscribeNewsletter(email: string): Promise<void> {
  const hashedEmail = email.toLowerCase().replace(/[^a-z0-9]/g, '_');
  const path = `newsletter/${hashedEmail}`;
  const subscription: NewsletterSubscription = {
    email: email.toLowerCase().trim(),
    subscribedAt: new Date().toISOString()
  };

  // Always apply locally first
  const subs = LocalDbFallback.getNewsletter();
  if (!subs.some(s => s.email === subscription.email)) {
    subs.push(subscription);
    LocalDbFallback.saveNewsletter(subs);
  }

  if (shouldBypassFirestore()) return;

  try {
    const docRef = doc(db, 'newsletter', hashedEmail);
    await setDoc(docRef, subscription);
  } catch (error) {
    flagFirestoreUnavailable(error);
  }
}

// Fetch all newsletter subscribers for Admin
export async function getNewsletterSubscribers(): Promise<NewsletterSubscription[]> {
  const path = 'newsletter';

  if (shouldBypassFirestore()) {
    return LocalDbFallback.getNewsletter();
  }

  try {
    const colRef = collection(db, 'newsletter');
    const snapshot = await withTimeout(getDocs(query(colRef, orderBy('subscribedAt', 'desc'))));
    const list = snapshot.docs.map(doc => doc.data() as NewsletterSubscription);
    LocalDbFallback.saveNewsletter(list);
    return list;
  } catch (error) {
    flagFirestoreUnavailable(error);
    return LocalDbFallback.getNewsletter();
  }
}

// ---------------- Advertisement Management ----------------

// Fetch active ads (cached for 1 hour)
export async function getActiveAds(): Promise<AdPlacement[]> {
  const cacheKey = 'active_ads';
  const ttl = 1 * 60 * 60 * 1000; // 1 hour

  if (shouldBypassFirestore()) {
    return LocalDbFallback.getAds().filter(ad => ad.active);
  }

  const cached = SmartCache.get<AdPlacement[]>(cacheKey, ttl, 'local');
  if (cached) {
    return cached;
  }

  try {
    const colRef = collection(db, 'ads');
    const q = query(colRef, where('active', '==', true));
    const snapshot = await withTimeout(getDocs(q));
    if (snapshot.empty) return SEED_ADS.filter(ad => ad.active);
    const ads = snapshot.docs.map(doc => doc.data() as AdPlacement);
    LocalDbFallback.saveAds(ads);
    SmartCache.set(cacheKey, ads, 'local');
    return ads;
  } catch (error) {
    flagFirestoreUnavailable(error);
    return LocalDbFallback.getAds().filter(ad => ad.active);
  }
}

// Fetch all ads (for admin - cached for 5 minutes)
export async function getAllAds(): Promise<AdPlacement[]> {
  const cacheKey = 'all_ads';
  const ttl = 5 * 60 * 1000; // 5 minutes

  if (shouldBypassFirestore()) {
    return LocalDbFallback.getAds();
  }

  const cached = SmartCache.get<AdPlacement[]>(cacheKey, ttl, 'local');
  if (cached) {
    return cached;
  }

  try {
    const colRef = collection(db, 'ads');
    const snapshot = await withTimeout(getDocs(colRef));
    const ads = snapshot.docs.map(doc => doc.data() as AdPlacement);
    LocalDbFallback.saveAds(ads);
    SmartCache.set(cacheKey, ads, 'local');
    return ads;
  } catch (error) {
    flagFirestoreUnavailable(error);
    return LocalDbFallback.getAds();
  }
}

// Add/Save ad
export async function saveAd(ad: AdPlacement): Promise<void> {
  const path = `ads/${ad.id}`;

  // Always apply locally first
  const ads = LocalDbFallback.getAds();
  const index = ads.findIndex(a => a.id === ad.id);
  if (index !== -1) {
    ads[index] = ad;
  } else {
    ads.push(ad);
  }
  LocalDbFallback.saveAds(ads);

  if (shouldBypassFirestore()) return;

  try {
    await setDoc(doc(db, 'ads', ad.id), cleanUndefined(ad));
  } catch (error) {
    flagFirestoreUnavailable(error);
  }
}

// Delete ad
export async function deleteAd(adId: string): Promise<void> {
  const path = `ads/${adId}`;

  // Always apply locally first
  const ads = LocalDbFallback.getAds();
  const filtered = ads.filter(a => a.id !== adId);
  LocalDbFallback.saveAds(filtered);

  if (shouldBypassFirestore()) return;

  try {
    await deleteDoc(doc(db, 'ads', adId));
  } catch (error) {
    flagFirestoreUnavailable(error);
  }
}

// Log impression
export async function logAdImpression(adId: string): Promise<void> {
  const path = `ads/${adId}`;

  // Always apply locally first
  const ads = LocalDbFallback.getAds();
  const index = ads.findIndex(a => a.id === adId);
  if (index !== -1) {
    ads[index].impressions = (ads[index].impressions || 0) + 1;
    LocalDbFallback.saveAds(ads);
  }

  if (shouldBypassFirestore()) return;

  try {
    const docRef = doc(db, 'ads', adId);
    await updateDoc(docRef, {
      impressions: increment(1)
    });
  } catch (error: any) {
    if (error?.code === 'not-found' || error?.message?.includes('No document to update')) {
      console.warn(`Ad ${adId} not found in Firestore, skipping impression log.`);
      return;
    }
    console.error("Error logging ad impression:", error);
  }
}

// Log click
export async function logAdClick(adId: string): Promise<void> {
  const path = `ads/${adId}`;

  // Always apply locally first
  const ads = LocalDbFallback.getAds();
  const index = ads.findIndex(a => a.id === adId);
  if (index !== -1) {
    ads[index].clicks = (ads[index].clicks || 0) + 1;
    LocalDbFallback.saveAds(ads);
  }

  if (shouldBypassFirestore()) return;

  try {
    const docRef = doc(db, 'ads', adId);
    await updateDoc(docRef, {
      clicks: increment(1)
    });
  } catch (error: any) {
    if (error?.code === 'not-found' || error?.message?.includes('No document to update')) {
      console.warn(`Ad ${adId} not found in Firestore, skipping click log.`);
      return;
    }
    console.error("Error logging ad click:", error);
  }
}

// Submit contact message to firestore db
export async function submitContactMessage(msg: ContactMessage): Promise<void> {
  const path = 'contacts';

  // Always apply locally first
  const msgs = LocalDbFallback.getContacts();
  msgs.push(msg);
  LocalDbFallback.saveContacts(msgs);

  if (shouldBypassFirestore()) return;

  try {
    const colRef = collection(db, 'contacts');
    await addDoc(colRef, msg);
  } catch (error) {
    flagFirestoreUnavailable(error);
  }
}

// ---------------- Authors / User Profiles ----------------

// Fetch all authors/user profiles (cached for 24 hours)
export async function getAllAuthors(): Promise<Author[]> {
  const cacheKey = 'all_authors';
  const ttl = 24 * 60 * 60 * 1000; // 24 hours

  if (shouldBypassFirestore()) {
    return LocalDbFallback.getAuthors();
  }

  const cached = SmartCache.get<Author[]>(cacheKey, ttl, 'local');
  if (cached) {
    return cached;
  }

  try {
    const colRef = collection(db, 'authors');
    const snapshot = await withTimeout(getDocs(colRef));
    const list = snapshot.docs.map(doc => doc.data() as Author);
    LocalDbFallback.saveAuthors(list);
    SmartCache.set(cacheKey, list, 'local');
    return list;
  } catch (error) {
    flagFirestoreUnavailable(error);
    return LocalDbFallback.getAuthors();
  }
}

// Fetch single author profile by ID
export async function getAuthorById(authorId: string): Promise<Author | null> {
  const path = `authors/${authorId}`;

  if (shouldBypassFirestore()) {
    const list = LocalDbFallback.getAuthors();
    return list.find(a => a.id === authorId) || null;
  }

  try {
    const docRef = doc(db, 'authors', authorId);
    const snapshot = await withTimeout(getDoc(docRef));
    if (!snapshot.exists()) {
      const list = LocalDbFallback.getAuthors();
      return list.find(a => a.id === authorId) || null;
    }
    const author = snapshot.data() as Author;
    
    // Save to cache
    const list = LocalDbFallback.getAuthors();
    const idx = list.findIndex(a => a.id === authorId);
    if (idx !== -1) {
      list[idx] = author;
    } else {
      list.push(author);
    }
    LocalDbFallback.saveAuthors(list);

    return author;
  } catch (error) {
    flagFirestoreUnavailable(error);
    const list = LocalDbFallback.getAuthors();
    return list.find(a => a.id === authorId) || null;
  }
}

// Save or edit author profile
export async function saveAuthor(author: Author): Promise<void> {
  const path = `authors/${author.id}`;

  // Always apply locally first
  const list = LocalDbFallback.getAuthors();
  const idx = list.findIndex(a => a.id === author.id);
  if (idx !== -1) {
    list[idx] = author;
  } else {
    list.push(author);
  }
  LocalDbFallback.saveAuthors(list);

  if (shouldBypassFirestore()) return;

  try {
    const docRef = doc(db, 'authors', author.id);
    await setDoc(docRef, cleanUndefined(author));
  } catch (error) {
    flagFirestoreUnavailable(error);
  }
}

// Delete author profile
export async function deleteAuthor(authorId: string): Promise<void> {
  const path = `authors/${authorId}`;

  // Always apply locally first
  const list = LocalDbFallback.getAuthors();
  const filtered = list.filter(a => a.id !== authorId);
  LocalDbFallback.saveAuthors(filtered);

  if (shouldBypassFirestore()) return;

  try {
    await deleteDoc(doc(db, 'authors', authorId));
  } catch (error) {
    flagFirestoreUnavailable(error);
  }
}

// Update author status (for approval workflow)
export async function updateAuthorStatus(authorId: string, status: 'approved' | 'pending'): Promise<void> {
  const path = `authors/${authorId}`;

  // Always apply locally first
  const list = LocalDbFallback.getAuthors();
  const idx = list.findIndex(a => a.id === authorId);
  if (idx !== -1) {
    list[idx].status = status;
    LocalDbFallback.saveAuthors(list);
  }

  if (shouldBypassFirestore()) return;

  try {
    const docRef = doc(db, 'authors', authorId);
    await updateDoc(docRef, { status });
  } catch (error) {
    flagFirestoreUnavailable(error);
  }
}
