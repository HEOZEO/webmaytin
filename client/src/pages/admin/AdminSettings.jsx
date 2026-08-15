import React, { useEffect, useState, useCallback } from 'react';
import { Loader2, Save, RefreshCw, Settings, Store, Phone, Truck, Shield, CreditCard, Bell } from 'lucide-react';
import showToast from '../../utils/toast';
import api from '../../services/api';

const SETTING_CATEGORIES = [
  { id: 'store', label: 'Thông tin cửa hàng', icon: Store },
  { id: 'contact', label: 'Liên hệ', icon: Phone },
  { id: 'shipping', label: 'Vận chuyển', icon: Truck },
  { id: 'payment', label: 'Thanh toán', icon: CreditCard },
  { id: 'notification', label: 'Thông báo', icon: Bell },
  { id: 'system', label: 'Hệ thống', icon: Shield }
];

const DEFAULT_SETTINGS = {
  // Store Info
  store_name: { label: 'Tên cửa hàng', value: 'Shop Máy Tính Huế', category: 'store', type: 'text' },
  store_slogan: { label: 'Slogan', value: 'Uy tín - Chất lượng - Giá tốt', category: 'store', type: 'text' },
  store_logo: { label: 'Logo URL', value: '', category: 'store', type: 'text' },
  store_favicon: { label: 'Favicon URL', value: '', category: 'store', type: 'text' },

  // Contact
  store_phone: { label: 'Số điện thoại', value: '0234 1234 567', category: 'contact', type: 'text' },
  store_email: { label: 'Email', value: 'contact@shophue.vn', category: 'contact', type: 'email' },
  store_address: { label: 'Địa chỉ', value: '123 Nguyễn Huệ, TP Huế', category: 'contact', type: 'text' },
  store_hotline: { label: 'Hotline', value: '1900 1234', category: 'contact', type: 'text' },
  store_zalo: { label: 'Zalo', value: '', category: 'contact', type: 'text' },
  store_facebook: { label: 'Facebook', value: '', category: 'contact', type: 'text' },
  store_working_hours: { label: 'Giờ làm việc', value: '8:00 - 21:00', category: 'contact', type: 'text' },

  // Shipping
  shipping_free_threshold: { label: 'Miễn phí ship khi đơn từ (VNĐ)', value: '500000', category: 'shipping', type: 'number' },
  shipping_default_fee: { label: 'Phí ship mặc định (VNĐ)', value: '30000', category: 'shipping', type: 'number' },
  shipping_enabled: { label: 'Bật tính năng giao hàng', value: 'true', category: 'shipping', type: 'boolean' },

  // Payment
  payment_cod_enabled: { label: 'Bật COD (Tiền mặt)', value: 'true', category: 'payment', type: 'boolean' },
  payment_bank_enabled: { label: 'Bật Chuyển khoản ngân hàng', value: 'false', category: 'payment', type: 'boolean' },
  payment_wallet_enabled: { label: 'Bật Ví điện tử', value: 'false', category: 'payment', type: 'boolean' },

  // Notification
  notification_email_order: { label: 'Gửi email khi có đơn hàng mới', value: 'true', category: 'notification', type: 'boolean' },
  notification_email_status: { label: 'Gửi email khi cập nhật trạng thái', value: 'true', category: 'notification', type: 'boolean' },
  notification_sms_enabled: { label: 'Bật thông báo SMS', value: 'false', category: 'notification', type: 'boolean' },

  // System
  system_maintenance: { label: 'Chế độ bảo trì', value: 'false', category: 'system', type: 'boolean' },
  system_analytics: { label: 'Theo dõi Analytics', value: 'true', category: 'system', type: 'boolean' }
};

export default function AdminSettings() {
  const [settings, setSettings] = useState({});
  const [initialSettings, setInitialSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeCategory, setActiveCategory] = useState('store');
  const [savingKeys, setSavingKeys] = useState({});

  const hasChanges = useCallback(() => {
    if (Object.keys(initialSettings).length === 0) return false;
    return Object.keys(settings).some(key => {
      return settings[key]?.value !== initialSettings[key]?.value;
    });
  }, [settings, initialSettings]);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/settings');
      const data = res?.data?.data || {};

      const merged = {};
      Object.entries(DEFAULT_SETTINGS).forEach(([key, config]) => {
        merged[key] = {
          ...config,
          value: data[key]?.value ?? config.value
        };
      });

      setSettings(merged);
      setInitialSettings(JSON.parse(JSON.stringify(merged)));
    } catch (err) {
      console.error('Load settings error:', err);
      const defaults = {};
      Object.entries(DEFAULT_SETTINGS).forEach(([key, config]) => {
        defaults[key] = { ...config };
      });
      setSettings(defaults);
      setInitialSettings(JSON.parse(JSON.stringify(defaults)));
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (key, value) => {
    setSettings(prev => ({
      ...prev,
      [key]: { ...prev[key], value }
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const settingsObj = {};
      Object.entries(settings).forEach(([key, config]) => {
        settingsObj[key] = config.value;
      });

      await api.put('/admin/settings/bulk/update', { settings: settingsObj });

      setInitialSettings(JSON.parse(JSON.stringify(settings)));
      showToast.success('Lưu cài đặt thành công!');
    } catch (err) {
      console.error('Save settings error:', err);
      showToast.error(err.response?.data?.message || 'Lưu cài đặt thất bại');
    } finally {
      setSaving(false);
    }
  };

  // Lưu từng setting riêng lẻ
  const handleSaveSingle = async (key) => {
    setSavingKeys(prev => ({ ...prev, [key]: true }));
    try {
      await api.put(`/admin/settings/key/${key}`, { value: settings[key]?.value });
      setInitialSettings(prev => ({
        ...prev,
        [key]: { ...prev[key], value: settings[key]?.value }
      }));
      showToast.success('Đã lưu!');
    } catch (err) {
      showToast.error(err.response?.data?.message || 'Lưu thất bại');
    } finally {
      setSavingKeys(prev => ({ ...prev, [key]: false }));
    }
  };

  const handleReset = () => {
    setSettings(JSON.parse(JSON.stringify(initialSettings)));
    showToast.success('Đã khôi phục cài đặt');
  };

  const filteredSettings = Object.entries(settings).filter(([, config]) => config?.category === activeCategory);
  const changesExist = hasChanges();
  const currentCategory = SETTING_CATEGORIES.find(c => c.id === activeCategory);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-neutral-800 pb-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white flex items-center gap-2">
            <Settings className="w-7 h-7 text-red-500" />
            Cài Đặt Hệ Thống
          </h1>
          <p className="text-neutral-400 text-sm mt-1">Quản lý cấu hình cửa hàng và hệ thống</p>
        </div>
        <div className="flex items-center gap-2">
          {changesExist && (
            <button
              onClick={handleReset}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm transition"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Khôi phục</span>
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={saving || !changesExist}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-cyan-600 text-white font-bold rounded-lg text-sm transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            <span>Lưu thay đổi</span>
          </button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar Categories */}
        <div className="lg:w-64 flex-shrink-0">
          <div className="bg-neutral-900 border border-neutral-800 clip-path-rog rounded-none clip-path-rog p-3 sticky top-4">
            <h3 className="text-xs font-bold text-neutral-400 uppercase mb-3 px-2">Danh mục</h3>
            <nav className="space-y-1">
              {SETTING_CATEGORIES.map(cat => {
                const Icon = cat.icon;
                const count = Object.values(settings).filter(s => s?.category === cat.id).length;
                const isActive = activeCategory === cat.id;

                return (
                  <button
                    key={cat.id}
                    onClick={() => setActiveCategory(cat.id)}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-none clip-path-rog text-sm transition ${
                      isActive
                        ? 'bg-red-600/20 text-red-400 font-medium'
                        : 'text-neutral-400 hover:bg-neutral-900 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Icon className="w-4 h-4" />
                      <span>{cat.label}</span>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${isActive ? 'bg-red-600/30' : 'bg-slate-700'}`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Settings Content */}
        <div className="flex-1">
          {loading ? (
            <div className="bg-neutral-900 border border-neutral-800 clip-path-rog rounded-none clip-path-rog p-12 flex flex-col items-center justify-center gap-4">
              <Loader2 className="w-10 h-10 animate-spin text-red-500" />
              <span className="text-neutral-400">Đang tải cài đặt...</span>
            </div>
          ) : (
            <div className="bg-neutral-900 border border-neutral-800 clip-path-rog rounded-none clip-path-rog p-6">
              <div className="flex items-center gap-3 mb-6">
                {currentCategory && <currentCategory.icon className="w-6 h-6 text-red-500" />}
                <h2 className="text-lg font-bold text-white">
                  {currentCategory?.label || 'Cài đặt'}
                </h2>
              </div>

              <div className="space-y-4">
                {filteredSettings.map(([key, config]) => {
                  const isChanged = config?.value !== initialSettings[key]?.value;
                  const isSaving = savingKeys[key];
                  
                  return (
                    <div
                      key={key}
                      className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-none clip-path-rog border transition-all ${
                        isChanged
                          ? 'bg-red-600/5 border-red-600/30 shadow-sm shadow-red-600/10'
                          : 'bg-neutral-900/50 border-slate-700/50'
                      }`}
                    >
                      <div className="flex-1">
                        <label className="text-sm font-semibold text-white flex items-center gap-2">
                          {config?.label}
                          {isChanged && (
                            <span className="px-2 py-0.5 bg-red-600/20 text-red-400 text-[10px] font-bold rounded-full">
                              Đã thay đổi
                            </span>
                          )}
                        </label>
                        <p className="text-[10px] text-slate-500 mt-0.5 font-mono">{key}</p>
                      </div>
                      <div className="flex items-center gap-2 sm:w-64">
                        <div className="flex-1">
                          {config?.type === 'boolean' ? (
                            <button
                              onClick={() => {
                                handleChange(key, config.value === 'true' ? 'false' : 'true');
                                // Auto-save on toggle
                                setTimeout(() => handleSaveSingle(key), 100);
                              }}
                              className={`relative w-14 h-7 rounded-full transition-all duration-200 ${
                                config.value === 'true' ? 'bg-red-600 shadow-lg shadow-red-600/30' : 'bg-slate-600'
                              }`}
                              type="button"
                            >
                              <span
                                className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow transition-all duration-200 ${
                                  config.value === 'true' ? 'left-8' : 'left-1'
                                }`}
                              />
                            </button>
                          ) : config?.type === 'number' ? (
                            <input
                              type="number"
                              value={config.value}
                              onChange={(e) => handleChange(key, e.target.value)}
                              onBlur={() => isChanged && handleSaveSingle(key)}
                              className="w-full px-3 py-2 bg-black border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-red-600/50"
                              min="0"
                            />
                          ) : (
                            <input
                              type={config?.type === 'email' ? 'email' : 'text'}
                              value={config.value}
                              onChange={(e) => handleChange(key, e.target.value)}
                              onBlur={() => isChanged && handleSaveSingle(key)}
                              className="w-full px-3 py-2 bg-black border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-red-600/50"
                            />
                          )}
                        </div>
                        {isChanged && config?.type !== 'boolean' && (
                          <button
                            onClick={() => handleSaveSingle(key)}
                            disabled={isSaving}
                            className="px-3 py-2 bg-red-600 hover:bg-cyan-600 text-white text-xs font-bold rounded-lg transition disabled:opacity-50"
                          >
                            {isSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Lưu'}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {filteredSettings.length === 0 && (
                <div className="text-center text-slate-500 py-12">
                  <Settings className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>Không có cài đặt trong danh mục này</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Info Card */}
      <div className="bg-neutral-900 border border-neutral-800 clip-path-rog rounded-none clip-path-rog p-4 bg-gradient-to-r from-red-600/10 to-red-600/10 border border-red-600/20">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-red-600/20 rounded-lg flex-shrink-0">
            <Shield className="w-5 h-5 text-red-500" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Mẹo sử dụng</h3>
            <ul className="text-xs text-neutral-400 mt-2 space-y-1">
              <li className="flex items-start gap-1.5">
                <span className="text-red-500">•</span>
                Toggle switches tự động lưu khi bật/tắt
              </li>
              <li className="flex items-start gap-1.5">
                <span className="text-red-500">•</span>
                Các trường text/number: thay đổi → nhấn nút "Lưu" bên cạnh
              </li>
              <li className="flex items-start gap-1.5">
                <span className="text-red-500">•</span>
                Nhấn "Lưu thay đổi" để lưu tất cả cùng lúc
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
