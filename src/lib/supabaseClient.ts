import { cookies } from "next/headers";
import { createBrowserClient, createServerClient, type SupabaseClient } from "@supabase/ssr";
import type { CookieOptions } from "@supabase/ssr";

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
  createBrowserClient<T>(getSupabaseUrl(), getAnonKey());

export const createAdminSupabaseClient = <T = unknown>(): SupabaseClient<T> =>
  createServerClient<T>(getSupabaseUrl(), getServiceRoleKey(), {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    cookies: {
      get(name) {
        try {
          return cookies().get(name);
        } catch {
          return undefined;
        }
      },
      getAll() {
        try {
          return cookies().getAll();
        } catch {
          return [];
        }
      },
      set(name, value, options) {
        try {
          const store = cookies();
          const finalOptions = withCrossSiteOptions(options);
          store.set({ name, value, ...finalOptions });
        } catch {
          // Ignore if cookies are not writable in this context.
        }
      },
      setAll(cookiesToSet) {
        try {
          const store = cookies();
          cookiesToSet.forEach(({ name, value, options }) => {
            const finalOptions = withCrossSiteOptions(options);
            store.set({ name, value, ...finalOptions });
          });
        } catch {
          // Ignore if cookies are not writable in this context.
        }
      },
      remove(name, options) {
        try {
          const store = cookies();
          const finalOptions = withCrossSiteOptions(options);
          store.set({ name, value: "", ...finalOptions, maxAge: 0 });
        } catch {
          // Ignore if cookies are not writable in this context.
        }
      },
      removeAll(cookiesToRemove) {
        try {
          const store = cookies();
          cookiesToRemove.forEach(({ name, options }) => {
            const finalOptions = withCrossSiteOptions(options);
            store.set({ name, value: "", ...finalOptions, maxAge: 0 });
          });
        } catch {
          // Ignore if cookies are not writable in this context.
        }
      },
    },
  });

const withCrossSiteOptions = (options?: CookieOptions): CookieOptions => ({
  ...options,
  sameSite: "none",
  secure: true,
});

export const createSupabaseServerClient = <T = unknown>(): SupabaseClient<T> =>
  createServerClient<T>(getSupabaseUrl(), getAnonKey(), {
    cookies: {
      get(name) {
        try {
          return cookies().get(name);
        } catch {
          return undefined;
        }
      },
      getAll() {
        try {
          return cookies().getAll();
        } catch {
          return [];
        }
      },
      set(name, value, options) {
        try {
          const store = cookies();
          const finalOptions = withCrossSiteOptions(options);
          store.set({ name, value, ...finalOptions });
        } catch {
          // Ignore if cookies are not writable in this context.
        }
      },
      setAll(cookiesToSet) {
        try {
          const store = cookies();
          cookiesToSet.forEach(({ name, value, options }) => {
            const finalOptions = withCrossSiteOptions(options);
            store.set({ name, value, ...finalOptions });
          });
        } catch {
          // Ignore if cookies are not writable in this context.
        }
      },
      remove(name, options) {
        try {
          const store = cookies();
          const finalOptions = withCrossSiteOptions(options);
          store.set({ name, value: "", ...finalOptions, maxAge: 0 });
        } catch {
          // Ignore if cookies are not writable in this context.
        }
      },
      removeAll(cookiesToRemove) {
        try {
          const store = cookies();
          cookiesToRemove.forEach(({ name, options }) => {
            const finalOptions = withCrossSiteOptions(options);
            store.set({ name, value: "", ...finalOptions, maxAge: 0 });
          });
        } catch {
          // Ignore if cookies are not writable in this context.
        }
      },
    },
  });

// Backward compatibility: legacy name pointed to the service-role client.
export const createServerSupabaseClient = createAdminSupabaseClient;
