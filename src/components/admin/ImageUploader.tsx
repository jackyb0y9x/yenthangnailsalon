'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Upload, X, CheckCircle2, AlertCircle, Sparkles, RefreshCw } from 'lucide-react';
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
  if (file.size <= 250 * 1024 || typeof window === 'undefined') {
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

      const passes = [
        { maxDim: 1600, quality: 0.82 },
        { maxDim: 1200, quality: 0.72 },
        { maxDim: 960, quality: 0.62 },
      ];

      let bestBlob: Blob | null = null;
      const baseName = file.name.replace(/\.[^/.]+$/, '') || 'image';

      for (const pass of passes) {
        let width = img.naturalWidth || img.width;
        let height = img.naturalHeight || img.height;

        if (width > pass.maxDim || height > pass.maxDim) {
          const scale = pass.maxDim / Math.max(width, height);
          width = Math.max(1, Math.round(width * scale));
          height = Math.max(1, Math.round(height * scale));
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) break;

        ctx.drawImage(img, 0, 0, width, height);

        const blob = await new Promise<Blob | null>((resolve) =>
          canvas.toBlob((b) => resolve(b), 'image/webp', pass.quality)
        );

        if (blob && blob.size > 0) {
          if (!bestBlob || blob.size < bestBlob.size) {
            bestBlob = blob;
          }
          // Stop once safely under 1.2 MB (well below Vercel's 4.5 MB serverless limit)
          if (blob.size <= 1.2 * 1024 * 1024) {
            break;
          }
        }
      }

      if (bestBlob && bestBlob.size > 0 && bestBlob.size < file.size) {
        return new File([bestBlob], `${baseName}.webp`, { type: bestBlob.type || 'image/webp' });
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
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [duration, setDuration] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setPreviewUrl(currentImageUrl || '');
  }, [currentImageUrl]);

  const maxSize = bucket === 'gallery' ? MAX_GALLERY_SIZE_BYTES : MAX_FILE_SIZE_BYTES;
  const maxMb = maxSize / (1024 * 1024);

  const processSelectedFile = async (file: File) => {
    setError(null);
    setSuccess(false);
    setDuration(null);

    // Client-side validations
    if (!ALLOWED_MIME_TYPES.includes(file.type as any)) {
      setError(`Định dạng không hợp lệ (${file.type || 'không xác định'}). Chỉ chấp nhận JPEG, PNG, WebP.`);
      return;
    }

    if (file.size > maxSize) {
      setError(`Kích thước file (${(file.size / (1024 * 1024)).toFixed(1)} MB) vượt quá giới hạn ${maxMb} MB.`);
      return;
    }

    const previousUrl = previewUrl;
    const localUrl = URL.createObjectURL(file);
    setPreviewUrl(localUrl);

    setUploading(true);
    setUploadProgress(35);
    const progressTimer = setInterval(() => {
      setUploadProgress((p) => (p < 90 ? p + 20 : p));
    }, 60);

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

      const rawText = await res.text();
      let data: any = null;
      try {
        data = rawText ? JSON.parse(rawText) : null;
      } catch {
        data = null;
      }

      if (!res.ok || !data?.success) {
        if (res.status === 413) {
          throw new Error('Dung lượng ảnh vượt quá giới hạn máy chủ (4.5 MB). Vui lòng chọn ảnh nhỏ hơn.');
        }
        throw new Error(data?.error || `Tải ảnh thất bại (HTTP ${res.status}).`);
      }

      setDuration(data.duration_ms || null);
      setPreviewUrl(data.url);
      setSuccess(true);
      onUploadSuccess(data.url);
    } catch (err: any) {
      clearInterval(progressTimer);
      setPreviewUrl(previousUrl);
      setError(err.message || 'Tải ảnh lên thất bại.');
    } finally {
      URL.revokeObjectURL(localUrl);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      setTimeout(() => {
        setUploading(false);
        setUploadProgress(0);
      }, 150);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await processSelectedFile(file);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!uploading) setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (uploading) return;
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      await processSelectedFile(droppedFile);
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

      {/* Upload Box / Preview Area with Drag & Drop */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative border-2 border-dashed rounded-xl p-4 bg-slate-900/60 transition-colors ${
          isDragging
            ? 'border-champagne-400 bg-champagne-400/10'
            : 'border-slate-700 hover:border-slate-600'
        }`}
      >
        {previewUrl ? (
          <div className="space-y-2.5">
            <div className="relative aspect-video max-h-48 rounded-lg overflow-hidden bg-slate-950 flex items-center justify-center group">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewUrl}
                alt="Asset Preview"
                className="w-full h-full object-cover rounded-lg"
              />
              <button
                type="button"
                onClick={handleClear}
                className="absolute top-2 right-2 p-1.5 rounded-full bg-slate-900/85 hover:bg-red-600 text-slate-200 hover:text-white transition-colors shadow-sm cursor-pointer"
                title="Gỡ ảnh này"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                disabled={uploading}
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-champagne-400 hover:text-slate-950 text-slate-200 text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Chọn ảnh mới từ máy</span>
              </button>
              <button
                type="button"
                disabled={uploading}
                onClick={handleClear}
                className="text-[11px] text-slate-400 hover:text-red-400 transition-colors cursor-pointer"
              >
                Gỡ ảnh
              </button>
            </div>
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
              Đang tối ưu & tải ảnh lên máy chủ...
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
            Ảnh đã tải lên thành công {duration !== null ? `(${duration}ms)` : ''}! Hãy nhấn Lưu để áp dụng.
          </span>
        </div>
      )}
    </div>
  );
}
