import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getSessionFromRequest } from '@/middleware';
import { triggerCmsRevalidation } from '@/lib/cms/revalidate';
import { isValidABN } from '@/lib/utils/validation';
import { getSupabaseSafe, FALLBACK_BUSINESS_INFO } from '@/lib/cms/public-data';
import {
  getStoredBranding,
  saveStoredBranding,
  isSafeSocialUrl,
  normalizeSocialUrl,
} from '@/lib/cms/branding-storage';

function cleanEmbedUrl(val: string): string {
  if (!val) return '';
  const match = val.match(/src=["']([^"']+)["']/i);
  return match ? match[1] : val.trim();
}

export async function GET(request: NextRequest) {
  const session = getSessionFromRequest(request);
  if (!session.isAuthenticated) {
    return NextResponse.json(
      { error: 'Unauthorized: Admin authentication required' },
      { status: 401 }
    );
  }

  try {
    const supabase = await getSupabaseSafe();
    const { data } = await supabase.from('nail_business_info').select('*').limit(1).maybeSingle();
    const branding = getStoredBranding();

    const merged = {
      ...(data || {}),
      website_title:
        branding?.website_title ??
        data?.social_links?.website_title ??
        data?.website_title ??
        data?.salon_name ??
        'Glamour Nails & Beauty Lounge Sydney',
      website_title_vi:
        branding?.website_title_vi ??
        data?.social_links?.website_title_vi ??
        data?.website_title_vi ??
        data?.salon_name ??
        'Glamour Nails Sydney • Chăm Sóc Móng Cao Cấp',
      website_tagline:
        branding?.website_tagline ??
        data?.social_links?.website_tagline ??
        data?.website_tagline ??
        'Sydney CBD • Boutique Lounge',
      website_tagline_vi:
        branding?.website_tagline_vi ??
        data?.social_links?.website_tagline_vi ??
        data?.website_tagline_vi ??
        'Sydney CBD • Tiệm Nail Sang Trọng',
      logo_url: branding?.logo_url ?? data?.social_links?.logo_url ?? data?.logo_url ?? '',
      facebook_url:
        branding?.facebook_url !== undefined
          ? branding.facebook_url
          : data?.social_links?.facebook ??
            FALLBACK_BUSINESS_INFO.socialLinks?.facebook ??
            'https://facebook.com/glamournails.sydney',
      instagram_url:
        branding?.instagram_url !== undefined
          ? branding.instagram_url
          : data?.social_links?.instagram ??
            FALLBACK_BUSINESS_INFO.socialLinks?.instagram ??
            'https://instagram.com/glamournails.sydney',
    };

    return NextResponse.json({
      success: true,
      businessInfo: merged,
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

    if (body.abn && !isValidABN(body.abn)) {
      return NextResponse.json(
        { success: false, error: 'Invalid Australian Business Number (ABN)' },
        { status: 400 }
      );
    }

    if (body.facebook_url !== undefined && !isSafeSocialUrl(String(body.facebook_url))) {
      return NextResponse.json(
        { success: false, error: 'Invalid Facebook profile URL. Please use a valid http(s) link.' },
        { status: 400 }
      );
    }

    if (body.instagram_url !== undefined && !isSafeSocialUrl(String(body.instagram_url))) {
      return NextResponse.json(
        { success: false, error: 'Invalid Instagram profile URL. Please use a valid http(s) link.' },
        { status: 400 }
      );
    }

    const updatePayload: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (body.salon_name !== undefined) updatePayload.salon_name = body.salon_name;
    if (body.abn !== undefined) updatePayload.abn = body.abn;
    if (body.phone !== undefined) updatePayload.phone = body.phone;
    if (body.mobile !== undefined) updatePayload.mobile = body.mobile;
    if (body.email !== undefined) updatePayload.email = body.email;
    if (body.address_street !== undefined) updatePayload.address_street = body.address_street;
    if (body.suburb !== undefined) updatePayload.suburb = body.suburb;
    if (body.state !== undefined) updatePayload.state = body.state;
    if (body.postcode !== undefined) updatePayload.postcode = body.postcode;
    if (body.country !== undefined) updatePayload.country = body.country;
    if (body.google_maps_url !== undefined) updatePayload.google_maps_url = body.google_maps_url;
    if (body.google_maps_embed_url !== undefined) updatePayload.google_maps_embed_url = cleanEmbedUrl(body.google_maps_embed_url);

    // Branding & Logo fields
    if (body.website_title !== undefined) updatePayload.website_title = body.website_title;
    if (body.website_title_vi !== undefined) updatePayload.website_title_vi = body.website_title_vi;
    if (body.website_tagline !== undefined) updatePayload.website_tagline = body.website_tagline;
    if (body.website_tagline_vi !== undefined) updatePayload.website_tagline_vi = body.website_tagline_vi;
    if (body.logo_url !== undefined) updatePayload.logo_url = body.logo_url;

    // Persistent storage for branding & social links
    const normalizedFacebookUrl =
      body.facebook_url !== undefined ? normalizeSocialUrl(String(body.facebook_url)) : undefined;
    const normalizedInstagramUrl =
      body.instagram_url !== undefined ? normalizeSocialUrl(String(body.instagram_url)) : undefined;

    const savedBranding = saveStoredBranding({
      website_title: body.website_title,
      website_title_vi: body.website_title_vi,
      website_tagline: body.website_tagline,
      website_tagline_vi: body.website_tagline_vi,
      logo_url: body.logo_url,
      facebook_url: normalizedFacebookUrl,
      instagram_url: normalizedInstagramUrl,
    });

    // Update in-memory fallback
    if (body.website_title !== undefined) (FALLBACK_BUSINESS_INFO as any).websiteTitle = body.website_title;
    if (body.website_title_vi !== undefined) (FALLBACK_BUSINESS_INFO as any).websiteTitleVi = body.website_title_vi;
    if (body.website_tagline !== undefined) (FALLBACK_BUSINESS_INFO as any).websiteTagline = body.website_tagline;
    if (body.website_tagline_vi !== undefined) (FALLBACK_BUSINESS_INFO as any).websiteTaglineVi = body.website_tagline_vi;
    if (body.logo_url !== undefined) (FALLBACK_BUSINESS_INFO as any).logoUrl = body.logo_url;
    if (normalizedFacebookUrl !== undefined && FALLBACK_BUSINESS_INFO.socialLinks) {
      FALLBACK_BUSINESS_INFO.socialLinks.facebook = normalizedFacebookUrl;
    }
    if (normalizedInstagramUrl !== undefined && FALLBACK_BUSINESS_INFO.socialLinks) {
      FALLBACK_BUSINESS_INFO.socialLinks.instagram = normalizedInstagramUrl;
    }

    const supabase = await getSupabaseSafe();
    const { data: existing } = await supabase.from('nail_business_info').select('*').limit(1).maybeSingle();

    const currentSocial = (existing?.social_links || {}) as any;
    const updatedSocial = {
      ...currentSocial,
      ...(body.website_title !== undefined ? { website_title: body.website_title } : {}),
      ...(body.website_title_vi !== undefined ? { website_title_vi: body.website_title_vi } : {}),
      ...(body.website_tagline !== undefined ? { website_tagline: body.website_tagline } : {}),
      ...(body.website_tagline_vi !== undefined ? { website_tagline_vi: body.website_tagline_vi } : {}),
      ...(body.logo_url !== undefined ? { logo_url: body.logo_url } : {}),
      ...(normalizedFacebookUrl !== undefined ? { facebook: normalizedFacebookUrl } : {}),
      ...(normalizedInstagramUrl !== undefined ? { instagram: normalizedInstagramUrl } : {}),
    };
    updatePayload.social_links = updatedSocial;

    if (existing) {
      await supabase.from('nail_business_info').update(updatePayload).eq('id', existing.id);
    } else {
      await supabase.from('nail_business_info').insert(updatePayload);
    }

    await triggerCmsRevalidation();

    return NextResponse.json({
      success: true,
      businessInfo: {
        ...(existing || {}),
        ...updatePayload,
        website_title: savedBranding.website_title,
        website_title_vi: savedBranding.website_title_vi,
        website_tagline: savedBranding.website_tagline,
        website_tagline_vi: savedBranding.website_tagline_vi,
        logo_url: savedBranding.logo_url,
        facebook_url: savedBranding.facebook_url,
        instagram_url: savedBranding.instagram_url,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
