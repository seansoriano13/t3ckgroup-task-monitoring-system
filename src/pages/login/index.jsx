import { GoogleLogin } from "@react-oauth/google";
import { jwtDecode } from "jwt-decode";
import { useNavigate } from "react-router";
import toast from "react-hot-toast";
import { useAuth } from "../../context/AuthContext";
import PrimaryButton from "../../components/PrimaryButton";

// Updated for the dark theme disabled state
export const INPUT_STYLE =
  "px-4 py-3 bg-gray-2 border border-gray-4 text-gray-8 rounded-lg outline-none cursor-not-allowed opacity-70 transition-all w-full";

export default function Login() {
  const { handleLogin } = useAuth();
  const navigate = useNavigate();

  const handleGoogleSuccess = async (credentialResponse) => {
    const decodedToken = jwtDecode(credentialResponse.credential);
    const { email, name, picture } = decodedToken;

    const isAuthorized = await handleLogin(email, name, picture);

    if (isAuthorized) {
      navigate("/");
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
                <span className="text-gray-8 lowercase normal-case font-normal">
                  (Disabled)
                </span>
              </label>
              <input
                disabled
                className={INPUT_STYLE}
                type="text"
                placeholder="name@t3ckgroup.com"
              />
            </div>

            <div className="grid gap-2">
              <label className="text-xs font-bold text-gray-10 uppercase tracking-wider flex justify-between">
                Password{" "}
                <span className="text-gray-8 lowercase normal-case font-normal">
                  (Disabled)
                </span>
              </label>
              <input
                disabled
                className={INPUT_STYLE}
                type="password"
                placeholder="••••••••"
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
                className="w-full sm:w-auto opacity-50 cursor-not-allowed bg-gray-4 text-gray-9 hover:bg-gray-4 shadow-none"
                onClick={(e) => e.preventDefault()}
              />

              <div className="w-full sm:w-auto flex justify-center drop-shadow-md hover:scale-105 transition-transform">
                <GoogleLogin
                  onSuccess={handleGoogleSuccess}
                  onError={handleGoogleError}
                  useOneTap
                  theme="filled_black" // 👈 Forces the Google button into dark mode!
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
