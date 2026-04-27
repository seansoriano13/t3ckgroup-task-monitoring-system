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
  UsersRound,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { notificationService } from "../services/notificationService";
import { activeChatService } from "../services/tasks/activeChatService";
import NotificationDrawer from "./NotificationDrawer";
import ComprehensiveChatModal from "./ComprehensiveChatModal";
import BroadcastDrawer from "./BroadcastDrawer";
import GlobalDetailManager from "./GlobalDetailManager";
import { useLocation, Link, useNavigate, NavLink } from "react-router";
import Avatar from "./Avatar";
import { useState } from "react";
import LogTaskModal from "./LogTaskModal";
import CreateCommitteeTaskModal from "../pages/committee/components/CreateCommitteeTaskModal";
import Dropdown from "./ui/Dropdown";
import { committeeTaskService } from "../services/committeeTaskService";
import { employeeService } from "../services/employeeService";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";

export default function SideNav() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Mobile Toggle State
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isLogTaskOpen, setIsLogTaskOpen] = useState(false);
  const [isCreateCommitteeOpen, setIsCreateCommitteeOpen] = useState(false);
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

  const queryClient = useQueryClient();

  const isSuperAdmin =
    user?.is_super_admin === true || user?.isSuperAdmin === true;
  const isHead = user?.is_head === true || user?.isHead === true;
  const canManage = isHead || isSuperAdmin;

  const { data: employees = [] } = useQuery({
    queryKey: ["employees"],
    queryFn: () => employeeService.getAllEmployees(),
    enabled: !!user?.id && canManage,
  });

  const createCommitteeMutation = useMutation({
    mutationFn: (payload) => committeeTaskService.createCommitteeTask(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["committeeTasks"] });
      toast.success("Committee Task created!");
      setIsCreateCommitteeOpen(false);
    },
    onError: (err) => toast.error(err.message),
  });

  const hasSales = user?.has_sales_flow;
  const hasTask = user?.has_task_flow;

  // Nav mapping logic mapped similarly to original implementation
  let navLinks = [];

  if (user?.isSuperAdmin) {
    navLinks = [
      { label: "Dashboard", link: "/", icon: LayoutList },
      { label: "Tasks", link: "/tasks", icon: ListCheck },
      { label: "Task Approval", link: "/approvals/tasks", icon: ShieldCheck },
      { label: "Task Verification", link: "/approvals/hr-verification", icon: ShieldCheck },
      { label: "Committee Tasks", link: "/committee", icon: UsersRound },
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

    if (hasTask) {
      navLinks.push(
        { label: "Tasks", link: "/tasks", icon: ListCheck },
        { label: "Committee Tasks", link: "/committee", icon: UsersRound },
      );
    }

    if (hasSales) {
      navLinks.push(
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
          { label: "Task Approval", link: "/approvals/tasks", icon: ShieldCheck },
          {
            label: "Sales Approval",
            link: "/approvals/sales",
            icon: ShieldCheck,
          },
        );
      } else {
        if (hasTask) {
          navLinks.push({
            label: "Task Approval",
            link: "/approvals/tasks",
            icon: ShieldCheck,
          });
        }
        if (hasSales) {
          navLinks.push({
            label: "Sales Approval",
            link: "/approvals/sales",
            icon: ShieldCheck,
          });
        }
      }
    }

    if (user?.isHr) {
      navLinks.push(
        {
          label: "Task Verification",
          link: "/approvals/hr-verification",
          icon: ShieldCheck,
        },
        {
          label: "HR Management",
          link: "/hr/management",
          icon: Users,
        },
      );
      if (!hasSales) {
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
            <Dropdown
              className="flex-1 min-w-0"
              trigger={({ isOpen }) => (
                <div
                  className={`flex items-center justify-between gap-2.5 px-3 py-2 rounded-lg transition-all ${
                    isOpen ? "bg-sidebar-accent" : "hover:bg-sidebar-accent/50"
                  }`}
                >
                  <div className="flex items-center gap-2.5 overflow-hidden w-full group cursor-pointer transition-opacity">
                    <Avatar
                      src={user?.picture}
                      name={user?.name || "U"}
                      size="md"
                      className="rounded-md shadow-sm"
                    />
                    <span className="font-semibold text-[14px] truncate text-sidebar-foreground tracking-wide mt-[0.5px]">
                      {user?.name || "User"}
                    </span>
                  </div>
                  <ChevronDown
                    size={14}
                    className={`text-sidebar-foreground/60 transition-transform duration-200 ${
                      isOpen ? "rotate-180" : ""
                    }`}
                  />
                </div>
              )}
            >
              {({ close }) => (
                <div className="p-1.5 min-w-[215px] flex flex-col gap-0.5 bg-sidebar border border-sidebar-border rounded-xl shadow-2xl">
                  {profileOptions.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => {
                        handleProfileSelect(option);
                        close();
                      }}
                      className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sidebar-foreground text-sm font-semibold text-foreground hover:bg-sidebar-accent transition-colors text-left"
                    >
                      <span>{option.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </Dropdown>
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
                <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-sidebar-primary px-1 text-[9px] font-bold text-primary-foreground shadow-sm ring-2 ring-sidebar">
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
                <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-sidebar-primary px-1 text-[9px] font-bold text-primary-foreground shadow-sm ring-2 ring-sidebar">
                  {unreadChatsCount}
                </span>
              )}
            </button>

            {/* Merged Action Button */}
            {canManage ? (
              <Dropdown
                placement="bottom-end"
                className="flex-1"
                usePortal={true}
                trigger={({ isOpen }) => (
                  <button
                    className={`relative flex-1 flex items-center justify-center py-2 px-3 rounded-lg border transition-all ${
                      isOpen
                        ? "bg-sidebar-accent text-sidebar-primary border-sidebar-primary/10 shadow-sm"
                        : "border-sidebar-border bg-sidebar-accent text-sidebar-foreground/80 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 hover:border-sidebar-accent"
                    }`}
                    title="Create new..."
                  >
                    <Plus size={15} strokeWidth={2.5} />
                  </button>
                )}
              >
                {({ close }) => (
                  <div className="p-1.5 min-w-[180px] flex flex-col gap-0.5 bg-sidebar border border-sidebar-border rounded-xl shadow-2xl">
                    <button
                      onClick={() => {
                        close();
                        setIsMobileOpen(false);
                        setIsLogTaskOpen(true);
                      }}
                      className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-semibold text-sidebar-foreground hover:bg-sidebar-accent transition-colors text-left"
                    >
                      <SquarePen size={14} />
                      <span>Task</span>
                    </button>
                    <button
                      onClick={() => {
                        close();
                        setIsMobileOpen(false);
                        setIsCreateCommitteeOpen(true);
                      }}
                      className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-semibold text-sidebar-foreground hover:bg-sidebar-accent transition-colors text-left"
                    >
                      <UsersRound size={14} />
                      <span>Committee Task</span>
                    </button>
                  </div>
                )}
              </Dropdown>
            ) : (
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
            )}
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
                    navLink.link === "/approvals/tasks" ||
                    navLink.link === "/approvals/hr-verification" ||
                    navLink.link === "/super-admin"
                  }
                  onClick={() => setIsMobileOpen(false)}
                  className={({ isActive }) =>
                    `flex gap-3.5 items-center px-3 py-2.5 rounded-md transition-colors ${
                      isActive
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
                      <span
                        className={`truncate text-[13.5px] mt-[1px] transition-all ${isActive ? "font-bold text-sidebar-primary" : "font-medium"}`}
                      >
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
      {canManage && (
        <CreateCommitteeTaskModal
          isOpen={isCreateCommitteeOpen}
          onClose={() => setIsCreateCommitteeOpen(false)}
          user={user}
          employees={employees}
          onSubmit={(payload) => createCommitteeMutation.mutateAsync(payload)}
          isSubmitting={createCommitteeMutation.isPending}
        />
      )}
    </>
  );
}
