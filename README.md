# 💻 Laptop Store

> Website bán laptop trực tuyến — **React + Vite + Node.js (Express) + PostgreSQL**

Hệ thống gồm **frontend** (React SPA cho khách hàng + trang quản trị) và **backend** (REST API + JWT + CSRF + phân quyền chi tiết theo nhân viên).

---

## 📑 Mục lục
- [✨ Tính năng](#-tính-năng)
- [🧰 Yêu cầu hệ thống](#-yêu-cầu-hệ-thống)
- [🚀 Cài đặt nhanh (TL;DR)](#-cài-đặt-nhanh-tldr)
- [📦 Cài đặt chi tiết](#-cài-đặt-chi-tiết)
- [⚙️ Cấu hình môi trường](#️-cấu-hình-môi-trường)
- [🗄️ Khởi tạo Database & Seed dữ liệu](#️-khởi-tạo-database--seed-dữ-liệu)
- [▶️ Chạy dự án](#️-chạy-dự-án)
- [👤 Tài khoản mặc định](#-tài-khoản-mặc-định)
- [📂 Cấu trúc dự án](#-cấu-trúc-dự-án)
- [🛠️ Các lệnh hữu ích](#️-các-lệnh-hữu-ích)
- [🧯 Xử lý lỗi thường gặp](#-xử-lý-lỗi-thường-gặp)
- [🔒 Ghi chú bảo mật](#-ghi-chú-bảo-mật)
- [📜 License](#-license)

---

## ✨ Tính năng

### Khách hàng
- 🛒 Duyệt sản phẩm, lọc theo hãng / CPU / RAM / giá / tồn kho
- 🔎 Tìm kiếm thông minh theo tên, SKU, thông số
- ❤️ Yêu thích, lịch sử xem, so sánh sản phẩm
- 🛍️ Giỏ hàng + Checkout (COD, chuyển khoản QR)
- 💳 Áp dụng mã giảm giá
- 📦 Theo dõi đơn hàng, đánh giá sau khi nhận hàng
- 📍 Địa chỉ giao hàng (Tỉnh / Huyện / Xã) theo dữ liệu Việt Nam
- 📩 Liên hệ / Gửi yêu cầu hỗ trợ
- 🔐 Đăng nhập / Đăng ký / Quên mật khẩu qua OTP email

### Quản trị viên (Admin)
- 📊 Dashboard tổng quan (doanh thu, đơn, tồn kho)
- 📦 Quản lý sản phẩm (CRUD, upload nhiều ảnh, biến thể)
- 🏷️ Quản lý mã giảm giá
- 🛒 Quản lý đơn hàng (cập nhật trạng thái, xuất Excel)
- 👥 Quản lý người dùng
- 🔑 **Phân quyền nhân viên chi tiết** (theo từng action: xem / thêm / sửa / xoá / xuất báo cáo…)
- 📈 Phân tích kinh doanh (revenue, conversion, top sản phẩm)
- 📨 Quản lý tin nhắn liên hệ
- 📋 Nhật ký hoạt động (audit log)

### Nhân viên (Staff)
- Truy cập các trang được admin cấp quyền
- Không thể truy cập trang admin-only (Coupons, Settings, Phân quyền)

---

## 🧰 Yêu cầu hệ thống

| Phần mềm | Phiên bản tối thiểu | Ghi chú |
|----------|---------------------|---------|
| **Node.js** | 18.0+ (khuyến nghị 20 LTS) | [Tải tại đây](https://nodejs.org/) |
| **npm** | 9.0+ | Đi kèm với Node.js |
| **PostgreSQL** | 14+ | [Tải tại đây](https://www.postgresql.org/download/) |
| **Git** | Mới nhất | Để clone source |

> 💡 Nếu dùng Windows, chạy tất cả lệnh trong **PowerShell** hoặc **Git Bash**.

---

## 🚀 Cài đặt nhanh (TL;DR)

```bash
# 1. Clone
git clone <repository-url>
cd laptop-store

# 2. Cài dependencies (cả root, server, client)
npm run install-all

# 3. Tạo file .env cho server
cd server
copy .env.example .env     # Windows
# cp .env.example .env    # macOS / Linux

# 4. Sửa DATABASE_URL & JWT_SECRET trong server/.env (xem bên dưới)

# 5. Tạo database & chạy migrations + seed
cd ..
psql -U postgres -c "CREATE DATABASE shopmaytinh;"
cd server
npm run migrate
npm run seed

# 6. Chạy dev (cả server + client)
cd ..
npm run dev
```

Sau khi chạy:
- Frontend: http://localhost:5173
- Backend: http://localhost:5000/api/health

---

## 📦 Cài đặt chi tiết

### 1. Clone dự án
```bash
git clone <repository-url>
cd laptop-store
```

### 2. Cài đặt dependencies

Dự án dùng **npm workspaces kiểu thủ công** (root + `server/` + `client/`). Chạy:

```bash
# Cài tất cả cùng lúc
npm run install-all
```

Nếu lệnh trên lỗi, cài riêng từng phần:

```bash
# Root (chỉ chứa script concurrently)
npm install

# Backend
cd server
npm install

# Frontend
cd ../client
npm install

cd ..   # quay về root
```

---

## ⚙️ Cấu hình môi trường

### Backend — `server/.env`

Sao chép từ file mẫu:
```bash
cd server
copy .env.example .env       # Windows
# cp .env.example .env       # macOS / Linux
```

Mở file `server/.env` và chỉnh các giá trị **BẮT BUỘC** sau:

```env
# ===== DATABASE =====
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/shopmaytinh
# Thay YOUR_PASSWORD bằng mật khẩu user postgres bạn đã tạo khi cài PostgreSQL.

# ===== JWT (BẮT BUỘC thay đổi) =====
# Tạo secret ngẫu nhiên bằng:
#   node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
JWT_SECRET=THAY_BANG_CHUOI_NGAU_NHIEN_DAI_IT_NHAT_32_KY_TU
JWT_EXPIRE=15m
JWT_REFRESH_EXPIRE=30d

# ===== SERVER =====
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:5173

# ===== EMAIL (Gmail App Password) — Tùy chọn =====
# Nếu KHÔNG cấu hình, OTP và thông báo sẽ chỉ log ra console.
# 1. Bật xác thực 2 yếu tố cho Gmail
# 2. Tạo App Password: https://myaccount.google.com/apppasswords
# 3. Điền:
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-16-char-app-password
```

> ⚠️ **KHÔNG commit file `.env` lên git!** File đã nằm trong `.gitignore`.

### Frontend — `client/.env`

Mặc định đã có sẵn:
```env
VITE_API_URL=/api
```

Nếu backend không chạy cùng máy (hoặc deploy riêng), đổi thành:
```env
VITE_API_URL=https://your-api-domain.com/api
```

---

## 🗄️ Khởi tạo Database & Seed dữ liệu

### Bước 1 — Tạo database
```bash
# Đăng nhập vào PostgreSQL (nhập mật khẩu khi được hỏi)
psql -U postgres

# Trong shell psql:
CREATE DATABASE shopmaytinh;
\q
```

### Bước 2 — Chạy migrations (tạo tables)
```bash
cd server
npm run migrate
```

Lệnh này sẽ chạy tất cả file `.sql` trong `server/migrations/` theo thứ tự tên file (đã có date prefix).

> 💡 **Lưu ý cho SQL migration:** Nên viết theo hướng **idempotent** (tạo lại nhiều lần không lỗi):
> ```sql
> CREATE TABLE IF NOT EXISTS users (...);
> ALTER TABLE users ADD COLUMN IF NOT EXISTS permissions JSONB;
> ```
> Nếu gặp lỗi `column already exists` không nghiêm trọng, script sẽ tự bỏ qua và tiếp tục.

### Bước 3 — Seed dữ liệu mẫu (sản phẩm, user, đơn hàng)
```bash
npm run seed
```

Sau khi seed xong sẽ in ra:
```
✅ Seed hoàn tất!
   Admin: admin@gmail.com / Admin@123
   Staff: staff1@gmail.com / Staff@123
   Customer: customer1@gmail.com / Customer@123
```

---

## ▶️ Chạy dự án

Mở **2 terminal** (hoặc dùng script đi kèm):

### Cách 1 — Tự động (cả 2 cùng lúc)
```bash
# Từ thư mục root
npm run dev
```

Lệnh này sẽ khởi động:
- 🟢 Backend: http://localhost:5000
- 🔵 Frontend: http://localhost:5173

### Cách 2 — Chạy riêng từng phần

**Terminal 1 — Backend:**
```bash
cd server
npm run dev
```

**Terminal 2 — Frontend:**
```bash
cd client
npm run dev
```

### Script tiện ích (Windows)

Dự án có sẵn 2 file PowerShell ở root:
```powershell
# Khởi động lại cả 2 server
.\restart-servers.ps1

# Dừng tất cả node processes
.\kill-servers.ps1
```

### Kiểm tra nhanh

| URL | Kết quả mong đợi |
|-----|-------------------|
| http://localhost:5173 | Trang chủ React |
| http://localhost:5000/api/health | `{"success":true,"message":"Laptop Store API is running!"}` |

---

## 👤 Tài khoản mặc định

> ⚠️ **Đổi mật khẩu ngay sau khi cài đặt xong!**

| Vai trò | Email | Mật khẩu | Quyền |
|---------|-------|----------|-------|
| **Admin** | `admin` | `Admin123@` | Toàn quyền |
| **Staff** | `staff1@gmail.com` | `Staff@123` | Mặc định: xem + cập nhật (không xoá) |
| **Customer** | `customer1@gmail.com` | `Customer@123` | Mua hàng, xem đơn |

Có sẵn: `staff2`, `staff3` (cùng mật khẩu `Staff@123`) và `customer1` → `customer10` (cùng mật khẩu `Customer@123`).

**Reset mật khẩu admin** (nếu quên):
```bash
cd server
node reset_admin_pwd.js    # script có sẵn trong repo
```

---

## 📂 Cấu trúc dự án

```
laptop-store/
├── client/                      # Frontend (React + Vite)
│   ├── src/
│   │   ├── components/          # Component dùng chung
│   │   ├── pages/
│   │   │   ├── admin/           # Trang quản trị
│   │   │   ├── auth/            # Đăng nhập / Đăng ký
│   │   │   └── shop/            # Trang khách hàng
│   │   ├── hooks/               # Custom hooks (usePermission, ...)
│   │   ├── services/            # Axios + API service
│   │   ├── context/             # React Context (Auth, Cart, ...)
│   │   └── utils/               # Helper functions
│   ├── .env                     # Biến môi trường frontend
│   └── package.json
│
├── server/                      # Backend (Node.js + Express)
│   ├── config/                  # Cấu hình DB, logger
│   ├── controllers/             # Xử lý logic nghiệp vụ
│   ├── routes/                  # Định nghĩa API endpoints
│   ├── middleware/              # auth, csrf, rate-limit, upload
│   ├── migrations/              # Các file SQL chạy tuần tự
│   ├── seeders/                 # Dữ liệu mẫu
│   ├── jobs/                    # Background workers
│   ├── utils/                   # Helper functions
│   ├── uploads/                 # File upload local
│   ├── .env                     # Biến môi trường backend (TẠO THỦ CÔNG)
│   └── package.json
│
├── scripts/                     # Script tiện ích
├── logs/                        # File log server (tự sinh)
├── package.json                 # Root scripts (dev, install-all)
├── restart-servers.ps1          # Khởi động lại server (Windows)
├── kill-servers.ps1             # Dừng server (Windows)
└── README.md                    # File này
```

---

## 🛠️ Các lệnh hữu ích

### Root
```bash
npm run install-all  # Cài deps cho cả 3 nơi
npm run dev          # Chạy backend + frontend song song
npm run build        # Build production frontend
npm run seed         # Chạy seeder (data mẫu)
```

### Server (`cd server`)
```bash
npm run dev          # Chạy server (nodemon)
npm run start        # Chạy server bình thường (không auto-reload)
npm run migrate      # Chạy migrations
npm run seed         # Seed data mẫu
npm test             # Chạy Jest test
```

### Client (`cd client`)
```bash
npm run dev          # Vite dev server (HMR)
npm run build        # Build production vào dist/
npm run preview      # Xem thử bản build
```

---

## 🧯 Xử lý lỗi thường gặp

### ❌ `ECONNREFUSED 127.0.0.1:5432` (Postgres)
PostgreSQL chưa chạy. Khởi động service:
```bash
# Windows (PowerShell as Admin)
Start-Service postgresql-x64-14

# macOS
brew services start postgresql

# Linux
sudo systemctl start postgresql
```

### ❌ `password authentication failed for user "postgres"`
Sai mật khẩu trong `DATABASE_URL`. Cập nhật lại `server/.env`:
```env
DATABASE_URL=postgresql://postgres:YOUR_REAL_PASSWORD@localhost:5432/shopmaytinh
```

### ❌ `database "shopmaytinh" does not exist`
Chưa tạo database. Xem [Bước 1 — Tạo database](#bước-1--tạo-database).

### ❌ Vite log: `[vite] http proxy error: ECONNREFUSED`
**Không phải lỗi!** Đây là log tạm thời khi bạn vừa **restart backend** trong khi frontend đang polling.

Cách khắc phục dứt điểm:
1. Dừng cả frontend + backend: `Ctrl+C` trong terminal đang chạy `npm run dev`
2. Hoặc dùng script: `.\restart-servers.ps1` (sẽ kill cả 2 rồi start lại đồng bộ)
3. Đợi backend lên xong (~5s) → frontend sẽ tự kết nối lại

### ❌ `EADDRINUSE :::5000` (port 5000 đã bị chiếm)
```bash
# Tìm và kill process đang dùng port 5000
# Windows PowerShell:
Get-Process -Name node | Where-Object { $_.CommandLine -match 'server.js' } | Stop-Process -Force

# macOS / Linux:
lsof -ti:5000 | xargs kill -9
```

### ❌ `Port 5173 is already in use`
Đổi port trong `client/vite.config.js`:
```js
server: { port: 5174, ... }
```

### ❌ Lỗi CORS khi frontend gọi API
Kiểm tra `CLIENT_URL` trong `server/.env` đúng với URL frontend đang chạy.

### ❌ Migration báo lỗi `column already exists`
Một số migration **idempotent** (chạy lại OK), một số không. Nếu gặp, kiểm tra schema:
```bash
psql -U postgres -d shopmaytinh -c "\d users"
```
Nếu cột đã tồn tại → bỏ qua, chạy tiếp các migration sau.

### ❌ Ảnh sản phẩm không hiển thị
- Backend serve qua `/uploads` (xem `server/uploads/`)
- Kiểm tra proxy trong `client/vite.config.js` đã có `/uploads` chưa
- Nếu deploy production, cấu hình nginx/Apache serve folder `uploads/` hoặc dùng S3

### ❌ Email không gửi được
- Bật 2FA cho Gmail, tạo **App Password** (không phải mật khẩu Gmail thường)
- Kiểm tra firewall có chặn port 587 SMTP
- Nếu không cần gửi mail, **bỏ trống** `EMAIL_USER` / `EMAIL_PASS` — hệ thống sẽ log OTP ra console

### ❌ `MODULE_NOT_FOUND` khi chạy
Quên cài dependencies:
```bash
npm run install-all
```

---

## 🔒 Ghi chú bảo mật

1. **JWT_SECRET** phải là chuỗi ngẫu nhiên, ít nhất 32 ký tự. **KHÔNG dùng giá trị mặc định trong production.**
2. **CSRF protection** đã bật cho mọi request POST/PUT/DELETE — đừng tắt trừ khi biết rõ mình đang làm gì.
3. **Rate limiting** đã cấu hình (100 req/15 phút) — chống brute-force login.
4. **Helmet** đã bật — chống XSS, clickjacking, MIME sniffing.
5. **bcrypt** hash mật khẩu với salt round = 10.
6. **Soft-delete** cho users / products / orders — không xoá cứng dữ liệu nhạy cảm.
7. **Audit log** ghi lại mọi thao tác quan trọng (tạo / sửa / xoá user, đổi role, cập nhật quyền...).
8. **Permissions JSONB** trong bảng `users` cho phép phân quyền chi tiết từng action — đừng bypass bằng cách set `role = 'admin'`.

---

## 📦 Công nghệ sử dụng

### Frontend
- **React 18** + **Vite 5** (HMR cực nhanh)
- **React Router 6**
- **Tailwind CSS 3**
- **lucide-react** (icons)
- **Axios** (HTTP client + interceptor)
- **react-hot-toast** (notification)
- **recharts** (biểu đồ)
- **jsPDF + xlsx** (xuất PDF / Excel)

### Backend
- **Node.js 18+** + **Express 4**
- **PostgreSQL 14+** với `pg` driver
- **jsonwebtoken** (JWT access + refresh)
- **bcryptjs** (hash password)
- **joi** (validation)
- **helmet** + **cors** + **express-rate-limit** (security)
- **multer** (file upload)
- **nodemailer** (gửi email)
- **xlsx** (đọc/ghi Excel)

---

## 📜 License

MIT © Laptop Store Team
