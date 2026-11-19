import { describe, it, expect } from 'vitest';
import { POST, GET } from '@/app/api/consultation/route';

describe('Public Consultation Booking API (/api/consultation)', () => {
  it('should accept valid Australian mobile in national format (04XX XXX XXX) and return 201', async () => {
    const payload = {
      customer_name: 'Sarah Jenkins',
      phone: '0412 345 678',
      email: 'sarah.j@example.com.au',
      preferred_language: 'en',
      preferred_date: '2026-11-25',
      preferred_time: '14:00',
      services_requested: ['Full Set Acrylic', 'Nail Art'],
      notes: 'Interested in almond shape with French ombre',
    };

    const request = new Request('http://localhost:3000/api/consultation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const response = await POST(request);
    expect(response.status).toBe(201);

    const json = await response.json();
    expect(json.success).toBe(true);
    expect(json.inquiry_id).toBeDefined();
    expect(json.status).toBe('new');
    expect(json.data.customer_name).toBe('Sarah Jenkins');
  });

  it('should accept valid Australian mobile in international E.164 format (+614XXXXXXXX)', async () => {
    const payload = {
      customerName: 'Nguyễn Thị Mai Lan',
      phone: '+61 412 345 678',
      preferredLanguage: 'vi',
      services_requested: ['SNS Dipping Powder Set'],
    };

    const request = new Request('http://localhost:3000/api/consultation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const response = await POST(request);
    expect(response.status).toBe(201);

    const json = await response.json();
    expect(json.success).toBe(true);
    expect(json.inquiry_id).toBeDefined();
  });

  it('should reject Australian landline phone numbers with HTTP 400', async () => {
    const payload = {
      customer_name: 'David Smith',
      phone: '02 9123 4567', // Landline, not mobile
      services_requested: ['Express Manicure'],
    };

    const request = new Request('http://localhost:3000/api/consultation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const response = await POST(request);
    expect(response.status).toBe(400);

    const json = await response.json();
    expect(json.success).toBe(false);
    expect(json.error).toBe('Validation failed');
  });

  it('should reject customer name with fewer than 2 characters with HTTP 400', async () => {
    const payload = {
      customer_name: 'A',
      phone: '0412 345 678',
    };

    const request = new Request('http://localhost:3000/api/consultation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const response = await POST(request);
    expect(response.status).toBe(400);

    const json = await response.json();
    expect(json.success).toBe(false);
  });

  it('should return HTTP 400 when receiving malformed JSON', async () => {
    const request = new Request('http://localhost:3000/api/consultation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{ malformed json',
    });

    const response = await POST(request);
    expect(response.status).toBe(400);

    const json = await response.json();
    expect(json.success).toBe(false);
    expect(json.error).toContain('Invalid JSON');
  });

  it('should return HTTP 405 Method Not Allowed on GET requests', async () => {
    const response = await GET();
    expect(response.status).toBe(405);

    const json = await response.json();
    expect(json.success).toBe(false);
  });
});
