import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Database } from './database.types';

// Environment variables validation
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

// Client-side Supabase client
export const supabase: SupabaseClient<Database> = createClient<Database>(
  supabaseUrl,
  supabaseAnonKey,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    },
    db: {
      schema: 'public'
    },
    global: {
      headers: {
        'x-client-info': 'paintmixr-client'
      }
    }
  }
);

// Server-side Supabase client (for API routes and server components)
export const createServerSupabaseClient = (): SupabaseClient<Database> => {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!serviceRoleKey) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY environment variable');
  }

  return createClient<Database>(
    supabaseUrl,
    serviceRoleKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      },
      db: {
        schema: 'public'
      },
      global: {
        headers: {
          'x-client-info': 'paintmixr-server'
        }
      }
    }
  );
};

// Type-safe table access helpers
export const getEnhancedPaintsTable = (client: SupabaseClient<Database>) => {
  return client.from('enhanced_paints');
};

export const getPaintCollectionsTable = (client: SupabaseClient<Database>) => {
  return client.from('paint_collections');
};

export const getMixingHistoryTable = (client: SupabaseClient<Database>) => {
  return client.from('mixing_history');
};

// Connection health check
export const checkSupabaseConnection = async (): Promise<{
  connected: boolean;
  latency_ms?: number;
  error?: string;
}> => {
  try {
    const start = performance.now();

    const { data, error } = await supabase
      .from('enhanced_paints')
      .select('id')
      .limit(1)
      .single();

    const latency = performance.now() - start;

    if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows found", which is OK
      return {
        connected: false,
        error: error.message
      };
    }

    return {
      connected: true,
      latency_ms: Math.round(latency)
    };
  } catch (error) {
    return {
      connected: false,
      error: error instanceof Error ? error.message : 'Unknown connection error'
    };
  }
};

// Authentication helpers
export const getCurrentUser = async () => {
  const { data: { user }, error } = await supabase.auth.getUser();
  return { user, error };
};

export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  return { error };
};

// Real-time subscription helpers
export const subscribeToUserPaints = (
  userId: string,
  callback: (payload: any) => void
) => {
  return supabase
    .channel('user-paints')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'enhanced_paints',
        filter: `user_id=eq.${userId}`
      },
      callback
    )
    .subscribe();
};

export const subscribeToUserCollections = (
  userId: string,
  callback: (payload: any) => void
) => {
  return supabase
    .channel('user-collections')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'paint_collections',
        filter: `user_id=eq.${userId}`
      },
      callback
    )
    .subscribe();
};

export const subscribeToMixingHistory = (
  userId: string,
  callback: (payload: any) => void
) => {
  return supabase
    .channel('mixing-history')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'mixing_history',
        filter: `user_id=eq.${userId}`
      },
      callback
    )
    .subscribe();
};

// Error handling utilities
export const isSupabaseError = (error: any): error is { code: string; message: string; details?: string } => {
  return error && typeof error.code === 'string' && typeof error.message === 'string';
};

export const handleSupabaseError = (error: any, context: string = 'Database operation') => {
  if (isSupabaseError(error)) {
    console.error(`${context} error:`, {
      code: error.code,
      message: error.message,
      details: error.details
    });
    return {
      code: error.code,
      message: error.message,
      details: error.details
    };
  }

  console.error(`${context} unknown error:`, error);
  return {
    code: 'UNKNOWN_ERROR',
    message: 'An unknown error occurred',
    details: String(error)
  };
};

// Batch operations
export const batchInsertPaints = async (
  paints: any[],
  batchSize: number = 100
): Promise<{ success: boolean; insertedCount: number; errors: any[] }> => {
  const errors: any[] = [];
  let insertedCount = 0;

  for (let i = 0; i < paints.length; i += batchSize) {
    const batch = paints.slice(i, i + batchSize);

    try {
      const { data, error } = await supabase
        .from('enhanced_paints')
        .insert(batch)
        .select('id');

      if (error) {
        errors.push({
          batchIndex: Math.floor(i / batchSize),
          error: handleSupabaseError(error, 'Batch insert')
        });
      } else {
        insertedCount += data?.length || 0;
      }
    } catch (err) {
      errors.push({
        batchIndex: Math.floor(i / batchSize),
        error: handleSupabaseError(err, 'Batch insert exception')
      });
    }
  }

  return {
    success: errors.length === 0,
    insertedCount,
    errors
  };
};

// Transaction simulation (since Supabase doesn't support real transactions in client)
export const simulateTransaction = async <T>(
  operations: Array<() => Promise<T>>
): Promise<{ success: boolean; results: T[]; rollbackNeeded: boolean }> => {
  const results: T[] = [];
  const rollbackOperations: Array<() => Promise<void>> = [];

  try {
    for (const operation of operations) {
      const result = await operation();
      results.push(result);
    }

    return {
      success: true,
      results,
      rollbackNeeded: false
    };
  } catch (error) {
    // Attempt to rollback completed operations
    console.warn('Transaction failed, attempting rollback...');

    for (const rollback of rollbackOperations.reverse()) {
      try {
        await rollback();
      } catch (rollbackError) {
        console.error('Rollback operation failed:', rollbackError);
      }
    }

    return {
      success: false,
      results,
      rollbackNeeded: true
    };
  }
};

// Performance monitoring
export const measureQueryPerformance = async <T>(
  queryName: string,
  queryFn: () => Promise<T>
): Promise<T & { _queryStats?: { name: string; duration_ms: number } }> => {
  const start = performance.now();

  try {
    const result = await queryFn();
    const duration = performance.now() - start;

    // Log slow queries (> 1000ms)
    if (duration > 1000) {
      console.warn(`Slow query detected: ${queryName} took ${duration.toFixed(2)}ms`);
    }

    // Add performance stats to result if it's an object
    if (result && typeof result === 'object') {
      (result as any)._queryStats = {
        name: queryName,
        duration_ms: Math.round(duration)
      };
    }

    return result;
  } catch (error) {
    const duration = performance.now() - start;
    console.error(`Query failed: ${queryName} failed after ${duration.toFixed(2)}ms`, error);
    throw error;
  }
};

// Cache management
const queryCache = new Map<string, { data: any; timestamp: number; ttl: number }>();

export const cachedQuery = async <T>(
  cacheKey: string,
  queryFn: () => Promise<T>,
  ttlMs: number = 300000 // 5 minutes default
): Promise<T> => {
  const cached = queryCache.get(cacheKey);
  const now = Date.now();

  if (cached && (now - cached.timestamp) < cached.ttl) {
    return cached.data;
  }

  const result = await queryFn();
  queryCache.set(cacheKey, {
    data: result,
    timestamp: now,
    ttl: ttlMs
  });

  return result;
};

export const clearQueryCache = (pattern?: string) => {
  if (pattern) {
    for (const key of queryCache.keys()) {
      if (key.includes(pattern)) {
        queryCache.delete(key);
      }
    }
  } else {
    queryCache.clear();
  }
};

// Export default client
export default supabase;