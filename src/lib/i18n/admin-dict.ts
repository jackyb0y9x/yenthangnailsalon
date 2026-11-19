/**
 * Bilingual Dictionary for CMS Admin Portal
 * Supports English and Vietnamese across navigation, tabs, forms, and alerts.
 */

export type AdminLocale = 'en' | 'vi';

export const adminDict = {
  en: {
    // Header & Brand
    portalTitle: 'Glamour Nails Admin Portal',
    portalSubtitle: 'Sydney CBD Boutique Lounge • Operational Management',
    liveConnected: 'Live Connected',
    switchLanguage: 'Tiếng Việt',

    // Roles
    roles: {
      super_admin: 'Super Admin',
      manager: 'Salon Manager',
      staff: 'Nail Technician',
    },

    // Navigation
    nav: {
      overview: 'Overview',
      cms: 'CMS Editor',
      customers: 'Customers (CRM)',
      staff: 'Staff Roster',
      finance: 'Finance & Tax',
      signOut: 'Sign Out',
      lockedBadge: 'Locked',
      staffLockedNotice: 'Staff role not authorized to view financial records',
    },

    // CMS Tabs
    tabs: {
      hero: 'Hero Banner',
      announcement: 'Announcements',
      services: 'Services Menu',
      gallery: 'Nail Lookbook',
      aboutStory: 'About Story (/about)',
      hours: 'Hours & Holidays',
      business: 'Salon Info, Branding, Social & Maps',
      notifications: 'Telegram & Instagram Alerts',
    },

    // Branding & Logo
    branding: {
      heading: 'Website Title, Tagline & Logo Branding',
      subheading: 'Customize the website brand title, subtitle/tagline, and logo displayed in the Header, Footer, and Browser tab.',
      titleLabelEn: 'Website Title (English)',
      titlePlaceholderEn: 'Glamour Nails & Beauty Lounge Sydney',
      titleLabelVi: 'Website Title (Tiếng Việt)',
      titlePlaceholderVi: 'Glamour Nails Sydney • Chăm Sóc Móng Cao Cấp',
      taglineLabelEn: 'Brand Tagline / Slogan (English)',
      taglinePlaceholderEn: 'Sydney CBD • Boutique Lounge',
      taglineLabelVi: 'Brand Tagline / Slogan (Tiếng Việt)',
      taglinePlaceholderVi: 'Sydney CBD • Tiệm Nail Sang Trọng',
      logoLabel: 'Website Logo Image (PNG, SVG, WebP with transparent background)',
      logoUploadBtn: 'Upload New Logo',
      logoUrlPlaceholder: 'https://... or upload image',
      removeLogoBtn: 'Use Default Gemstone Icon',
      previewHeading: 'Live Logo Preview (Light & Dark Backgrounds)',
      previewLight: 'Header (Light Background)',
      previewDark: 'Footer / Admin (Dark Background)',
    },

    // Common Actions & Feedback
    actions: {
      save: 'Save Changes',
      saving: 'Saving...',
      cancel: 'Cancel',
      delete: 'Delete',
      edit: 'Edit',
      addNew: 'Add New',
      upload: 'Upload Asset',
      test: 'Test Connection',
      testing: 'Testing...',
      preview: 'Live Preview',
      search: 'Search...',
      filter: 'Filter',
      active: 'Active',
      inactive: 'Inactive',
      featured: 'Pinned to Featured',
      standard: 'Standard',
      autoGenerate: 'Auto-Generate from Address',
    },

    feedback: {
      savedSuccess: 'Changes saved and public cache revalidated successfully!',
      saveError: 'Failed to save changes. Please check inputs and try again.',
      deletedSuccess: 'Item deleted successfully.',
      testSuccess: 'Notification test sent successfully!',
    },

    // Notification Tab
    notifications: {
      heading: 'Automated Social & Messaging Notifications',
      subheading: 'Configure instant alerts to Telegram or Instagram when clients book online consultations.',
      telegramCardTitle: 'Telegram Bot Integration',
      telegramCardDesc: 'Instant push alerts delivered directly to your personal Telegram or salon staff group chat.',
      telegramToggle: 'Enable Telegram Notifications',
      telegramTokenLabel: 'Bot API Token (from @BotFather)',
      telegramTokenPlaceholder: '123456789:AAH_example_token_here',
      telegramChatIdLabel: 'Chat ID / Group ID',
      telegramChatIdPlaceholder: '-100123456789 or 123456789',
      telegramChatIdHelp: 'Send a message to your bot or use @userinfobot to find your Chat ID.',
      telegramLinkLabel: 'Salon Telegram Link / Handle',
      telegramTestBtn: 'Send Test Telegram Alert',

      instagramCardTitle: 'Instagram & Webhook Integration',
      instagramCardDesc: 'Connect your Instagram account and dispatch appointment webhooks to automation tools (Zapier, Make, n8n).',
      instagramToggle: 'Enable Instagram / Webhook Alerts',
      instagramProfileLabel: 'Instagram Profile URL',
      instagramWebhookLabel: 'Notification Webhook URL (JSON payload)',
      instagramWebhookPlaceholder: 'https://hooks.zapier.com/hooks/catch/...',
      instagramTestBtn: 'Send Test Webhook Payload',

      saveBtn: 'Save Notification Settings',
      savingBtn: 'Saving Settings...',
    },
  },

  vi: {
    // Header & Brand
    portalTitle: 'Cổng Quản Trị Glamour Nails',
    portalSubtitle: 'Salon Cao Cấp Sydney CBD • Hệ Thống Quản Trị Vận Hành',
    liveConnected: 'Đang Kết Nối',
    switchLanguage: 'English',

    // Roles
    roles: {
      super_admin: 'Quản Trị Cấp Cao',
      manager: 'Quản Lý Salon',
      staff: 'Kỹ Thuật Viên Nail',
    },

    // Navigation
    nav: {
      overview: 'Tổng Quan',
      cms: 'Quản Trị CMS',
      customers: 'Khách Hàng (CRM)',
      staff: 'Đội Ngũ Nhân Viên',
      finance: 'Thu Chi & Thuế BAS',
      signOut: 'Đăng Xuất',
      lockedBadge: 'Khóa',
      staffLockedNotice: 'Tài khoản nhân viên không có quyền truy cập sổ sách tài chính',
    },

    // CMS Tabs
    tabs: {
      hero: 'Banner Trang Chủ',
      announcement: 'Thanh Thông Báo',
      services: 'Danh Mục Dịch Vụ',
      gallery: 'Bộ Sưu Tập Mẫu Móng',
      aboutStory: 'Câu Chuyện (/about)',
      hours: 'Giờ Mở Cửa & Nghỉ Lễ',
      business: 'Thông Tin Tiệm, MXH & Bản Đồ',
      notifications: 'Thông Báo Telegram & Instagram',
    },

    // Branding & Logo
    branding: {
      heading: 'Tiêu Đề Trang Web & Logo Nhận Diện Thương Hiệu',
      subheading: 'Tùy chỉnh tiêu đề trang web, khẩu hiệu/tagline và tải lên logo hiển thị trên thanh Header, chân trang Footer và tab trình duyệt.',
      titleLabelEn: 'Tiêu đề trang web (Tiếng Anh)',
      titlePlaceholderEn: 'Glamour Nails & Beauty Lounge Sydney',
      titleLabelVi: 'Tiêu đề trang web (Tiếng Việt)',
      titlePlaceholderVi: 'Glamour Nails Sydney • Chăm Sóc Móng Cao Cấp',
      taglineLabelEn: 'Khẩu hiệu thương hiệu (Tiếng Anh)',
      taglinePlaceholderEn: 'Sydney CBD • Boutique Lounge',
      taglineLabelVi: 'Khẩu hiệu thương hiệu (Tiếng Việt)',
      taglinePlaceholderVi: 'Sydney CBD • Tiệm Nail Sang Trọng',
      logoLabel: 'Hình ảnh Logo trang web (Khuyên dùng PNG/SVG/WebP nền trong suốt)',
      logoUploadBtn: 'Tải Lên Logo Mới',
      logoUrlPlaceholder: 'https://... hoặc tải ảnh từ máy tính',
      removeLogoBtn: 'Sử Dụng Icon Đá Quý Mặc Định',
      previewHeading: 'Xem Trước Logo Trực Tiếp (Nền Sáng & Nền Tối)',
      previewLight: 'Thanh Header (Nền Sáng)',
      previewDark: 'Chân Trang Footer / Admin (Nền Tối)',
    },

    // Common Actions & Feedback
    actions: {
      save: 'Lưu Thay Đổi',
      saving: 'Đang Lưu...',
      cancel: 'Hủy Bỏ',
      delete: 'Xóa',
      edit: 'Chỉnh Sửa',
      addNew: 'Thêm Mới',
      upload: 'Tải Ảnh Mới',
      test: 'Gửi Thử Nghiệm',
      testing: 'Đang Gửi Thử...',
      preview: 'Xem Trước Trực Tiếp',
      search: 'Tìm kiếm...',
      filter: 'Lọc',
      active: 'Hoạt Động',
      inactive: 'Tạm Ẩn',
      featured: 'Ghim Nổi Bật',
      standard: 'Tiêu Chuẩn',
      autoGenerate: 'Tự Động Tạo Từ Địa Chỉ',
    },

    feedback: {
      savedSuccess: 'Đã lưu thay đổi và cập nhật bộ nhớ đệm trang web thành công!',
      saveError: 'Lưu thất bại. Vui lòng kiểm tra lại thông tin và thử lại.',
      deletedSuccess: 'Đã xóa mục thành công.',
      testSuccess: 'Tin nhắn thử nghiệm đã gửi thành công!',
    },

    // Notification Tab
    notifications: {
      heading: 'Cấu Hình Thông Báo Tự Động Telegram & Instagram',
      subheading: 'Tự động gửi thông tin khách hàng đặt lịch hẹn mới sang ứng dụng Telegram hoặc Instagram.',
      telegramCardTitle: 'Liên Kết Bot Telegram',
      telegramCardDesc: 'Nhận thông báo tức thì về tài khoản Telegram cá nhân hoặc nhóm chat nhân viên khi khách đặt lịch.',
      telegramToggle: 'Bật thông báo qua Telegram',
      telegramTokenLabel: 'Mã Bot API Token (tạo từ @BotFather)',
      telegramTokenPlaceholder: '123456789:AAH_example_token_here',
      telegramChatIdLabel: 'ID Phòng Chat / Nhóm Chat (Chat ID)',
      telegramChatIdPlaceholder: '-100123456789 hoặc 123456789',
      telegramChatIdHelp: 'Gửi tin nhắn cho Bot hoặc dùng @userinfobot để lấy Chat ID của bạn hoặc nhóm.',
      telegramLinkLabel: 'Đường dẫn Telegram của Salon (@t.me/...)',
      telegramTestBtn: 'Gửi Tin Nhắn Thử Nghiệm Telegram',

      instagramCardTitle: 'Liên Kết Instagram & Webhook',
      instagramCardDesc: 'Liên kết hồ sơ Instagram của salon và kích hoạt webhook gửi lịch hẹn sang các công cụ tự động (Zapier, Make, n8n).',
      instagramToggle: 'Bật thông báo qua Webhook / Instagram',
      instagramProfileLabel: 'Đường Dẫn Trang Instagram Salon',
      instagramWebhookLabel: 'URL Webhook Nhận Thông Báo (định dạng JSON)',
      instagramWebhookPlaceholder: 'https://hooks.zapier.com/hooks/catch/...',
      instagramTestBtn: 'Gửi Payload Thử Nghiệm Webhook',

      saveBtn: 'Lưu Cấu Hình Thông Báo',
      savingBtn: 'Đang Lưu Cấu Hình...',
    },
  },
};
