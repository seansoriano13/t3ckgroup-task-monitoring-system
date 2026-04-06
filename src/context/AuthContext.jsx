import { useEffect } from "react";
import { createContext } from "react";
import { useState } from "react";
import { employeeService } from "../services/employeeService.js";
import toast from "react-hot-toast";
import { useContext } from "react";
import { supabase } from "../lib/supabase.js";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  useEffect(() => {
    let settled = false; // ensures setIsAuthLoading(false) only fires once

    // Shared helper — looks up the employee record and enriches with Google metadata
    const resolveEmployee = async (sessionUser) => {
      const employee = await employeeService.getEmployeeByEmail(sessionUser.email);
      if (employee) {
        const metadata = sessionUser.user_metadata || null;
        setUser({
          ...employee,
          picture: metadata?.avatar_url || metadata?.picture || "",
        });
      } else {
        // Email exists in Supabase Auth but not in the employees table
        setUser(null);
      }
    };

    // Safety net: if Supabase never resolves (network offline, token deadlock),
    // release the loading gate after 10 seconds so the user sees the login page
    // instead of being stuck on "Loading Portal..." forever.
    const timeout = setTimeout(() => {
      if (!settled) {
        settled = true;
        console.warn("Auth: session resolution timed out — releasing loading gate");
        setIsAuthLoading(false);
      }
    }, 10_000);

    const initializeSession = async () => {
      setIsAuthLoading(true);
      try {
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (error) {
          // Corrupt or expired token — clear it so the user isn't permanently stuck.
          // This is the root cause of the Android "swipe-up reload" freeze.
          console.warn("Auth: getSession error, signing out to clear stale token:", error.message);
          await supabase.auth.signOut();
          setUser(null);
          return;
        }

        if (session?.user?.email) {
          await resolveEmployee(session.user);
        } else {
          setUser(null);
        }
      } catch (err) {
        console.error("Auth Initialization Error:", err);
        // Clear any stale token to prevent the stuck-loading loop on next reload
        try { await supabase.auth.signOut(); } catch (_) { /* ignore */ }
        setUser(null);
      } finally {
        if (!settled) {
          settled = true;
          clearTimeout(timeout);
          setIsAuthLoading(false);
        }
      }
    };

    initializeSession();

    // 🔄 Real-time Session Sync: Listen for auth state changes globally
    //
    // KEY FIX: On Android reload, Supabase fires TOKEN_REFRESHED (not SIGNED_IN).
    // The previous handler only caught SIGNED_IN, so mobile reloads with a valid
    // refresh token silently failed to set the user — causing the stuck load screen.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (
        (event === "SIGNED_IN" || event === "TOKEN_REFRESHED" || event === "INITIAL_SESSION") &&
        session?.user?.email
      ) {
        await resolveEmployee(session.user);
        // Ensure the loading gate is released if onAuthStateChange fires
        // before initializeSession() completes (race condition on fast devices)
        if (!settled) {
          settled = true;
          clearTimeout(timeout);
          setIsAuthLoading(false);
        }
      } else if (event === "SIGNED_OUT") {
        setUser(null);
      } else if (event === "INITIAL_SESSION" && !session) {
        // No session on initial load — user is logged out, release gate immediately
        if (!settled) {
          settled = true;
          clearTimeout(timeout);
          setIsAuthLoading(false);
        }
      }
    });

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, []);


  const handleLogin = async (googleEmail, googlePictureUrl) => {
    setIsAuthLoading(true);
    try {
      const dbEmployee = await employeeService.getEmployeeByEmail(googleEmail);

      if (dbEmployee) {
        const sessionUser = {
          ...dbEmployee,
          picture: googlePictureUrl,
        };

        setUser(sessionUser);

        toast.success(`Welcome, ${dbEmployee.name}`);
        return true;
      } else {
        await supabase.auth.signOut();
        toast.error(
          "Unauthorized: Your email is not registered in the employee database.",
        );
        return false;
      }
    } catch (error) {
      console.error("Login error:", error);
      toast.error("A network error occurred.");
      return false;
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleTestLogin = async (email, password) => {
    setIsAuthLoading(true);
    try {
      const testPassword = import.meta.env.VITE_TEST_PASSWORD;
      const allowTestLogin = import.meta.env.VITE_ALLOW_TEST_LOGIN === "true";

      if (!allowTestLogin) {
        toast.error("Test login is currently disabled.");
        return false;
      }

      if (password !== testPassword) {
        toast.error("Invalid test password.");
        return false;
      }

      const dbEmployee = await employeeService.getEmployeeByEmail(email);

      if (dbEmployee) {
        const sessionUser = {
          ...dbEmployee,
          picture: `https://ui-avatars.com/api/?name=${encodeURIComponent(dbEmployee.name)}&background=random`,
        };

        setUser(sessionUser);
        toast.success(`Welcome (Test Mode), ${dbEmployee.name}`);
        return true;
      } else {
        toast.error("Unauthorized: Test email not found in database.");
        return false;
      }
    } catch (error) {
      console.error("Test Login error:", error);
      toast.error("A network error occurred during test login.");
      return false;
    } finally {
      setIsAuthLoading(false);
    }
  };

  const logout = async () => {
    try {
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

  return (
    <AuthContext.Provider
      value={{ user, isAuthLoading, handleLogin, handleTestLogin, logout }}
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
