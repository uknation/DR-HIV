import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function Pagination({
  currentPage,
  totalRecords,
  itemsPerPage = 10,
  onPageChange,
  label = 'cases'
}) {
  const totalPages = Math.ceil(totalRecords / itemsPerPage) || 1;

  if (totalRecords === 0) return null;

  const startIndex = (currentPage - 1) * itemsPerPage + 1;
  const endIndex = Math.min(currentPage * itemsPerPage, totalRecords);

  const getPageNumbers = () => {
    const pages = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (currentPage <= 4) {
        pages.push(1, 2, 3, 4, 5, '...', totalPages);
      } else if (currentPage >= totalPages - 3) {
        pages.push(1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
      } else {
        pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages);
      }
    }
    return pages;
  };

  return (
    <div className="px-6 py-3.5 bg-slate-50/80 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
      {/* Record Counter */}
      <div className="text-slate-500 font-medium">
        Showing <span className="font-bold text-slate-800">{startIndex}–{endIndex}</span> of{' '}
        <span className="font-bold text-slate-800">{totalRecords}</span> {label}
      </div>

      {/* Pagination Controls */}
      <div className="flex items-center space-x-1.5">
        {/* Previous Button */}
        <button
          type="button"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className={`px-3 py-1.5 rounded-lg border font-bold text-xs transition flex items-center space-x-1 ${
            currentPage === 1
              ? 'bg-slate-100 text-slate-300 border-slate-200 cursor-not-allowed'
              : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200 shadow-2xs cursor-pointer'
          }`}
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          <span>Previous</span>
        </button>

        {/* Page Numbers */}
        <div className="flex items-center space-x-1">
          {getPageNumbers().map((num, idx) => (
            num === '...' ? (
              <span key={`dots-${idx}`} className="px-2 py-1 text-slate-400 font-bold">...</span>
            ) : (
              <button
                key={num}
                type="button"
                onClick={() => onPageChange(num)}
                className={`w-8 h-8 rounded-lg border font-bold text-xs transition flex items-center justify-center ${
                  currentPage === num
                    ? 'bg-teal-600 text-white border-teal-600 shadow-xs'
                    : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200 cursor-pointer'
                }`}
              >
                {num}
              </button>
            )
          ))}
        </div>

        {/* Next Button */}
        <button
          type="button"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className={`px-3 py-1.5 rounded-lg border font-bold text-xs transition flex items-center space-x-1 ${
            currentPage === totalPages
              ? 'bg-slate-100 text-slate-300 border-slate-200 cursor-not-allowed'
              : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200 shadow-2xs cursor-pointer'
          }`}
        >
          <span>Next</span>
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
