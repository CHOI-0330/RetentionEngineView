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

const getServiceRoleKey = (): string => {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set.");
  }
  return serviceRoleKey;
};

export const createBrowserSupabaseClient = <T = unknown>(): SupabaseClient<T> =>
  createClient<T>(getSupabaseUrl(), getAnonKey());

export const createServerSupabaseClient = <T = unknown>(): SupabaseClient<T> =>
  createClient<T>(getSupabaseUrl(), getServiceRoleKey(), {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

