# Hướng dẫn Smoke Test bằng Postman

Bộ test này dùng để verify các luồng nghiệp vụ **critical** sau khi đã áp dụng các fix từ đợt audit 2026-08-04.

## 1. Chuẩn bị môi trường

### 1.1. Đảm bảo Postgres đang chạy
```bash
# Nếu dùng Docker
docker run --name pg-laptop -e POSTGRES_PASSWORD=postgres -p 5432:5432 -d postgres:14

# Hoặc kiểm tra service
pg_isready -h localhost -p 5432
```

### 1.2. Chạy migration + seed
```bash
cd D:\shopmaytinh\laptop-store\server

# Apply migration (thêm cột + index + CHECK)
psql -U postgres -d laptopstore -f sql/migration_2026_08_04_critical_fixes.sql

# Nếu DB trống, tạo schema trước
psql -U postgres -c "CREATE DATABASE laptopstore;"
psql -U postgres -d laptopstore -f sql/schema.sql     # (file schema chính)

# Seed dữ liệu (admin + products + coupons)
npm run seed
# hoặc: node seeders/seed.js
```

### 1.3. Khởi động server
```bash
npm run dev
```
Server chạy tại `http://localhost:5000`. Đảm bảo terminal log hiện:
- ✅ `Database connection successful`
- ✅ `Email configured for: <your-email>` (hoặc warning nếu chưa config email)

### 1.4. Tạo admin mặc định (nếu chưa có)
Sau khi seed:
```
Email: admin@laptopstore.com
Password: Admin123@
```

## 2. Cài đặt & chạy Postman

### 2.1. Import collection
1. Mở Postman.
2. **File → Import** → chọn file `scripts/postman/Laptop-Store-Critical-Smoke.json`.
3. Collection xuất hiện với 9 folder (0 → 9).

### 2.2. Cấu hình biến (Variables)
Mở collection → tab **Variables**. Có thể sửa:

| Biến | Mặc định | Mô tả |
|------|----------|-------|
| `base_url` | `http://localhost:5000/api` | URL gốc của API |
| `admin_email` | `admin@laptopstore.com` | Email admin |
| `admin_password` | `Admin123@` | Mật khẩu admin (sau seed) |
| `customer_email` | `smoke.customer@example.com` | Email khách test |
| `customer_password` | `Smoke123@` | Mật khẩu khách test |
| `test_product_id` | `1` | ID sản phẩm để test (xem DB) |
| `test_coupon_code` | `WELCOME10` | Mã coupon đã seed |
| `test_order_id` | (auto) | Tự set sau khi tạo order |
| `test_otp` | (empty) | OTP lấy từ server log/email |

### 2.3. Chạy tuần tự
**Quan trọng**: collection phải chạy theo thứ tự folder 0 → 9 vì:
- Folder 1 cần DB chạy (folder 0).
- Folder 2 cần token từ folder 1.
- Folder 4 cần customer token.
- Folder 6 cần cart có sản phẩm.
- Folder 8 cần admin token.
- Folder 9 cần cả 2 token.

Để chạy tuần tự: click phải collection → **Run collection** → bỏ chọn "Run in order" nếu đã sắp xếp thứ tự, hoặc để mặc định.

### 2.4. Về OTP test
Folder 1 có 2 bước:
- **Send registration OTP**: gửi OTP về email.
- **Verify registration OTP**: cần điền `test_otp` bằng tay (lấy từ mailbox hoặc server log).

Nếu SMTP chưa config, OTP có thể log ra server console. Tìm `[OTP]` trong terminal.

## 3. Thứ tự các test và ý nghĩa

| Folder | Mục đích | Test chính |
|--------|----------|-------------|
| 0 | Health & DB | Server start, DB connect |
| 1 | Auth - Registration | Send OTP, Verify OTP, Register, validation |
| 2 | Auth - Login + Lockout | Login, lockout sau 5 lần sai, /me với/không token |
| 3 | Auth - Forgot/Reset | Quên mật khẩu, token sai → 400 |
| 4 | Cart | Add/merge/remove, validation bad product_id, qty=0 |
| 5 | Coupon | Validate OK, validate mã không tồn tại |
| 6 | Order | Tạo COD, validation bad payment/phone/product, get, cancel |
| 7 | Wishlist & Review | Add/remove wishlist, create review |
| 8 | Admin | Login admin, dashboard stats, list users/orders, bulk stock |
| 9 | Security | Customer → admin endpoint (403), brute-force login, 404 |

## 4. Đọc kết quả

### 4.1. Test pass/fail
Mỗi request có script `pm.test(...)` ở tab **Tests**. Khi chạy:
- ✅ **PASS**: code chạy đúng mong đợi (200/201/...).
- ❌ **FAIL**: response code hoặc body không khớp.

Tổng kết pass/fail hiện ở panel **Test Results**.

### 4.2. Kết quả mong đợi
Tất cả các test trong collection nên **PASS**. Nếu có test fail:

| Triệu chứng | Nguyên nhân thường gặp | Cách xử lý |
|-------------|------------------------|------------|
| Folder 0 fail | DB chưa chạy / env sai | Check `.env`, Postgres status |
| Folder 1 fail verify-otp | OTP sai / hết hạn / email chưa config | Lấy OTP mới từ log/email |
| Folder 2 fail (me 401) | Token không lưu vào variable | Đảm bảo Login customer pass trước |
| Folder 4 fail add-to-cart | Sản phẩm `is_active=false` hoặc stock=0 | Đổi `test_product_id` sang product khác |
| Folder 6 fail create-order | Cùng lý do trên | Đổi product, hoặc kiểm tra district_id/shipping |
| Folder 8 fail admin login | Admin chưa seed | Chạy `node seeders/seed.js` |
| Folder 9 fail 403 | Token đang là admin (không phải customer) | Chạy lại folder 2 trước |

## 5. Chạy bằng CLI (tuỳ chọn)

Có thể dùng Newman để chạy trong CI/CD:

```bash
npm install -g newman

newman run scripts/postman/Laptop-Store-Critical-Smoke.json \
  --env-var "base_url=http://localhost:5000/api" \
  --env-var "admin_password=Admin123@" \
  --reporters cli,html \
  --reporter-html-export newman-report.html
```

Output: console summary + file HTML report chi tiết.

## 6. Sau khi smoke test pass

✅ Hệ thống đã sẵn sàng cho:
- Đợt test Phase 1D (Jest + Supertest) — viết unit test cho từng service.
- Đợt test manual UAT trên staging.
- Triển khai production (sau khi rotate JWT_SECRET + EMAIL_PASS).

❌ Nếu có test fail, xem [AUDIT_REPORT.md](../../AUDIT_REPORT.md) để kiểm tra các fix đã được áp dụng đúng chưa.
