/**
 * Reusable prev / next pagination bar.
 */
export default function Pagination({ currentPage, totalItems, itemsPerPage, onPageChange }) {
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  if (totalItems <= itemsPerPage) return null;

  return (
    <div className="p-4 border-t border-gray-4 bg-gray-2 flex items-center justify-center gap-4">
      <button
        disabled={currentPage === 1}
        onClick={() => onPageChange(currentPage - 1)}
        className="px-4 py-1.5 bg-gray-1 border border-gray-4 rounded-lg text-xs font-bold text-gray-11 disabled:opacity-30 hover:bg-gray-3 transition-colors uppercase tracking-widest"
      >
        Prev
      </button>
      <span className="text-xs font-black text-gray-12 uppercase tracking-tighter">
        Page {currentPage} of {totalPages}
      </span>
      <button
        disabled={currentPage === totalPages}
        onClick={() => onPageChange(currentPage + 1)}
        className="px-4 py-1.5 bg-gray-1 border border-gray-4 rounded-lg text-xs font-bold text-gray-11 disabled:opacity-30 hover:bg-gray-3 transition-colors uppercase tracking-widest"
      >
        Next
      </button>
    </div>
  );
}
