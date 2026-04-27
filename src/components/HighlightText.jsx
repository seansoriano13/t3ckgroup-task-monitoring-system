/**
 * HighlightText Component
 * Wraps search term matches in a styled span.
 * Based on src/pages/super-admin/activity-log/index.jsx
 */
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
          <span key={i} className="bg-amber-3 text-amber-11 rounded-[2px] px-0.5 font-semibold">
            {part}
          </span>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </>
  );
}
