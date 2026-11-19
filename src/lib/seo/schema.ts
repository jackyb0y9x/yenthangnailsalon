/**
 * Schema.org LocalBusiness JSON-LD Generator for Australian Nail Salon.
 */
export interface LocalBusinessInfo {
  salonName?: string;
  abn?: string;
  phone?: string;
  mobile?: string;
  email?: string;
  streetAddress?: string;
  suburb?: string;
  state?: string;
  postcode?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
  openingHours?: Record<string, { open: string; close: string; closed: boolean }>;
  socialLinks?: Record<string, string>;
  siteUrl?: string;
  priceRange?: string;
}

export const DEFAULT_SALON_INFO: LocalBusinessInfo = {
  salonName: 'Glamour Nails & Spa Sydney',
  abn: '51 824 753 556',
  phone: '+61 2 9123 4567',
  mobile: '0412 345 678',
  email: 'hello@glamournails.com.au',
  streetAddress: 'Suite 2, 188 George Street',
  suburb: 'Sydney',
  state: 'NSW',
  postcode: '2000',
  country: 'AU',
  latitude: -33.8688,
  longitude: 151.2093,
  siteUrl: 'https://glamournails.com.au',
  priceRange: '$$',
  openingHours: {
    monday: { open: '09:00', close: '18:00', closed: false },
    tuesday: { open: '09:00', close: '18:00', closed: false },
    wednesday: { open: '09:00', close: '18:00', closed: false },
    thursday: { open: '09:00', close: '20:00', closed: false },
    friday: { open: '09:00', close: '20:00', closed: false },
    saturday: { open: '09:00', close: '18:00', closed: false },
    sunday: { open: '10:00', close: '17:00', closed: false },
  },
  socialLinks: {
    instagram: 'https://instagram.com/glamournails.sydney',
    facebook: 'https://facebook.com/glamournails.sydney',
    tiktok: 'https://tiktok.com/@glamournails.sydney',
  },
};

export function generateLocalBusinessSchema(customInfo?: Partial<LocalBusinessInfo>) {
  const info = { ...DEFAULT_SALON_INFO, ...customInfo };
  const siteUrl = info.siteUrl || 'https://glamournails.com.au';

  const dayMap: Record<string, string> = {
    monday: 'Monday',
    tuesday: 'Tuesday',
    wednesday: 'Wednesday',
    thursday: 'Thursday',
    friday: 'Friday',
    saturday: 'Saturday',
    sunday: 'Sunday',
  };

  const openingHoursSpecs = Object.entries(info.openingHours || {})
    .filter(([_, val]) => !val.closed && val.open && val.close)
    .map(([dayKey, val]) => ({
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: dayMap[dayKey.toLowerCase()] || dayKey,
      opens: val.open,
      closes: val.close,
    }));

  const PRIVATE_OR_NON_SOCIAL_KEYS = new Set([
    'telegrambottoken',
    'telegramchatid',
    'telegramenabled',
    'instagramwebhookurl',
    'instagramenabled',
    'website_title',
    'website_title_vi',
    'website_tagline',
    'website_tagline_vi',
    'logo_url',
  ]);

  const sameAs = Object.entries(info.socialLinks || {})
    .filter(([key, val]) => {
      if (PRIVATE_OR_NON_SOCIAL_KEYS.has(key.toLowerCase())) return false;
      if (typeof val !== 'string') return false;
      const trimmed = val.trim();
      return /^https?:\/\/.+/i.test(trimmed);
    })
    .map(([, val]) => val.trim());

  return {
    '@context': 'https://schema.org',
    '@type': 'NailSalon',
    '@id': `${siteUrl}/#salon`,
    name: info.salonName,
    alternateName: 'Glamour Nails Sydney',
    description:
      'Premier Australian Nail Salon in Sydney CBD offering bespoke manicure, pedicure, SNS dipping, and European-grade nail artistry.',
    url: siteUrl,
    telephone: info.phone,
    email: info.email,
    taxID: info.abn,
    identifier: {
      '@type': 'PropertyValue',
      name: 'ABN',
      value: info.abn,
    },
    currenciesAccepted: 'AUD',
    priceRange: '$$',
    paymentAccepted: 'Cash, Credit Card, EFTPOS, Apple Pay, Google Pay',
    address: {
      '@type': 'PostalAddress',
      streetAddress: info.streetAddress,
      addressLocality: info.suburb,
      addressRegion: info.state,
      postalCode: info.postcode,
      addressCountry: info.country,
    },
    geo: {
      '@type': 'GeoCoordinates',
      latitude: info.latitude,
      longitude: info.longitude,
    },
    openingHoursSpecification: openingHoursSpecs,
    sameAs,
    hasMap: `https://maps.google.com/?q=${info.latitude},${info.longitude}`,
    areaServed: {
      '@type': 'AdministrativeArea',
      name: 'Sydney, New South Wales, Australia',
    },
    image: [
      `${siteUrl}/images/salon-interior.jpg`,
      'https://images.unsplash.com/photo-1632345031435-8727f6897d53?auto=format&fit=crop&w=1600&q=80',
    ],
  };
}

export function sanitizeJsonLd(json: any): string {
  return JSON.stringify(json).replace(/</g, '\\u003c');
}
