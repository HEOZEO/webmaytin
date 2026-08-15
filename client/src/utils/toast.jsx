import toast from 'react-hot-toast';

/**
 * showToast - Hiển thị toast duy nhất (không chồng chập)
 * - Mỗi lần gọi sẽ dismiss toàn bộ toast cũ trước khi hiện mới
 * - Mặc định có nút X để đóng thủ công
 * - duration: 2000ms (2 giây)
 */

const dismissAll = () => toast.dismiss();

const CloseButton = ({ t }) => (
  <button
    onClick={(e) => {
      e.stopPropagation();
      toast.dismiss(t.id);
    }}
    aria-label="Đóng thông báo"
    className="ml-3 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-neutral-300 hover:bg-slate-700/60 hover:text-white transition"
  >
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  </button>
);

const renderWithClose = (message) => (t) => (
  <div className="flex w-full items-center justify-between gap-2">
    <span className="flex-1">{message}</span>
    <CloseButton t={t} />
  </div>
);

const defaultOpts = {
  duration: 2000,
  position: 'top-right',
};

export const showToast = {
  success: (msg, opts = {}) => {
    dismissAll();
    return toast.success(renderWithClose(msg), { ...defaultOpts, ...opts });
  },
  error: (msg, opts = {}) => {
    dismissAll();
    return toast.error(renderWithClose(msg), { ...defaultOpts, ...opts });
  },
  info: (msg, opts = {}) => {
    dismissAll();
    return toast(renderWithClose(msg), { ...defaultOpts, ...opts });
  },
  warning: (msg, opts = {}) => {
    dismissAll();
    return toast(renderWithClose(msg), {
      ...defaultOpts,
      icon: '⚠️',
      ...opts,
    });
  },
  loading: (msg, opts = {}) => {
    dismissAll();
    return toast.loading(renderWithClose(msg), { ...defaultOpts, ...opts });
  },
  dismiss: dismissAll,
};

export default showToast;
