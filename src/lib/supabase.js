import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Custom fetch wrapper to enforce a 10-second timeout on all Supabase API calls.
// This prevents the application from getting stuck in infinite "Loading..." states
// if the browser drops the network socket while the tab is asleep in the background.
const customFetch = async (url, options) => {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), 10000); // 10 second strict timeout
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error('Network timeout. The connection was lost or the server is unresponsive. Please try again.');
    }
    throw err;
  } finally {
    clearTimeout(id);
  }
};

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
  },
  global: {
    fetch: customFetch,
  },
});
