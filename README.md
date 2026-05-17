# 🐉 LchRyu Online Judge

Chào mừng đến với **LchRyu Online Judge** — Hệ thống chấm bài hiện đại, mạnh mẽ và đầy cá tính. Tên gọi được kết hợp từ initials của nhà sáng lập (Lch - Lương Chung Hồi) và biểu tượng Rồng (Ryu) đầy sức mạnh.

## 🏛️ Kiến trúc tổng thể (System Architecture)

Hệ thống được thiết kế theo mô hình **Microservices/Phân tán nhẹ**, tách biệt hoàn toàn giữa phần Web (giao diện & API) và phần Chấm bài (Judge Engine) để đảm bảo an toàn và hiệu năng.

Hệ thống bao gồm 4 thành phần chính:

1.  **Web Frontend:** Giao diện tương tác người dùng phong cách LeetCode cực "vibe".
2.  **Backend API:** Node.js/TypeScript xử lý logic nghiệp vụ và quản lý dữ liệu.
3.  **Message Queue:** Redis/BullMQ điều phối bài nộp bất đồng bộ.
4.  **Judge Engine:** Sandbox an toàn (Judge0/Isolate) để biên dịch và chấm mã nguồn.

---

## 🛠️ Công nghệ sử dụng (Tech Stack)

*   **Frontend:** React, Next.js 15+, Tailwind CSS, Monaco Editor, Lucide Icons.
*   **Backend:** Node.js, Express, TypeORM, PostgreSQL/SQLite.
*   **Security:** JWT, Bcrypt hashing.
*   **Judge Core:** Judge0 (hỗ trợ 50+ ngôn ngữ lập trình).

---

## ✨ Các tính năng nổi bật
*   **Đa người dùng:** Hệ thống Register/Login hoàn chỉnh.
*   **Profile Cá nhân:** Tùy chỉnh thông tin, thay đổi Avatar (presets hoặc upload).
*   **Admin Dashboard:** Quản lý bài tập, upload test case hàng loạt bằng file ZIP.
*   **Chấm bài Real-time:** Xem kết quả ngay lập tức với đầy đủ thông số Time/Memory.

---

## 🚀 Hướng dẫn khởi động nhanh (Local)

1.  **Backend:**
    ```bash
    cd backend
    npm install
    npm run seed # Khởi tạo tài khoản admin (admin/admin123)
    npm run dev
    ```
2.  **Frontend:**
    ```bash
    cd frontend
    npm install
    npm run dev
    ```
3.  **Truy cập:** `http://localhost:3000`

---

**Phát triển bởi LchRyu Team. Hẹn gặp lại bạn ở những bản cập nhật tiếp theo! 🐉**
