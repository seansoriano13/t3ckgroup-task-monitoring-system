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
    const initializeSession = async () => {
      setIsAuthLoading(true);
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (session?.user?.email) {
          const employee = await employeeService.getEmployeeByEmail(
            session.user.email,
          );

          if (employee) {
            const metadata = session.user.user_metadata || null;
            setUser({
              ...employee,
              picture: metadata?.avatar_url || metadata?.picture || "",
            });
          }
        }
      } catch (error) {
        console.error("Auth Initialization Error:", error);
        setUser(null);
      } finally {
        setIsAuthLoading(false);
      }
    };

    initializeSession();
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
