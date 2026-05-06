/**
 * HighlightText Component
 * Wraps search term matches in a styled span.
 * Based on src/pages/super-admin/activity-log/index.jsx
 */
import { motion } from "framer-motion";

export default function HighlightText({ text, search }) {
  if (!search || !search.trim()) return <>{text}</>;
  if (typeof text !== "string") return <>{text}</>;

  const trimmed = search.trim();
  const regex = new RegExp(`(${trimmed.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi");
  const parts = text.split(regex);

  return (
    <>
      {parts.map((part, i) =>
        regex.test(part) ? (
          <motion.span
            key={`${i}-${part}`}
            initial={{ backgroundColor: "transparent", opacity: 0.5 }}
            animate={{ backgroundColor: "var(--amber-3)", opacity: 1 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="text-amber-11 rounded-[2px] px-0.5 font-semibold"
          >
            {part}
          </motion.span>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </>
  );
}
