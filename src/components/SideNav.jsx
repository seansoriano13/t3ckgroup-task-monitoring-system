import { Plus } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import PrimaryButton from "./PrimaryButton";
import { Notebook } from "lucide-react";
import { LayoutList } from "lucide-react";
import { UserRound } from "lucide-react";
import { Link, NavLink } from "react-router";
import { ListCheck } from "lucide-react";
import { Bolt } from "lucide-react";
import { ShieldCheck } from "lucide-react";
import { Database } from "lucide-react";
import { useState } from "react";
import { X } from "lucide-react";

export default function SideNav({ onOpenAddTask }) {
  const { user } = useAuth();

  // 🔥 The Hover State
  const [isExpanded, setIsExpanded] = useState(false);

  // 1. Base links that EVERYONE sees
  const navLinks = [
    { label: "Dashboard", link: "/", icon: LayoutList },
    { label: "Tasks", link: "/tasks", icon: ListCheck },
  ];

  // 2. Conditionally inject Head/HR links based on their Supabase Role
  if (user?.isHead) {
    navLinks.push({
      label: "Approvals",
      link: "/approvals",
      icon: ShieldCheck,
    });
  }
  if (user?.isHr) {
    navLinks.push({
      label: "HR Master Log",
      link: "/hr-dashboard",
      icon: Database,
    });
  }

  // 3. Append the universal bottom links
  navLinks.push(
    { label: "Profile", link: "/profile", icon: UserRound },
    { label: "Settings", link: "/settings", icon: Bolt },
  );

  return (
    // The main wrapper listens for mouse enter and leave
    <div
      className="flex h-screen sticky top-0 z-50"
      onMouseEnter={() => setIsExpanded(true)}
      onMouseLeave={() => setIsExpanded(false)}
    >
      {/* Pane 1: The Icon Strip (Always visible) */}
      <aside className="relative z-50 text-gray-12 bg-gray-3 flex flex-col items-center px-4 py-8 gap-6 border-r border-gray-4 w-[72px]">
        <img
          src={user?.picture || "/default-avatar.png"}
          className="w-10 h-10 rounded-full border border-gray-5 shadow-sm object-cover"
          alt="Profile"
          referrerPolicy="no-referrer"
        />
        <div>
          <PrimaryButton
            onClick={() => {
              setIsExpanded(false); // Close sidebar when opening modal
              onOpenAddTask();
            }}
            className="bg-primary hover:bg-primary-hover shadow-lg shadow-red-a3 text-white p-2! rounded-xl transition-all"
            label={<Plus size={20} />}
          />
        </div>
      </aside>

      {/* Pane 2: The Expanded Menu (Hidden by default, slides out over content) */}
      <div
        className={`absolute left-[72px] top-0 h-full bg-gray-1 border-r border-gray-4 shadow-2xl transition-all duration-300 ease-in-out overflow-hidden z-40 ${
          isExpanded ? "w-64 opacity-100" : "w-0 opacity-0 pointer-events-none"
        }`}
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
                    `flex gap-3 items-center px-3 py-3 rounded-lg font-semibold transition-all ${
                      isActive
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
    </div>
  );
}
