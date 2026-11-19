import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getSessionFromRequest } from '@/middleware';
import { triggerCmsRevalidation } from '@/lib/cms/revalidate';
import {
  getEffectiveNotificationConfig,
  saveEffectiveNotificationConfig,
  NotificationConfig,
} from '@/lib/notifications/storage';
import { saveStoredBranding, isSafeSocialUrl } from '@/lib/cms/branding-storage';

export async function GET(request: NextRequest) {
  const session = getSessionFromRequest(request);
  if (!session.isAuthenticated) {
    return NextResponse.json(
      { error: 'Unauthorized: Admin authentication required' },
      { status: 401 }
    );
  }

  try {
    const config = await getEffectiveNotificationConfig();
    return NextResponse.json({
      success: true,
      notifications: config,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = getSessionFromRequest(request);
  if (!session.isAuthenticated) {
    return NextResponse.json(
      { error: 'Unauthorized: Admin authentication required' },
      { status: 401 }
    );
  }

  if (session.role === 'staff') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const current = await getEffectiveNotificationConfig();

    const updated: NotificationConfig = {
      telegram_enabled:
        body.telegram_enabled !== undefined ? Boolean(body.telegram_enabled) : current.telegram_enabled,
      telegram_bot_token:
        body.telegram_bot_token !== undefined ? String(body.telegram_bot_token).trim() : current.telegram_bot_token,
      telegram_chat_id:
        body.telegram_chat_id !== undefined ? String(body.telegram_chat_id).trim() : current.telegram_chat_id,
      telegram_link:
        body.telegram_link !== undefined ? String(body.telegram_link).trim() : current.telegram_link,
      instagram_enabled:
        body.instagram_enabled !== undefined ? Boolean(body.instagram_enabled) : current.instagram_enabled,
      instagram_profile_url:
        body.instagram_profile_url !== undefined
          ? String(body.instagram_profile_url).trim()
          : current.instagram_profile_url,
      instagram_webhook_url:
        body.instagram_webhook_url !== undefined
          ? String(body.instagram_webhook_url).trim()
          : current.instagram_webhook_url,
    };

    const dbErrMsg = await saveEffectiveNotificationConfig(updated);
    if (dbErrMsg) {
      return NextResponse.json({ success: false, error: dbErrMsg }, { status: 503 });
    }
    if (
      body.instagram_profile_url !== undefined &&
      isSafeSocialUrl(updated.instagram_profile_url)
    ) {
      saveStoredBranding({ instagram_url: updated.instagram_profile_url });
    }
    await triggerCmsRevalidation();

    return NextResponse.json({
      success: true,
      message: 'Notification settings updated successfully.',
      notifications: updated,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
