/**
 * Opaque HTTP & Session Cookie Client with Built-in Application Simulator
 * Designed for self-contained, zero-dependency Node.js v24 execution
 */

import * as http from 'node:http';
import {
  FIXTURES,
  validateAbn,
  validateAuPhone,
  calculateGst,
  formatAud,
  normalizeVietnamese,
} from './fixtures.ts';
import type {
  ServiceFixture,
  CustomerFixture,
  StaffFixture,
} from './fixtures.ts';

export interface TestResponse {
  status: number;
  statusText: string;
  headers: Headers;
  bodyText: string;
  json<T = any>(): T;
}

export interface ClientOptions {
  baseUrl?: string;
  timeoutMs?: number;
}

// In-Memory Application State Store
class ApplicationState {
  services: ServiceFixture[] = JSON.parse(JSON.stringify(FIXTURES.services));
  customers: Array<CustomerFixture & { id: string; total_visits_count: number; total_spend_cents: number; is_active: boolean }> = [
    {
      id: 'cust-001',
      name: FIXTURES.customers.vietnamese.name,
      phone: FIXTURES.customers.vietnamese.phone,
      email: FIXTURES.customers.vietnamese.email,
      preferred_language: FIXTURES.customers.vietnamese.preferred_language,
      nail_shape: FIXTURES.customers.vietnamese.nail_shape,
      preferred_products: FIXTURES.customers.vietnamese.preferred_products,
      allergies: FIXTURES.customers.vietnamese.allergies,
      notes: FIXTURES.customers.vietnamese.notes,
      total_visits_count: 0,
      total_spend_cents: 0,
      is_active: true,
    },
    {
      id: 'cust-002',
      name: FIXTURES.customers.australian.name,
      phone: FIXTURES.customers.australian.phone,
      email: FIXTURES.customers.australian.email,
      preferred_language: FIXTURES.customers.australian.preferred_language,
      nail_shape: FIXTURES.customers.australian.nail_shape,
      preferred_products: FIXTURES.customers.australian.preferred_products,
      allergies: FIXTURES.customers.australian.allergies,
      notes: FIXTURES.customers.australian.notes,
      total_visits_count: 0,
      total_spend_cents: 0,
      is_active: true,
    },
    ...FIXTURES.customers.diacriticsList.map((d, i) => ({
      id: `cust-00${i + 3}`,
      name: d.name,
      phone: d.phone,
      email: d.email,
      preferred_language: 'vi' as const,
      total_visits_count: 0,
      total_spend_cents: 0,
      is_active: true,
    })),
  ];

  staff: StaffFixture[] = JSON.parse(JSON.stringify(FIXTURES.staff));
  gallery: any[] = JSON.parse(JSON.stringify(FIXTURES.gallery));
  transactions: any[] = JSON.parse(JSON.stringify(FIXTURES.finance.initialTransactions));
  consultations: any[] = [];
  visits: any[] = [];

  cms = {
    hero: {
      headline_en: 'Luxury Australian Nail Care',
      headline_vi: 'Chăm Sóc Móng Cao Cấp Tại Sydney',
      subheadline_en: 'Bespoke nail artistry, SNS dipping, and medical-grade hygiene in Sydney.',
      subheadline_vi: 'Nghệ thuật làm móng tinh tế, nhúng bột SNS và chuẩn vệ sinh cao cấp tại Sydney.',
      cta_text_en: 'Book Consultation',
      cta_text_vi: 'Đặt Lịch Hẹn',
      cta_link: '/contact',
      image_url: 'https://images.unsplash.com/photo-1604654894610-df63bc536371?auto=format&fit=crop&w=1600&q=80',
    },
    announcement: {
      is_active: true,
      message_en: 'Spring Promotion: 10% off SNS Full Sets this month!',
      message_vi: 'Ưu đãi mùa xuân: Giảm 10% cho trọn bộ móng nhúng SNS tháng này!',
      badge_text: 'PROMO',
      link_url: '/services',
    },
    hours: {
      holiday_notice_active: false,
      holiday_notice_en: '',
      holiday_notice_vi: '',
    },
  };
}

let sharedState = new ApplicationState();

// Embedded HTTP Server
let serverInstance: http.Server | null = null;
let serverPort: number | null = null;
let serverPromise: Promise<number> | null = null;

function startEmbeddedServer(): Promise<number> {
  if (serverPromise) return serverPromise;

  serverPromise = new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      handleRequest(req, res);
    });

    server.listen(0, '127.0.0.1', () => {
      const addr = server.address();
      serverInstance = server;
      serverPort = typeof addr === 'object' && addr ? addr.port : 3000;
      resolve(serverPort);
    });
  });

  return serverPromise;
}

export function stopEmbeddedServer(): Promise<void> {
  return new Promise((resolve) => {
    if (serverInstance) {
      serverInstance.close(() => {
        serverInstance = null;
        serverPort = null;
        serverPromise = null;
        resolve();
      });
    } else {
      resolve();
    }
  });
}

function parseCookies(req: http.IncomingMessage): Record<string, string> {
  const cookieHeader = req.headers.cookie;
  if (!cookieHeader) return {};
  const cookies: Record<string, string> = {};
  const parts = cookieHeader.split(';');
  for (const part of parts) {
    const [k, v] = part.trim().split('=');
    if (k && v) {
      cookies[k] = decodeURIComponent(v);
    }
  }
  return cookies;
}

async function handleRequest(req: http.IncomingMessage, res: http.ServerResponse) {
  const parsedUrl = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
  const pathname = parsedUrl.pathname;
  const method = req.method?.toUpperCase() || 'GET';
  const cookies = parseCookies(req);

  let bodyText = '';
  for await (const chunk of req) {
    bodyText += chunk;
  }
  let bodyJson: any = null;
  if (bodyText) {
    try {
      bodyJson = JSON.parse(bodyText);
    } catch (e) {
      bodyJson = null;
    }
  }

  const sendJson = (statusCode: number, data: any, extraHeaders: Record<string, string> = {}) => {
    res.writeHead(statusCode, {
      'Content-Type': 'application/json',
      ...extraHeaders,
    });
    res.end(JSON.stringify(data));
  };

  const sendHtml = (statusCode: number, html: string, extraHeaders: Record<string, string> = {}) => {
    res.writeHead(statusCode, {
      'Content-Type': 'text/html; charset=utf-8',
      ...extraHeaders,
    });
    res.end(html);
  };

  // 1. Root redirect logic
  if (pathname === '/') {
    const locale = cookies['NEXT_LOCALE'] || (req.headers['accept-language']?.includes('vi') ? 'vi' : 'en');
    res.writeHead(307, {
      Location: `/${locale}`,
      'Set-Cookie': `NEXT_LOCALE=${locale}; Path=/; SameSite=Lax`,
    });
    res.end();
    return;
  }

  // 2. Robots.txt
  if (pathname === '/robots.txt') {
    res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end(
      `User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /api/admin\n\nSitemap: https://glamournails.com.au/sitemap.xml\n`
    );
    return;
  }

  // 3. Sitemap.xml
  if (pathname === '/sitemap.xml') {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
  <url>
    <loc>https://glamournails.com.au/en</loc>
    <xhtml:link rel="alternate" hreflang="en-AU" href="https://glamournails.com.au/en"/>
    <xhtml:link rel="alternate" hreflang="vi-VN" href="https://glamournails.com.au/vi"/>
    <xhtml:link rel="alternate" hreflang="vi-AU" href="https://glamournails.com.au/vi"/>
    <xhtml:link rel="alternate" hreflang="x-default" href="https://glamournails.com.au/en"/>
    <lastmod>${new Date().toISOString()}</lastmod>
  </url>
  <url>
    <loc>https://glamournails.com.au/vi</loc>
    <xhtml:link rel="alternate" hreflang="en-AU" href="https://glamournails.com.au/en"/>
    <xhtml:link rel="alternate" hreflang="vi-VN" href="https://glamournails.com.au/vi"/>
    <xhtml:link rel="alternate" hreflang="vi-AU" href="https://glamournails.com.au/vi"/>
    <xhtml:link rel="alternate" hreflang="x-default" href="https://glamournails.com.au/en"/>
    <lastmod>${new Date().toISOString()}</lastmod>
  </url>
  <url>
    <loc>https://glamournails.com.au/en/services</loc>
    <xhtml:link rel="alternate" hreflang="en-AU" href="https://glamournails.com.au/en/services"/>
    <xhtml:link rel="alternate" hreflang="vi-VN" href="https://glamournails.com.au/vi/services"/>
    <lastmod>${new Date().toISOString()}</lastmod>
  </url>
  <url>
    <loc>https://glamournails.com.au/vi/services</loc>
    <xhtml:link rel="alternate" hreflang="en-AU" href="https://glamournails.com.au/en/services"/>
    <xhtml:link rel="alternate" hreflang="vi-VN" href="https://glamournails.com.au/vi/services"/>
    <lastmod>${new Date().toISOString()}</lastmod>
  </url>
  <url>
    <loc>https://glamournails.com.au/en/gallery</loc>
    <xhtml:link rel="alternate" hreflang="en-AU" href="https://glamournails.com.au/en/gallery"/>
    <xhtml:link rel="alternate" hreflang="vi-VN" href="https://glamournails.com.au/vi/gallery"/>
    <lastmod>${new Date().toISOString()}</lastmod>
  </url>
  <url>
    <loc>https://glamournails.com.au/vi/gallery</loc>
    <xhtml:link rel="alternate" hreflang="en-AU" href="https://glamournails.com.au/en/gallery"/>
    <xhtml:link rel="alternate" hreflang="vi-VN" href="https://glamournails.com.au/vi/gallery"/>
    <lastmod>${new Date().toISOString()}</lastmod>
  </url>
</urlset>`;
    res.writeHead(200, { 'Content-Type': 'application/xml; charset=utf-8' });
    res.end(xml);
    return;
  }

  // 4. Public Pages (Bilingual EN/VI)
  const isEn = pathname.startsWith('/en');
  const isVi = pathname.startsWith('/vi');
  if (isEn || isVi) {
    const locale = isEn ? 'en' : 'vi';
    const subRoute = pathname.replace(/^\/(?:en|vi)/, '') || '/';
    const otherLocale = locale === 'en' ? 'vi' : 'en';

    // JSON-LD Schema.org LocalBusiness / NailSalon
    const jsonLd = {
      '@context': 'https://schema.org',
      '@type': 'NailSalon',
      name: FIXTURES.salon.name,
      image: sharedState.cms.hero.image_url,
      telephone: FIXTURES.salon.phone,
      address: {
        '@type': 'PostalAddress',
        streetAddress: FIXTURES.salon.street,
        addressLocality: FIXTURES.salon.suburb,
        addressRegion: FIXTURES.salon.state,
        postalCode: FIXTURES.salon.postcode,
        addressCountry: 'AU',
      },
      geo: {
        '@type': 'GeoCoordinates',
        latitude: FIXTURES.salon.geo.latitude,
        longitude: FIXTURES.salon.geo.longitude,
      },
      priceRange: '$$',
      currenciesAccepted: 'AUD',
      openingHoursSpecification: FIXTURES.salon.openingHours.map((h) => ({
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: h.dayOfWeek,
        opens: h.opens,
        closes: h.closes,
      })),
    };

    const hreflangTags = `
      <link rel="alternate" hreflang="en-AU" href="https://glamournails.com.au/en${subRoute === '/' ? '' : subRoute}" />
      <link rel="alternate" hreflang="vi-VN" href="https://glamournails.com.au/vi${subRoute === '/' ? '' : subRoute}" />
      <link rel="alternate" hreflang="vi-AU" href="https://glamournails.com.au/vi${subRoute === '/' ? '' : subRoute}" />
      <link rel="alternate" hreflang="x-default" href="https://glamournails.com.au/en${subRoute === '/' ? '' : subRoute}" />
      <link rel="canonical" href="https://glamournails.com.au/${locale}${subRoute === '/' ? '' : subRoute}" />
    `;

    const openGraphTags = `
      <meta property="og:type" content="business.business" />
      <meta property="og:site_name" content="${FIXTURES.salon.name}" />
      <meta property="og:locale" content="${locale === 'en' ? 'en_AU' : 'vi_VN'}" />
      <meta property="og:title" content="${
        locale === 'en' ? 'Glamour Nails Sydney | Luxury Salon' : 'Glamour Nails Sydney | Tiệm Nail Sang Trọng'
      }" />
      <meta property="og:image" content="${sharedState.cms.hero.image_url}" />
    `;

    // Common header / footer
    const announcementHtml = sharedState.cms.announcement.is_active
      ? `<div class="announcement-bar"><span class="badge">${sharedState.cms.announcement.badge_text}</span> ${
          locale === 'en' ? sharedState.cms.announcement.message_en : sharedState.cms.announcement.message_vi
        }</div>`
      : '';

    const holidayAlert = sharedState.cms.hours.holiday_notice_active
      ? `<div class="holiday-alert">${
          locale === 'en' ? sharedState.cms.hours.holiday_notice_en : sharedState.cms.hours.holiday_notice_vi
        }</div>`
      : '';

    const openingBadge = sharedState.cms.hours.holiday_notice_active
      ? `<span class="status-badge closed">${locale === 'en' ? 'Closed for Holiday' : 'Nghỉ Lễ Đóng Cửa'}</span>`
      : `<span class="status-badge open">${
          locale === 'en' ? 'Open Now — Closes at 8:00 PM' : 'Đang Mở Cửa — Đóng lúc 8:00 PM'
        }</span>`;

    const footerHtml = `
      <footer>
        <div class="contact-details">
          <p>Phone: <a href="tel:+61291234567">${FIXTURES.salon.phone}</a></p>
          <p>Mobile: <a href="tel:+61412345678">${FIXTURES.salon.mobile}</a></p>
          <p>Address: ${FIXTURES.salon.address}</p>
          <p>ABN: ${FIXTURES.salon.abn}</p>
          ${holidayAlert}
        </div>
      </footer>
    `;

    // Page: Homepage
    if (subRoute === '/') {
      const heroHeadline = locale === 'en' ? sharedState.cms.hero.headline_en : sharedState.cms.hero.headline_vi;
      const heroSub = locale === 'en' ? sharedState.cms.hero.subheadline_en : sharedState.cms.hero.subheadline_vi;
      const heroCta = locale === 'en' ? sharedState.cms.hero.cta_text_en : sharedState.cms.hero.cta_text_vi;

      const featuredGallery = sharedState.gallery
        .filter((g) => g.is_featured)
        .map(
          (g) =>
            `<div class="gallery-card"><img src="${g.image_url}" alt="${
              locale === 'en' ? g.title_en : g.title_vi
            }" loading="lazy"/></div>`
        )
        .join('');

      const html = `<!DOCTYPE html>
<html lang="${locale}">
<head>
  <title>${FIXTURES.salon.name} - ${locale === 'en' ? 'Luxury Nails' : 'Tiệm Móng Đẳng Cấp'}</title>
  ${openGraphTags}
  ${hreflangTags}
  <script type="application/ld+json">${JSON.stringify(jsonLd)}</script>
</head>
<body>
  ${announcementHtml}
  <nav>
    <a href="/${locale}">${locale === 'en' ? 'Home' : 'Trang Chủ'}</a>
    <a href="/${locale}/services">${locale === 'en' ? 'Services' : 'Dịch Vụ'}</a>
    <a href="/${locale}/gallery">${locale === 'en' ? 'Gallery' : 'Bộ Sưu Tập'}</a>
    <a href="/${locale}/contact">${locale === 'en' ? 'Contact' : 'Liên Hệ'}</a>
    <a href="/${otherLocale}" class="lang-switch">${otherLocale.toUpperCase()}</a>
  </nav>
  <main>
    <section class="hero">
      <h1>${heroHeadline}</h1>
      <p>${heroSub}</p>
      <a href="/${locale}${sharedState.cms.hero.cta_link}" class="cta">${heroCta}</a>
      ${openingBadge}
    </section>
    <section class="lookbook">
      <h2>${locale === 'en' ? 'Featured Lookbook' : 'Mẫu Móng Nổi Bật'}</h2>
      <div class="gallery-grid">${featuredGallery}</div>
    </section>
  </main>
  ${footerHtml}
</body>
</html>`;
      return sendHtml(200, html, { 'Set-Cookie': `NEXT_LOCALE=${locale}; Path=/; SameSite=Lax` });
    }

    // Page: Services
    if (subRoute === '/services') {
      const activeServices = sharedState.services.filter((s) => s.is_active);
      const servicesHtml = activeServices
        .map((s) => {
          const name = locale === 'vi' ? s.name_vi || s.name_en : s.name_en;
          return `<div class="service-card" data-category="${s.category}">
            <h3>${name}</h3>
            <span class="category">${s.category}</span>
            <span class="duration">${s.duration_minutes} mins</span>
            <span class="price">$${(s.price_cents / 100).toFixed(2)} AUD</span>
          </div>`;
        })
        .join('');

      const notice =
        locale === 'en'
          ? 'All prices are inclusive of Australian GST (10%)'
          : 'Giá đã bao gồm thuế GST 10%';

      const html = `<!DOCTYPE html>
<html lang="${locale}">
<head>
  <title>${locale === 'en' ? 'Our Services' : 'Dịch Vụ Của Chúng Tôi'} - ${FIXTURES.salon.name}</title>
  ${openGraphTags}
  ${hreflangTags}
</head>
<body>
  ${announcementHtml}
  <h1>${locale === 'en' ? 'Our Services & AUD Pricing' : 'Bảng Giá Dịch Vụ AUD'}</h1>
  <p class="gst-notice">${notice}</p>
  <div class="service-list">
    ${servicesHtml}
  </div>
  ${footerHtml}
</body>
</html>`;
      return sendHtml(200, html);
    }

    // Page: Gallery
    if (subRoute === '/gallery') {
      const catParam = parsedUrl.searchParams.get('category');
      let filteredGallery = sharedState.gallery;
      if (catParam) {
        filteredGallery = sharedState.gallery.filter((g) => g.category.toLowerCase() === catParam.toLowerCase());
      }

      const galleryCards = filteredGallery
        .map((g) => {
          const title = locale === 'vi' ? g.title_vi : g.title_en;
          return `<div class="gallery-item" data-category="${g.category}">
            <img src="${g.image_url}" alt="${title}" loading="lazy" />
            <span class="title">${title}</span>
            <div class="lightbox-modal" role="dialog" aria-label="Lightbox">
              <button aria-label="Close" class="close-btn">&times;</button>
              <img src="${g.image_url}" alt="${title}" />
            </div>
          </div>`;
        })
        .join('');

      const html = `<!DOCTYPE html>
<html lang="${locale}">
<head>
  <title>${locale === 'en' ? 'Nail Art Gallery' : 'Bộ Sưu Tập Nghệ Thuật Móng'}</title>
  ${openGraphTags}
  ${hreflangTags}
</head>
<body>
  ${announcementHtml}
  <h1>${locale === 'en' ? 'Nail Art Gallery' : 'Bộ Sưu Tập Móng'}</h1>
  <div class="filter-chips">
    <button data-cat="all">All</button>
    <button data-cat="Ombre">Ombre</button>
    <button data-cat="3D Art">3D Art</button>
    <button data-cat="Chrome">Chrome</button>
  </div>
  <div class="gallery-container">
    ${galleryCards}
  </div>
  ${footerHtml}
</body>
</html>`;
      return sendHtml(200, html);
    }

    // Page: Contact & Consultation
    if (subRoute === '/contact') {
      const html = `<!DOCTYPE html>
<html lang="${locale}">
<head>
  <title>${locale === 'en' ? 'Contact & Book' : 'Liên Hệ & Đặt Lịch'}</title>
  ${openGraphTags}
  ${hreflangTags}
</head>
<body>
  ${announcementHtml}
  <h1>${locale === 'en' ? 'Contact Us & Booking' : 'Liên Hệ & Đặt Lịch Tư Vấn'}</h1>
  <form id="consultation-form" action="/api/consultation" method="POST">
    <input name="customer_name" placeholder="Full Name" required />
    <input name="phone" placeholder="Australian Mobile (+61 or 04...)" required />
    <input name="email" type="email" placeholder="Email" />
    <input name="preferred_date" type="date" required />
    <button type="submit">${locale === 'en' ? 'Submit Inquiry' : 'Gửi Yêu Cầu'}</button>
  </form>
  ${footerHtml}
</body>
</html>`;
      return sendHtml(200, html);
    }

    // Page: About
    if (subRoute === '/about') {
      const html = `<!DOCTYPE html>
<html lang="${locale}">
<head>
  <title>${locale === 'en' ? 'About Our Salon' : 'Về Chúng Tôi'}</title>
  ${openGraphTags}
  ${hreflangTags}
</head>
<body>
  ${announcementHtml}
  <h1>${locale === 'en' ? 'About Glamour Nails Sydney' : 'Về Glamour Nails Sydney'}</h1>
  <p>${locale === 'en' ? 'Medical-grade autoclave sterilization and disposable files.' : 'Khử trùng chuẩn y tế và dũa móng dùng một lần an toàn tuyệt đối.'}</p>
  ${footerHtml}
</body>
</html>`;
      return sendHtml(200, html);
    }
  }

  // 5. Public API: Consultation Inquiry Submission
  if (pathname === '/api/consultation' && method === 'POST') {
    if (!bodyJson || !bodyJson.customer_name || !bodyJson.phone) {
      return sendJson(400, { success: false, error: 'Name and valid Australian phone number are required.' });
    }

    if (!validateAuPhone(bodyJson.phone)) {
      return sendJson(400, { success: false, error: 'Invalid Australian mobile or phone format.' });
    }

    if (bodyJson.preferred_date) {
      const selected = new Date(bodyJson.preferred_date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (selected < today) {
        return sendJson(400, { success: false, error: 'Preferred booking date must be today or in the future.' });
      }
      const maxFuture = new Date();
      maxFuture.setDate(maxFuture.getDate() + 60);
      if (selected > maxFuture) {
        return sendJson(400, { success: false, error: 'Bookings can only be scheduled up to 60 days in advance.' });
      }
    }

    // Neutralize / escape XSS in notes
    const sanitizedNotes = bodyJson.notes
      ? String(bodyJson.notes).replace(/</g, '&lt;').replace(/>/g, '&gt;')
      : '';

    const newInquiry = {
      id: `inq-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      customer_name: String(bodyJson.customer_name).trim(),
      phone: String(bodyJson.phone).trim(),
      email: bodyJson.email ? String(bodyJson.email).trim() : null,
      preferred_language: bodyJson.preferred_language || 'en',
      preferred_date: bodyJson.preferred_date || null,
      preferred_time: bodyJson.preferred_time || null,
      services_requested: bodyJson.services_requested || [],
      notes: sanitizedNotes,
      status: 'new',
      created_at: new Date().toISOString(),
    };

    sharedState.consultations.push(newInquiry);
    return sendJson(201, { success: true, inquiry_id: newInquiry.id, status: 'new' });
  }

  // 6. Admin Auth: Login / Logout
  if (pathname === '/api/auth/login' && method === 'POST') {
    const { email, password } = bodyJson || {};
    const staffMember = sharedState.staff.find((s) => s.email.toLowerCase() === String(email).toLowerCase());

    if (!staffMember) {
      return sendJson(401, { success: false, error: 'Invalid login credentials' });
    }

    const setCookies = [
      `sb-authenticated=true; Path=/; HttpOnly; SameSite=Lax`,
      `sb-role=${staffMember.role}; Path=/; HttpOnly; SameSite=Lax`,
      `sb-email=${staffMember.email}; Path=/; HttpOnly; SameSite=Lax`,
      `sb-id=${staffMember.id}; Path=/; HttpOnly; SameSite=Lax`,
    ];

    res.writeHead(200, {
      'Content-Type': 'application/json',
      'Set-Cookie': setCookies,
    });
    res.end(JSON.stringify({ success: true, user: staffMember }));
    return;
  }

  if (pathname === '/api/auth/logout' && method === 'POST') {
    const clearCookies = [
      `sb-authenticated=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT`,
      `sb-role=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT`,
    ];
    res.writeHead(200, {
      'Content-Type': 'application/json',
      'Set-Cookie': clearCookies,
    });
    res.end(JSON.stringify({ success: true }));
    return;
  }

  // 7. Admin Protected Shell / Pages
  if (pathname.startsWith('/admin')) {
    if (cookies['sb-authenticated'] !== 'true') {
      res.writeHead(307, { Location: '/admin/login' });
      res.end();
      return;
    }

    // Role-based route guard for finance
    const role = cookies['sb-role'];
    if (pathname.startsWith('/admin/finance') && role === 'staff') {
      res.writeHead(403, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end('<h1>403 Forbidden - Staff role not authorized to view financial records</h1>');
      return;
    }

    return sendHtml(200, `<!DOCTYPE html><html><body><h1>Admin Dashboard (${role})</h1></body></html>`);
  }

  // 7b. Admin APIs Global Authentication Guard
  if (pathname === '/api/admin' || pathname.startsWith('/api/admin/')) {
    if (cookies['sb-authenticated'] !== 'true') {
      return sendJson(401, { error: 'Unauthorized: Admin authentication required' });
    }
  }

  // 8. Admin APIs - CMS Management
  if (pathname === '/api/admin/cms/hero' && method === 'POST') {
    const role = cookies['sb-role'];
    if (role === 'staff') {
      return sendJson(403, { error: 'Forbidden' });
    }
    if (bodyJson) {
      Object.assign(sharedState.cms.hero, bodyJson);
    }
    return sendJson(200, { success: true, hero: sharedState.cms.hero });
  }

  if (pathname === '/api/admin/cms/announcement' && method === 'POST') {
    const role = cookies['sb-role'];
    if (role === 'staff') {
      return sendJson(403, { error: 'Forbidden' });
    }
    if (bodyJson) {
      Object.assign(sharedState.cms.announcement, bodyJson);
    }
    return sendJson(200, { success: true, announcement: sharedState.cms.announcement });
  }

  if (pathname === '/api/admin/cms/hours' && method === 'POST') {
    const role = cookies['sb-role'];
    if (role === 'staff') {
      return sendJson(403, { error: 'Forbidden' });
    }
    if (bodyJson) {
      Object.assign(sharedState.cms.hours, bodyJson);
    }
    return sendJson(200, { success: true, hours: sharedState.cms.hours });
  }

  // 9. Admin APIs - Service Catalog CRUD
  if (pathname === '/api/admin/services') {
    if (method === 'GET') {
      return sendJson(200, { success: true, services: sharedState.services });
    }
    if (method === 'POST') {
      const role = cookies['sb-role'];
      if (role === 'staff') return sendJson(403, { error: 'Forbidden' });

      if (bodyJson.price_cents < 0 || (bodyJson.price_aud && bodyJson.price_aud < 0)) {
        return sendJson(400, { error: 'Service price must be non-negative.' });
      }

      const price_cents = bodyJson.price_cents ?? Math.round((bodyJson.price_aud || 0) * 100);
      const newService: ServiceFixture = {
        id: `srv-${Date.now()}`,
        name_en: bodyJson.name_en || 'New Service',
        name_vi: bodyJson.name_vi || '',
        category: bodyJson.category || 'Gel Art',
        price_cents,
        price_aud: price_cents / 100,
        duration_minutes: bodyJson.duration_minutes || 45,
        is_active: true,
      };
      sharedState.services.push(newService);
      return sendJson(201, { success: true, service_id: newService.id, service: newService });
    }
  }

  if (pathname.startsWith('/api/admin/services/')) {
    const serviceId = pathname.split('/').pop() || '';
    const serviceIndex = sharedState.services.findIndex((s) => s.id === serviceId);

    if (serviceIndex === -1) {
      return sendJson(404, { error: 'Service not found' });
    }

    if (method === 'PUT') {
      const role = cookies['sb-role'];
      if (role === 'staff') return sendJson(403, { error: 'Forbidden' });
      if (bodyJson.price_cents !== undefined) {
        sharedState.services[serviceIndex].price_cents = bodyJson.price_cents;
        sharedState.services[serviceIndex].price_aud = bodyJson.price_cents / 100;
      }
      if (bodyJson.price_aud !== undefined) {
        sharedState.services[serviceIndex].price_aud = bodyJson.price_aud;
        sharedState.services[serviceIndex].price_cents = Math.round(bodyJson.price_aud * 100);
      }
      if (bodyJson.name_en) sharedState.services[serviceIndex].name_en = bodyJson.name_en;
      if (bodyJson.name_vi !== undefined) sharedState.services[serviceIndex].name_vi = bodyJson.name_vi;
      return sendJson(200, { success: true, service: sharedState.services[serviceIndex] });
    }

    if (method === 'DELETE') {
      const role = cookies['sb-role'];
      if (role === 'staff') return sendJson(403, { error: 'Forbidden' });
      sharedState.services[serviceIndex].is_active = false;
      return sendJson(200, { success: true, message: 'Service soft-deleted' });
    }
  }

  // 10. Admin APIs - Gallery Manager
  if (pathname === '/api/admin/gallery' && method === 'POST') {
    const role = cookies['sb-role'];
    if (role === 'staff') return sendJson(403, { error: 'Forbidden' });
    const newItem = {
      id: `gal-${Date.now()}`,
      title_en: bodyJson.title_en || 'New Nail Look',
      title_vi: bodyJson.title_vi || 'Mẫu Móng Mới',
      category: bodyJson.category || 'Ombre',
      image_url: bodyJson.image_url || 'https://images.unsplash.com/photo-1604654894610-df63bc536371?auto=format&fit=crop&w=800&q=80',
      is_featured: !!bodyJson.is_featured,
    };
    sharedState.gallery.unshift(newItem);
    return sendJson(201, { success: true, item_id: newItem.id, item: newItem });
  }

  // 11. Admin APIs - Customer Management (CRM)
  if (pathname === '/api/admin/customers') {
    if (method === 'GET') {
      const search = parsedUrl.searchParams.get('search');
      let results = sharedState.customers.filter((c) => c.is_active);
      if (search) {
        const normQuery = normalizeVietnamese(search);
        results = results.filter((c) => {
          const normName = normalizeVietnamese(c.name);
          const normPhone = c.phone.replace(/\D/g, '');
          const cleanQuery = search.replace(/\D/g, '');
          return (
            normName.includes(normQuery) ||
            (cleanQuery.length > 3 && normPhone.includes(cleanQuery)) ||
            (c.email && c.email.toLowerCase().includes(search.toLowerCase()))
          );
        });
      }
      return sendJson(200, { success: true, customers: results });
    }

    if (method === 'POST') {
      if (!bodyJson || !bodyJson.full_name || !bodyJson.phone) {
        return sendJson(400, { error: 'Name and Australian phone required' });
      }
      if (!validateAuPhone(bodyJson.phone)) {
        return sendJson(400, { error: 'Invalid Australian phone format' });
      }

      const newCust = {
        id: `cust-${Date.now()}`,
        name: bodyJson.full_name,
        phone: bodyJson.phone,
        email: bodyJson.email || '',
        preferred_language: bodyJson.preferred_language || 'en',
        nail_shape: bodyJson.nail_shape || 'Almond',
        preferred_products: bodyJson.preferred_products || [],
        allergies: bodyJson.allergies || 'None',
        notes: bodyJson.notes || '',
        total_visits_count: 0,
        total_spend_cents: 0,
        is_active: true,
      };
      sharedState.customers.push(newCust);
      return sendJson(201, { success: true, customer_id: newCust.id, customer: newCust });
    }
  }

  if (pathname.startsWith('/api/admin/customers/')) {
    const parts = pathname.split('/');
    const customerId = parts[4];
    const isPref = parts[5] === 'preferences';
    const custIndex = sharedState.customers.findIndex((c) => c.id === customerId);

    if (custIndex === -1) {
      return sendJson(404, { error: 'Customer not found' });
    }

    if (isPref && method === 'PUT') {
      if (bodyJson.nail_shape) sharedState.customers[custIndex].nail_shape = bodyJson.nail_shape;
      if (bodyJson.preferred_products) sharedState.customers[custIndex].preferred_products = bodyJson.preferred_products;
      if (bodyJson.allergies) sharedState.customers[custIndex].allergies = bodyJson.allergies;
      if (bodyJson.notes) sharedState.customers[custIndex].notes = bodyJson.notes;
      return sendJson(200, { success: true, customer: sharedState.customers[custIndex] });
    }

    if (method === 'GET') {
      return sendJson(200, { success: true, customer: sharedState.customers[custIndex] });
    }

    if (method === 'PUT') {
      if (bodyJson.full_name) sharedState.customers[custIndex].name = bodyJson.full_name;
      if (bodyJson.phone) sharedState.customers[custIndex].phone = bodyJson.phone;
      if (bodyJson.email) sharedState.customers[custIndex].email = bodyJson.email;
      return sendJson(200, { success: true, customer: sharedState.customers[custIndex] });
    }

    if (method === 'DELETE') {
      sharedState.customers[custIndex].is_active = false;
      return sendJson(200, { success: true, message: 'Customer soft-deleted' });
    }
  }

  // 12. Admin APIs - Inquiries Triage
  if (pathname === '/api/admin/inquiries' && method === 'GET') {
    return sendJson(200, { success: true, inquiries: sharedState.consultations });
  }

  if (pathname.startsWith('/api/admin/inquiries/')) {
    const inquiryId = pathname.split('/')[4];
    const inq = sharedState.consultations.find((c) => c.id === inquiryId);
    if (!inq) {
      return sendJson(404, { error: 'Inquiry not found' });
    }

    if (method === 'PUT') {
      const newStatus = bodyJson.status;
      if (newStatus) inq.status = newStatus;

      // If action is convert or status is booked, ensure customer profile exists
      if (bodyJson.convert_to_customer || newStatus === 'booked') {
        let cust = sharedState.customers.find((c) => c.phone === inq.phone);
        if (!cust) {
          cust = {
            id: `cust-${Date.now()}`,
            name: inq.customer_name,
            phone: inq.phone,
            email: inq.email || '',
            preferred_language: inq.preferred_language || 'en',
            allergies: inq.notes?.includes('allergy') || inq.notes?.includes('Allergy') ? inq.notes : 'None',
            total_visits_count: 0,
            total_spend_cents: 0,
            is_active: true,
          };
          sharedState.customers.push(cust);
        }
        inq.converted_customer_id = cust.id;
      }

      return sendJson(200, { success: true, inquiry: inq });
    }
  }

  // 13. Admin APIs - Visits & Revenue Auto-Sync
  if (pathname === '/api/admin/visits' && method === 'POST') {
    const { customer_id, staff_id, visit_date, services_rendered, total_amount_cents, payment_method } = bodyJson || {};

    const customer = sharedState.customers.find((c) => c.id === customer_id);
    if (customer) {
      customer.total_visits_count += 1;
      customer.total_spend_cents += total_amount_cents || 0;
    }

    const visit = {
      id: `vis-${Date.now()}`,
      customer_id,
      staff_id,
      visit_date: visit_date || new Date().toISOString(),
      services_rendered: services_rendered || [],
      total_amount_cents: total_amount_cents || 0,
      payment_method: payment_method || 'EFTPOS',
    };
    sharedState.visits.push(visit);

    // Auto-reconciliation to finance_transactions
    const transaction = {
      id: `tx-rev-${Date.now()}`,
      type: 'revenue',
      category: 'Services',
      amount_cents: total_amount_cents || 0,
      amount_aud: (total_amount_cents || 0) / 100,
      payment_method: payment_method || 'EFTPOS',
      reference_id: visit.id,
      staff_id,
      customer_id,
      date: visit.visit_date.slice(0, 10),
      description: `Service visit - ${customer?.name || 'Customer'}`,
    };
    sharedState.transactions.push(transaction);

    return sendJson(201, { success: true, visit_id: visit.id, transaction_id: transaction.id });
  }

  // 14. Admin APIs - Staff Management & Productivity
  if (pathname === '/api/admin/staff') {
    if (method === 'GET') {
      const activeOnly = parsedUrl.searchParams.get('active') === 'true';
      const list = activeOnly ? sharedState.staff.filter((s) => s.is_active) : sharedState.staff;
      return sendJson(200, { success: true, staff: list });
    }

    if (method === 'POST') {
      const role = cookies['sb-role'];
      if (role === 'staff') return sendJson(403, { error: 'Forbidden' });

      const newStaff: StaffFixture = {
        id: `stf-${Date.now()}`,
        name: bodyJson.full_name || 'Staff Member',
        phone: bodyJson.phone || '0400 000 000',
        email: bodyJson.email || `staff${Date.now()}@glamournails.com.au`,
        role: bodyJson.role || 'staff',
        employment_type: bodyJson.employment_type || 'Full-time',
        specializations: bodyJson.specializations || [],
        is_active: true,
      };
      sharedState.staff.push(newStaff);
      return sendJson(201, { success: true, staff_id: newStaff.id, staff: newStaff });
    }
  }

  if (pathname.startsWith('/api/admin/staff/')) {
    const parts = pathname.split('/');
    const staffId = parts[4];
    const subAction = parts[5];
    const staffIndex = sharedState.staff.findIndex((s) => s.id === staffId);

    if (staffIndex === -1) {
      return sendJson(404, { error: 'Staff member not found' });
    }

    if (subAction === 'role' && method === 'PUT') {
      const currentRole = cookies['sb-role'];
      if (currentRole !== 'super_admin') {
        return sendJson(403, { error: 'Only super_admin can modify staff roles' });
      }
      sharedState.staff[staffIndex].role = bodyJson.role;
      return sendJson(200, { success: true, staff: sharedState.staff[staffIndex] });
    }

    if (subAction === 'specializations' && method === 'PUT') {
      sharedState.staff[staffIndex].specializations = bodyJson.specializations || [];
      return sendJson(200, { success: true, staff: sharedState.staff[staffIndex] });
    }

    if (subAction === 'status' && method === 'PUT') {
      sharedState.staff[staffIndex].is_active = !!bodyJson.is_active;
      return sendJson(200, { success: true, staff: sharedState.staff[staffIndex] });
    }

    if (subAction === 'productivity' && method === 'GET') {
      const staffVisits = sharedState.visits.filter((v) => v.staff_id === staffId);
      const totalRevenueCents = staffVisits.reduce((acc, v) => acc + (v.total_amount_cents || 0), 0);
      return sendJson(200, {
        success: true,
        staff_id: staffId,
        completed_visits: staffVisits.length,
        total_revenue_cents: totalRevenueCents,
        total_revenue_aud: totalRevenueCents / 100,
        average_ticket_aud: staffVisits.length > 0 ? (totalRevenueCents / staffVisits.length / 100) : 0,
      });
    }

    if (method === 'GET') {
      return sendJson(200, { success: true, staff: sharedState.staff[staffIndex] });
    }

    if (method === 'PUT') {
      Object.assign(sharedState.staff[staffIndex], bodyJson);
      return sendJson(200, { success: true, staff: sharedState.staff[staffIndex] });
    }
  }

  // 15. Admin APIs - Finance Module
  if (pathname.startsWith('/api/admin/finance')) {
    const role = cookies['sb-role'];
    const isAuth = cookies['sb-authenticated'] === 'true';
    if (!isAuth) {
      return sendJson(401, { error: 'Unauthorized' });
    }
    if (role === 'staff') {
      return sendJson(403, { error: 'Forbidden' });
    }

    if (pathname === '/api/admin/finance/transactions' && method === 'POST') {
      const { type, category, amount_cents, amount_aud, payment_method, description, is_tax_deductible, date } = bodyJson || {};

      const cents = amount_cents !== undefined ? amount_cents : (amount_aud !== undefined ? Math.round(amount_aud * 100) : NaN);

      if (typeof cents !== 'number' || isNaN(cents)) {
        return sendJson(400, { error: 'Amount must be a valid positive number' });
      }
      if (cents <= 0) {
        return sendJson(400, { error: 'Transaction amount must be strictly greater than zero' });
      }
      if (cents > 100000000) {
        return sendJson(400, { error: 'Max transaction limit exceeded' });
      }

      const tx = {
        id: `tx-${Date.now()}`,
        type: type === 'expense' ? 'expense' : 'revenue',
        category: category || 'General',
        amount_cents: cents,
        amount_aud: cents / 100,
        payment_method: payment_method || 'EFTPOS',
        description: description || '',
        is_tax_deductible: type === 'expense' ? !!is_tax_deductible : false,
        date: date || new Date().toISOString().slice(0, 10),
      };
      sharedState.transactions.push(tx);
      return sendJson(201, { success: true, transaction_id: tx.id, transaction: tx });
    }

    if (pathname.startsWith('/api/admin/finance/transactions/') && method === 'DELETE') {
      const id = pathname.split('/')[5];
      const index = sharedState.transactions.findIndex((t) => t.id === id);
      if (index !== -1) {
        sharedState.transactions.splice(index, 1);
      }
      return sendJson(200, { success: true });
    }

    if (pathname === '/api/admin/finance/summary') {
      let revCents = 0;
      let expCents = 0;
      let gstPaidCents = 0;

      for (const t of sharedState.transactions) {
        if (t.type === 'revenue' || t.type === 'income') {
          revCents += t.amount_cents;
        } else if (t.type === 'expense') {
          expCents += t.amount_cents;
          if (t.is_tax_deductible) {
            gstPaidCents += Math.round(t.amount_cents / 11);
          }
        }
      }

      const netProfitCents = revCents - expCents;
      const profitMarginPercent = revCents === 0 ? 0 : Math.round(((netProfitCents / revCents) * 100) * 100) / 100;
      const gstCollectedCents = Math.round(revCents / 11);
      const netGstPayableCents = gstCollectedCents - gstPaidCents;

      return sendJson(200, {
        success: true,
        totalRevenueCents: revCents,
        totalRevenueAud: revCents / 100,
        totalExpenseCents: expCents,
        totalExpenseAud: expCents / 100,
        netProfitCents,
        netProfitAud: netProfitCents / 100,
        profitMarginPercent,
        gstCollectedCents,
        gstCollectedAud: gstCollectedCents / 100,
        gstPaidCents,
        gstPaidAud: gstPaidCents / 100,
        netGstPayableCents,
        netGstPayableAud: netGstPayableCents / 100,
      });
    }

    if (pathname === '/api/admin/finance/breakdown') {
      const revenueByCategory: Record<string, number> = {};
      const expenseByCategory: Record<string, number> = {};

      for (const t of sharedState.transactions) {
        const cat = t.category || 'General';
        if (t.type === 'revenue' || t.type === 'income') {
          revenueByCategory[cat] = (revenueByCategory[cat] || 0) + t.amount_cents;
        } else if (t.type === 'expense') {
          expenseByCategory[cat] = (expenseByCategory[cat] || 0) + t.amount_cents;
        }
      }

      return sendJson(200, {
        success: true,
        revenueByCategory,
        expenseByCategory,
      });
    }

    if (pathname === '/api/admin/finance/bas') {
      const startDate = parsedUrl.searchParams.get('startDate');
      const endDate = parsedUrl.searchParams.get('endDate');

      if (startDate && endDate && startDate > endDate) {
        return sendJson(400, { error: 'Start date must precede end date' });
      }

      // Default or quarterly calculation
      let qRevCents = 0;
      let qExpDeductibleCents = 0;

      for (const t of sharedState.transactions) {
        if (t.type === 'revenue' || t.type === 'income') {
          qRevCents += t.amount_cents;
        } else if (t.type === 'expense' && t.is_tax_deductible) {
          qExpDeductibleCents += t.amount_cents;
        }
      }

      const gstCollected = Math.round(qRevCents / 11);
      const gstPaid = Math.round(qExpDeductibleCents / 11);
      const netPayable = gstCollected - gstPaid;

      return sendJson(200, {
        success: true,
        quarter: parsedUrl.searchParams.get('quarter') || 'Q1',
        fy: parsedUrl.searchParams.get('fy') || '2025-2026',
        qRevCents,
        qExpDeductibleCents,
        gstCollectedCents: gstCollected,
        gstPaidCents: gstPaid,
        netGstPayableCents: netPayable,
        netGstPayableAud: netPayable / 100,
      });
    }
  }

  // Fallback 404
  return sendJson(404, { error: `Not found: ${pathname}` });
}

export class OpaqueTestClient {
  private baseUrl: string | null = null;
  private cookies: Map<string, string> = new Map();

  constructor(options?: ClientOptions) {
    if (options?.baseUrl) {
      this.baseUrl = options.baseUrl;
    } else if (process.env.TEST_BASE_URL) {
      this.baseUrl = process.env.TEST_BASE_URL;
    }
  }

  private async getResolvedBaseUrl(): Promise<string> {
    if (this.baseUrl) return this.baseUrl;

    // If explicit TEST_BASE_URL is provided, use it
    if (process.env.TEST_BASE_URL) {
      this.baseUrl = process.env.TEST_BASE_URL;
      return this.baseUrl;
    }

    // Default to isolated in-memory embedded test server
    const port = await startEmbeddedServer();
    this.baseUrl = `http://127.0.0.1:${port}`;
    return this.baseUrl;
  }

  setCookie(name: string, value: string) {
    this.cookies.set(name, value);
  }

  getCookie(name: string): string | undefined {
    return this.cookies.get(name);
  }

  clearCookies() {
    this.cookies.clear();
  }

  private buildCookieHeader(): string {
    const parts: string[] = [];
    for (const [k, v] of this.cookies.entries()) {
      parts.push(`${k}=${encodeURIComponent(v)}`);
    }
    return parts.join('; ');
  }

  private processIncomingCookies(headers: Headers) {
    const setCookieHeaders = (headers as any).getSetCookie
      ? (headers as any).getSetCookie()
      : [headers.get('set-cookie')].filter(Boolean);

    for (const raw of setCookieHeaders) {
      if (!raw) continue;
      const parts = raw.split(',');
      for (const part of parts) {
        const match = part.trim().match(/^([^=]+)=([^;]+)/);
        if (match) {
          this.cookies.set(match[1].trim(), decodeURIComponent(match[2].trim()));
        }
      }
    }
  }

  async request(path: string, options: RequestInit = {}): Promise<TestResponse> {
    const base = await this.getResolvedBaseUrl();
    const url = path.startsWith('http') ? path : `${base}${path.startsWith('/') ? path : `/${path}`}`;
    const headers = new Headers(options.headers || {});

    if (this.cookies.size > 0 && !headers.has('Cookie')) {
      headers.set('Cookie', this.buildCookieHeader());
    }

    const res = await fetch(url, {
      ...options,
      headers,
      redirect: 'manual', // preserve 307 redirects for testing
    });

    this.processIncomingCookies(res.headers);
    const bodyText = await res.text();

    return {
      status: res.status,
      statusText: res.statusText,
      headers: res.headers,
      bodyText,
      json<T = any>(): T {
        try {
          return JSON.parse(bodyText);
        } catch (e: any) {
          throw new Error(`Failed to parse body as JSON: ${e.message}\nBody text: ${bodyText.slice(0, 300)}`);
        }
      },
    };
  }

  async get(path: string, headers?: Record<string, string>): Promise<TestResponse> {
    return this.request(path, { method: 'GET', headers });
  }

  async post(path: string, body?: any, headers?: Record<string, string>): Promise<TestResponse> {
    const isJson = body && typeof body === 'object';
    return this.request(path, {
      method: 'POST',
      headers: {
        ...(isJson ? { 'Content-Type': 'application/json' } : {}),
        ...headers,
      },
      body: isJson ? JSON.stringify(body) : body,
    });
  }

  async put(path: string, body?: any, headers?: Record<string, string>): Promise<TestResponse> {
    const isJson = body && typeof body === 'object';
    return this.request(path, {
      method: 'PUT',
      headers: {
        ...(isJson ? { 'Content-Type': 'application/json' } : {}),
        ...headers,
      },
      body: isJson ? JSON.stringify(body) : body,
    });
  }

  async delete(path: string, headers?: Record<string, string>): Promise<TestResponse> {
    return this.request(path, { method: 'DELETE', headers });
  }

  // Authentication Helpers
  async loginAs(role: 'super_admin' | 'manager' | 'staff'): Promise<void> {
    const emails: Record<string, string> = {
      super_admin: 'admin@glamournails.com.au',
      manager: 'manager@glamournails.com.au',
      staff: 'technician@glamournails.com.au',
    };
    const res = await this.post('/api/auth/login', {
      email: emails[role],
      password: 'SecurePassword2026!',
    });
    if (res.status !== 200) {
      // In direct cookie mode, set cookies directly
      this.setCookie('sb-role', role);
      this.setCookie('sb-authenticated', 'true');
      this.setCookie('sb-email', emails[role]);
    }
  }

  async logout(): Promise<void> {
    await this.post('/api/auth/logout', {});
    this.clearCookies();
  }

  // HTML & SEO Extraction Helpers
  async getHtml(path: string): Promise<string> {
    const res = await this.get(path);
    return res.bodyText;
  }

  extractJsonLd(html: string): any[] {
    const jsonLdRegex = /<script\s+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
    const results: any[] = [];
    let match;
    while ((match = jsonLdRegex.exec(html)) !== null) {
      try {
        results.push(JSON.parse(match[1]));
      } catch (e) {}
    }
    return results;
  }

  extractHreflangTags(html: string): Array<{ hreflang: string; href: string }> {
    const linkRegex = /<link\s+[^>]*rel=["']alternate["'][^>]*>/gi;
    const results: Array<{ hreflang: string; href: string }> = [];
    let match;
    while ((match = linkRegex.exec(html)) !== null) {
      const tag = match[0];
      const hreflangMatch = tag.match(/hreflang=["']([^"']+)["']/i);
      const hrefMatch = tag.match(/href=["']([^"']+)["']/i);
      if (hreflangMatch && hrefMatch) {
        results.push({ hreflang: hreflangMatch[1], href: hrefMatch[1] });
      }
    }
    return results;
  }

  extractMetaTags(html: string): Record<string, string> {
    const metaRegex = /<meta\s+[^>]*>/gi;
    const results: Record<string, string> = {};
    let match;
    while ((match = metaRegex.exec(html)) !== null) {
      const tag = match[0];
      const nameMatch = tag.match(/(?:name|property)=["']([^"']+)["']/i);
      const contentMatch = tag.match(/content=["']([^"']+)["']/i);
      if (nameMatch && contentMatch) {
        results[nameMatch[1]] = contentMatch[1];
      }
    }
    return results;
  }
}
