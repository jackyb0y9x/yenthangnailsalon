import type { Metadata } from 'next';

export interface LocalizedMetadataOptions {
  locale: string;
  pathname?: string;
  title: string;
  description: string;
  ogTitle?: string;
  ogImage?: string;
  noIndex?: boolean;
}

export function generateLocalizedMetadata({
  locale,
  pathname = '',
  title,
  description,
  ogTitle,
  ogImage = '/images/og-glamour-nails.jpg',
  noIndex = false,
}: LocalizedMetadataOptions): Metadata {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://glamournails.com.au';
  const cleanPath = pathname ? (pathname.startsWith('/') ? pathname : `/${pathname}`) : '';
  const canonicalUrl = `${siteUrl}/${locale}${cleanPath}`;

  const isVi = locale === 'vi';
  const currentOgLocale = isVi ? 'vi_VN' : 'en_AU';
  const alternateOgLocale = isVi ? ['en_AU'] : ['vi_VN'];
  const resolvedOgTitle = ogTitle || title;

  return {
    title,
    description,
    metadataBase: new URL(siteUrl),
    alternates: {
      canonical: canonicalUrl,
      languages: {
        'en': `${siteUrl}/en${cleanPath}`,
        'en-AU': `${siteUrl}/en${cleanPath}`,
        'vi': `${siteUrl}/vi${cleanPath}`,
        'vi-VN': `${siteUrl}/vi${cleanPath}`,
        'vi-AU': `${siteUrl}/vi${cleanPath}`,
        'x-default': `${siteUrl}/en${cleanPath}`,
      },
    },
    openGraph: {
      title: resolvedOgTitle,
      description,
      url: canonicalUrl,
      siteName: 'Glamour Nails & Spa Sydney',
      locale: currentOgLocale,
      alternateLocale: alternateOgLocale,
      type: 'website',
      images: [
        {
          url: ogImage.startsWith('http') ? ogImage : `${siteUrl}${ogImage}`,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: resolvedOgTitle,
      description,
      images: [ogImage.startsWith('http') ? ogImage : `${siteUrl}${ogImage}`],
    },
    robots: noIndex
      ? { index: false, follow: false }
      : {
          index: true,
          follow: true,
          googleBot: {
            index: true,
            follow: true,
            'max-video-preview': -1,
            'max-image-preview': 'large',
            'max-snippet': -1,
          },
        },
    other: {
      'geo.region': 'AU-NSW',
      'geo.placename': 'Sydney',
      'geo.position': '-33.8688;151.2093',
      'ICBM': '-33.8688, 151.2093',
    },
  };
}
