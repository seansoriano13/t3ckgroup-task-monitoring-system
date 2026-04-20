import {
  Plus,
  Bell,
  MessageCircle,
  LayoutList,
  UserRound,
  ListCheck,
  Bolt,
  ShieldCheck,
  Users,
  Crown,
  CalendarDays,
  CheckSquare,
  DollarSign,
  X,
  ClipboardList,
  ChevronDown,
  PanelLeft,
  PanelRight,
  SquarePen,
  Megaphone,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { notificationService } from "../services/notificationService";
import { activeChatService } from "../services/tasks/activeChatService";
import NotificationDrawer from "./NotificationDrawer";
import ComprehensiveChatModal from "./ComprehensiveChatModal";
import BroadcastDrawer from "./BroadcastDrawer";
import GlobalDetailManager from "./GlobalDetailManager";
import { NavLink, useNavigate } from "react-router";
import { useState } from "react";
import LogTaskModal from "./LogTaskModal";
import Select, { components } from "react-select";

export default function SideNav({ onOpenAddTask }) {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Mobile Toggle State
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isLogTaskOpen, setIsLogTaskOpen] = useState(false);
  const [isBroadcastOpen, setIsBroadcastOpen] = useState(false);

  // Notification State
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const { data: notifications = [] } = useQuery({
    queryKey: ["notifications", user?.id],
    queryFn: () => notificationService.getMyNotifications(user?.id),
    enabled: !!user?.id,
  });
  const unreadCount = notifications.filter((n) => !n.is_read).length;

  // Active Chats State
  const [isChatsOpen, setIsChatsOpen] = useState(false);
  const { data: activeChats = [] } = useQuery({
    queryKey: ["activeChats", user?.id],
    queryFn: () => activeChatService.getActiveChats(user?.id),
    enabled: !!user?.id,
  });
  const unreadChatsCount = activeChats.filter((c) => c.is_unread).length;

  const isSales =
    user?.department?.toLowerCase().includes("sales") ||
    user?.subDepartment?.toLowerCase().includes("sales");

  // Nav mapping logic mapped similarly to original implementation
  let navLinks = [];

  if (user?.isSuperAdmin) {
    navLinks = [
      { label: "Dashboard", link: "/", icon: LayoutList },
      { label: "Tasks", link: "/tasks", icon: ListCheck },
      { label: "Task Approval", link: "/approvals", icon: ShieldCheck },
      { label: "Sales Approval", link: "/approvals/sales", icon: ShieldCheck },
      { label: "Log Sales", link: "/sales/log-sales", icon: DollarSign },
      { label: "Sales Records", link: "/sales/records", icon: ListCheck },
      { label: "HR Management", link: "/hr/management", icon: Users },
      { label: "Super Admin", link: "/super-admin", icon: Crown },
      {
        label: "Activity Log",
        link: "/super-admin/activity-log",
        icon: ClipboardList,
      },
    ];
  } else {
    navLinks.push({ label: "Dashboard", link: "/", icon: LayoutList });

    if (!isSales) {
      navLinks.push({ label: "Tasks", link: "/tasks", icon: ListCheck });
    } else {
      navLinks.push(
        { label: "Tasks", link: "/tasks", icon: ListCheck },
        { label: "Sales Planner", link: "/sales/schedule", icon: CalendarDays },
        { label: "Daily Execution", link: "/sales/daily", icon: CheckSquare },
        { label: "Log Sales", link: "/sales/log-sales", icon: DollarSign },
        { label: "Sales Records", link: "/sales/records", icon: ListCheck },
      );
    }

    if (user?.isHead || user?.is_head) {
      const userSubDept = user?.subDepartment || user?.sub_department;
      const isMasterHead = !userSubDept;

      if (isMasterHead) {
        navLinks.push(
          { label: "Task Approval", link: "/approvals", icon: ShieldCheck },
          {
            label: "Sales Approval",
            link: "/approvals/sales",
            icon: ShieldCheck,
          },
        );
      } else if (isSales) {
        navLinks.push({
          label: "Sales Approval",
          link: "/approvals/sales",
          icon: ShieldCheck,
        });
      } else {
        navLinks.push({
          label: "Task Approval",
          link: "/approvals",
          icon: ShieldCheck,
        });
      }
    }

    if (user?.isHr) {
      navLinks.push({
        label: "HR Management",
        link: "/hr/management",
        icon: Users,
      });
      if (!isSales) {
        navLinks.push({
          label: "Sales Records",
          link: "/sales/records",
          icon: ListCheck,
        });
      }
    }
  }

  // React Select setup for Profile Dropdown
  const profileOptions = [
    { value: "profile", label: "Profile" },
    { value: "settings", label: "Settings" },
  ];

  const handleProfileSelect = (selected) => {
    if (selected) {
      navigate(`/${selected.value}`);
      setIsMobileOpen(false);
    }
  };

  const CustomPlaceholder = (props) => (
    <components.Placeholder {...props}>
      <div className="flex items-center gap-2.5 overflow-hidden w-full group cursor-pointer hover:opacity-80 transition-opacity">
        {user?.picture ? (
          <img
            src={user.picture}
            alt={user?.name || "Profile"}
            className="w-[24px] h-[24px] rounded-md object-cover shrink-0 shadow-sm"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="w-[24px] h-[24px] rounded-md flex items-center justify-center bg-primary text-white font-bold text-[11px] shrink-0 shadow-sm">
            {user?.name?.charAt(0)?.toUpperCase() || "U"}
          </div>
        )}
        <span className="font-semibold text-[14px] truncate text-sidebar-foreground tracking-wide mt-[0.5px]">
          {user?.name || "User"}
        </span>
      </div>
    </components.Placeholder>
  );

  const CustomDropdownIndicator = (props) => (
    <components.DropdownIndicator {...props}>
      <ChevronDown size={14} className="text-sidebar-foreground/60" />
    </components.DropdownIndicator>
  );

  const selectStyles = {
    control: (base) => ({
      ...base,
      backgroundColor: "transparent",
      border: "none",
      boxShadow: "none",
      cursor: "pointer",
      minHeight: "auto",
      padding: "4px",
      borderRadius: "6px",
      "&:hover": {
        backgroundColor: "var(--color-red-a1, rgba(255,0,0,0.05))",
      },
    }),
    valueContainer: (base) => ({
      ...base,
      padding: "0px 8px",
    }),
    indicatorSeparator: () => ({ display: "none" }),
    menu: (base) => ({
      ...base,
      backgroundColor: "var(--sidebar)",
      border: "1px solid var(--sidebar-border)",
      boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
      borderRadius: "6px",
      overflow: "hidden",
      zIndex: 100,
      marginTop: "4px",
      animation: "popover-in 0.15s ease-out forwards",
      transformOrigin: "top",
    }),
    option: (base, state) => ({
      ...base,
      backgroundColor: state.isFocused
        ? "var(--sidebar-accent)"
        : "transparent",
      color: "var(--sidebar-foreground)",
      cursor: "pointer",
      padding: "8px 12px",
      fontSize: "13px",
      fontWeight: 500,
    }),
    dropdownIndicator: (base) => ({
      ...base,
      padding: "0px 8px 0px 0px",
    }),
  };

  return (
    <>
      {/* Mobile Drawer Trigger (PanelRight) */}
      <div className="md:hidden fixed top-3 left-3 z-40">
        <button
          onClick={() => setIsMobileOpen(true)}
          className="text-sidebar-foreground/80 hover:text-sidebar-foreground bg-sidebar border-r border-sidebar-border/80 backdrop-blur-md border border-sidebar-border p-1.5 rounded-lg shadow-sm transition-colors"
        >
          <PanelRight size={18} strokeWidth={2} />
        </button>
      </div>

      {/* Mobile Backdrop Overlay */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 md:hidden transition-opacity"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Merged Single-Pane Sidebar Container */}
      <aside
        className={`
          ${isMobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
          fixed md:sticky top-0 left-0 h-screen z-50 flex flex-col 
          bg-sidebar   text-sm font-sans
          transition-transform duration-300 ease-in-out
          w-[240px] shrink-0 overflow-y-auto scrollbar-hide
        `}
      >
        {/* Mobile Close Action (PanelLeft) */}
        <div className="md:hidden absolute top-4 right-4 z-50">
          <button
            onClick={() => setIsMobileOpen(false)}
            className="text-sidebar-foreground/60 hover:text-sidebar-foreground p-1 bg-sidebar border-r border-sidebar-border rounded-md shadow-sm border border-sidebar-border"
          >
            <PanelLeft size={18} strokeWidth={2} />
          </button>
        </div>

        {/* 1. Header (Profile Dropdown + Quick Actions) */}
        <div className="px-3 pt-6 pb-2 flex flex-col gap-2.5">
          {/* Row 1: Profile Selector */}
          <div className="flex-1 min-w-0">
            <Select
              options={profileOptions}
              value={null}
              onChange={handleProfileSelect}
              components={{
                Placeholder: CustomPlaceholder,
                DropdownIndicator: CustomDropdownIndicator,
              }}
              styles={selectStyles}
              isSearchable={false}
            />
          </div>

          {/* Row 2: Action Buttons */}
          <div className="flex items-center gap-1.5">
            {/* Broadcast — super admins only */}
            {user?.isSuperAdmin && (
              <button
                onClick={() => {
                  setIsMobileOpen(false);
                  setIsBroadcastOpen(true);
                }}
                className="flex-1 flex items-center justify-center p-2 rounded-lg border border-sidebar-border bg-sidebar-accent text-sidebar-foreground/80 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 hover:border-sidebar-accent transition-all"
                title="Broadcast"
              >
                <Megaphone size={15} strokeWidth={2.2} />
              </button>
            )}

            {/* Notifications */}
            <button
              onClick={() => {
                setIsNotifOpen(true);
                setIsMobileOpen(false);
              }}
              className={`relative flex-1 flex items-center justify-center p-2 rounded-lg border transition-all ${isNotifOpen ? "bg-sidebar-accent text-sidebar-primary border-sidebar-primary/30 shadow-sm" : "border-sidebar-border bg-sidebar-accent text-sidebar-foreground/80 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 hover:border-sidebar-accent"}`}
              title="Notifications"
            >
              <Bell size={15} strokeWidth={2.2} />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-sidebar-primary px-1 text-[9px] font-bold text-white shadow-sm ring-2 ring-sidebar">
                  {unreadCount}
                </span>
              )}
            </button>

            {/* Chats */}
            <button
              onClick={() => {
                setIsChatsOpen(true);
                setIsMobileOpen(false);
              }}
              className={`relative flex-1 flex items-center justify-center p-2 rounded-lg border transition-all ${isChatsOpen ? "bg-sidebar-accent text-sidebar-primary border-sidebar-primary/30 shadow-sm" : "border-sidebar-border bg-sidebar-accent text-sidebar-foreground/80 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 hover:border-sidebar-accent"}`}
              title="Chats"
            >
              <MessageCircle size={15} strokeWidth={2.2} />
              {unreadChatsCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-sidebar-primary px-1 text-[9px] font-bold text-white shadow-sm ring-2 ring-sidebar">
                  {unreadChatsCount}
                </span>
              )}
            </button>

            {/* Log Task Button */}
            <button
              onClick={() => {
                setIsMobileOpen(false);
                setIsLogTaskOpen(true);
              }}
              className="flex-1 flex items-center justify-center p-2 rounded-lg border border-sidebar-border bg-sidebar-accent text-sidebar-primary/80 hover:text-sidebar-primary hover:bg-sidebar-accent/50 hover:border-sidebar-accent transition-all"
              title="Log new task"
            >
              <SquarePen size={15} strokeWidth={2.2} />
            </button>
          </div>
        </div>




        {/* 4. Combined Workspace Menus */}
        <div className="px-3 flex-1 flex flex-col text-sidebar-foreground/80 pb-4">
          <div className="px-3 mt-2 mb-3 flex items-center justify-between text-sidebar-foreground/60 group/header cursor-pointer">
            <span className="text-[12px] font-medium tracking-wide">
              Workspace
            </span>
            <ChevronDown
              size={14}
              className="opacity-0 group-hover/header:opacity-100 transition-opacity"
            />
          </div>

          <nav className="flex flex-col gap-1 mb-6">
            {navLinks.map((navLink) => {
              const Icon = navLink.icon;
              return (
                <NavLink
                  key={navLink.label}
                  to={navLink.link}
                  end={
                    navLink.link === "/" ||
                    navLink.link === "/approvals" ||
                    navLink.link === "/super-admin"
                  }
                  onClick={() => setIsMobileOpen(false)}
                  className={({ isActive }) =>
                    `flex gap-3.5 items-center px-3 py-2.5 rounded-md transition-colors ${isActive
                      ? "bg-sidebar-accent text-sidebar-primary shadow-sm"
                      : "hover:text-sidebar-foreground hover:bg-sidebar-accent/50 text-sidebar-foreground/80"
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <Icon 
                        size={15} 
                        strokeWidth={2.2} 
                        className={`transition-colors ${isActive ? "text-sidebar-primary" : "text-sidebar-foreground/60"}`} 
                      />
                      <span className={`truncate text-[13.5px] mt-[1px] transition-all ${isActive ? "font-bold text-sidebar-primary" : "font-medium"}`}>
                        {navLink.label}
                      </span>
                    </>
                  )}
                </NavLink>
              );
            })}
          </nav>
        </div>
      </aside>

      {/* Drawers */}
      <NotificationDrawer
        isOpen={isNotifOpen}
        onClose={() => setIsNotifOpen(false)}
      />
      <ComprehensiveChatModal
        isOpen={isChatsOpen}
        onClose={() => setIsChatsOpen(false)}
      />
      <GlobalDetailManager />
      <BroadcastDrawer
        isOpen={isBroadcastOpen}
        onClose={() => setIsBroadcastOpen(false)}
      />
      <LogTaskModal
        isOpen={isLogTaskOpen}
        onClose={() => setIsLogTaskOpen(false)}
      />
    </>
  );
}
