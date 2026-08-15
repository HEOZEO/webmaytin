import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { X, ShoppingCart, Cpu, Zap, HardDrive, Monitor, Battery, Weight, Eye, Trash2, Star } from 'lucide-react';
import showToast from '../utils/toast';
import { useCompare } from '../context/CompareContext';
import { resolveImage, onImageError } from '../utils/imageHelper';
import { useCart } from '../context/CartContext';

const SPEC_ROWS = [
  { key: 'image_url', label: 'Hình ảnh', type: 'image' },
  { key: 'name', label: 'Tên sản phẩm', type: 'text' },
  { key: 'brand_name', label: 'Thương hiệu', type: 'text' },
  { key: 'price', label: 'Giá bán', type: 'price' },
  { key: 'cpu', label: 'CPU', icon: Cpu },
  { key: 'ram', label: 'RAM', icon: Zap },
  { key: 'storage', label: 'Ổ cứng (SSD/HDD)', icon: HardDrive },
  { key: 'gpu', label: 'Card đồ họa (GPU)', icon: Monitor },
  { key: 'screen_size', label: 'Màn hình', icon: Monitor },
  { key: 'battery', label: 'Pin', icon: Battery },
  { key: 'weight', label: 'Trọng lượng', icon: Weight },
  { key: 'color', label: 'Màu sắc', type: 'text' },
  { key: 'stock', label: 'Tình trạng', type: 'stock' }
];

const formatPrice = (price) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);

export default function Compare() {
  const { compare, removeFromCompare, clearCompare, MAX_COMPARE } = useCompare();
  const { addToCart } = useCart();
  const navigate = useNavigate();

  if (compare.length === 0) {
    return (
      <div className="min-h-screen bg-[#f4f5f6] text-slate-900 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] py-16">
        <div className="max-w-2xl mx-auto px-4 text-center space-y-6">
          <div className="bg-white shadow-sm border border-slate-200 clip-path-rog p-10 space-y-4">
            <Eye className="w-16 h-16 text-slate-400 mx-auto" />
            <h2 className="text-2xl font-bold text-slate-900">Chưa có sản phẩm để so sánh</h2>
            <p className="text-slate-600 text-sm">Hãy bấm nút "So sánh" trên từng sản phẩm để thêm vào đây (tối đa {MAX_COMPARE} sản phẩm).</p>
            <Link to="/products" className="inline-block px-6 py-3 bg-red-600 hover:bg-red-500 text-white font-bold tracking-widest uppercase rounded-none clip-path-rog transition-colors">
              Khám Phá Sản Phẩm
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const handleAddToCart = (product) => {
    addToCart(product);
    showToast.success(`Đã thêm "${product.name}" vào giỏ hàng`);
  };

  return (
    <div className="min-h-screen bg-[#f4f5f6] text-slate-900 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-300 pb-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 flex items-center gap-2 uppercase tracking-tight">
              <Eye className="w-7 h-7 text-red-600" /> So Sánh Sản Phẩm
            </h1>
            <p className="text-slate-600 text-sm mt-1">{compare.length} / {MAX_COMPARE} sản phẩm được chọn</p>
          </div>
          <button
            onClick={() => { clearCompare(); showToast.success('Đã xóa tất cả sản phẩm so sánh'); }}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 rounded-none clip-path-rog shadow-sm text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" /> Xóa Tất Cả
          </button>
        </div>

        <div className="overflow-x-auto bg-white border border-slate-300 shadow-sm clip-path-rog">
        <table className="w-full text-sm text-slate-900 border-collapse">
          <thead>
            <tr className="bg-slate-100 border-b-2 border-slate-300">
              <th className="text-left p-4 font-extrabold text-slate-700 uppercase text-xs tracking-wider w-48 sticky left-0 bg-slate-100 border-r-2 border-slate-300 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)] z-20">
                Thông Số Kỹ Thuật
              </th>
              {compare.map(product => (
                <th key={product.id} className="p-4 text-center min-w-[260px] relative border-l border-slate-200 align-top">
                  <button
                    onClick={() => removeFromCompare(product.id)}
                    className="absolute top-2 right-2 p-1.5 rounded-full bg-slate-200 hover:bg-rose-100 text-slate-500 hover:text-rose-600 transition-colors"
                    aria-label="Xóa sản phẩm"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                  <span className="font-bold text-red-500 text-xs uppercase tracking-wider">Sản phẩm {compare.indexOf(product) + 1}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {SPEC_ROWS.map((row, idx) => (
              <tr key={row.key} className={idx % 2 === 0 ? 'bg-white hover:bg-slate-50 transition-colors' : 'bg-slate-50 hover:bg-slate-100 transition-colors'}>
                <td className="p-4 font-bold text-slate-700 sticky left-0 bg-inherit text-xs uppercase tracking-wider border-r-2 border-slate-300 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.02)] z-10">
                  <span className="flex items-center gap-2">
                    {row.icon && <row.icon className="w-4 h-4 text-red-600" />}
                    {row.label}
                  </span>
                </td>
                {compare.map(product => {
                  let value = product[row.key];
                  let display = '';
                  if (row.type === 'price') display = value != null ? formatPrice(value) : '—';
                  else if (row.type === 'stock') {
                    display = value > 0 ? (
                      <span className="text-red-500 font-bold">{value} còn lại</span>
                    ) : (
                      <span className="text-rose-400 font-bold">Hết hàng</span>
                    );
                  } else if (row.type === 'image') {
                    return (
                      <td key={product.id} className="p-4 text-center">
                        <img src={resolveImage(value)} alt={product.name} className="w-40 h-28 object-contain rounded-none clip-path-rog mx-auto bg-white p-2 border border-slate-100" onError={onImageError} />
                      </td>
                    );
                  } else {
                    display = value != null && value !== '' ? value : <span className="text-slate-300">—</span>;
                  }
                  return (
                    <td key={product.id} className="p-4 text-center font-semibold text-slate-800 align-middle border-l border-slate-200">
                      {display}
                    </td>
                  );
                })}
              </tr>
            ))}
            <tr className="border-t-4 border-slate-300 bg-slate-100">
              <td className="p-4 font-extrabold text-slate-800 sticky left-0 bg-slate-100 border-r-2 border-slate-300 uppercase text-xs tracking-wider shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)] z-10 align-middle">Hành Động</td>
              {compare.map(product => (
                <td key={product.id} className="p-4 text-center border-l border-slate-200">
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() => handleAddToCart(product)}
                      disabled={product.stock === 0}
                      className="px-4 py-2 bg-red-600 hover:bg-red-500 disabled:opacity-40 text-white font-bold tracking-widest uppercase rounded-none clip-path-rog text-xs flex items-center justify-center gap-1.5 transition-colors shadow-sm"
                    >
                      <ShoppingCart className="w-3.5 h-3.5" /> Thêm Giỏ
                    </button>
                    <Link
                      to={`/products/${product.id}`}
                      className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-none clip-path-rog text-xs transition-colors"
                    >
                      Xem Chi Tiết
                    </Link>
                  </div>
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>

      <div className="text-center pt-2">
        <Link to="/products" className="text-sm font-bold text-red-600 hover:text-red-500 hover:underline transition-colors uppercase tracking-widest">+ Thêm SP Khác</Link>
      </div>
      </div>
    </div>
  );
}
