import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { Routes } from "@generouted/react-router";
import { AuthProvider } from "./context/AuthContext";
import { Toaster } from "react-hot-toast";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ErrorBoundary } from "react-error-boundary";
import { useTheme } from "./hooks/useTheme";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: true, // Instantly updates when they click back into browser
      refetchOnReconnect: "always",
      staleTime: 1000 * 60 * 5, // Considers data "fresh" for 5 minutes
      refetchInterval: 1000 * 30, // 👈 Increased to 30s: Better for mobile battery/background stability
      retry: 2, 
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
    },
  },
});

// eslint-disable-next-line react-refresh/only-export-components
function GlobalErrorFallback({ error, resetErrorBoundary }) {
  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gray-1 text-gray-12 p-6">
      <div className="bg-gray-2 border border-red-a5 p-8 rounded-2xl shadow-2xl max-w-lg text-center">
        <h2 className="text-2xl font-black text-red-9 mb-2">System Error</h2>
        <p className="text-gray-10 mb-6">The application encountered an unexpected issue.</p>
        <pre className="text-xs bg-gray-1 border border-gray-4 p-4 rounded-xl text-red-11 mb-6 overflow-x-auto text-left">
          {error.message}
        </pre>
        <button 
          onClick={resetErrorBoundary} 
          className="bg-primary hover:bg-primary-hover text-white px-6 py-3 rounded-xl font-bold transition-all"
        >
          Reload Dashboard
        </button>
      </div>
    </div>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
function ThemeApplier({ children }) {
  useTheme();
  return children;
}

createRoot(document.getElementById("root")).render(
  <StrictMode>
   <ErrorBoundary FallbackComponent={GlobalErrorFallback}>
     <QueryClientProvider client={queryClient}>
      <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}>
        <AuthProvider>
          <ThemeApplier>
            <Toaster
              position="bottom-center"
              reverseOrder={false}
              gutter={12}
              containerStyle={{ zIndex: 100000 }}
              toastOptions={{
                duration: 3000,
                style: {
                  background: "var(--card)",
                  color: "var(--foreground)",
                  borderRadius: "18px",
                  fontWeight: "600",
                  padding: "12px 24px",
                  boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)",
                  fontFamily: "inherit",
                  border: "1px solid var(--border)",
                  fontSize: "14px",
                },
                success: {
                  duration: 3000,
                  iconTheme: { primary: "#4F46E5", secondary: "#fff" },
                  style: { 
                    background: "var(--card)", 
                    color: "var(--foreground)",
                    borderLeft: "4px solid #4F46E5",
                    boxShadow: "0 10px 40px -10px rgba(79,70,229,0.2)",
                  },
                },
                error: {
                  duration: 4500,
                  iconTheme: { primary: "#EF4444", secondary: "#fff" },
                  style: { 
                    background: "var(--card)", 
                    color: "var(--foreground)",
                    borderLeft: "4px solid #EF4444",
                    boxShadow: "0 10px 40px -10px rgba(239,68,68,0.2)",
                  },
                },
                loading: {
                  style: { 
                    background: "var(--card)", 
                    color: "var(--foreground)",
                    boxShadow: "0 10px 40px -10px rgba(0,0,0,0.1)",
                  },
                },
              }}
            />
            <Routes />
          </ThemeApplier>
        </AuthProvider>
      </GoogleOAuthProvider>
    </QueryClientProvider>
   </ErrorBoundary>
  </StrictMode>,
);
