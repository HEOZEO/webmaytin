import React, { useEffect, useState, useMemo } from 'react';
import {
  Lock, Unlock, Search, Loader2, ShieldCheck, ChevronLeft, ChevronRight,
  UserPlus, Trash2, X, Mail, User, Phone, Calendar, Activity, Users as UsersIcon,
  Crown, ShieldAlert, KeyRound, Save, RotateCcw,
  Filter, RefreshCw, CheckCircle2, XCircle, BadgeCheck, Settings,
  Package, Boxes, ShoppingCart, TrendingUp
} from 'lucide-react';
import showToast from '../../utils/toast';
import { adminUserService } from '../../services/adminService';
import { useAuth } from '../../context/AuthContext';
import { Can, usePermission } from '../../hooks/usePermission';

const EMPTY_USER_FORM = {
  email: '',
  password: '',
  full_name: '',
  phone: '',
  address: '',
  role: 'customer'
};

const ROLE_STYLES = {
  admin: {
    bg: 'bg-gradient-to-br from-rose-500/20 to-pink-500/10',
    border: 'border-rose-500/40',
    text: 'text-rose-300',
    icon: Crown,
    label: 'Quản trị viên',
    shortLabel: 'Admin'
  },
  staff: {
    bg: 'bg-gradient-to-br from-amber-500/20 to-orange-500/10',
    border: 'border-amber-500/40',
    text: 'text-amber-300',
    icon: ShieldCheck,
    label: 'Nhân viên',
    shortLabel: 'Staff'
  },
  customer: {
    bg: 'bg-gradient-to-br from-cyan-500/20 to-blue-500/10',
    border: 'border-cyan-500/40',
    text: 'text-cyan-300',
    icon: User,
    label: 'Khách hàng',
    shortLabel: 'Customer'
  }
};

export default function AdminUsers() {
  const { user: currentUser } = useAuth();
  const isAdmin = currentUser?.role === 'admin';
  const isStaff = currentUser?.role === 'staff';
  const { hasPermission } = usePermission();
  // Phân quyền chi tiết:
  // - Đổi role: chỉ admin (vì đây là action nhạy cảm)
  // - Xoá user: chỉ admin
  // - Khoá/mở khoá customer: admin + staff (nếu staff có users.lock_customer)
  // - Tạo user: admin mặc định, staff có thêm customer nếu cần
  const canChangeRole = isAdmin;
  const canDelete = isAdmin;
  const canToggleStatus = isAdmin || hasPermission('users.lock_customer');
  const canCreate = isAdmin;

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState(''); // '', 'active', 'locked'
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [pagination, setPagination] = useState({ currentPage: 1, totalPages: 1, totalItems: 0 });
  const [busyId, setBusyId] = useState(null);
  const [stats, setStats] = useState({ total_users: 0, total_customers: 0, active_users: 0, inactive_users: 0 });
  const [view, setView] = useState('card'); // 'card' | 'table'

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [userForm, setUserForm] = useState(EMPTY_USER_FORM);
  const [creating, setCreating] = useState(false);

  // Detail modal
  const [selectedUser, setSelectedUser] = useState(null);

  // Permissions modal
  const [permissionsModalUser, setPermissionsModalUser] = useState(null);
  const [permissionsData, setPermissionsData] = useState(null);
  const [permissionsLoading, setPermissionsLoading] = useState(false);
  const [permissionsSaving, setPermissionsSaving] = useState(false);

  useEffect(() => {
    loadUsers();
    loadStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, limit, roleFilter, statusFilter]);

  useEffect(() => {
    const t = setTimeout(() => {
      setPage(1);
      loadUsers();
    }, 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const res = await adminUserService.getAll({
        page,
        limit,
        role: roleFilter || undefined,
        search: search || undefined
      });
      let items = res?.data || [];
      // Filter by status client-side (server doesn't have this param)
      if (statusFilter === 'active') items = items.filter(u => u.is_active !== false);
      if (statusFilter === 'locked') items = items.filter(u => u.is_active === false);
      setUsers(items);
      if (res?.pagination) setPagination(res.pagination);
    } catch (err) {
      showToast.error('Không thể tải danh sách người dùng');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const res = await adminUserService.getStats();
      if (res?.data) setStats(res.data);
    } catch {}
  };

  const toggleStatus = async (id) => {
    if (currentUser?.id === id) {
      showToast.error('Không thể khóa tài khoản của chính mình');
      return;
    }
    setBusyId(id);
    try {
      await adminUserService.toggleStatus(id);
      showToast.success('Đã cập nhật trạng thái tài khoản');
      loadUsers();
      loadStats();
    } catch (err) {
      showToast.error(err?.data?.message || err?.message || 'Cập nhật thất bại');
    } finally {
      setBusyId(null);
    }
  };

  const changeRole = async (id, role) => {
    if (!canChangeRole) {
      showToast.error('Chỉ quản trị viên mới có quyền thay đổi vai trò');
      return;
    }
    if (currentUser?.id === id) {
      showToast.error('Không thể đổi vai trò của chính mình');
      return;
    }
    setBusyId(id);
    try {
      await adminUserService.updateRole(id, role);
      showToast.success('Đã cập nhật vai trò');
      loadUsers();
    } catch (err) {
      showToast.error(err?.data?.message || err?.message || 'Cập nhật vai trò thất bại');
    } finally {
      setBusyId(null);
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    if (!userForm.email || !userForm.password || !userForm.full_name) {
      showToast.error('Vui lòng điền các trường bắt buộc (Email, Mật khẩu, Họ tên)');
      return;
    }
    // Staff chỉ tạo customer
    if (isStaff && userForm.role !== 'customer') {
      showToast.error('Nhân viên chỉ được tạo tài khoản khách hàng');
      return;
    }
    setCreating(true);
    try {
      await adminUserService.create(userForm);
      showToast.success('Tạo tài khoản mới thành công');
      setShowAddModal(false);
      setUserForm(EMPTY_USER_FORM);
      loadUsers();
      loadStats();
    } catch (err) {
      showToast.error(err?.data?.message || err?.message || 'Tạo người dùng thất bại');
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteUser = async (id, name) => {
    if (!canDelete) {
      showToast.error('Chỉ quản trị viên mới có quyền xoá tài khoản');
      return;
    }
    if (currentUser?.id === id) {
      showToast.error('Không thể xóa tài khoản của chính mình');
      return;
    }
    if (!window.confirm(`Bạn có chắc chắn muốn xóa tài khoản "${name || 'người dùng'}"?`)) return;

    setBusyId(id);
    try {
      await adminUserService.delete(id);
      showToast.success('Đã xóa người dùng');
      loadUsers();
      loadStats();
    } catch (err) {
      showToast.error(err?.data?.message || err?.message || 'Xóa tài khoản thất bại');
    } finally {
      setBusyId(null);
    }
  };

  // ===== Permissions handlers =====
  const openPermissionsModal = async (user) => {
    if (user.id === currentUser?.id) {
      showToast.error('Không thể thay đổi quyền của chính bạn');
      return;
    }
    if (user.role !== 'staff') {
      showToast.error('Chỉ có thể cấu hình quyền cho nhân viên');
      return;
    }
    setPermissionsModalUser(user);
    setPermissionsLoading(true);
    try {
      const res = await adminUserService.getPermissions(user.id);
      console.log('[Permissions] getPermissions response:', res);
      // res có thể là { success, data: {...} } (sau unwrap) hoặc { data: {...} }
      const data = res?.data?.data || res?.data || res;
      setPermissionsData(data);
    } catch (err) {
      console.error('[Permissions] getPermissions error:', err);
      showToast.error(err?.response?.data?.message || err?.message || 'Không thể tải quyền');
      setPermissionsModalUser(null);
    } finally {
      setPermissionsLoading(false);
    }
  };

  const closePermissionsModal = () => {
    setPermissionsModalUser(null);
    setPermissionsData(null);
  };

  // Set permission theo dotted key, VD: updatePermission('products.view', true)
  // → permissions.products.view = true
  const updatePermission = (key, value) => {
    setPermissionsData((prev) => {
      const perms = prev?.permissions || {};
      const parts = key.split('.');
      const next = JSON.parse(JSON.stringify(perms));
      let cur = next;
      for (let i = 0; i < parts.length - 1; i++) {
        if (cur[parts[i]] === undefined || cur[parts[i]] === null || typeof cur[parts[i]] !== 'object') {
          cur[parts[i]] = {};
        }
        cur = cur[parts[i]];
      }
      cur[parts[parts.length - 1]] = value;
      return { ...(prev || {}), permissions: next };
    });
  };

  const resetPermissionsToDefault = async () => {
    try {
      const res = await adminUserService.getDefaultPermissions();
      // res.data có thể là { success, data: {...} } hoặc trực tiếp object tuỳ interceptor
      const defaults = res?.data?.data || res?.data || {};
      setPermissionsData((prev) => ({
        ...(prev || {}),
        permissions: defaults
      }));
      showToast.success('Đã khôi phục quyền mặc định');
    } catch (err) {
      showToast.error('Không thể tải quyền mặc định');
    }
  };

  const savePermissions = async () => {
    if (!permissionsData || !permissionsModalUser) return;
    setPermissionsSaving(true);
    try {
      console.log('[Permissions] Saving:', permissionsModalUser.id, permissionsData.permissions);
      const res = await adminUserService.updatePermissions(permissionsModalUser.id, permissionsData.permissions);
      console.log('[Permissions] Save response:', res);
      showToast.success(res?.message || 'Đã cập nhật quyền cho nhân viên');
      // Cập nhật lại trong list
      setUsers((prev) =>
        prev.map((u) => (u.id === permissionsModalUser.id ? { ...u, permissions: permissionsData.permissions } : u))
      );
      closePermissionsModal();
    } catch (err) {
      console.error('[Permissions] Save error:', err);
      showToast.error(err?.response?.data?.message || err?.message || 'Cập nhật quyền thất bại');
    } finally {
      setPermissionsSaving(false);
    }
  };

  const roleOptions = useMemo(() => {
    if (isAdmin) {
      return [
        { value: '', label: 'Tất cả vai trò' },
        { value: 'customer', label: 'Khách hàng' },
        { value: 'staff', label: 'Nhân viên' },
        { value: 'admin', label: 'Quản trị viên' }
      ];
    }
    return [
      { value: '', label: 'Tất cả khách hàng' },
      { value: 'customer', label: 'Khách hàng' }
    ];
  }, [isAdmin]);

  return (
    <div className="space-y-6">
      {/* ===== HEADER ===== */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
              <UsersIcon className="w-5 h-5 text-white" />
            </div>
            Khách Hàng & Tài Khoản
          </h1>
          <p className="text-slate-400 text-sm mt-1.5 ml-[50px]">
            {pagination.totalItems || users.length} người dùng
            {isStaff && (
              <span className="ml-2 text-amber-300/80 text-xs inline-flex items-center gap-1">
                <ShieldAlert className="w-3 h-3" />
                Chế độ nhân viên — chỉ khoá/mở tài khoản khách hàng
              </span>
            )}
          </p>
        </div>
        {canCreate && (
          <button
            onClick={() => { setUserForm(EMPTY_USER_FORM); setShowAddModal(true); }}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-gradient-to-r from-cyan-400 to-blue-500 text-slate-950 font-bold rounded-xl text-xs hover:opacity-90 transition shadow-lg shadow-cyan-500/20"
          >
            <UserPlus className="w-4 h-4" /> Thêm Người Dùng
          </button>
        )}
      </div>

      {/* ===== STATS CARDS ===== */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          icon={UsersIcon}
          label="Tổng người dùng"
          value={stats.total_users}
          color="cyan"
          loading={loading}
        />
        <StatCard
          icon={User}
          label="Khách hàng"
          value={stats.total_customers}
          color="blue"
          loading={loading}
        />
        <StatCard
          icon={CheckCircle2}
          label="Đang hoạt động"
          value={stats.active_users}
          color="emerald"
          loading={loading}
        />
        <StatCard
          icon={XCircle}
          label="Bị khoá"
          value={stats.inactive_users}
          color="rose"
          loading={loading}
          highlight={stats.inactive_users > 0}
        />
      </div>

      {/* ===== FILTER BAR ===== */}
      <div className="glass-card rounded-2xl p-3 flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
          <input
            type="text"
            placeholder="Tìm username, email, tên..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-cyan-500 transition"
          />
        </div>

        <div className="relative">
          <Filter className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="pl-8 pr-3 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-200 focus:border-cyan-500 appearance-none cursor-pointer"
          >
            {roleOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>

        <div className="relative">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-200 focus:border-cyan-500 appearance-none cursor-pointer pr-8"
          >
            <option value="">Tất cả trạng thái</option>
            <option value="active">Đang hoạt động</option>
            <option value="locked">Bị khoá</option>
          </select>
        </div>

        <select
          value={limit}
          onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }}
          className="px-3 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-200 focus:border-cyan-500 appearance-none cursor-pointer"
        >
          <option value="10">10 / trang</option>
          <option value="20">20 / trang</option>
          <option value="50">50 / trang</option>
        </select>

        <div className="flex items-center gap-1 ml-auto bg-slate-900 border border-slate-800 rounded-xl p-1">
          <button
            onClick={() => setView('card')}
            className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition ${
              view === 'card' ? 'bg-cyan-500 text-slate-950' : 'text-slate-400 hover:text-cyan-300'
            }`}
            title="Card view"
          >
            <span className="inline-flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-sm bg-current" />
              <span className="w-1.5 h-1.5 rounded-sm bg-current" />
              CARDS
            </span>
          </button>
          <button
            onClick={() => setView('table')}
            className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition ${
              view === 'table' ? 'bg-cyan-500 text-slate-950' : 'text-slate-400 hover:text-cyan-300'
            }`}
            title="Table view"
          >
            TABLE
          </button>
        </div>

        <button
          onClick={() => { loadUsers(); loadStats(); }}
          disabled={loading}
          className="p-2.5 bg-slate-900 border border-slate-800 rounded-xl text-slate-400 hover:text-cyan-300 hover:border-cyan-500/50 transition disabled:opacity-50"
          title="Làm mới"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* ===== USERS LIST ===== */}
      {loading ? (
        <div className="glass-card rounded-2xl p-12 text-center">
          <Loader2 className="w-6 h-6 animate-spin mx-auto text-cyan-400" />
          <p className="text-slate-500 text-xs mt-2">Đang tải...</p>
        </div>
      ) : users.length === 0 ? (
        <div className="glass-card rounded-2xl p-12 text-center">
          <UsersIcon className="w-10 h-10 text-slate-700 mx-auto" />
          <p className="text-slate-500 text-sm mt-3">Không có người dùng nào</p>
        </div>
      ) : view === 'card' ? (
        <UserCards
          users={users}
          currentUser={currentUser}
          canChangeRole={canChangeRole}
          canDelete={canDelete}
          canToggleStatus={canToggleStatus}
          isAdmin={isAdmin}
          isStaff={isStaff}
          busyId={busyId}
          onToggleStatus={toggleStatus}
          onChangeRole={changeRole}
          onDelete={handleDeleteUser}
          onSelect={setSelectedUser}
        />
      ) : (
        <UserTable
          users={users}
          currentUser={currentUser}
          canChangeRole={canChangeRole}
          canDelete={canDelete}
          canToggleStatus={canToggleStatus}
          isAdmin={isAdmin}
          isStaff={isStaff}
          busyId={busyId}
          onToggleStatus={toggleStatus}
          onChangeRole={changeRole}
          onDelete={handleDeleteUser}
          onSelect={setSelectedUser}
        />
      )}

      {/* ===== PAGINATION ===== */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
        <div>
          Trang <span className="text-cyan-300 font-bold">{pagination.currentPage || page}</span> / {pagination.totalPages || 1}
          <span className="ml-2 text-slate-500">({pagination.totalItems || users.length} người dùng)</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg disabled:opacity-40 hover:border-cyan-500 hover:text-cyan-300 flex items-center gap-1 transition"
          >
            <ChevronLeft className="w-3.5 h-3.5" /> Trước
          </button>
          <span className="px-2 text-[10px] text-slate-500 hidden sm:inline">
            {(page - 1) * limit + 1} - {Math.min(page * limit, pagination.totalItems || users.length)}
          </span>
          <button
            onClick={() => setPage(p => Math.min(pagination.totalPages || 1, p + 1))}
            disabled={page >= (pagination.totalPages || 1)}
            className="px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg disabled:opacity-40 hover:border-cyan-500 hover:text-cyan-300 flex items-center gap-1 transition"
          >
            Sau <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* ===== DETAIL MODAL ===== */}
      {selectedUser && (
        <UserDetailModal
          user={selectedUser}
          onClose={() => setSelectedUser(null)}
          currentUser={currentUser}
          canToggleStatus={canToggleStatus && currentUser?.id !== selectedUser.id}
          canChangeRole={canChangeRole && currentUser?.id !== selectedUser.id}
          canDelete={canDelete && currentUser?.id !== selectedUser.id}
          busy={busyId === selectedUser.id}
          onToggleStatus={async () => {
            await toggleStatus(selectedUser.id);
            const updated = users.find(u => u.id === selectedUser.id);
            if (updated) setSelectedUser({ ...selectedUser, is_active: !updated.is_active });
          }}
          onChangeRole={async (newRole) => {
            await changeRole(selectedUser.id, newRole);
            setSelectedUser({ ...selectedUser, role: newRole });
          }}
          onDelete={async () => {
            await handleDeleteUser(selectedUser.id, selectedUser.full_name || selectedUser.email);
            setSelectedUser(null);
          }}
          onOpenPermissions={() => openPermissionsModal(selectedUser)}
        />
      )}

      {/* ===== ADD USER MODAL ===== */}
      {showAddModal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="glass-card p-6 rounded-3xl w-full max-w-md space-y-4 border border-cyan-500/30 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
                  <UserPlus className="w-4 h-4 text-white" />
                </div>
                Thêm Người Dùng Mới
              </h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-3">
              <div>
                <label className="text-[10px] uppercase text-slate-400 font-bold block mb-1">Họ và Tên *</label>
                <input
                  required type="text" placeholder="Nguyễn Văn A"
                  value={userForm.full_name}
                  onChange={(e) => setUserForm({...userForm, full_name: e.target.value})}
                  className="w-full px-3 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-100 focus:border-cyan-500 outline-none transition"
                />
              </div>
              <div>
                <label className="text-[10px] uppercase text-slate-400 font-bold block mb-1">Email *</label>
                <input
                  required type="email" placeholder="user@gmail.com"
                  value={userForm.email}
                  onChange={(e) => setUserForm({...userForm, email: e.target.value})}
                  className="w-full px-3 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-100 focus:border-cyan-500 outline-none transition"
                />
              </div>
              <div>
                <label className="text-[10px] uppercase text-slate-400 font-bold block mb-1">Mật Khẩu *</label>
                <input
                  required type="password" placeholder="••••••••"
                  value={userForm.password}
                  onChange={(e) => setUserForm({...userForm, password: e.target.value})}
                  className="w-full px-3 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-100 focus:border-cyan-500 outline-none transition"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] uppercase text-slate-400 font-bold block mb-1">Số Điện Thoại</label>
                  <input
                    type="text" placeholder="0987654321"
                    value={userForm.phone}
                    onChange={(e) => setUserForm({...userForm, phone: e.target.value})}
                    className="w-full px-3 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-100 outline-none focus:border-cyan-500 transition"
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase text-slate-400 font-bold block mb-1">Vai Trò</label>
                  <select
                    value={userForm.role}
                    onChange={(e) => setUserForm({...userForm, role: e.target.value})}
                    className="w-full px-3 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-100 outline-none focus:border-cyan-500 transition"
                  >
                    <option value="customer">Khách hàng</option>
                    {isAdmin && <option value="staff">Nhân viên</option>}
                    {isAdmin && <option value="admin">Quản trị viên</option>}
                  </select>
                  {isStaff && (
                    <p className="text-[10px] text-amber-300/80 mt-1 flex items-center gap-1">
                      <ShieldAlert className="w-3 h-3" />
                      Nhân viên chỉ tạo tài khoản khách
                    </p>
                  )}
                </div>
              </div>
              <div>
                <label className="text-[10px] uppercase text-slate-400 font-bold block mb-1">Địa Chỉ</label>
                <input
                  type="text" placeholder="Hà Nội, Việt Nam"
                  value={userForm.address}
                  onChange={(e) => setUserForm({...userForm, address: e.target.value})}
                  className="w-full px-3 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-100 outline-none focus:border-cyan-500 transition"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 font-semibold rounded-xl text-xs hover:bg-slate-700 transition"
                >
                  Huỷ
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-5 py-2 bg-gradient-to-r from-cyan-400 to-blue-500 text-slate-950 font-bold rounded-xl text-xs hover:opacity-90 disabled:opacity-50 flex items-center gap-2 transition"
                >
                  {creating && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Tạo Tài Khoản
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===== PERMISSIONS MODAL ===== */}
      {permissionsModalUser && (
        <PermissionsModal
          user={permissionsModalUser}
          data={permissionsData}
          loading={permissionsLoading}
          saving={permissionsSaving}
          onClose={closePermissionsModal}
          onToggle={(key, value) => updatePermission(key, value)}
          onReset={resetPermissionsToDefault}
          onSave={savePermissions}
        />
      )}
    </div>
  );
}

/* ============== Stat Card Component ============== */
function StatCard({ icon: Icon, label, value, color, loading, highlight }) {
  const colors = {
    cyan: 'from-cyan-500/20 to-blue-500/10 border-cyan-500/30 text-cyan-300',
    blue: 'from-blue-500/20 to-indigo-500/10 border-blue-500/30 text-blue-300',
    emerald: 'from-emerald-500/20 to-teal-500/10 border-emerald-500/30 text-emerald-300',
    rose: 'from-rose-500/20 to-pink-500/10 border-rose-500/30 text-rose-300'
  };
  return (
    <div className={`glass-card rounded-2xl p-4 border bg-gradient-to-br ${colors[color]} ${highlight ? 'ring-1 ring-rose-500/30' : ''}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">{label}</p>
          <p className="text-2xl font-black text-white mt-1.5">
            {loading ? <Loader2 className="w-5 h-5 animate-spin text-slate-500" /> : (value ?? 0)}
          </p>
        </div>
        <div className={`w-9 h-9 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-center ${colors[color].split(' ').pop()}`}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
    </div>
  );
}

/* ============== User Card Grid ============== */
function UserCards({ users, currentUser, canChangeRole, canDelete, canToggleStatus, isAdmin, isStaff, busyId, onToggleStatus, onChangeRole, onDelete, onSelect }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
      {users.map(u => {
        const role = ROLE_STYLES[u.role] || ROLE_STYLES.customer;
        const isSelf = currentUser?.id === u.id;
        const locked = u.is_active === false;
        const RoleIcon = role.icon;
        return (
          <div
            key={u.id}
            className={`glass-card rounded-2xl p-4 space-y-3 border ${role.border} hover:border-cyan-400/50 transition-all group relative overflow-hidden ${locked ? 'opacity-75' : ''}`}
          >
            {/* Locked overlay */}
            {locked && (
              <div className="absolute top-2 right-2 z-10">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-500/20 border border-rose-500/40 text-rose-300 text-[9px] font-bold uppercase">
                  <Lock className="w-2.5 h-2.5" /> Khoá
                </span>
              </div>
            )}

            {/* Header */}
            <div className="flex items-start gap-3">
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${role.bg} border ${role.border} flex items-center justify-center font-black text-base ${role.text} flex-shrink-0`}>
                {(u.full_name || u.email || 'U')?.[0]?.toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-bold text-white truncate" title={u.full_name}>
                  {u.full_name || u.email}
                </h4>
                <p className="text-[10px] text-slate-500 font-mono truncate">
                  @{u.username || (u.email ? u.email.split('@')[0] : 'user')}
                </p>
              </div>
            </div>

            {/* Contact info */}
            <div className="space-y-1.5 text-[11px]">
              <div className="flex items-center gap-1.5 text-slate-400">
                <Mail className="w-3 h-3 flex-shrink-0" />
                <span className="truncate">{u.email}</span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-400">
                <Phone className="w-3 h-3 flex-shrink-0" />
                <span className="truncate">{u.phone || 'Chưa cập nhật'}</span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-500">
                <Calendar className="w-3 h-3 flex-shrink-0" />
                <span>{u.created_at ? new Date(u.created_at).toLocaleDateString('vi-VN') : '—'}</span>
              </div>
            </div>

            {/* Role + status badges */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md ${role.bg} ${role.text} border ${role.border}`}>
                <RoleIcon className="w-3 h-3" />
                {role.shortLabel}
              </span>
              {locked ? (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
                  <XCircle className="w-2.5 h-2.5" /> Bị khoá
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  <BadgeCheck className="w-2.5 h-2.5" /> Hoạt động
                </span>
              )}
              {isSelf && (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  Bạn
                </span>
              )}
            </div>

            {/* Actions */}
            <div className="pt-2 border-t border-slate-800/60 flex items-center gap-1.5">
              <button
                onClick={() => onSelect(u)}
                className="flex-1 py-1.5 bg-slate-800/50 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-[10px] font-bold transition"
              >
                Chi tiết
              </button>
              {!isSelf && canToggleStatus && (
                <button
                  onClick={() => onToggleStatus(u.id)}
                  disabled={busyId === u.id}
                  title={!locked ? 'Khóa tài khoản' : 'Mở khóa'}
                  className={`p-1.5 rounded-lg transition disabled:opacity-50 ${
                    !locked
                      ? 'bg-amber-900/30 border border-amber-800/60 text-amber-300 hover:bg-amber-800/40'
                      : 'bg-emerald-900/30 border border-emerald-800/60 text-emerald-300 hover:bg-emerald-800/40'
                  }`}
                >
                  {!locked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                </button>
              )}
              {!isSelf && canDelete && (
                <button
                  onClick={() => onDelete(u.id, u.full_name || u.email)}
                  disabled={busyId === u.id}
                  title="Xóa tài khoản"
                  className="p-1.5 bg-slate-800/50 hover:bg-rose-500/20 text-rose-400 rounded-lg transition disabled:opacity-50"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ============== User Table (alternate view) ============== */
function UserTable({ users, currentUser, canChangeRole, canDelete, canToggleStatus, isAdmin, isStaff, busyId, onToggleStatus, onChangeRole, onDelete, onSelect }) {
  return (
    <div className="glass-card rounded-2xl p-4 overflow-x-auto">
      <table className="w-full text-left text-sm text-slate-300">
        <thead className="text-xs uppercase text-slate-400 border-b border-slate-800">
          <tr>
            <th className="py-3 px-4">Người Dùng</th>
            <th className="py-3 px-4">Email</th>
            <th className="py-3 px-4">SĐT</th>
            <th className="py-3 px-4">Vai Trò</th>
            <th className="py-3 px-4">Trạng Thái</th>
            <th className="py-3 px-4">Ngày Tham Gia</th>
            <th className="py-3 px-4 text-right">Thao Tác</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800/60">
          {users.map(u => {
            const isSelf = currentUser?.id === u.id;
            const role = ROLE_STYLES[u.role] || ROLE_STYLES.customer;
            const RoleIcon = role.icon;
            const locked = u.is_active === false;
            return (
              <tr key={u.id} className="hover:bg-slate-900/40 transition">
                <td className="py-3 px-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${role.bg} border ${role.border} flex items-center justify-center font-bold text-xs ${role.text}`}>
                      {(u.full_name || u.email)?.[0]?.toUpperCase()}
                    </div>
                    <div>
                      <div className="font-semibold text-white">{u.full_name || u.email}</div>
                      <div className="text-[10px] text-slate-500 font-mono">@{u.username || (u.email ? u.email.split('@')[0] : '')}</div>
                    </div>
                  </div>
                </td>
                <td className="py-3 px-4 text-slate-400 text-xs">{u.email}</td>
                <td className="py-3 px-4 text-slate-400 text-xs">{u.phone || '—'}</td>
                <td className="py-3 px-4">
                  {canChangeRole && !isSelf ? (
                    <select
                      value={u.role}
                      disabled={busyId === u.id}
                      onChange={(e) => onChangeRole(u.id, e.target.value)}
                      className={`text-[10px] font-bold px-2 py-1 rounded-md border-0 outline-none cursor-pointer bg-slate-900 ${role.text}`}
                    >
                      <option value="customer">customer</option>
                      <option value="staff">staff</option>
                      <option value="admin">admin</option>
                    </select>
                  ) : (
                    <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md ${role.bg} ${role.text} border ${role.border}`}>
                      <RoleIcon className="w-3 h-3" />
                      {u.role}
                    </span>
                  )}
                </td>
                <td className="py-3 px-4">
                  {locked ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
                      <Lock className="w-2.5 h-2.5" /> Bị khoá
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      <BadgeCheck className="w-2.5 h-2.5" /> Hoạt động
                    </span>
                  )}
                </td>
                <td className="py-3 px-4 text-xs text-slate-400">{u.created_at ? new Date(u.created_at).toLocaleDateString('vi-VN') : '—'}</td>
                <td className="py-3 px-4 text-right">
                  <div className="flex items-center justify-end gap-1.5">
                    <button
                      onClick={() => onSelect(u)}
                      className="px-2.5 py-1.5 bg-slate-800/50 hover:bg-cyan-500/20 text-cyan-300 rounded-lg text-xs font-semibold transition"
                    >
                      Chi tiết
                    </button>
                    {!isSelf && canToggleStatus && (
                      <button
                        onClick={() => onToggleStatus(u.id)}
                        disabled={busyId === u.id}
                        title={!locked ? 'Khóa tài khoản' : 'Mở khóa'}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 disabled:opacity-50 transition ${
                          !locked
                            ? 'bg-amber-900/30 border border-amber-800/60 text-amber-300 hover:bg-amber-800/40'
                            : 'bg-emerald-900/30 border border-emerald-800/60 text-emerald-300 hover:bg-emerald-800/40'
                        }`}
                      >
                        {!locked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                      </button>
                    )}
                    {!isSelf && canDelete && (
                      <button
                        onClick={() => onDelete(u.id, u.full_name || u.email)}
                        disabled={busyId === u.id}
                        title="Xóa tài khoản"
                        className="p-1.5 bg-slate-800/50 hover:bg-rose-500/20 text-rose-400 rounded-lg transition disabled:opacity-50"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/* ============== User Detail Modal ============== */
function UserDetailModal({ user, onClose, currentUser, canToggleStatus, canChangeRole, canDelete, busy, onToggleStatus, onChangeRole, onDelete, onOpenPermissions }) {
  const role = ROLE_STYLES[user.role] || ROLE_STYLES.customer;
  const RoleIcon = role.icon;
  const locked = user.is_active === false;
  const canManagePermissions = currentUser?.role === 'admin' && user.role === 'staff' && currentUser?.id !== user.id;
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="glass-card rounded-3xl w-full max-w-lg border border-slate-700 overflow-hidden max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className={`p-5 border-b border-slate-800 bg-gradient-to-br ${role.bg}`}>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${role.bg} border ${role.border} flex items-center justify-center font-black text-lg ${role.text}`}>
                {(user.full_name || user.email)?.[0]?.toUpperCase()}
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">{user.full_name || user.email}</h3>
                <p className="text-xs text-slate-400 font-mono">@{user.username || user.email?.split('@')[0]}</p>
                <div className="flex items-center gap-1.5 mt-1.5">
                  <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md ${role.bg} ${role.text} border ${role.border}`}>
                    <RoleIcon className="w-3 h-3" />
                    {role.label}
                  </span>
                  {locked ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
                      <Lock className="w-2.5 h-2.5" /> Bị khoá
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      <BadgeCheck className="w-2.5 h-2.5" /> Đang hoạt động
                    </span>
                  )}
                </div>
              </div>
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-white transition">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <InfoBlock icon={Mail} label="Email" value={user.email} />
            <InfoBlock icon={Phone} label="Số điện thoại" value={user.phone || 'Chưa cập nhật'} />
            <InfoBlock icon={Calendar} label="Ngày tham gia" value={user.created_at ? new Date(user.created_at).toLocaleDateString('vi-VN') : '—'} />
            <InfoBlock icon={Activity} label="Đăng nhập cuối" value={user.last_login ? new Date(user.last_login).toLocaleString('vi-VN') : 'Chưa rõ'} />
          </div>

          {user.address && (
            <div>
              <p className="text-[10px] uppercase text-slate-500 font-bold tracking-wider mb-1">Địa chỉ</p>
              <p className="text-xs text-slate-300 bg-slate-900/60 border border-slate-800 rounded-xl p-2.5">
                {user.address}
              </p>
            </div>
          )}

          {currentUser?.id === user.id && (
            <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-cyan-300 flex-shrink-0" />
              <p className="text-xs text-cyan-300">Đây là tài khoản của bạn. Bạn không thể tự khoá hay xoá chính mình.</p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="p-4 border-t border-slate-800 flex flex-wrap items-center gap-2">
          {canChangeRole && currentUser?.id !== user.id && (
            <select
              value={user.role}
              disabled={busy}
              onChange={(e) => onChangeRole(e.target.value)}
              className="px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-200 focus:border-cyan-500 outline-none"
            >
              <option value="customer">Khách hàng</option>
              <option value="staff">Nhân viên</option>
              <option value="admin">Quản trị viên</option>
            </select>
          )}

          {canToggleStatus && (
            <button
              onClick={onToggleStatus}
              disabled={busy}
              className={`flex-1 min-w-[120px] py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 disabled:opacity-50 transition ${
                !locked
                  ? 'bg-amber-900/30 border border-amber-700/60 text-amber-300 hover:bg-amber-800/40'
                  : 'bg-emerald-900/30 border border-emerald-700/60 text-emerald-300 hover:bg-emerald-800/40'
              }`}
            >
              {!locked ? <><Lock className="w-3.5 h-3.5" /> Khoá tài khoản</> : <><Unlock className="w-3.5 h-3.5" /> Mở khoá</>}
            </button>
          )}

          {canDelete && (
            <button
              onClick={onDelete}
              disabled={busy}
              className="py-2 px-4 rounded-xl text-xs font-bold flex items-center gap-1.5 bg-rose-900/30 border border-rose-700/60 text-rose-300 hover:bg-rose-800/40 disabled:opacity-50 transition"
            >
              <Trash2 className="w-3.5 h-3.5" /> Xoá
            </button>
          )}

          {canManagePermissions && onOpenPermissions && (
            <button
              onClick={onOpenPermissions}
              disabled={busy}
              className="py-2 px-4 rounded-xl text-xs font-bold flex items-center gap-1.5 bg-gradient-to-r from-amber-500/30 to-orange-500/30 border border-amber-500/50 text-amber-200 hover:from-amber-500/40 hover:to-orange-500/40 disabled:opacity-50 transition"
            >
              <KeyRound className="w-3.5 h-3.5" /> Phân quyền
            </button>
          )}

          <button
            onClick={onClose}
            className="ml-auto py-2 px-4 rounded-xl text-xs font-bold bg-slate-800 text-slate-300 hover:bg-slate-700 transition"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}

function InfoBlock({ icon: Icon, label, value }) {
  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3">
      <div className="flex items-center gap-1.5 text-[10px] uppercase text-slate-500 font-bold tracking-wider">
        <Icon className="w-3 h-3" />
        {label}
      </div>
      <p className="text-xs text-slate-200 mt-1 font-medium break-all">{value}</p>
    </div>
  );
}

/* ============== Permissions Modal ============== */
const PERMISSION_GROUPS = [
  {
    key: 'dashboard',
    title: 'Tổng quan (Dashboard)',
    icon: Activity,
    color: 'cyan',
    description: 'Xem trang tổng quan hệ thống',
    items: [{ key: 'dashboard', label: 'Xem dashboard' }]
  },
  {
    key: 'products',
    title: 'Sản phẩm',
    icon: Package,
    color: 'amber',
    description: 'Quản lý sản phẩm trong cửa hàng',
    items: [
      { key: 'products.view', label: 'Xem danh sách sản phẩm' },
      { key: 'products.create', label: 'Thêm sản phẩm mới' },
      { key: 'products.update', label: 'Sửa thông tin sản phẩm' },
      { key: 'products.bulk_stock', label: 'Cập nhật tồn kho hàng loạt' },
      { key: 'products.delete', label: 'Xoá sản phẩm', sensitive: true }
    ]
  },
  {
    key: 'inventory',
    title: 'Tồn kho',
    icon: Boxes,
    color: 'emerald',
    description: 'Quản lý tồn kho và lịch sử nhập/xuất',
    items: [
      { key: 'inventory.view', label: 'Xem tồn kho + lịch sử' },
      { key: 'inventory.update', label: 'Thay đổi số lượng tồn kho' }
    ]
  },
  {
    key: 'orders',
    title: 'Đơn hàng',
    icon: ShoppingCart,
    color: 'orange',
    description: 'Quản lý đơn đặt hàng',
    items: [
      { key: 'orders.view', label: 'Xem danh sách đơn' },
      { key: 'orders.create', label: 'Tạo đơn mới' },
      { key: 'orders.update_status', label: 'Xác nhận / Cập nhật trạng thái đơn' },
      { key: 'orders.cancel', label: 'Huỷ đơn' },
      { key: 'orders.delete', label: 'Xoá đơn', sensitive: true },
      { key: 'orders.export', label: 'Xuất Excel đơn hàng', sensitive: true }
    ]
  },
  {
    key: 'users',
    title: 'Khách hàng',
    icon: UsersIcon,
    color: 'pink',
    description: 'Quản lý người dùng trong hệ thống',
    items: [
      { key: 'users.view', label: 'Xem danh sách người dùng' },
      { key: 'users.lock_customer', label: 'Khoá / mở khoá khách hàng' }
    ]
  },
  {
    key: 'analytics',
    title: 'Phân tích kinh doanh',
    icon: TrendingUp,
    color: 'purple',
    description: 'Xem thống kê, doanh thu',
    items: [{ key: 'analytics.view', label: 'Xem trang phân tích' }]
  },
  {
    key: 'contacts',
    title: 'Liên hệ',
    icon: Mail,
    color: 'blue',
    description: 'Quản lý tin nhắn liên hệ từ khách',
    items: [
      { key: 'contacts.view', label: 'Xem tin nhắn' },
      { key: 'contacts.reply', label: 'Trả lời tin nhắn' },
      { key: 'contacts.delete', label: 'Xoá tin nhắn', sensitive: true }
    ]
  }
];

// Wrapper đọc giá trị từ permissions object theo dotted key
function getPerm(perms, dottedKey) {
  const parts = dottedKey.split('.');
  let cur = perms || {};
  for (const p of parts) {
    if (cur === null || cur === undefined || typeof cur !== 'object') return false;
    cur = cur[p];
  }
  return cur === true;
}

function PermissionsModal({ user, data, loading, saving, onClose, onToggle, onReset, onSave }) {
  if (!user) return null;
  const perms = data?.permissions || {};

  const toggleGroup = (group, allOn) => {
    group.items.forEach((it) => onToggle(it.key, allOn));
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="glass-card rounded-3xl w-full max-w-2xl border border-amber-500/30 overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 bg-gradient-to-br from-amber-500/10 to-orange-500/5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500/30 to-orange-500/20 border border-amber-500/40 flex items-center justify-center">
                <KeyRound className="w-6 h-6 text-amber-300" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  Phân quyền nhân viên
                  <span className="text-[9px] font-normal px-1.5 py-0.5 bg-slate-800 text-slate-500 rounded">v2</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Cấu hình quyền cho <span className="text-amber-300 font-bold">{user.full_name || user.email}</span>
                </p>
              </div>
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-white transition flex-shrink-0">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto flex-1 space-y-3">
          {loading ? (
            <div className="text-center py-12">
              <Loader2 className="w-6 h-6 animate-spin mx-auto text-amber-400" />
              <p className="text-xs text-slate-500 mt-2">Đang tải quyền...</p>
            </div>
          ) : (
            <>
              {/* Quick actions */}
              <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-800">
                <button
                  onClick={() => PERMISSION_GROUPS.forEach((g) => g.items.forEach((it) => onToggle(it.key, true)))}
                  className="px-3 py-1.5 bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold rounded-lg hover:bg-emerald-500/30 transition"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 inline mr-1" /> Bật tất cả
                </button>
                <button
                  onClick={() => PERMISSION_GROUPS.forEach((g) => g.items.forEach((it) => onToggle(it.key, false)))}
                  className="px-3 py-1.5 bg-slate-700 border border-slate-600 text-slate-300 text-xs font-bold rounded-lg hover:bg-slate-600 transition"
                >
                  <XCircle className="w-3.5 h-3.5 inline mr-1" /> Tắt tất cả
                </button>
                <button
                  onClick={onReset}
                  className="ml-auto px-3 py-1.5 bg-slate-800 border border-slate-700 text-slate-300 text-xs font-bold rounded-lg hover:bg-slate-700 transition"
                  title="Khôi phục quyền mặc định cho nhân viên"
                >
                  <RotateCcw className="w-3.5 h-3.5 inline mr-1" /> Mặc định
                </button>
              </div>

              {PERMISSION_GROUPS.map((group) => {
                const groupAllOn = group.items.every((it) => getPerm(perms, it.key));
                const groupAnyOn = group.items.some((it) => getPerm(perms, it.key));
                const colorMap = {
                  cyan: 'border-cyan-500/30 bg-cyan-500/5',
                  amber: 'border-amber-500/30 bg-amber-500/5',
                  emerald: 'border-emerald-500/30 bg-emerald-500/5',
                  orange: 'border-orange-500/30 bg-orange-500/5',
                  pink: 'border-pink-500/30 bg-pink-500/5',
                  purple: 'border-purple-500/30 bg-purple-500/5',
                  blue: 'border-blue-500/30 bg-blue-500/5'
                };
                return (
                  <div key={group.key} className={`rounded-2xl border ${colorMap[group.color] || 'border-slate-700'} p-3`}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <group.icon className="w-4 h-4 text-slate-300" />
                        <h4 className="text-sm font-bold text-white">{group.title}</h4>
                        <span className="text-[10px] text-slate-500">
                          ({group.items.filter((it) => getPerm(perms, it.key)).length}/{group.items.length})
                        </span>
                      </div>
                      <button
                        onClick={() => toggleGroup(group, !groupAllOn)}
                        className="text-[10px] font-bold text-cyan-400 hover:text-cyan-300 uppercase tracking-wider"
                      >
                        {groupAllOn ? 'Bỏ chọn nhóm' : 'Chọn tất cả'}
                      </button>
                    </div>
                    <p className="text-[11px] text-slate-400 mb-2">{group.description}</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                      {group.items.map((item) => {
                        const checked = getPerm(perms, item.key);
                        return (
                          <label
                            key={item.key}
                            className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition ${
                              checked
                                ? 'bg-cyan-500/10 border border-cyan-500/30'
                                : 'bg-slate-900/50 border border-slate-800 hover:bg-slate-800/50'
                            }`}
                          >
                            <div className="relative flex-shrink-0">
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={(e) => onToggle(item.key, e.target.checked)}
                                className="sr-only peer"
                              />
                              <div className={`w-9 h-5 rounded-full transition ${checked ? 'bg-cyan-500' : 'bg-slate-700'}`}>
                                <div
                                  className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform ${
                                    checked ? 'translate-x-4' : 'translate-x-0.5'
                                  }`}
                                />
                              </div>
                            </div>
                            <span className={`text-xs font-medium ${checked ? 'text-cyan-100' : 'text-slate-300'}`}>
                              {item.label}
                              {item.sensitive && (
                                <span className="ml-1 text-[9px] text-rose-400 font-bold uppercase">• Nhạy cảm</span>
                              )}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 flex items-center gap-2 bg-slate-950/50">
          <p className="text-[11px] text-slate-500 flex-1">
            <ShieldAlert className="w-3 h-3 inline mr-1 text-amber-400" />
            Admin luôn có toàn quyền. Quyền của nhân viên có hiệu lực ngay sau khi lưu.
          </p>
          <button
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 bg-slate-800 text-slate-300 font-semibold rounded-xl text-xs hover:bg-slate-700 transition disabled:opacity-50"
          >
            Huỷ
          </button>
          <button
            onClick={onSave}
            disabled={saving || loading}
            className="px-5 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-bold rounded-xl text-xs hover:opacity-90 disabled:opacity-50 flex items-center gap-2 transition"
          >
            {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            <Save className="w-3.5 h-3.5" /> Lưu phân quyền
          </button>
        </div>
      </div>
    </div>
  );
}