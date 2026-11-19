import React from 'react';
import { generateLocalBusinessSchema, sanitizeJsonLd, LocalBusinessInfo } from '@/lib/seo/schema';

export interface LocalBusinessJsonLdProps {
  businessInfo?: Partial<LocalBusinessInfo>;
}

export function LocalBusinessJsonLd({ businessInfo }: LocalBusinessJsonLdProps) {
  const schemaObj = generateLocalBusinessSchema(businessInfo);
  const jsonLdString = sanitizeJsonLd(schemaObj);

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: jsonLdString }}
    />
  );
}
