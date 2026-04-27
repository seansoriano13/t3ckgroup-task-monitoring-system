import { useQuery } from "@tanstack/react-query";
import { employeeService } from "../services/employeeService";
import { storageService } from "../services/storageService";

const HTTP_URL_RE = /^https?:\/\//i;

/**
 * Fetches all employees' avatar paths and resolves them to signed URLs.
 * Backed by React Query — the same query key ["employeeAvatarMap"] is shared
 * across all callers, so only ONE network request is made per session.
 *
 * @returns {Map<string, string|null>} employeeId → resolved picture URL (or null)
 */
export function useEmployeeAvatarMap() {
  const { data } = useQuery({
    queryKey: ["employeeAvatarMap"],
    queryFn: async () => {
      const employees = await employeeService.getEmployeeAvatarPaths();

      // Resolve all avatar_path entries to signed URLs in parallel
      const resolved = await Promise.all(
        employees.map(async ({ id, avatar_path }) => {
          if (!avatar_path) return { id, url: null };

          // If it's already an absolute URL (e.g. Google OAuth picture), use as-is
          if (HTTP_URL_RE.test(avatar_path)) return { id, url: avatar_path };

          try {
            const url = await storageService.getSignedUrl(avatar_path);
            return { id, url };
          } catch {
            return { id, url: null };
          }
        })
      );

      // Build a stable Map for O(1) lookups in components
      const map = new Map();
      resolved.forEach(({ id, url }) => map.set(id, url));
      return map;
    },
    staleTime: 1000 * 60 * 50, // 50 min — just under Supabase signed URL's 1-hour expiry
    gcTime: 1000 * 60 * 60,    // keep in memory for 1 hour
  });

  // Return an empty Map while loading so callers don't need null-checks
  return data ?? new Map();
}
