declare module "@supabase/supabase-js" {
  export type SupabaseClient<T = unknown> = any;
  export function createClient<T = unknown>(
    url: string,
    key: string,
    options?: Record<string, unknown>
  ): SupabaseClient<T>;
}

