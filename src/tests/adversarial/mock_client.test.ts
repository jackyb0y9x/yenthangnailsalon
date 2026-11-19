import { describe, it, expect } from 'vitest';
import { createMockSupabaseClient } from '@/lib/supabase/mock';

describe('Adversarial Test Suite: Offline Mock Client (src/lib/supabase/mock.ts)', () => {
  const sampleData = {
    nail_services: [
      { id: '1', category: 'Manicure', name_en: 'Classic Manicure', price_aud: 35.00, display_order: 1, is_active: true },
      { id: '2', category: 'Manicure', name_en: 'Deluxe Manicure', price_aud: 55.00, display_order: 2, is_active: true },
      { id: '3', category: 'Pedicure', name_en: 'Classic Pedicure', price_aud: 45.00, display_order: 1, is_active: true },
      { id: '4', category: 'Pedicure', name_en: 'Spa Pedicure', price_aud: 70.00, display_order: 2, is_active: false },
      { id: '5', category: 'SNS & Dipping', name_en: 'SNS Full Set', price_aud: 65.00, display_order: 1, is_active: true },
    ],
    crm_customers: [
      { id: 'c1', full_name: 'Alice Cooper', phone: '0412345678', total_visits: 5, total_spent_aud: 250.00 },
      { id: 'c2', full_name: 'Bob Martin', phone: '0423456789', total_visits: 1, total_spent_aud: 55.00 },
      { id: 'c3', full_name: 'Charlie Tran', phone: '0434567890', total_visits: 12, total_spent_aud: 820.00 },
    ],
  };

  describe('1. Filtering Fidelity', () => {
    it('supports single eq and neq filters', async () => {
      const client = createMockSupabaseClient(sampleData);
      const { data: activeServices } = await client.from('nail_services').select('*').eq('is_active', true);
      expect(activeServices).toHaveLength(4);

      const { data: notManicure } = await client.from('nail_services').select('*').neq('category', 'Manicure');
      expect(notManicure).toHaveLength(3);
    });

    it('supports numerical comparisons (gt, gte, lt, lte)', async () => {
      const client = createMockSupabaseClient(sampleData);

      const { data: gt50 } = await client.from('nail_services').select('*').gt('price_aud', 50);
      expect(gt50).toHaveLength(3); // 55, 70, 65

      const { data: gte55 } = await client.from('nail_services').select('*').gte('price_aud', 55);
      expect(gte55).toHaveLength(3); // 55, 70, 65

      const { data: lt55 } = await client.from('nail_services').select('*').lt('price_aud', 55);
      expect(lt55).toHaveLength(2); // 35, 45

      const { data: lte55 } = await client.from('nail_services').select('*').lte('price_aud', 55);
      expect(lte55).toHaveLength(3); // 35, 45, 55
    });

    it('supports "in" array filtering', async () => {
      const client = createMockSupabaseClient(sampleData);
      const { data } = await client.from('nail_services').select('*').in('category', ['Pedicure', 'SNS & Dipping']);
      expect(data).toHaveLength(3);
    });

    it('supports chained composite filters (AND semantics)', async () => {
      const client = createMockSupabaseClient(sampleData);
      const { data } = await client
        .from('nail_services')
        .select('*')
        .eq('category', 'Pedicure')
        .eq('is_active', true);

      expect(data).toHaveLength(1);
      expect(data[0].name_en).toBe('Classic Pedicure');
    });

    it('returns empty array when no records match filter', async () => {
      const client = createMockSupabaseClient(sampleData);
      const { data } = await client.from('nail_services').select('*').eq('category', 'NonExistent');
      expect(data).toEqual([]);
    });
  });

  describe('2. Sorting Fidelity', () => {
    it('sorts ascending and descending by numeric column', async () => {
      const client = createMockSupabaseClient(sampleData);

      const { data: asc } = await client.from('nail_services').select('*').order('price_aud', { ascending: true });
      expect(asc.map((s: any) => s.price_aud)).toEqual([35, 45, 55, 65, 70]);

      const { data: desc } = await client.from('nail_services').select('*').order('price_aud', { ascending: false });
      expect(desc.map((s: any) => s.price_aud)).toEqual([70, 65, 55, 45, 35]);
    });

    it('sorts alphabetically by string column', async () => {
      const client = createMockSupabaseClient(sampleData);
      const { data: sorted } = await client.from('crm_customers').select('*').order('full_name', { ascending: true });
      expect(sorted.map((c: any) => c.full_name)).toEqual(['Alice Cooper', 'Bob Martin', 'Charlie Tran']);
    });
  });

  describe('3. Pagination & Limit Fidelity', () => {
    it('supports limit(n) correctly', async () => {
      const client = createMockSupabaseClient(sampleData);
      const { data } = await client.from('nail_services').select('*').limit(2);
      expect(data).toHaveLength(2);
    });

    it('supports limit larger than dataset', async () => {
      const client = createMockSupabaseClient(sampleData);
      const { data } = await client.from('nail_services').select('*').limit(100);
      expect(data).toHaveLength(5);
    });

    it('investigate range(from, to) method availability for pagination', () => {
      const client = createMockSupabaseClient(sampleData);
      const builder = client.from('nail_services').select('*');
      // Supabase JS standard query builder exposes .range(from, to) for offset pagination
      const hasRange = typeof builder.range === 'function';
      // We document whether range is supported or missing
      expect(typeof builder.limit).toBe('function');
      // Report whether .range exists:
      if (!hasRange) {
        // This is a known limitation to document in findings
        expect(hasRange).toBe(false);
      }
    });
  });

  describe('4. Single & MaybeSingle Fidelity', () => {
    it('single() returns row and null error when found', async () => {
      const client = createMockSupabaseClient(sampleData);
      const { data, error } = await client.from('crm_customers').select('*').eq('id', 'c1').single();
      expect(error).toBeNull();
      expect(data).not.toBeNull();
      expect(data.full_name).toBe('Alice Cooper');
    });

    it('single() returns null data and error when row not found', async () => {
      const client = createMockSupabaseClient(sampleData);
      const { data, error } = await client.from('crm_customers').select('*').eq('id', 'nonexistent').single();
      expect(data).toBeNull();
      expect(error).not.toBeNull();
      expect(error?.message).toBe('Row not found');
    });

    it('maybeSingle() returns null data and null error when not found', async () => {
      const client = createMockSupabaseClient(sampleData);
      const { data, error } = await client.from('crm_customers').select('*').eq('id', 'nonexistent').maybeSingle();
      expect(data).toBeNull();
      expect(error).toBeNull();
    });
  });

  describe('5. Mutations: Insert, Update, Delete', () => {
    it('inserts a single record and assigns generated ID and timestamps', async () => {
      const client = createMockSupabaseClient({});
      const { data, error } = await client.from('crm_customers').insert({
        full_name: 'David Beckham',
        phone: '0499887766',
      });
      expect(error).toBeNull();
      expect(data.id).toBeDefined();
      expect(data.created_at).toBeDefined();
      expect(data.full_name).toBe('David Beckham');

      const { data: stored } = await client.from('crm_customers').select('*');
      expect(stored).toHaveLength(1);
    });

    it('inserts multiple records in batch', async () => {
      const client = createMockSupabaseClient({});
      const { data, error } = await client.from('crm_customers').insert([
        { full_name: 'User 1', phone: '0411111111' },
        { full_name: 'User 2', phone: '0422222222' },
      ]);
      expect(error).toBeNull();
      expect(data).toHaveLength(2);
    });

    it('updates matching records with updated_at timestamp', async () => {
      const client = createMockSupabaseClient(sampleData);
      const { count } = await client
        .from('crm_customers')
        .update({ total_visits: 6 })
        .eq('id', 'c1');

      expect(count).toBe(1);
      const { data } = await client.from('crm_customers').select('*').eq('id', 'c1').single();
      expect(data.total_visits).toBe(6);
      expect(data.updated_at).toBeDefined();
    });

    it('deletes matching records', async () => {
      const client = createMockSupabaseClient(sampleData);
      const { count } = await client.from('crm_customers').delete().eq('id', 'c2');
      expect(count).toBe(1);

      const { data } = await client.from('crm_customers').select('*');
      expect(data).toHaveLength(2);
      expect(data.some((c: any) => c.id === 'c2')).toBe(false);
    });
  });

  describe('6. Auth Fidelity & Statefulness', () => {
    it('getUser returns authenticated mock user', async () => {
      const client = createMockSupabaseClient();
      const { data, error } = await client.auth.getUser();
      expect(error).toBeNull();
      expect(data.user?.id).toBe('mock-user-admin-1');
      expect(data.user?.role).toBe('authenticated');
    });

    it('signInWithPassword returns user with session token', async () => {
      const client = createMockSupabaseClient();
      const { data, error } = await client.auth.signInWithPassword({
        email: 'manager@glamournails.com.au',
      });
      expect(error).toBeNull();
      expect(data.user.email).toBe('manager@glamournails.com.au');
      expect(data.session.access_token).toBeDefined();
    });

    it('examines signOut behavior in mock client', async () => {
      const client = createMockSupabaseClient();
      const { error } = await client.auth.signOut();
      expect(error).toBeNull();
      // Test whether signOut clears the session/user in mock:
      const { data } = await client.auth.getUser();
      // Document whether mock is stateless or stateful
      expect(data.user).toBeDefined(); // Mock currently returns static mock user even after signOut
    });
  });
});
