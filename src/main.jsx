import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { Routes } from "@generouted/react-router";
import { AuthProvider } from "./context/AuthContext";
import { Toaster } from "react-hot-toast";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: true, // Instantly updates when they click back into the browser tab!
      staleTime: 1000 * 60 * 5, // Considers data "fresh" for 5 minutes to save bandwidth
      refetchInterval: 10000, // 👈 THE REAL-TIME MAGIC: Silently pulls fresh data every 10 seconds
    },
  },
});

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <GoogleOAuthProvider clientId="657214572650-l21fq9k3kp078k343go0o22toagqgirs.apps.googleusercontent.com">
        <AuthProvider>
          <Toaster
            position="bottom-center"
            reverseOrder={false}
            gutter={12}
            containerStyle={{ zIndex: 9999 }}
            toastOptions={{
              duration: 3000, // default duration
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
        </AuthProvider>
      </GoogleOAuthProvider>
    </QueryClientProvider>
  </StrictMode>,
);
