import { supabase } from "../lib/supabase";

export const employeeService = {
  async getEmployeeByEmail(email) {
    const { data, error } = await supabase
      .from("employees")
      .select("*")
      .eq("email", email)
      .single();

    if (error) return null;

    return {
      id: data.id,
      email: data.email,
      name: data.name,
      department: data.department,
      subDepartment: data.sub_department,
      isHead: data.is_head,
      isHr: data.is_hr,
    };
  },

  async getAllEmployees() {
    const { data, error } = await supabase.from("employees").select("*");
    if (error) throw error;

    return data.map((employee) => ({
      id: employee.id,
      email: employee.email,
      name: employee.name,
      department: employee.department,
      subDepartment: employee.sub_department,
      isHead: employee.is_head,
      isHr: employee.is_hr,
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

  async createEmployee(employeeData) {
    const { data, error } = await supabase
      .from("employees")
      .insert([
        {
          email: employeeData.email,
          name: employeeData.name,
          department: employeeData.department,
          sub_department: employeeData.subDepartment,
          is_head: employeeData.isHead,
          is_hr: employeeData.isHr,
        },
      ])
      .select()
      .single();

    if (error) throw error;
    return data;
  },
};
