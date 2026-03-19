function PrimaryButton({ onClick, label = "Button", className = "" }) {
  const BASE_STYLES =
    "bg-red-9 text-white rounded-lg  hover:bg-red-7 transition-all px-12 py-3";
  return (
    <button onClick={onClick} className={`${BASE_STYLES} ${className}`}>
      {label}
    </button>
  );
}

export default PrimaryButton;
