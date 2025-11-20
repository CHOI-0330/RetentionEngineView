declare namespace NodeJS {
  interface ProcessEnv {
    NEXT_PUBLIC_SUPABASE_URL?: string;
    NEXT_PUBLIC_SUPABASE_ANON_KEY?: string;
    SUPABASE_SERVICE_ROLE_KEY?: string;
    NEXT_PUBLIC_ENABLE_GEMINI?: string;
    NEXT_PUBLIC_ENTITLE_SANDBOX?: string;
    GEMINI_API_KEY?: string;
    GEMINI_MODEL_ID?: string;
    LLM_BACKEND_BASE_URL?: string;
  }
}
