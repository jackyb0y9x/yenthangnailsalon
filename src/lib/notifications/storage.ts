/**
 * Persistent Notification Configuration Storage
 * Reads and writes Telegram & Instagram notification credentials.
 * Works seamlessly across Supabase, file system persistence, and in-memory test harnesses.
 */

import fs from 'fs';
import path from 'path';
import { getSupabaseSafe, FALLBACK_BUSINESS_INFO } from '@/lib/cms/public-data';
import { getSupabaseAdminSafe } from '@/lib/supabase/admin';
import { getWritableDataDir } from '@/lib/utils/storage-path';

export interface NotificationConfig {
  telegram_enabled: boolean;
  telegram_bot_token: string;
  telegram_chat_id: string;
  telegram_link: string;
  instagram_enabled: boolean;
  instagram_profile_url: string;
  instagram_webhook_url: string;
}

const STORAGE_DIR = getWritableDataDir();
const STORAGE_FILE = path.join(STORAGE_DIR, 'notifications.json');

export function getFileStoredNotifications(): Partial<NotificationConfig> | null {
  try {
    if (fs.existsSync(STORAGE_FILE)) {
      const content = fs.readFileSync(STORAGE_FILE, 'utf-8');
      return JSON.parse(content);
    }
  } catch {}
  return null;
}

export function saveFileStoredNotifications(config: NotificationConfig): void {
  try {
    if (!fs.existsSync(STORAGE_DIR)) {
      fs.mkdirSync(STORAGE_DIR, { recursive: true });
    }
    fs.writeFileSync(STORAGE_FILE, JSON.stringify(config, null, 2), 'utf-8');
  } catch {}
}

export async function getEffectiveNotificationConfig(): Promise<NotificationConfig> {
  let fileConfig = getFileStoredNotifications();
  const memoryConfig = (globalThis as any).__mockNotificationConfig;

  let dbSocial: Record<string, any> = {};
  try {
    const supabase = await getSupabaseSafe();
    const { data } = await supabase.from('nail_business_info').select('social_links').limit(1).maybeSingle();
    if (data?.social_links) {
      dbSocial = data.social_links;
    }
  } catch {}

  const envBotToken = process.env.TELEGRAM_BOT_TOKEN?.trim();
  const envChatId = process.env.TELEGRAM_CHAT_ID?.trim();
  const envTelegramLink = process.env.TELEGRAM_LINK?.trim();
  const envInstagramWebhook = process.env.INSTAGRAM_WEBHOOK_URL?.trim();
  const envInstagramProfile = process.env.INSTAGRAM_PROFILE_URL?.trim();

  let effectiveBotToken = String(
    fileConfig?.telegram_bot_token ??
    memoryConfig?.telegram_bot_token ??
    dbSocial.telegramBotToken ??
    FALLBACK_BUSINESS_INFO.socialLinks?.telegramBotToken ??
    ''
  ).trim();
  if ((!effectiveBotToken || effectiveBotToken.startsWith('123456:ABC')) && envBotToken) {
    effectiveBotToken = envBotToken;
  }

  let effectiveChatId = String(
    fileConfig?.telegram_chat_id ??
    memoryConfig?.telegram_chat_id ??
    dbSocial.telegramChatId ??
    FALLBACK_BUSINESS_INFO.socialLinks?.telegramChatId ??
    ''
  ).trim();
  if ((!effectiveChatId || effectiveChatId === '-1001987654321') && envChatId) {
    effectiveChatId = envChatId;
  }

  const merged = {
    telegram_enabled:
      typeof fileConfig?.telegram_enabled === 'boolean'
        ? fileConfig.telegram_enabled
        : typeof memoryConfig?.telegram_enabled === 'boolean'
        ? memoryConfig.telegram_enabled
        : typeof dbSocial.telegramEnabled === 'boolean'
        ? dbSocial.telegramEnabled
        : effectiveBotToken && effectiveChatId
        ? true
        : Boolean(FALLBACK_BUSINESS_INFO.socialLinks?.telegramEnabled ?? false),
    telegram_bot_token: effectiveBotToken,
    telegram_chat_id: effectiveChatId,
    telegram_link: String(
      fileConfig?.telegram_link ??
      memoryConfig?.telegram_link ??
      envTelegramLink ??
      dbSocial.telegram ??
      FALLBACK_BUSINESS_INFO.socialLinks?.telegram ??
      'https://t.me/glamournails_sydney'
    ),
    instagram_enabled: Boolean(
      fileConfig?.instagram_enabled ??
      memoryConfig?.instagram_enabled ??
      dbSocial.instagramEnabled ??
      FALLBACK_BUSINESS_INFO.socialLinks?.instagramEnabled ??
      false
    ),
    instagram_profile_url: String(
      fileConfig?.instagram_profile_url ??
      memoryConfig?.instagram_profile_url ??
      envInstagramProfile ??
      dbSocial.instagram ??
      FALLBACK_BUSINESS_INFO.socialLinks?.instagram ??
      'https://instagram.com/glamournails.sydney'
    ),
    instagram_webhook_url: String(
      fileConfig?.instagram_webhook_url ??
      memoryConfig?.instagram_webhook_url ??
      envInstagramWebhook ??
      dbSocial.instagramWebhookUrl ??
      FALLBACK_BUSINESS_INFO.socialLinks?.instagramWebhookUrl ??
      ''
    ),
  };

  return merged;
}

export async function saveEffectiveNotificationConfig(config: NotificationConfig): Promise<void> {
  // 1. In-memory update
  (globalThis as any).__mockNotificationConfig = config;

  // 2. File-system persistence
  saveFileStoredNotifications(config);

  // 3. Update in-memory fallback
  if (FALLBACK_BUSINESS_INFO.socialLinks) {
    (FALLBACK_BUSINESS_INFO.socialLinks as any).telegramEnabled = config.telegram_enabled;
    (FALLBACK_BUSINESS_INFO.socialLinks as any).telegramBotToken = config.telegram_bot_token;
    (FALLBACK_BUSINESS_INFO.socialLinks as any).telegramChatId = config.telegram_chat_id;
    (FALLBACK_BUSINESS_INFO.socialLinks as any).telegram = config.telegram_link;
    (FALLBACK_BUSINESS_INFO.socialLinks as any).instagramEnabled = config.instagram_enabled;
    (FALLBACK_BUSINESS_INFO.socialLinks as any).instagramWebhookUrl = config.instagram_webhook_url;
    (FALLBACK_BUSINESS_INFO.socialLinks as any).instagram = config.instagram_profile_url;
  }

  // 4. Persistent Supabase write via admin client
  try {
    const supabase = await getSupabaseAdminSafe();
    const { data: existing } = await supabase.from('nail_business_info').select('*').limit(1).maybeSingle();
    const updatedSocial = {
      ...(existing?.social_links || {}),
      telegram: config.telegram_link,
      telegramBotToken: config.telegram_bot_token,
      telegramChatId: config.telegram_chat_id,
      telegramEnabled: config.telegram_enabled,
      instagram: config.instagram_profile_url,
      instagramWebhookUrl: config.instagram_webhook_url,
      instagramEnabled: config.instagram_enabled,
    };

    if (existing?.id) {
      await supabase.from('nail_business_info').update({
        social_links: updatedSocial,
        updated_at: new Date().toISOString(),
      }).eq('id', existing.id);
    }
  } catch {}
}
