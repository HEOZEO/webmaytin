import { useAuth } from '../context/AuthContext';

/**
 * Hook để check permission hiện tại.
 *
 * VD:
 *   const { can, hasPermission } = usePermission();
 *   if (can('products.delete')) ...
 *
 *   if (hasPermission('orders.update_status')) ...
 */
export function usePermission() {
  const { hasPermission } = useAuth();

  /**
   * Check 1 hoặc nhiều permissions (OR).
   * Nếu truyền mảng, chỉ cần 1 cái true là true.
   */
  const can = (permKey) => {
    if (Array.isArray(permKey)) {
      return permKey.some((k) => hasPermission(k));
    }
    return hasPermission(permKey);
  };

  /**
   * Check tất cả permissions đều true (AND).
   */
  const canAll = (permKeys) => {
    if (!Array.isArray(permKeys)) return hasPermission(permKeys);
    return permKeys.every((k) => hasPermission(k));
  };

  return { hasPermission, can, canAll };
}

/**
 * Component <Can permission="products.delete">...</Can>
 * Chỉ render children nếu user có permission.
 *
 * VD:
 *   <Can permission="products.create">
 *     <button>Thêm sản phẩm</button>
 *   </Can>
 *
 *   <Can permission={['orders.update_status', 'orders.cancel']} fallback={null}>
 *     <ActionMenu />
 *   </Can>
 */
export function Can({ permission, fallback = null, children }) {
  const { hasPermission } = useAuth();

  if (Array.isArray(permission)) {
    return permission.some((k) => hasPermission(k)) ? children : fallback;
  }
  if (!permission) return children;
  return hasPermission(permission) ? children : fallback;
}
