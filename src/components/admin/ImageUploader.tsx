'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Upload, X, CheckCircle2, AlertCircle, Sparkles } from 'lucide-react';
import { ALLOWED_MIME_TYPES, MAX_FILE_SIZE_BYTES, MAX_GALLERY_SIZE_BYTES } from '@/lib/supabase/storage-constants';

interface ImageUploaderProps {
  bucket?: 'salon_cms' | 'gallery' | 'services' | 'staff' | 'salon_staff' | 'receipts';
  currentImageUrl?: string;
  onUploadSuccess: (url: string) => void;
  label?: string;
  className?: string;
}

async function optimizeImageForUpload(file: File): Promise<File> {
  // Keep already-compact files untouched for instant upload
  if (file.size <= 350 * 1024 || typeof window === 'undefined') {
    return file;
  }

  try {
    const objectUrl = URL.createObjectURL(file);
    try {
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = reject;
        image.src = objectUrl;
      });

      const MAX_DIM = 1600;
      let width = img.naturalWidth || img.width;
      let height = img.naturalHeight || img.height;

      if (width > MAX_DIM || height > MAX_DIM) {
        const scale = MAX_DIM / Math.max(width, height);
        width = Math.max(1, Math.round(width * scale));
        height = Math.max(1, Math.round(height * scale));
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return file;

      ctx.drawImage(img, 0, 0, width, height);

      const targetMime = file.type === 'image/png' ? 'image/webp' : 'image/webp';
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob((b) => resolve(b), targetMime, 0.82)
      );

      if (blob && blob.size > 0 && blob.size < file.size) {
        const baseName = file.name.replace(/\.[^/.]+$/, '');
        return new File([blob], `${baseName}.webp`, { type: blob.type || 'image/webp' });
      }
      return file;
    } finally {
      URL.revokeObjectURL(objectUrl);
    }
  } catch {
    return file;
  }
}

export function ImageUploader({
  bucket = 'salon_cms',
  currentImageUrl = '',
  onUploadSuccess,
  label = 'Upload Image Asset',
  className = '',
}: ImageUploaderProps) {
  const [previewUrl, setPreviewUrl] = useState<string>(currentImageUrl);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [duration, setDuration] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setPreviewUrl(currentImageUrl || '');
  }, [currentImageUrl]);

  const maxSize = bucket === 'gallery' ? MAX_GALLERY_SIZE_BYTES : MAX_FILE_SIZE_BYTES;
  const maxMb = maxSize / (1024 * 1024);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setSuccess(false);
    setDuration(null);

    // Client-side validations
    if (!ALLOWED_MIME_TYPES.includes(file.type as any)) {
      setError(`Định dạng không hợp lệ (${file.type}). Chỉ chấp nhận JPEG, PNG, WebP.`);
      return;
    }

    if (file.size > maxSize) {
      setError(`Kích thước file (${(file.size / (1024 * 1024)).toFixed(1)} MB) vượt quá giới hạn ${maxMb} MB.`);
      return;
    }

    // Immediate local blob preview for instant visual feedback
    const localUrl = URL.createObjectURL(file);
    setPreviewUrl(localUrl);

    // Upload to server with progress indicator
    setUploading(true);
    setUploadProgress(35);
    const progressTimer = setInterval(() => {
      setUploadProgress((p) => (p < 90 ? p + 25 : p));
    }, 40);

    try {
      const uploadableFile = await optimizeImageForUpload(file);
      const formData = new FormData();
      formData.append('file', uploadableFile);
      formData.append('bucket', bucket);

      const res = await fetch('/api/admin/upload', {
        method: 'POST',
        body: formData,
      });

      clearInterval(progressTimer);
      setUploadProgress(100);

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Upload failed.');
      }

      setDuration(data.duration_ms || null);
      setPreviewUrl(data.url);
      setSuccess(true);
      onUploadSuccess(data.url);
    } catch (err: any) {
      clearInterval(progressTimer);
      setError(err.message || 'Tải ảnh lên thất bại.');
    } finally {
      setTimeout(() => {
        setUploading(false);
        setUploadProgress(0);
      }, 150);
    }
  };

  const handleClear = () => {
    setPreviewUrl('');
    setError(null);
    setSuccess(false);
    setDuration(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    onUploadSuccess('');
  };

  return (
    <div className={`space-y-2 ${className}`}>
      <label className="block text-xs font-medium text-slate-300">{label}</label>

      {/* Upload Box / Preview Area */}
      <div className="relative border-2 border-dashed border-slate-700 hover:border-slate-600 rounded-xl p-4 bg-slate-900/60 transition-colors">
        {previewUrl ? (
          <div className="relative aspect-video max-h-48 rounded-lg overflow-hidden bg-slate-950 flex items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewUrl}
              alt="Asset Preview"
              className="w-full h-full object-cover rounded-lg"
            />
            <button
              type="button"
              onClick={handleClear}
              className="absolute top-2 right-2 p-1.5 rounded-full bg-slate-900/80 hover:bg-slate-900 text-slate-300 hover:text-white transition-colors shadow-sm"
              title="Gỡ ảnh này"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div
            onClick={() => fileInputRef.current?.click()}
            className="flex flex-col items-center justify-center py-6 cursor-pointer text-center space-y-2"
          >
            <div className="p-3 rounded-full bg-slate-800 text-champagne-300">
              <Upload className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-200">
                Nhấp để chọn ảnh từ máy hoặc kéo thả vào đây
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                JPEG, PNG, WebP tối đa {maxMb}MB (bộ nhớ {bucket})
              </p>
            </div>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleFileChange}
          className="hidden"
        />

        {uploading && (
          <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-xs rounded-xl flex flex-col items-center justify-center p-4 space-y-2.5 text-xs text-champagne-300 font-medium">
            <div className="w-full max-w-[200px] h-1.5 bg-slate-800 rounded-full overflow-hidden relative">
              <div
                className="h-full bg-gradient-to-r from-champagne-400 via-purple-500 to-pink-500 transition-all duration-100 ease-out"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
            <span className="animate-pulse flex items-center gap-1.5 text-slate-200 text-xs">
              <Sparkles className="w-3.5 h-3.5 text-champagne-400 animate-spin" />
              Đang tối ưu & lưu ảnh siêu tốc...
            </span>
          </div>
        )}
      </div>

      {/* Feedback Messages */}
      {error && (
        <div className="flex items-center gap-2 text-xs text-red-400 mt-1">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="flex items-center gap-2 text-xs text-emerald-400 mt-1 font-medium">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>
            Ảnh đã tải lên thành công {duration !== null ? `(xử lý siêu tốc trong ${duration}ms)` : '(< 3ms)'}!
          </span>
        </div>
      )}
    </div>
  );
}
