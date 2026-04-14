import { supabase } from "../../lib/supabase";

export const salesCategoryService = {
  async getSalesCategories() {
    const { data, error } = await supabase
      .from("categories")
      .select("description")
      .eq("department", "SALES")
      .order("created_at");
    if (error) throw error;
    return data.map((c) => c.description);
  },
};
