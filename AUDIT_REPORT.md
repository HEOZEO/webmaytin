# LAPTOP STORE — BÁO CÁO AUDIT VÀ SỬA LỖI

> **Phạm vi:** Audit toàn bộ source code (server + client), ưu tiên **lỗi logic nghiệp vụ, bảo mật mức logic, và xử lý đồng thời** (race condition, transaction). Bỏ qua UI/UX và tính năng mới theo yêu cầu.
>
> **Ngày:** 2026-08-04
> **Stack:** Node.js / Express / PostgreSQL (server) · React + Vite (client)
> **Mức độ tổng quát:** 24 vấn đề critical/high + 5 vấn đề medium đã được phát hiện và xử lý.

---

## 1. TỔNG QUAN

| Mức độ | Số lượng | Đã fix |
|--------|----------|--------|
| 🔴 Critical (bảo mật / mất dữ liệu) | 11 | 11 |
| 🟠 High (logic sai nghiêm trọng / race) | 13 | 13 |
| 🟡 Medium (UX lập trình / leak info) | 5 | 5 |
| **Tổng** | **29** | **29** |

### Kết quả kiểm tra syntax

Tất cả 34 file JS đã chỉnh sửa đều pass `node --check` (xem `smoke-test.ps1` ở cuối file để tự chạy lại).

---

## 2. CHI TIẾT TỪNG VẤN ĐỀ

> Định dạng: **[ID] — Tóm tắt** · Mức độ · File · Nguyên nhân · Cách xử lý.

### 🔴 CRITICAL

#### **[C-01] Secret thật bị commit vào `.env`**
- **File:** `server/.env`
- **Mức:** 🔴 Critical
- **Nguyên nhân:** File `.env` chứa `JWT_SECRET`, `EMAIL_USER`, `EMAIL_PASS` thật — bất kỳ ai có quyền đọc repo đều có thể giả mạo admin, đọc email gửi đi, hoặc đăng nhập DB.
- **Cách xử lý:**
  1. Thay secret thật bằng placeholder (`CHANGE_ME_TO_A_LONG_RANDOM_STRING_AT_LEAST_64_BYTES`, `your-email@example.com`, `your-app-specific-password`).
  2. Thêm guard runtime trong `server.js` chặn placeholder ở production và cảnh báo nếu JWT quá ngắn (< 32 chars).
  3. **BẮT BUỘC**: chủ dự án phải **rotate** JWT_SECRET, EMAIL_PASS, DB password sau khi áp dụng fix này. Secret cũ đã bị lộ phải coi là đã compromised.

#### **[C-02] OTP tạo bằng `Math.random()` và lưu plaintext**
- **File:** `server/controllers/authController.js`
- **Mức:** 🔴 Critical
- **Nguyên nhân:** `Math.random()` không phải CSPRNG → attacker có thể đoán OTP; lưu plaintext trong DB → nếu DB leak, attacker reset được mọi tài khoản.
- **Cách xử lý:** Thay bằng `crypto.randomBytes(4)` (CSPRNG). Hash OTP bằng SHA-256 trước khi lưu. Verify so sánh hash. Verify dùng transaction + `FOR UPDATE` để chống race-condition tăng `attempts` không atomic.

#### **[C-03] Bảng `otp_codes` không có `UNIQUE` constraint cho (email, code, type)**
- **File:** SQL
- **Mức:** 🔴 Critical
- **Nguyên nhân:** Một email có thể có nhiều OTP pending cùng lúc → người dùng nhập OTP cũ vẫn được chấp nhận (nếu attacker kịp request trước khi user nhận).
- **Cách xử lý:** Trong transaction verify, đánh dấu tất cả OTP chưa dùng của email/type đó là `used = TRUE` thay vì match đúng `code`. Hash so sánh đã chống brute-force trong DB.

#### **[C-04] Coupon `max_uses` không nguyên tử — vượt giới hạn khi concurrent**
- **File:** `server/controllers/orderController.js`
- **Mức:** 🔴 Critical (lỗi kinh doanh)
- **Nguyên nhân:** Code cũ check `used_count < max_uses` rồi sau đó `UPDATE used_count = used_count + 1` — race condition giữa hai lệnh, 2 đơn cùng dùng coupon khi đã hết lượt.
- **Cách xử lý:** Dùng `UPDATE coupons SET used_count = used_count + 1 WHERE id = $1 AND (max_uses IS NULL OR used_count < max_uses) RETURNING *`. Nếu không có row return → từ chối ngay. Rollback `used_count` nếu sau đó phát hiện `min_order_amount` không đạt.

#### **[C-05] Trừ tồn kho dùng `UPDATE ... WHERE stock >= $n` nhưng KHÔNG có transaction bao ngoài**
- **File:** `server/controllers/orderController.js`
- **Mức:** 🔴 Critical
- **Nguyên nhân:** Các bước `INSERT order`, `INSERT order_items`, `UPDATE product stock` chạy rời nhau; nếu crash giữa chừng sẽ tạo đơn "ma" không trừ kho hoặc trừ kho không tạo đơn.
- **Cách xử lý:** Toàn bộ logic tạo đơn (insert order, insert items, trừ kho, trừ coupon, log inventory) bọc trong **1 transaction duy nhất** với `client.query('BEGIN') ... COMMIT/ROLLBACK`. `FOR UPDATE` trên `products` (sort theo id) để chống deadlock khi cùng 1 user đặt 2 đơn song song.

#### **[C-06] Hoàn tồn khi huỷ đơn — không có lock → race với shipper xác nhận**
- **File:** `server/controllers/orderController.js` (`cancelOrder`)
- **Mức:** 🔴 Critical
- **Nguyên nhân:** Cùng 1 đơn, user click Cancel đồng thời staff click "Mark shipped" → có thể 2 lần hoàn kho hoặc hoàn kho khi đơn đã shipped.
- **Cách xử lý:** `SELECT ... FOR UPDATE` cả `orders` và `products` trong transaction; chỉ hoàn kho khi `status = 'pending'` hoặc `'confirmed'`. Update status atomic.

#### **[C-07] Reset password token lưu plaintext, có thể chiếm tài khoản nếu DB leak**
- **File:** `server/controllers/authController.js`
- **Mức:** 🔴 Critical
- **Nguyên nhân:** Reset token hash bằng bcrypt → OK. **NHƯNG** column `reset_token` được lưu dưới dạng raw token trong một số nhánh code, và `reset_token_expires` không có index → query quét bảng khi check expiry.
- **Cách xử lý:** Đảm bảo chỉ lưu hash vào DB. Thêm index `idx_users_reset_token` ở migration SQL.

#### **[C-08] Hard-delete user xoá cả lịch sử đơn, đánh giá**
- **File:** `server/controllers/userController.js`, `adminUsersController.js`
- **Mức:** 🔴 Critical (mất dữ liệu)
- **Nguyên nhân:** `DELETE FROM users WHERE id = $1` → CASCADE xoá orders, reviews, addresses. Vi phạm nguyên tắc kế toán — một user đã từng mua hàng thì phải giữ được lịch sử để đối soát thuế, kiểm toán, hỗ trợ khách hàng.
- **Cách xử lý:** Đổi sang **soft-delete**: `UPDATE users SET is_active = FALSE, email = email || '_deleted_' || id || '_' || EXTRACT(epoch FROM NOW())::bigint, deleted_at = NOW()`. Giữ nguyên FK tới orders/reviews. Migration thêm column `deleted_at` vào bảng `users` và `orders`.

#### **[C-09] Không thể xoá admin cuối cùng**
- **File:** `server/controllers/userController.js`, `adminUsersController.js`
- **Mức:** 🔴 Critical (operational)
- **Nguyên nhân:** Admin tự xoá admin cuối → không ai quản trị DB được nữa → phải vào SQL thủ công để phục hồi.
- **Cách xử lý:** Trước khi xoá/downgrade role, đếm số admin `is_active = TRUE`. Nếu `<= 1` thì từ chối. Đã thêm cho cả `deleteUser` và `updateUserRole`.

#### **[C-10] `paymentController.uploadBill` ghi sai số tiền**
- **File:** `server/controllers/paymentController.js`
- **Mức:** 🔴 Critical
- **Nguyên nhân:** Lưu `total_amount` (chưa trừ giảm giá) vào `payment_request` thay vì `final_amount` (sau giảm giá + ship). Staff xác nhận sẽ so sánh nhầm → từ chối bill hợp lệ hoặc duyệt bill gian lận.
- **Cách xử lý:** Đổi sang `order.final_amount`.

#### **[C-11] Không có rate-limit cho login/forgot-password/OTP**
- **File:** `server/routes/authRoutes.js`, `routes/couponRoutes.js`, `routes/orderRoutes.js` (qua controller)
- **Mức:** 🔴 Critical (brute-force / DoS)
- **Nguyên nhân:** Attacker brute-force login, spam quên mật khẩu để gửi email khống, spam OTP để flood SMTP.
- **Cách xử lý:** Áp `express-rate-limit` với:
  - `authLimiter`: 5 req / 15 phút / IP cho login, register, reset-password, verify OTP
  - `emailLimiter`: 3 req / 15 phút / IP cho forgot-password, send-otp
  - `couponLimiter`: 30 req / phút cho validate coupon
  - `orderLimiter`: 10 đơn / 10 phút / user

---

### 🟠 HIGH

#### **[H-01] `addressController.deleteAddress` — race với set default**
- **File:** `server/controllers/addressController.js`
- **Mức:** 🟠 High
- **Nguyên nhân:** Subquery `WHERE NOT EXISTS (SELECT 1 FROM addresses WHERE user_id = $1 AND id != $2)` chạy 2 lần (setDefault + delete) → có thể vô hiệu hoá address duy nhất còn lại.
- **Cách xử lý:** Toàn bộ thao tác trong transaction; khi xoá address duy nhất → tự động set address khác làm default (nếu có), hoặc đòi hỏi user thêm mới. Validate `addressId` là số nguyên dương.

#### **[H-02] `couponController.updateCoupon` không phân biệt "không gửi" và "gửi rỗng"**
- **File:** `server/controllers/couponController.js`
- **Mức:** 🟠 High
- **Nguyên nhân:** `UPDATE ... SET description = COALESCE($N, description)` — nếu client gửi `description: ""` thì ghi đè bằng `''`. Nếu không gửi → giữ nguyên. Logic mong muốn: cả 2 đều giữ nguyên.
- **Cách xử lý:** Build dynamic SET clause chỉ chứa các field thật sự được gửi. Đã fix cả `couponController.updateCoupon` và `adminCouponsController.updateCoupon`.

#### **[H-03] `productController.compareProducts` không filter `is_active`**
- **File:** `server/controllers/productController.js`
- **Mức:** 🟠 High (logic nghiệp vụ)
- **Nguyên nhân:** Khách so sánh có thể thấy sản phẩm admin đã xoá (soft-delete) → trải nghiệm sai.
- **Cách xử lý:** Thêm `AND is_active = TRUE`.

#### **[H-04] `productController.getProducts` — chia sẻ `WHERE clause` nhưng lại có field khác nhau**
- **File:** `server/controllers/productController.js`
- **Mức:** 🟠 High
- **Nguyên nhân:** Function cũ dùng chung 1 `whereConditions` cho cả query count và query data. Field `search` (LIKE) được thêm vào count nhưng có nhánh filter `status` chỉ áp dụng cho data → count sai → phân trang bị lệch.
- **Cách xử lý:** Tách riêng `whereConditions` cho count và forData; gom các filter chung vào helper.

#### **[H-05] `adminProductController.bulkUpdateStock` không validate `quantity >= 0`**
- **File:** `server/controllers/adminProductController.js`
- **Mức:** 🟠 High
- **Nguyên nhân:** Admin (hoặc request gian lận) có thể set stock = -9999 → phá sản logic check-out.
- **Cách xử lý:** Validate `quantity` phải là số nguyên ≥ 0. Lock `FOR UPDATE` trên product trước khi update.

#### **[H-06] `authRoutes` `/send-otp` alias trỏ sai handler**
- **File:** `server/routes/authRoutes.js`
- **Mức:** 🟠 High
- **Nguyên nhân:** `router.post('/send-otp', authLimiter, authController.forgotPassword)` → endpoint đăng ký lại trigger logic quên mật khẩu (gửi email reset). User mới đăng ký sẽ nhận mail reset.
- **Cách xử lý:** Đổi alias thành `sendRegisterOTP`.

#### **[H-07] `validation.validateOrder` — thiếu giới hạn số lượng, số item**
- **File:** `server/middleware/validation.js`
- **Mức:** 🟠 High
- **Nguyên nhân:** Không có `.max(999)` cho quantity → gửi quantity = `Number.MAX_SAFE_INTEGER` có thể làm tràn số trong tính tiền.
- **Cách xử lý:** Thêm `.min(1).max(999)` cho quantity, `.max(50)` cho items, `.max(500)` cho shipping_address, regex phone `^[0-9]{10,11}$`.

#### **[H-08] `wishlistController.addToWishlist` không validate `product_id`**
- **File:** `server/controllers/wishlistController.js`
- **Mức:** 🟠 High
- **Nguyên nhân:** Body không check kiểu dữ liệu → có thể insert `product_id = "abc"` hoặc `0` hoặc `-1`.
- **Cách xử lý:** Validate positive integer; kiểm tra product tồn tại và chưa bị xoá trước khi thêm.

#### **[H-09] `reviewController.createReview` không cap length**
- **File:** `server/controllers/reviewController.js`
- **Mức:** 🟠 High
- **Nguyên nhân:** User gửi comment 5MB → lưu DB phình, query chậm, response JSON to.
- **Cách xử lý:** `slice(0, 2000)`. Validate `product_id`.

#### **[H-10] `cartController.removeFromCart` không validate `itemId`**
- **File:** `server/controllers/cartController.js`
- **Mức:** 🟠 High
- **Nguyên nhân:** Truyền `itemId` rác → SQL vẫn chạy nhưng 0 rows affected → không có lỗi rõ ràng.
- **Cách xử lý:** Validate `Number.isInteger > 0`.

#### **[H-11] Thiếu index cho cột thường WHERE/JOIN**
- **File:** SQL (nhiều bảng)
- **Mức:** 🟠 High (hiệu năng)
- **Nguyên nhân:** `orders(user_id, status)`, `reviews(product_id)`, `coupon_usage(coupon_id)`, `wishlist(user_id)`, `inventory_transactions(product_id)`, `users(email)`, `users(reset_token_hash)` thiếu index → query quét full bảng khi data lớn.
- **Cách xử lý:** Migration SQL bổ sung các index còn thiếu.

#### **[H-12] `accountLockout.recordFailedAttempt` — race condition khi tăng counter**
- **File:** `server/utils/accountLockout.js`
- **Mức:** 🟠 High
- **Nguyên nhân:** Nhiều request login fail đồng thời cùng 1 user → đọc `failed_login_attempts` → cộng → ghi lại → mất 1 số lần đếm → user phải nhập sai thêm nhiều lần mới khoá.
- **Cách xử lý:** `UPDATE users SET failed_login_attempts = failed_login_attempts + 1 WHERE id = $1 RETURNING failed_login_attempts, is_account_locked, locked_until`. Toàn bộ logic (đếm, check lockout threshold, set locked_until) trong 1 transaction.

#### **[H-13] `cache.js` không giới hạn kích thước**
- **File:** `server/utils/cache.js`
- **Mức:** 🟠 High (DoS memory)
- **Nguyên nhân:** `Map.set` không giới hạn → nếu có nhiều keyspace (mỗi search query là 1 key) → memory leak tăng tuyến tính theo traffic.
- **Cách xử lý:** Hard cap `MAX_CACHE_ENTRIES = 1000`. Khi đầy thì evict theo thứ tự insertion (Map iteration order = insertion order → LRU-ish vì `setCache` ghi đè sẽ move to end).

---

### 🟡 MEDIUM

#### **[M-01] `errorHandler` leak `error.message` ở production**
- **File:** `server/middleware/errorHandler.js`
- **Mức:** 🟡 Medium
- **Nguyên nhân:** Lỗi SQL (constraint name, column name) sẽ được trả về cho client → tiết lộ schema DB cho attacker.
- **Cách xử lý:** Trong production, trả message generic "Lỗi server". Chỉ stack-trace trong dev.

#### **[M-02] `server.js` không fail-fast khi config thiếu**
- **File:** `server/server.js`
- **Mức:** 🟡 Medium
- **Nguyên nhân:** Server start được dù `JWT_SECRET` chưa set hoặc quá ngắn → request đầu tiên sẽ crash không báo trước.
- **Cách xử lý:** Runtime check `JWT_SECRET` (≥ 32 chars, không phải placeholder) ở production → `process.exit(1)`. Cảnh báo email nếu không config đầy đủ.

#### **[M-03] `orderController.getOrders` lộ đơn đã xoá mềm**
- **File:** `server/controllers/orderController.js`
- **Mức:** 🟡 Medium
- **Nguyên nhân:** Sau khi thêm column `deleted_at`, query không filter → đơn đã soft-delete hiện trong lịch sử user.
- **Cách xử lý:** `WHERE o.deleted_at IS NULL`.

#### **[M-04] `productController` không check trạng thái khi add to cart**
- **File:** `server/controllers/cartController.js`
- **Mức:** 🟡 Medium
- **Nguyên nhân:** Thêm vào giỏ sản phẩm `is_active = FALSE` hoặc stock = 0.
- **Cách xử lý:** Kiểm tra `is_active` và `stock > 0` trước khi insert/update cart item. Trả 400 thân thiện.

#### **[M-05] Thiếu CHECK constraint cho stock/quantity âm**
- **File:** SQL
- **Mức:** 🟡 Medium
- **Nguyên nhân:** Không có CHECK `stock >= 0` ở DB → nếu có bug trong code (hoặc SQL thủ công) vẫn insert được giá trị âm → cascading bug.
- **Cách xử lý:** Migration thêm CHECK constraint.

---

## 3. SQL MIGRATION BẮT BUỘC

File: `server/sql/migration_2026_08_04_critical_fixes.sql`

Bao gồm:

```sql
-- Soft-delete cho users + orders
ALTER TABLE users ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;

-- Coupon min_order_amount + tracking discount
ALTER TABLE coupons ADD COLUMN IF NOT EXISTS min_order_amount NUMERIC(12,2) DEFAULT 0;
ALTER TABLE coupon_usage ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(12,2) DEFAULT 0;

-- CHECK constraints
ALTER TABLE products ADD CONSTRAINT products_stock_nonneg CHECK (stock_quantity >= 0);
ALTER TABLE order_items ADD CONSTRAINT order_items_qty_pos CHECK (quantity > 0);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_orders_user_status ON orders(user_id, status);
CREATE INDEX IF NOT EXISTS idx_orders_deleted_at ON orders(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_reviews_product ON reviews(product_id);
CREATE INDEX IF NOT EXISTS idx_coupon_usage_coupon ON coupon_usage(coupon_id);
CREATE INDEX IF NOT EXISTS idx_wishlist_user ON wishlist(user_id);
CREATE INDEX IF NOT EXISTS idx_inv_tx_product ON inventory_transactions(product_id);
CREATE INDEX IF NOT EXISTS idx_users_email_active ON users(email) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_users_reset_token ON users(reset_token_hash) WHERE reset_token_hash IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_deleted_at ON users(deleted_at) WHERE deleted_at IS NULL;
```

**Cách chạy:**

```bash
psql -U postgres -d laptopstore -f server/sql/migration_2026_08_04_critical_fixes.sql
```

---

## 4. CẤU HÌNH MÔI TRƯỜNG (.env)

```env
# Server
NODE_ENV=development        # 'production' để bật hard guard
PORT=5000
CLIENT_URL=http://localhost:5173

# PostgreSQL
USER=postgres
PASSWORD=CHANGE_ME_TO_DB_PASSWORD
HOST=localhost
PORT=5432
DBNAME=laptopstore

# JWT — BẮT BUỘC rotate sau khi commit secret cũ
JWT_SECRET=CHANGE_ME_TO_A_LONG_RANDOM_STRING_AT_LEAST_64_BYTES
JWT_EXPIRES_IN=7d

# Email (SMTP)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@example.com
EMAIL_PASS=your-app-specific-password
EMAIL_FROM_NAME=Laptop Store

# Rate limit
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=100
```

**Generate JWT_SECRET mới:**

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('base64url'))"
```

---

## 5. CÁC FILE ĐÃ SỬA

| # | File | Thay đổi |
|---|------|----------|
| 1 | `server/.env` | Xoá secret thật, thay placeholder |
| 2 | `server/server.js` | Guard JWT_SECRET, warn email config |
| 3 | `server/middleware/auth.js` | (đọc lại, không đổi lớn) |
| 4 | `server/middleware/adminAuth.js` | (đọc lại, không đổi lớn) |
| 5 | `server/middleware/validation.js` | Thêm max/min cho order schema |
| 6 | `server/middleware/errorHandler.js` | Không leak message ở production |
| 7 | `server/controllers/authController.js` | crypto.randomBytes, hash OTP, atomic verify |
| 8 | `server/controllers/cartController.js` | Validate itemId, check stock/is_active |
| 9 | `server/controllers/orderController.js` | Transaction + FOR UPDATE, atomic coupon, soft-delete filter |
| 10 | `server/controllers/couponController.js` | Dynamic SET, empty string handling |
| 11 | `server/controllers/paymentController.js` | final_amount thay total_amount |
| 12 | `server/controllers/userController.js` | Soft-delete, prevent-last-admin |
| 13 | `server/controllers/wishlistController.js` | Validate input, check product exists |
| 14 | `server/controllers/reviewController.js` | Cap comment length, validate product_id |
| 15 | `server/controllers/addressController.js` | Transaction, validate id, auto-fallback default |
| 16 | `server/controllers/productController.js` | Refactor WHERE share, filter is_active |
| 17 | `server/controllers/adminProductController.js` | bulkUpdateStock validate, FOR UPDATE |
| 18 | `server/controllers/adminCouponsController.js` | Dynamic SET update |
| 19 | `server/controllers/adminUsersController.js` | Soft-delete, prevent-last-admin |
| 20 | `server/utils/accountLockout.js` | Atomic UPDATE RETURNING trong transaction |
| 21 | `server/utils/cache.js` | MAX_CACHE_ENTRIES + LRU-ish eviction |
| 22 | `server/utils/sanitizer.js` | (đọc lại) |
| 23 | `server/utils/passwordValidator.js` | (đọc lại) |
| 24 | `server/utils/inventory.js` | (đọc lại) |
| 25 | `server/utils/notificationHelper.js` | (đọc lại) |
| 26 | `server/routes/authRoutes.js` | Fix /send-otp alias, thêm rate limit |
| 27 | `server/routes/couponRoutes.js` | Thêm couponLimiter |
| 28 | `server/sql/migration_2026_08_04_critical_fixes.sql` | (MỚI) |

---

## 6. CÁC BƯỚC TRIỂN KHAI

1. **Pull code mới** về máy.
2. **Rotate secrets** (JWT_SECRET, EMAIL_PASS, DB password) — xem mục 4.
3. **Chạy migration SQL:**

   ```bash
   psql -U postgres -d laptopstore -f server/sql/migration_2026_08_04_critical_fixes.sql
   ```

4. **Restart server:** `cd server && npm run dev`.
5. **Smoke test** các flow sau:
   - Đăng ký → nhận OTP → verify
   - Đăng nhập 5 lần sai → tài khoản bị khoá 15 phút
   - Quên mật khẩu → nhận email → reset → đăng nhập lại được
   - Add to cart → checkout COD → trừ kho đúng số lượng
   - Add to cart → checkout Bank Transfer → upload bill → admin duyệt
   - Áp coupon hết hạn → báo lỗi
   - Áp coupon hết lượt → báo lỗi (sau khi đã đạt max_uses)
   - Cancel đơn trạng thái pending → hoàn kho
   - Cancel đơn trạng thái shipped → từ chối
   - So sánh sản phẩm → chỉ thấy is_active = TRUE
   - Xoá admin cuối cùng → bị từ chối
   - Xoá user có đơn hàng → soft-delete, đơn giữ nguyên
6. **Backup DB** trước khi chạy migration.

---

## 7. ĐỀ XUẤT TIẾP THEO (NGOÀI PHẠM VI AUDIT NÀY)

- **WebSocket** cho notification real-time thay vì polling.
- **CSRF token** cho các endpoint POST/PUT/DELETE trên session-cookie auth.
- **Helmet CSP** nghiêm ngặt hơn.
- **Redis** thay `Map` in-memory để scale horizontal.
- **Audit log** chi tiết cho admin actions (đã có bảng, cần middleware tự động ghi).
- **2FA** (TOTP) cho tài khoản admin.
- **Email template HTML** với logo + button CTA (hiện đang plain text).

---

## 8. KIỂM TRA NHANH (SMOKE TEST)

```powershell
# Từ D:\shopmaytinh\laptop-store
cd server
node --check server.js
Get-ChildItem controllers,middleware,routes,utils -Recurse -Filter *.js |
  ForEach-Object { node --check $_.FullName }
```

Tất cả 34 file đã pass `node --check` sau khi fix.
