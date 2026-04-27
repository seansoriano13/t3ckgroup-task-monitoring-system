import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";

export function useLogTaskData(isOpen, user) {
  const [categories, setCategories] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [availableHeads, setAvailableHeads] = useState([]);
  const [isLoadingData, setIsLoadingData] = useState(true);

  const isHr = user?.is_hr === true || user?.isHr === true;
  const isHead = user?.is_head === true || user?.isHead === true;
  const isSuperAdmin = user?.is_super_admin === true || user?.isSuperAdmin === true;

  useEffect(() => {
    if (!user || !isOpen) return;

    const fetchDropdownData = async () => {
      setIsLoadingData(true);
      try {
        const { data: catData, error: catError } = await supabase
          .from("categories")
          .select("category_id, description, department, sub_department")
          .order("category_id");
        if (catError) console.error("Category Fetch Error:", catError);
        else if (catData) setCategories(catData);

        const userSubDept = user.sub_department || user.subDepartment;
        let empQuery = supabase
          .from("employees")
          .select("id, name, department, sub_department, is_super_admin")
          .neq("is_deleted", true);

        if (isSuperAdmin) {
          empQuery = empQuery.or(
            `is_super_admin.eq.false,is_super_admin.is.null,id.eq.${user.id}`,
          );
        } else if (!isHr && isHead) {
          if (userSubDept)
            empQuery = empQuery.eq("sub_department", userSubDept);
          else empQuery = empQuery.eq("department", user.department);
        } else if (!isHr && !isHead) {
          empQuery = empQuery.eq("id", user.id);
        }

        const { data: empData, error: empError } = await empQuery.order("name");
        if (empError) console.error("Employee Fetch Error:", empError);
        else if (empData) setEmployees(empData);

        const { data: headsData } = await supabase
          .from("employees")
          .select(
            "id, name, department, sub_department, is_head, is_super_admin",
          )
          .or("is_head.eq.true,is_super_admin.eq.true")
          .neq("is_deleted", true)
          .order("name");

        if (headsData) {
          setAvailableHeads(headsData);
        }
      } catch (err) {
        console.error("Unexpected error fetching dropdowns:", err);
      } finally {
        setIsLoadingData(false);
      }
    };

    fetchDropdownData();
  }, [user, isHr, isHead, isSuperAdmin, isOpen]);

  return {
    categories,
    employees,
    availableHeads,
    isLoadingData,
    roles: { isHr, isHead, isSuperAdmin }
  };
}
