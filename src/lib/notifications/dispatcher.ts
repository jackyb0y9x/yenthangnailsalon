/**
 * Automated Notification Dispatcher
 * Dispatches real-time alerts to Telegram and Instagram / Social Webhooks
 * when customers submit appointment consultations on the public website.
 */

import { getPublicBusinessInfo } from '@/lib/cms/public-data';
import { getEffectiveNotificationConfig } from '@/lib/notifications/storage';

export interface ConsultationNotificationPayload {
  inquiryId: string;
  customerName: string;
  phone: string;
  email?: string | null;
  preferredDate?: string | null;
  preferredTime?: string | null;
  preferredLanguage?: string | null;
  servicesRequested?: string[];
  notes?: string | null;
}

export interface TelegramSendResult {
  success: boolean;
  messageId?: number;
  error?: string;
}

export interface WebhookSendResult {
  success: boolean;
  statusCode?: number;
  error?: string;
}

export function escapeHtml(text: string): string {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function formatTelegramMessage(consultation: ConsultationNotificationPayload): string {
  const servicesText =
    Array.isArray(consultation.servicesRequested) && consultation.servicesRequested.length > 0
      ? consultation.servicesRequested.join(', ')
      : 'Bespoke Nail Consultation';

  const dateText = consultation.preferredDate || 'Linh hoạt / Flexible';
  const timeText = consultation.preferredTime || 'Linh hoạt / Any time';
  const emailText = consultation.email || 'Không cung cấp / None';
  const notesText = consultation.notes || 'Không có ghi chú';
  const langText = consultation.preferredLanguage === 'vi' ? 'Tiếng Việt' : 'English';

  return [
    `💅 <b>ĐẶT LỊCH HẸN MỚI — GLAMOUR NAILS SYDNEY</b>`,
    `━━━━━━━━━━━━━━━━━━━━━━━━`,
    `👤 <b>Khách hàng:</b> ${escapeHtml(consultation.customerName)}`,
    `📞 <b>Điện thoại:</b> <code>${escapeHtml(consultation.phone)}</code>`,
    `📧 <b>Email:</b> ${escapeHtml(emailText)}`,
    `📅 <b>Ngày hẹn:</b> <b>${escapeHtml(dateText)}</b>`,
    `⏰ <b>Giờ hẹn:</b> <b>${escapeHtml(timeText)}</b>`,
    `🌐 <b>Ngôn ngữ:</b> ${escapeHtml(langText)}`,
    `💅 <b>Dịch vụ yêu cầu:</b> ${escapeHtml(servicesText)}`,
    `📝 <b>Ghi chú:</b> <i>${escapeHtml(notesText)}</i>`,
    `📍 <b>Địa chỉ:</b> Suite 2, 188 George Street, Sydney NSW 2000`,
    `🆔 <b>Mã yêu cầu:</b> <code>${escapeHtml(consultation.inquiryId)}</code>`,
    `━━━━━━━━━━━━━━━━━━━━━━━━`,
    `⚡ <i>Hệ thống thông báo tự động Glamour Nails Portal</i>`,
  ].join('\n');
}

/**
 * Sends a rich, formatted HTML appointment alert to a Telegram Chat or Group
 * via the standard Telegram Bot API.
 */
export async function sendTelegramAlert(
  botToken: string,
  chatId: string,
  consultation: ConsultationNotificationPayload
): Promise<TelegramSendResult> {
  if (!botToken || typeof botToken !== 'string' || !botToken.trim() || !chatId || typeof chatId !== 'string' || !chatId.trim()) {
    return { success: false, error: 'Telegram Bot Token and Chat ID are required.' };
  }

  const cleanToken = botToken.trim();
  const cleanChatId = chatId.trim();

  const messageHtml = formatTelegramMessage(consultation);

  try {
    const res = await fetch(`https://api.telegram.org/bot${cleanToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: cleanChatId,
        text: messageHtml,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
      }),
      signal: AbortSignal.timeout(8000),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok || !data.ok) {
      console.warn('[Telegram Alert Failed]:', data);
      return {
        success: false,
        error: data.description || `Telegram API responded with HTTP ${res.status}`,
      };
    }

    return { success: true, messageId: data.result?.message_id };
  } catch (err: any) {
    console.error('[Telegram Alert Exception]:', err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Sends a structured JSON appointment webhook payload to an Instagram CRM webhook,
 * Zapier, Make, n8n, or Meta Graph API endpoint.
 */
export async function sendInstagramWebhookAlert(
  webhookUrl: string,
  consultation: ConsultationNotificationPayload
): Promise<WebhookSendResult> {
  if (!webhookUrl || typeof webhookUrl !== 'string' || !webhookUrl.trim()) {
    return { success: false, error: 'Instagram Webhook URL is required.' };
  }

  const cleanUrl = webhookUrl.trim();

  const payload = {
    source: 'glamour_nails_booking_system',
    platform: 'instagram',
    event: 'new_appointment_inquiry',
    timestamp: new Date().toISOString(),
    inquiry: {
      id: consultation.inquiryId,
      customer_name: consultation.customerName,
      phone: consultation.phone,
      email: consultation.email || null,
      preferred_date: consultation.preferredDate || null,
      preferred_time: consultation.preferredTime || null,
      preferred_language: consultation.preferredLanguage || 'en',
      services_requested: consultation.servicesRequested || [],
      notes: consultation.notes || null,
      salon_address: 'Suite 2, 188 George Street, Sydney NSW 2000',
    },
  };

  try {
    const res = await fetch(cleanUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) {
      return {
        success: false,
        statusCode: res.status,
        error: `Webhook responded with HTTP status ${res.status}`,
      };
    }

    return { success: true, statusCode: res.status };
  } catch (err: any) {
    console.error('[Instagram Webhook Alert Exception]:', err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Top-level dispatcher triggered when a client submits a booking consultation.
 * Checks CMS notification settings and sends alerts non-blockingly.
 */
export async function dispatchConsultationAlerts(
  consultation: ConsultationNotificationPayload
): Promise<{
  telegram?: TelegramSendResult;
  instagram?: WebhookSendResult;
}> {
  const results: { telegram?: TelegramSendResult; instagram?: WebhookSendResult } = {};

  try {
    const config = await getEffectiveNotificationConfig();

    // 1. Dispatch Telegram Alert if enabled
    if (config.telegram_enabled && config.telegram_bot_token && config.telegram_chat_id) {
      results.telegram = await sendTelegramAlert(
        config.telegram_bot_token,
        config.telegram_chat_id,
        consultation
      );
    }

    // 2. Dispatch Instagram / Webhook Alert if enabled
    if (config.instagram_enabled && config.instagram_webhook_url) {
      results.instagram = await sendInstagramWebhookAlert(
        config.instagram_webhook_url,
        consultation
      );
    }
  } catch (err) {
    console.warn('[dispatchConsultationAlerts caught error]:', err);
  }

  return results;
}
