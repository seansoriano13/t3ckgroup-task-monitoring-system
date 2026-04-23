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
  const { data: updates = [], isLoading } = useQuery({
    queryKey: ["activeSystemUpdates"],
    queryFn: () => systemUpdateService.getActiveUpdates(),
  });

  if (isLoading || updates.length === 0) return null;

  return (
    <div className="space-y-4 mb-6">
      {updates.map((update) => (
        <BannerItem key={update.id} update={update} />
      ))}
    </div>
  );
}

function BannerItem({ update }) {
  const [isMinimized, setIsMinimized] = useState(false);

  useEffect(() => {
    const savedState = localStorage.getItem(`banner_collapsed_${update.id}`);
    if (savedState === "true") {
      setIsMinimized(true);
    }
  }, [update.id]);

  const handleToggle = () => {
    const newVal = !isMinimized;
    setIsMinimized(newVal);
    localStorage.setItem(`banner_collapsed_${update.id}`, String(newVal));
  };

  const getIcon = (type) => {
    switch (type) {
      case "announcement":
        return <Megaphone className="w-5 h-5 text-[#111827]" />;
      case "feature":
        return <Rocket className="w-5 h-5 text-[#111827]" />;
      case "fix":
        return <Wrench className="w-5 h-5 text-[#111827]" />;
      default:
        return <Megaphone className="w-5 h-5 text-[#111827]" />;
    }
  };

  return (
    <div
      className={`p-4 rounded-xl border flex items-start gap-4 transition-all duration-300 bg-white border-[#E5E7EB] text-[#111827] animate-in fade-in slide-in-from-top-4`}
    >
      <div className="p-2 bg-[#F9FAFB] rounded-full shrink-0 border border-[#E5E7EB]">
        {getIcon(update.type)}
      </div>
      <div className="flex-1 min-w-0">
        <div
          className="flex items-center justify-between mb-2 cursor-pointer select-none group"
          onClick={handleToggle}
        >
          <div className="flex items-center gap-2">
            <h3
              className="font-medium uppercase tracking-wider text-[#6B7280]"
              style={{ fontSize: "12px" }}
            >
              {update.type === "feature"
                ? "New Features"
                : update.type === "fix"
                  ? "System Fixes"
                  : "Announcement"}
            </h3>
            <span
              className="font-medium text-[#6B7280]"
              style={{ fontSize: "12px" }}
            >
              {new Date(update.created_at).toLocaleDateString()}
            </span>
          </div>
          <button className="text-[#6B7280] group-hover:text-[#111827] transition-colors p-1 rounded-full hover:bg-[#F9FAFB]">
            {isMinimized ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
          </button>
        </div>

        <div
          className={`overflow-hidden transition-all duration-300 ease-in-out text-[#111827] ${isMinimized ? "max-h-0 opacity-0" : "max-h-[500px] opacity-100"}`}
        >
          <ReactMarkdown
            components={{
              p: ({ ...props }) => (
                <p className="mb-2 last:mb-0 text-sm" {...props} />
              ),
              ul: ({ ...props }) => (
                <ul
                  className="list-disc pl-5 mb-2 marker:text-[#6B7280]"
                  {...props}
                />
              ),
              li: ({ ...props }) => (
                <li className="mb-1" style={{ fontSize: "13px" }} {...props} />
              ),
              strong: ({ ...props }) => (
                <strong className="font-semibold text-[#111827]" {...props} />
              ),
            }}
          >
            {update.content}
          </ReactMarkdown>
        </div>
      </div>
    </div>
  );
}
