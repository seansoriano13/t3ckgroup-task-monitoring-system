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
import ActiveChatsDrawer from "./ActiveChatsDrawer";
import BroadcastDrawer from "./BroadcastDrawer";
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

        {/* 1. Header (React Select Profile Dropdown + Log Task Button) */}
        <div className="px-3 pt-6 pb-2 flex items-center gap-1.5">
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
          {/* Broadcast — super admins only */}
          {user?.isSuperAdmin && (
            <button
              onClick={() => {
                setIsMobileOpen(false);
                setIsBroadcastOpen(true);
              }}
              className="shrink-0 p-2 rounded-lg border border-sidebar-border bg-sidebar-accent text-sidebar-foreground/80 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 hover:border-sidebar-accent transition-all"
              title="Broadcast"
            >
              <Megaphone size={15} strokeWidth={2.2} />
            </button>
          )}
          <button
            onClick={() => {
              setIsMobileOpen(false);
              setIsLogTaskOpen(true);
            }}
            className="shrink-0 p-2 rounded-lg border border-sidebar-border bg-sidebar-accent text-sidebar-foreground/80 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 hover:border-sidebar-accent text-sidebar-primary transition-all"
            title="Log new task"
          >
            <SquarePen size={15} strokeWidth={2.2} />
          </button>
        </div>



        {/* 3. Notification & Chats */}
        <div className="px-3 flex flex-col gap-1 mb-8">
          <button
            onClick={() => {
              setIsNotifOpen(true);
              setIsMobileOpen(false);
            }}
            className={`flex items-center justify-between px-3 py-2.5 rounded-md transition-colors group ${isNotifOpen ? "bg-sidebar-accent text-sidebar-primary shadow-sm" : "hover:bg-sidebar-accent/50 text-sidebar-foreground/80 hover:text-sidebar-foreground"}`}
          >
            <div className="flex items-center gap-3.5">
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={`transition-colors ${isNotifOpen ? "text-sidebar-primary" : "text-sidebar-foreground/60 group-hover:text-sidebar-foreground/80"}`}
              >
                <path d="M4 11V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v5" />
                <path d="M4 11h3a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2h3" />
                <path d="M4 11v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
              </svg>
              <span
                className={`text-[13.5px] transition-all ${isNotifOpen ? "font-bold text-sidebar-primary" : "font-medium"}`}
              >
                Notification
              </span>
            </div>
            {unreadCount > 0 && (
              <span className={`text-[11px] font-medium px-1.5 py-0.5 rounded-full transition-colors ${isNotifOpen ? "bg-sidebar-primary text-white" : "text-sidebar-foreground/80 group-hover:text-sidebar-foreground bg-sidebar-accent/50 group-hover:bg-sidebar-accent/80"}`}>
                {unreadCount}
              </span>
            )}
          </button>

          <button
            onClick={() => {
              setIsChatsOpen(true);
              setIsMobileOpen(false);
            }}
            className={`flex items-center justify-between px-3 py-2.5 rounded-md transition-colors group ${isChatsOpen ? "bg-sidebar-accent text-sidebar-primary shadow-sm" : "hover:bg-sidebar-accent/50 text-sidebar-foreground/80 hover:text-sidebar-foreground"}`}
          >
            <div className="flex items-center gap-3.5">
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={`transition-colors ${isChatsOpen ? "text-sidebar-primary" : "text-sidebar-foreground/60 group-hover:text-sidebar-foreground/80"}`}
              >
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                <path d="M9 12h6" />
                <path d="M12 9v6" />
              </svg>
              <span className={`text-[13.5px] transition-all ${isChatsOpen ? "font-bold text-sidebar-primary" : "font-medium"}`}>Chats</span>
            </div>
            {unreadChatsCount > 0 && (
              <span className={`text-[11px] font-medium px-1.5 py-0.5 rounded-full transition-colors ${isChatsOpen ? "bg-sidebar-primary text-white" : "text-sidebar-foreground bg-sidebar-accent/80"}`}>
                {unreadChatsCount}
              </span>
            )}
          </button>
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
      <ActiveChatsDrawer
        isOpen={isChatsOpen}
        onClose={() => setIsChatsOpen(false)}
      />
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
