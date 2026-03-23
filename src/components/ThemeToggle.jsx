import { Sun, Moon } from "lucide-react";
import { useTheme } from "../hooks/useTheme";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="relative cursor-pointer p-2.5 rounded-full bg-gray-2 hover:bg-gray-3 transition-colors shrink-0 flex items-center justify-center text-gray-10 hover:text-gray-12"
      aria-label="Toggle theme"
    >
      {theme === "light" ? <Moon size={20} /> : <Sun size={20} />}
    </button>
  );
}
