'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  Sparkles,
  Megaphone,
  Scissors,
  Image as ImageIcon,
  Clock,
  MapPin,
  Save,
  Plus,
  Trash2,
  Edit2,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Star,
  RefreshCw,
  ExternalLink,
  Navigation,
  Bell,
  Send,
  Share2,
  Gem,
  BookOpen,
  Award,
  Heart,
  RotateCcw,
} from 'lucide-react';
import { ImageUploader } from '@/components/admin/ImageUploader';
import { SocialIconLinks, FacebookSvg, InstagramSvg } from '@/components/public/SocialIcons';
import { isValidABN } from '@/lib/utils/validation';
import { useAdminLanguage } from '@/lib/i18n/AdminLanguageContext';

function AdminCmsPortalContent() {
  const { t, locale } = useAdminLanguage();
  const searchParams = useSearchParams();
  const router = useRouter();

  const tabQuery = searchParams.get('tab');
  const validTabs = ['hero', 'announcement', 'services', 'gallery', 'about-story', 'hours', 'business', 'notifications'];

  const [activeTab, setActiveTab] = useState<
    'hero' | 'announcement' | 'services' | 'gallery' | 'about-story' | 'hours' | 'business' | 'notifications'
  >(tabQuery && validTabs.includes(tabQuery) ? (tabQuery as any) : 'hero');

  useEffect(() => {
    if (tabQuery && validTabs.includes(tabQuery) && tabQuery !== activeTab) {
      setActiveTab(tabQuery as any);
    }
  }, [tabQuery]);

  const handleTabChange = (tabId: typeof activeTab) => {
    setActiveTab(tabId);
    router.replace(`/admin/cms?tab=${tabId}`, { scroll: false });
  };

  const tabsList = [
    { id: 'hero', label: t.tabs.hero, icon: Sparkles },
    { id: 'announcement', label: t.tabs.announcement, icon: Megaphone },
    { id: 'services', label: t.tabs.services, icon: Scissors },
    { id: 'gallery', label: t.tabs.gallery, icon: ImageIcon },
    { id: 'about-story', label: t.tabs.aboutStory, icon: BookOpen },
    { id: 'hours', label: t.tabs.hours, icon: Clock },
    { id: 'business', label: t.tabs.business, icon: MapPin },
    { id: 'notifications', label: t.tabs.notifications, icon: Bell },
  ];

  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(
    null
  );
  const [loading, setLoading] = useState(false);
  const [syncStatus, setSyncStatus] = useState<{
    hasAdminKey: boolean;
    hasSupabaseAuthSession?: boolean;
    canWriteToDb?: boolean;
    missingSupabaseEnv?: boolean;
    isLiveSupabase: boolean;
    isServerless: boolean;
  } | null>(null);

  // Tab 1: Hero State
  const [heroData, setHeroData] = useState({
    headline_en: 'Luxury Australian Nail Care',
    headline_vi: 'Chăm Sóc Móng Cao Cấp Tại Sydney',
    subheadline_en: 'Bespoke nail artistry, SNS dipping, and medical-grade hygiene in Sydney CBD.',
    subheadline_vi: 'Nghệ thuật làm móng tinh tế, nhúng bột SNS và chuẩn vệ sinh cao cấp tại Sydney.',
    cta_text_en: 'Book Consultation',
    cta_text_vi: 'Đặt Lịch Tư Vấn',
    cta_link: '/contact',
    image_url: 'https://images.unsplash.com/photo-1632345031435-8727f6897d53?auto=format&fit=crop&w=1600&q=80',
  });
  const [heroPreviewLocale, setHeroPreviewLocale] = useState<'en' | 'vi'>('en');

  // Tab 2: Announcement State
  const [announcementData, setAnnouncementData] = useState({
    is_active: true,
    badge_text: 'PROMO',
    message_en: 'Spring Promotion: 10% off SNS Full Sets this month!',
    message_vi: 'Ưu đãi mùa xuân: Giảm 10% cho trọn bộ móng nhúng SNS tháng này!',
    link_url: '/services',
  });

  // Tab 3: Services State
  const [services, setServices] = useState<any[]>([]);
  const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null);
  const [serviceForm, setServiceForm] = useState({
    name_en: '',
    name_vi: '',
    category: 'Gel Art',
    price_aud: 65,
    duration_minutes: 45,
    description_en: '',
    description_vi: '',
    image_url: '',
    is_featured: false,
    is_active: true,
  });

  // Tab 4: Gallery State
  const [galleryItems, setGalleryItems] = useState<any[]>([]);
  const [isGalleryModalOpen, setIsGalleryModalOpen] = useState(false);
  const [editingGalleryItem, setEditingGalleryItem] = useState<any | null>(null);
  const [galleryForm, setGalleryForm] = useState({
    title_en: '',
    title_vi: '',
    category: 'Ombre',
    image_url: '',
    tags: 'Ombre, Gel Art, Summer',
    is_featured: false,
  });

  const openGalleryModal = (item?: any) => {
    if (item) {
      setEditingGalleryItem(item);
      setGalleryForm({
        title_en: item.title_en || '',
        title_vi: item.title_vi || '',
        category: item.category || item.category_tag || 'Ombre',
        image_url: item.image_url || '',
        tags: Array.isArray(item.tags) ? item.tags.join(', ') : (item.tags || ''),
        is_featured: !!item.is_featured,
      });
    } else {
      setEditingGalleryItem(null);
      setGalleryForm({
        title_en: '',
        title_vi: '',
        category: 'Ombre',
        image_url: '',
        tags: 'Ombre, Gel Art, Summer',
        is_featured: false,
      });
    }
    setIsGalleryModalOpen(true);
  };

  // Tab 5: Hours & Holiday State
  const [hoursData, setHoursData] = useState({
    holiday_notice_active: false,
    holiday_notice_en: 'Closed for Australia Day Long Weekend: Jan 26 - Jan 27',
    holiday_notice_vi: 'Nghỉ Lễ Quốc Khánh Úc: 26/01 - 27/01',
    opening_hours: {
      monday: { open: '09:30', close: '18:30', closed: false },
      tuesday: { open: '09:30', close: '18:30', closed: false },
      wednesday: { open: '09:30', close: '18:30', closed: false },
      thursday: { open: '09:30', close: '20:00', closed: false },
      friday: { open: '09:30', close: '19:00', closed: false },
      saturday: { open: '09:00', close: '18:00', closed: false },
      sunday: { open: '10:00', close: '17:00', closed: false },
    },
  });

  // Tab 6: Business Info State
  const [businessData, setBusinessData] = useState({
    salon_name: 'Glamour Nails & Beauty Lounge Sydney',
    website_title: 'Glamour Nails & Beauty Lounge Sydney',
    website_title_vi: 'Glamour Nails Sydney • Chăm Sóc Móng Cao Cấp',
    website_tagline: 'Sydney CBD • Boutique Lounge',
    website_tagline_vi: 'Sydney CBD • Tiệm Nail Sang Trọng',
    logo_url: '',
    facebook_url: 'https://facebook.com/glamournails.sydney',
    instagram_url: 'https://instagram.com/glamournails.sydney',
    abn: '51 824 753 556',
    phone: '+61 2 9123 4567',
    mobile: '0412 345 678',
    email: 'hello@glamournails.com.au',
    address_street: 'Suite 2, 188 George Street',
    suburb: 'Sydney',
    state: 'NSW',
    postcode: '2000',
    country: 'Australia',
    google_maps_url: 'https://maps.google.com/?q=Suite+2,+188+George+Street,+Sydney+NSW+2000',
    google_maps_embed_url: 'https://maps.google.com/maps?q=188%20George%20Street%2C%20Sydney%20NSW%202000&t=&z=16&ie=UTF8&iwloc=&output=embed',
  });

  // Tab 7: Telegram & Instagram Notifications State
  const [notificationData, setNotificationData] = useState({
    telegram_enabled: false,
    telegram_bot_token: '',
    telegram_chat_id: '',
    telegram_link: '',
    instagram_enabled: false,
    instagram_profile_url: '',
    instagram_webhook_url: '',
  });
  const [testingTelegram, setTestingTelegram] = useState(false);
  const [testingInstagram, setTestingInstagram] = useState(false);
  const [showTelegramToken, setShowTelegramToken] = useState(false);

  // Tab 8: About Story (/about) State
  const [aboutStoryData, setAboutStoryData] = useState({
    badge_en: 'Our Heritage & Values',
    badge_vi: 'Di Sản & Giá Trị Cốt Lõi',
    page_title_en: 'The Glamour Nails Story',
    page_title_vi: 'Câu Chuyện Glamour Nails',
    page_subtitle_en: 'Where Vietnamese precision artistry meets Australian luxury standards.',
    page_subtitle_vi: 'Nơi kỹ thuật điêu luyện của nghệ nhân Việt hòa quyện cùng tiêu chuẩn dịch vụ cao cấp của Úc.',
    story_eyebrow_en: 'Sydney CBD Sanctuary',
    story_eyebrow_vi: 'Không Gian Đẳng Cấp Sydney CBD',
    story_title_en: '8+ Years of Nail Perfection in Sydney CBD',
    story_title_vi: 'Hơn 8 Năm Tinh Hoa Nghệ Thuật Móng Tại Sydney CBD',
    story_p1_en:
      'Founded in 2018 in the vibrant heart of Sydney, Glamour Nails & Spa was born with a single mission: to elevate nail care into an uncompromising ritual of beauty, safety, and wellness.',
    story_p1_vi:
      'Thành lập năm 2018 tại trung tâm sôi động của Sydney, Glamour Nails & Spa ra đời với sứ mệnh: nâng tầm dịch vụ làm móng thành trải nghiệm thư giãn đẳng cấp, an toàn và tinh tế.',
    story_p2_en:
      'Our salon brings together the legendary dexterity and patience of Vietnamese master nail artisans with Australian hospitality and stringent healthcare hygiene protocols.',
    story_p2_vi:
      'Chúng tôi quy tụ đội ngũ chuyên viên gốc Việt tài hoa kết hợp phong cách phục vụ hiếu khách của nước Úc cùng quy chuẩn vệ sinh y tế khắt khe nhất.',
    story_p3_en: '',
    story_p3_vi: '',
    image_url:
      'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=1200&q=80',
    stat1_value_en: '8+ Years',
    stat1_value_vi: '8+ Năm',
    stat1_label_en: 'Sydney CBD Excellence',
    stat1_label_vi: 'Kinh Nghiệm Tại Sydney CBD',
    stat2_value_en: '15,000+',
    stat2_value_vi: '15.000+',
    stat2_label_en: 'Satisfied Clients',
    stat2_label_vi: 'Khách Hàng Hài Lòng',
  });
  const [aboutPreviewLocale, setAboutPreviewLocale] = useState<'vi' | 'en'>('vi');

  const handleEmbedUrlChange = (value: string) => {
    let clean = value.trim();
    const iframeMatch = clean.match(/src=["']([^"']+)["']/i);
    if (iframeMatch) {
      clean = iframeMatch[1];
    }
    setBusinessData((prev) => ({ ...prev, google_maps_embed_url: clean }));
  };

  const handleAutoGenerateMap = () => {
    const fullAddress = `${businessData.address_street}, ${businessData.suburb} ${businessData.state} ${businessData.postcode}, Australia`;
    const embed = `https://maps.google.com/maps?q=${encodeURIComponent(fullAddress)}&t=&z=16&ie=UTF8&iwloc=&output=embed`;
    const direct = `https://maps.google.com/?q=${encodeURIComponent(fullAddress)}`;
    setBusinessData((prev) => ({
      ...prev,
      google_maps_embed_url: embed,
      google_maps_url: prev.google_maps_url || direct,
    }));
    showNotification('success', 'Google Map embed URL auto-generated from address!');
  };

  const showNotification = (type: 'success' | 'error', message: string) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), type === 'error' ? 9000 : 4500);
  };

  // Load Initial Data
  const loadInitialData = async () => {
    try {
      const [heroRes, annRes, servRes, galRes, hoursRes, bizRes, notifRes, aboutRes] = await Promise.all([
        fetch('/api/admin/cms/hero'),
        fetch('/api/admin/cms/announcement'),
        fetch('/api/admin/services'),
        fetch('/api/admin/gallery'),
        fetch('/api/admin/cms/hours'),
        fetch('/api/admin/cms/business-info'),
        fetch('/api/admin/cms/notifications'),
        fetch('/api/admin/cms/about-story'),
      ]);

      if (heroRes.ok) {
        const d = await heroRes.json();
        if (d.hero) setHeroData((prev) => ({ ...prev, ...d.hero }));
      }
      if (annRes.ok) {
        const d = await annRes.json();
        if (d.announcement) setAnnouncementData((prev) => ({ ...prev, ...d.announcement }));
      }
      if (servRes.ok) {
        const d = await servRes.json();
        if (d.services) setServices(d.services);
      }
      if (galRes.ok) {
        const d = await galRes.json();
        if (d.gallery) setGalleryItems(d.gallery);
      }
      if (hoursRes.ok) {
        const d = await hoursRes.json();
        if (d.hours) setHoursData((prev) => ({ ...prev, ...d.hours }));
      }
      if (bizRes.ok) {
        const d = await bizRes.json();
        if (d.businessInfo) setBusinessData((prev) => ({ ...prev, ...d.businessInfo }));
        if (d.syncStatus) setSyncStatus(d.syncStatus);
      }
      if (notifRes.ok) {
        const d = await notifRes.json();
        if (d.notifications) setNotificationData((prev) => ({ ...prev, ...d.notifications }));
      }
      if (aboutRes.ok) {
        const d = await aboutRes.json();
        if (d.story) setAboutStoryData((prev) => ({ ...prev, ...d.story }));
      }
    } catch {}
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  // Save Telegram & Instagram Notifications
  const handleSaveNotifications = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/cms/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(notificationData),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to save notification settings');
      showNotification('success', locale === 'vi' ? 'Đã lưu cấu hình thông báo Telegram & Instagram!' : 'Telegram & Instagram notification settings saved!');
    } catch (err: any) {
      showNotification('error', err.message);
    } finally {
      setLoading(false);
    }
  };

  // Test Telegram Alert
  const handleTestTelegram = async () => {
    setTestingTelegram(true);
    try {
      const res = await fetch('/api/admin/cms/notifications/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channel: 'telegram',
          botToken: notificationData.telegram_bot_token,
          chatId: notificationData.telegram_chat_id,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Telegram test failed');
      showNotification('success', locale === 'vi' ? 'Đã gửi tin nhắn thử nghiệm sang Telegram thành công!' : 'Telegram test alert dispatched successfully!');
    } catch (err: any) {
      showNotification('error', err.message);
    } finally {
      setTestingTelegram(false);
    }
  };

  // Test Instagram Webhook
  const handleTestInstagram = async () => {
    setTestingInstagram(true);
    try {
      const res = await fetch('/api/admin/cms/notifications/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channel: 'instagram',
          webhookUrl: notificationData.instagram_webhook_url,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Instagram webhook test failed');
      showNotification('success', locale === 'vi' ? 'Đã kích hoạt thử nghiệm webhook Instagram thành công!' : 'Instagram webhook test event dispatched successfully!');
    } catch (err: any) {
      showNotification('error', err.message);
    } finally {
      setTestingInstagram(false);
    }
  };

  // Save Hero
  const handleSaveHero = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/cms/hero', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(heroData),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to save hero');
      showNotification('success', 'Hero banner updated and cache revalidated!');
    } catch (err: any) {
      showNotification('error', err.message);
    } finally {
      setLoading(false);
    }
  };

  // Save Announcement
  const handleSaveAnnouncement = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/cms/announcement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(announcementData),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to save announcement');
      showNotification('success', 'Promotional announcement updated and live on site!');
    } catch (err: any) {
      showNotification('error', err.message);
    } finally {
      setLoading(false);
    }
  };

  // Save or Update Service
  const handleSaveService = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const priceCents = Math.round(Number(serviceForm.price_aud) * 100);
      const payload = {
        ...serviceForm,
        price_cents: priceCents,
        price_aud: Number(serviceForm.price_aud),
        duration_minutes: Number(serviceForm.duration_minutes),
      };

      const url = editingServiceId
        ? `/api/admin/services/${editingServiceId}`
        : '/api/admin/services';
      const method = editingServiceId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to save service');

      showNotification(
        'success',
        editingServiceId ? 'Service updated successfully!' : 'New service created!'
      );
      setIsServiceModalOpen(false);
      setEditingServiceId(null);
      loadInitialData();
    } catch (err: any) {
      showNotification('error', err.message);
    } finally {
      setLoading(false);
    }
  };

  // Soft delete service
  const handleDeleteService = async (id: string) => {
    if (!confirm('Are you sure you want to soft-delete this service?')) return;
    try {
      const res = await fetch(`/api/admin/services/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Delete failed');
      showNotification('success', 'Service soft-deleted and removed from public menu.');
      loadInitialData();
    } catch (err: any) {
      showNotification('error', err.message);
    }
  };

  // Save Gallery Item (Create & Update)
  const handleSaveGallery = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const tagsArray = galleryForm.tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);

      const payload = {
        title_en: galleryForm.title_en,
        title_vi: galleryForm.title_vi,
        category: galleryForm.category,
        image_url: galleryForm.image_url,
        tags: tagsArray,
        is_featured: galleryForm.is_featured,
      };

      const url = editingGalleryItem ? `/api/admin/gallery/${editingGalleryItem.id}` : '/api/admin/gallery';
      const method = editingGalleryItem ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to save lookbook set');

      showNotification(
        'success',
        editingGalleryItem
          ? (locale === 'vi' ? 'Đã cập nhật mẫu móng thành công!' : 'Gallery item updated successfully!')
          : (locale === 'vi' ? 'Đã thêm mẫu móng mới thành công!' : 'Nail art set uploaded to lookbook showcase!')
      );
      setIsGalleryModalOpen(false);
      setEditingGalleryItem(null);
      setGalleryForm({
        title_en: '',
        title_vi: '',
        category: 'Ombre',
        image_url: '',
        tags: 'Ombre, Gel Art, Summer',
        is_featured: false,
      });
      loadInitialData();
    } catch (err: any) {
      showNotification('error', err.message);
    } finally {
      setLoading(false);
    }
  };

  // Toggle Gallery Pin
  const handleToggleGalleryFeatured = async (item: any) => {
    try {
      const res = await fetch(`/api/admin/gallery/${item.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_featured: !item.is_featured }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Toggle failed');
      showNotification(
        'success',
        !item.is_featured ? 'Pinned to Featured Lookbook!' : 'Unpinned from Featured Lookbook.'
      );
      loadInitialData();
    } catch (err: any) {
      showNotification('error', err.message);
    }
  };

  // Delete Gallery Item
  const handleDeleteGallery = async (id: string) => {
    if (!confirm('Are you sure you want to delete this gallery item?')) return;
    try {
      const res = await fetch(`/api/admin/gallery/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Delete failed');
      showNotification('success', 'Gallery item deleted.');
      loadInitialData();
    } catch (err: any) {
      showNotification('error', err.message);
    }
  };

  // Save Hours & Holiday
  const handleSaveHours = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/cms/hours', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(hoursData),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to save hours');
      showNotification('success', 'Business schedule & holiday alerts saved!');
    } catch (err: any) {
      showNotification('error', err.message);
    } finally {
      setLoading(false);
    }
  };

  // Save Business Info
  const handleSaveBusinessInfo = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/cms/business-info', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(businessData),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to save business info');
      if (data.businessInfo) {
        setBusinessData((prev) => ({ ...prev, ...data.businessInfo }));
      }
      showNotification(
        'success',
        locale === 'vi'
          ? 'Đã lưu Thông tin tiệm, Thương hiệu, Bản đồ & Liên kết Facebook/Instagram!'
          : 'Salon info, branding, maps & Facebook/Instagram links saved!'
      );
    } catch (err: any) {
      showNotification('error', err.message);
    } finally {
      setLoading(false);
    }
  };

  // Save About Story (/about)
  const handleSaveAboutStory = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/cms/about-story', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(aboutStoryData),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to save About Story');
      }
      if (data.story) {
        setAboutStoryData((prev) => ({ ...prev, ...data.story }));
      }
      showNotification(
        'success',
        locale === 'vi'
          ? 'Đã lưu thông tin Câu Chuyện trang /about và cập nhật trực tiếp lên website!'
          : 'About Story saved and live on /about page!'
      );
    } catch (err: any) {
      showNotification('error', err.message);
    } finally {
      setLoading(false);
    }
  };

  // Reset About Story to Defaults
  const handleResetAboutStory = async () => {
    const confirmed = confirm(
      locale === 'vi'
        ? 'Bạn có chắc muốn khôi phục toàn bộ nội dung Câu Chuyện về mặc định ban đầu?'
        : 'Are you sure you want to restore all About Story fields to defaults?'
    );
    if (!confirmed) return;

    setLoading(true);
    try {
      const res = await fetch('/api/admin/cms/about-story', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reset: true }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to reset About Story');
      }
      if (data.story) {
        setAboutStoryData((prev) => ({ ...prev, ...data.story }));
      }
      showNotification(
        'success',
        locale === 'vi'
          ? 'Đã khôi phục nội dung Câu Chuyện về mặc định!'
          : 'About Story restored to defaults!'
      );
    } catch (err: any) {
      showNotification('error', err.message);
    } finally {
      setLoading(false);
    }
  };

  const isAbnValid = isValidABN(businessData.abn);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-serif font-bold text-white tracking-tight">
            {locale === 'vi' ? 'Quản Trị CMS & Nội Dung Trang Chủ' : 'Homepage CMS & Media Portal'}
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            {locale === 'vi'
              ? 'Hệ thống quản lý nội dung thời gian thực với cơ chế tự động xóa bộ đệm cho giao diện song ngữ Anh - Việt.'
              : 'Real-time content management with automated cache revalidation for public EN & VI showcase.'}
          </p>
        </div>
        <button
          type="button"
          onClick={loadInitialData}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>{locale === 'vi' ? 'Làm Mới Dữ Liệu' : 'Refresh Data'}</span>
        </button>
      </div>

      {/* Supabase Database Sync Diagnostic Banner */}
      {syncStatus && syncStatus.missingSupabaseEnv && (
        <div className="p-4 rounded-xl border bg-red-950/60 border-red-700/80 text-red-100 flex items-start gap-3 text-xs leading-relaxed">
          <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold text-red-200">
              {locale === 'vi'
                ? 'Vercel chưa được cấu hình kết nối Supabase (Thiếu NEXT_PUBLIC_SUPABASE_URL & NEXT_PUBLIC_SUPABASE_ANON_KEY)'
                : 'Vercel is missing Supabase environment variables (NEXT_PUBLIC_SUPABASE_URL & NEXT_PUBLIC_SUPABASE_ANON_KEY)'}
            </p>
            <p className="text-red-100/90">
              {locale === 'vi'
                ? 'Hiện tại website trên Vercel đang chạy ở chế độ dữ liệu mẫu tạm thời nên mọi thay đổi CMS sẽ không lưu được lên cơ sở dữ liệu. Vui lòng vào Vercel → Project Settings → Environment Variables, thêm 2 biến NEXT_PUBLIC_SUPABASE_URL và NEXT_PUBLIC_SUPABASE_ANON_KEY (giống file .env.local), sau đó bấm Redeploy.'
                : 'This Vercel deployment is running in fallback mock mode because Supabase env vars are missing. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in Vercel → Project Settings → Environment Variables, then Redeploy.'}
            </p>
          </div>
        </div>
      )}

      {syncStatus && syncStatus.isLiveSupabase && syncStatus.canWriteToDb === false && (
        <div className="p-4 rounded-xl border bg-amber-950/50 border-amber-700/80 text-amber-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs leading-relaxed">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-semibold text-amber-200">
                {locale === 'vi'
                  ? 'Cần làm mới phiên đăng nhập để đồng bộ trực tiếp lên Supabase DB'
                  : 'Re-login required to enable live Supabase DB sync'}
              </p>
              <p className="text-amber-100/90">
                {locale === 'vi'
                  ? 'Phiên đăng nhập cũ chưa mang token Supabase Auth nên RLS đang chặn quyền ghi. Hãy bấm nút bên cạnh để đăng xuất và đăng nhập lại bằng tài khoản superadmin (không cần cấu hình thêm biến môi trường).'
                  : 'Your current session does not carry a Supabase Auth JWT token yet. Sign out and sign in again with superadmin to enable live Supabase DB & Storage sync automatically.'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={async () => {
              await fetch('/api/auth/logout', { method: 'POST' });
              window.location.href = '/admin/login';
            }}
            className="shrink-0 px-3.5 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs transition-colors cursor-pointer"
          >
            {locale === 'vi' ? 'Đăng xuất & Đăng nhập lại' : 'Sign Out & Re-Login'}
          </button>
        </div>
      )}

      {/* Global Notification */}
      {feedback && (
        <div
          className={`p-4 rounded-xl border flex items-center gap-3 text-sm animate-in fade-in duration-200 ${
            feedback.type === 'success'
              ? 'bg-emerald-950/60 border-emerald-800 text-emerald-200'
              : 'bg-red-950/60 border-red-800 text-red-200'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* 2-Column Vertical CMS Menu Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left: Vertical Section List in CMS */}
        <div className="lg:col-span-3 bg-slate-900 border border-slate-800 rounded-2xl p-3 space-y-1 sticky top-6 shadow-xl">
          <div className="px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-800/80 mb-2 flex items-center justify-between">
            <span>{locale === 'vi' ? 'Quản Trị CMS' : 'CMS Sections'}</span>
            <span className="text-[10px] text-champagne-400 bg-champagne-400/10 px-1.5 py-0.5 rounded font-mono">
              {tabsList.length} {locale === 'vi' ? 'mục' : 'tabs'}
            </span>
          </div>
          {tabsList.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleTabChange(tab.id as any)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium text-left transition-all ${
                  isActive
                    ? 'bg-champagne-400 text-slate-950 font-bold shadow-md shadow-champagne-500/10'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/70'
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-slate-950' : 'text-champagne-400'}`} />
                <span className="truncate">{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Right: Active Tab Editor */}
        <div className="lg:col-span-9 space-y-6">

      {/* TAB 1: HERO BANNER EDITOR */}
      {activeTab === 'hero' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-7 space-y-5 bg-slate-900 border border-slate-800 rounded-2xl p-6">
            <h2 className="text-base font-serif font-bold text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-champagne-400" />
              <span>Hero Banner Content (Bilingual)</span>
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-300">Headline (English)</label>
                <input
                  type="text"
                  value={heroData.headline_en}
                  onChange={(e) => setHeroData({ ...heroData, headline_en: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white focus:border-champagne-400 focus:outline-hidden"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-300">Headline (Tiếng Việt)</label>
                <input
                  type="text"
                  value={heroData.headline_vi}
                  onChange={(e) => setHeroData({ ...heroData, headline_vi: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white focus:border-champagne-400 focus:outline-hidden"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-300">Subheadline (English)</label>
                <textarea
                  rows={3}
                  value={heroData.subheadline_en}
                  onChange={(e) => setHeroData({ ...heroData, subheadline_en: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white focus:border-champagne-400 focus:outline-hidden"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-300">Subheadline (Tiếng Việt)</label>
                <textarea
                  rows={3}
                  value={heroData.subheadline_vi}
                  onChange={(e) => setHeroData({ ...heroData, subheadline_vi: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white focus:border-champagne-400 focus:outline-hidden"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-300">CTA Text (English)</label>
                <input
                  type="text"
                  value={heroData.cta_text_en}
                  onChange={(e) => setHeroData({ ...heroData, cta_text_en: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white focus:border-champagne-400 focus:outline-hidden"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-300">CTA Text (Tiếng Việt)</label>
                <input
                  type="text"
                  value={heroData.cta_text_vi}
                  onChange={(e) => setHeroData({ ...heroData, cta_text_vi: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white focus:border-champagne-400 focus:outline-hidden"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-300">CTA Link Target</label>
                <input
                  type="text"
                  value={heroData.cta_link}
                  onChange={(e) => setHeroData({ ...heroData, cta_link: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white focus:border-champagne-400 focus:outline-hidden"
                />
              </div>
            </div>

            <ImageUploader
              bucket="salon_cms"
              currentImageUrl={heroData.image_url}
              onUploadSuccess={(url) => setHeroData((prev) => ({ ...prev, image_url: url }))}
              label="Hero Showcase Image (Supabase Storage: salon_cms)"
            />

            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-400">
                {locale === 'vi' ? 'Hoặc dán trực tiếp URL ảnh nền Hero:' : 'Or direct Hero Background Image URL:'}
              </label>
              <input
                type="text"
                value={heroData.image_url}
                onChange={(e) => setHeroData((prev) => ({ ...prev, image_url: e.target.value }))}
                placeholder="https://... hoặc /uploads/..."
                className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-white focus:border-champagne-400 focus:outline-hidden"
              />
            </div>

            <button
              type="button"
              disabled={loading}
              onClick={handleSaveHero}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-champagne-400 hover:bg-champagne-300 text-slate-950 text-sm font-semibold transition-all disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{loading ? 'Saving Changes...' : 'Save Hero & Revalidate Live Site'}</span>
            </button>
          </div>

          {/* Real-Time Preview Box */}
          <div className="lg:col-span-5 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                Live Public Preview
              </span>
              <div className="flex items-center gap-1 bg-slate-800 p-0.5 rounded-lg text-xs">
                <button
                  type="button"
                  onClick={() => setHeroPreviewLocale('en')}
                  className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                    heroPreviewLocale === 'en' ? 'bg-champagne-400 text-slate-950' : 'text-slate-300'
                  }`}
                >
                  English
                </button>
                <button
                  type="button"
                  onClick={() => setHeroPreviewLocale('vi')}
                  className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                    heroPreviewLocale === 'vi' ? 'bg-champagne-400 text-slate-950' : 'text-slate-300'
                  }`}
                >
                  Tiếng Việt
                </button>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-white text-slate-900 p-6 space-y-4 shadow-xl overflow-hidden">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-800 text-[10px] font-semibold">
                <Sparkles className="w-3 h-3 text-amber-500" />
                <span>Signature Lounge</span>
              </div>
              <h3 className="font-serif text-2xl font-bold leading-tight text-slate-950">
                {heroPreviewLocale === 'vi'
                  ? heroData.headline_vi || heroData.headline_en
                  : heroData.headline_en}
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                {heroPreviewLocale === 'vi'
                  ? heroData.subheadline_vi || heroData.subheadline_en
                  : heroData.subheadline_en}
              </p>
              <div className="pt-2">
                <span className="inline-block px-4 py-2 rounded-full bg-slate-900 text-white text-xs font-semibold shadow-xs">
                  {heroPreviewLocale === 'vi'
                    ? heroData.cta_text_vi || heroData.cta_text_en
                    : heroData.cta_text_en}
                </span>
              </div>
              {heroData.image_url && (
                <div className="rounded-xl overflow-hidden aspect-video border border-slate-200 mt-4">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={heroData.image_url}
                    alt="Hero Preview"
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: PROMOTIONAL ANNOUNCEMENT MANAGER */}
      {activeTab === 'announcement' && (
        <div className="max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-800">
            <div>
              <h2 className="text-base font-serif font-bold text-white flex items-center gap-2">
                <Megaphone className="w-4 h-4 text-champagne-400" />
                <span>Top Header Announcement Bar</span>
              </h2>
              <p className="text-xs text-slate-400">
                Display emergency closure notices, flash discounts, or seasonal offers.
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={announcementData.is_active}
                onChange={(e) =>
                  setAnnouncementData({ ...announcementData, is_active: e.target.checked })
                }
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-800 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
            </label>
          </div>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-300">Badge Label</label>
              <input
                type="text"
                value={announcementData.badge_text}
                onChange={(e) =>
                  setAnnouncementData({ ...announcementData, badge_text: e.target.value })
                }
                placeholder="PROMO, LIMITED, HOLIDAY"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white focus:border-champagne-400 focus:outline-hidden"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-300">Announcement Message (English)</label>
              <input
                type="text"
                value={announcementData.message_en}
                onChange={(e) =>
                  setAnnouncementData({ ...announcementData, message_en: e.target.value })
                }
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white focus:border-champagne-400 focus:outline-hidden"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-300">Announcement Message (Tiếng Việt)</label>
              <input
                type="text"
                value={announcementData.message_vi}
                onChange={(e) =>
                  setAnnouncementData({ ...announcementData, message_vi: e.target.value })
                }
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white focus:border-champagne-400 focus:outline-hidden"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-300">Target URL</label>
              <input
                type="text"
                value={announcementData.link_url}
                onChange={(e) =>
                  setAnnouncementData({ ...announcementData, link_url: e.target.value })
                }
                placeholder="/services or /contact"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white focus:border-champagne-400 focus:outline-hidden"
              />
            </div>
          </div>

          <button
            type="button"
            disabled={loading}
            onClick={handleSaveAnnouncement}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-champagne-400 hover:bg-champagne-300 text-slate-950 text-sm font-semibold transition-all disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{loading ? 'Saving...' : 'Update Announcement Bar'}</span>
          </button>
        </div>
      )}

      {/* TAB 3: SERVICE MENU MANAGER */}
      {activeTab === 'services' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-400">
              Manage salon services, categories, AUD inclusive pricing (10% GST), and duration.
            </p>
            <button
              type="button"
              onClick={() => {
                setEditingServiceId(null);
                setServiceForm({
                  name_en: '',
                  name_vi: '',
                  category: 'Gel Art',
                  price_aud: 70,
                  duration_minutes: 50,
                  description_en: '',
                  description_vi: '',
                  image_url: '',
                  is_featured: false,
                  is_active: true,
                });
                setIsServiceModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-champagne-400 hover:bg-champagne-300 text-slate-950 text-xs font-semibold shadow-sm transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Add New Service</span>
            </button>
          </div>

          {/* Services Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950/80 text-slate-400 border-b border-slate-800 uppercase font-mono tracking-wider">
                  <tr>
                    <th className="px-4 py-3">{locale === 'vi' ? 'Ảnh' : 'Image'}</th>
                    <th className="px-4 py-3">{locale === 'vi' ? 'Danh Mục' : 'Category'}</th>
                    <th className="px-4 py-3">{locale === 'vi' ? 'Tên Dịch Vụ (EN / VI)' : 'Service Name (EN / VI)'}</th>
                    <th className="px-4 py-3">{locale === 'vi' ? 'Giá AUD (gồm GST)' : 'Price AUD (inc. GST)'}</th>
                    <th className="px-4 py-3">{locale === 'vi' ? 'Thời Lượng' : 'Duration'}</th>
                    <th className="px-4 py-3">{locale === 'vi' ? 'Trạng Thái' : 'Status'}</th>
                    <th className="px-4 py-3 text-right">{locale === 'vi' ? 'Thao Tác' : 'Actions'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {services.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="px-4 py-3">
                        <div className="w-12 h-12 rounded-lg overflow-hidden bg-slate-950 border border-slate-800 shrink-0 flex items-center justify-center">
                          {s.image_url ? (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img
                              src={s.image_url}
                              alt={s.name_en}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <ImageIcon className="w-4 h-4 text-slate-600" />
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-800 text-champagne-300 font-medium">
                          {s.category}
                        </span>
                        {s.is_featured && (
                          <span className="mt-1 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] bg-amber-950/70 text-amber-300 border border-amber-800/60 font-medium">
                            <Star className="w-2.5 h-2.5 fill-amber-400" />
                            {locale === 'vi' ? 'Trang chủ' : 'Featured'}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-semibold text-white text-sm">{s.name_en}</p>
                        {s.name_vi && <p className="text-[11px] text-slate-400">{s.name_vi}</p>}
                      </td>
                      <td className="px-4 py-3 font-mono font-semibold text-white">
                        ${Number(s.price_aud || s.price_cents / 100).toFixed(2)} AUD
                      </td>
                      <td className="px-4 py-3 text-slate-400">{s.duration_minutes} mins</td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                            s.is_active
                              ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                              : 'bg-red-950 text-red-400 border border-red-800'
                          }`}
                        >
                          {s.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right space-x-2">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingServiceId(s.id);
                            setServiceForm({
                              name_en: s.name_en,
                              name_vi: s.name_vi || '',
                              category: s.category,
                              price_aud: s.price_aud || s.price_cents / 100,
                              duration_minutes: s.duration_minutes,
                              description_en: s.description_en || '',
                              description_vi: s.description_vi || '',
                              image_url: s.image_url || '',
                              is_featured: !!s.is_featured,
                              is_active: s.is_active,
                            });
                            setIsServiceModalOpen(true);
                          }}
                          className="p-1.5 rounded hover:bg-slate-800 text-slate-300 hover:text-white"
                          title="Edit Service"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteService(s.id)}
                          className="p-1.5 rounded hover:bg-red-950/60 text-red-400 hover:text-red-300"
                          title="Soft Delete Service"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Service Add/Edit Modal */}
          {isServiceModalOpen && (
            <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto space-y-4 shadow-2xl">
                <h3 className="text-lg font-serif font-bold text-white">
                  {editingServiceId ? 'Edit Salon Service' : 'Add New Service'}
                </h3>
                <form onSubmit={handleSaveService} className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs text-slate-300">Name (English)</label>
                      <input
                        type="text"
                        required
                        value={serviceForm.name_en}
                        onChange={(e) =>
                          setServiceForm({ ...serviceForm, name_en: e.target.value })
                        }
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-slate-300">Name (Tiếng Việt)</label>
                      <input
                        type="text"
                        value={serviceForm.name_vi}
                        onChange={(e) =>
                          setServiceForm({ ...serviceForm, name_vi: e.target.value })
                        }
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs text-slate-300">Category</label>
                      <select
                        value={serviceForm.category}
                        onChange={(e) =>
                          setServiceForm({ ...serviceForm, category: e.target.value })
                        }
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white"
                      >
                        <option value="Manicure">Manicure</option>
                        <option value="Pedicure">Pedicure</option>
                        <option value="SNS & Dipping">SNS &amp; Dipping</option>
                        <option value="SNS Dipping">SNS Dipping</option>
                        <option value="Acrylic & Extensions">Acrylic &amp; Extensions</option>
                        <option value="Acrylic">Acrylic</option>
                        <option value="Gel Art & Design">Gel Art &amp; Design</option>
                        <option value="Gel Art">Gel Art</option>
                        <option value="Spa Packages">Spa Packages</option>
                        <option value="Spa Package">Spa Package</option>
                        {![
                          'Manicure',
                          'Pedicure',
                          'SNS & Dipping',
                          'SNS Dipping',
                          'Acrylic & Extensions',
                          'Acrylic',
                          'Gel Art & Design',
                          'Gel Art',
                          'Spa Packages',
                          'Spa Package',
                        ].includes(serviceForm.category) && serviceForm.category && (
                          <option value={serviceForm.category}>{serviceForm.category}</option>
                        )}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs text-slate-300">Price AUD ($)</label>
                      <input
                        type="number"
                        step="0.5"
                        min="0"
                        required
                        value={serviceForm.price_aud}
                        onChange={(e) =>
                          setServiceForm((prev) => ({ ...prev, price_aud: Number(e.target.value) }))
                        }
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white font-mono"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs text-slate-300">Duration (Mins)</label>
                      <input
                        type="number"
                        min="5"
                        required
                        value={serviceForm.duration_minutes}
                        onChange={(e) =>
                          setServiceForm((prev) => ({
                            ...prev,
                            duration_minutes: Number(e.target.value),
                          }))
                        }
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs text-slate-300">
                        {locale === 'vi' ? 'Mô tả (Tiếng Anh)' : 'Description (English)'}
                      </label>
                      <textarea
                        rows={2}
                        value={serviceForm.description_en}
                        onChange={(e) =>
                          setServiceForm((prev) => ({ ...prev, description_en: e.target.value }))
                        }
                        placeholder="Short service description in English..."
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-slate-300">
                        {locale === 'vi' ? 'Mô tả (Tiếng Việt)' : 'Description (Tiếng Việt)'}
                      </label>
                      <textarea
                        rows={2}
                        value={serviceForm.description_vi}
                        onChange={(e) =>
                          setServiceForm((prev) => ({ ...prev, description_vi: e.target.value }))
                        }
                        placeholder="Mô tả ngắn gọn hiển thị trên Trang Chủ & Bảng Giá..."
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white"
                      />
                    </div>
                  </div>

                  <ImageUploader
                    bucket="services"
                    currentImageUrl={serviceForm.image_url}
                    onUploadSuccess={(url) => setServiceForm((prev) => ({ ...prev, image_url: url }))}
                    label="Service Showcase Image (services bucket)"
                  />

                  <div className="space-y-1">
                    <label className="text-xs text-slate-400">
                      {locale === 'vi' ? 'Hoặc dán trực tiếp URL ảnh dịch vụ:' : 'Or direct Service Image URL:'}
                    </label>
                    <input
                      type="text"
                      value={serviceForm.image_url}
                      onChange={(e) =>
                        setServiceForm((prev) => ({ ...prev, image_url: e.target.value }))
                      }
                      placeholder="https://... hoặc /uploads/..."
                      className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-white"
                    />
                  </div>

                  <div className="flex items-center gap-4 pt-2">
                    <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={serviceForm.is_featured}
                        onChange={(e) =>
                          setServiceForm((prev) => ({ ...prev, is_featured: e.target.checked }))
                        }
                        className="rounded bg-slate-950 border-slate-800 text-champagne-400"
                      />
                      <span>
                        {locale === 'vi'
                          ? 'Ghim lên Trang Chủ (Nghệ Thuật Làm Móng Tràn Viền & Dịch Vụ Tiêu Biểu)'
                          : 'Pin to Homepage (Artistry Showcase & Featured Services)'}
                      </span>
                    </label>
                  </div>

                  <div className="flex justify-end gap-2 pt-4 border-t border-slate-800">
                    <button
                      type="button"
                      onClick={() => setIsServiceModalOpen(false)}
                      className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="px-5 py-2 rounded-lg bg-champagne-400 hover:bg-champagne-300 text-slate-950 text-xs font-semibold"
                    >
                      {loading ? 'Saving...' : 'Save Service'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: GALLERY ASSET MANAGER */}
      {activeTab === 'gallery' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-400">
              {locale === 'vi'
                ? 'Quản lý bộ sưu tập mẫu móng lookbook, gắn thẻ danh mục và ghim mẫu nổi bật lên trang chủ.'
                : 'Manage nail art lookbook showcase sets, category filters, and featured pins.'}
            </p>
            <button
              type="button"
              onClick={() => openGalleryModal()}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-champagne-400 hover:bg-champagne-300 text-slate-950 text-xs font-semibold shadow-sm transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>{locale === 'vi' ? 'Thêm Mẫu Móng Mới' : 'Upload New Lookbook Set'}</span>
            </button>
          </div>

          {/* Gallery Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {galleryItems.map((item) => (
              <div
                key={item.id}
                className="group relative rounded-xl overflow-hidden bg-slate-900 border border-slate-800 flex flex-col shadow-sm"
              >
                <div className="relative aspect-square overflow-hidden bg-slate-950">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.image_url}
                    alt={item.title_en}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <button
                    type="button"
                    onClick={() => handleToggleGalleryFeatured(item)}
                    className={`absolute top-2 right-2 p-1.5 rounded-full shadow-md transition-colors ${
                      item.is_featured
                        ? 'bg-amber-400 text-slate-950'
                        : 'bg-slate-900/80 text-slate-400 hover:text-white'
                    }`}
                    title={item.is_featured ? 'Pinned to Featured' : 'Pin to Featured'}
                  >
                    <Star className="w-4 h-4 fill-current" />
                  </button>
                </div>
                <div className="p-3 flex-1 flex flex-col justify-between space-y-2">
                  <div>
                    <span className="text-[10px] font-semibold text-champagne-400 uppercase tracking-wider">
                      {item.category || item.category_tag}
                    </span>
                    <h4 className="text-xs font-semibold text-white truncate mt-0.5">
                      {locale === 'vi' && item.title_vi ? item.title_vi : item.title_en}
                    </h4>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                    <span className="text-[10px] text-slate-400">
                      {item.is_featured ? '★ Featured' : 'Standard'}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => openGalleryModal(item)}
                        className="p-1 rounded text-slate-400 hover:text-white transition-colors"
                        title={locale === 'vi' ? 'Chỉnh sửa mẫu móng' : 'Edit gallery item'}
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteGallery(item.id)}
                        className="p-1 rounded text-red-400 hover:text-red-300 transition-colors"
                        title={locale === 'vi' ? 'Xóa mẫu móng' : 'Delete gallery item'}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Gallery Upload / Edit Modal */}
          {isGalleryModalOpen && (
            <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto space-y-4 shadow-2xl">
                <h3 className="text-lg font-serif font-bold text-white">
                  {editingGalleryItem
                    ? (locale === 'vi' ? 'Chỉnh Sửa Mẫu Móng' : 'Edit Lookbook Set')
                    : (locale === 'vi' ? 'Thêm Mẫu Móng Mới' : 'Upload Lookbook Set')}
                </h3>
                <form onSubmit={handleSaveGallery} className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-xs text-slate-300">
                      {locale === 'vi' ? 'Tiêu Đề (Tiếng Anh) *' : 'Title (English) *'}
                    </label>
                    <input
                      type="text"
                      required
                      value={galleryForm.title_en}
                      onChange={(e) =>
                        setGalleryForm({ ...galleryForm, title_en: e.target.value })
                      }
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs text-slate-300">
                      {locale === 'vi' ? 'Tiêu Đề (Tiếng Việt)' : 'Title (Tiếng Việt)'}
                    </label>
                    <input
                      type="text"
                      value={galleryForm.title_vi}
                      onChange={(e) =>
                        setGalleryForm({ ...galleryForm, title_vi: e.target.value })
                      }
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs text-slate-300">
                      {locale === 'vi' ? 'Danh Mục Mẫu Móng' : 'Category Tag'}
                    </label>
                    <select
                      value={galleryForm.category}
                      onChange={(e) =>
                        setGalleryForm({ ...galleryForm, category: e.target.value })
                      }
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white"
                    >
                      <option value="Ombre">Ombre</option>
                      <option value="Chrome">Chrome</option>
                      <option value="3D Art">3D Art</option>
                      <option value="SNS Dipping">SNS Dipping</option>
                      <option value="Gel Art">Gel Art</option>
                      <option value="Acrylic">Acrylic</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs text-slate-300">
                      {locale === 'vi' ? 'Thẻ Tags (cách nhau bởi dấu phẩy)' : 'Tags (comma separated)'}
                    </label>
                    <input
                      type="text"
                      value={galleryForm.tags}
                      onChange={(e) => setGalleryForm({ ...galleryForm, tags: e.target.value })}
                      placeholder="Bridal, French, Glazed, Almond"
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white"
                    />
                  </div>

                  <ImageUploader
                    bucket="gallery"
                    currentImageUrl={galleryForm.image_url}
                    onUploadSuccess={(url) => setGalleryForm((prev) => ({ ...prev, image_url: url }))}
                    label={locale === 'vi' ? 'Ảnh Mẫu Móng (gallery bucket - tối đa 8MB)' : 'Nail Set Photo (gallery bucket - up to 8MB)'}
                  />

                  <div className="space-y-1">
                    <label className="text-xs text-slate-400">
                      {locale === 'vi'
                        ? 'Hoặc dán trực tiếp URL hình ảnh mẫu móng:'
                        : 'Or paste a direct Nail Art Image URL:'}
                    </label>
                    <input
                      type="text"
                      value={galleryForm.image_url}
                      onChange={(e) =>
                        setGalleryForm((prev) => ({ ...prev, image_url: e.target.value }))
                      }
                      placeholder="https://... hoặc /uploads/..."
                      className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-white focus:border-champagne-400 focus:outline-hidden"
                    />
                  </div>

                  <div className="flex items-center gap-2 pt-2">
                    <input
                      type="checkbox"
                      id="feat_check"
                      checked={galleryForm.is_featured}
                      onChange={(e) =>
                        setGalleryForm({ ...galleryForm, is_featured: e.target.checked })
                      }
                      className="rounded bg-slate-950 border-slate-800 text-champagne-400"
                    />
                    <label htmlFor="feat_check" className="text-xs text-slate-300 cursor-pointer">
                      {locale === 'vi' ? 'Ghim lên Slide Mẫu Móng Nổi Bật Trang Chủ' : 'Pin to Homepage Featured Lookbook Slider'}
                    </label>
                  </div>

                  <div className="flex justify-end gap-2 pt-4 border-t border-slate-800">
                    <button
                      type="button"
                      onClick={() => setIsGalleryModalOpen(false)}
                      className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium"
                    >
                      {locale === 'vi' ? 'Hủy' : 'Cancel'}
                    </button>
                    <button
                      type="submit"
                      disabled={loading || !galleryForm.image_url}
                      className="px-5 py-2 rounded-lg bg-champagne-400 hover:bg-champagne-300 text-slate-950 text-xs font-semibold disabled:opacity-50"
                    >
                      {loading
                        ? (locale === 'vi' ? 'Đang lưu...' : 'Saving...')
                        : editingGalleryItem
                        ? (locale === 'vi' ? 'Lưu Thay Đổi' : 'Save Changes')
                        : (locale === 'vi' ? 'Tải Lên Mẫu Móng' : 'Save Asset')}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 5: BUSINESS HOURS & EMERGENCY HOLIDAY NOTICES */}
      {activeTab === 'hours' && (
        <div className="max-w-3xl space-y-6">
          {/* Emergency Holiday Notice Section */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div>
                <h3 className="text-base font-serif font-bold text-white flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-400" />
                  <span>Emergency & Public Holiday Closure Alerts</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Activates emergency closure badge and displays public banner across Sydney site.
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={hoursData.holiday_notice_active}
                  onChange={(e) =>
                    setHoursData({ ...hoursData, holiday_notice_active: e.target.checked })
                  }
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-800 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-300">Holiday Notice (English)</label>
                <input
                  type="text"
                  value={hoursData.holiday_notice_en}
                  onChange={(e) =>
                    setHoursData({ ...hoursData, holiday_notice_en: e.target.value })
                  }
                  placeholder="Closed for Australia Day Long Weekend: Jan 26 - Jan 27"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white focus:border-champagne-400 focus:outline-hidden"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-300">Holiday Notice (Tiếng Việt)</label>
                <input
                  type="text"
                  value={hoursData.holiday_notice_vi}
                  onChange={(e) =>
                    setHoursData({ ...hoursData, holiday_notice_vi: e.target.value })
                  }
                  placeholder="Nghỉ Lễ Quốc Khánh Úc: 26/01 - 27/01"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white focus:border-champagne-400 focus:outline-hidden"
                />
              </div>
            </div>
          </div>

          <button
            type="button"
            disabled={loading}
            onClick={handleSaveHours}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-champagne-400 hover:bg-champagne-300 text-slate-950 text-sm font-semibold transition-all disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{loading ? 'Saving...' : 'Save Schedule & Holiday Notices'}</span>
          </button>
        </div>
      )}

      {/* TAB 6: BRANDING, TITLE, LOGO & LOCATION SETTINGS */}
      {activeTab === 'business' && (
        <div className="space-y-6">
          {/* Card 1: Website Title, Tagline & Logo Branding */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div>
                <h2 className="text-base font-serif font-bold text-white flex items-center gap-2">
                  <Gem className="w-4 h-4 text-champagne-400" />
                  <span>{t.branding?.heading || 'Website Title, Tagline & Logo Branding'}</span>
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  {t.branding?.subheading ||
                    'Customize website title, tagline and brand logo displayed in Header, Footer and Browser Tab.'}
                </p>
              </div>
              <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs bg-amber-950/60 text-amber-300 border border-amber-800 font-mono">
                <Sparkles className="w-3.5 h-3.5" />
                Live Branding
              </span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left Column: Website Titles & Taglines */}
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-300 flex items-center justify-between">
                    <span>{t.branding?.titleLabelEn || 'Website Title (English)'}</span>
                    <span className="text-[10px] text-slate-500 font-mono">Hiển thị trên /en</span>
                  </label>
                  <input
                    type="text"
                    value={businessData.website_title}
                    onChange={(e) => setBusinessData((prev) => ({ ...prev, website_title: e.target.value }))}
                    placeholder={t.branding?.titlePlaceholderEn || 'Glamour Nails & Beauty Lounge Sydney'}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white focus:border-champagne-400"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-300 flex items-center justify-between gap-2">
                    <span>{t.branding?.titleLabelVi || 'Website Title (Tiếng Việt)'}</span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setBusinessData((prev) => ({
                            ...prev,
                            website_title_vi: prev.website_title || prev.salon_name,
                          }))
                        }
                        className="text-[10px] text-champagne-400 hover:text-champagne-300 underline cursor-pointer"
                      >
                        {locale === 'vi' ? 'Chép từ bản EN' : 'Copy from EN'}
                      </button>
                      <span className="text-[10px] text-amber-400 font-mono">Hiển thị trên /vi</span>
                    </div>
                  </label>
                  <input
                    type="text"
                    value={businessData.website_title_vi}
                    onChange={(e) => setBusinessData((prev) => ({ ...prev, website_title_vi: e.target.value }))}
                    placeholder={t.branding?.titlePlaceholderVi || 'Glamour Nails Sydney • Chăm Sóc Móng Cao Cấp'}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white focus:border-champagne-400"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-300 flex items-center justify-between">
                    <span>{t.branding?.taglineLabelEn || 'Brand Tagline / Slogan (English)'}</span>
                    <span className="text-[10px] text-slate-500 font-mono">EN Subtitle</span>
                  </label>
                  <input
                    type="text"
                    value={businessData.website_tagline}
                    onChange={(e) => setBusinessData({ ...businessData, website_tagline: e.target.value })}
                    placeholder={t.branding?.taglinePlaceholderEn || 'Sydney CBD • Boutique Lounge'}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white focus:border-champagne-400"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-300 flex items-center justify-between">
                    <span>{t.branding?.taglineLabelVi || 'Brand Tagline / Slogan (Tiếng Việt)'}</span>
                    <span className="text-[10px] text-slate-500 font-mono">VI Subtitle</span>
                  </label>
                  <input
                    type="text"
                    value={businessData.website_tagline_vi}
                    onChange={(e) => setBusinessData({ ...businessData, website_tagline_vi: e.target.value })}
                    placeholder={t.branding?.taglinePlaceholderVi || 'Sydney CBD • Tiệm Nail Sang Trọng'}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white focus:border-champagne-400"
                  />
                </div>
              </div>

              {/* Right Column: Logo Upload & Live Previews */}
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-300">
                    {t.branding?.logoLabel || 'Website Logo Image (PNG, SVG, WebP)'}
                  </label>
                  <ImageUploader
                    bucket="salon_cms"
                    currentImageUrl={businessData.logo_url}
                    onUploadSuccess={(url) => setBusinessData((prev) => ({ ...prev, logo_url: url }))}
                    label={t.branding?.logoUploadBtn || 'Tải Lên Logo Mới'}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-400">
                    {locale === 'vi' ? 'Hoặc dán trực tiếp đường dẫn URL của Logo:' : 'Or direct Logo Image URL:'}
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={businessData.logo_url}
                      onChange={(e) => setBusinessData({ ...businessData, logo_url: e.target.value })}
                      placeholder="https://.../logo.png"
                      className="flex-1 px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-white"
                    />
                    {businessData.logo_url && (
                      <button
                        type="button"
                        onClick={() => setBusinessData({ ...businessData, logo_url: '' })}
                        className="px-2.5 py-1.5 rounded-lg text-xs text-red-400 hover:bg-red-950/40 border border-red-900/40"
                        title={t.branding?.removeLogoBtn || 'Use Default Gemstone Icon'}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Live Logo Preview Box */}
                <div className="space-y-2 pt-2">
                  <label className="text-xs font-medium text-slate-300 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span>{t.branding?.previewHeading || 'Live Logo & Title Preview'}</span>
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Header Preview (Light Background) */}
                    <div className="p-3 rounded-xl bg-white border border-gray-200 shadow-sm flex items-center gap-2.5">
                      {businessData.logo_url ? (
                        <img
                          src={businessData.logo_url}
                          alt="Logo Preview"
                          className="h-9 w-auto max-w-[80px] object-contain rounded"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-salon-900 to-salon-950 text-champagne-300 flex items-center justify-center shrink-0">
                          <Gem className="w-4 h-4 text-champagne-300" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <span className="font-serif text-xs font-bold text-gray-900 truncate block">
                          {locale === 'vi' ? businessData.website_title_vi : businessData.website_title}
                        </span>
                        <span className="text-[9px] text-gray-500 uppercase tracking-wider truncate block">
                          {locale === 'vi' ? businessData.website_tagline_vi : businessData.website_tagline}
                        </span>
                      </div>
                    </div>

                    {/* Footer Preview (Dark Background) */}
                    <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 shadow-sm flex items-center gap-2.5">
                      {businessData.logo_url ? (
                        <img
                          src={businessData.logo_url}
                          alt="Logo Preview"
                          className="h-9 w-auto max-w-[80px] object-contain rounded brightness-0 invert opacity-90"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-xl bg-slate-800 text-champagne-300 flex items-center justify-center shrink-0">
                          <Gem className="w-4 h-4 text-champagne-300" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <span className="font-serif text-xs font-bold text-white truncate block">
                          {locale === 'vi' ? businessData.website_title_vi : businessData.website_title}
                        </span>
                        <span className="text-[9px] text-champagne-400 uppercase tracking-wider truncate block">
                          {locale === 'vi' ? businessData.website_tagline_vi : businessData.website_tagline}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Card 1B: Social Media Profile Links (Facebook & Instagram) */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-5 shadow-lg">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
              <div>
                <h2 className="text-base font-serif font-bold text-white flex items-center gap-2">
                  <Share2 className="w-4 h-4 text-champagne-400" />
                  <span>
                    {locale === 'vi'
                      ? 'Liên Kết Trang Cá Nhân Facebook & Instagram'
                      : 'Facebook & Instagram Profile Links'}
                  </span>
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  {locale === 'vi'
                    ? 'Cấu hình đường dẫn đến trang cá nhân / Fanpage Facebook và tài khoản Instagram. Tự động hiển thị đồng bộ trên thanh Header, nút nổi toàn trang, Footer và dữ liệu chuẩn SEO (JSON-LD).'
                    : 'Configure your personal profile or salon page URLs for Facebook & Instagram. Syncs instantly to the Header, Floating Social Dock, Footer, Mobile Menu, and SEO JSON-LD sameAs.'}
                </p>
              </div>
              <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] bg-sky-950/60 text-sky-300 border border-sky-800 font-mono shrink-0">
                <Sparkles className="w-3.5 h-3.5" />
                SEO &amp; Social Sync
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Facebook Profile URL */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800/90 space-y-2.5">
                <label className="text-xs font-semibold text-white flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-[#1877F2] text-white inline-flex items-center justify-center shadow-sm">
                    <FacebookSvg className="w-3.5 h-3.5" />
                  </span>
                  <span>
                    {locale === 'vi'
                      ? 'Liên kết trang cá nhân / Fanpage Facebook'
                      : 'Facebook Profile / Page URL'}
                  </span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={businessData.facebook_url}
                    onChange={(e) =>
                      setBusinessData({ ...businessData, facebook_url: e.target.value })
                    }
                    placeholder="https://facebook.com/ten-trang-ca-nhan"
                    className="flex-1 px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs font-mono text-white placeholder:text-slate-600 focus:border-[#1877F2] focus:outline-hidden"
                  />
                  {businessData.facebook_url && (
                    <a
                      href={
                        /^https?:\/\//i.test(businessData.facebook_url)
                          ? businessData.facebook_url
                          : `https://${businessData.facebook_url}`
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      title={locale === 'vi' ? 'Mở thử liên kết Facebook' : 'Open Facebook link'}
                      className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-[#1877F2] text-slate-200 hover:text-white text-xs inline-flex items-center justify-center transition-colors shrink-0"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>
                <p className="text-[11px] text-slate-500">
                  {locale === 'vi'
                    ? 'Ví dụ: https://facebook.com/glamournails.sydney (để trống nếu muốn ẩn icon Facebook).'
                    : 'e.g. https://facebook.com/glamournails.sydney (leave blank to hide icon).'}
                </p>
              </div>

              {/* Instagram Profile URL */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800/90 space-y-2.5">
                <label className="text-xs font-semibold text-white flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-gradient-to-tr from-[#F58529] via-[#DD2A7B] to-[#8134AF] text-white inline-flex items-center justify-center shadow-sm">
                    <InstagramSvg className="w-3.5 h-3.5" />
                  </span>
                  <span>
                    {locale === 'vi'
                      ? 'Liên kết trang cá nhân Instagram'
                      : 'Instagram Profile URL'}
                  </span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={businessData.instagram_url}
                    onChange={(e) =>
                      setBusinessData({ ...businessData, instagram_url: e.target.value })
                    }
                    placeholder="https://instagram.com/ten-tai-khoan"
                    className="flex-1 px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs font-mono text-white placeholder:text-slate-600 focus:border-[#DD2A7B] focus:outline-hidden"
                  />
                  {businessData.instagram_url && (
                    <a
                      href={
                        /^https?:\/\//i.test(businessData.instagram_url)
                          ? businessData.instagram_url
                          : `https://${businessData.instagram_url}`
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      title={locale === 'vi' ? 'Mở thử liên kết Instagram' : 'Open Instagram link'}
                      className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-[#DD2A7B] text-slate-200 hover:text-white text-xs inline-flex items-center justify-center transition-colors shrink-0"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>
                <p className="text-[11px] text-slate-500">
                  {locale === 'vi'
                    ? 'Ví dụ: https://instagram.com/glamournails.sydney (để trống nếu muốn ẩn icon Instagram).'
                    : 'e.g. https://instagram.com/glamournails.sydney (leave blank to hide icon).'}
                </p>
              </div>
            </div>

            {/* Live Animated Icons Preview + Quick Save */}
            <div className="p-4 rounded-xl bg-slate-950/90 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1.5">
                <span className="text-[11px] font-medium text-slate-400 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>
                    {locale === 'vi'
                      ? 'Xem trước hiệu ứng icon Facebook & Instagram trên website:'
                      : 'Live Preview of Animated Facebook & Instagram Icons:'}
                  </span>
                </span>
                <div className="flex flex-wrap items-center gap-4 pt-1">
                  <SocialIconLinks
                    facebookUrl={businessData.facebook_url}
                    instagramUrl={businessData.instagram_url}
                    locale={locale}
                    variant="header"
                    brandName={businessData.salon_name}
                  />
                  <SocialIconLinks
                    facebookUrl={businessData.facebook_url}
                    instagramUrl={businessData.instagram_url}
                    locale={locale}
                    variant="footer"
                    brandName={businessData.salon_name}
                  />
                </div>
              </div>

              <button
                type="button"
                disabled={loading}
                onClick={handleSaveBusinessInfo}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-champagne-400 hover:bg-champagne-300 text-slate-950 text-xs font-semibold transition-all disabled:opacity-50 shrink-0"
              >
                <Save className="w-3.5 h-3.5" />
                <span>
                  {loading
                    ? locale === 'vi'
                      ? 'Đang Lưu...'
                      : 'Saving...'
                    : locale === 'vi'
                    ? 'Lưu Liên Kết MXH'
                    : 'Save Social Links'}
                </span>
              </button>
            </div>
          </div>

          {/* Card 2: Contact, Address & Location Settings */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-5">
            <h2 className="text-base font-serif font-bold text-white flex items-center gap-2">
              <MapPin className="w-4 h-4 text-champagne-400" />
              <span>Salon Details & Australian Taxation Identity</span>
            </h2>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-300">Registered Business Name</label>
              <input
                type="text"
                value={businessData.salon_name}
                onChange={(e) => setBusinessData({ ...businessData, salon_name: e.target.value })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-slate-300">
                  Australian Business Number (ABN)
                </label>
                <span
                  className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded ${
                    isAbnValid
                      ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                      : 'bg-red-950 text-red-400 border border-red-800'
                  }`}
                >
                  {isAbnValid ? 'Valid ATO Modulo-89' : 'Invalid ABN Checksum'}
                </span>
              </div>
              <input
                type="text"
                value={businessData.abn}
                onChange={(e) => setBusinessData({ ...businessData, abn: e.target.value })}
                placeholder="51 824 753 556"
                className={`w-full px-3 py-2 bg-slate-950 border rounded-lg text-sm font-mono text-white ${
                  isAbnValid ? 'border-slate-800' : 'border-red-600'
                }`}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-300">Landline Phone</label>
                <input
                  type="text"
                  value={businessData.phone}
                  onChange={(e) => setBusinessData({ ...businessData, phone: e.target.value })}
                  placeholder="+61 2 9123 4567"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white font-mono"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-300">Mobile Phone</label>
                <input
                  type="text"
                  value={businessData.mobile}
                  onChange={(e) => setBusinessData({ ...businessData, mobile: e.target.value })}
                  placeholder="0412 345 678"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white font-mono"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-300">Public Contact Email</label>
              <input
                type="email"
                value={businessData.email}
                onChange={(e) => setBusinessData({ ...businessData, email: e.target.value })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-300">Street Address</label>
              <input
                type="text"
                value={businessData.address_street}
                onChange={(e) =>
                  setBusinessData({ ...businessData, address_street: e.target.value })
                }
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white"
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-300">Suburb</label>
                <input
                  type="text"
                  value={businessData.suburb}
                  onChange={(e) => setBusinessData({ ...businessData, suburb: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-300">State</label>
                <select
                  value={businessData.state}
                  onChange={(e) => setBusinessData({ ...businessData, state: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white"
                >
                  <option value="NSW">NSW</option>
                  <option value="VIC">VIC</option>
                  <option value="QLD">QLD</option>
                  <option value="WA">WA</option>
                  <option value="SA">SA</option>
                  <option value="TAS">TAS</option>
                  <option value="ACT">ACT</option>
                  <option value="NT">NT</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-300">Postcode</label>
                <input
                  type="text"
                  value={businessData.postcode}
                  onChange={(e) => setBusinessData({ ...businessData, postcode: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white font-mono"
                />
              </div>
            </div>

            {/* Google Maps Integration Section */}
            <div className="pt-6 border-t border-slate-800 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-champagne-400" />
                    <span>Google Maps Integration & Location Pin</span>
                  </h4>
                  <p className="text-xs text-slate-400">
                    Assign and customize the Google Maps location for the public website and About Us page.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleAutoGenerateMap}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-champagne-300 text-xs font-semibold border border-slate-700 transition-colors shrink-0"
                >
                  <Navigation className="w-3.5 h-3.5" />
                  <span>Auto-Generate from Address</span>
                </button>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-slate-300">
                    Google Maps Direct Link (for Directions & Navigation)
                  </label>
                  {businessData.google_maps_url && (
                    <a
                      href={businessData.google_maps_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-champagne-400 hover:underline inline-flex items-center gap-1"
                    >
                      <span>Open in Google Maps</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
                <input
                  type="text"
                  value={businessData.google_maps_url}
                  onChange={(e) =>
                    setBusinessData({ ...businessData, google_maps_url: e.target.value })
                  }
                  placeholder="https://maps.google.com/?q=..."
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-300">
                  Google Maps Embed URL or iframe code
                </label>
                <textarea
                  rows={2}
                  value={businessData.google_maps_embed_url}
                  onChange={(e) => handleEmbedUrlChange(e.target.value)}
                  placeholder="https://maps.google.com/maps?q=... or paste <iframe src='...'></iframe>"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white font-mono"
                />
                <p className="text-[11px] text-slate-500">
                  Tip: In Google Maps, click Share → Embed a map, then copy the link or paste the full iframe snippet here.
                </p>
              </div>

              {/* Live Map Preview Box */}
              {businessData.google_maps_embed_url && (
                <div className="space-y-2 pt-2">
                  <label className="text-xs font-medium text-slate-300 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span>Live Interactive Map Preview</span>
                  </label>
                  <div className="w-full h-64 rounded-xl overflow-hidden border border-slate-800 bg-slate-950 shadow-inner">
                    <iframe
                      src={businessData.google_maps_embed_url}
                      width="100%"
                      height="100%"
                      style={{ border: 0 }}
                      allowFullScreen={false}
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                      title="Google Maps Location Preview"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
          </div>

          <button
            type="button"
            disabled={loading}
            onClick={handleSaveBusinessInfo}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-champagne-400 hover:bg-champagne-300 text-slate-950 text-sm font-semibold transition-all disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>
              {loading
                ? (locale === 'vi' ? 'Đang Lưu...' : 'Saving...')
                : (locale === 'vi' ? 'Lưu Thông Tin Tiệm, Tiêu Đề & Logo' : 'Save Location, Title & Logo Branding')}
            </span>
          </button>
        </div>
      )}

      {/* TAB 7: TELEGRAM & INSTAGRAM NOTIFICATIONS */}
      {activeTab === 'notifications' && (
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div>
                <h3 className="text-base font-semibold text-white flex items-center gap-2">
                  <Bell className="w-4 h-4 text-champagne-400" />
                  {t.notifications.heading}
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  {t.notifications.subheading}
                </p>
              </div>
              <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs bg-sky-950/60 text-sky-400 border border-sky-800 font-mono">
                <Send className="w-3.5 h-3.5" />
                Webhook & Bot Engine
              </span>
            </div>

            {/* Explanatory Banner */}
            <div className="mt-4 p-4 rounded-lg bg-slate-950/60 border border-slate-800 text-xs text-slate-300 space-y-1">
              <p className="font-semibold text-champagne-300 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                {locale === 'vi'
                  ? 'Quy trình hoạt động tự động 24/7:'
                  : 'Automated 24/7 Dispatch Workflow:'}
              </p>
              <p className="text-slate-400 leading-relaxed">
                {locale === 'vi'
                  ? 'Khi khách hàng gửi yêu cầu tư vấn hoặc đặt lịch hẹn trên website (qua biểu mẫu liên hệ trực tuyến), hệ thống sẽ ngay lập tức định dạng thông tin và gửi đồng thời thông báo tới Telegram Bot cá nhân/nhóm nhân viên và Webhook Instagram của tiệm.'
                  : 'Whenever a client submits an online appointment request on the public website, our serverless dispatcher formats the customer data and triggers instant notifications to your configured Telegram bot/group and Instagram webhook.'}
              </p>
            </div>

            <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Telegram Card */}
              <div className="p-5 rounded-xl bg-slate-950 border border-slate-800/80 space-y-5">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-sky-500/10 border border-sky-500/20 text-sky-400 flex items-center justify-center font-bold">
                      <Send className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-white">
                        {t.notifications.telegramCardTitle}
                      </h4>
                      <p className="text-[11px] text-slate-400">
                        {t.notifications.telegramCardDesc}
                      </p>
                    </div>
                  </div>

                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={notificationData.telegram_enabled}
                      onChange={(e) =>
                        setNotificationData((prev) => ({
                          ...prev,
                          telegram_enabled: e.target.checked,
                        }))
                      }
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-sky-500" />
                  </label>
                </div>

                <div className="space-y-4 pt-2 border-t border-slate-900">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-slate-300 flex items-center justify-between">
                      <span>{t.notifications.telegramTokenLabel}</span>
                      <button
                        type="button"
                        onClick={() => setShowTelegramToken((s) => !s)}
                        className="text-[11px] text-slate-400 hover:text-slate-200 flex items-center gap-1"
                      >
                        {showTelegramToken ? (
                          <>
                            <EyeOff className="w-3.5 h-3.5" />
                            <span>{locale === 'vi' ? 'Ẩn token' : 'Hide'}</span>
                          </>
                        ) : (
                          <>
                            <Eye className="w-3.5 h-3.5" />
                            <span>{locale === 'vi' ? 'Xem token' : 'Show'}</span>
                          </>
                        )}
                      </button>
                    </label>
                    <input
                      type={showTelegramToken ? 'text' : 'password'}
                      value={notificationData.telegram_bot_token}
                      onChange={(e) =>
                        setNotificationData((prev) => ({
                          ...prev,
                          telegram_bot_token: e.target.value,
                        }))
                      }
                      placeholder={t.notifications.telegramTokenPlaceholder}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm text-white font-mono placeholder:text-slate-600 focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-slate-300">
                      {t.notifications.telegramChatIdLabel}
                    </label>
                    <input
                      type="text"
                      value={notificationData.telegram_chat_id}
                      onChange={(e) =>
                        setNotificationData((prev) => ({
                          ...prev,
                          telegram_chat_id: e.target.value,
                        }))
                      }
                      placeholder={t.notifications.telegramChatIdPlaceholder}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm text-white font-mono placeholder:text-slate-600 focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                    />
                    <p className="text-[11px] text-slate-500">
                      {t.notifications.telegramChatIdHelp}
                    </p>
                  </div>

                  {/* Help guide box */}
                  <div className="p-3 bg-sky-950/40 border border-sky-800/60 rounded-lg text-xs space-y-1.5 text-slate-300">
                    <div className="font-semibold text-sky-300 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" />
                      {locale === 'vi' ? 'Hướng dẫn lấy Bot Token & Chat ID:' : 'How to get Bot Token & Chat ID:'}
                    </div>
                    <ol className="list-decimal list-inside space-y-1 text-[11px] text-slate-400">
                      <li>
                        {locale === 'vi'
                          ? 'Mở Telegram, tìm @BotFather và gửi /newbot để tạo bot và sao chép HTTP API Token.'
                          : 'Open Telegram, chat with @BotFather, send /newbot to create bot and copy API Token.'}
                      </li>
                      <li>
                        {locale === 'vi'
                          ? 'Bấm Start bot vừa tạo (hoặc thêm bot vào group nhân viên của tiệm).'
                          : 'Press Start on your new bot (or add it into your salon staff group).'}
                      </li>
                      <li>
                        {locale === 'vi'
                          ? 'Chat với @userinfobot hoặc @myidbot để lấy Chat ID cá nhân hoặc ID nhóm.'
                          : 'Chat with @userinfobot or @myidbot to retrieve your numeric Chat ID.'}
                      </li>
                    </ol>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-slate-300">
                      {t.notifications.telegramLinkLabel}
                    </label>
                    <input
                      type="text"
                      value={notificationData.telegram_link}
                      onChange={(e) =>
                        setNotificationData((prev) => ({
                          ...prev,
                          telegram_link: e.target.value,
                        }))
                      }
                      placeholder="https://t.me/glamournails_sydney"
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm text-white font-mono placeholder:text-slate-600 focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                    />
                  </div>

                  <div className="pt-2">
                    <button
                      type="button"
                      disabled={
                        testingTelegram ||
                        !notificationData.telegram_bot_token ||
                        !notificationData.telegram_chat_id
                      }
                      onClick={handleTestTelegram}
                      className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>
                        {testingTelegram
                          ? t.actions.testing
                          : t.notifications.telegramTestBtn}
                      </span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Instagram & Webhook Card */}
              <div className="p-5 rounded-xl bg-slate-950 border border-slate-800/80 space-y-5">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-pink-500/10 border border-pink-500/20 text-pink-400 flex items-center justify-center font-bold">
                      <Share2 className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-white">
                        {t.notifications.instagramCardTitle}
                      </h4>
                      <p className="text-[11px] text-slate-400">
                        {t.notifications.instagramCardDesc}
                      </p>
                    </div>
                  </div>

                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={notificationData.instagram_enabled}
                      onChange={(e) =>
                        setNotificationData((prev) => ({
                          ...prev,
                          instagram_enabled: e.target.checked,
                        }))
                      }
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-pink-500" />
                  </label>
                </div>

                <div className="space-y-4 pt-2 border-t border-slate-900">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-slate-300">
                      {t.notifications.instagramProfileLabel}
                    </label>
                    <input
                      type="text"
                      value={notificationData.instagram_profile_url}
                      onChange={(e) =>
                        setNotificationData((prev) => ({
                          ...prev,
                          instagram_profile_url: e.target.value,
                        }))
                      }
                      placeholder="https://instagram.com/glamournails.sydney"
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm text-white font-mono placeholder:text-slate-600 focus:border-pink-500 focus:ring-1 focus:ring-pink-500"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-slate-300">
                      {t.notifications.instagramWebhookLabel}
                    </label>
                    <input
                      type="text"
                      value={notificationData.instagram_webhook_url}
                      onChange={(e) =>
                        setNotificationData((prev) => ({
                          ...prev,
                          instagram_webhook_url: e.target.value,
                        }))
                      }
                      placeholder={t.notifications.instagramWebhookPlaceholder}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm text-white font-mono placeholder:text-slate-600 focus:border-pink-500 focus:ring-1 focus:ring-pink-500"
                    />
                    <p className="text-[11px] text-slate-500">
                      {locale === 'vi'
                        ? 'Dùng URL webhook từ Zapier, Make, n8n hoặc API Bot Instagram tự động.'
                        : 'Connect with automation endpoints like Zapier, Make, n8n or Instagram Chatbot API.'}
                    </p>
                  </div>

                  <div className="pt-2">
                    <button
                      type="button"
                      disabled={
                        testingInstagram ||
                        !notificationData.instagram_webhook_url
                      }
                      onClick={handleTestInstagram}
                      className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-pink-600 hover:bg-pink-500 text-white text-xs font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                      <span>
                        {testingInstagram
                          ? t.actions.testing
                          : t.notifications.instagramTestBtn}
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Live Message Template Preview */}
            <div className="mt-6 p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-300 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  {locale === 'vi'
                    ? 'Mẫu tin nhắn tự động gửi đến Telegram khi có lịch hẹn mới:'
                    : 'Real-time Telegram Alert Template Preview:'}
                </span>
                <span className="text-[11px] font-mono text-slate-500">HTML Format</span>
              </div>
              <pre className="p-3 rounded-lg bg-slate-900 border border-slate-800 text-[11px] text-slate-300 font-mono whitespace-pre-wrap leading-relaxed">
{`💅 <b>LỊCH HẸN MỚI TẠI GLAMOUR NAILS SYDNEY</b>
━━━━━━━━━━━━━━━━━━━━
👤 Khách hàng: Emily Watson
📞 Số điện thoại: 0412 345 678
📧 Email: emily.watson@example.com.au
✨ Dịch vụ quan tâm: SNS Dipping Full Set & Gel Art
📅 Ngày mong muốn: Thứ Sáu, 14:30
💬 Ghi chú: "Tôi muốn sơn màu ombre hồng pastel và đính đá nhẹ"
🌐 Nguồn: Form liên hệ Website Trực Tuyến`}
              </pre>
            </div>
          </div>

          <button
            type="button"
            disabled={loading}
            onClick={handleSaveNotifications}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-champagne-400 hover:bg-champagne-300 text-slate-950 text-sm font-semibold transition-all disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{loading ? t.notifications.savingBtn : t.notifications.saveBtn}</span>
          </button>
        </div>
      )}

      {/* TAB 8: ABOUT PAGE STORY EDITOR (/about) */}
      {activeTab === 'about-story' && (
        <div className="space-y-6">
          {/* Top Action & Context Header */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-champagne-400/10 border border-champagne-400/20 text-champagne-400 flex items-center justify-center shrink-0">
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-serif font-bold text-white">
                  {locale === 'vi'
                    ? 'Quản Trị Câu Chuyện Thương Hiệu (Trang /about)'
                    : 'Brand Story & Heritage Editor (/about Page)'}
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  {locale === 'vi'
                    ? 'Chỉnh sửa tiêu đề, nội dung câu chuyện, hình ảnh minh họa và các chỉ số nổi bật hiển thị trên trang Về Chúng Tôi (/vi/about & /en/about).'
                    : 'Manage the bilingual headline, salon heritage narrative, featured photography, and milestone metrics displayed on /en/about & /vi/about.'}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <a
                href={`/${locale}/about`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5 text-champagne-400" />
                <span>{locale === 'vi' ? 'Xem trang /about' : 'View /about'}</span>
              </a>
              <button
                type="button"
                disabled={loading}
                onClick={handleResetAboutStory}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-red-950/60 hover:text-red-300 hover:border-red-900/50 text-slate-300 text-xs font-medium border border-slate-700 transition-colors disabled:opacity-50"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>{locale === 'vi' ? 'Khôi Phục Mặc Định' : 'Restore Defaults'}</span>
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={handleSaveAboutStory}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-champagne-400 hover:bg-champagne-300 text-slate-950 text-xs font-semibold transition-all disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5" />
                <span>
                  {loading
                    ? locale === 'vi'
                      ? 'Đang Lưu...'
                      : 'Saving...'
                    : locale === 'vi'
                    ? 'Lưu Thay Đổi'
                    : 'Save Changes'}
                </span>
              </button>
            </div>
          </div>

          {/* Section 1: Page Hero Header */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-5">
            <div className="pb-3 border-b border-slate-800">
              <h3 className="text-sm font-serif font-bold text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-champagne-400" />
                <span>
                  {locale === 'vi'
                    ? '1. Phần Tiêu Đề Đầu Trang (/about)'
                    : '1. Page Intro Header (/about)'}
                </span>
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {locale === 'vi'
                  ? 'Hiển thị ở trên cùng của trang Giới Thiệu (Nhãn di sản, Tiêu đề lớn và Mô tả ngắn).'
                  : 'Displayed at the top of the About page (Heritage badge, main H1 title, and lead subtitle).'}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-300">
                  {locale === 'vi' ? 'Nhãn nổi bật đầu trang (Tiếng Việt)' : 'Top Badge Label (Vietnamese)'}
                </label>
                <input
                  type="text"
                  value={aboutStoryData.badge_vi}
                  onChange={(e) => setAboutStoryData({ ...aboutStoryData, badge_vi: e.target.value })}
                  placeholder="Di Sản & Giá Trị Cốt Lõi"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white focus:border-champagne-400 focus:outline-hidden"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-300">
                  {locale === 'vi' ? 'Nhãn nổi bật đầu trang (Tiếng Anh)' : 'Top Badge Label (English)'}
                </label>
                <input
                  type="text"
                  value={aboutStoryData.badge_en}
                  onChange={(e) => setAboutStoryData({ ...aboutStoryData, badge_en: e.target.value })}
                  placeholder="Our Heritage & Values"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white focus:border-champagne-400 focus:outline-hidden"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-300">
                  {locale === 'vi' ? 'Tiêu đề chính trang (Tiếng Việt)' : 'Page Main Title (Vietnamese)'}
                </label>
                <input
                  type="text"
                  value={aboutStoryData.page_title_vi}
                  onChange={(e) =>
                    setAboutStoryData({ ...aboutStoryData, page_title_vi: e.target.value })
                  }
                  placeholder="Câu Chuyện Glamour Nails"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white focus:border-champagne-400 focus:outline-hidden"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-300">
                  {locale === 'vi' ? 'Tiêu đề chính trang (Tiếng Anh)' : 'Page Main Title (English)'}
                </label>
                <input
                  type="text"
                  value={aboutStoryData.page_title_en}
                  onChange={(e) =>
                    setAboutStoryData({ ...aboutStoryData, page_title_en: e.target.value })
                  }
                  placeholder="The Glamour Nails Story"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white focus:border-champagne-400 focus:outline-hidden"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-300">
                  {locale === 'vi' ? 'Mô tả dẫn nhập (Tiếng Việt)' : 'Intro Subtitle (Vietnamese)'}
                </label>
                <textarea
                  rows={2}
                  value={aboutStoryData.page_subtitle_vi}
                  onChange={(e) =>
                    setAboutStoryData({ ...aboutStoryData, page_subtitle_vi: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white focus:border-champagne-400 focus:outline-hidden"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-300">
                  {locale === 'vi' ? 'Mô tả dẫn nhập (Tiếng Anh)' : 'Intro Subtitle (English)'}
                </label>
                <textarea
                  rows={2}
                  value={aboutStoryData.page_subtitle_en}
                  onChange={(e) =>
                    setAboutStoryData({ ...aboutStoryData, page_subtitle_en: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white focus:border-champagne-400 focus:outline-hidden"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Main Story Narrative & Image */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-5">
            <div className="pb-3 border-b border-slate-800">
              <h3 className="text-sm font-serif font-bold text-white flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-champagne-400" />
                <span>
                  {locale === 'vi'
                    ? '2. Nội Dung Câu Chuyện & Hình Ảnh Minh Họa'
                    : '2. Salon Story Narrative & Feature Image'}
                </span>
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {locale === 'vi'
                  ? 'Tải ảnh câu chuyện từ máy tính hoặc dán link ảnh trực tiếp, cùng các đoạn nội dung song ngữ.'
                  : 'Upload a brand story photo or enter an image URL alongside the bilingual story paragraphs.'}
              </p>
            </div>

            {/* Image Uploader & URL */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-start">
              <div className="md:col-span-5">
                <ImageUploader
                  bucket="salon_cms"
                  label={
                    locale === 'vi'
                      ? 'Ảnh đại diện Câu Chuyện (Tỉ lệ ngang/vuông)'
                      : 'Story Feature Image'
                  }
                  currentImageUrl={aboutStoryData.image_url}
                  onUploadSuccess={(url) =>
                    setAboutStoryData((prev) => ({ ...prev, image_url: url }))
                  }
                />
              </div>
              <div className="md:col-span-7 space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-300">
                    {locale === 'vi' ? 'Đường dẫn ảnh (Image URL)' : 'Image URL (Direct Link or Uploaded Path)'}
                  </label>
                  <input
                    type="text"
                    value={aboutStoryData.image_url}
                    onChange={(e) =>
                      setAboutStoryData({ ...aboutStoryData, image_url: e.target.value })
                    }
                    placeholder="https://... hoặc /uploads/..."
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-white focus:border-champagne-400 focus:outline-hidden"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-slate-300">
                      {locale === 'vi' ? 'Dòng nhãn nhỏ phía trên (Tiếng Việt)' : 'Story Eyebrow (Vietnamese)'}
                    </label>
                    <input
                      type="text"
                      value={aboutStoryData.story_eyebrow_vi}
                      onChange={(e) =>
                        setAboutStoryData({ ...aboutStoryData, story_eyebrow_vi: e.target.value })
                      }
                      placeholder="Không Gian Đẳng Cấp Sydney CBD"
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white focus:border-champagne-400 focus:outline-hidden"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-slate-300">
                      {locale === 'vi' ? 'Dòng nhãn nhỏ phía trên (Tiếng Anh)' : 'Story Eyebrow (English)'}
                    </label>
                    <input
                      type="text"
                      value={aboutStoryData.story_eyebrow_en}
                      onChange={(e) =>
                        setAboutStoryData({ ...aboutStoryData, story_eyebrow_en: e.target.value })
                      }
                      placeholder="Sydney CBD Sanctuary"
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white focus:border-champagne-400 focus:outline-hidden"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Story Heading */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-800/80">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-300">
                  {locale === 'vi' ? 'Tiêu đề Câu Chuyện (Tiếng Việt)' : 'Story Headline (Vietnamese)'}
                </label>
                <input
                  type="text"
                  value={aboutStoryData.story_title_vi}
                  onChange={(e) =>
                    setAboutStoryData({ ...aboutStoryData, story_title_vi: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white focus:border-champagne-400 focus:outline-hidden"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-300">
                  {locale === 'vi' ? 'Tiêu đề Câu Chuyện (Tiếng Anh)' : 'Story Headline (English)'}
                </label>
                <input
                  type="text"
                  value={aboutStoryData.story_title_en}
                  onChange={(e) =>
                    setAboutStoryData({ ...aboutStoryData, story_title_en: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white focus:border-champagne-400 focus:outline-hidden"
                />
              </div>
            </div>

            {/* Paragraph 1 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-300">
                  {locale === 'vi' ? 'Đoạn nội dung 1 (Tiếng Việt)' : 'Story Paragraph 1 (Vietnamese)'}
                </label>
                <textarea
                  rows={4}
                  value={aboutStoryData.story_p1_vi}
                  onChange={(e) =>
                    setAboutStoryData({ ...aboutStoryData, story_p1_vi: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white leading-relaxed focus:border-champagne-400 focus:outline-hidden"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-300">
                  {locale === 'vi' ? 'Đoạn nội dung 1 (Tiếng Anh)' : 'Story Paragraph 1 (English)'}
                </label>
                <textarea
                  rows={4}
                  value={aboutStoryData.story_p1_en}
                  onChange={(e) =>
                    setAboutStoryData({ ...aboutStoryData, story_p1_en: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white leading-relaxed focus:border-champagne-400 focus:outline-hidden"
                />
              </div>
            </div>

            {/* Paragraph 2 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-300">
                  {locale === 'vi' ? 'Đoạn nội dung 2 (Tiếng Việt)' : 'Story Paragraph 2 (Vietnamese)'}
                </label>
                <textarea
                  rows={4}
                  value={aboutStoryData.story_p2_vi}
                  onChange={(e) =>
                    setAboutStoryData({ ...aboutStoryData, story_p2_vi: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white leading-relaxed focus:border-champagne-400 focus:outline-hidden"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-300">
                  {locale === 'vi' ? 'Đoạn nội dung 2 (Tiếng Anh)' : 'Story Paragraph 2 (English)'}
                </label>
                <textarea
                  rows={4}
                  value={aboutStoryData.story_p2_en}
                  onChange={(e) =>
                    setAboutStoryData({ ...aboutStoryData, story_p2_en: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white leading-relaxed focus:border-champagne-400 focus:outline-hidden"
                />
              </div>
            </div>

            {/* Paragraph 3 (Optional) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-300">
                  {locale === 'vi'
                    ? 'Đoạn nội dung 3 — Tùy chọn (Tiếng Việt)'
                    : 'Story Paragraph 3 — Optional (Vietnamese)'}
                </label>
                <textarea
                  rows={3}
                  value={aboutStoryData.story_p3_vi}
                  onChange={(e) =>
                    setAboutStoryData({ ...aboutStoryData, story_p3_vi: e.target.value })
                  }
                  placeholder={
                    locale === 'vi'
                      ? 'Để trống nếu không cần hiển thị đoạn thứ 3...'
                      : 'Leave blank to hide paragraph 3...'
                  }
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white leading-relaxed placeholder:text-slate-600 focus:border-champagne-400 focus:outline-hidden"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-300">
                  {locale === 'vi'
                    ? 'Đoạn nội dung 3 — Tùy chọn (Tiếng Anh)'
                    : 'Story Paragraph 3 — Optional (English)'}
                </label>
                <textarea
                  rows={3}
                  value={aboutStoryData.story_p3_en}
                  onChange={(e) =>
                    setAboutStoryData({ ...aboutStoryData, story_p3_en: e.target.value })
                  }
                  placeholder="Leave blank to hide paragraph 3..."
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white leading-relaxed placeholder:text-slate-600 focus:border-champagne-400 focus:outline-hidden"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Highlight Metrics (2 Stats Cards) */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-5">
            <div className="pb-3 border-b border-slate-800">
              <h3 className="text-sm font-serif font-bold text-white flex items-center gap-2">
                <Award className="w-4 h-4 text-champagne-400" />
                <span>
                  {locale === 'vi'
                    ? '3. Hai Chỉ Số Nổi Bật Dưới Câu Chuyện'
                    : '3. Story Milestone Highlight Stats'}
                </span>
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Stat 1 */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                <div className="flex items-center gap-2 text-xs font-semibold text-champagne-300">
                  <Award className="w-4 h-4" />
                  <span>{locale === 'vi' ? 'Chỉ số 1 (Kinh nghiệm / Giải thưởng)' : 'Highlight Stat 1 (Award)'}</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] text-slate-400">
                      {locale === 'vi' ? 'Con số (VI)' : 'Value (VI)'}
                    </label>
                    <input
                      type="text"
                      value={aboutStoryData.stat1_value_vi}
                      onChange={(e) =>
                        setAboutStoryData({ ...aboutStoryData, stat1_value_vi: e.target.value })
                      }
                      className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white focus:border-champagne-400 focus:outline-hidden"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] text-slate-400">
                      {locale === 'vi' ? 'Con số (EN)' : 'Value (EN)'}
                    </label>
                    <input
                      type="text"
                      value={aboutStoryData.stat1_value_en}
                      onChange={(e) =>
                        setAboutStoryData({ ...aboutStoryData, stat1_value_en: e.target.value })
                      }
                      className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white focus:border-champagne-400 focus:outline-hidden"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] text-slate-400">
                      {locale === 'vi' ? 'Mô tả (VI)' : 'Label (VI)'}
                    </label>
                    <input
                      type="text"
                      value={aboutStoryData.stat1_label_vi}
                      onChange={(e) =>
                        setAboutStoryData({ ...aboutStoryData, stat1_label_vi: e.target.value })
                      }
                      className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white focus:border-champagne-400 focus:outline-hidden"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] text-slate-400">
                      {locale === 'vi' ? 'Mô tả (EN)' : 'Label (EN)'}
                    </label>
                    <input
                      type="text"
                      value={aboutStoryData.stat1_label_en}
                      onChange={(e) =>
                        setAboutStoryData({ ...aboutStoryData, stat1_label_en: e.target.value })
                      }
                      className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white focus:border-champagne-400 focus:outline-hidden"
                    />
                  </div>
                </div>
              </div>

              {/* Stat 2 */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                <div className="flex items-center gap-2 text-xs font-semibold text-champagne-300">
                  <Heart className="w-4 h-4" />
                  <span>{locale === 'vi' ? 'Chỉ số 2 (Khách hàng / Tín nhiệm)' : 'Highlight Stat 2 (Clients)'}</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] text-slate-400">
                      {locale === 'vi' ? 'Con số (VI)' : 'Value (VI)'}
                    </label>
                    <input
                      type="text"
                      value={aboutStoryData.stat2_value_vi}
                      onChange={(e) =>
                        setAboutStoryData({ ...aboutStoryData, stat2_value_vi: e.target.value })
                      }
                      className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white focus:border-champagne-400 focus:outline-hidden"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] text-slate-400">
                      {locale === 'vi' ? 'Con số (EN)' : 'Value (EN)'}
                    </label>
                    <input
                      type="text"
                      value={aboutStoryData.stat2_value_en}
                      onChange={(e) =>
                        setAboutStoryData({ ...aboutStoryData, stat2_value_en: e.target.value })
                      }
                      className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white focus:border-champagne-400 focus:outline-hidden"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] text-slate-400">
                      {locale === 'vi' ? 'Mô tả (VI)' : 'Label (VI)'}
                    </label>
                    <input
                      type="text"
                      value={aboutStoryData.stat2_label_vi}
                      onChange={(e) =>
                        setAboutStoryData({ ...aboutStoryData, stat2_label_vi: e.target.value })
                      }
                      className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white focus:border-champagne-400 focus:outline-hidden"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] text-slate-400">
                      {locale === 'vi' ? 'Mô tả (EN)' : 'Label (EN)'}
                    </label>
                    <input
                      type="text"
                      value={aboutStoryData.stat2_label_en}
                      onChange={(e) =>
                        setAboutStoryData({ ...aboutStoryData, stat2_label_en: e.target.value })
                      }
                      className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white focus:border-champagne-400 focus:outline-hidden"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Section 4: Live Preview */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-champagne-400" />
                <h3 className="text-sm font-serif font-bold text-white">
                  {locale === 'vi'
                    ? 'Xem Trước Trực Tiếp Giao Diện Trang /about'
                    : 'Live Public /about Story Preview'}
                </h3>
              </div>
              <div className="inline-flex rounded-lg bg-slate-950 p-1 border border-slate-800">
                <button
                  type="button"
                  onClick={() => setAboutPreviewLocale('vi')}
                  className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors ${
                    aboutPreviewLocale === 'vi'
                      ? 'bg-champagne-400 text-slate-950'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Tiếng Việt
                </button>
                <button
                  type="button"
                  onClick={() => setAboutPreviewLocale('en')}
                  className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors ${
                    aboutPreviewLocale === 'en'
                      ? 'bg-champagne-400 text-slate-950'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  English
                </button>
              </div>
            </div>

            <div className="rounded-2xl bg-[#FAF8F5] text-slate-900 p-6 sm:p-8 space-y-8 border border-slate-700/60">
              {/* Preview Intro Header */}
              <div className="text-center max-w-2xl mx-auto space-y-2.5">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 border border-amber-200 px-3 py-0.5 text-[11px] font-medium text-amber-900">
                  <Sparkles className="w-3 h-3 text-amber-600" />
                  <span>
                    {aboutPreviewLocale === 'vi'
                      ? aboutStoryData.badge_vi || aboutStoryData.badge_en
                      : aboutStoryData.badge_en || aboutStoryData.badge_vi}
                  </span>
                </span>
                <h4 className="font-serif text-2xl sm:text-3xl font-bold text-slate-950">
                  {aboutPreviewLocale === 'vi'
                    ? aboutStoryData.page_title_vi || aboutStoryData.page_title_en
                    : aboutStoryData.page_title_en || aboutStoryData.page_title_vi}
                </h4>
                <p className="text-xs sm:text-sm text-slate-600">
                  {aboutPreviewLocale === 'vi'
                    ? aboutStoryData.page_subtitle_vi || aboutStoryData.page_subtitle_en
                    : aboutStoryData.page_subtitle_en || aboutStoryData.page_subtitle_vi}
                </p>
              </div>

              {/* Preview 2-Column Story */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                <div className="md:col-span-5">
                  <div className="rounded-2xl overflow-hidden shadow-md border-4 border-white bg-white">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={
                        aboutStoryData.image_url ||
                        'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=1200&q=80'
                      }
                      alt="Story Preview"
                      className="w-full h-56 object-cover"
                    />
                  </div>
                </div>
                <div className="md:col-span-7 space-y-3">
                  <span className="text-[10px] font-bold tracking-widest text-amber-800 uppercase block">
                    {aboutPreviewLocale === 'vi'
                      ? aboutStoryData.story_eyebrow_vi || aboutStoryData.story_eyebrow_en
                      : aboutStoryData.story_eyebrow_en || aboutStoryData.story_eyebrow_vi}
                  </span>
                  <h5 className="font-serif text-xl sm:text-2xl font-bold text-slate-950 leading-tight">
                    {aboutPreviewLocale === 'vi'
                      ? aboutStoryData.story_title_vi || aboutStoryData.story_title_en
                      : aboutStoryData.story_title_en || aboutStoryData.story_title_vi}
                  </h5>
                  <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-line">
                    {aboutPreviewLocale === 'vi'
                      ? aboutStoryData.story_p1_vi || aboutStoryData.story_p1_en
                      : aboutStoryData.story_p1_en || aboutStoryData.story_p1_vi}
                  </p>
                  <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-line">
                    {aboutPreviewLocale === 'vi'
                      ? aboutStoryData.story_p2_vi || aboutStoryData.story_p2_en
                      : aboutStoryData.story_p2_en || aboutStoryData.story_p2_vi}
                  </p>
                  {(aboutPreviewLocale === 'vi'
                    ? aboutStoryData.story_p3_vi || aboutStoryData.story_p3_en
                    : aboutStoryData.story_p3_en || aboutStoryData.story_p3_vi) && (
                    <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-line">
                      {aboutPreviewLocale === 'vi'
                        ? aboutStoryData.story_p3_vi || aboutStoryData.story_p3_en
                        : aboutStoryData.story_p3_en || aboutStoryData.story_p3_vi}
                    </p>
                  )}

                  <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-200">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-full bg-amber-100 text-amber-900">
                        <Award className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-900">
                          {aboutPreviewLocale === 'vi'
                            ? aboutStoryData.stat1_value_vi || aboutStoryData.stat1_value_en
                            : aboutStoryData.stat1_value_en || aboutStoryData.stat1_value_vi}
                        </p>
                        <p className="text-[11px] text-slate-500">
                          {aboutPreviewLocale === 'vi'
                            ? aboutStoryData.stat1_label_vi || aboutStoryData.stat1_label_en
                            : aboutStoryData.stat1_label_en || aboutStoryData.stat1_label_vi}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-full bg-amber-100 text-amber-900">
                        <Heart className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-900">
                          {aboutPreviewLocale === 'vi'
                            ? aboutStoryData.stat2_value_vi || aboutStoryData.stat2_value_en
                            : aboutStoryData.stat2_value_en || aboutStoryData.stat2_value_vi}
                        </p>
                        <p className="text-[11px] text-slate-500">
                          {aboutPreviewLocale === 'vi'
                            ? aboutStoryData.stat2_label_vi || aboutStoryData.stat2_label_en
                            : aboutStoryData.stat2_label_en || aboutStoryData.stat2_label_vi}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              disabled={loading}
              onClick={handleSaveAboutStory}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-champagne-400 hover:bg-champagne-300 text-slate-950 text-sm font-semibold transition-all disabled:opacity-50 shadow-md"
            >
              <Save className="w-4 h-4" />
              <span>
                {loading
                  ? locale === 'vi'
                    ? 'Đang Lưu Câu Chuyện...'
                    : 'Saving Story...'
                  : locale === 'vi'
                  ? 'Lưu Thông Tin Câu Chuyện'
                  : 'Save About Story'}
              </span>
            </button>
          </div>
        </div>
      )}
        </div>
      </div>
    </div>
  );
}

export default function AdminCmsPortal() {
  return (
    <Suspense
      fallback={
        <div className="p-8 text-center text-slate-400 font-mono text-xs">
          Loading CMS Portal...
        </div>
      }
    >
      <AdminCmsPortalContent />
    </Suspense>
  );
}
