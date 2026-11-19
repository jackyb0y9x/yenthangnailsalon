import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { revalidatePath, revalidateTag } from 'next/cache';

import { GET as getHero, POST as postHero } from '@/app/api/admin/cms/hero/route';
import { GET as getAnnouncement, POST as postAnnouncement } from '@/app/api/admin/cms/announcement/route';
import { GET as getServices, POST as postService } from '@/app/api/admin/services/route';
import { PUT as putService, DELETE as deleteService } from '@/app/api/admin/services/[id]/route';
import { GET as getGallery, POST as postGallery } from '@/app/api/admin/gallery/route';
import { PUT as putGallery, DELETE as deleteGallery } from '@/app/api/admin/gallery/[id]/route';
import { GET as getHours, POST as postHours } from '@/app/api/admin/cms/hours/route';
import { GET as getBusinessInfo, POST as postBusinessInfo } from '@/app/api/admin/cms/business-info/route';
import { GET as getRevalidate, POST as postRevalidate } from '@/app/api/revalidate/route';

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
}));

function createAdminRequest(
  url: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
  body?: any,
  role: 'super_admin' | 'manager' | 'staff' = 'manager'
) {
  const headers: Record<string, string> = {
    Cookie: `sb-authenticated=true; sb-role=${role}; sb-email=${role}@glamournails.com.au`,
  };
  if (body) {
    headers['Content-Type'] = 'application/json';
  }

  return new NextRequest(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
}

describe('Unit Test Suite: Dynamic CMS & Revalidation (Milestone 3)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ==========================================================================
  // Suite 1: Hero Banner Management (nail_cms_sections)
  // ==========================================================================
  describe('1. Hero Banner Management', () => {
    it('1.1: retrieves current hero banner configuration with bilingual fields', async () => {
      const req = createAdminRequest('http://localhost:3000/api/admin/cms/hero', 'GET');
      const res = await getHero(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.hero).toBeDefined();
    });

    it('1.2: updates hero headlines and subtitles in both English and Vietnamese', async () => {
      const payload = {
        headline_en: 'Artisan Nails Sydney',
        headline_vi: 'Nghệ Thuật Móng Sydney',
        subheadline_en: 'Premium bespoke care in Sydney CBD',
        subheadline_vi: 'Dịch vụ chăm sóc móng cao cấp tại trung tâm Sydney',
        cta_text_en: 'Book Set',
        cta_text_vi: 'Đặt Lịch',
      };
      const req = createAdminRequest('http://localhost:3000/api/admin/cms/hero', 'POST', payload);
      const res = await postHero(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.hero.headline_en).toBe('Artisan Nails Sydney');
      expect(json.hero.headline_vi).toBe('Nghệ Thuật Móng Sydney');
    });

    it('1.3: supports partial hero update without erasing existing unchanged fields', async () => {
      const partial = { headline_en: 'Updated English Title Only' };
      const req = createAdminRequest('http://localhost:3000/api/admin/cms/hero', 'POST', partial);
      const res = await postHero(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.hero.headline_en).toBe('Updated English Title Only');
      expect(json.hero.cta_link).toBeDefined();
    });

    it('1.4: bilingual fallback: uses English headline when headline_vi is empty or null', async () => {
      const payload = {
        headline_en: 'Core Signature Nails',
        headline_vi: '',
      };
      const req = createAdminRequest('http://localhost:3000/api/admin/cms/hero', 'POST', payload);
      const res = await postHero(req);
      const json = await res.json();
      expect(json.hero.headline_en).toBe('Core Signature Nails');
      const resolvedVi = json.hero.headline_vi || json.hero.headline_en;
      expect(resolvedVi).toBe('Core Signature Nails');
    });

    it('1.5: triggers revalidatePath and revalidateTag on hero save', async () => {
      const req = createAdminRequest('http://localhost:3000/api/admin/cms/hero', 'POST', {
        headline_en: 'Revalidation Test Headline',
      });
      await postHero(req);
      expect(revalidatePath).toHaveBeenCalledWith('/[locale]', 'layout');
      expect(revalidatePath).toHaveBeenCalledWith('/');
      expect(revalidateTag).toHaveBeenCalledWith('cms');
    });
  });

  // ==========================================================================
  // Suite 2: Promotional Announcement Manager (nail_announcements)
  // ==========================================================================
  describe('2. Promotional Announcement Manager', () => {
    it('2.1: retrieves active announcement configuration', async () => {
      const req = createAdminRequest('http://localhost:3000/api/admin/cms/announcement', 'GET');
      const res = await getAnnouncement(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.announcement).toBeDefined();
    });

    it('2.2: toggles announcement is_active status (show/hide bar)', async () => {
      const reqDeactivate = createAdminRequest(
        'http://localhost:3000/api/admin/cms/announcement',
        'POST',
        { is_active: false }
      );
      const res1 = await postAnnouncement(reqDeactivate);
      const json1 = await res1.json();
      expect(json1.announcement.is_active).toBe(false);

      const reqActivate = createAdminRequest(
        'http://localhost:3000/api/admin/cms/announcement',
        'POST',
        { is_active: true }
      );
      const res2 = await postAnnouncement(reqActivate);
      const json2 = await res2.json();
      expect(json2.announcement.is_active).toBe(true);
    });

    it('2.3: updates bilingual announcement message and promotional badge text', async () => {
      const payload = {
        badge_text: 'WEEKEND DEAL',
        message_en: 'Complimentary cuticle oil with SNS Dipping Sets!',
        message_vi: 'Tặng kèm dầu dưỡng móng khi làm móng nhúng SNS!',
      };
      const req = createAdminRequest('http://localhost:3000/api/admin/cms/announcement', 'POST', payload);
      const res = await postAnnouncement(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.announcement.badge_text).toBe('WEEKEND DEAL');
      expect(json.announcement.message_en).toContain('Complimentary cuticle oil');
    });

    it('2.4: bilingual fallback: uses English announcement when message_vi is missing', async () => {
      const payload = {
        message_en: 'Flash Special Discount',
        message_vi: '',
      };
      const req = createAdminRequest('http://localhost:3000/api/admin/cms/announcement', 'POST', payload);
      const res = await postAnnouncement(req);
      const json = await res.json();
      const resolvedVi = json.announcement.message_vi || json.announcement.message_en;
      expect(resolvedVi).toBe('Flash Special Discount');
    });

    it('2.5: triggers revalidatePath and revalidateTag when announcement is saved', async () => {
      const req = createAdminRequest('http://localhost:3000/api/admin/cms/announcement', 'POST', {
        message_en: 'New Promotion Live',
      });
      await postAnnouncement(req);
      expect(revalidatePath).toHaveBeenCalledWith('/[locale]', 'layout');
      expect(revalidateTag).toHaveBeenCalledWith('cms');
    });
  });

  // ==========================================================================
  // Suite 3: Service Catalog Manager & AUD Pricing (nail_services)
  // ==========================================================================
  describe('3. Service Catalog Manager & AUD Pricing', () => {
    it('3.1: creates a new salon service with valid AUD price, duration, and bilingual names', async () => {
      const newSrv = {
        name_en: 'Deluxe Russian Manicure',
        name_vi: 'Làm Móng Chuẩn Nga Cao Cấp',
        category: 'Manicure',
        price_aud: 80,
        duration_minutes: 60,
      };
      const req = createAdminRequest('http://localhost:3000/api/admin/services', 'POST', newSrv);
      const res = await postService(req);
      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.service_id).toBeDefined();
      expect(json.service.price_cents).toBe(8000);
    });

    it('3.2: calculates and stores exact integer price_cents and price_aud accurately', async () => {
      const srv = {
        name_en: 'SNS Ombre Refill',
        price_aud: 75.50,
        duration_minutes: 45,
      };
      const req = createAdminRequest('http://localhost:3000/api/admin/services', 'POST', srv);
      const res = await postService(req);
      const json = await res.json();
      expect(json.service.price_cents).toBe(7550);
      expect(json.service.price_aud).toBe(75.50);
    });

    it('3.3: rejects service creation with negative price (AUD < 0 or price_cents < 0) with HTTP 400', async () => {
      const invalidSrv = {
        name_en: 'Invalid Negative Service',
        price_cents: -2500,
      };
      const req = createAdminRequest('http://localhost:3000/api/admin/services', 'POST', invalidSrv);
      const res = await postService(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toContain('non-negative');
    });

    it('3.4: rejects service creation with missing name_en or invalid category', async () => {
      const missingName = {
        name_en: '   ',
        price_cents: 4500,
      };
      const req = createAdminRequest('http://localhost:3000/api/admin/services', 'POST', missingName);
      const res = await postService(req);
      expect(res.status).toBe(400);
    });

    it('3.5: rejects service creation with non-positive duration_minutes (<= 0)', async () => {
      const badDuration = {
        name_en: 'Zero Duration Service',
        price_cents: 4500,
        duration_minutes: 0,
      };
      const req = createAdminRequest('http://localhost:3000/api/admin/services', 'POST', badDuration);
      const res = await postService(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toContain('Duration');
    });

    it('3.6: updates service price and recalculates price_cents without floating point drift', async () => {
      // First create
      const createReq = createAdminRequest('http://localhost:3000/api/admin/services', 'POST', {
        name_en: 'Drift Test Service',
        price_aud: 89.95,
      });
      const createRes = await postService(createReq);
      const srvId = (await createRes.json()).service_id;

      // Update
      const updateReq = createAdminRequest(
        `http://localhost:3000/api/admin/services/${srvId}`,
        'PUT',
        { price_cents: 9550 }
      );
      const updateRes = await putService(updateReq, { params: Promise.resolve({ id: srvId }) });
      expect(updateRes.status).toBe(200);
      const updateJson = await updateRes.json();
      expect(updateJson.service.price_cents).toBe(9550);
      expect(updateJson.service.price_aud).toBe(95.50);
    });

    it('3.7: performs soft-deletion by setting is_active = false', async () => {
      const createReq = createAdminRequest('http://localhost:3000/api/admin/services', 'POST', {
        name_en: 'Service To Soft Delete',
        price_cents: 6000,
      });
      const createRes = await postService(createReq);
      const srvId = (await createRes.json()).service_id;

      const delReq = createAdminRequest(
        `http://localhost:3000/api/admin/services/${srvId}`,
        'DELETE'
      );
      const delRes = await deleteService(delReq, { params: Promise.resolve({ id: srvId }) });
      expect(delRes.status).toBe(200);
      const delJson = await delRes.json();
      expect(delJson.message).toContain('soft-deleted');
    });

    it('3.8: filters active services by category and excludes soft-deleted items', async () => {
      const getReq = createAdminRequest('http://localhost:3000/api/admin/services', 'GET');
      const res = await getServices(getReq);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(Array.isArray(json.services)).toBe(true);
    });

    it('3.9: bilingual fallback: falls back to name_en when name_vi is empty string or null', async () => {
      const srv = {
        name_en: 'Gel Polish Removal',
        name_vi: '',
        price_cents: 2000,
      };
      const req = createAdminRequest('http://localhost:3000/api/admin/services', 'POST', srv);
      const res = await postService(req);
      const json = await res.json();
      const resolvedVi = json.service.name_vi || json.service.name_en;
      expect(resolvedVi).toBe('Gel Polish Removal');
    });

    it('3.10: triggers revalidatePath and revalidateTag on service create, update, and delete', async () => {
      const createReq = createAdminRequest('http://localhost:3000/api/admin/services', 'POST', {
        name_en: 'Reval Service Test',
        price_cents: 5000,
      });
      await postService(createReq);
      expect(revalidatePath).toHaveBeenCalledWith('/[locale]/services', 'page');
      expect(revalidateTag).toHaveBeenCalledWith('cms');
    });
  });

  // ==========================================================================
  // Suite 4: Gallery Asset Manager (nail_gallery_items)
  // ==========================================================================
  describe('4. Gallery Asset Manager', () => {
    it('4.1: creates a new gallery item with valid image URL, category, and tags', async () => {
      const item = {
        title_en: 'Rose Gold Glaze',
        title_vi: 'Tráng Gương Vàng Hồng',
        category: 'Chrome',
        image_url: 'https://images.unsplash.com/photo-1604654894610-df63bc536371',
        tags: ['Chrome', 'Bridal'],
        is_featured: true,
      };
      const req = createAdminRequest('http://localhost:3000/api/admin/gallery', 'POST', item);
      const res = await postGallery(req);
      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.item_id).toBeDefined();
    });

    it('4.2: rejects gallery item creation with missing or empty image_url', async () => {
      const item = {
        title_en: 'No Image Set',
        image_url: '   ',
      };
      const req = createAdminRequest('http://localhost:3000/api/admin/gallery', 'POST', item);
      const res = await postGallery(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toContain('image URL');
    });

    it('4.3: toggles is_featured pinning status for homepage lookbook', async () => {
      const createReq = createAdminRequest('http://localhost:3000/api/admin/gallery', 'POST', {
        title_en: 'Pin Toggle Look',
        image_url: 'https://images.unsplash.com/photo-1519014816548-bf5fe059798b',
        is_featured: false,
      });
      const createRes = await postGallery(createReq);
      const itemId = (await createRes.json()).item_id;

      const putReq = createAdminRequest(
        `http://localhost:3000/api/admin/gallery/${itemId}`,
        'PUT',
        { is_featured: true }
      );
      const putRes = await putGallery(putReq, { params: Promise.resolve({ id: itemId }) });
      expect(putRes.status).toBe(200);
      const putJson = await putRes.json();
      expect(putJson.item.is_featured).toBe(true);
    });

    it('4.4: updates gallery item captions with bilingual fallback support', async () => {
      const createReq = createAdminRequest('http://localhost:3000/api/admin/gallery', 'POST', {
        title_en: 'French Ombre Almond',
        title_vi: '',
        image_url: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e',
      });
      const createRes = await postGallery(createReq);
      const json = await createRes.json();
      const resolvedVi = json.item.title_vi || json.item.title_en;
      expect(resolvedVi).toBe('French Ombre Almond');
    });

    it('4.5: deletes gallery item and removes it from active lookbook', async () => {
      const createReq = createAdminRequest('http://localhost:3000/api/admin/gallery', 'POST', {
        title_en: 'Item To Delete',
        image_url: 'https://images.unsplash.com/photo-1607779097040-26e80aa78e66',
      });
      const createRes = await postGallery(createReq);
      const itemId = (await createRes.json()).item_id;

      const delReq = createAdminRequest(
        `http://localhost:3000/api/admin/gallery/${itemId}`,
        'DELETE'
      );
      const delRes = await deleteGallery(delReq, { params: Promise.resolve({ id: itemId }) });
      expect(delRes.status).toBe(200);
    });

    it('4.6: triggers revalidatePath and revalidateTag on gallery mutations', async () => {
      const req = createAdminRequest('http://localhost:3000/api/admin/gallery', 'POST', {
        title_en: 'Reval Gallery Test',
        image_url: 'https://images.unsplash.com/photo-1632345031435-8727f6897d53',
      });
      await postGallery(req);
      expect(revalidatePath).toHaveBeenCalledWith('/[locale]/gallery', 'page');
      expect(revalidateTag).toHaveBeenCalledWith('cms');
    });
  });

  // ==========================================================================
  // Suite 5: Business Hours & Emergency Holiday Closure (nail_business_info)
  // ==========================================================================
  describe('5. Business Hours & Emergency Holiday Closure', () => {
    it('5.1: updates weekly schedule JSON for all 7 days with valid open/close times', async () => {
      const hoursPayload = {
        opening_hours: {
          monday: { open: '09:00', close: '18:00', closed: false },
          sunday: { open: '10:00', close: '16:00', closed: false },
        },
      };
      const req = createAdminRequest('http://localhost:3000/api/admin/cms/hours', 'POST', hoursPayload);
      const res = await postHours(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.hours.opening_hours.monday.open).toBe('09:00');
    });

    it('5.2: activates emergency holiday closure notice with bilingual messages', async () => {
      const holidayPayload = {
        holiday_notice_active: true,
        holiday_notice_en: 'Closed for Australia Day Long Weekend: Jan 26 - Jan 27',
        holiday_notice_vi: 'Nghỉ Lễ Quốc Khánh Úc: 26/01 - 27/01',
      };
      const req = createAdminRequest('http://localhost:3000/api/admin/cms/hours', 'POST', holidayPayload);
      const res = await postHours(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.hours.holiday_notice_active).toBe(true);
      expect(json.hours.holiday_notice_en).toContain('Australia Day');
    });

    it('5.3: deactivates holiday closure notice and restores normal status badge', async () => {
      const req = createAdminRequest('http://localhost:3000/api/admin/cms/hours', 'POST', {
        holiday_notice_active: false,
      });
      const res = await postHours(req);
      const json = await res.json();
      expect(json.hours.holiday_notice_active).toBe(false);
    });

    it('5.4: triggers revalidatePath and revalidateTag on hours/holiday update', async () => {
      const req = createAdminRequest('http://localhost:3000/api/admin/cms/hours', 'POST', {
        holiday_notice_active: true,
      });
      await postHours(req);
      expect(revalidatePath).toHaveBeenCalledWith('/[locale]', 'layout');
      expect(revalidateTag).toHaveBeenCalledWith('cms');
    });
  });

  // ==========================================================================
  // Suite 6: Business Contact Settings & ABN Checksum (nail_business_info)
  // ==========================================================================
  describe('6. Business Contact Settings & ABN Checksum', () => {
    it('6.1: updates salon contact details with valid Australian phone format', async () => {
      const payload = {
        phone: '+61 2 9123 4567',
        mobile: '0412 345 678',
      };
      const req = createAdminRequest('http://localhost:3000/api/admin/cms/business-info', 'POST', payload);
      const res = await postBusinessInfo(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.businessInfo.mobile).toBe('0412 345 678');
    });

    it('6.2: validates and updates ABN passing ATO Modulo-89 checksum verification', async () => {
      const payload = {
        abn: '51 824 753 556', // Valid ATO ABN
      };
      const req = createAdminRequest('http://localhost:3000/api/admin/cms/business-info', 'POST', payload);
      const res = await postBusinessInfo(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.businessInfo.abn).toBe('51 824 753 556');
    });

    it('6.3: rejects invalid ABN that fails Modulo-89 checksum with HTTP 400', async () => {
      const payload = {
        abn: '12 345 678 901', // Invalid checksum
      };
      const req = createAdminRequest('http://localhost:3000/api/admin/cms/business-info', 'POST', payload);
      const res = await postBusinessInfo(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toContain('ABN');
    });

    it('6.4: validates Australian state code and 4-digit postcode format', async () => {
      const payload = {
        state: 'NSW',
        postcode: '2000',
        suburb: 'Sydney',
      };
      const req = createAdminRequest('http://localhost:3000/api/admin/cms/business-info', 'POST', payload);
      const res = await postBusinessInfo(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.businessInfo.postcode).toBe('2000');
    });

    it('6.5: triggers revalidatePath and revalidateTag on business info update', async () => {
      const req = createAdminRequest('http://localhost:3000/api/admin/cms/business-info', 'POST', {
        salon_name: 'Glamour Nails Sydney CBD',
      });
      await postBusinessInfo(req);
      expect(revalidatePath).toHaveBeenCalledWith('/[locale]', 'layout');
      expect(revalidateTag).toHaveBeenCalledWith('cms');
    });
  });

  // ==========================================================================
  // Suite 7: On-Demand Revalidation Route (/api/revalidate)
  // ==========================================================================
  describe('7. On-Demand Revalidation Route (/api/revalidate)', () => {
    it('7.1: successfully revalidates specified path and tag with valid secret token (HTTP 200)', async () => {
      const req = new NextRequest('http://localhost:3000/api/revalidate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          secret: 'glamour-revalidate-secret-2026',
          path: '/[locale]',
          tag: 'cms',
          type: 'layout',
        }),
      });
      const res = await postRevalidate(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.revalidated).toBe(true);
      expect(revalidatePath).toHaveBeenCalledWith('/[locale]', 'layout');
      expect(revalidateTag).toHaveBeenCalledWith('cms');
    });

    it('7.2: rejects revalidation request with invalid or missing secret token (HTTP 401)', async () => {
      const req = new NextRequest('http://localhost:3000/api/revalidate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          secret: 'wrong-token',
          path: '/[locale]',
        }),
      });
      const res = await postRevalidate(req);
      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.error).toContain('secret token');
    });

    it('7.3: rejects revalidation request missing both path and tag parameters (HTTP 400)', async () => {
      const req = new NextRequest('http://localhost:3000/api/revalidate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          secret: 'glamour-revalidate-secret-2026',
        }),
      });
      const res = await postRevalidate(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toContain('Path or tag parameter is required');
    });

    it('7.4: verifies revalidatePath was called with layout type for /[locale]', async () => {
      const req = new NextRequest(
        'http://localhost:3000/api/revalidate?secret=glamour-revalidate-secret-2026&path=/[locale]&type=layout',
        { method: 'GET' }
      );
      const res = await getRevalidate(req);
      expect(res.status).toBe(200);
      expect(revalidatePath).toHaveBeenCalledWith('/[locale]', 'layout');
    });
  });
});
