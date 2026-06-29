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
  increment 
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

// Seeding function
export async function seedDatabaseIfEmpty(force = false) {
  const pathForArticles = 'articles';
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
    const qSnapshot = await getDocs(query(articlesCol, limit(1)));
    
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
          authorAvatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=100&q=80",
          content: "This is brilliant! Excellent initiative by the ministry. We need more centers in Takoradi and Tamale too.",
          createdAt: "2026-06-21T12:00:00Z",
          approved: true
        },
        {
          id: "comment-2",
          articleId: "seed-art-1",
          authorId: "guest",
          authorName: "Abena Boateng",
          authorAvatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=100&q=80",
          content: "As a young female developer, this is highly motivating. I will register at the Kumasi hub next week!",
          createdAt: "2026-06-21T14:30:00Z",
          approved: true
        },
        {
          id: "comment-3",
          articleId: "seed-art-2",
          authorId: "guest",
          authorName: "Chinedu Okafor",
          authorAvatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=100&q=80",
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
    console.error('Error seeding Firestore:', error);
    handleFirestoreError(error, OperationType.LIST, pathForArticles);
  }
}

// Clear all data from the database
export async function clearAllDatabaseData(): Promise<void> {
  try {
    // 1. Delete all articles and their comments subcollections
    const articlesCol = collection(db, 'articles');
    const articlesSnapshot = await getDocs(articlesCol);
    for (const d of articlesSnapshot.docs) {
      const artId = d.id;
      // Get and delete comments subcollection
      const commentsCol = collection(db, 'articles', artId, 'comments');
      const commentsSnapshot = await getDocs(commentsCol);
      for (const cd of commentsSnapshot.docs) {
        await deleteDoc(doc(db, 'articles', artId, 'comments', cd.id));
      }
      // Delete article document
      await deleteDoc(doc(db, 'articles', artId));
    }

    // 2. Delete all ads
    const adsCol = collection(db, 'ads');
    const adsSnapshot = await getDocs(adsCol);
    for (const d of adsSnapshot.docs) {
      await deleteDoc(doc(db, 'ads', d.id));
    }

    // 3. Delete all newsletter subscriptions
    const newsCol = collection(db, 'newsletter');
    const newsSnapshot = await getDocs(newsCol);
    for (const d of newsSnapshot.docs) {
      await deleteDoc(doc(db, 'newsletter', d.id));
    }

    // 4. Delete all authors
    const authorsCol = collection(db, 'authors');
    const authorsSnapshot = await getDocs(authorsCol);
    for (const d of authorsSnapshot.docs) {
      await deleteDoc(doc(db, 'authors', d.id));
    }

    console.log('All database data cleared successfully!');
  } catch (error) {
    console.error('Error clearing database:', error);
    handleFirestoreError(error, OperationType.DELETE, 'all');
  }
}

// ---------------- Articles ----------------

// Fetch all articles
export async function getAllArticles(includeDrafts = false): Promise<Article[]> {
  const path = 'articles';
  let docs: Article[] = [];
  try {
    const colRef = collection(db, path);
    // Use single-field query to avoid composite index requirements
    const q = query(colRef, orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    docs = snapshot.docs.map(doc => doc.data() as Article);
  } catch (error) {
    console.warn("Firestore fetch failed, falling back to seed data:", error);
    docs = SEED_ARTICLES;
  }
  
  if (includeDrafts) {
    return docs;
  } else {
    return docs.filter(art => art.status === 'published');
  }
}

// Fetch articles by category
export async function getArticlesByCategory(category: string): Promise<Article[]> {
  const path = 'articles';
  let list: Article[] = [];
  try {
    const colRef = collection(db, path);
    // Use single-field query to avoid composite index requirements
    const q = query(colRef, orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    list = snapshot.docs.map(doc => doc.data() as Article);
  } catch (error) {
    console.warn("Firestore fetch failed, falling back to seed data:", error);
    list = SEED_ARTICLES;
  }
  return list.filter(art => {
    if (art.status !== 'published') return false;
    const cats = art.categories && art.categories.length > 0 ? art.categories : [art.category];
    return cats.some(c => c.toLowerCase() === category.toLowerCase());
  });
}

// Fetch single article by slug
export async function getArticleBySlug(slug: string): Promise<Article | null> {
  const path = 'articles';
  try {
    const colRef = collection(db, path);
    const q = query(colRef, where('slug', '==', slug), limit(1));
    const snapshot = await getDocs(q);
    if (snapshot.empty) return SEED_ARTICLES.find(a => a.slug === slug) || null;
    return snapshot.docs[0].data() as Article;
  } catch (error) {
    console.warn("Firestore fetch failed, falling back to seed data:", error);
    return SEED_ARTICLES.find(a => a.slug === slug) || null;
  }
}

// Increment article view count
export async function incrementArticleViews(articleId: string) {
  const path = `articles/${articleId}`;
  try {
    const docRef = doc(db, 'articles', articleId);
    await updateDoc(docRef, {
      views: increment(1)
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

// Increment article likes count
export async function incrementArticleLikes(articleId: string) {
  const path = `articles/${articleId}`;
  try {
    const docRef = doc(db, 'articles', articleId);
    await updateDoc(docRef, {
      likes: increment(1)
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
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
  try {
    const docRef = doc(db, 'articles', article.id);
    await setDoc(docRef, cleanUndefined(article));
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// Delete article
export async function deleteArticle(articleId: string): Promise<void> {
  const path = `articles/${articleId}`;
  try {
    await deleteDoc(doc(db, 'articles', articleId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// ---------------- Comments ----------------

// Fetch comments for an article
export async function getCommentsForArticle(articleId: string): Promise<Comment[]> {
  const path = `articles/${articleId}/comments`;
  try {
    const subColRef = collection(db, 'articles', articleId, 'comments');
    const q = query(subColRef, where('approved', '==', true), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data() as Comment);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

// Fetch all comments (for Admin panel review)
export async function getAllCommentsAcrossArticles(): Promise<(Comment & { articleTitle?: string })[]> {
  const path = 'articles';
  try {
    // First, get all articles to correlate titles
    const articles = await getAllArticles(true);
    const commentsList: (Comment & { articleTitle?: string })[] = [];

    for (const art of articles) {
      const subColPath = `articles/${art.id}/comments`;
      try {
        const subColRef = collection(db, 'articles', art.id, 'comments');
        const snapshot = await getDocs(subColRef);
        snapshot.docs.forEach(doc => {
          const commentData = doc.data() as Comment;
          commentsList.push({
            ...commentData,
            articleTitle: art.title
          });
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.LIST, subColPath);
      }
    }

    // Sort by createdAt descending
    return commentsList.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

// Add comment to article
export async function addCommentToArticle(articleId: string, comment: Comment): Promise<void> {
  const path = `articles/${articleId}/comments/${comment.id}`;
  try {
    const docRef = doc(db, 'articles', articleId, 'comments', comment.id);
    await setDoc(docRef, cleanUndefined(comment));
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// Approve comment
export async function approveComment(articleId: string, commentId: string): Promise<void> {
  const path = `articles/${articleId}/comments/${commentId}`;
  try {
    const docRef = doc(db, 'articles', articleId, 'comments', commentId);
    await updateDoc(docRef, { approved: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

// Delete comment
export async function deleteComment(articleId: string, commentId: string): Promise<void> {
  const path = `articles/${articleId}/comments/${commentId}`;
  try {
    const docRef = doc(db, 'articles', articleId, 'comments', commentId);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// ---------------- Newsletter ----------------

// Subscribe email to newsletter
export async function subscribeNewsletter(email: string): Promise<void> {
  const hashedEmail = email.toLowerCase().replace(/[^a-z0-9]/g, '_');
  const path = `newsletter/${hashedEmail}`;
  try {
    const docRef = doc(db, 'newsletter', hashedEmail);
    const subscription: NewsletterSubscription = {
      email: email.toLowerCase().trim(),
      subscribedAt: new Date().toISOString()
    };
    await setDoc(docRef, subscription);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// Fetch all newsletter subscribers for Admin
export async function getNewsletterSubscribers(): Promise<NewsletterSubscription[]> {
  const path = 'newsletter';
  try {
    const colRef = collection(db, 'newsletter');
    const snapshot = await getDocs(query(colRef, orderBy('subscribedAt', 'desc')));
    return snapshot.docs.map(doc => doc.data() as NewsletterSubscription);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

// ---------------- Advertisement Management ----------------

// Fetch active ads
export async function getActiveAds(): Promise<AdPlacement[]> {
  const path = 'ads';
  try {
    const colRef = collection(db, path);
    const q = query(colRef, where('active', '==', true));
    const snapshot = await getDocs(q);
    if (snapshot.empty) return SEED_ADS.filter(ad => ad.active);
    return snapshot.docs.map(doc => doc.data() as AdPlacement);
  } catch (error) {
    console.warn("Firestore fetch failed, falling back to seed ads:", error);
    return SEED_ADS.filter(ad => ad.active);
  }
}

// Fetch all ads (for admin)
export async function getAllAds(): Promise<AdPlacement[]> {
  const path = 'ads';
  try {
    const colRef = collection(db, path);
    const snapshot = await getDocs(colRef);
    return snapshot.docs.map(doc => doc.data() as AdPlacement);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

// Add/Save ad
export async function saveAd(ad: AdPlacement): Promise<void> {
  const path = `ads/${ad.id}`;
  try {
    await setDoc(doc(db, 'ads', ad.id), cleanUndefined(ad));
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// Delete ad
export async function deleteAd(adId: string): Promise<void> {
  const path = `ads/${adId}`;
  try {
    await deleteDoc(doc(db, 'ads', adId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// Log impression
export async function logAdImpression(adId: string): Promise<void> {
  const path = `ads/${adId}`;
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
  try {
    const colRef = collection(db, 'contacts');
    await addDoc(colRef, msg);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// ---------------- Authors / User Profiles ----------------

// Fetch all authors/user profiles
export async function getAllAuthors(): Promise<Author[]> {
  const path = 'authors';
  try {
    const colRef = collection(db, path);
    const snapshot = await getDocs(colRef);
    return snapshot.docs.map(doc => doc.data() as Author);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
}

// Fetch single author profile by ID
export async function getAuthorById(authorId: string): Promise<Author | null> {
  const path = `authors/${authorId}`;
  try {
    const docRef = doc(db, 'authors', authorId);
    const snapshot = await getDoc(docRef);
    if (!snapshot.exists()) return null;
    return snapshot.data() as Author;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
    return null;
  }
}

// Save or edit author profile
export async function saveAuthor(author: Author): Promise<void> {
  const path = `authors/${author.id}`;
  try {
    const docRef = doc(db, 'authors', author.id);
    await setDoc(docRef, cleanUndefined(author));
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// Delete author profile
export async function deleteAuthor(authorId: string): Promise<void> {
  const path = `authors/${authorId}`;
  try {
    await deleteDoc(doc(db, 'authors', authorId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

