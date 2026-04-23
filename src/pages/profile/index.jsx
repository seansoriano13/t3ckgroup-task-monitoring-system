import {
  Mail,
  Building2,
  Briefcase,
  Hash,
  ShieldCheck,
  Loader2,
  UploadCloud,
  Sparkles,
  Save,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "../../lib/supabase";
import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { storageService } from "../../services/storageService";
import { employeeService } from "../../services/employeeService";
import { aiService } from "../../services/aiService";
import { TASK_STATUS, REVENUE_STATUS, SALES_PLAN_STATUS } from "../../constants/status";

const UNSPLASH_BANNER_POOL = [
  "https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=1600&q=80",
  "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=1600&q=80",
  "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1600&q=80",
  "https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=1600&q=80",
  "https://images.unsplash.com/photo-1470770841072-f978cf4d019e?auto=format&fit=crop&w=1600&q=80",
  "https://images.unsplash.com/photo-1518173946687-a4c8892bbd9f?auto=format&fit=crop&w=1600&q=80",
];

export default function ProfilePage() {
  const { user, updateUserPreferences } = useAuth();
  const avatarInputRef = useRef(null);
  const bannerInputRef = useRef(null);
  const [customQuote, setCustomQuote] = useState(user?.dashboardQuote || "");
  const [avatarFile, setAvatarFile] = useState(null);
  const [bannerFile, setBannerFile] = useState(null);
  const [bannerUrlInput, setBannerUrlInput] = useState("");
  const [removeAvatar, setRemoveAvatar] = useState(false);
  const [removeBanner, setRemoveBanner] = useState(false);
  const [removeQuote, setRemoveQuote] = useState(false);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState("");
  const [bannerPreviewUrl, setBannerPreviewUrl] = useState("");

  const isHttpUrl = (value) => /^https?:\/\//i.test(value || "");

  useEffect(() => {
    setCustomQuote(user?.dashboardQuote || "");
  }, [user?.dashboardQuote]);

  useEffect(() => {
    setBannerUrlInput(isHttpUrl(user?.dashboardBannerPath) ? user.dashboardBannerPath : "");
  }, [user?.dashboardBannerPath]);

  useEffect(() => {
    if (avatarFile) {
      const objectUrl = URL.createObjectURL(avatarFile);
      setAvatarPreviewUrl(objectUrl);
      return () => URL.revokeObjectURL(objectUrl);
    }

    if (removeAvatar) {
      setAvatarPreviewUrl("/default-avatar.png");
      return undefined;
    }

    setAvatarPreviewUrl(user?.picture || "/default-avatar.png");
    return undefined;
  }, [avatarFile, removeAvatar, user?.picture]);

  useEffect(() => {
    if (bannerFile) {
      const objectUrl = URL.createObjectURL(bannerFile);
      setBannerPreviewUrl(objectUrl);
      return () => URL.revokeObjectURL(objectUrl);
    }

    if (removeBanner) {
      setBannerPreviewUrl("/leaf-background.jpg");
      return undefined;
    }

    if ((bannerUrlInput || "").trim()) {
      setBannerPreviewUrl(bannerUrlInput.trim());
      return undefined;
    }

    setBannerPreviewUrl(user?.dashboardBannerUrl || "/leaf-background.jpg");
    return undefined;
  }, [bannerFile, removeBanner, bannerUrlInput, user?.dashboardBannerUrl]);

  const { data: stats, isLoading: isStatsLoading } = useQuery({
    queryKey: ["profileStats", user?.id],
    queryFn: async () => {
      if (user?.isSuperAdmin) return null;

      const userDept = user?.department || "";
      const isSales = user?.has_sales_flow;

      if (user?.isHr || user?.is_hr) {
        // HR Access
        const { count: pendingVerifications } = await supabase
          .from("tasks")
          .select("*", { count: "exact", head: true })
          .eq("hr_verified", false)
          .eq("status", TASK_STATUS.COMPLETE);
        const { count: totalVerified } = await supabase
          .from("tasks")
          .select("*", { count: "exact", head: true })
          .eq("hr_verified", true);

        return {
          primary: pendingVerifications || 0,
          primaryLabel: "Pending HR Verifications",
          secondary: totalVerified || 0,
          secondaryLabel: "Total Verified",
        };
      } else if (user?.isHead || user?.is_head) {
        // Department Head logic
        if (isSales) {
          // Sales Head specific stats
          const { count: pendingExpenses } = await supabase
            .from("sales_activities")
            .select("*", { count: "exact", head: true })
            .eq("status", REVENUE_STATUS.PENDING)
            .neq("is_deleted", true);

          const { count: pendingPlans } = await supabase
            .from("sales_weekly_plans")
            .select("*", { count: "exact", head: true })
            .in("status", [SALES_PLAN_STATUS.SUBMITTED, SALES_PLAN_STATUS.REVISION]);

          const { count: totalVerifiedSales } = await supabase
            .from("sales_activities")
            .select("*", { count: "exact", head: true })
            .not("head_verified_at", "is", null)
            .neq("is_deleted", true);

          return {
            primary: (pendingExpenses || 0) + (pendingPlans || 0),
            primaryLabel: "Sales Approvals Needed",
            secondary: totalVerifiedSales || 0,
            secondaryLabel: "Sales Evaluated",
          };
        } else {
          // Regular Dept Head stats
          const { count: pendingApprovals } = await supabase
            .from("tasks")
            .select("*", { count: "exact", head: true })
            .eq("department", userDept)
            .eq("status", TASK_STATUS.AWAITING_APPROVAL);

          const { count: totalApproved } = await supabase
            .from("tasks")
            .select("*", { count: "exact", head: true })
            .eq("department", userDept)
            .in("status", [TASK_STATUS.COMPLETE, TASK_STATUS.NOT_APPROVED]);

          return {
            primary: pendingApprovals || 0,
            primaryLabel: "Awaiting Your Approval",
            secondary: totalApproved || 0,
            secondaryLabel: "Your Evaluated Tasks",
          };
        }
      } else {
        // Regular Employee logic
        if (isSales) {
          // Sales Representative specific stats
          const { count: totalActivities } = await supabase
            .from("sales_activities")
            .select("*", { count: "exact", head: true })
            .eq("employee_id", user.id)
            .neq("is_deleted", true);

          const { count: totalSalesOrders } = await supabase
            .from("sales_revenue_logs")
            .select("*", { count: "exact", head: true })
            .eq("employee_id", user.id)
            .eq("record_type", "SALES_ORDER")
            .neq("is_deleted", true);

          return {
            primary: totalActivities || 0,
            primaryLabel: "Activities Tracked",
            secondary: totalSalesOrders || 0,
            secondaryLabel: "Sales Orders Won",
          };
        } else {
          // Standard Task-based stats
          const { count: totalLogged } = await supabase
            .from("tasks")
            .select("*", { count: "exact", head: true })
            .eq("logged_by", user.id)
            .neq("status", TASK_STATUS.DELETED);

          const { count: totalDone } = await supabase
            .from("tasks")
            .select("*", { count: "exact", head: true })
            .eq("logged_by", user.id)
            .eq("status", TASK_STATUS.COMPLETE);

          return {
            primary: totalLogged || 0,
            primaryLabel: "Total Tasks Logged",
            secondary: totalDone || 0,
            secondaryLabel: "Activities Completed",
          };
        }
      }
    },
    enabled: !!user?.id,
  });

  const generateQuoteMutation = useMutation({
    mutationFn: async () => {
      return aiService.getRandomMotivationalQuote(user?.name?.split(" ")?.[0] || "Team");
    },
    onSuccess: (quote) => {
      setCustomQuote(quote);
      setRemoveQuote(false);
      toast.success("Picked a random motivational quote.");
    },
    onError: () => {
      toast.error("Could not generate quote right now.");
    },
  });

  const savePreferencesMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error("Missing user session.");

      let avatarPath = removeAvatar ? null : user?.avatarPath || null;
      let dashboardBannerPath = removeBanner ? null : user?.dashboardBannerPath || null;

      if (avatarFile) {
        avatarPath = await storageService.uploadProfileImage(user.id, "avatar", avatarFile);
      }
      if (bannerFile) {
        dashboardBannerPath = await storageService.uploadProfileImage(user.id, "banner", bannerFile);
      } else if ((bannerUrlInput || "").trim()) {
        dashboardBannerPath = bannerUrlInput.trim();
      }

      const dashboardQuote = removeQuote ? "" : customQuote.trim().slice(0, 72);

      const updated = await employeeService.updateSelfPreferences(user.id, {
        avatarPath,
        dashboardBannerPath,
        dashboardQuote: dashboardQuote || null,
      });

      const [picture, dashboardBannerUrl] = await Promise.all([
        updated.avatar_path
          ? (isHttpUrl(updated.avatar_path)
            ? updated.avatar_path
            : storageService.getSignedUrl(updated.avatar_path))
          : null,
        updated.dashboard_banner_path
          ? (isHttpUrl(updated.dashboard_banner_path)
            ? updated.dashboard_banner_path
            : storageService.getSignedUrl(updated.dashboard_banner_path))
          : null,
      ]);

      return {
        avatarPath: updated.avatar_path || null,
        dashboardBannerPath: updated.dashboard_banner_path || null,
        dashboardQuote: updated.dashboard_quote || "",
        picture: picture || user?.picture || "",
        dashboardBannerUrl: dashboardBannerUrl || null,
      };
    },
    onSuccess: (nextUserValues) => {
      updateUserPreferences(nextUserValues);
      setAvatarFile(null);
      setBannerFile(null);
      setRemoveAvatar(false);
      setRemoveBanner(false);
      setRemoveQuote(false);
      setBannerUrlInput(
        isHttpUrl(nextUserValues.dashboardBannerPath) ? nextUserValues.dashboardBannerPath : "",
      );
      toast.success("Dashboard preferences saved.");
    },
    onError: (error) => {
      toast.error(error?.message || "Failed to save preferences.");
    },
  });

  const isSaving = savePreferencesMutation.isPending;
  const quoteLength = customQuote.trim().length;
  const hasBannerUrl = (bannerUrlInput || "").trim().length > 0;
  const isUsingDefaultBanner = removeBanner || (!bannerFile && !hasBannerUrl && !user?.dashboardBannerPath);
  const isUsingDefaultAvatar = removeAvatar || (!avatarFile && !user?.avatarPath);
  const isUsingDefaultQuote = removeQuote || quoteLength === 0;

  return (
    <div className="max-w-4xl mx-auto space-y-6 px-4 sm:px-6 lg:px-8">
      {/* HEADER */}
      <div className="border-b border-border pb-6">
        <h1 className="text-4xl font-black text-foreground tracking-tight">My Profile</h1>
        <p className="text-muted-foreground mt-1.5 font-medium text-sm uppercase tracking-[0.15em]">
          Manage your employee information and access levels.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT COLUMN: The ID Card */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-card border border-border rounded-2xl p-6 flex flex-col gap-3 items-center text-center shadow-sm">
            <div className="relative">
              <img
                src={user?.picture || "/default-avatar.png"}
                alt="Profile"
                className="w-24 h-24 rounded-2xl border-4 border-border shadow-md mb-4 object-cover"
                referrerPolicy="no-referrer"
              />
              {/* Role Badges floating on the avatar */}
              {(user?.isHead || user?.isHr) && (
                <div className="flex gap-2">
                  {user?.isHead && (
                    <span className="bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-black px-2.5 py-0.5 rounded-lg uppercase tracking-widest shadow-sm">
                      Head
                    </span>
                  )}
                  {user?.isHr && (
                    <span className="bg-indigo-50 text-indigo-700 border border-indigo-200 text-[10px] font-black px-2.5 py-0.5 rounded-lg uppercase tracking-widest shadow-sm">
                      HR
                    </span>
                  )}
                </div>
              )}
            </div>

            <div>
              <h2 className="text-xl font-black text-foreground">{user?.name || "Employee Name"}</h2>
              <p className="text-muted-foreground text-sm mt-1 flex items-center gap-2 justify-center">
                <Mail size={13} /> {user?.email || "email@t3ckgroup.com"}
              </p>
            </div>
          </div>

        
        </div>

        {/* RIGHT COLUMN: Details & Stats */}
        <div className="lg:col-span-2 space-y-6">
          {/* Department Info */}
            <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-5 border-b border-border pb-3">
                Organizational Details
              </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="flex gap-4 items-start">
                <div className="w-10 h-10 bg-indigo-50 border border-indigo-100 rounded-xl flex items-center justify-center text-indigo-500">
                  <Building2 size={20} />
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em]">
                    Department
                  </p>
                  <p className="text-foreground font-black mt-0.5 text-sm">
                    {user?.department || "Unassigned"}
                  </p>
                </div>
              </div>

              <div className="flex gap-4 items-start">
                <div className="p-3 bg-gray-3 rounded-xl ">
                  <Briefcase size={20} />
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em]">
                    Sub-Department
                  </p>
                  <p className="text-foreground font-black mt-0.5 text-sm">
                    {user?.subDepartment || "N/A"}
                  </p>
                </div>
              </div>

              <div className="flex gap-4 items-start sm:col-span-2 border-t border-gray-3 pt-4 mt-2">
                <div className="p-3 bg-gray-3 rounded-xl ">
                  <ShieldCheck size={20} />
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em]">
                    System ID
                  </p>
                <p className="text-muted-foreground font-mono text-xs mt-1 break-all select-all">
                    {user?.id || "UUID_PENDING"}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Live Dynamic Stats */}
          {!user?.isSuperAdmin && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-card border border-border rounded-2xl p-5 shadow-sm flex items-center gap-4">
                <div className="w-12 h-12 bg-indigo-50 border border-indigo-100 rounded-2xl flex items-center justify-center text-indigo-500">
                  <Hash size={20} />
                </div>
                <div>
                  <p className="text-2xl font-black text-foreground">
                    {isStatsLoading ? (
                      <Loader2 size={16} className="animate-spin mt-1 mb-2" />
                    ) : (
                      stats?.primary
                    )}
                  </p>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em]">
                    {stats?.primaryLabel || "Metrics"}
                  </p>
                </div>
              </div>
              <div className="bg-card border border-border rounded-2xl p-5 shadow-sm flex items-center gap-4">
                <div className="w-12 h-12 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center justify-center text-emerald-500">
                  <ShieldCheck size={20} />
                </div>
                <div>
                  <p className="text-2xl font-black text-emerald-600">
                    {isStatsLoading ? (
                      <Loader2 size={16} className="animate-spin mt-1 mb-2" />
                    ) : (
                      stats?.secondary
                    )}
                  </p>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em]">
                    {stats?.secondaryLabel || "Completed"}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="lg:col-span-3 bg-card border border-border rounded-2xl p-5 md:p-6 shadow-sm space-y-5">
            <div className="flex items-start justify-between gap-3 border-b border-border pb-4">
              <div>
                <h3 className="text-base font-black text-foreground">Dashboard Personalization</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Banner, quote, and avatar apply across all dashboard views.
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-muted/30 p-4 space-y-3">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Live Preview</p>
              <div className="relative rounded-lg overflow-hidden h-24">
                <img
                  src={bannerPreviewUrl || "/leaf-background.jpg"}
                  alt="Banner preview"
                  className="absolute inset-0 w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/35" />
                <div className="absolute left-3 right-3 bottom-2 flex items-center justify-between gap-2">
                  <p className="text-[11px] text-white/90 font-semibold">Dashboard banner preview</p>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-black/50 text-white/90 border border-white/20">
                    {isUsingDefaultBanner ? "Default" : "Custom"}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <img
                  src={avatarPreviewUrl || "/default-avatar.png"}
                  alt="Avatar preview"
                  className="w-10 h-10 rounded-xl object-cover border border-border"
                />
                <span className="text-xs text-muted-foreground font-medium">
                  Profile photo preview ({isUsingDefaultAvatar ? "Default" : "Custom"})
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2 rounded-xl border border-border bg-muted/30 p-4">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Profile photo</p>
                <button
                  type="button"
                  onClick={() => avatarInputRef.current?.click()}
                  className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-muted hover:bg-muted/70 text-sm font-black transition border border-border uppercase tracking-widest text-[10px]"
                >
                  <UploadCloud size={16} /> {avatarFile ? avatarFile.name : "Upload avatar"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAvatarFile(null);
                    setRemoveAvatar(true);
                  }}
                  disabled={isUsingDefaultAvatar}
                  className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl border border-border text-[10px] font-black uppercase tracking-widest transition enabled:hover:bg-muted disabled:opacity-50"
                >
                  Reset to default
                </button>
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    setAvatarFile(e.target.files?.[0] || null);
                    setRemoveAvatar(false);
                  }}
                />
              </div>

              <div className="space-y-2 rounded-xl border border-border bg-muted/30 p-4">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Dashboard banner</p>
                <button
                  type="button"
                  onClick={() => bannerInputRef.current?.click()}
                  className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-muted hover:bg-muted/70 text-[10px] font-black uppercase tracking-widest transition border border-border"
                >
                  <UploadCloud size={16} /> {bannerFile ? bannerFile.name : "Upload banner"}
                </button>
                <input
                  ref={bannerInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    setBannerFile(e.target.files?.[0] || null);
                    setBannerUrlInput("");
                    setRemoveBanner(false);
                  }}
                />
                <input
                  type="url"
                  value={bannerUrlInput}
                  onChange={(e) => {
                    setBannerUrlInput(e.target.value);
                    setBannerFile(null);
                    setRemoveBanner(false);
                  }}
                  className="w-full rounded-xl border border-border bg-muted/40 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-400/40 transition-all"
                  placeholder="Paste Unsplash image URL"
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const randomBanner =
                        UNSPLASH_BANNER_POOL[
                          Math.floor(Math.random() * UNSPLASH_BANNER_POOL.length)
                        ];
                      setBannerUrlInput(randomBanner);
                      setBannerFile(null);
                      setRemoveBanner(false);
                    }}
                    className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-muted hover:bg-muted/70 text-[10px] font-black uppercase tracking-widest transition border border-border"
                  >
                    Random Unsplash
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setBannerFile(null);
                      setBannerUrlInput("");
                      setRemoveBanner(true);
                    }}
                    disabled={isUsingDefaultBanner}
                    className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl border border-border text-[10px] font-black uppercase tracking-widest transition enabled:hover:bg-muted disabled:opacity-50"
                  >
                    Reset banner
                  </button>
                </div>
              </div>
            </div>

            <div className="space-y-2 rounded-xl border border-border bg-muted/30 p-4">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Motivational Quote</p>
                <span className="text-[11px] text-gray-8">{quoteLength}/72</span>
              </div>
              <textarea
                value={customQuote}
                maxLength={72}
                onChange={(e) => {
                  setCustomQuote(e.target.value);
                  setRemoveQuote(false);
                }}
                className="w-full min-h-[70px] rounded-xl border border-border bg-muted/40 p-3 text-sm outline-none focus:ring-2 focus:ring-indigo-400/40 transition-all resize-none"
                placeholder="Write your 7-word motivational quote (all users)..."
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => generateQuoteMutation.mutate()}
                  disabled={generateQuoteMutation.isPending}
                  className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-black uppercase tracking-widest transition disabled:opacity-70 shadow-lg shadow-indigo-100"
                >
                  {generateQuoteMutation.isPending ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Sparkles size={16} />
                  )}
                  Random 7-word quote
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCustomQuote("");
                    setRemoveQuote(true);
                  }}
                  disabled={isUsingDefaultQuote}
                  className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl border border-border text-[10px] font-black uppercase tracking-widest transition enabled:hover:bg-muted disabled:opacity-50"
                >
                  Reset quote
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={() => savePreferencesMutation.mutate()}
              disabled={isSaving}
              className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-black uppercase tracking-widest shadow-xl shadow-indigo-100 transition disabled:opacity-70"
            >
              {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              Save dashboard settings
            </button>
          </div>
      </div>
    </div>
  );
}
