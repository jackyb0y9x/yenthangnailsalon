import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getSessionFromRequest } from '@/middleware';
import { sendTelegramAlert, sendInstagramWebhookAlert } from '@/lib/notifications/dispatcher';

export async function POST(request: NextRequest) {
  const session = getSessionFromRequest(request);
  if (!session.isAuthenticated) {
    return NextResponse.json(
      { error: 'Unauthorized: Admin authentication required' },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();
    const type = body.channel || body.type;
    const token = body.botToken || body.token;
    const chatId = body.chatId || body.targetChatId;
    const webhookUrl = body.webhookUrl || body.webhook_url;

    const sampleConsultation = {
      inquiryId: `test-inq-${Date.now().toString(36)}`,
      customerName: 'Sarah Jenkins (Test Client)',
      phone: '0412 345 678',
      email: 'sarah.jenkins@example.com.au',
      preferredDate: new Date().toISOString().split('T')[0],
      preferredTime: '14:30',
      preferredLanguage: 'vi',
      servicesRequested: ['Bespoke 3D Nail Art', 'Russian Manicure'],
      notes: 'Thử nghiệm tính năng thông báo đặt lịch hẹn từ CMS Glamour Nails.',
    };

    if (type === 'telegram') {
      if (!token || !chatId) {
        return NextResponse.json(
          { success: false, error: 'Telegram Bot Token and Chat ID are required for testing.' },
          { status: 400 }
        );
      }

      const res = await sendTelegramAlert(token, chatId, sampleConsultation);
      if (!res.success) {
        return NextResponse.json(
          {
            success: false,
            error: res.error || 'Failed to send test message via Telegram API.',
          },
          { status: 400 }
        );
      }

      return NextResponse.json({
        success: true,
        message: 'Tin nhắn thử nghiệm đã được gửi đến Telegram thành công! Hãy kiểm tra ứng dụng Telegram của bạn.',
        messageId: res.messageId,
      });
    }

    if (type === 'instagram') {
      if (!webhookUrl) {
        return NextResponse.json(
          { success: false, error: 'Instagram Webhook URL is required for testing.' },
          { status: 400 }
        );
      }

      const res = await sendInstagramWebhookAlert(webhookUrl, sampleConsultation);
      if (!res.success) {
        return NextResponse.json(
          {
            success: false,
            error: res.error || 'Webhook test request failed.',
          },
          { status: 400 }
        );
      }

      return NextResponse.json({
        success: true,
        message: 'Payload thử nghiệm đã gửi thành công tới Webhook (HTTP 200/2xx)!',
      });
    }

    return NextResponse.json(
      { success: false, error: 'Invalid notification test type. Expected "telegram" or "instagram".' },
      { status: 400 }
    );
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
