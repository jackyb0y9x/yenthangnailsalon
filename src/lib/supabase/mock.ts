/**
 * Offline Supabase Mock Client for Vitest Unit & Integration Testing.
 * Allows deterministic tests without live Supabase credentials or network access.
 */
export interface MockQueryState<T = any> {
  table: string;
  filters: Array<(item: any) => boolean>;
  orderBy?: { column: string; ascending: boolean };
  limitCount?: number;
  data: T[];
}

export function createMockSupabaseClient(initialData: Record<string, any[]> = {}) {
  const store: Record<string, any[]> = { ...initialData };

  const createQueryBuilder = (tableName: string) => {
    const filters: Array<(item: any) => boolean> = [];
    let sortFn: ((a: any, b: any) => number) | null = null;
    let limitVal: number | null = null;

    const builder: any = {
      select: (_columns = '*') => builder,

      eq: (column: string, value: any) => {
        filters.push((item) => item[column] === value);
        return builder;
      },

      neq: (column: string, value: any) => {
        filters.push((item) => item[column] !== value);
        return builder;
      },

      gt: (column: string, value: any) => {
        filters.push((item) => item[column] > value);
        return builder;
      },

      gte: (column: string, value: any) => {
        filters.push((item) => item[column] >= value);
        return builder;
      },

      lt: (column: string, value: any) => {
        filters.push((item) => item[column] < value);
        return builder;
      },

      lte: (column: string, value: any) => {
        filters.push((item) => item[column] <= value);
        return builder;
      },

      in: (column: string, values: any[]) => {
        filters.push((item) => values.includes(item[column]));
        return builder;
      },

      order: (column: string, { ascending = true } = {}) => {
        sortFn = (a, b) => {
          if (a[column] < b[column]) return ascending ? -1 : 1;
          if (a[column] > b[column]) return ascending ? 1 : -1;
          return 0;
        };
        return builder;
      },

      limit: (count: number) => {
        limitVal = count;
        return builder;
      },

      single: async () => {
        const currentData = [...(store[tableName] || [])];
        let result = currentData.filter((item) => filters.every((fn) => fn(item)));
        if (sortFn) result = result.sort(sortFn);
        const data = result[0] || null;
        return { data, error: data ? null : { message: 'Row not found' } };
      },

      maybeSingle: async () => {
        const currentData = [...(store[tableName] || [])];
        let result = currentData.filter((item) => filters.every((fn) => fn(item)));
        if (sortFn) result = result.sort(sortFn);
        return { data: result[0] || null, error: null };
      },

      insert: async (records: any | any[]) => {
        const rows = Array.isArray(records) ? records : [records];
        if (!store[tableName]) store[tableName] = [];
        const inserted = rows.map((r) => ({
          id: r.id || `mock-id-${Math.random().toString(36).substring(2, 9)}`,
          created_at: r.created_at || new Date().toISOString(),
          updated_at: r.updated_at || new Date().toISOString(),
          ...r,
        }));
        store[tableName].push(...inserted);
        return { data: Array.isArray(records) ? inserted : inserted[0], error: null };
      },

      update: (updates: any) => {
        return {
          eq: async (column: string, value: any) => {
            if (!store[tableName]) store[tableName] = [];
            let updatedCount = 0;
            store[tableName] = store[tableName].map((item) => {
              if (item[column] === value) {
                updatedCount++;
                return { ...item, ...updates, updated_at: new Date().toISOString() };
              }
              return item;
            });
            return { data: null, error: null, count: updatedCount };
          },
        };
      },

      delete: () => {
        return {
          eq: async (column: string, value: any) => {
            if (!store[tableName]) store[tableName] = [];
            const initialLen = store[tableName].length;
            store[tableName] = store[tableName].filter((item) => item[column] !== value);
            return { data: null, error: null, count: initialLen - store[tableName].length };
          },
        };
      },

      // Executes query when awaited
      then: (resolve: (val: any) => void) => {
        const currentData = [...(store[tableName] || [])];
        let result = currentData.filter((item) => filters.every((fn) => fn(item)));
        if (sortFn) result = result.sort(sortFn);
        if (limitVal !== null) result = result.slice(0, limitVal);
        resolve({ data: result, error: null, count: result.length });
      },
    };

    return builder;
  };

  return {
    from: (table: string) => createQueryBuilder(table),

    auth: {
      getUser: async () => ({
        data: {
          user: {
            id: 'mock-user-admin-1',
            email: 'admin@glamournails.com.au',
            role: 'authenticated',
          },
        },
        error: null,
      }),
      getSession: async () => ({
        data: {
          session: {
            access_token: 'mock-access-token',
            user: { id: 'mock-user-admin-1', email: 'admin@glamournails.com.au' },
          },
        },
        error: null,
      }),
      signInWithPassword: async ({ email }: { email: string }) => ({
        data: {
          user: { id: 'mock-user-1', email },
          session: { access_token: 'mock-token' },
        },
        error: null,
      }),
      signOut: async () => ({ error: null }),
    },

    storage: {
      from: (bucket: string) => ({
        upload: async (path: string, _file: any) => ({
          data: { path: `${bucket}/${path}` },
          error: null,
        }),
        getPublicUrl: (path: string) => ({
          data: { publicUrl: `https://mock.supabase.co/storage/v1/object/public/${bucket}/${path}` },
        }),
      }),
    },

    _getStore: () => store,
  };
}
