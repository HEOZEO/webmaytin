// Skeleton loading placeholders for various card/list layouts.
// Use while data is being fetched to avoid layout shift (CLS) and signal loading.

const shimmer =
  'relative overflow-hidden bg-slate-800/40 before:absolute before:inset-0 before:translate-x-[-100%] before:bg-gradient-to-r before:from-transparent before:via-white/5 before:to-transparent before:animate-[shimmer_1.4s_infinite]';

function ShimmerDiv({ className = '' }) {
  return <div className={`${shimmer} rounded ${className}`} aria-hidden="true" />;
}

export function ProductCardSkeleton() {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-4" aria-label="Đang tải sản phẩm">
      <ShimmerDiv className="aspect-[4/3] w-full rounded-xl mb-4" />
      <ShimmerDiv className="h-5 w-3/4 mb-2" />
      <ShimmerDiv className="h-4 w-1/2 mb-3" />
      <div className="flex justify-between items-center">
        <ShimmerDiv className="h-6 w-24" />
        <ShimmerDiv className="h-9 w-24 rounded-lg" />
      </div>
    </div>
  );
}

export function ProductGridSkeleton({ count = 8 }) {
  return (
    <div
      className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4"
      role="status"
      aria-live="polite"
    >
      {Array.from({ length: count }).map((_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
      <span className="sr-only">Đang tải danh sách sản phẩm...</span>
    </div>
  );
}

export function ProductDetailSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-8 md:grid-cols-2" role="status" aria-live="polite">
      <div>
        <ShimmerDiv className="aspect-square w-full rounded-2xl" />
        <div className="mt-4 grid grid-cols-4 gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <ShimmerDiv key={i} className="aspect-square w-full rounded-lg" />
          ))}
        </div>
      </div>
      <div className="space-y-4">
        <ShimmerDiv className="h-9 w-3/4" />
        <ShimmerDiv className="h-7 w-1/3" />
        <ShimmerDiv className="h-4 w-full" />
        <ShimmerDiv className="h-4 w-5/6" />
        <ShimmerDiv className="h-4 w-4/6" />
        <div className="flex gap-2 mt-6">
          <ShimmerDiv className="h-12 w-40 rounded-lg" />
          <ShimmerDiv className="h-12 w-32 rounded-lg" />
        </div>
      </div>
      <span className="sr-only">Đang tải chi tiết sản phẩm...</span>
    </div>
  );
}

export function CartItemSkeleton() {
  return (
    <div className="flex gap-4 rounded-xl border border-slate-800 bg-slate-900/50 p-4" aria-label="Đang tải sản phẩm trong giỏ">
      <ShimmerDiv className="h-24 w-24 flex-shrink-0 rounded-lg" />
      <div className="flex-1 space-y-2">
        <ShimmerDiv className="h-5 w-3/4" />
        <ShimmerDiv className="h-4 w-1/4" />
        <div className="flex items-center gap-3 mt-3">
          <ShimmerDiv className="h-9 w-28 rounded-lg" />
          <ShimmerDiv className="h-9 w-9 rounded-full" />
        </div>
      </div>
    </div>
  );
}

export function CartListSkeleton({ count = 3 }) {
  return (
    <div className="space-y-3" role="status" aria-live="polite">
      {Array.from({ length: count }).map((_, i) => (
        <CartItemSkeleton key={i} />
      ))}
      <span className="sr-only">Đang tải giỏ hàng...</span>
    </div>
  );
}

export function BannerSkeleton() {
  return (
    <div
      className="relative w-full aspect-[16/7] md:aspect-[21/9] rounded-2xl overflow-hidden"
      role="status"
      aria-live="polite"
    >
      <ShimmerDiv className="absolute inset-0 rounded-2xl" />
      <span className="sr-only">Đang tải banner...</span>
    </div>
  );
}

export function CheckoutSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3" role="status" aria-live="polite">
      <div className="lg:col-span-2 space-y-4">
        <ShimmerDiv className="h-7 w-48" />
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <ShimmerDiv key={i} className="h-16 w-full rounded-lg" />
          ))}
        </div>
      </div>
      <div className="space-y-3">
        <ShimmerDiv className="h-7 w-40" />
        <ShimmerDiv className="h-40 w-full rounded-xl" />
      </div>
      <span className="sr-only">Đang tải trang thanh toán...</span>
    </div>
  );
}

export default ShimmerDiv;
