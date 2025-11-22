import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const getSupabaseUrl = (): string => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL is not set.");
  }
  return url;
};

const getAnonKey = (): string => {
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!anonKey) {
    throw new Error("NEXT_PUBLIC_SUPABASE_ANON_KEY is not set.");
  }
  return anonKey;
};

let cachedClient: SupabaseClient | null = null;

export const getBrowserSupabaseClient = <T = unknown>(): SupabaseClient<T> => {
  if (!cachedClient) {
    cachedClient = createClient(getSupabaseUrl(), getAnonKey());
  }
  return cachedClient as SupabaseClient<T>;
};
