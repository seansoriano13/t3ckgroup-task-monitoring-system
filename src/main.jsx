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
      refetchOnWindowFocus: true, // Instantly updates when they click back into the browser tab!
      staleTime: 1000 * 60 * 5, // Considers data "fresh" for 5 minutes to save bandwidth
      refetchInterval: 10000, // 👈 THE REAL-TIME MAGIC: Silently pulls fresh data every 10 seconds
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
              containerStyle={{ zIndex: 9999 }}
              toastOptions={{
                duration: 3000,
                style: {
                  background: "#1f1f1f",
                  color: "#fff",
                  borderRadius: "12px",
                  fontWeight: "600",
                  padding: "14px 18px",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.25)",
                  fontFamily: "'Inter', sans-serif",
                },
                success: {
                  duration: 2500,
                  iconTheme: { primary: "#22c55e", secondary: "#fff" },
                  style: { background: "#22c55e", color: "#fff" },
                },
                error: {
                  duration: 4000,
                  iconTheme: { primary: "#ef4444", secondary: "#fff" },
                  style: { background: "#ef4444", color: "#fff" },
                },
                loading: {
                  style: { background: "#facc15", color: "#000" },
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
