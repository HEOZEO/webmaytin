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
      <div className="max-w-2xl mx-auto my-16 px-4 text-center space-y-6">
        <div className="glass-card p-10 rounded-3xl space-y-4">
          <Eye className="w-16 h-16 text-slate-600 mx-auto" />
          <h2 className="text-2xl font-bold text-white">Chưa có sản phẩm để so sánh</h2>
          <p className="text-slate-400 text-sm">Hãy bấm nút "So sánh" trên từng sản phẩm để thêm vào đây (tối đa {MAX_COMPARE} sản phẩm).</p>
          <Link to="/products" className="inline-block px-6 py-3 bg-cyan-500 text-slate-950 font-bold rounded-xl">
            Khám Phá Sản Phẩm
          </Link>
        </div>
      </div>
    );
  }

  const handleAddToCart = (product) => {
    addToCart(product);
    showToast.success(`Đã thêm "${product.name}" vào giỏ hàng`);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white flex items-center gap-2">
            <Eye className="w-7 h-7 text-cyan-400" /> So Sánh Sản Phẩm
          </h1>
          <p className="text-slate-400 text-sm mt-1">{compare.length} / {MAX_COMPARE} sản phẩm được chọn</p>
        </div>
        <button
          onClick={() => { clearCompare(); showToast.success('Đã xóa tất cả sản phẩm so sánh'); }}
          className="flex items-center gap-2 px-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs font-semibold text-rose-400 hover:bg-rose-500/10 transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5" /> Xóa Tất Cả
        </button>
      </div>

      <div className="overflow-x-auto glass-card rounded-3xl border border-slate-800">
        <table className="w-full text-sm text-slate-200">
          <thead>
            <tr className="bg-slate-900/80 border-b border-slate-800">
              <th className="text-left p-4 font-bold text-slate-400 uppercase text-xs tracking-wider w-48 sticky left-0 bg-slate-900">
                Thông Số Kỹ Thuật
              </th>
              {compare.map(product => (
                <th key={product.id} className="p-4 text-center min-w-[260px] relative">
                  <button
                    onClick={() => removeFromCompare(product.id)}
                    className="absolute top-2 right-2 p-1.5 rounded-full bg-slate-800 hover:bg-rose-500/30 text-slate-400 hover:text-rose-400 transition-colors"
                    aria-label="Xóa sản phẩm"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                  <span className="font-bold text-cyan-400 text-xs uppercase tracking-wider">Sản phẩm {compare.indexOf(product) + 1}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {SPEC_ROWS.map((row, idx) => (
              <tr key={row.key} className={idx % 2 === 0 ? 'bg-transparent' : 'bg-slate-900/40'}>
                <td className="p-4 font-semibold text-slate-300 sticky left-0 bg-slate-900/95 text-xs uppercase tracking-wider border-r border-slate-800">
                  <span className="flex items-center gap-1.5">
                    {row.icon && <row.icon className="w-3.5 h-3.5 text-cyan-400" />}
                    {row.label}
                  </span>
                </td>
                {compare.map(product => {
                  let value = product[row.key];
                  let display = '';
                  if (row.type === 'price') display = value != null ? formatPrice(value) : '—';
                  else if (row.type === 'stock') {
                    display = value > 0 ? (
                      <span className="text-emerald-400 font-bold">{value} còn lại</span>
                    ) : (
                      <span className="text-rose-400 font-bold">Hết hàng</span>
                    );
                  } else if (row.type === 'image') {
                    return (
                      <td key={product.id} className="p-4 text-center">
                        <img src={resolveImage(value)} alt={product.name} className="w-40 h-28 object-cover rounded-xl mx-auto bg-slate-900" onError={onImageError} />
                      </td>
                    );
                  } else {
                    display = value != null && value !== '' ? value : <span className="text-slate-600">—</span>;
                  }
                  return (
                    <td key={product.id} className="p-4 text-center font-medium text-white align-top">
                      {display}
                    </td>
                  );
                })}
              </tr>
            ))}
            <tr className="border-t-2 border-slate-800 bg-slate-900/60">
              <td className="p-4 font-bold text-slate-200 sticky left-0 bg-slate-900/95 uppercase text-xs tracking-wider">Hành Động</td>
              {compare.map(product => (
                <td key={product.id} className="p-4 text-center">
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() => handleAddToCart(product)}
                      disabled={product.stock === 0}
                      className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 disabled:opacity-40 text-slate-950 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <ShoppingCart className="w-3.5 h-3.5" /> Thêm Giỏ
                    </button>
                    <Link
                      to={`/products/${product.id}`}
                      className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-cyan-300 font-bold rounded-xl text-xs"
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

      <div className="text-center">
        <Link to="/products" className="text-xs text-cyan-400 hover:underline">+ Thêm sản phẩm khác để so sánh</Link>
      </div>
    </div>
  );
}
