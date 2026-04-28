import { supabase } from "../../lib/supabase";

export const salesEmployeeService = {
  async getSalesEmployees() {
    // Simple fetch, filtering could be based on roles string if needed
    // Assuming they are assigned to specific departments for 'Sales'
    const { data, error } = await supabase
      .from("employees")
      .select(
        "id, name, department, sub_department, role, is_super_admin, avatar_path",
      )
      .or(
        "department.ilike.%sales%,sub_department.ilike.%sales%,is_super_admin.eq.true",
      );

    if (error) throw error;

    return data.map((emp) => ({
      ...emp,
      subDepartment: emp.sub_department,
      avatarPath: emp.avatar_path,
    }));
  },
};
