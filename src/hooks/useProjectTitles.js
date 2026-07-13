import { supabase } from "../lib/supabase";
import { useQuery, useQueryClient } from "@tanstack/react-query";

export function useProjectTitles(employeeId = null, enabled = true) {
  const queryClient = useQueryClient();

  const { data: projectTitles = [] } = useQuery({
    queryKey: ["projectTitles", employeeId],
    queryFn: async () => {
      try {
        const rawCached = queryClient.getQueryData(["dashboardTasks"]);
        const cachedTasks = Array.isArray(rawCached)
          ? rawCached
          : Array.isArray(rawCached?.tasks)
          ? rawCached.tasks
          : [];

        const cachedTitles = cachedTasks
          .filter((t) => !employeeId || t.loggedById === employeeId || t.logged_by === employeeId)
          .map((t) => t.projectTitle || t.project_title)
          .filter(Boolean);

        let query = supabase
          .from("tasks")
          .select("project_title")
          .not("project_title", "is", null)
          .neq("project_title", "");

        if (employeeId && typeof employeeId === "string" && employeeId.trim() !== "") {
          query = query.eq("logged_by", employeeId);
        }

        const { data: tasksData, error } = await query
          .order("created_at", { ascending: false })
          .limit(300);

        if (error) {
          console.error("Supabase query error for project titles:", error.message || error);
        }

        const seen = new Set();
        const uniqueTitles = [];

        for (const title of cachedTitles) {
          const trimmed = typeof title === "string" ? title.trim() : "";
          if (trimmed && !seen.has(trimmed.toLowerCase())) {
            seen.add(trimmed.toLowerCase());
            uniqueTitles.push(trimmed);
          }
        }

        if (tasksData && Array.isArray(tasksData)) {
          for (const item of tasksData) {
            const title = typeof item.project_title === "string" ? item.project_title.trim() : "";
            if (title && !seen.has(title.toLowerCase())) {
              seen.add(title.toLowerCase());
              uniqueTitles.push(title);
            }
          }
        }

        uniqueTitles.sort((a, b) => a.localeCompare(b));
        return uniqueTitles;
      } catch (err) {
        console.error("Error in fetchProjectTitles query:", err);
        return [];
      }
    },
    enabled: !!enabled,
    staleTime: 1000 * 60 * 5,
  });

  return projectTitles;
}


