export const LOCALES = ['en', 'vi'] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = 'en';

export interface LocaleConfig {
  code: Locale;
  name: string;
  nativeName: string;
  flag: string;
  htmlLang: string;
  ogLocale: string;
  hreflang: string;
}

export const LOCALE_CONFIGS: Record<Locale, LocaleConfig> = {
  en: {
    code: 'en',
    name: 'English',
    nativeName: 'English (AU)',
    flag: '🇦🇺',
    htmlLang: 'en-AU',
    ogLocale: 'en_AU',
    hreflang: 'en-AU',
  },
  vi: {
    code: 'vi',
    name: 'Vietnamese',
    nativeName: 'Tiếng Việt',
    flag: '🇻🇳',
    htmlLang: 'vi-VN',
    ogLocale: 'vi_VN',
    hreflang: 'vi-AU',
  },
};

export function isValidLocale(locale: unknown): locale is Locale {
  return typeof locale === 'string' && LOCALES.includes(locale as Locale);
}
