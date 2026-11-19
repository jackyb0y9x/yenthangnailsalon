'use client';

import React, { useState } from 'react';
import { Sparkles, CheckCircle2, AlertCircle, Calendar, Clock, Phone, Mail, User, FileText } from 'lucide-react';
import { isValidAustralianMobile } from '@/lib/utils/validation';
import type { Locale } from '@/lib/i18n/config';
import type { Messages } from '@/lib/i18n/dictionaries';
import type { PublicService } from '@/lib/cms/public-data';

interface ConsultationFormProps {
  locale: Locale;
  dict: Messages;
  services: PublicService[];
  preselectedServiceId?: string;
}

export function ConsultationForm({
  locale,
  dict,
  services,
  preselectedServiceId,
}: ConsultationFormProps) {
  const isEn = locale === 'en';

  const [customerName, setCustomerName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [preferredDate, setPreferredDate] = useState(() => {
    // Default to 2 days from now
    const d = new Date();
    d.setDate(d.getDate() + 2);
    return d.toISOString().split('T')[0];
  });
  const [preferredTime, setPreferredTime] = useState('14:00');
  const [selectedServices, setSelectedServices] = useState<string[]>(() => {
    if (preselectedServiceId) {
      const found = services.find((s) => s.id === preselectedServiceId);
      return found ? [isEn ? found.name_en : found.name_vi] : [];
    }
    return ['Full Set Acrylic', 'Nail Art'];
  });
  const [notes, setNotes] = useState('');
  const [preferredLanguage, setPreferredLanguage] = useState<'en' | 'vi'>(locale);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successData, setSuccessData] = useState<{ inquiry_id: string; customer_name: string } | null>(null);

  const handleToggleService = (serviceName: string) => {
    setSelectedServices((prev) =>
      prev.includes(serviceName) ? prev.filter((s) => s !== serviceName) : [...prev, serviceName]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // Front-end validation
    if (!customerName.trim() || customerName.trim().length < 2) {
      setErrorMessage(
        isEn ? 'Please enter your full name (at least 2 characters).' : 'Vui lòng nhập họ và tên (ít nhất 2 ký tự).'
      );
      return;
    }

    if (!phone.trim()) {
      setErrorMessage(
        isEn ? 'Australian mobile number is required.' : 'Vui lòng nhập số điện thoại di động Úc.'
      );
      return;
    }

    if (!isValidAustralianMobile(phone)) {
      setErrorMessage(
        isEn
          ? 'Please enter a valid Australian mobile number (e.g. 0412 345 678 or +61 412 345 678).'
          : 'Số điện thoại di động Úc không hợp lệ (Ví dụ: 0412 345 678 hoặc +61 412 345 678).'
      );
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        customer_name: customerName.trim(),
        phone: phone.trim(),
        email: email.trim() || undefined,
        preferred_date: preferredDate,
        preferred_time: preferredTime,
        preferred_language: preferredLanguage,
        services_requested: selectedServices.length > 0 ? selectedServices : ['General Nail Consultation'],
        notes: notes.trim() || undefined,
      };

      const res = await fetch('/api/consultation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        setErrorMessage(
          json.error || (isEn ? 'Failed to submit inquiry.' : 'Không thể gửi yêu cầu đặt hẹn.')
        );
        setIsSubmitting(false);
        return;
      }

      setSuccessData({
        inquiry_id: json.inquiry_id || json.data?.id || 'consultation-recorded',
        customer_name: customerName,
      });
      setIsSubmitting(false);
    } catch (err: any) {
      console.error('Consultation submission error:', err);
      setErrorMessage(
        isEn
          ? 'Network error. Please check your connection and try again.'
          : 'Lỗi kết nối. Vui lòng thử lại sau.'
      );
      setIsSubmitting(false);
    }
  };

  if (successData) {
    return (
      <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-8 text-center space-y-4 shadow-sm animate-fade-in">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
          <CheckCircle2 className="h-8 w-8" />
        </div>
        <h3 className="font-serif text-2xl font-bold text-emerald-950">
          {dict.consultation.successTitle}
        </h3>
        <p className="text-sm text-emerald-800 max-w-md mx-auto leading-relaxed">
          {dict.consultation.successDesc}
        </p>
        <div className="inline-block bg-white border border-emerald-200 rounded-lg px-4 py-2 text-xs font-mono text-emerald-900 shadow-xs">
          <span className="text-gray-500 font-sans mr-2">{dict.consultation.inquiryId}:</span>
          <strong>{successData.inquiry_id}</strong>
        </div>
        <div className="pt-4">
          <button
            type="button"
            onClick={() => {
              setSuccessData(null);
              setCustomerName('');
              setPhone('');
              setEmail('');
              setNotes('');
            }}
            className="text-xs font-medium text-emerald-700 hover:text-emerald-900 underline"
          >
            {isEn ? 'Submit another inquiry →' : 'Gửi yêu cầu đặt hẹn khác →'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <form
      id="consultation-form"
      onSubmit={handleSubmit}
      className="space-y-6 bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-salon-100"
    >
      <div className="border-b border-gray-100 pb-4">
        <h3 className="font-serif text-xl sm:text-2xl font-bold text-salon-950">
          {dict.consultation.formTitle}
        </h3>
        <p className="text-xs sm:text-sm text-gray-500 mt-1">
          {dict.consultation.formSubtitle}
        </p>
      </div>

      {errorMessage && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 flex items-start gap-3 text-red-800 text-sm">
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Row 1: Name and Phone */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
            <User className="w-3.5 h-3.5 text-salon-700" />
            <span>{dict.consultation.fullName} *</span>
          </label>
          <input
            type="text"
            required
            name="customer_name"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            placeholder={dict.consultation.fullNamePlaceholder}
            className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 focus:border-salon-600 focus:ring-1 focus:ring-salon-600 outline-none transition"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
            <Phone className="w-3.5 h-3.5 text-salon-700" />
            <span>{dict.consultation.phone} *</span>
          </label>
          <input
            type="tel"
            required
            name="phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder={dict.consultation.phonePlaceholder}
            className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 focus:border-salon-600 focus:ring-1 focus:ring-salon-600 outline-none transition font-mono"
          />
        </div>
      </div>

      {/* Row 2: Email and Preferred Language */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
            <Mail className="w-3.5 h-3.5 text-salon-700" />
            <span>{dict.consultation.email}</span>
          </label>
          <input
            type="email"
            name="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={dict.consultation.emailPlaceholder}
            className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 focus:border-salon-600 focus:ring-1 focus:ring-salon-600 outline-none transition"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
            {dict.consultation.preferredLanguage}
          </label>
          <select
            name="preferred_language"
            value={preferredLanguage}
            onChange={(e) => setPreferredLanguage(e.target.value as 'en' | 'vi')}
            className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 focus:border-salon-600 focus:ring-1 focus:ring-salon-600 outline-none transition bg-white"
          >
            <option value="en">🇦🇺 {dict.consultation.langEn}</option>
            <option value="vi">🇻🇳 {dict.consultation.langVi}</option>
          </select>
        </div>
      </div>

      {/* Row 3: Date and Time */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-salon-700" />
            <span>{dict.consultation.preferredDate}</span>
          </label>
          <input
            type="date"
            name="preferred_date"
            value={preferredDate}
            onChange={(e) => setPreferredDate(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 focus:border-salon-600 focus:ring-1 focus:ring-salon-600 outline-none transition"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-salon-700" />
            <span>{dict.consultation.preferredTime}</span>
          </label>
          <select
            name="preferred_time"
            value={preferredTime}
            onChange={(e) => setPreferredTime(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 focus:border-salon-600 focus:ring-1 focus:ring-salon-600 outline-none transition bg-white"
          >
            <option value="10:00">10:00 AM (Morning)</option>
            <option value="11:30">11:30 AM (Late Morning)</option>
            <option value="14:00">14:00 (Afternoon - Popular)</option>
            <option value="16:00">16:00 (Late Afternoon)</option>
            <option value="17:30">17:30 (Evening)</option>
            <option value="19:00">19:00 (Late Night Thursday)</option>
          </select>
        </div>
      </div>

      {/* Row 4: Services Requested Checkbox Chips */}
      <div>
        <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
          {dict.consultation.servicesRequested}
        </label>
        <div className="flex flex-wrap gap-2">
          {services.map((service) => {
            const name = isEn ? service.name_en : service.name_vi;
            const isChecked = selectedServices.includes(name);

            return (
              <button
                key={service.id}
                type="button"
                onClick={() => handleToggleService(name)}
                className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
                  isChecked
                    ? 'bg-salon-700 text-white border-salon-700 shadow-xs'
                    : 'bg-gray-50 text-gray-700 border-gray-200 hover:border-salon-300'
                }`}
              >
                {isChecked ? '✓ ' : '+ '}
                {name}
              </button>
            );
          })}
        </div>
      </div>

      {/* Row 5: Notes */}
      <div>
        <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
          <FileText className="w-3.5 h-3.5 text-salon-700" />
          <span>{dict.consultation.notes}</span>
        </label>
        <textarea
          rows={3}
          name="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder={dict.consultation.notesPlaceholder}
          className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 focus:border-salon-600 focus:ring-1 focus:ring-salon-600 outline-none transition"
        />
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-salon-800 hover:bg-salon-900 text-white font-semibold py-3.5 px-6 shadow-md transition-all hover:shadow-lg disabled:opacity-50"
      >
        <Sparkles className="w-4 h-4 text-champagne-300" />
        <span>{isSubmitting ? dict.consultation.submitting : dict.consultation.submit}</span>
      </button>
    </form>
  );
}
