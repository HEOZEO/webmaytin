# LaptopStore - Hướng Dẫn Cài Đặt

## Mục lục
1. [Yêu cầu hệ thống](#1-yêu-cầu-hệ-thống)
2. [Cài đặt Database](#2-cài-đặt-database)
3. [Cài đặt Backend](#3-cài-đặt-backend)
4. [Cài đặt Frontend](#4-cài-đặt-frontend)
5. [Chạy Migration](#5-chạy-migration)
6. [Kiểm thử](#6-kiểm-thử)
7. [Xử lý sự cố](#7-xử-lý-sự-cố)

---

## 1. Yêu cầu hệ thống

- **Node.js**: v18.0.0 trở lên
- **PostgreSQL**: v14.0 trở lên
- **npm**: v8.0 trở lên (đi kèm Node.js)

### Optional (để có đầy đủ tính năng):
- **Redis**: v6.0 trở lên (cho distributed cache)

---

## 2. Cài đặt Database

### 2.1. Cài đặt PostgreSQL

#### Windows (dùng PostgreSQL installer):
1. Download từ https://www.postgresql.org/download/windows/
2. Chạy installer, đặt password cho user `postgres`
3.记住 port mặc định: `5432`

#### macOS:
```bash
brew install postgresql@14
brew services start postgresql@14
```

#### Linux (Ubuntu/Debian):
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
```

### 2.2. Tạo Database

```bash
# Đăng nhập vào PostgreSQL
psql -U postgres

# Tạo database mới
CREATE DATABASE shopmaytinh;

# Thoát psql
\q
```

### 2.3. Tạo User (tùy chọn)

```sql
CREATE USER laptopstore WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE shopmaytinh TO laptopstore;
```

---

## 3. Cài đặt Backend

### 3.1. Di chuyển vào thư mục server

```bash
cd server
```

### 3.2. Cài đặt dependencies

```bash
npm install
```

### 3.3. Tạo file `.env`

Copy file `.env.example` thành `.env`:

```bash
# Windows
copy .env.example .env

# macOS/Linux
cp .env.example .env
```

### 3.4. Cập nhật `.env`

Mở file `.env` và cập nhật các giá trị:

```env
# Database
DATABASE_URL=postgresql://postgres:your_password@localhost:5432/shopmaytinh

# JWT Secret - THAY ĐỔI GIÁ TRỊ NÀY!
JWT_SECRET=your_new_super_secret_jwt_key_must_be_at_least_32_characters_long_here

# Email (tùy chọn cho development)
# EMAIL_USER=your-email@gmail.com
# EMAIL_PASS=your-app-specific-password

# Client URL
CLIENT_URL=http://localhost:5173
```

### 3.5. Generate JWT Secret mới

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

Copy kết quả và paste vào `JWT_SECRET` trong `.env`.

---

## 4. Cài đặt Frontend

### 4.1. Di chuyển vào thư mục client

```bash
cd ../client
```

### 4.2. Cài đặt dependencies

```bash
npm install
```

### 4.3. Tạo file `.env` (nếu chưa có)

```bash
# Windows
copy .env.example .env

# macOS/Linux
cp .env.example .env
```

---

## 5. Chạy Migration

### 5.1. Chạy tất cả migrations

```bash
cd ../server
node run_migration.js
```

Bạn sẽ thấy output tương tự:

```
🚀 Starting database migrations...

📦 Applying migration: create_idempotency_keys_table
✅ Applied: create_idempotency_keys_table

📦 Applying migration: create_email_outbox_table
✅ Applied: create_email_outbox_table

...

═══════════════════════════════════════════════
✅ Migrations complete!
   Applied: 10
   Skipped: 0
═══════════════════════════════════════════════
```

### 5.2. Seed database (tùy chọn)

```bash
npm run seed
```

---

## 6. Kiểm thử

### 6.1. Khởi động Backend

```bash
# Terminal 1
cd server
npm run dev
```

Output mong đợi:
```
🔧 Starting Laptop Store Server...
📝 Environment: development
📡 Connecting to database...
✅ Database connection verified at 2024-01-01T00:00:00.000Z
═══════════════════════════════════════
✅ Server started successfully!
═══════════════════════════════════════
🚀 Server running on port 5000
📱 Environment: development
🌐 API URL: http://localhost:5000
🔍 Health check: http://localhost:5000/api/health
📧 Starting email outbox worker...
⚙️  Background jobs started
```

### 6.2. Khởi động Frontend

```bash
# Terminal 2
cd client
npm run dev
```

Output mong đợi:
```
  VITE v5.x.x  ready in 500ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: http://192.168.x.x:5173/
```

### 6.3. Truy cập ứng dụng

1. Mở trình duyệt: http://localhost:5173
2. Backend API: http://localhost:5000/api/health

### 6.4. Tài khoản mặc định

Sau khi chạy seed:

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@laptopstore.com | admin123 |
| Staff | staff@laptopstore.com | staff123 |
| Customer | user@laptopstore.com | user123 |

---

## 7. Xử lý sự cố

### Lỗi: `DATABASE_URL is not defined`

```bash
# Đảm bảo đang ở thư mục server
cd server

# Kiểm tra file .env tồn tại
dir .env    # Windows
ls -la .env    # macOS/Linux
```

### Lỗi: `JWT_SECRET must be at least 16 characters`

```env
# Thay đổi JWT_SECRET trong .env thành giá trị dài hơn
JWT_SECRET=your_new_secret_key_at_least_32_characters_long_here
```

### Lỗi: Database connection refused

1. Kiểm tra PostgreSQL đang chạy:
```bash
# Windows - Kiểm tra service
services.msc
# Tìm "postgresql-x64-14" và đảm bảo Status là "Running"

# macOS
brew services list | grep postgresql

# Linux
sudo systemctl status postgresql
```

2. Kiểm tra DATABASE_URL đúng format:
```
postgresql://username:password@localhost:5432/database_name
```

### Lỗi: Port đã bị chiếm

```bash
# Windows
# Tìm và kill process đang dùng port 5000
netstat -ano | findstr :5000
taskkill /F /PID <process_id>

# macOS/Linux
lsof -i :5000
kill -9 <process_id>
```

### Lỗi: Migration failed

```bash
# Xem chi tiết lỗi
node run_migration.js

# Nếu migration đã chạy một phần, chạy lại sẽ skip những cái đã áp dụng
```

---

## Các tính năng đã được cải thiện

### Bảo mật
- ✅ CSRF Protection cho tất cả POST/PUT/DELETE requests
- ✅ XSS Prevention với strict HTML whitelist
- ✅ Information Disclosure fix - không lộ thông tin admin
- ✅ JWT Refresh Token với Blacklist
- ✅ CSP Headers trong production

### Độ tin cậy
- ✅ Idempotency Key cho Order Creation
- ✅ Cart Clear là bước bắt buộc (không rollback được)
- ✅ Coupon Race Condition fix với FOR UPDATE
- ✅ Email Outbox Pattern - không mất email
- ✅ Pending Payment Auto-Cancel sau 48h
- ✅ Stock Notifications khi có hàng

### Hiệu năng
- ✅ Database Indexes cho search
- ✅ Order Status Constraints
- ✅ Payment Status Constraints

### UX
- ✅ Breadcrumb Navigation
- ✅ Order ID Format: `LS-YYYYMMDD-XXXXX`
- ✅ Stock warning khi < 5 cái
- ✅ Out-of-stock notification UI

---

## Lệnh hữu ích

```bash
# Chạy server
cd server && npm run dev

# Chạy frontend
cd client && npm run dev

# Chạy migrations
cd server && node run_migration.js

# Seed database
cd server && npm run seed

# Chạy tests
cd server && npm test

# Restart server (Windows)
taskkill /F /IM node.exe && npm run dev
```
