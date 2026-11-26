import { GoTrueClient, PostgrestClient } from "./supabase-vendor.mjs";

// The root app only needs Supabase Auth and PostgREST. Keep the same small
// surface as supabase-js for the methods it actually calls, without loading
// Realtime, Storage, Functions, or the full SDK.
export function createClient(supabaseUrl, supabaseKey, options = {}) {
  const baseUrl = supabaseUrl.replace(/\/+$/, "");
  const projectRef = new URL(baseUrl).hostname.split(".")[0];
  const authOptions = options.auth || {};
  const globalOptions = options.global || {};
  const baseHeaders = {
    ...(globalOptions.headers || {}),
    apikey: supabaseKey,
    Authorization: `Bearer ${supabaseKey}`
  };
  const authClient = new GoTrueClient({
    url: `${baseUrl}/auth/v1`,
    headers: baseHeaders,
    storageKey: authOptions.storageKey || `sb-${projectRef}-auth-token`,
    autoRefreshToken: authOptions.autoRefreshToken ?? true,
    persistSession: authOptions.persistSession ?? true,
    detectSessionInUrl: authOptions.detectSessionInUrl ?? true,
    flowType: authOptions.flowType || "pkce",
    fetch: globalOptions.fetch || globalThis.fetch
  });

  const ready = authClient.initialize().then(({ error }) => {
    if (error) throw error;
  });
  const auth = {
    getSession: (...args) => ready.then(() => authClient.getSession(...args)),
    getUser: (...args) => ready.then(() => authClient.getUser(...args)),
    signInAnonymously: (...args) => ready.then(() => authClient.signInAnonymously(...args)),
    signInWithPassword: (...args) => ready.then(() => authClient.signInWithPassword(...args)),
    signOut: (...args) => ready.then(() => authClient.signOut(...args)),
    onAuthStateChange: (...args) => authClient.onAuthStateChange(...args)
  };

  const postgrest = new PostgrestClient(`${baseUrl}/rest/v1`, {
    headers: baseHeaders,
    fetch: async (input, init = {}) => {
      await ready;
      const { data, error } = await authClient.getSession();
      if (error) throw error;
      const headers = new Headers(init.headers);
      headers.set("apikey", supabaseKey);
      headers.set("Authorization", `Bearer ${data?.session?.access_token || supabaseKey}`);
      return (globalOptions.fetch || globalThis.fetch)(input, { ...init, headers });
    }
  });

  return { auth, from: postgrest.from.bind(postgrest) };
}
