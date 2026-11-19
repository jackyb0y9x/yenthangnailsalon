'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Users,
  Shield,
  Plus,
  Search,
  Phone,
  Mail,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  X,
  Award,
  TrendingUp,
  Briefcase,
  ToggleLeft,
  ToggleRight,
  DollarSign,
  Calendar,
  Sparkles,
} from 'lucide-react';
import { isValidAustralianMobile } from '@/lib/utils/validation';
import { removeVietnameseDiacritics, matchesPhoneSearch } from '@/lib/utils/vietnamese';
import { ImageUploader } from '@/components/admin/ImageUploader';
import { useAdminLanguage } from '@/lib/i18n/AdminLanguageContext';

interface StaffMember {
  id: string;
  name: string;
  full_name: string;
  phone: string;
  email: string;
  role: 'super_admin' | 'manager' | 'staff' | string;
  employment_type: 'Full-time' | 'Part-time' | 'Casual' | 'Contractor';
  specializations: string[];
  is_active: boolean;
  hire_date?: string;
  bio_en?: string | null;
  bio_vi?: string | null;
  avatar_url?: string | null;
  image_url?: string | null;
}

interface ProductivityMetrics {
  staff_id: string;
  completed_visits: number;
  total_revenue_cents: number;
  total_revenue_aud: number;
  average_ticket_aud: number;
}

const ALL_SPECIALIZATIONS = [
  'Acrylic Extensions',
  '3D Nail Art',
  'Ombre',
  'Russian Manicure',
  'SNS Dip',
  'E-File',
  'Gel Art & Design',
  'Luxury Pedicure',
];

const EMPLOYMENT_TYPES: Array<'Full-time' | 'Part-time' | 'Casual' | 'Contractor'> = [
  'Full-time',
  'Part-time',
  'Casual',
  'Contractor',
];

export default function AdminStaffPortal() {
  const { locale } = useAdminLanguage();
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [activeOnlyFilter, setActiveOnlyFilter] = useState(false);

  // Add/Edit Staff Modal
  const [isStaffModalOpen, setIsStaffModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);
  const [staffForm, setStaffForm] = useState({
    full_name: '',
    phone: '',
    email: '',
    role: 'staff',
    employment_type: 'Full-time' as 'Full-time' | 'Part-time' | 'Casual' | 'Contractor',
    specializations: [] as string[],
    avatar_url: '',
    bio_en: '',
    bio_vi: '',
  });

  // Productivity Modal State
  const [isProductivityModalOpen, setIsProductivityModalOpen] = useState(false);
  const [selectedStaffForProductivity, setSelectedStaffForProductivity] = useState<StaffMember | null>(null);
  const [productivityMetrics, setProductivityMetrics] = useState<ProductivityMetrics | null>(null);
  const [loadingProductivity, setLoadingProductivity] = useState(false);

  const fetchStaff = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/staff');
      const data = await res.json();
      if (data.success) {
        setStaffList(data.staff || []);
      } else {
        setFeedback({ type: 'error', message: data.error || 'Failed to fetch staff members.' });
      }
    } catch {
      setFeedback({ type: 'error', message: 'Network error fetching staff.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStaff();
  }, []);

  const openStaffModal = (staff?: StaffMember) => {
    if (staff) {
      setEditingStaff(staff);
      setStaffForm({
        full_name: staff.full_name || staff.name,
        phone: staff.phone,
        email: staff.email,
        role: staff.role,
        employment_type: staff.employment_type || 'Full-time',
        specializations: staff.specializations || [],
        avatar_url: staff.avatar_url || staff.image_url || '',
        bio_en: staff.bio_en || '',
        bio_vi: staff.bio_vi || '',
      });
    } else {
      setEditingStaff(null);
      setStaffForm({
        full_name: '',
        phone: '',
        email: '',
        role: 'staff',
        employment_type: 'Full-time',
        specializations: ['Russian Manicure', 'SNS Dip'],
        avatar_url: '',
        bio_en: '',
        bio_vi: '',
      });
    }
    setIsStaffModalOpen(true);
  };

  const handleSaveStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!staffForm.full_name || staffForm.full_name.trim().length < 2) {
      setFeedback({
        type: 'error',
        message: locale === 'vi' ? 'Họ và tên nhân viên phải có ít nhất 2 ký tự.' : 'Staff name must be at least 2 characters.',
      });
      return;
    }
    if (staffForm.phone && !isValidAustralianMobile(staffForm.phone)) {
      setFeedback({
        type: 'error',
        message:
          locale === 'vi'
            ? 'Vui lòng nhập số điện thoại Úc hợp lệ (ví dụ: 0422 123 456).'
            : 'Please enter a valid Australian mobile (e.g. 0422 123 456).',
      });
      return;
    }

    try {
      const endpoint = editingStaff ? `/api/admin/staff/${editingStaff.id}` : '/api/admin/staff';
      const method = editingStaff ? 'PUT' : 'POST';

      const payload = {
        ...staffForm,
        name: staffForm.full_name.trim(),
        full_name: staffForm.full_name.trim(),
        avatar_url: staffForm.avatar_url?.trim() || null,
        image_url: staffForm.avatar_url?.trim() || null,
      };

      const res = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success) {
        setFeedback({
          type: 'success',
          message: editingStaff
            ? (locale === 'vi' ? 'Đã cập nhật hồ sơ nhân viên thành công.' : 'Staff profile updated successfully.')
            : (locale === 'vi' ? 'Đã đăng ký thêm nhân viên mới thành công.' : 'Staff member registered successfully.'),
        });
        setIsStaffModalOpen(false);
        fetchStaff();
      } else {
        setFeedback({ type: 'error', message: data.error || 'Failed to save staff member.' });
      }
    } catch {
      setFeedback({ type: 'error', message: 'Network error saving staff member.' });
    }
  };

  const handleDeleteStaff = async (staff: StaffMember) => {
    const confirmMsg =
      locale === 'vi'
        ? `Bạn có chắc chắn muốn xóa nhân viên "${staff.name || staff.full_name}" khỏi danh sách không?`
        : `Are you sure you want to remove staff member "${staff.name || staff.full_name}"?`;
    if (!confirm(confirmMsg)) return;

    try {
      const res = await fetch(`/api/admin/staff/${staff.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setFeedback({
          type: 'success',
          message:
            locale === 'vi'
              ? `Đã xóa nhân viên ${staff.name || staff.full_name} thành công.`
              : `Staff member ${staff.name || staff.full_name} deleted successfully.`,
        });
        fetchStaff();
      } else {
        setFeedback({ type: 'error', message: data.error || 'Failed to delete staff member.' });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Network error deleting staff.' });
    }
  };

  const handleToggleStatus = async (staff: StaffMember) => {
    const nextStatus = !staff.is_active;
    try {
      const res = await fetch(`/api/admin/staff/${staff.id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: nextStatus }),
      });
      const data = await res.json();
      if (data.success) {
        setFeedback({
          type: 'success',
          message: `${staff.name} is now ${nextStatus ? 'active' : 'inactive'}.`,
        });
        fetchStaff();
      } else {
        setFeedback({ type: 'error', message: data.error || 'Failed to update status.' });
      }
    } catch {
      setFeedback({ type: 'error', message: 'Network error updating status.' });
    }
  };

  const openProductivityModal = async (staff: StaffMember) => {
    setSelectedStaffForProductivity(staff);
    setLoadingProductivity(true);
    setIsProductivityModalOpen(true);
    try {
      const res = await fetch(`/api/admin/staff/${staff.id}/productivity`);
      const data = await res.json();
      if (data.success) {
        setProductivityMetrics(data);
      } else {
        setFeedback({ type: 'error', message: data.error || 'Failed to load productivity metrics.' });
      }
    } catch {
      setFeedback({ type: 'error', message: 'Network error loading productivity metrics.' });
    } finally {
      setLoadingProductivity(false);
    }
  };

  const filteredStaff = useMemo(() => {
    return staffList.filter((s) => {
      if (activeOnlyFilter && !s.is_active) return false;
      if (roleFilter !== 'all' && s.role !== roleFilter) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.trim();
        const normQ = removeVietnameseDiacritics(q).toLowerCase();
        const qWords = normQ.split(/\s+/).filter(Boolean);

        const staffName = s.full_name || s.name || '';
        const normName = removeVietnameseDiacritics(staffName).toLowerCase();
        const normEmail = removeVietnameseDiacritics(s.email || '').toLowerCase();
        const normRole = (s.role || '').toLowerCase();

        const nameMatches = qWords.length === 0 || qWords.every((word) => normName.includes(word));
        const emailMatches = normEmail.includes(normQ);
        const roleMatches = normRole.includes(normQ);
        const phoneMatches = matchesPhoneSearch(s.phone, q);
        const specMatches =
          Array.isArray(s.specializations) &&
          s.specializations.some((spec) => removeVietnameseDiacritics(spec).toLowerCase().includes(normQ));

        return nameMatches || emailMatches || roleMatches || phoneMatches || specMatches;
      }

      return true;
    });
  }, [staffList, activeOnlyFilter, roleFilter, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Top Banner & Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <Shield className="w-6 h-6 text-purple-400" />
            {locale === 'vi' ? 'Quản Lý Đội Ngũ Nhân Viên & Năng Suất' : 'Staff Roster & Productivity'}
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            {locale === 'vi'
              ? 'Quản lý hồ sơ nhân viên, phân quyền truy cập, danh mục tay nghề chuyên môn và chỉ số năng suất doanh thu.'
              : 'Manage employee profiles, role-based access control, specialized salon skill sets, and revenue performance attribution.'}
          </p>
        </div>

        <button
          onClick={() => openStaffModal()}
          className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white font-medium rounded-lg text-sm transition-colors shadow-lg shadow-purple-900/30"
        >
          <Plus className="w-4 h-4" />
          {locale === 'vi' ? 'Thêm Nhân Viên' : 'Add Staff Member'}
        </button>
      </div>

      {/* Global Feedback Banner */}
      {feedback && (
        <div
          className={`flex items-center justify-between p-4 rounded-lg border text-sm font-medium ${
            feedback.type === 'success'
              ? 'bg-emerald-950/70 border-emerald-800 text-emerald-300'
              : 'bg-rose-950/70 border-rose-800 text-rose-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-rose-400" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Filter & Search Toolbar */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={
              locale === 'vi'
                ? 'Tìm tên nhân viên, email, kỹ năng, SĐT...'
                : 'Search technician name, email, role, skill...'
            }
            className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          {/* Role Filter */}
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 text-slate-300 text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-purple-500"
          >
            <option value="all">{locale === 'vi' ? 'Tất Cả Vai Trò' : 'All Roles'}</option>
            <option value="super_admin">{locale === 'vi' ? 'Chủ Tiệm (Super Admin)' : 'Super Admin'}</option>
            <option value="manager">{locale === 'vi' ? 'Quản Lý (Manager)' : 'Manager'}</option>
            <option value="staff">{locale === 'vi' ? 'Kỹ Thuật Viên (Staff)' : 'Staff / Technician'}</option>
          </select>

          {/* Active Status Filter */}
          <button
            onClick={() => setActiveOnlyFilter(!activeOnlyFilter)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
              activeOnlyFilter
                ? 'bg-purple-950 border-purple-500 text-purple-300 shadow-sm'
                : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            {locale === 'vi' ? 'Đang Hoạt Động' : 'Active Only'}
          </button>
        </div>
      </div>

      {/* Staff Roster Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-950 border-b border-slate-800 text-xs uppercase tracking-wider text-slate-400">
              <tr>
                <th className="px-5 py-3">{locale === 'vi' ? 'Hồ Sơ Kỹ Thuật Viên' : 'Technician Profile'}</th>
                <th className="px-5 py-3">{locale === 'vi' ? 'Vai Trò & Hợp Đồng' : 'Role & Employment'}</th>
                <th className="px-5 py-3">{locale === 'vi' ? 'Kỹ Năng & Tay Nghề' : 'Specializations'}</th>
                <th className="px-5 py-3 text-center">{locale === 'vi' ? 'Trạng Thái' : 'Status'}</th>
                <th className="px-5 py-3 text-right">{locale === 'vi' ? 'Thao Tác' : 'Actions'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-slate-500">
                    {locale === 'vi' ? 'Đang tải danh sách nhân sự...' : 'Loading staff directory...'}
                  </td>
                </tr>
              ) : filteredStaff.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-slate-500">
                    {locale === 'vi' ? 'Không tìm thấy nhân viên phù hợp.' : 'No staff records found matching your filters.'}
                  </td>
                </tr>
              ) : (
                filteredStaff.map((staff) => {
                  const roleColors: Record<string, string> = {
                    super_admin: 'bg-purple-950 text-purple-300 border-purple-700',
                    manager: 'bg-amber-950 text-amber-300 border-amber-700',
                    staff: 'bg-blue-950 text-blue-300 border-blue-700',
                    owner: 'bg-purple-950 text-purple-300 border-purple-700',
                    senior_technician: 'bg-emerald-950 text-emerald-300 border-emerald-700',
                    technician: 'bg-blue-950 text-blue-300 border-blue-700',
                  };

                  return (
                    <tr
                      key={staff.id}
                      className={`hover:bg-slate-800/40 transition-colors ${
                        !staff.is_active ? 'opacity-60 bg-slate-950/40' : ''
                      }`}
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          {staff.avatar_url || staff.image_url ? (
                            <img
                              src={staff.avatar_url || staff.image_url!}
                              alt={staff.name || staff.full_name}
                              className="w-10 h-10 rounded-full object-cover border border-purple-500/50 shrink-0"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-white text-xs shrink-0">
                              {(staff.name || staff.full_name || 'NV')
                                .split(' ')
                                .map((n) => n[0])
                                .join('')
                                .slice(0, 2)
                                .toUpperCase()}
                            </div>
                          )}
                          <div>
                            <span className="font-semibold text-white block">
                              {staff.name || staff.full_name}
                            </span>
                            <div className="text-xs text-slate-400 space-y-0.5 mt-0.5 font-mono">
                              <span className="flex items-center gap-1">
                                <Phone className="w-3 h-3 text-purple-400" />
                                {staff.phone}
                              </span>
                              <span className="flex items-center gap-1">
                                <Mail className="w-3 h-3 text-slate-500" />
                                {staff.email}
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <div className="space-y-1">
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider border ${
                              roleColors[staff.role] || 'bg-slate-800 text-slate-300'
                            }`}
                          >
                            {staff.role}
                          </span>
                          <span className="block text-xs text-slate-400">
                            {staff.employment_type}
                          </span>
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex flex-wrap gap-1 max-w-sm">
                          {staff.specializations && staff.specializations.length > 0 ? (
                            staff.specializations.map((spec, i) => (
                              <span
                                key={i}
                                className="px-2 py-0.5 rounded bg-slate-800 text-purple-300 border border-slate-700 text-xs"
                              >
                                {spec}
                              </span>
                            ))
                          ) : (
                            <span className="text-xs text-slate-500">General Services</span>
                          )}
                        </div>
                      </td>

                      <td className="px-5 py-4 text-center">
                        <button
                          onClick={() => handleToggleStatus(staff)}
                          className="inline-flex items-center gap-1 text-xs font-semibold"
                          title="Click to toggle active status"
                        >
                          {staff.is_active ? (
                            <span className="inline-flex items-center gap-1 text-emerald-400">
                              <ToggleRight className="w-5 h-5 text-emerald-400" />
                              Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-slate-500">
                              <ToggleLeft className="w-5 h-5 text-slate-500" />
                              Inactive
                            </span>
                          )}
                        </button>
                      </td>

                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => openProductivityModal(staff)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-emerald-400 text-xs font-medium transition-colors"
                            title={locale === 'vi' ? 'Năng suất' : 'Productivity KPIs'}
                          >
                            <TrendingUp className="w-3.5 h-3.5" />
                            {locale === 'vi' ? 'Năng suất' : 'Productivity'}
                          </button>
                          <button
                            onClick={() => openStaffModal(staff)}
                            className="p-1.5 rounded hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                            title={locale === 'vi' ? 'Chỉnh sửa' : 'Edit Profile'}
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteStaff(staff)}
                            className="p-1.5 rounded hover:bg-red-950/60 text-red-400 hover:text-red-300 transition-colors"
                            title={locale === 'vi' ? 'Xóa nhân viên' : 'Delete Staff'}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Staff Create/Edit Modal */}
      {isStaffModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b border-slate-800">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Shield className="w-5 h-5 text-purple-400" />
                {editingStaff
                  ? (locale === 'vi' ? 'Cập Nhật Hồ Sơ Nhân Viên' : 'Edit Staff Member')
                  : (locale === 'vi' ? 'Thêm Kỹ Thuật Viên Mới' : 'Register New Staff Member')}
              </h2>
              <button onClick={() => setIsStaffModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveStaff} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              {/* Photo Upload & Preview */}
              <div className="space-y-2 pb-3 border-b border-slate-800">
                <label className="block text-xs font-semibold text-slate-300 uppercase">
                  {locale === 'vi' ? 'Ảnh Đại Diện Kỹ Thuật Viên' : 'Staff Avatar / Photo'}
                </label>
                <ImageUploader
                  bucket="staff"
                  currentImageUrl={staffForm.avatar_url}
                  onUploadSuccess={(url) => setStaffForm({ ...staffForm, avatar_url: url })}
                  label={locale === 'vi' ? 'Tải Ảnh Lên (hoặc chọn tệp)' : 'Upload Staff Photo'}
                />
                <div>
                  <input
                    type="text"
                    value={staffForm.avatar_url}
                    onChange={(e) => setStaffForm({ ...staffForm, avatar_url: e.target.value })}
                    placeholder={locale === 'vi' ? 'Đường dẫn ảnh đã tải lên hoặc URL ảnh trực tiếp...' : 'Uploaded image path or direct image URL...'}
                    className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-600 focus:outline-none focus:border-purple-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                  {locale === 'vi' ? 'Họ Và Tên *' : 'Full Name *'}
                </label>
                <input
                  type="text"
                  required
                  value={staffForm.full_name}
                  onChange={(e) => setStaffForm({ ...staffForm, full_name: e.target.value })}
                  placeholder="e.g. Kevin Pham"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                    {locale === 'vi' ? 'Số Điện Thoại (Úc)' : 'Phone Number (AU)'}
                  </label>
                  <input
                    type="text"
                    value={staffForm.phone}
                    onChange={(e) => setStaffForm({ ...staffForm, phone: e.target.value })}
                    placeholder="0422 123 456"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white focus:outline-none focus:border-purple-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                    {locale === 'vi' ? 'Email Liên Hệ' : 'Email Address'}
                  </label>
                  <input
                    type="email"
                    value={staffForm.email}
                    onChange={(e) => setStaffForm({ ...staffForm, email: e.target.value })}
                    placeholder="staff@glamournails.com.au"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                    {locale === 'vi' ? 'Vai Trò Phân Quyền' : 'System Role'}
                  </label>
                  <select
                    value={staffForm.role}
                    onChange={(e) => setStaffForm({ ...staffForm, role: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white focus:outline-none focus:border-purple-500"
                  >
                    <option value="staff">{locale === 'vi' ? 'Kỹ thuật viên / Thợ nail' : 'Staff / Technician'}</option>
                    <option value="manager">{locale === 'vi' ? 'Quản lý tiệm (Manager)' : 'Manager'}</option>
                    <option value="super_admin">{locale === 'vi' ? 'Chủ tiệm (Super Admin)' : 'Super Admin'}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                    {locale === 'vi' ? 'Hình Thức Hợp Đồng' : 'Employment Type'}
                  </label>
                  <select
                    value={staffForm.employment_type}
                    onChange={(e) =>
                      setStaffForm({
                        ...staffForm,
                        employment_type: e.target.value as any,
                      })
                    }
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white focus:outline-none focus:border-purple-500"
                  >
                    {EMPLOYMENT_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Bio fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                    {locale === 'vi' ? 'Giới Thiệu Ngắn (Tiếng Anh)' : 'Bio / Short Intro (EN)'}
                  </label>
                  <textarea
                    rows={2}
                    value={staffForm.bio_en}
                    onChange={(e) => setStaffForm({ ...staffForm, bio_en: e.target.value })}
                    placeholder="Master technician with 5+ years experience in Russian manicure..."
                    className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-600 focus:outline-none focus:border-purple-500 resize-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                    {locale === 'vi' ? 'Giới Thiệu Ngắn (Tiếng Việt)' : 'Bio / Short Intro (VI)'}
                  </label>
                  <textarea
                    rows={2}
                    value={staffForm.bio_vi}
                    onChange={(e) => setStaffForm({ ...staffForm, bio_vi: e.target.value })}
                    placeholder="Kỹ thuật viên cao cấp với hơn 5 năm kinh nghiệm móng phong cách Nga..."
                    className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-600 focus:outline-none focus:border-purple-500 resize-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-2">
                  {locale === 'vi' ? 'Kỹ Năng & Phong Cách Chuyên Sâu' : 'Specializations & Technique Tags'}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {ALL_SPECIALIZATIONS.map((spec) => {
                    const isSelected = staffForm.specializations.includes(spec);
                    return (
                      <button
                        type="button"
                        key={spec}
                        onClick={() => {
                          const next = isSelected
                            ? staffForm.specializations.filter((s) => s !== spec)
                            : [...staffForm.specializations, spec];
                          setStaffForm({ ...staffForm, specializations: next });
                        }}
                        className={`py-2 px-3 text-xs font-medium rounded-lg border text-left transition-all ${
                          isSelected
                            ? 'bg-purple-950 border-purple-500 text-purple-200'
                            : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        {isSelected ? '✓ ' : '+ '}
                        {spec}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsStaffModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-sm"
                >
                  {locale === 'vi' ? 'Hủy Bỏ' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-500 text-white font-medium rounded-lg text-sm shadow-lg shadow-purple-900/30"
                >
                  {editingStaff
                    ? (locale === 'vi' ? 'Lưu Thay Đổi' : 'Save Changes')
                    : (locale === 'vi' ? 'Đăng Ký Nhân Viên' : 'Register Member')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Staff Productivity & KPI Analytics Modal */}
      {isProductivityModalOpen && selectedStaffForProductivity && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b border-slate-800">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-emerald-400" />
                  Productivity: {selectedStaffForProductivity.name}
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Attributed visit treatments and generated salon revenue
                </p>
              </div>
              <button
                onClick={() => setIsProductivityModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {loadingProductivity ? (
                <div className="py-8 text-center text-xs text-slate-500">
                  Calculating productivity metrics...
                </div>
              ) : productivityMetrics ? (
                <>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 text-center">
                      <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                        Completed
                      </span>
                      <p className="text-2xl font-extrabold text-white mt-1">
                        {productivityMetrics.completed_visits}
                      </p>
                      <span className="text-[10px] text-slate-400">Visits</span>
                    </div>

                    <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 text-center">
                      <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                        Revenue
                      </span>
                      <p className="text-2xl font-extrabold text-emerald-400 mt-1 font-mono">
                        ${productivityMetrics.total_revenue_aud.toFixed(2)}
                      </p>
                      <span className="text-[10px] text-slate-400">AUD Total</span>
                    </div>

                    <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 text-center">
                      <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                        Avg Ticket
                      </span>
                      <p className="text-2xl font-extrabold text-purple-400 mt-1 font-mono">
                        ${productivityMetrics.average_ticket_aud.toFixed(2)}
                      </p>
                      <span className="text-[10px] text-slate-400">AUD / Visit</span>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-2">
                    <div className="flex justify-between text-slate-400">
                      <span>Roster Status:</span>
                      <span
                        className={
                          selectedStaffForProductivity.is_active
                            ? 'text-emerald-400 font-semibold'
                            : 'text-slate-500 font-semibold'
                        }
                      >
                        {selectedStaffForProductivity.is_active ? 'Active Roster' : 'Deactivated'}
                      </span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Historical Data Policy:</span>
                      <span className="text-slate-300">
                        Preserved indefinitely for audit & tax
                      </span>
                    </div>
                  </div>
                </>
              ) : null}

              <div className="flex justify-end pt-3 border-t border-slate-800">
                <button
                  onClick={() => setIsProductivityModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-sm font-medium"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
