import React, { useState, useEffect } from 'react';
import { MapPin, ChevronDown, Loader2, AlertCircle } from 'lucide-react';
import locationService from '../services/locationService';

const ZONE_LABELS = { 1: 'Khu vực 1 - Nội thành', 2: 'Khu vực 2 - Vùng lân cận', 3: 'Khu vực 3 - Ngoại vi 10km' };
const ZONE_FEES = { 1: 15000, 2: 25000, 3: 35000 };

export default function AddressForm({
  initialValues = {},
  onSubmit,
  submitLabel = 'Lưu Địa Chỉ',
  loading = false,
  compact = false
}) {
  const [districts, setDistricts] = useState([]);
  const [wards, setWards] = useState([]);
  const [loadingLocations, setLoadingLocations] = useState(true);
  const [selectedDistrict, setSelectedDistrict] = useState(initialValues.district_id || '');
  const [selectedWard, setSelectedWard] = useState(initialValues.ward_id || '');
  const [streetAddress, setStreetAddress] = useState(initialValues.address || '');
  const [fullName, setFullName] = useState(initialValues.full_name || '');
  const [phone, setPhone] = useState(initialValues.phone || '');
  const [isDefault, setIsDefault] = useState(initialValues.is_default || false);
  const [errors, setErrors] = useState({});

  // Load districts on mount
  useEffect(() => {
    locationService.getDistricts()
      .then(res => setDistricts(res?.data?.data || res?.data || []))
      .catch(() => setDistricts([]))
      .finally(() => setLoadingLocations(false));
  }, []);

  // Load wards when district changes
  useEffect(() => {
    if (selectedDistrict) {
      locationService.getWards(selectedDistrict)
        .then(res => setWards(res?.data?.data || res?.data || []))
        .catch(() => setWards([]));
    } else {
      setWards([]);
    }
    setSelectedWard('');
  }, [selectedDistrict]);

  // Get selected district info for shipping fee display
  const selectedDistrictInfo = districts.find(d => d.id === Number(selectedDistrict));

  const validate = () => {
    const errs = {};
    if (!fullName.trim()) errs.full_name = 'Vui lòng nhập họ tên';
    if (!phone.trim()) errs.phone = 'Vui lòng nhập số điện thoại';
    else if (!/^[0-9]{10,11}$/.test(phone.trim())) errs.phone = 'SĐT không hợp lệ (10-11 số)';
    if (!streetAddress.trim()) errs.address = 'Vui lòng nhập địa chỉ (số nhà, đường)';
    if (!selectedDistrict) errs.district = 'Vui lòng chọn quận/huyện';
    if (!selectedWard) errs.ward = 'Vui lòng chọn phường/xã';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;

    const district = districts.find(d => d.id === Number(selectedDistrict));
    const ward = wards.find(w => w.id === Number(selectedWard));

    const payload = {
      full_name: fullName.trim(),
      phone: phone.trim(),
      address: streetAddress.trim(),
      district_id: Number(selectedDistrict),
      ward_id: Number(selectedWard),
      district: district?.name || '',
      ward: ward?.name || '',
      is_default: isDefault
    };

    onSubmit(payload);
  };

  const formatPrice = (p) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(p || 0);

  const fieldClass = (hasError) =>
    `w-full px-4 py-2.5 bg-black border rounded-none clip-path-rog text-sm text-slate-100 focus:outline-none transition-colors ${
      hasError ? 'border-rose-500 focus:border-rose-500' : 'border-neutral-800 focus:border-red-600'
    }`;

  const labelClass = 'block text-xs font-semibold text-neutral-400 mb-1.5';
  const errorClass = 'text-[10px] text-rose-400 mt-1';

  if (loadingLocations) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-5 h-5 animate-spin text-red-500" />
        <span className="ml-2 text-sm text-neutral-400">Đang tải khu vực giao hàng...</span>
      </div>
    );
  }

  if (districts.length === 0) {
    return (
      <div className="p-6 text-center text-sm text-neutral-400 flex items-center justify-center gap-2">
        <AlertCircle className="w-4 h-4 text-amber-400" />
        Không thể tải danh sách khu vực giao hàng. Vui lòng tải lại trang.
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className={`space-y-${compact ? '3' : '5'}`}>
      {/* Name & Phone */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>Họ và tên <span className="text-rose-400">*</span></label>
          <input
            type="text"
            value={fullName}
            onChange={e => setFullName(e.target.value)}
            placeholder="VD: Nguyễn Văn A"
            className={fieldClass(!!errors.full_name)}
          />
          {errors.full_name && <p className={errorClass}>{errors.full_name}</p>}
        </div>
        <div>
          <label className={labelClass}>Số điện thoại <span className="text-rose-400">*</span></label>
          <input
            type="tel"
            value={phone}
            onChange={e => setPhone(e.target.value)}
            placeholder="VD: 0901234567"
            className={fieldClass(!!errors.phone)}
          />
          {errors.phone && <p className={errorClass}>{errors.phone}</p>}
        </div>
      </div>

      {/* District Select */}
      <div>
        <label className={labelClass}>Quận / Huyện <span className="text-rose-400">*</span></label>
        <div className="relative">
          <select
            value={selectedDistrict}
            onChange={e => setSelectedDistrict(e.target.value)}
            className={`${fieldClass(!!errors.district)} appearance-none pr-10 cursor-pointer`}
          >
            <option value="">— Chọn Quận / Huyện —</option>
            {districts.map(d => (
              <option key={d.id} value={d.id}>
                {d.name} ({ZONE_LABELS[d.zone]} - {formatPrice(d.shipping_fee)})
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
        </div>
        {errors.district && <p className={errorClass}>{errors.district}</p>}
      </div>

      {/* Ward Select */}
      <div>
        <label className={labelClass}>Phường / Xã <span className="text-rose-400">*</span></label>
        <div className="relative">
          <select
            value={selectedWard}
            onChange={e => setSelectedWard(e.target.value)}
            disabled={!selectedDistrict}
            className={`${fieldClass(!!errors.ward)} appearance-none pr-10 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            <option value="">— Chọn Phường / Xã —</option>
            {wards.map(w => (
              <option key={w.id} value={w.id}>{w.name}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
        </div>
        {errors.ward && <p className={errorClass}>{errors.ward}</p>}
        {!selectedDistrict && (
          <p className="text-[10px] text-slate-500 mt-1">Vui lòng chọn Quận/Huyện trước</p>
        )}
      </div>

      {/* Street Address */}
      <div>
        <label className={labelClass}>Địa chỉ chi tiết <span className="text-rose-400">*</span></label>
        <input
          type="text"
          value={streetAddress}
          onChange={e => setStreetAddress(e.target.value)}
          placeholder="VD: 123 Nguyễn Huệ, Phường Vỹ Dạ"
          className={fieldClass(!!errors.address)}
        />
        {errors.address && <p className={errorClass}>{errors.address}</p>}
      </div>

      {/* Shipping fee preview */}
      {selectedDistrictInfo && (
        <div className="p-3 rounded-none clip-path-rog bg-red-600/10 border border-red-600/20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-red-500" />
            <span className="text-xs text-neutral-300">Phí giao hàng cho khu vực này:</span>
          </div>
          <span className="font-bold text-red-500">{formatPrice(selectedDistrictInfo.shipping_fee)}</span>
        </div>
      )}

      {/* Default checkbox */}
      {!compact && (
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={isDefault}
            onChange={e => setIsDefault(e.target.checked)}
            className="w-4 h-4 rounded accent-red-600"
          />
          <span className="text-sm text-neutral-300">Đặt làm địa chỉ mặc định</span>
        </label>
      )}

      {/* Delivery notice */}
      {!compact && (
        <div className="p-3 rounded-none clip-path-rog bg-amber-500/10 border border-amber-500/20">
          <p className="text-[10px] text-amber-300 flex items-start gap-1.5">
            <AlertCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
            <span>
              Hiện tại LaptopStore chỉ giao hàng trong <strong>TP. Huế và vùng ngoại vi 10km</strong>.
              Nếu địa chỉ của bạn ngoài khu vực này, vui lòng{' '}
              <a href="/contact" className="underline">liên hệ hỗ trợ</a> trước khi đặt hàng.
            </span>
          </p>
        </div>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={loading}
        className="w-full py-3 bg-red-600 text-white font-bold tracking-widest uppercase font-bold rounded-none clip-path-rog hover:bg-red-500 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <MapPin className="w-4 h-4" />}
        {loading ? 'Đang lưu...' : submitLabel}
      </button>
    </form>
  );
}
