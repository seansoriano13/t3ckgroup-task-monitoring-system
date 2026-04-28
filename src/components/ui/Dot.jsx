
/**
 * A reusable Dot component for status indicators, decorative bullets, or live markers.
 * Defaults to a standard mauve-9 decorative dot used in section headers.
 * 
 * @param {string} size - Tailwind classes for width and height (e.g., "w-2 h-2")
 * @param {string} color - Tailwind class for background color (e.g., "bg-green-9")
 * @param {string} className - Additional Tailwind classes for shadows, animations, etc.
 */
const Dot = ({ 
  size = "w-1.5 h-1.5", 
  color = "bg-mauve-9", 
  className = "", 
  ...props 
}) => {
  return (
    <span
      className={`${size} ${color} rounded-full shrink-0 ${className}`.trim()}
      {...props}
    />
  );
};

export default Dot;
