import type { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://glamournails.com.au';
  const locales = ['en', 'vi'] as const;
  const routes = [
    { path: '', priority: 1.0, changeFrequency: 'weekly' as const },
    { path: '/services', priority: 0.9, changeFrequency: 'weekly' as const },
    { path: '/gallery', priority: 0.8, changeFrequency: 'weekly' as const },
    { path: '/contact', priority: 0.8, changeFrequency: 'monthly' as const },
    { path: '/about', priority: 0.7, changeFrequency: 'monthly' as const },
  ];

  const now = new Date();
  const entries: MetadataRoute.Sitemap = [];

  for (const route of routes) {
    for (const locale of locales) {
      entries.push({
        url: `${baseUrl}/${locale}${route.path}`,
        lastModified: now,
        changeFrequency: route.changeFrequency,
        priority: route.priority,
        alternates: {
          languages: {
            'en': `${baseUrl}/en${route.path}`,
            'en-AU': `${baseUrl}/en${route.path}`,
            'vi': `${baseUrl}/vi${route.path}`,
            'vi-VN': `${baseUrl}/vi${route.path}`,
            'vi-AU': `${baseUrl}/vi${route.path}`,
            'x-default': `${baseUrl}/en${route.path}`,
          },
        },
      });
    }
  }

  return entries;
}
