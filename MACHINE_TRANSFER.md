# 🔄 Checklist Chuyển Sang Máy Mới

> In ra file này hoặc copy vào Notion/Trello để tick từng bước khi setup trên máy mới.

## ☐ Bước 1 — Cài công cụ hệ thống
- [ ] Cài **Node.js 18+** (https://nodejs.org/)
- [ ] Cài **PostgreSQL 14+** (https://www.postgresql.org/download/)
- [ ] (Tuỳ chọn) Cài **Git** + **Git Bash** (Windows) / XCode CLI (macOS)
- [ ] Mở PowerShell/Terminal, kiểm tra:
  ```bash
  node --version    # phải >= v18
  npm --version
  psql --version    # phải >= 14
  ```

## ☐ Bước 2 — Khởi động PostgreSQL
- [ ] Đảm bảo PostgreSQL service đang chạy
- [ ] Nhớ mật khẩu user `postgres` (sẽ cần cho `DATABASE_URL`)
- [ ] Tạo database trống `shopmaytinh`:
  ```bash
  psql -U postgres -c "CREATE DATABASE shopmaytinh;"
  ```

## ☐ Bước 3 — Copy source code
- [ ] Copy toàn bộ thư mục `laptop-store/` sang máy mới
- [ ] (Khuyến nghị) Dùng Git thay vì copy thủ công:
  ```bash
  git clone <repository-url>
  cd laptop-store
  ```

## ☐ Bước 4 — Cài dependencies
- [ ] Mở terminal tại thư mục root dự án
- [ ] Chạy:
  ```bash
  npm run install-all
  ```
- [ ] Kiểm tra xuất hiện `node_modules/` ở 3 nơi: `root`, `server/`, `client/`

## ☐ Bước 5 — Tạo file `.env` cho Backend
- [ ] Vào thư mục `server/`
- [ ] Copy file mẫu:
  ```bash
  copy .env.example .env     # Windows
  # cp .env.example .env     # macOS/Linux
  ```
- [ ] Mở `server/.env`, điền **BẮT BUỘC**:
  - [ ] `DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/shopmaytinh`
  - [ ] `JWT_SECRET=` (generate random bằng lệnh `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"`)
- [ ] (Tuỳ chọn) Điền Gmail App Password nếu muốn gửi email thật

## ☐ Bước 6 — Verify file `.env` cho Frontend
- [ ] Vào thư mục `client/`
- [ ] Nếu chưa có `.env`, copy từ `.env.example`:
  ```bash
  copy .env.example .env
  ```
- [ ] Mặc định `VITE_API_URL=/api` đã đúng cho local dev

## ☐ Bước 7 — Chạy migrations
- [ ] Tại `server/`:
  ```bash
  npm run migrate
  ```
- [ ] Phải thấy: `✅ Thành công: N` (N = số file SQL)
- [ ] Nếu lỗi → xem [Lỗi thường gặp](#-lỗi-thường-gặp) trong README

## ☐ Bước 8 — Seed dữ liệu mẫu
- [ ] Tại `server/`:
  ```bash
  npm run seed
  ```
- [ ] Phải thấy thông báo seed xong + danh sách tài khoản

## ☐ Bước 9 — Khởi động
- [ ] Tại root, chạy:
  ```bash
  npm run dev
  ```
- [ ] Đợi cả 2 dòng:
  - `VITE ready in ...` (frontend)
  - `🚀 Server is running on port 5000` (backend)

## ☐ Bước 10 — Verify
- [ ] Mở http://localhost:5173 → thấy trang chủ React
- [ ] Mở http://localhost:5000/api/health → thấy `{"success":true,...}`
- [ ] Login bằng `admin@gmail.com / Admin@123` → vào được trang quản trị
- [ ] Thử truy cập http://localhost:5173/admin/products → thấy danh sách sản phẩm

## ☐ Bước 11 — Đổi mật khẩu mặc định (BẮT BUỘC cho production)
- [ ] Đăng nhập admin → đổi mật khẩu
- [ ] Hoặc chạy:
  ```bash
  cd server
  node reset_admin_pwd.js
  ```

## ☐ Xong! 🎉
Nếu tất cả đều ✅ thì dự án chạy ngon. Nếu có lỗi, xem README.md mục **🧯 Xử lý lỗi thường gặp**.
