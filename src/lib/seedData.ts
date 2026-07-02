import { Article, AdPlacement, Author } from '../types';

export const SEED_ARTICLES: Article[] = [
  {
    id: "small-businesses-social-media-2026",
    title: "How Small Businesses Can Use Social Media to Increase Sales in 2026",
    slug: "how-small-businesses-can-use-social-media-to-increase-sales",
    summary: "Social media has evolved from a communication tool into one of the most powerful marketing platforms for businesses. With the right strategy, even small businesses can attract new customers, strengthen their brand, and increase sales without spending large sums on advertising.",
    content: `**PulseWire Africa Business Desk**

In today's digital economy, social media has become an essential tool for businesses looking to grow their customer base and increase revenue. For small businesses, platforms such as Facebook, Instagram, TikTok, LinkedIn, and WhatsApp Business provide affordable ways to connect directly with potential customers, showcase products, and build long-term relationships.

Unlike traditional advertising, social media allows businesses to engage with audiences in real time. Customers can ask questions, leave reviews, and share recommendations, creating trust and credibility that often lead to increased sales.

One of the biggest advantages for small businesses is the ability to reach targeted audiences without a massive marketing budget. Through organic content, live videos, customer testimonials, and short-form videos, businesses can consistently remain visible to their audience while strengthening their online presence.

Experts recommend that businesses post consistently and provide valuable content instead of focusing solely on selling products. Educational posts, behind-the-scenes videos, success stories, product demonstrations, and customer feedback often generate higher engagement than repetitive promotional content.

Platforms like TikTok and Instagram Reels have also changed the way businesses market their products. Short, engaging videos can quickly reach thousands—or even millions—of viewers, giving small businesses opportunities that were previously available only to larger companies with substantial advertising budgets.

Facebook remains an effective platform for community building and customer engagement, while LinkedIn continues to be a valuable network for business-to-business marketing, professional services, and industry networking.

Another important strategy is responding promptly to customer inquiries. Fast responses to comments and messages improve customer satisfaction and increase the likelihood of completing a sale.

For entrepreneurs in Ghana and across Africa, social media offers access to local, regional, and international markets. Businesses can now sell products beyond their immediate communities, expanding their customer base through digital marketing and online commerce.

However, success on social media requires more than simply creating an account. Businesses should develop a clear content strategy, maintain consistent branding, analyze audience engagement, and adapt to changing trends. Combining quality content with excellent customer service remains one of the most effective ways to convert followers into loyal customers.

As digital technology continues to reshape commerce across Africa, businesses that embrace social media marketing today will be better positioned to compete in an increasingly connected marketplace.

---

## Key Takeaways

* Build a consistent posting schedule.
* Share valuable and engaging content.
* Use short-form videos to increase reach.
* Respond quickly to customer inquiries.
* Maintain consistent branding across platforms.
* Monitor analytics to improve performance.
* Focus on building trust before making sales.`,
    featuredImage: "/small_biz_social_media_1782769304440.jpg",
    images: [],
    category: "business",
    categories: ["business", "technology"],
    tags: ["Small Business", "Social Media Marketing", "Digital Marketing", "Facebook Marketing", "Instagram Marketing", "TikTok Business", "LinkedIn Marketing", "WhatsApp Business", "Entrepreneurship", "Business Growth", "Online Marketing", "African Business", "Ghana Business", "Marketing Strategy", "Customer Engagement", "Branding", "Business Tips", "PulseWire Africa"],
    authorId: "george-oppong-asare",
    authorName: "George Oppong Asare",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    publishedAt: new Date().toISOString(),
    status: "published",
    views: 0,
    likes: 0,
    isSponsored: false,
    isAffiliate: false
  },
  {
    id: "afrobeats-soundwave-global-billion-dollar-revolution",
    title: "The Afrobeats Soundwave: Driving a Global Billion-Dollar Entertainment Revolution",
    slug: "afrobeats-soundwave-global-billion-dollar-revolution",
    summary: "From Lagos and Accra to the global stage, West African artists are transforming international streaming charts and packing iconic arenas worldwide.",
    content: `No longer relegated to specialized categories, West Africa’s signature Afrobeats genre has transitioned into a global musical hegemony. African artists are selling out the O2 Arena in London, the Madison Square Garden in New York, and dominating premium streaming lists worldwide.

Major international record labels are establishing full-time subsidiaries in Lagos and Accra, vying to sign the next wave of local talent.

### Economic Windfalls
The streaming boom is translating to direct economic benefits. West African music festivals now attract hundreds of thousands of international tourists, especially during the December festive season ("December in GH").

"Afrobeats is more than dance music; it is the ultimate vehicle for African soft power and economic tourism," notes musical director Yaw Ansah. "We are telling our own stories, and the entire globe is dancing to the tempo."`,
    featuredImage: "/logo-wide.svg",
    images: [],
    category: "entertainment",
    tags: ["Afrobeats", "Music", "AccraFestivals", "GlobalStreaming", "Culture"],
    authorId: "george-oppong-asare",
    authorName: "George Oppong Asare",
    createdAt: "2026-06-23T14:20:00Z",
    updatedAt: "2026-06-23T14:20:00Z",
    publishedAt: "2026-06-23T14:30:00Z",
    status: "published",
    views: 1890,
    likes: 450,
    isSponsored: false,
    isAffiliate: false
  }
];

export const SEED_ADS: AdPlacement[] = [
  {
    id: "seed-ad-1",
    title: "Fly African Airways - Connect Directly Accra to London",
    type: "banner",
    imageUrl: "/logo-wide.svg",
    link: "https://example.com/airline-offer",
    active: true,
    impressions: 240,
    clicks: 18
  },
  {
    id: "seed-ad-2",
    title: "Pulse Fintech - Secure Cross-Border Mobile Wallet",
    type: "sidebar",
    imageUrl: "/favicon.svg",
    link: "https://example.com/fintech",
    active: true,
    impressions: 180,
    clicks: 12
  }
];

export const SEED_AUTHORS: Author[] = [
  {
    id: "george-oppong-asare",
    name: "George Oppong Asare",
    role: "Founder & Chief Editor",
    bio: "George Oppong Asare oversees all editorial operations, deep-dive investigations, and strategic bureau expansion across West Africa. He is a seasoned investigative journalist with over a decade of experience tracking economic development, public governance, and trade infrastructure on the continent.",
    avatar: "https://ui-avatars.com/api/?name=George+Oppong+Asare&background=f1f5f9&color=dc2626&bold=true&size=256",
    email: "editor@pulsewireafrica.news",
    createdAt: "2026-06-21T09:00:00Z",
    twitter: "GeorgeAsarePW",
    linkedin: "george-oppong-asare"
  },
  {
    id: "christian-asare-tuah",
    name: "Christian Asare-Tuah",
    role: "Chief Administrator & Lead Editor",
    bio: "Christian manages day-to-day operations, editorial standards, and newsroom workflows. An expert in regional economic integration and development models, he ensures PulseWire's reporting remains hyper-factual, highly contextualized, and fully independent.",
    avatar: "https://ui-avatars.com/api/?name=Christian+Asare-Tuah&background=e0f2fe&color=0284c7&bold=true&size=256",
    email: "admin@pulsewireafrica.news",
    createdAt: "2026-06-21T09:00:00Z",
    twitter: "CAT_PulseWire",
    linkedin: "christian-asare-tuah"
  },
  {
    id: "pulsewire-staff-1",
    name: "Ama Serwaa",
    role: "Senior Tech & Business Correspondent",
    bio: "Ama reports on tech ecosystems, financial inclusion, and the startup landscape redefining West and East African commerce. With a background in financial economics, her columns analyze how digital technologies bypass traditional market barriers.",
    avatar: "https://ui-avatars.com/api/?name=Ama+Serwaa&background=fdf2f8&color=db2777&bold=true&size=256",
    email: "ama.serwaa@pulsewireafrica.news",
    createdAt: "2026-06-21T09:00:00Z",
    twitter: "AmaSerwaaTech"
  },
  {
    id: "pulsewire-staff-2",
    name: "Kofi Owusu",
    role: "Regional Politics & Governance Analyst",
    bio: "Kofi focuses on democratic transitions, election integrity, and multilateral diplomatic relationships within the ECOWAS and African Union blocs. He has covered multiple historic elections and specializes in constitutional reform policy.",
    avatar: "https://ui-avatars.com/api/?name=Kofi+Owusu&background=f0fdf4&color=16a34a&bold=true&size=256",
    email: "kofi.owusu@pulsewireafrica.news",
    createdAt: "2026-06-21T09:00:00Z",
    twitter: "KofiOwusuGov"
  },
  {
    id: "pulsewire-staff-3",
    name: "Abidemi Babangida",
    role: "Investigative Reporter & Energy Correspondent",
    bio: "Abidemi leads investigative coverage on climate policy, infrastructure funding, oil & gas concessions, and the green transition in sub-Saharan Africa. She is a recipient of several journalism awards for environmental reporting.",
    avatar: "https://ui-avatars.com/api/?name=Abidemi+Babangida&background=fef9c3&color=ca8a04&bold=true&size=256",
    email: "abidemi.b@pulsewireafrica.news",
    createdAt: "2026-06-21T09:00:00Z",
    twitter: "AbidemiEnergy"
  }
];
