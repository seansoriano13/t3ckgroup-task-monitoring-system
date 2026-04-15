import { supabase } from "../lib/supabase";

export const employeeService = {
  async getEmployeeByEmail(email) {
    const { data, error } = await supabase
      .from("employees")
      .select("*")
      .eq("email", email)
      .neq("is_deleted", true)
      .single();

    if (error) return null;

    return {
      id: data.id,
      email: data.email,
      name: data.name,
      department: data.department,
      subDepartment: data.sub_department,
      role: data.role,
      isHead: data.is_head,
      isHr: data.is_hr,
      isSuperAdmin: data.is_super_admin,
    };
  },

  async getAllEmployees() {
    const { data, error } = await supabase
      .from("employees")
      .select("*")
      .neq("is_deleted", true);
    if (error) throw error;

    return data.map((employee) => ({
      id: employee.id,
      email: employee.email,
      name: employee.name,
      department: employee.department,
      subDepartment: employee.sub_department,
      role: employee.role,
      isHead: employee.is_head,
      isHr: employee.is_hr,
      isSuperAdmin: employee.is_super_admin,
    }));
  },

  async getAllCategories() {
    const { data, error } = await supabase.from("categories").select("*");
    if (error) throw error;

    return data.map((category) => ({
      id: category.id,
      createdAt: category.created_at,
      categoryId: category.category_id,
      description: category.description,
      department: category.department,
      subDepartment: category.sub_department,
    }));
  },

  async createCategory(categoryData) {
    const { data, error } = await supabase
      .from("categories")
      .insert([
        {
          category_id: categoryData.categoryId,
          description: categoryData.description,
          department: categoryData.department,
          sub_department: categoryData.subDepartment,
          updated_at: new Date().toISOString(),
          updated_by: categoryData?.updatedBy || null,
        },
      ])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateCategory(id, categoryData, actorId = null) {
    const { data, error } = await supabase
      .from("categories")
      .update({
        description: categoryData.description,
        department: categoryData.department,
        sub_department: categoryData.subDepartment,
        updated_at: new Date().toISOString(),
        updated_by: actorId || categoryData?.updatedBy || null,
      })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async isCategoryInUse(categoryId) {
    const { data, error } = await supabase
      .from("tasks")
      .select("id")
      .eq("category_id", categoryId)
      .limit(1);

    if (error) throw error;
    return Array.isArray(data) && data.length > 0;
  },

  async deleteCategory(id) {
    const { error } = await supabase.from("categories").delete().eq("id", id);
    if (error) throw error;
    return true;
  },

  async createEmployee(employeeData) {
    const { data, error } = await supabase
      .from("employees")
      .insert([
        {
          email: employeeData.email,
          name: employeeData.name,
          department: employeeData.department,
          sub_department: employeeData.subDepartment,
          role: employeeData.role,
          is_head: employeeData.isHead,
          is_hr: employeeData.isHr,
          is_super_admin: employeeData.isSuperAdmin,
          updated_at: new Date().toISOString(),
          updated_by: employeeData?.updatedBy || null,
        },
      ])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateEmployee(id, employeeData, actorId = null) {
    const { data, error } = await supabase
      .from("employees")
      .update({
        email: employeeData.email,
        name: employeeData.name,
        department: employeeData.department,
        sub_department: employeeData.subDepartment,
        role: employeeData.role,
        is_head: employeeData.isHead,
        is_hr: employeeData.isHr,
        is_super_admin: employeeData.isSuperAdmin,
        updated_at: new Date().toISOString(),
        updated_by: actorId || employeeData?.updatedBy || null,
      })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async deleteEmployee(id, actorId = null) {
    const { error } = await supabase
      .from("employees")
      .update({
        is_deleted: true,
        updated_at: new Date().toISOString(),
        updated_by: actorId,
      })
      .eq("id", id);
    if (error) throw error;
    return true;
  },
};
