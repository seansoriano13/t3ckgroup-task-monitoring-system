import { Search } from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";
import PersonalizedHeroBanner from "./PersonalizedHeroBanner";
import { Input } from "@/components/ui/input";

function DashboardHeader() {
  return (
    <div className="grid gap-4 md:gap-6">
      {/* TOP BAR: SEARCH & THEME TOGGLE */}
      <div className="flex gap-3 items-center">
        <div className="relative flex-1">
          <Input
            className="w-full pl-4 pr-10 h-11"
            placeholder="Search tasks, projects, or employees..."
            type="text"
          />
          <Search
            size={18}
            className="absolute text-muted-foreground right-3 top-1/2 -translate-y-1/2"
          />
        </div>

        <ThemeToggle />
      </div>

      {/* HERO BANNER: Personalized */}
      <PersonalizedHeroBanner />
    </div>
  );
}

export default DashboardHeader;
