import { revalidatePath, revalidateTag } from 'next/cache';

export async function triggerCmsRevalidation(options?: {
  path?: string;
  tag?: string;
  type?: 'page' | 'layout';
}) {
  try {
    // 1. Revalidate localized layout (en and vi pages)
    revalidatePath('/[locale]', 'layout');
    // 2. Revalidate root redirect
    revalidatePath('/');
    // 3. Revalidate specific path if requested
    if (options?.path) {
      revalidatePath(options.path, options.type || 'layout');
    }
    // 4. Revalidate global CMS tag and specific tag
    revalidateTag('cms');
    if (options?.tag && options.tag !== 'cms') {
      revalidateTag(options.tag);
    }
    return { success: true };
  } catch (error) {
    if (process.env.NODE_ENV !== 'test' && !process.env.VITEST) {
      console.error('Trigger CMS revalidation error:', error);
    }
    return { success: false, error };
  }
}
