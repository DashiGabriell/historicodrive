import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const chave = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!url || !chave) {
  throw new Error("VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY ausentes no .env");
}

export const supabase = createClient(url, chave, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: "pkce",
  },
});
