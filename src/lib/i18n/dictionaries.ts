import { DEFAULT_LOCALE, isValidLocale, type Locale } from './config';
import type enMessages from '@/messages/en.json';

export type Messages = typeof enMessages;

const dictionaries: Record<Locale, () => Promise<Messages>> = {
  en: () => import('@/messages/en.json').then((m) => m.default),
  vi: () => import('@/messages/vi.json').then((m) => m.default),
};

export function deepMergeWithFallback<T extends Record<string, any>>(
  target: Partial<T> | null | undefined,
  fallback: T
): T {
  if (!target) return fallback;

  const result = { ...fallback };

  for (const key of Object.keys(fallback) as Array<keyof T>) {
    const fallbackVal = fallback[key];
    const targetVal = target[key];

    if (targetVal !== undefined && targetVal !== null && targetVal !== '') {
      if (
        typeof fallbackVal === 'object' &&
        fallbackVal !== null &&
        !Array.isArray(fallbackVal) &&
        typeof targetVal === 'object' &&
        targetVal !== null &&
        !Array.isArray(targetVal)
      ) {
        result[key] = deepMergeWithFallback(targetVal, fallbackVal);
      } else {
        result[key] = targetVal as any;
      }
    } else {
      result[key] = fallbackVal;
    }
  }

  return result;
}

export async function getDictionary(locale: string): Promise<Messages> {
  const safeLocale: Locale = isValidLocale(locale) ? locale : DEFAULT_LOCALE;
  const en = await dictionaries.en();

  if (safeLocale === 'en') {
    return en;
  }

  try {
    const target = await dictionaries[safeLocale]();
    return deepMergeWithFallback(target, en);
  } catch (error) {
    console.warn(`Could not load messages for locale "${safeLocale}". Using fallback.`, error);
    return en;
  }
}
