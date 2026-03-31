import { useState } from "react";
import { GoogleLogin } from "@react-oauth/google";
import { useNavigate } from "react-router";
import toast from "react-hot-toast";
import { useAuth } from "../../context/AuthContext";
import PrimaryButton from "../../components/PrimaryButton";
import { useTheme } from "../../hooks/useTheme";
import { supabase } from "../../lib/supabase";

// Updated for the dark theme disabled state
export const INPUT_STYLE =
  "px-4 py-3 bg-gray-2 border border-gray-4 text-gray-8 rounded-lg outline-none cursor-not-allowed opacity-70 transition-all w-full";

export default function Login() {
  const { handleLogin, handleTestLogin } = useAuth();
  const navigate = useNavigate();
  const { theme } = useTheme();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const allowTestLogin = import.meta.env.VITE_ALLOW_TEST_LOGIN === "true";

  const handleManualLogin = async (e) => {
    e.preventDefault();
    if (!allowTestLogin) return;

    if (!email || !password) {
      toast.error("Please enter email and password.");
      return;
    }
    const success = await handleTestLogin(email, password);
    if (success) navigate("/");
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    try {
      const { data, error } = await supabase.auth.signInWithIdToken({
        provider: "google",
        token: credentialResponse.credential,
      });

      if (error) throw error;

      const googleEmail = data.user.email;
      const googlePictureUrl =
        data.user.user_metadata.avatar_url ||
        data.user.user_metadata.picture ||
        "";

      const isAuthorized = await handleLogin(googleEmail, googlePictureUrl);

      if (isAuthorized) {
        navigate("/");
      }
    } catch (error) {
      console.error("Google login failed:", error);
    }
  };

  const handleGoogleError = () => {
    toast.error("Failed to connect to Google.");
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 min-h-screen bg-gray-1 text-gray-12 font-sans">
      {/* LEFT: Form Panel */}
      <div className="flex flex-col justify-center px-8 sm:px-16 lg:px-24 xl:px-32 py-12 relative z-10">
        <div className="max-w-md w-full mx-auto space-y-8">
          {/* Header */}
          <div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-gray-12">
              Welcome to <span className="text-primary">T3ckgroup</span>
            </h1>
            <p className="text-gray-9 mt-2 font-medium">
              Sign in to access the employee portal.
            </p>
          </div>

          {/* Dummy Form */}
          <div className="grid gap-5">
            <div className="grid gap-2">
              <label className="text-xs font-bold text-gray-10 uppercase tracking-wider flex justify-between">
                Email Address{" "}
                {!allowTestLogin && (
                  <span className="text-gray-8 lowercase normal-case font-normal">
                    (Disabled)
                  </span>
                )}
              </label>
              <input
                disabled={!allowTestLogin}
                className={`${INPUT_STYLE} ${!allowTestLogin ? "cursor-not-allowed opacity-70" : "cursor-text opacity-100"}`}
                type="text"
                placeholder="name@t3ckgroup.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="grid gap-2">
              <label className="text-xs font-bold text-gray-10 uppercase tracking-wider flex justify-between">
                Password{" "}
                {!allowTestLogin && (
                  <span className="text-gray-8 lowercase normal-case font-normal">
                    (Disabled)
                  </span>
                )}
              </label>
              <input
                disabled={!allowTestLogin}
                className={`${INPUT_STYLE} ${!allowTestLogin ? "cursor-not-allowed opacity-70" : "cursor-text opacity-100"}`}
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          {/* Action Area */}
          <div className="pt-6 border-t border-gray-4 mt-8">
            <p className="text-sm font-bold text-gray-9 mb-4">
              Please authenticate using your corporate Google account.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 items-center">
              {/* Making the custom button look disabled so users know to click Google */}
              <PrimaryButton
                label="Log In"
                className={`w-full sm:w-auto ${!allowTestLogin ? "opacity-50 cursor-not-allowed bg-gray-4 text-gray-9 hover:bg-gray-4 shadow-none" : ""}`}
                onClick={handleManualLogin}
              />

              <div className="w-full sm:w-auto flex justify-center drop-shadow-md hover:scale-105 transition-transform">
                <GoogleLogin
                  onSuccess={handleGoogleSuccess}
                  onError={handleGoogleError}
                  useOneTap
                  theme={theme === "light" ? "outline" : "filled_black"} // 👈 Applies theme dynamically
                  shape="rectangular"
                  size="large"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT: Cover Image */}
      {/* Hidden on mobile, visible on large screens */}
      <div className="hidden lg:block h-screen p-4 relative">
        <div className="shadow-2xl h-full w-full flex items-center justify-center rounded-2xl overflow-hidden border border-gray-4 bg-gray-2 relative">
          {/* Optional: A subtle gradient overlay to make the image fit the dark theme better */}
          <div className="absolute inset-0 z-10 pointer-events-none" />

          <img
            src="/login-image-portrait.png"
            className="pointer-events-none object-cover h-full w-full opacity-90"
            alt="Corporate Banner"
          />
        </div>
      </div>
    </div>
  );
}
