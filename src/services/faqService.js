import { supabase } from "../lib/supabase";

const TABLE = "faq_data";
const SINGLETON_ID = 1; // We store the entire FAQ as a single JSON row

/**
 * Fetch FAQ categories from Supabase.
 * Returns an empty array if no row exists yet.
 */
export async function loadFAQFromDB() {
  const { data, error } = await supabase
    .from(TABLE)
    .select("categories")
    .eq("id", SINGLETON_ID)
    .maybeSingle();

  if (error) {
    console.error("[faqService] loadFAQFromDB error:", error);
    return [];
  }

  return data?.categories ?? [];
}

/**
 * Upsert (insert or update) the FAQ categories in Supabase.
 * @param {Array} categories - Array of category objects
 */
export async function saveFAQToDB(categories) {
  const { error } = await supabase
    .from(TABLE)
    .upsert({ id: SINGLETON_ID, categories, updated_at: new Date().toISOString() });

  if (error) {
    console.error("[faqService] saveFAQToDB error:", error);
    throw error;
  }
}
