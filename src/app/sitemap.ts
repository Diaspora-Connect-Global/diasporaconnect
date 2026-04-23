import { MetadataRoute } from 'next';

const BASE = (process.env.NEXT_PUBLIC_APP_URL || 'https://diaspoplug.com').replace(/\/$/, '');
const LOCALES = ['en', 'fr', 'de', 'it'] as const;

const publicRoutes: Array<{
  path: string;
  priority: number;
  changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency'];
}> = [
  { path: '',          priority: 1.0, changeFrequency: 'daily' },
  { path: '/about',    priority: 0.9, changeFrequency: 'monthly' },
  { path: '/contact',  priority: 0.8, changeFrequency: 'monthly' },
  { path: '/help',     priority: 0.7, changeFrequency: 'weekly' },
  { path: '/signup',   priority: 0.7, changeFrequency: 'monthly' },
  { path: '/signin',   priority: 0.6, changeFrequency: 'monthly' },
  { path: '/terms',    priority: 0.4, changeFrequency: 'yearly' },
  { path: '/privacy',  priority: 0.4, changeFrequency: 'yearly' },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return LOCALES.flatMap((locale) =>
    publicRoutes.map((route) => ({
      url: `${BASE}/${locale}${route.path}`,
      lastModified: now,
      changeFrequency: route.changeFrequency,
      priority: route.priority,
      alternates: {
        languages: Object.fromEntries(
          LOCALES.map((l) => [l, `${BASE}/${l}${route.path}`])
        ),
      },
    }))
  );
}
