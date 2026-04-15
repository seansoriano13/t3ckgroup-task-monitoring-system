import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { systemUpdateService } from "../services/systemUpdateService";
import {
  Megaphone,
  Rocket,
  Wrench,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import ReactMarkdown from "react-markdown";

export default function SystemUpdateBanner() {
  const [isMinimized, setIsMinimized] = useState(false);

  const { data: latestUpdate = null, isLoading } = useQuery({
    queryKey: ["latestActiveSystemUpdate"],
    queryFn: () => systemUpdateService.getLatestActiveUpdate(),
  });

  useEffect(() => {
    if (latestUpdate) {
      const savedState = localStorage.getItem(
        `banner_collapsed_${latestUpdate.id}`,
      );
      if (savedState === "true") {
        setIsMinimized(true);
      } else {
        setIsMinimized(false);
      }
    }
  }, [latestUpdate]);

  if (isLoading || !latestUpdate) return null;

  const handleToggle = () => {
    const newVal = !isMinimized;
    setIsMinimized(newVal);
    localStorage.setItem(`banner_collapsed_${latestUpdate.id}`, String(newVal));
  };

  const getIcon = (type) => {
    switch (type) {
      case "announcement":
        return <Megaphone className="w-5 h-5 text-blue-500" />;
      case "feature":
        return <Rocket className="w-5 h-5 text-purple-500" />;
      case "fix":
        return <Wrench className="w-5 h-5 text-green-500" />;
      default:
        return <Megaphone className="w-5 h-5 text-blue-500" />;
    }
  };

  const getStyles = (type) => {
    switch (type) {
      case "announcement":
        return "bg-blue-50 border-blue-200 text-blue-900";
      case "feature":
        return "bg-purple-50 border-purple-200 text-purple-900";
      case "fix":
        return "bg-green-50 border-green-200 text-green-900";
      default:
        return "bg-blue-50 border-blue-200 text-blue-900";
    }
  };

  return (
    <div
      className={`mb-6 p-4 rounded-xl border flex items-start gap-4 transition-all duration-300 ${getStyles(latestUpdate.type)} animate-in fade-in slide-in-from-top-4`}
    >
      <div className="p-2 bg-white rounded-full shrink-0 shadow-sm border border-gray-100">
        {getIcon(latestUpdate.type)}
      </div>
      <div className="flex-1 min-w-0">
        <div
          className="flex items-center justify-between mb-2 cursor-pointer select-none group"
          onClick={handleToggle}
        >
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-sm uppercase tracking-wider">
              {latestUpdate.type === "feature"
                ? "New Features"
                : latestUpdate.type === "fix"
                  ? "System Fixes"
                  : "Announcement"}
            </h3>
            <span className="text-xs font-medium bg-white px-2 py-0.5 rounded-full border border-gray-200/50 shadow-sm text-gray-500 mr-2">
              {new Date(latestUpdate.created_at).toLocaleDateString()}
            </span>
          </div>
          <button className="text-gray-400 group-hover:text-gray-800 transition-colors p-1 rounded-full hover:bg-white/50">
            {isMinimized ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
          </button>
        </div>

        <div
          className={`text-sm overflow-hidden transition-all duration-300 ease-in-out ${isMinimized ? "max-h-0 opacity-0" : "max-h-[500px] opacity-100"}`}
        >
          <ReactMarkdown
            components={{
              p: ({ ...props }) => (
                <p className="mb-2 last:mb-0 opacity-90" {...props} />
              ),
              ul: ({ ...props }) => (
                <ul
                  className="list-disc pl-5 mb-2 opacity-90 marker:text-gray-400"
                  {...props}
                />
              ),
              li: ({ ...props }) => <li className="mb-1" {...props} />,
              strong: ({ ...props }) => (
                <strong className="font-bold opacity-100" {...props} />
              ),
            }}
          >
            {latestUpdate.content}
          </ReactMarkdown>
        </div>
      </div>
    </div>
  );
}
