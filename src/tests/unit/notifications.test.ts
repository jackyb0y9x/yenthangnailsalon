import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  escapeHtml,
  formatTelegramMessage,
  sendTelegramAlert,
  sendInstagramWebhookAlert,
  dispatchConsultationAlerts,
  ConsultationNotificationPayload,
} from '@/lib/notifications/dispatcher';

describe('Notification Dispatcher & Formatter', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });
  const samplePayload: ConsultationNotificationPayload = {
    inquiryId: 'inq_test_12345',
    customerName: 'Jane Doe',
    phone: '0412 345 678',
    email: 'jane@example.com.au',
    servicesRequested: ['SNS Dipping Full Set', 'Gel Art'],
    preferredDate: '2026-11-20',
    preferredTime: '14:00',
    preferredLanguage: 'vi',
    notes: 'Pastel shade please <script>alert("xss")</script>',
  };

  it('escapes dangerous HTML characters properly', () => {
    expect(escapeHtml('<script>alert("test") & "quote"</script>')).toBe(
      '&lt;script&gt;alert(&quot;test&quot;) &amp; &quot;quote&quot;&lt;/script&gt;'
    );
  });

  it('formats telegram HTML notification message safely', () => {
    const formatted = formatTelegramMessage(samplePayload);
    expect(formatted).toContain('Jane Doe');
    expect(formatted).toContain('0412 345 678');
    expect(formatted).toContain('SNS Dipping Full Set, Gel Art');
    expect(formatted).toContain('Tiếng Việt');
    expect(formatted).toContain('&lt;script&gt;');
    expect(formatted).not.toContain('<script>');
  });

  it('sendTelegramAlert handles missing or empty credentials gracefully', async () => {
    const res = await sendTelegramAlert('', '', samplePayload);
    expect(res.success).toBe(false);
    expect(res.error).toContain('required');
  });

  it('sendInstagramWebhookAlert handles missing webhook URL gracefully', async () => {
    const res = await sendInstagramWebhookAlert('', samplePayload);
    expect(res.success).toBe(false);
    expect(res.error).toContain('required');
  });

  it('dispatches to Telegram when valid credentials provided', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true, result: { message_id: 998877 } }),
    });
    global.fetch = mockFetch;

    const res = await sendTelegramAlert(
      '123456:BOT_TOKEN_XYZ',
      '-100123456789',
      samplePayload
    );

    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.telegram.org/bot123456:BOT_TOKEN_XYZ/sendMessage',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
    );
    expect(res.success).toBe(true);
    expect(res.messageId).toBe(998877);
  });

  it('dispatches to Instagram Webhook when valid URL provided', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ received: true }),
      text: async () => '{"received": true}',
    });
    global.fetch = mockFetch;

    const res = await sendInstagramWebhookAlert(
      'https://hooks.zapier.com/hooks/catch/123/instagram',
      samplePayload
    );

    expect(mockFetch).toHaveBeenCalledWith(
      'https://hooks.zapier.com/hooks/catch/123/instagram',
      expect.objectContaining({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })
    );
    expect(res.success).toBe(true);
  });

  it('dispatchConsultationAlerts completes safely even if business info is default', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ ok: true, result: {} }),
      text: async () => 'OK',
    });

    await expect(
      dispatchConsultationAlerts({
        inquiryId: 'inq_safe_1',
        customerName: 'Sarah Jenkins',
        phone: '0400 111 222',
        email: 'sarah@example.com',
      })
    ).resolves.not.toThrow();
  });
});
