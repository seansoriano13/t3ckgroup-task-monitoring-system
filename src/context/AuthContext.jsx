import { useEffect } from "react";
import { createContext } from "react";
import { useState } from "react";
import { employeeService } from "../services/employeeService.js";
import toast from "react-hot-toast";
import { useContext } from "react";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  useEffect(() => {
    const checkSession = async () => {
      const storedUser = localStorage.getItem("t3ck_session");
      if (storedUser) {
        setUser(JSON.parse(storedUser));
      }
      setIsAuthLoading(false);
    };

    checkSession();
  }, []);

  const handleLogin = async (googleEmail, googleName, googlePictureUrl) => {
    setIsAuthLoading(true);
    try {
      const dbEmployee = await employeeService.getEmployeeByEmail(googleEmail);

      if (dbEmployee) {
        const sessionUser = {
          ...dbEmployee,
          picture: googlePictureUrl,
        };

        setUser(sessionUser);
        localStorage.setItem("t3ck_session", JSON.stringify(sessionUser));
        toast.success(`Welcome, ${dbEmployee.name}`);
        return true;
      } else {
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

  const logout = () => {
    setUser(null);
    localStorage.removeItem("t3ck_session");
    toast.success("Logged out successfully.");

    window.location.href = "/login";
  };

  return (
    <AuthContext.Provider value={{ user, isAuthLoading, handleLogin, logout }}>
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
