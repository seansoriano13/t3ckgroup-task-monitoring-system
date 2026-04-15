import { useEffect, useRef, createContext, useState, useContext } from "react";
import { employeeService } from "../services/employeeService.js";
import { storageService } from "../services/storageService.js";
import toast from "react-hot-toast";
import { supabase } from "../lib/supabase.js";

const AuthContext = createContext(null);
const PROFILE_CACHE_KEY = "t3ck_user_profile";
const HTTP_URL_RE = /^https?:\/\//i;

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true); // Always start loading to verify session integrity
  const [initFinished, setInitFinished] = useState(false); // New flag to prevent infinite loops
  const userEmailRef = useRef(null);
  const settledRef = useRef(false); // ensures setIsAuthLoading(false) only fires once

  const resolveProfileMediaUrl = async (path) => {
    if (!path) return null;
    if (HTTP_URL_RE.test(path)) return path;
    try {
      return await storageService.getSignedUrl(path);
    } catch (error) {
      console.warn("Failed to resolve profile media URL:", error);
      return null;
    }
  };

  useEffect(() => {
    userEmailRef.current = user?.email;
  }, [user]);

  useEffect(() => {

    // Shared helper — looks up the employee record from DB and merges Google metadata.
    // Only called on initial session load or explicit SIGNED_IN — NOT on TOKEN_REFRESHED.
    // Role changes in the DB only take effect after the user logs out and back in.
    const resolveEmployee = async (sessionUser) => {
      // If we already have a user and it's the right one, don't re-fetch
      if (userEmailRef.current === sessionUser.email && initFinished) return;

      try {
        const employee = await employeeService.getEmployeeByEmail(sessionUser.email);
        if (employee) {
          const metadata = sessionUser.user_metadata || null;
          const [pictureFromStorage, bannerFromStorage] = await Promise.all([
            resolveProfileMediaUrl(employee.avatarPath),
            resolveProfileMediaUrl(employee.dashboardBannerPath),
          ]);

          const mergedUser = {
            ...employee,
            picture: pictureFromStorage || metadata?.avatar_url || metadata?.picture || "",
            dashboardBannerUrl: bannerFromStorage || null,
          };
          setUser(mergedUser);
          localStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(mergedUser));
        } else {
          console.warn("Auth: No employee record found. Clearing session.");
          await logout();
        }
      } catch (err) {
        console.error("Auth: resolveEmployee failed:", err);
        // Fallback to local cache if DB is unreachable BUT session is valid
        const cached = localStorage.getItem(PROFILE_CACHE_KEY);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed.email === sessionUser.email) {
            setUser(parsed);
          }
        }
      } finally {
        setIsAuthLoading(false);
        setInitFinished(true);
      }
    };

    // Safety net: if auth never resolves (offline, token deadlock, slow network),
    // release the loading gate after 10s so the user reaches the login page
    // instead of being stuck on "Loading Portal..." forever.
    const timeout = setTimeout(() => {
      if (!settledRef.current) {
        settledRef.current = true;
        console.warn("Auth: session resolution timed out — releasing loading gate");
        setIsAuthLoading(false);
      }
    }, 10_000);

    // 🔄 Real-time Session Sync
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      console.log("Auth Event:", event);
      
      if (session?.user) {
        // If we have a session, always try to resolve the employee
        resolveEmployee(session.user);
      } else {
        // No session -> clear everything
        setUser(null);
        localStorage.removeItem(PROFILE_CACHE_KEY);
        setIsAuthLoading(false);
        setInitFinished(true);
      }
    });

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, [initFinished]);



  const handleLogin = async (googleEmail) => {
    // handleLogin no longer manually updates state. 
    // It just validates that the employee exists before allowing the flow.
    // The onAuthStateChange listener will handle the actual state update once 
    // supabase.auth.signInWithIdToken completes in the component.
    try {
      const dbEmployee = await employeeService.getEmployeeByEmail(googleEmail);
      if (!dbEmployee) {
        toast.error("Unauthorized: Your email is not registered.");
        return false;
      }
      return true;
    } catch (error) {
      console.error("Manual look-up failed:", error);
      toast.error("Connection error. Try again.");
      return false;
    }
  };

  const logout = async () => {
    try {
      localStorage.removeItem(PROFILE_CACHE_KEY);
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      setUser(null);
      toast.success("Logged out successfully.");
      window.location.replace("/login");
    } catch (error) {
      console.error("Error logging out", error);
      toast.error("Failed to logout. Please try again.");
      setUser(null);
      window.location.replace("/login");
    }
  };

  const updateUserPreferences = (nextValues) => {
    setUser((prevUser) => {
      if (!prevUser) return prevUser;
      const merged = { ...prevUser, ...nextValues };
      localStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(merged));
      return merged;
    });
  };

  return (
    <AuthContext.Provider
      value={{ user, isAuthLoading, handleLogin, logout, updateUserPreferences }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
