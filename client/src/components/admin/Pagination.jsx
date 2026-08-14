import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

/**
 * Pagination component tái sử dụng cho các trang admin.
 *
 * Props:
 *  - page        : trang hiện tại (1-indexed)
 *  - totalPages  : tổng số trang
 *  - totalItems  : tổng số item
 *  - itemsPerPage: số item mỗi trang
 *  - onPageChange: (newPage) => void
 *  - onLimitChange: (newLimit) => void (optional)
 *  - limitOptions: mảng số item/trang, mặc định [10, 20, 50, 100]
 *  - itemLabel   : tên gọi của item (mặc định 'mục')
 *  - defaultLimit: giá trị mặc định nếu muốn hiển thị nhanh (10)
 */
export default function Pagination({
  page,
  totalPages,
  totalItems = 0,
  itemsPerPage = 10,
  onPageChange,
  onLimitChange,
  limitOptions = [10, 20, 50, 100],
  itemLabel = 'mục',
}) {
  const safePage = Math.max(1, page || 1);
  const safeTotalPages = Math.max(1, totalPages || 1);
  const start = totalItems === 0 ? 0 : (safePage - 1) * itemsPerPage + 1;
  const end = Math.min(safePage * itemsPerPage, totalItems);

  // Tạo danh sách các nút số trang hiển thị (smart window):
  // luôn hiển thị trang 1, trang hiện tại ± 1, và trang cuối.
  // Nếu nhiều trang thì chèn "..." giữa các khoảng trống.
  const pageButtons = [];
  const push = (p) => pageButtons.push(p);

  const windowSize = 1; // số trang hiển thị quanh trang hiện tại
  const addAround = (center) => {
    for (let i = Math.max(2, center - windowSize); i <= Math.min(safeTotalPages - 1, center + windowSize); i++) {
      if (!pageButtons.includes(i)) pageButtons.push(i);
    }
  };

  push(1);
  addAround(safePage);
  if (safeTotalPages > 1) push(safeTotalPages);

  pageButtons.sort((a, b) => a - b);

  // Chèn "..."
  const finalButtons = [];
  for (let i = 0; i < pageButtons.length; i++) {
    if (i > 0 && pageButtons[i] - pageButtons[i - 1] > 1) {
      finalButtons.push('...');
    }
    finalButtons.push(pageButtons[i]);
  }

  const goto = (p) => {
    const np = Math.max(1, Math.min(safeTotalPages, p));
    if (np !== safePage) onPageChange?.(np);
  };

  const Btn = ({ children, disabled, onClick, title, className = '' }) => (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`inline-flex items-center justify-center min-w-[34px] h-9 px-2 rounded-lg text-xs font-bold
        bg-slate-900 border border-slate-800 text-slate-400
        hover:border-cyan-500/50 hover:text-white
        disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:border-slate-800 disabled:hover:text-slate-400
        transition ${className}`}
    >
      {children}
    </button>
  );

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 glass-card rounded-2xl p-3 border border-slate-800">
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-xs text-slate-400">
          Hiển thị{' '}
          <span className="text-cyan-300 font-bold">{start}</span>-
          <span className="text-cyan-300 font-bold">{end}</span>
          {' '}trong tổng <span className="text-cyan-300 font-bold">{totalItems}</span> {itemLabel}
        </span>
        {onLimitChange && (
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-slate-500">/ trang:</span>
            <select
              value={itemsPerPage}
              onChange={(e) => onLimitChange(Number(e.target.value))}
              className="px-2 py-1 bg-slate-800 border border-slate-700 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-cyan-500 cursor-pointer"
            >
              {limitOptions.map(n => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="flex items-center gap-1.5 flex-wrap justify-center">
        <Btn onClick={() => goto(1)} disabled={safePage === 1} title="Trang đầu">
          <ChevronsLeft className="w-3.5 h-3.5" />
        </Btn>
        <Btn onClick={() => goto(safePage - 1)} disabled={safePage === 1} title="Trang trước">
          <ChevronLeft className="w-3.5 h-3.5" />
        </Btn>

        {finalButtons.map((p, i) =>
          p === '...' ? (
            <span key={`dots-${i}`} className="px-1.5 text-xs text-slate-500 select-none">…</span>
          ) : (
            <Btn
              key={p}
              onClick={() => goto(p)}
              disabled={p === safePage}
              title={`Trang ${p}`}
              className={p === safePage
                ? '!bg-gradient-to-r !from-cyan-400 !to-sky-400 !text-slate-950 !border-transparent !shadow-lg'
                : ''}
            >
              {p}
            </Btn>
          )
        )}

        <Btn onClick={() => goto(safePage + 1)} disabled={safePage === safeTotalPages} title="Trang sau">
          <ChevronRight className="w-3.5 h-3.5" />
        </Btn>
        <Btn onClick={() => goto(safeTotalPages)} disabled={safePage === safeTotalPages} title="Trang cuối">
          <ChevronsRight className="w-3.5 h-3.5" />
        </Btn>
      </div>
    </div>
  );
}