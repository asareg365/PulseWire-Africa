export interface Author {
  id: string;
  name: string;
  bio: string;
  avatar: string;
  email: string;
  role: 'admin' | 'editor' | 'contributor';
  createdAt: string;
}

export interface Article {
  id: string;
  title: string;
  slug: string;
  summary: string;
  content: string; // HTML or Markdown
  featuredImage: string;
  images: string[];
  category: string; // e.g. Ghana, Africa, World, Sports, Football, Business, Technology, Entertainment, Health, Lifestyle
  categories?: string[]; // Multiple categories support
  tags: string[];
  authorId: string;
  authorName: string;
  createdAt: string;
  updatedAt: string;
  publishedAt: string; // date string or ISO
  status: 'draft' | 'published' | 'scheduled';
  views: number;
  likes: number;
  isSponsored: boolean;
  isAffiliate: boolean;
  sponsorName?: string;
  affiliateLink?: string;
}

export interface Comment {
  id: string;
  articleId: string;
  authorId: string; // 'guest' or uid
  authorName: string;
  authorAvatar: string;
  content: string;
  createdAt: string;
  approved: boolean;
}

export interface AdPlacement {
  id: string;
  title: string;
  type: 'banner' | 'sidebar' | 'in-article' | 'sticky';
  imageUrl: string;
  link: string;
  active: boolean;
  impressions: number;
  clicks: number;
}

export interface NewsletterSubscription {
  email: string;
  subscribedAt: string;
}

export const CATEGORIES = [
  { id: 'ghana', name: 'Ghana', description: 'Latest news, politics, and events from Ghana.' },
  { id: 'africa', name: 'Africa', description: 'Continental updates, pan-African news, and developments.' },
  { id: 'world', name: 'World', description: 'Global breaking news and international affairs.' },
  { id: 'sports', name: 'Sports', description: 'Sports reporting, athletics, and international events.' },
  { id: 'football', name: 'Football', description: 'Comprehensive coverage of African and global football.' },
  { id: 'business', name: 'Business', description: 'Market reports, economic updates, and African enterprise.' },
  { id: 'technology', name: 'Technology', description: 'Innovation, tech startups, and digital transformation in Africa.' },
  { id: 'entertainment', name: 'Entertainment', description: 'Music, movies, celebrity updates, and pop culture.' },
  { id: 'health', name: 'Health', description: 'Wellness, public health campaigns, and medical updates.' },
  { id: 'lifestyle', name: 'Lifestyle', description: 'Travel, fashion, food, and culture articles.' }
];

export interface ContactMessage {
  id?: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  submittedAt: string;
}

