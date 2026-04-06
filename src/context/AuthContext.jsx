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

    // Shared helper — looks up the employee record from DB and merges Google metadata.
    // Only called on initial session load or explicit SIGNED_IN — NOT on TOKEN_REFRESHED.
    // Role changes in the DB only take effect after the user logs out and back in.
    const resolveEmployee = async (sessionUser) => {
      try {
        const employee = await employeeService.getEmployeeByEmail(sessionUser.email);
        if (employee) {
          const metadata = sessionUser.user_metadata || null;
          setUser({
            ...employee,
            picture: metadata?.avatar_url || metadata?.picture || "",
          });
        }
        // If employee not found: don't touch React state.
        // Supabase will fire SIGNED_OUT itself if the token is truly invalid.
        // Silently failing here prevents false logouts on network hiccups.
      } catch (err) {
        // Network error during employee lookup — do NOT log the user out.
        // Keep existing user state; they'll see stale data at worst.
        console.warn("Auth: employee lookup failed (network?), keeping existing session:", err.message);
      }
    };

    // Safety net: if auth never resolves (offline, token deadlock, slow network),
    // release the loading gate after 10s so the user reaches the login page
    // instead of being stuck on "Loading Portal..." forever.
    const timeout = setTimeout(() => {
      if (!settled) {
        settled = true;
        console.warn("Auth: session resolution timed out — releasing loading gate");
        setIsAuthLoading(false);
      }
    }, 10_000);

    // 🔄 Real-time Session Sync
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "INITIAL_SESSION") {
        if (session?.user?.email) {
          await resolveEmployee(session.user);
        } else {
          setUser(null);
        }
        if (!settled) {
          settled = true;
          clearTimeout(timeout);
          setIsAuthLoading(false);
        }
      } else if (event === "SIGNED_IN") {
        // Explicit new login — always re-fetch the employee to get fresh role data
        if (session?.user?.email) {
          await resolveEmployee(session.user);
        }
        if (!settled) {
          settled = true;
          clearTimeout(timeout);
          setIsAuthLoading(false);
        }
      } else if (event === "TOKEN_REFRESHED") {
        // The session token was refreshed automatically (e.g. Android app resume).
        // Only release the loading gate if it hasn't been settled yet.
        if (!settled) {
          if (session?.user?.email) {
            await resolveEmployee(session.user);
          }
          settled = true;
          clearTimeout(timeout);
          setIsAuthLoading(false);
        }
      } else if (event === "SIGNED_OUT") {
        setUser(null);
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
