import { Plus, Bell } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { notificationService } from "../services/notificationService";
import NotificationDrawer from "./NotificationDrawer";
import PrimaryButton from "./PrimaryButton";
import { Notebook } from "lucide-react";
import { LayoutList } from "lucide-react";
import { UserRound } from "lucide-react";
import { Link, NavLink, useNavigate } from "react-router";
import { ListCheck } from "lucide-react";
import { Bolt } from "lucide-react";
import { ShieldCheck } from "lucide-react";
import { Database } from "lucide-react";
import { Users } from "lucide-react";
import { Crown } from "lucide-react";
import { CalendarDays } from "lucide-react";
import { CheckSquare } from "lucide-react";
import { DollarSign } from "lucide-react";
import { useState } from "react";
import { X } from "lucide-react";
import { Eye } from "lucide-react";

export default function SideNav({ onOpenAddTask }) {
  const { user } = useAuth();
  const navigate = useNavigate();

  // 🔥 The Hover State
  const [isExpanded, setIsExpanded] = useState(false);
  const toggleSidebar = () => setIsExpanded((prev) => !prev);

  // 🔥 Notification State
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const { data: notifications = [] } = useQuery({
    queryKey: ["notifications", user?.id],
    queryFn: () => notificationService.getMyNotifications(user?.id),
    enabled: !!user?.id,
  });
  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const isSales =
    user?.department?.toLowerCase().includes("sales") ||
    user?.subDepartment?.toLowerCase().includes("sales");

  // 1. Regular Employees Links
  let navLinks = [];

  if (user?.isSuperAdmin) {
    // STRICT SUPER ADMIN LAYOUT
    navLinks = [
      { label: "Dashboard", link: "/", icon: LayoutList },
      { label: "Tasks", link: "/tasks", icon: ListCheck },
      { label: "For Approval", link: "/approvals", icon: ShieldCheck },
      { label: "Sales Verification", link: "/approvals/sales", icon: ShieldCheck },
      { label: "Master Log", link: "/hr-master-log", icon: Database },
      { label: "Sales Records", link: "/sales/records", icon: ListCheck },
      { label: "Employee Mgmt", link: "/hr/employee-management", icon: Users },
      { label: "Super Admin", link: "/super-admin", icon: Crown },
      { label: "Profile", link: "/profile", icon: UserRound },
      { label: "Settings", link: "/settings", icon: Bolt },
    ];
  } else {
    // STANDARD & SALES LAYOUT
    navLinks.push({ label: "Dashboard", link: "/", icon: LayoutList });

    if (!isSales) {
      navLinks.push({ label: "Tasks", link: "/tasks", icon: ListCheck });
    } else {
      navLinks.push(
        { label: "Sales Planner", link: "/sales/schedule", icon: CalendarDays },
        { label: "Daily Execution", link: "/sales/daily", icon: CheckSquare },
        { label: "Log Revenue", link: "/sales/log-revenue", icon: DollarSign },
        { label: "Sales Records", link: "/sales/records", icon: ListCheck },
      );
    }

    if (user?.isHead || user?.is_head) {
      if (isSales) {
        navLinks.push({
          label: "Sales Verification",
          link: "/approvals/sales",
          icon: ShieldCheck,
        });
      } else {
        navLinks.push({
          label: "For Approval",
          link: "/approvals",
          icon: ShieldCheck,
        });
      }
    }

    if (user?.isHr) {
      navLinks.push(
        { label: "Master Log", link: "/hr-master-log", icon: Database },
        {
          label: "Employee Mgmt",
          link: "/hr/employee-management",
          icon: Users,
        },
      );
      if (!isSales) {
        navLinks.push({
          label: "Sales Records",
          link: "/sales/records",
          icon: ListCheck,
        });
      }
    }

    // Universal bottom links
    navLinks.push(
      { label: "Profile", link: "/profile", icon: UserRound },
      { label: "Settings", link: "/settings", icon: Bolt },
    );
  }

  return (
    // The main wrapper listens for mouse enter and leave
    <div
      className="flex h-screen sticky top-0 z-50"
      onMouseEnter={() => setIsExpanded(true)}
      onMouseLeave={() => setIsExpanded(false)}
    >
      {/* Pane 1: The Icon Strip (Always visible) */}
      <aside className="relative z-50 text-gray-12 bg-gray-3 flex flex-col items-center w-14 md:w-[72px] px-2 md:px-4 py-8 gap-6 border-r border-gray-4">
        <button
          onClick={toggleSidebar}
          className="md:hidden p-2 text-gray-10 hover:text-gray-12 hover:bg-gray-4 rounded-xl transition-colors"
        >
          {isExpanded ? <X size={24} /> : <LayoutList size={24} />}
        </button>
        <img
          src={user?.picture || "/default-avatar.png"}
          className="w-10 h-10 rounded-full border border-gray-5 shadow-sm object-cover"
          alt="Profile"
          referrerPolicy="no-referrer"
        />

        {/* Global Notification Hub Trigger */}
        <button
          onClick={() => {
            setIsNotifOpen(true);
            setIsExpanded(false);
          }}
          className="relative text-gray-10 hover:text-primary transition-colors p-2 rounded-xl hover:bg-red-a3 flex items-center justify-center group"
          title="Notifications"
        >
          <Bell
            size={24}
            className="group-hover:scale-110 transition-transform"
          />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-2 w-2.5 h-2.5 bg-primary border-2 border-gray-3 rounded-full animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.8)]"></span>
          )}
        </button>

        {user?.isSuperAdmin ? (
          <div className="flex flex-col gap-2 w-full mt-2">
            <PrimaryButton
              onClick={() => {
                setIsExpanded(false);
                onOpenAddTask();
              }}
              className="bg-primary hover:bg-primary-hover shadow-lg shadow-red-a3 text-white p-2! rounded-xl transition-all flex items-center justify-center w-full"
              label={<Plus size={20} />}
              title="Add Task"
            />
            <PrimaryButton
              onClick={() => {
                setIsExpanded(false);
                navigate("/super-admin");
              }}
              className="bg-purple-600 hover:bg-purple-700 shadow-lg shadow-purple-900/30 text-white p-2! rounded-xl transition-all flex items-center justify-center w-full"
              label={<Crown size={20} />}
              title="Set Quotas"
            />
          </div>
        ) : user?.isHr || user?.isHead || user?.is_head || user?.is_hr ? (
          <div className="flex flex-col gap-2 w-full mt-2">
            <PrimaryButton
              onClick={() => {
                setIsExpanded(false);
                onOpenAddTask();
              }}
              className="bg-primary hover:bg-primary-hover shadow-lg shadow-red-a3 text-white p-2! rounded-xl transition-all flex items-center justify-center w-full"
              label={<Plus size={20} />}
              title="Add Task"
            />
            {(!isSales || user?.isHr || user?.is_hr) && (
              <PrimaryButton
                onClick={() => {
                  setIsExpanded(false);
                  navigate("/approvals");
                }}
                className="bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-900/30 text-white p-2! rounded-xl transition-all flex items-center justify-center w-full"
                label={<Eye size={20} />}
                title="For Approval"
              />
            )}
          </div>
        ) : (
          <div className="w-full mt-2">
            <PrimaryButton
              onClick={() => {
                setIsExpanded(false); // Close sidebar when opening modal
                if (isSales) {
                  navigate("/sales/schedule");
                } else {
                  onOpenAddTask();
                }
              }}
              className="bg-primary hover:bg-primary-hover shadow-lg shadow-red-a3 text-white p-2! rounded-xl transition-all w-full flex justify-center items-center"
              label={<Plus size={20} />}
              title={isSales ? "Sales Planner" : "Add Task"}
            />
          </div>
        )}
      </aside>

      {/* Pane 2: The Expanded Menu (Hidden by default, slides out over content) */}
      <div
        className={`
    absolute top-0 h-full bg-gray-1 border-r border-gray-4 shadow-2xl transition-all duration-300 ease-in-out overflow-hidden z-40 
    
    /* 🔥 THE FIX: Match these to your Aside's width */
    left-14 md:left-[72px] 

    ${isExpanded
            ? "w-[calc(100vw-56px)] md:w-64 opacity-100" // 56px is the width of w-14
            : "w-0 opacity-0 pointer-events-none"
          }
  `}
      >
        {/* We fix the inner width so the text doesn't wrap weirdly during the animation */}
        <nav className="w-64 px-6 py-8 flex flex-col gap-8 h-full">
          {/* Header with Close Action */}
          <div className="flex justify-between items-start">
            <div className="overflow-hidden">
              <p className="text-lg font-bold text-gray-12 truncate">
                {user?.name || "Loading..."}
              </p>
              <div className="text-gray-9 text-xs font-bold uppercase tracking-wider mt-1">
                <p className="truncate">{user?.department || "Employee"}</p>
              </div>
            </div>

            {/* Manual Close Button */}
            <button
              onClick={() => setIsExpanded(false)}
              className="text-gray-9 hover:text-red-9 transition-colors p-1 rounded-full hover:bg-gray-3"
            >
              <X size={18} />
            </button>
          </div>

          {/* The Mapped Navigation Links */}
          <ul className="flex flex-col gap-2">
            {navLinks.map((navLink) => {
              const Icon = navLink.icon;
              return (
                <NavLink
                  key={navLink.label}
                  to={navLink.link}
                  onClick={() => setIsExpanded(false)} // 👈 Closes sidebar upon navigation!
                  className={({ isActive }) =>
                    `flex gap-3 items-center px-3 py-3 rounded-lg font-semibold transition-all ${isActive
                      ? "text-red-9 bg-red-a3" // Active state styling
                      : "text-gray-10 hover:text-gray-12 hover:bg-gray-3"
                    }`
                  }
                >
                  <Icon size={20} />
                  <p className="whitespace-nowrap">{navLink.label}</p>
                </NavLink>
              );
            })}
          </ul>
        </nav>
      </div>

      {/* Global Notification Drawer */}
      <NotificationDrawer
        isOpen={isNotifOpen}
        onClose={() => setIsNotifOpen(false)}
      />
    </div>
  );
}
