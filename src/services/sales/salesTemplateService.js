import { supabase } from "../../lib/supabase";

export const salesTemplateService = {
  getCustomTemplates: async (employeeId) => {
    const { data, error } = await supabase
      .from("sales_custom_templates")
      .select("*")
      .eq("employee_id", employeeId)
      .order("created_at", { ascending: false });

    if (error) {
      if (error.code === '42P01') {
        // Table doesn't exist yet, return empty array gracefully
        return [];
      }
      console.error("Error fetching custom templates:", error);
      throw error;
    }
    return data || [];
  },

  saveCustomTemplate: async (employeeId, templateName, payload) => {
    const { data, error } = await supabase
      .from("sales_custom_templates")
      .insert({
        employee_id: employeeId,
        template_name: templateName,
        template_payload: payload,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  deleteCustomTemplate: async (templateId) => {
    const { error } = await supabase
        .from("sales_custom_templates")
        .delete()
        .eq("id", templateId);
    if (error) throw error;
  }
};
