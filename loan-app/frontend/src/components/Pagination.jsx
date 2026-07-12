import React from "react";

const Pagination = ({
  currentPage,
  totalPages,
  onPageChange,
  totalRecords,
  limit,
}) => {
  // Don't render anything if no records at all
  if (!totalRecords || totalRecords === 0) return null;

  const startRecord = (currentPage - 1) * limit + 1;
  const endRecord = Math.min(currentPage * limit, totalRecords);

  const getPageNumbers = () => {
    const pages = [];
    const maxVisiblePages = 5;

    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      let start = Math.max(1, currentPage - 2);
      let end = Math.min(totalPages, start + maxVisiblePages - 1);

      if (end === totalPages) {
        start = Math.max(1, end - maxVisiblePages + 1);
      }

      for (let i = start; i <= end; i++) pages.push(i);
    }
    return pages;
  };

  return (
    <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4 px-2">
      <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
        Showing <span className="text-slate-900">{startRecord}</span> to{" "}
        <span className="text-slate-900">{endRecord}</span> of{" "}
        <span className="text-slate-900">{totalRecords}</span> results
      </div>

      {totalPages > 1 && (
        <div className="flex items-center gap-2">
          <button
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-white border border-slate-200 text-slate-400 hover:text-primary hover:border-primary disabled:opacity-50 disabled:hover:text-slate-400 disabled:hover:border-slate-200 transition-all shadow-sm"
            title="Previous Page"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="3"
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>

          <div className="flex items-center gap-1.5">
            {getPageNumbers().map((number) => (
              <button
                key={number}
                onClick={() => onPageChange(number)}
                className={`w-10 h-10 rounded-xl text-xs font-black transition-all shadow-sm border ${
                  currentPage === number
                    ? "bg-primary border-primary text-white shadow-lg shadow-blue-200"
                    : "bg-white border-slate-200 text-slate-600 hover:border-primary hover:text-primary"
                }`}
              >
                {number}
              </button>
            ))}
          </div>

          <button
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-white border border-slate-200 text-slate-400 hover:text-primary hover:border-primary disabled:opacity-50 disabled:hover:text-slate-400 disabled:hover:border-slate-200 transition-all shadow-sm"
            title="Next Page"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="3"
                d="M9 5l7 7-7 7"
              />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
};

export default Pagination;
