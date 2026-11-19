import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getSessionFromRequest } from '@/middleware';
import { triggerCmsRevalidation } from '@/lib/cms/revalidate';
import { isValidABN } from '@/lib/utils/validation';
import { FALLBACK_BUSINESS_INFO } from '@/lib/cms/public-data';
import {
  getStoredBranding,
  saveStoredBranding,
  isSafeSocialUrl,
  normalizeSocialUrl,
} from '@/lib/cms/branding-storage';
import {
  getSupabaseAdminSafe,
  hasSupabaseAdminCredentials,
  isLiveSupabaseConfigured,
  isTestRuntime,
  buildDbWriteErrorMessage,
  execSupabaseUpdate,
  execSupabaseInsert,
} from '@/lib/supabase/admin';
import { isServerlessRuntime } from '@/lib/utils/storage-path';

const VALID_AU_STATES = new Set(['NSW', 'VIC', 'QLD', 'WA', 'SA', 'TAS', 'ACT', 'NT']);

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
    const supabase = await getSupabaseAdminSafe();
    const { data } = await supabase.from('nail_business_info').select('*').limit(1).maybeSingle();
    const branding = getStoredBranding();
    const preferDb = !isTestRuntime() && Boolean(data);

    const merged = {
      ...(data || {}),
      website_title: preferDb
        ? data.website_title ||
          data.social_links?.website_title ||
          data.salon_name ||
          branding?.website_title ||
          'Glamour Nails & Beauty Lounge Sydney'
        : branding?.website_title ??
          data?.website_title ??
          data?.social_links?.website_title ??
          data?.salon_name ??
          'Glamour Nails & Beauty Lounge Sydney',
      website_title_vi: preferDb
        ? data.website_title_vi ||
          data.social_links?.website_title_vi ||
          data.salon_name ||
          branding?.website_title_vi ||
          'Glamour Nails Sydney • Chăm Sóc Móng Cao Cấp'
        : branding?.website_title_vi ??
          data?.website_title_vi ??
          data?.social_links?.website_title_vi ??
          data?.salon_name ??
          'Glamour Nails Sydney • Chăm Sóc Móng Cao Cấp',
      website_tagline: preferDb
        ? data.website_tagline ||
          data.social_links?.website_tagline ||
          branding?.website_tagline ||
          'Sydney CBD • Boutique Lounge'
        : branding?.website_tagline ??
          data?.website_tagline ??
          data?.social_links?.website_tagline ??
          'Sydney CBD • Boutique Lounge',
      website_tagline_vi: preferDb
        ? data.website_tagline_vi ||
          data.social_links?.website_tagline_vi ||
          branding?.website_tagline_vi ||
          'Sydney CBD • Tiệm Nail Sang Trọng'
        : branding?.website_tagline_vi ??
          data?.website_tagline_vi ??
          data?.social_links?.website_tagline_vi ??
          'Sydney CBD • Tiệm Nail Sang Trọng',
      logo_url: preferDb
        ? data.logo_url ?? data.social_links?.logo_url ?? branding?.logo_url ?? ''
        : branding?.logo_url ?? data?.logo_url ?? data?.social_links?.logo_url ?? '',
      google_maps_url:
        data?.google_maps_url ||
        FALLBACK_BUSINESS_INFO.googleMapsUrl ||
        '',
      google_maps_embed_url:
        data?.google_maps_embed_url ||
        FALLBACK_BUSINESS_INFO.googleMapsEmbedUrl ||
        '',
      facebook_url: preferDb
        ? data.social_links?.facebook ??
          branding?.facebook_url ??
          FALLBACK_BUSINESS_INFO.socialLinks?.facebook ??
          ''
        : branding?.facebook_url !== undefined
        ? branding.facebook_url
        : data?.social_links?.facebook ??
          FALLBACK_BUSINESS_INFO.socialLinks?.facebook ??
          'https://facebook.com/glamournails.sydney',
      instagram_url: preferDb
        ? data.social_links?.instagram ??
          branding?.instagram_url ??
          FALLBACK_BUSINESS_INFO.socialLinks?.instagram ??
          ''
        : branding?.instagram_url !== undefined
        ? branding.instagram_url
        : data?.social_links?.instagram ??
          FALLBACK_BUSINESS_INFO.socialLinks?.instagram ??
          'https://instagram.com/glamournails.sydney',
    };

    return NextResponse.json({
      success: true,
      businessInfo: merged,
      syncStatus: {
        hasAdminKey: hasSupabaseAdminCredentials(),
        isLiveSupabase: isLiveSupabaseConfigured(),
        isServerless: isServerlessRuntime(),
      },
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

    if (body.postcode !== undefined && String(body.postcode).trim() !== '') {
      const cleanedPostcode = String(body.postcode).trim();
      if (!/^[0-9]{4}$/.test(cleanedPostcode)) {
        return NextResponse.json(
          { success: false, error: 'Postcode phải gồm đúng 4 chữ số (Australian 4-digit postcode).' },
          { status: 400 }
        );
      }
    }

    if (body.state !== undefined && String(body.state).trim() !== '') {
      const normalizedState = String(body.state).trim().toUpperCase();
      if (!VALID_AU_STATES.has(normalizedState)) {
        return NextResponse.json(
          { success: false, error: `Invalid Australian state '${body.state}'.` },
          { status: 400 }
        );
      }
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

    const normalizedFacebookUrl =
      body.facebook_url !== undefined ? normalizeSocialUrl(String(body.facebook_url)) : undefined;
    const normalizedInstagramUrl =
      body.instagram_url !== undefined ? normalizeSocialUrl(String(body.instagram_url)) : undefined;

    const updatePayload: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (body.salon_name !== undefined) updatePayload.salon_name = String(body.salon_name).trim();
    if (body.abn !== undefined) updatePayload.abn = String(body.abn).trim();
    if (body.phone !== undefined) updatePayload.phone = String(body.phone).trim();
    if (body.mobile !== undefined) updatePayload.mobile = String(body.mobile).trim();
    if (body.email !== undefined) updatePayload.email = String(body.email).trim();
    if (body.address_street !== undefined) updatePayload.address_street = String(body.address_street).trim();
    if (body.suburb !== undefined) updatePayload.suburb = String(body.suburb).trim();
    if (body.state !== undefined) updatePayload.state = String(body.state).trim().toUpperCase();
    if (body.postcode !== undefined) updatePayload.postcode = String(body.postcode).trim();
    if (body.country !== undefined) updatePayload.country = String(body.country).trim();
    if (body.google_maps_url !== undefined) updatePayload.google_maps_url = String(body.google_maps_url).trim();
    if (body.google_maps_embed_url !== undefined) {
      updatePayload.google_maps_embed_url = cleanEmbedUrl(String(body.google_maps_embed_url));
    }

    // Branding & Logo fields (matching live nail_business_info schema)
    if (body.website_title !== undefined) updatePayload.website_title = String(body.website_title).trim();
    if (body.website_title_vi !== undefined) updatePayload.website_title_vi = String(body.website_title_vi).trim();
    if (body.website_tagline !== undefined) updatePayload.website_tagline = String(body.website_tagline).trim();
    if (body.website_tagline_vi !== undefined) updatePayload.website_tagline_vi = String(body.website_tagline_vi).trim();
    if (body.logo_url !== undefined) updatePayload.logo_url = String(body.logo_url).trim();

    const supabase = await getSupabaseAdminSafe();
    const { data: existing } = await supabase.from('nail_business_info').select('*').limit(1).maybeSingle();

    const currentSocial = (existing?.social_links || {}) as Record<string, any>;
    const updatedSocial = {
      ...currentSocial,
      ...(body.website_title !== undefined ? { website_title: updatePayload.website_title } : {}),
      ...(body.website_title_vi !== undefined ? { website_title_vi: updatePayload.website_title_vi } : {}),
      ...(body.website_tagline !== undefined ? { website_tagline: updatePayload.website_tagline } : {}),
      ...(body.website_tagline_vi !== undefined ? { website_tagline_vi: updatePayload.website_tagline_vi } : {}),
      ...(body.logo_url !== undefined ? { logo_url: updatePayload.logo_url } : {}),
      ...(normalizedFacebookUrl !== undefined ? { facebook: normalizedFacebookUrl } : {}),
      ...(normalizedInstagramUrl !== undefined ? { instagram: normalizedInstagramUrl } : {}),
    };
    updatePayload.social_links = updatedSocial;

    const dbRes = existing
      ? await execSupabaseUpdate(supabase, 'nail_business_info', updatePayload, 'id', existing.id)
      : await execSupabaseInsert(supabase, 'nail_business_info', updatePayload);

    const dbErrMsg = buildDbWriteErrorMessage(dbRes.error, dbRes.affected, 'nail_business_info');
    if (dbErrMsg) {
      return NextResponse.json(
        {
          success: false,
          error: dbErrMsg,
          requiresServiceRoleKey: !hasSupabaseAdminCredentials(),
        },
        { status: 503 }
      );
    }

    // Keep local branding cache & in-memory fallback synchronized with committed DB row
    const savedRow = dbRes.rows[0] || { ...(existing || {}), ...updatePayload };
    const savedBranding = saveStoredBranding({
      website_title: savedRow.website_title ?? body.website_title,
      website_title_vi: savedRow.website_title_vi ?? body.website_title_vi,
      website_tagline: savedRow.website_tagline ?? body.website_tagline,
      website_tagline_vi: savedRow.website_tagline_vi ?? body.website_tagline_vi,
      logo_url: savedRow.logo_url ?? body.logo_url,
      facebook_url: normalizedFacebookUrl,
      instagram_url: normalizedInstagramUrl,
    });

    if (savedRow.salon_name) FALLBACK_BUSINESS_INFO.salonName = savedRow.salon_name;
    if (savedRow.abn) FALLBACK_BUSINESS_INFO.abn = savedRow.abn;
    if (savedRow.phone) FALLBACK_BUSINESS_INFO.phone = savedRow.phone;
    if (savedRow.mobile) FALLBACK_BUSINESS_INFO.mobile = savedRow.mobile;
    if (savedRow.email) FALLBACK_BUSINESS_INFO.email = savedRow.email;
    if (savedRow.address_street) FALLBACK_BUSINESS_INFO.streetAddress = savedRow.address_street;
    if (savedRow.suburb) FALLBACK_BUSINESS_INFO.suburb = savedRow.suburb;
    if (savedRow.state) FALLBACK_BUSINESS_INFO.state = savedRow.state;
    if (savedRow.postcode) FALLBACK_BUSINESS_INFO.postcode = savedRow.postcode;
    if (savedRow.country) FALLBACK_BUSINESS_INFO.country = savedRow.country;
    if (savedRow.google_maps_url !== undefined) FALLBACK_BUSINESS_INFO.googleMapsUrl = savedRow.google_maps_url;
    if (savedRow.google_maps_embed_url !== undefined) FALLBACK_BUSINESS_INFO.googleMapsEmbedUrl = savedRow.google_maps_embed_url;
    if (body.website_title !== undefined) FALLBACK_BUSINESS_INFO.websiteTitle = savedBranding.website_title;
    if (body.website_title_vi !== undefined) FALLBACK_BUSINESS_INFO.websiteTitleVi = savedBranding.website_title_vi;
    if (body.website_tagline !== undefined) FALLBACK_BUSINESS_INFO.websiteTagline = savedBranding.website_tagline;
    if (body.website_tagline_vi !== undefined) FALLBACK_BUSINESS_INFO.websiteTaglineVi = savedBranding.website_tagline_vi;
    if (body.logo_url !== undefined) FALLBACK_BUSINESS_INFO.logoUrl = savedBranding.logo_url;
    if (normalizedFacebookUrl !== undefined && FALLBACK_BUSINESS_INFO.socialLinks) {
      FALLBACK_BUSINESS_INFO.socialLinks.facebook = normalizedFacebookUrl;
    }
    if (normalizedInstagramUrl !== undefined && FALLBACK_BUSINESS_INFO.socialLinks) {
      FALLBACK_BUSINESS_INFO.socialLinks.instagram = normalizedInstagramUrl;
    }

    await triggerCmsRevalidation();

    return NextResponse.json({
      success: true,
      persistedToDb: isLiveSupabaseConfigured(),
      businessInfo: {
        ...savedRow,
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
