import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const customFetch = async (url, options) => {
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
      if (
        response.status === 502 ||
        response.status === 503 ||
        response.status === 504
      ) {
        console.error(
          `Supabase Service Unhealthy (${response.status}) at ${url}`,
        );
      }
    }

    return response;
  } catch (err) {
    const duration = Date.now() - startTime;
    if (err.name === "AbortError") {
      console.error(`Supabase Fetch Timeout (${duration}ms) for URL: ${url}`);
      throw new Error(
        "Network timeout. The connection was lost or the server is unresponsive. Please try again.",
      );
    }

    // Check if it's a CORS or Network error
    console.error(
      `Supabase Fetch Error (${duration}ms). This is likely a CORS block or a network interruption. URL: ${url}`,
      err,
    );
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
