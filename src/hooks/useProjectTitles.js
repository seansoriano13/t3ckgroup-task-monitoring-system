import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { useQueryClient } from "@tanstack/react-query";

export function useProjectTitles(employeeId = null, enabled = true) {
  const [projectTitles, setProjectTitles] = useState([]);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!enabled) return;

    let isMounted = true;
    const fetchTitles = async () => {
      try {
        const cachedTasks = queryClient.getQueryData(["dashboardTasks"]) || [];
        const cachedTitles = cachedTasks
          .filter((t) => !employeeId || t.loggedById === employeeId || t.logged_by === employeeId)
          .map((t) => t.projectTitle || t.project_title)
          .filter(Boolean);

        let query = supabase
          .from("tasks")
          .select("project_title")
          .not("project_title", "is", null)
          .neq("project_title", "");

        if (employeeId) {
          query = query.eq("logged_by", employeeId);
        }

        const { data: tasksData } = await query
          .order("created_at", { ascending: false })
          .limit(300);

        if (!isMounted) return;

        const seen = new Set();
        const uniqueTitles = [];

        for (const title of cachedTitles) {
          const trimmed = typeof title === "string" ? title.trim() : "";
          if (trimmed && !seen.has(trimmed.toLowerCase())) {
            seen.add(trimmed.toLowerCase());
            uniqueTitles.push(trimmed);
          }
        }

        if (tasksData) {
          for (const item of tasksData) {
            const title =
              typeof item.project_title === "string"
                ? item.project_title.trim()
                : "";
            if (title && !seen.has(title.toLowerCase())) {
              seen.add(title.toLowerCase());
              uniqueTitles.push(title);
            }
          }
        }

        uniqueTitles.sort((a, b) => a.localeCompare(b));
        setProjectTitles(uniqueTitles);
      } catch (err) {
        console.error("Error fetching project titles:", err);
      }
    };

    fetchTitles();

    return () => {
      isMounted = false;
    };
  }, [employeeId, enabled, queryClient]);

  return projectTitles;
}

