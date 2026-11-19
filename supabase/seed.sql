-- =============================================================================
-- Seed Script: supabase/seed.sql
-- Description: Deterministic initial sample data for Australian Nail Salon
-- Conventions: Fixed UUIDs, realistic Australian context, ON CONFLICT DO NOTHING
-- =============================================================================

-- 1. SALON BUSINESS INFO
INSERT INTO public.nail_business_info (
  id, salon_name, abn, phone, mobile, email,
  address_street, suburb, state, postcode, country,
  latitude, longitude, opening_hours, social_links
) VALUES (
  '10000000-0000-0000-0000-000000000001',
  'Glamour Nails & Beauty Lounge Sydney',
  '51 824 753 556',
  '+61 2 9123 4567',
  '+61 412 345 678',
  'hello@glamournails.com.au',
  'Suite 2, 188 George Street',
  'Sydney',
  'NSW',
  '2000',
  'Australia',
  -33.8688,
  151.2093,
  '{
    "monday": {"open": "09:30", "close": "18:30", "closed": false},
    "tuesday": {"open": "09:30", "close": "18:30", "closed": false},
    "wednesday": {"open": "09:30", "close": "18:30", "closed": false},
    "thursday": {"open": "09:30", "close": "20:00", "closed": false},
    "friday": {"open": "09:30", "close": "19:00", "closed": false},
    "saturday": {"open": "09:00", "close": "18:00", "closed": false},
    "sunday": {"open": "10:00", "close": "17:00", "closed": false}
  }'::jsonb,
  '{
    "instagram": "https://instagram.com/glamournails.sydney",
    "facebook": "https://facebook.com/glamournails.sydney",
    "tiktok": "https://tiktok.com/@glamournails.sydney"
  }'::jsonb
) ON CONFLICT (id) DO NOTHING;

-- 2. HOMEPAGE CMS SECTIONS
INSERT INTO public.nail_cms_sections (
  id, section_key, title_en, title_vi, subtitle_en, subtitle_vi,
  content_en, content_vi, cta_text_en, cta_text_vi, cta_link, image_url, is_active, display_order
) VALUES
(
  '20000000-0000-0000-0000-000000000001',
  'hero',
  'Luxury Nail Artistry & Holistic Spa Care',
  'Nghệ Thuật Làm Móng & Chăm Sóc Spa Thư Giãn Đẳng Cấp',
  'Experience bespoke manicure, SNS dipping, and European-grade nail enhancements in Sydney CBD.',
  'Trải nghiệm dịch vụ làm móng tinh xảo, nhúng bột SNS và chăm sóc móng chuẩn châu Âu tại trung tâm Sydney.',
  'Dedicated to hospital-grade hygiene, cruelty-free premium products, and breathtaking nail design.',
  'Cam kết vệ sinh tiệt trùng y khoa, sản phẩm cao cấp thuần chay và thiết kế móng nghệ thuật tinh tế.',
  'Book Consultation',
  'Đặt Lịch Tư Vấn',
  '/contact',
  'https://images.unsplash.com/photo-1632345031435-8727f6897d53?auto=format&fit=crop&w=1600&q=80',
  true,
  1
),
(
  '20000000-0000-0000-0000-000000000002',
  'about',
  'Over 8 Years of Nail Perfection in Australia',
  'Hơn 8 Năm Kiến Tạo Vẻ Đẹp Hoàn Mỹ Tại Úc',
  'Founded by passionate master technicians blending Vietnamese artistry with Australian safety standards.',
  'Được sáng lập bởi các chuyên viên tài hoa kết hợp nghệ thuật Việt Nam cùng tiêu chuẩn an toàn nghiêm ngặt của Úc.',
  'We believe beauty starts with health. Our salon exclusively uses MMA-free monomers, non-toxic gel polishes, and hospital-grade autoclave sterilization for every instrument.',
  'Chúng tôi tin vẻ đẹp bắt nguồn từ sức khỏe. Tiệm chỉ sử dụng bột không chứa MMA, sơn gel lành tính và nồi hấp tiệt trùng đạt chuẩn y tế cho mọi dụng cụ.',
  'Learn More',
  'Tìm Hiểu Thêm',
  '/about',
  'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=1200&q=80',
  true,
  2
),
(
  '20000000-0000-0000-0000-000000000003',
  'hygiene_guarantee',
  'Hospital-Grade Sterilization Guarantee',
  'Cam Kết Tiệt Trùng Y Khoa Chuẩn Y Tế',
  'Your health and safety are our highest priorities.',
  'Sức khỏe và sự an tâm của bạn là ưu tiên số một của chúng tôi.',
  'Every metal tool is sterilized via high-temperature autoclave. Single-use buffers, files, and pedicure liners ensure 100% cross-contamination protection.',
  'Dụng cụ kim loại được hấp tiệt trùng áp suất cao. Giũa móng, đệm bọt và lót bồn ngâm chân dùng một lần đảm bảo vệ sinh tuyệt đối.',
  'View Standards',
  'Xem Tiêu Chuẩn',
  '/about#hygiene',
  'https://images.unsplash.com/photo-1607779097040-26e80aa78e66?auto=format&fit=crop&w=1200&q=80',
  true,
  3
) ON CONFLICT (id) DO NOTHING;

-- 3. NAIL SERVICES CATALOG (AUD Pricing inclusive of 10% GST)
INSERT INTO public.nail_services (
  id, category, name_en, name_vi, description_en, description_vi,
  duration_minutes, price_aud, image_url, is_featured, is_active, display_order
) VALUES
(
  '30000000-0000-0000-0000-000000000001',
  'Manicure',
  'Signature Classic Spa Manicure',
  'Chăm Sóc Móng Tay Spa Cổ Điển',
  'Nail shaping, cuticle rejuvenation, gentle hand exfoliation, relaxing massage, and regular Australian brand polish.',
  'Tạo dáng móng, chăm sóc biểu bì, tẩy tế bào chết tay, massage thư giãn và sơn màu cao cấp.',
  45,
  45.00,
  'https://images.unsplash.com/photo-1519014816548-bf5fe059798b?auto=format&fit=crop&w=800&q=80',
  true,
  true,
  1
),
(
  '30000000-0000-0000-0000-000000000002',
  'Pedicure',
  'Deluxe Herbal Foot Spa Pedicure',
  'Chăm Sóc Móng Chân Thảo Mộc Thượng Hạng',
  'Warm sea salt herbal soak, callus smoothing treatment, sugar scrub, hot towel compress, and hydration mask.',
  'Ngâm chân muối khoáng thảo mộc ấm, tẩy chai sần, tẩy tế bào chết đường đen, ủ khăn nóng và mặt nạ dưỡng ẩm.',
  60,
  65.00,
  'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=800&q=80',
  true,
  true,
  2
),
(
  '30000000-0000-0000-0000-000000000003',
  'SNS & Dipping',
  'SNS Dipping Powder Full Set',
  'Làm Móng Nhúng Bột SNS Cao Cấp',
  'Vitamin E and Calcium enriched dipping powder on natural nails or extension tips. Durable, lightweight, and chip-free for 3+ weeks.',
  'Nhúng bột dinh dưỡng bổ sung Vitamin E và Canxi trên móng tự nhiên hoặc móng nối. Bền đẹp trên 3 tuần không trầy xước.',
  50,
  60.00,
  'https://images.unsplash.com/photo-1632345031435-8727f6897d53?auto=format&fit=crop&w=800&q=80',
  true,
  true,
  3
),
(
  '30000000-0000-0000-0000-000000000004',
  'Acrylic & Extensions',
  'Full Set Acrylic Extensions with Gel Finish',
  'Đắp Móng Bột Acrylic Nối Dài Kèm Sơn Gel',
  'Precision sculpted MMA-free acrylic extensions tailored to your desired shape (Almond, Coffin, Stiletto) with long-lasting gel polish.',
  'Nối móng bột không độc hại MMA theo phom dáng yêu thích (Almond, Coffin, Stiletto) kèm lớp sơn gel siêu bóng bền màu.',
  75,
  75.00,
  'https://images.unsplash.com/photo-1604654894610-df63bc536371?auto=format&fit=crop&w=800&q=80',
  true,
  true,
  4
),
(
  '30000000-0000-0000-0000-000000000005',
  'Acrylic & Extensions',
  'Signature Ombré French Acrylic Set',
  'Đắp Bột Ombré French Tự Nhiên',
  'Seamless pink & white gradient transition sculptured directly into the acrylic matrix. Timeless and elegant.',
  'Chuyển sắc ombré hồng trắng mềm mại tự nhiên trực tiếp trên nền bột. Thanh lịch, sang trọng và không bong tróc.',
  80,
  85.00,
  'https://images.unsplash.com/photo-1599940824399-b87987ceb72a?auto=format&fit=crop&w=800&q=80',
  true,
  true,
  5
),
(
  '30000000-0000-0000-0000-000000000006',
  'Gel Art & Design',
  'Russian E-File Precision Manicure & Gel Overlay',
  'Làm Sạch Da Kiểu Nga E-File & Phủ Gel Tự Nhiên',
  'Flawless dry cuticle removal with medical-grade diamond bits, structured builder gel overlay for natural nail strength.',
  'Làm sạch da khô chuyên sâu bằng máy mài đầu kim cương y tế, đắp gel gia cố giúp móng tự nhiên chắc khỏe.',
  60,
  80.00,
  'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=800&q=80',
  true,
  true,
  6
),
(
  '30000000-0000-0000-0000-000000000007',
  'Gel Art & Design',
  'Bespoke 3D Handcrafted Nail Art (Full Set)',
  'Vẽ Móng Nghệ Thuật 3D Đính Đá Tinh Xảo (10 Ngón)',
  'Intricate hand-painted patterns, 3D floral sculpting, genuine Swarovski crystal application, and chrome accents.',
  'Họa tiết vẽ tay độc bản, đắp hoa nổi 3D, đính pha lê Swarovski chính hãng và hiệu ứng tráng gương chrome.',
  90,
  120.00,
  'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?auto=format&fit=crop&w=800&q=80',
  true,
  true,
  7
),
(
  '30000000-0000-0000-0000-000000000008',
  'Spa Packages',
  'Ultimate Royal Hands & Feet Indulgence',
  'Gói Nghỉ Dưỡng Hoàng Gia Tay & Chân Toàn Diện',
  'Combined deluxe manicure and pedicure with warm paraffin wax dip, hot stone lower leg massage, and collagen gloves.',
  'Kết hợp làm móng tay và chân cao cấp cùng ủ sáp paraffin nóng, massage đá nóng bắp chân và găng tay collagen dưỡng sâu.',
  105,
  145.00,
  'https://images.unsplash.com/photo-1519415510236-718bdfcd89c8?auto=format&fit=crop&w=800&q=80',
  false,
  true,
  8
) ON CONFLICT (id) DO NOTHING;

-- 4. NAIL GALLERY LOOKBOOK
INSERT INTO public.nail_gallery_items (
  id, title_en, title_vi, category_tag, image_url, thumbnail_url, tags, is_featured, display_order
) VALUES
(
  '40000000-0000-0000-0000-000000000001',
  'Ethereal Glazed Donut Chrome',
  'Hiệu Ứng Tráng Gương Chrome Trắng Ngọc Trai',
  'Chrome',
  'https://images.unsplash.com/photo-1632345031435-8727f6897d53?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1632345031435-8727f6897d53?auto=format&fit=crop&w=400&q=80',
  ARRAY['Chrome', 'Minimalist', 'Glazed', 'Hailey Bieber Nails'],
  true,
  1
),
(
  '40000000-0000-0000-0000-000000000002',
  'Pastel French Ombré Almond',
  'Phom Móng Almond Ombré Pastel Tinh Tế',
  'Ombre',
  'https://images.unsplash.com/photo-1599940824399-b87987ceb72a?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1599940824399-b87987ceb72a?auto=format&fit=crop&w=400&q=80',
  ARRAY['Ombre', 'French', 'Almond', 'Nude'],
  true,
  2
),
(
  '40000000-0000-0000-0000-000000000003',
  'Swarovski Crystal Sculpture Stiletto',
  'Móng Nhọn Đính Pha Lê Swarovski Quý Phái',
  '3D Art',
  'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?auto=format&fit=crop&w=400&q=80',
  ARRAY['3D Art', 'Crystals', 'Stiletto', 'Bridal'],
  true,
  3
),
(
  '40000000-0000-0000-0000-000000000004',
  'Sculpted Coffin Marble & Gold Flakes',
  'Móng Dáng Coffin Vân Đá Cẩm Thạch Dát Vàng',
  'Acrylic',
  'https://images.unsplash.com/photo-1604654894610-df63bc536371?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1604654894610-df63bc536371?auto=format&fit=crop&w=400&q=80',
  ARRAY['Acrylic', 'Marble', 'Gold Foil', 'Coffin'],
  true,
  4
),
(
  '40000000-0000-0000-0000-000000000005',
  'Micro-French Burgundy & Rose Gold',
  'Đầu Móng Micro-French Đỏ Rượu & Vàng Hồng',
  'French Tip',
  'https://images.unsplash.com/photo-1519014816548-bf5fe059798b?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1519014816548-bf5fe059798b?auto=format&fit=crop&w=400&q=80',
  ARRAY['French Tip', 'Burgundy', 'Minimalist'],
  false,
  5
),
(
  '40000000-0000-0000-0000-000000000006',
  'Classic Ruby Red SNS Dipping',
  'Móng Nhúng Bột SNS Đỏ Ruby Cổ Điển',
  'SNS Dipping',
  'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=400&q=80',
  ARRAY['SNS Dipping', 'SNS', 'Classic', 'Glossy', 'Short'],
  true,
  6
),
(
  '40000000-0000-0000-0000-000000000007',
  'Emerald Velvet Cat-Eye Polish',
  'Mắt Mèo Nhung Xanh Ngọc Lục Bảo',
  'Gel Art',
  'https://images.unsplash.com/photo-1607779097040-26e80aa78e66?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1607779097040-26e80aa78e66?auto=format&fit=crop&w=400&q=80',
  ARRAY['Gel Art', 'Cat-Eye', 'Velvet', 'Luxury'],
  true,
  7
),
(
  '40000000-0000-0000-0000-000000000008',
  'Natural Nude Blush Dipping Powder',
  'Nhúng Bột SNS Hồng Nude Tự Nhiên Dưỡng Móng',
  'SNS Dipping',
  'https://images.unsplash.com/photo-1599940824399-b87987ceb72a?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1599940824399-b87987ceb72a?auto=format&fit=crop&w=400&q=80',
  ARRAY['SNS Dipping', 'SNS', 'Nude', 'Organic', 'VitaminE'],
  true,
  8
),
(
  '40000000-0000-0000-0000-000000000009',
  'Korean Aurora Glass Gel Art',
  'Nghệ Thuật Móng Gel Cực Quang Trong Suốt Hàn Quốc',
  'Gel Art',
  'https://images.unsplash.com/photo-1632345031435-8727f6897d53?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1632345031435-8727f6897d53?auto=format&fit=crop&w=400&q=80',
  ARRAY['Gel Art', 'Aurora', 'KoreanGlass', 'Glossy'],
  true,
  9
) ON CONFLICT (id) DO NOTHING;

-- 5. PROMOTIONAL ANNOUNCEMENTS
INSERT INTO public.nail_announcements (
  id, title_en, title_vi, content_en, content_vi,
  badge_text_en, badge_text_vi, link_url, start_date, end_date, is_active, priority
) VALUES
(
  '50000000-0000-0000-0000-000000000001',
  'Spring Glow: 15% Off Full Acrylic Sets',
  'Ưu Đãi Mùa Xuân: Giảm 15% Nối Móng Bột Acrylic',
  'Enjoy 15% off any full set acrylic or Russian manicure on Tuesdays and Wednesdays throughout Spring. Quote code SPRING15.',
  'Giảm ngay 15% cho dịch vụ nối móng bột hoặc chăm sóc kiểu Nga vào các ngày Thứ Ba & Thứ Tư suốt mùa xuân. Mã ưu đãi: SPRING15.',
  'Special Promotion',
  'Ưu Đãi Đặc Biệt',
  '/contact',
  now() - interval '2 days',
  now() + interval '30 days',
  true,
  1
),
(
  '50000000-0000-0000-0000-000000000002',
  'Festive Bookings Now Open',
  'Mở Đặt Chỗ Cho Mùa Lễ Hội Cuối Năm',
  'Appointments fill quickly in December! Reserve your Christmas and New Year bespoke nail sessions early to guarantee your preferred time slot.',
  'Lịch hẹn tháng 12 thường kín rất sớm! Quý khách vui lòng đặt chỗ trước để giữ khung giờ làm đẹp ưng ý nhất cho mùa Giáng Sinh và Năm Mới.',
  'Notice',
  'Thông Báo',
  '/contact',
  now() - interval '1 day',
  now() + interval '60 days',
  true,
  2
) ON CONFLICT (id) DO NOTHING;

-- 6. STAFF MEMBERS
INSERT INTO public.staff_members (
  id, full_name, email, phone, role, employment_type, bio_en, bio_vi, avatar_url, is_active, hire_date
) VALUES
(
  '60000000-0000-0000-0000-000000000001',
  'Chloe Nguyen',
  'chloe.nguyen@glamournails.com.au',
  '+61 411 222 333',
  'owner',
  'Full-time',
  'Master nail artist with over 10 years experience across Sydney and Melbourne salons. Certified Russian E-file instructor and 3D sculpting specialist.',
  'Nghệ nhân móng bậc thầy với hơn 10 năm kinh nghiệm tại Sydney và Melbourne. Giảng viên kỹ thuật E-file chuẩn Nga và chuyên gia đắp hoa nổi 3D.',
  'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=400&q=80',
  true,
  '2022-01-15'
),
(
  '60000000-0000-0000-0000-000000000002',
  'Sarah Tran',
  'sarah.tran@glamournails.com.au',
  '+61 422 333 444',
  'manager',
  'Full-time',
  'Salon manager and client care expert. Specialist in high-end SNS dipping powder applications and organic spa pedicure treatments.',
  'Quản lý salon và chuyên viên chăm sóc khách hàng tận tâm. Chuyên sâu về nhúng bột SNS dưỡng móng và trị liệu spa chân thảo mộc.',
  'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=400&q=80',
  true,
  '2022-06-01'
),
(
  '60000000-0000-0000-0000-000000000003',
  'Jessica Lee',
  'jessica.lee@glamournails.com.au',
  '+61 433 444 555',
  'senior_technician',
  'Full-time',
  'Senior acrylic extensions and Swarovski crystal designer known for flawless sculpted coffin and stiletto sets.',
  'Kỹ thuật viên cao cấp về đắp bột acrylic và thiết kế pha lê Swarovski với những bộ móng phom coffin và stiletto sắc nét.',
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
  true,
  '2023-03-10'
),
(
  '60000000-0000-0000-0000-000000000004',
  'Mai Pham',
  'mai.pham@glamournails.com.au',
  '+61 444 555 666',
  'technician',
  'Part-time',
  'Gel nail art specialist with a gentle touch, specializing in Korean-style minimalist art, chrome finishes, and natural nail care.',
  'Chuyên viên nghệ thuật sơn gel phong cách Hàn Quốc, phủ tráng gương chrome và chăm sóc móng tự nhiên tỉ mỉ.',
  'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=400&q=80',
  true,
  '2023-09-01'
) ON CONFLICT (id) DO NOTHING;

-- 7. STAFF SPECIALIZATIONS
INSERT INTO public.staff_specializations (id, staff_id, specialization, proficiency_level) VALUES
('70000000-0000-0000-0000-000000000001', '60000000-0000-0000-0000-000000000001', 'Russian E-File Manicure', 'master'),
('70000000-0000-0000-0000-000000000002', '60000000-0000-0000-0000-000000000001', '3D Nail Sculpture', 'master'),
('70000000-0000-0000-0000-000000000003', '60000000-0000-0000-0000-000000000002', 'SNS Dipping Powder', 'expert'),
('70000000-0000-0000-0000-000000000004', '60000000-0000-0000-0000-000000000002', 'Deluxe Herbal Spa Pedicure', 'expert'),
('70000000-0000-0000-0000-000000000005', '60000000-0000-0000-0000-000000000003', 'Acrylic Extensions & Ombré', 'master'),
('70000000-0000-0000-0000-000000000006', '60000000-0000-0000-0000-000000000004', 'Gel Art & Chrome Glaze', 'expert')
ON CONFLICT (id) DO NOTHING;

-- 8. CRM CUSTOMERS
INSERT INTO public.crm_customers (
  id, full_name, phone, email, address, preferred_language,
  nail_shape_preference, preferred_services, allergies_sensitivities, general_notes,
  total_visits, total_spent_aud, first_visit_date, last_visit_date
) VALUES
(
  '80000000-0000-0000-0000-000000000001',
  'Emily Watson',
  '0412 345 678',
  'emily.watson@sydney.com.au',
  '120 Crown Street, Surry Hills NSW 2010',
  'en',
  'Almond',
  ARRAY['SNS Dipping Powder', 'Chrome'],
  'Sensitive to acetone soak-offs; prefers peel-base or foil wrap.',
  'VIP client. Prefers green tea and quiet appointments.',
  0, 0.00, NULL, NULL
),
(
  '80000000-0000-0000-0000-000000000002',
  'Nguyễn Thị Lan Anh',
  '0423 456 789',
  'lananh.nguyen@yahoo.com',
  '45 Victoria Avenue, Chatswood NSW 2067',
  'vi',
  'Coffin',
  ARRAY['Acrylic & Extensions', '3D Nail Sculpture'],
  NULL,
  'Yêu thích phong cách vẽ hoa nổi 3D và đính đá lấp lánh cho dịp tiệc.',
  0, 0.00, NULL, NULL
),
(
  '80000000-0000-0000-0000-000000000003',
  'Olivia Davies',
  '0434 567 890',
  'olivia.davies@outlook.com.au',
  '88 Elizabeth Bay Road, Elizabeth Bay NSW 2011',
  'en',
  'Square',
  ARRAY['Russian E-File Manicure', 'Pedicure'],
  'Mild latex allergy. Ensure vinyl/nitrile gloves only.',
  'Works in corporate finance; loves minimalist micro-french tips.',
  0, 0.00, NULL, NULL
),
(
  '80000000-0000-0000-0000-000000000004',
  'Trần Hương Giang',
  '0445 678 901',
  'huonggiang.tran@gmail.com',
  '12 Railway Parade, Cabramatta NSW 2166',
  'vi',
  'Oval',
  ARRAY['SNS & Dipping'],
  NULL,
  'Thường xuyên đặt hẹn vào chiều Thứ Bảy cùng bạn thân.',
  0, 0.00, NULL, NULL
) ON CONFLICT (id) DO NOTHING;

-- 9. CRM CONSULTATIONS (Public Web Leads & Appointments)
INSERT INTO public.crm_consultations (
  id, customer_id, customer_name, phone, email, preferred_language,
  preferred_date, preferred_time, service_requested_id, services_requested, notes, status, source
) VALUES
(
  '90000000-0000-0000-0000-000000000001',
  '80000000-0000-0000-0000-000000000001',
  'Emily Watson',
  '0412 345 678',
  'emily.watson@sydney.com.au',
  'en',
  CURRENT_DATE + 2,
  '14:00',
  '30000000-0000-0000-0000-000000000003',
  ARRAY['SNS Dipping Powder Full Set', 'Chrome Finish'],
  'Wanting a subtle glazed donut chrome over sheer nude SNS for an engagement party.',
  'booked',
  'web_form'
),
(
  '90000000-0000-0000-0000-000000000002',
  '80000000-0000-0000-0000-000000000002',
  'Nguyễn Thị Lan Anh',
  '0423 456 789',
  'lananh.nguyen@yahoo.com',
  'vi',
  CURRENT_DATE + 4,
  '11:30',
  '30000000-0000-0000-0000-000000000005',
  ARRAY['Signature Ombré French Acrylic Set'],
  'Cần tư vấn làm móng cưới, phom coffin độ dài vừa phải.',
  'contacted',
  'web_form'
),
(
  '90000000-0000-0000-0000-000000000003',
  NULL,
  'Charlotte Taylor',
  '0456 789 012',
  'charlotte.taylor@gmail.com',
  'en',
  CURRENT_DATE + 1,
  '16:30',
  '30000000-0000-0000-0000-000000000006',
  ARRAY['Russian E-File Precision Manicure'],
  'First time trying a Russian manicure. Recommended by a colleague.',
  'new',
  'web_form'
) ON CONFLICT (id) DO NOTHING;

-- 10. CRM VISIT HISTORY (Service Visits & Trigger Stats Recalculation)
INSERT INTO public.crm_visit_history (
  id, customer_id, staff_id, service_id, visit_date,
  price_charged_aud, tip_aud, payment_method, notes, rating, photo_urls
) VALUES
(
  'a0000000-0000-0000-0000-000000000001',
  '80000000-0000-0000-0000-000000000001',
  '60000000-0000-0000-0000-000000000002',
  '30000000-0000-0000-0000-000000000003',
  CURRENT_DATE - interval '14 days',
  60.00,
  5.00,
  'card',
  'Fresh SNS nude set. Client thrilled with gentle cuticle treatment.',
  5,
  ARRAY['https://images.unsplash.com/photo-1632345031435-8727f6897d53?auto=format&fit=crop&w=800&q=80']
),
(
  'a0000000-0000-0000-0000-000000000002',
  '80000000-0000-0000-0000-000000000002',
  '60000000-0000-0000-0000-000000000001',
  '30000000-0000-0000-0000-000000000005',
  CURRENT_DATE - interval '10 days',
  85.00,
  10.00,
  'eftpos',
  'Ombré full set with 2 accent 3D flowers. Client booked next infill.',
  5,
  ARRAY['https://images.unsplash.com/photo-1599940824399-b87987ceb72a?auto=format&fit=crop&w=800&q=80']
),
(
  'a0000000-0000-0000-0000-000000000003',
  '80000000-0000-0000-0000-000000000003',
  '60000000-0000-0000-0000-000000000001',
  '30000000-0000-0000-0000-000000000006',
  CURRENT_DATE - interval '7 days',
  80.00,
  10.00,
  'card',
  'Russian dry manicure with sheer BIAB gel overlay.',
  5,
  ARRAY[]::text[]
) ON CONFLICT (id) DO NOTHING;

-- 11. FINANCE CATEGORIES
INSERT INTO public.finance_categories (
  id, name, type, description, is_tax_deductible, is_default, display_order
) VALUES
-- Income Categories
('b0000000-0000-0000-0000-000000000001', 'Salon Services', 'income', 'Revenue from manicure, pedicure, acrylic, SNS, and nail art', false, true, 1),
('b0000000-0000-0000-0000-000000000002', 'Retail Product Sales', 'income', 'Cuticle oils, hand creams, and nail care kits', false, false, 2),
('b0000000-0000-0000-0000-000000000003', 'Gift Cards', 'income', 'Sales of electronic and physical salon vouchers', false, false, 3),
('b0000000-0000-0000-0000-000000000004', 'Tips & Gratuities', 'income', 'Customer tips collected for technicians', false, false, 4),
-- Expense Categories
('b0000000-0000-0000-0000-000000000005', 'Rent & Salon Outgoings', 'expense', 'Commercial retail premises lease and council rates', true, true, 1),
('b0000000-0000-0000-0000-000000000006', 'Salon Supplies & Inventory', 'expense', 'Acrylic powders, monomers, gel polishes, tips, acetone, and sanitizers', true, true, 2),
('b0000000-0000-0000-0000-000000000007', 'Staff Wages & Superannuation', 'expense', 'Employee payroll wages, PAYG withholding, and 11.5% SG superannuation', true, true, 3),
('b0000000-0000-0000-0000-000000000008', 'Utilities (Electricity & Water)', 'expense', 'Electricity for autoclave & dryers, hot water and internet', true, false, 4),
('b0000000-0000-0000-0000-000000000009', 'Marketing & Social Ads', 'expense', 'Instagram/TikTok local promotion and Google Business ads', true, false, 5),
('b0000000-0000-0000-0000-000000000010', 'Merchant & Bank Fees', 'expense', 'EFTPOS terminal fees and card processing transaction surcharges', true, false, 6)
ON CONFLICT (id) DO NOTHING;

-- 12. FINANCE TRANSACTIONS (Revenues & Operating Expenses with Australian GST breakdown)
-- GST inclusive in Australia: gst = amount / 11
INSERT INTO public.finance_transactions (
  id, transaction_date, type, category_id, amount_aud, gst_amount_aud,
  payment_method, description, reference_id, customer_id, staff_id
) VALUES
-- Revenue Transactions (Linked to Visits)
(
  'c0000000-0000-0000-0000-000000000001',
  CURRENT_DATE - interval '14 days',
  'income',
  'b0000000-0000-0000-0000-000000000001',
  65.00,
  5.91, -- 65 / 11
  'card',
  'Service visit: SNS Dipping Powder Full Set + Tip ($60 + $5)',
  'a0000000-0000-0000-0000-000000000001',
  '80000000-0000-0000-0000-000000000001',
  '60000000-0000-0000-0000-000000000002'
),
(
  'c0000000-0000-0000-0000-000000000002',
  CURRENT_DATE - interval '10 days',
  'income',
  'b0000000-0000-0000-0000-000000000001',
  95.00,
  8.64, -- 95 / 11
  'eftpos',
  'Service visit: Ombré Full Set Acrylic + Tip ($85 + $10)',
  'a0000000-0000-0000-0000-000000000002',
  '80000000-0000-0000-0000-000000000002',
  '60000000-0000-0000-0000-000000000001'
),
(
  'c0000000-0000-0000-0000-000000000003',
  CURRENT_DATE - interval '7 days',
  'income',
  'b0000000-0000-0000-0000-000000000001',
  90.00,
  8.18, -- 90 / 11
  'card',
  'Service visit: Russian E-File Manicure + Tip ($80 + $10)',
  'a0000000-0000-0000-0000-000000000003',
  '80000000-0000-0000-0000-000000000003',
  '60000000-0000-0000-0000-000000000001'
),
(
  'c0000000-0000-0000-0000-000000000004',
  CURRENT_DATE - interval '5 days',
  'income',
  'b0000000-0000-0000-0000-000000000002',
  70.00,
  6.36, -- 70 / 11
  'card',
  'Retail sale: 2x Organic Cuticle Oil Bottles + Australian Hand Hydration Cream',
  NULL,
  '80000000-0000-0000-0000-000000000001',
  '60000000-0000-0000-0000-000000000002'
),
-- Expense Transactions (Operational salon outgoings)
(
  'c0000000-0000-0000-0000-000000000005',
  CURRENT_DATE - interval '15 days',
  'expense',
  'b0000000-0000-0000-0000-000000000006',
  480.00,
  43.64, -- 480 / 11
  'bank_transfer',
  'Wholesale Restock: Young Nails Acrylic Liquids, Kiara Sky Dipping Powders, Gelish Top Coats',
  NULL,
  NULL,
  '60000000-0000-0000-0000-000000000001'
),
(
  'c0000000-0000-0000-0000-000000000006',
  CURRENT_DATE - interval '12 days',
  'expense',
  'b0000000-0000-0000-0000-000000000008',
  165.00,
  15.00, -- 165 / 11
  'bank_transfer',
  'Energy Australia: Electricity & Hot Water for Salon Sydney CBD',
  NULL,
  NULL,
  '60000000-0000-0000-0000-000000000001'
),
(
  'c0000000-0000-0000-0000-000000000007',
  CURRENT_DATE - interval '8 days',
  'expense',
  'b0000000-0000-0000-0000-000000000009',
  110.00,
  10.00, -- 110 / 11
  'card',
  'Meta Advertising: Sydney CBD Instagram Sponsored Promo for Spring Nails',
  NULL,
  NULL,
  '60000000-0000-0000-0000-000000000002'
),
(
  'c0000000-0000-0000-0000-000000000008',
  CURRENT_DATE - interval '3 days',
  'expense',
  'b0000000-0000-0000-0000-000000000010',
  42.50,
  3.86, -- 42.50 / 11
  'bank_transfer',
  'Tyro EFTPOS: Monthly terminal lease & card processing fee',
  NULL,
  NULL,
  '60000000-0000-0000-0000-000000000001'
) ON CONFLICT (id) DO NOTHING;
