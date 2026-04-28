// lib/supabase.js

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Simple delay helper
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

/**
 * Custom fetch wrapper with retry logic and timeout handling.
 * Addresses "supabase not responding" by retrying transient network errors.
 */
const customFetch = async (url, options, retries = 2) => {
  const controller = new AbortController();
  const timeoutDuration = 20000;

  const id = setTimeout(() => controller.abort(), timeoutDuration);
  const startTime = Date.now();

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });

    if (!response.ok) {
      const retryableStatuses = [502, 503, 504, 525];

      if (retryableStatuses.includes(response.status) && retries > 0) {
        console.warn(
          `[Supabase] Retry (${retries}) → ${response.status} → ${url}`
        );
        await sleep(500);
        return customFetch(url, options, retries - 1);
      }

      if (response.status === 525) {
        console.error(
          "[Supabase] SSL Handshake Failed (525) → network/HTTP3 issue"
        );
      }
    }

    return response;
  } catch (err) {
    const duration = Date.now() - startTime;

    const isRetryableError =
      err.name === "AbortError" || 
      err instanceof TypeError || 
      err.message?.includes("Failed to fetch");

    if (isRetryableError && retries > 0) {
      console.warn(
        `[Supabase] Retry (${retries}) due to network error → ${url}`
      );
      await sleep(500);
      return customFetch(url, options, retries - 1);
    }

    if (err.name === "AbortError") {
      console.error(`[Supabase] Timeout (${duration}ms) → ${url}`);
      throw new Error(
        "Request timeout. The connection may be unstable. Please try again."
      );
    }

    console.error(`[Supabase] Fetch Error (${duration}ms) → ${url}`, err);
    throw err;
  } finally {
    clearTimeout(id);
  }
};

/**
 * Singleton protection for the Supabase client.
 * Prevents "multiple Supabase clients" issues during HMR or multi-tab usage.
 */
if (!globalThis._supabaseInstance) {
  globalThis._supabaseInstance = createClient(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
      storageKey: 't3ckgroup-auth-session', // Specific key to avoid conflicts
    },
    global: {
      fetch: customFetch,
    },
    realtime: {
      params: {
        eventsPerSecond: 10,
      },
      // Aggressive heartbeat to detect dropped connections (default is 15s)
      heartbeatIntervalMs: 8000, 
    },
  });

  // Log connectivity state for debugging
  globalThis._supabaseInstance.auth.onAuthStateChange((event, session) => {
    console.log(`[Supabase Auth] ${event}`, session?.user?.email || 'No session');
  });
}

export const supabase = globalThis._supabaseInstance;