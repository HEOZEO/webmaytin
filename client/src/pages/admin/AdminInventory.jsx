import React, { useEffect, useState, useCallback } from 'react';
import { AlertTriangle, Plus, Minus, RefreshCw, Download, Loader2, History, ArrowUp, ArrowDown, Settings2 } from 'lucide-react';
import showToast from '../../utils/toast';
import { adminProductService } from '../../services/adminService';
import api from '../../services/api';
import { resolveImage, onImageError } from '../../utils/imageHelper';
import Pagination from '../../components/admin/Pagination';

export default function AdminInventory() {
  const [products, setProducts] = useState([]);
  const [lowStock, setLowStock] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [threshold, setThreshold] = useState(10);
  const [showStockModal, setShowStockModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [adjustProduct, setAdjustProduct] = useState(null);
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyTotalPages, setHistoryTotalPages] = useState(1);
  const [stockForm, setStockForm] = useState({ type: 'in', quantity: '', notes: '' });

  // Pagination (server-side)
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [lowStockPage, setLowStockPage] = useState(1);
  const [lowStockLimit] = useState(50); // lấy tối đa 50 SP sắp hết — không cần phân trang
  const [lowStockTotalPages, setLowStockTotalPages] = useState(1);
  const [lowStockTotalItems, setLowStockTotalItems] = useState(0);

  // Reset về trang 1 khi đổi tab
  useEffect(() => {
    setPage(1);
  }, [activeTab]);

  // Reset về trang 1 khi đổi limit
  useEffect(() => {
    setPage(1);
  }, [limit]);

  const loadInventory = useCallback(async () => {
    setLoading(true);
    try {
      // Tab "Sắp hết" chỉ cần gọi getLowStock — KHÔNG cần getAll (limit lớn)
      if (activeTab === 'low') {
        const lowRes = await adminProductService.getLowStock(lowStockLimit);
        const low = lowRes?.data?.products || lowRes?.products || lowRes?.data || [];
        setLowStock(low);
        setLowStockTotalItems(low.length);

        // Tab low: 1 trang duy nhất, không phân trang
        setProducts(low);
        setTotalPages(1);
        setTotalItems(low.length);
        return;
      }

      // Tab "Tất cả" — phân trang theo page/limit
      const [allRes, lowRes] = await Promise.all([
        adminProductService.getAll({ page, limit }),
        adminProductService.getLowStock(lowStockLimit),
      ]);

      const allItems = allRes?.data?.products || allRes?.products || allRes?.data || [];
      const allPg = allRes?.data?.pagination || allRes?.pagination || {};
      setProducts(allItems);
      setTotalPages(allPg.totalPages || 1);
      setTotalItems(allPg.totalItems || allItems.length);

      const low = lowRes?.data?.products || lowRes?.products || lowRes?.data || [];
      setLowStock(low);
      setLowStockTotalItems(low.length);
    } catch (err) {
      showToast.error('Không thể tải tồn kho');
    } finally {
      setLoading(false);
    }
  }, [page, limit, activeTab, lowStockLimit]);

  useEffect(() => {
    loadInventory();
  }, [loadInventory]);

  const openAdjust = (product, type) => {
    setAdjustProduct(product);
    setStockForm({ type, quantity: '', notes: '' });
    setShowStockModal(true);
  };

  const submitStockAdjustment = async (e) => {
    e.preventDefault();
    try {
      const qty = Math.abs(Number(stockForm.quantity));
      if (!qty || !adjustProduct) return;

      // Gửi đúng format theo backend: { productId, quantity, type, notes }
      const payload = {
        productId: adjustProduct.id,
        quantity: qty,
        type: stockForm.type,
        notes: stockForm.notes
      };

      await adminProductService.bulkUpdateStock([payload]);
      showToast.success('Cập nhật tồn kho thành công');
      setShowStockModal(false);
      loadInventory();
    } catch (err) {
      showToast.error(err.response?.data?.message || 'Cập nhật thất bại');
    }
  };

  const openHistory = async (product) => {
    setAdjustProduct(product);
    setShowHistoryModal(true);
    setHistoryPage(1);
    await loadHistory(product.id, 1);
  };

  const loadHistory = async (productId, page = 1) => {
    setHistoryLoading(true);
    try {
      const res = await adminProductService.getInventoryHistory(productId, page, 20);
      const items = res?.data?.transactions || res?.transactions || res?.data || [];
      setHistory(items);
      setHistoryTotalPages(res?.data?.totalPages || res?.totalPages || 1);
    } catch (err) {
      setHistory([]);
    } finally {
      setHistoryLoading(false);
    }
    setHistoryPage(page);
  };

  const exportExcel = async () => {
    try {
      showToast.loading('Đang tạo file Excel...');
      const XLSX = await import('xlsx');
      // Lấy TẤT CẢ sản phẩm để export (không phụ thuộc phân trang)
      const allRes = await adminProductService.getAll({ limit: 1000 });
      const allItems = allRes?.data?.products || allRes?.products || allRes?.data || [];
      const rows = allItems.map(p => ({
        'ID': p.id,
        'Tên sản phẩm': p.name,
        'SKU': p.sku || '',
        'Tồn kho': p.stock || 0,
        'Giá': p.price,
        'Cảnh báo': (p.stock || 0) <= threshold ? 'SẮP HẾT' : 'OK'
      }));
      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'TonKho');
      XLSX.writeFile(wb, `ton-kho-${new Date().toISOString().slice(0, 10)}.xlsx`);
      showToast.dismiss();
      showToast.success('Đã xuất file tồn kho');
    } catch (err) {
      showToast.dismiss();
      showToast.error('Lỗi xuất file');
    }
  };

  const formatPrice = (p) => new Intl.NumberFormat('vi-VN').format(p || 0);

  const filtered = activeTab === 'low' ? lowStock : products;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white">📦 Quản Lý Tồn Kho</h1>
          <p className="text-slate-400 text-sm mt-1">
            {totalItems} sản phẩm • {lowStockTotalItems} sắp hết hàng
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={exportExcel} className="flex items-center gap-1.5 px-4 py-2 bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-bold rounded-xl text-xs hover:bg-emerald-500/30 transition">
            <Download className="w-3.5 h-3.5" /> Xuất Excel
          </button>
          <button onClick={loadInventory} className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 border border-slate-800 text-slate-300 font-bold rounded-xl text-xs hover:border-cyan-500/50 transition">
            <RefreshCw className="w-3.5 h-3.5" /> Tải Lại
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="glass-card p-4 rounded-2xl border-l-4 border-cyan-500">
          <div className="text-xs uppercase text-slate-500 font-bold">Tổng sản phẩm</div>
          <div className="text-2xl font-bold text-white mt-1">{activeTab === 'all' ? totalItems : lowStockTotalItems}</div>
        </div>
        <div className="glass-card p-4 rounded-2xl border-l-4 border-amber-500">
          <div className="text-xs uppercase text-slate-500 font-bold">Sắp hết (≤ {threshold})</div>
          <div className="text-2xl font-bold text-amber-300 mt-1">{lowStockTotalItems}</div>
        </div>
        <div className="glass-card p-4 rounded-2xl border-l-4 border-rose-500">
          <div className="text-xs uppercase text-slate-500 font-bold">Đã hết hàng (0)</div>
          <div className="text-2xl font-bold text-rose-300 mt-1">{lowStock.filter(p => Number(p.stock) === 0).length}</div>
        </div>
      </div>

      <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
        <button
          onClick={() => setActiveTab('all')}
          className={`px-4 py-2 rounded-xl text-xs font-bold ${activeTab === 'all' ? 'bg-cyan-500 text-slate-950' : 'bg-slate-900 text-slate-300 hover:bg-slate-800'}`}
        >
          Tất Cả Sản Phẩm ({totalItems})
        </button>
        <button
          onClick={() => setActiveTab('low')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 ${activeTab === 'low' ? 'bg-amber-500 text-slate-950' : 'bg-slate-900 text-slate-300 hover:bg-slate-800'}`}
        >
          <AlertTriangle className="w-3 h-3" /> Sắp Hết Hàng ({lowStockTotalItems})
        </button>
      </div>

      <div className="glass-card rounded-2xl p-4 overflow-x-auto">
        <table className="w-full text-left text-sm text-slate-300">
          <thead className="text-xs uppercase text-slate-400 border-b border-slate-800">
            <tr>
              <th className="py-3 px-4">Sản Phẩm</th>
              <th className="py-3 px-4">SKU</th>
              <th className="py-3 px-4">Tồn Kho</th>
              <th className="py-3 px-4">Trạng Thái</th>
              <th className="py-3 px-4 text-right">Thao Tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {loading ? (
              <tr><td colSpan="5" className="py-12 text-center"><Loader2 className="w-5 h-5 animate-spin mx-auto text-cyan-400" /></td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan="5" className="py-12 text-center text-slate-500">Không có dữ liệu</td></tr>
            ) : filtered.map(prod => {
              const stock = Number(prod.stock) || 0;
              return (
                <tr key={prod.id} className="hover:bg-slate-900/40">
                  <td className="py-3 px-4 flex items-center gap-3 min-w-0">
                    <img src={resolveImage(prod.image_url)} onError={onImageError} className="w-10 h-10 rounded-xl object-cover bg-slate-800" alt="" />
                    <span className="font-semibold text-white truncate">{prod.name}</span>
                  </td>
                  <td className="py-3 px-4 text-xs text-slate-400">{prod.sku || 'Chưa có SKU'}</td>
                  <td className="py-3 px-4">
                    <span className={`text-base font-bold ${stock === 0 ? 'text-rose-300' : stock <= threshold ? 'text-amber-300' : 'text-emerald-300'}`}>
                      {stock}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    {stock === 0 ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300">HẾT HÀNG</span>
                    ) : stock <= threshold ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300">⚠ SẮP HẾT</span>
                    ) : (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300">CÒN HÀNG</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right space-x-1">
                    <button onClick={() => openAdjust(prod, 'in')} title="Nhập kho" className="p-2 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20 rounded-lg"><Plus className="w-3.5 h-3.5" /></button>
                    <button onClick={() => openAdjust(prod, 'out')} title="Xuất kho" className="p-2 bg-rose-500/10 text-rose-300 hover:bg-rose-500/20 rounded-lg"><Minus className="w-3.5 h-3.5" /></button>
                    <button onClick={() => openAdjust(prod, 'adjustment')} title="Điều chỉnh" className="p-2 bg-slate-800 text-cyan-300 hover:bg-slate-700 rounded-lg"><Settings2 className="w-3.5 h-3.5" /></button>
                    <button onClick={() => openHistory(prod)} title="Lịch sử" className="p-2 bg-slate-800 text-slate-300 hover:bg-slate-700 rounded-lg"><History className="w-3.5 h-3.5" /></button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination - chỉ hiển thị khi tab = 'all' và có nhiều trang */}
      {activeTab === 'all' && totalPages > 0 && (
        <Pagination
          page={page}
          totalPages={totalPages}
          totalItems={totalItems}
          itemsPerPage={limit}
          onPageChange={setPage}
          onLimitChange={setLimit}
          itemLabel="sản phẩm"
          limitOptions={[10, 20, 50, 100]}
        />
      )}

      {showStockModal && adjustProduct && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="glass-card p-6 rounded-3xl w-full max-w-md space-y-4 border border-cyan-500/30">
            <div className="border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-white">
                {stockForm.type === 'in' ? 'Nhập Kho' : stockForm.type === 'out' ? 'Xuất Kho' : 'Điều Chỉnh'} - {adjustProduct.name}
              </h3>
              <p className="text-xs text-slate-400 mt-1">Hiện tại: <span className="text-cyan-300 font-bold">{adjustProduct.stock}</span></p>
            </div>

            <form onSubmit={submitStockAdjustment} className="space-y-3">
              <div>
                <label className="text-xs text-slate-400">Số lượng *</label>
                <input
                  type="number" required min="1" value={stockForm.quantity}
                  onChange={(e) => setStockForm({...stockForm, quantity: e.target.value})}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-sm"
                  placeholder="Nhập số lượng..."
                />
              </div>
              <div>
                <label className="text-xs text-slate-400">Ghi chú</label>
                <textarea
                  rows="2" value={stockForm.notes}
                  onChange={(e) => setStockForm({...stockForm, notes: e.target.value})}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-sm"
                  placeholder="Lý do / nguồn nhập..."
                />
              </div>
              {stockForm.quantity && adjustProduct && (
                <div className="p-3 rounded-xl bg-slate-900/60 text-xs">
                  <span className="text-slate-400">Tồn kho sau: </span>
                  <span className="text-base font-bold text-cyan-300">
                    {stockForm.type === 'in' ? Number(adjustProduct.stock) + Number(stockForm.quantity) :
                     stockForm.type === 'out' ? Number(adjustProduct.stock) - Number(stockForm.quantity) :
                     Number(stockForm.quantity)}
                  </span>
                </div>
              )}
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button type="button" onClick={() => setShowStockModal(false)} className="px-4 py-2 bg-slate-800 text-slate-300 font-semibold rounded-xl text-xs">Hủy</button>
                <button type="submit" className="px-5 py-2 bg-cyan-500 text-slate-950 font-bold rounded-xl text-xs">Xác Nhận</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showHistoryModal && adjustProduct && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="glass-card p-6 rounded-3xl w-full max-w-2xl max-h-[80vh] overflow-y-auto space-y-3 border border-cyan-500/30">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-white">Lịch Sử - {adjustProduct.name}</h3>
              <button onClick={() => setShowHistoryModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>
            {historyLoading ? (
              <Loader2 className="w-5 h-5 animate-spin mx-auto text-cyan-400" />
            ) : history.length === 0 ? (
              <p className="text-center text-slate-500 py-8">Chưa có lịch sử giao dịch</p>
            ) : (
              <>
                <div className="space-y-2">
                  {history.map((h, i) => (
                    <div key={h.id || i} className="p-3 bg-slate-900/60 rounded-xl flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${
                        h.type === 'in' ? 'bg-emerald-500/10 text-emerald-300' :
                        h.type === 'out' ? 'bg-rose-500/10 text-rose-300' :
                        'bg-slate-800 text-slate-300'
                      }`}>
                        {h.type === 'in' ? <ArrowUp className="w-4 h-4" /> :
                         h.type === 'out' ? <ArrowDown className="w-4 h-4" /> :
                         <Settings2 className="w-4 h-4" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-bold text-white">
                          {h.type === 'in' ? '+' : h.type === 'out' ? '-' : ''}
                          {h.quantity} sản phẩm
                        </div>
                        <div className="text-xs text-slate-400">
                          {new Date(h.created_at).toLocaleString('vi-VN')} • {h.user_name || 'Hệ thống'}
                        </div>
                        {h.notes && <div className="text-xs text-slate-500 mt-1 italic">"{h.notes}"</div>}
                      </div>
                    </div>
                  ))}
                </div>
                {historyTotalPages > 1 && (
                  <div className="flex justify-center gap-2 pt-3 border-t border-slate-800">
                    {Array.from({length: historyTotalPages}, (_, i) => i + 1).map(p => (
                      <button key={p} onClick={() => loadHistory(adjustProduct.id, p)}
                        className={`w-9 h-9 rounded-lg text-xs font-bold ${historyPage === p ? 'bg-cyan-500 text-slate-950' : 'bg-slate-900 text-slate-400 border border-slate-800'}`}>{p}</button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}