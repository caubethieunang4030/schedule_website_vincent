# Báo Cáo Review Code & Kế Hoạch Cải Tiến (Gap Summit)

Tài liệu này tổng hợp kết quả đánh giá chất lượng mã nguồn của dự án **schedule_website_vincent** cùng với kế hoạch chi tiết (checklist) để khắc phục các vấn đề đã được phát hiện.

---

## 1. Đánh Giá Chất Lượng Code Hiện Tại

### Ưu điểm
*   **Cấu trúc Monorepo tối ưu**: Sử dụng `pnpm-workspaces` chia nhỏ module rõ ràng (`lib/db`, `lib/api-zod`, `artifacts/summit`, `artifacts/api-server`).
*   **Xác thực và Phân quyền**: Tích hợp Clerk chặt chẽ kết hợp với kiểm tra email học sinh (`.edu`, `.org`).
*   **Validation mạnh mẽ**: Dữ liệu đầu vào của API được xác thực bằng Zod schema dùng chung từ `@workspace/api-zod`.

### Nhược điểm & Rủi ro
1.  **Hiệu năng Database**: Việc sử dụng nhiều truy vấn rời rạc thay vì SQL JOIN trong hàm `decorateSessions` tăng độ trễ.
2.  **Race Conditions**: Việc kiểm tra sức chứa (capacity) của Session ở tầng ứng dụng dễ dẫn đến tình trạng đăng ký quá giới hạn khi có nhiều request đồng thời.
3.  **Lỗ hổng logic xác thực Email**: Hàm kiểm tra đuôi email `.org` hoặc `.edu` sử dụng `endsWith` đơn giản có thể bị đánh lừa bởi các tên miền con (subdomain) giả mạo.

---

## 2. Kế Hoạch Khắc Phục (Fixing Checklist Plan)

### 🟩 Tầng Database & API Backend (`artifacts/api-server`)

- [ ] **Tối ưu hóa hàm `decorateSessions`**
    *   [ ] Refactor truy vấn trong [sessions.ts](file:///Users/huynhduyanh/Git/schedule_website_vincent/artifacts/api-server/src/routes/sessions.ts) sử dụng SQL JOIN hoặc Subquery để lấy tổng số lượt đăng ký (`registeredCount`) và trạng thái đăng ký của user hiện tại (`isRegistered`) chỉ trong 1 câu SQL.
    *   [ ] Đo lường lại thời gian phản hồi (response time) trước và sau tối ưu.

- [ ] **Xử lý triệt để Race Conditions khi đăng ký**
    *   [ ] Sử dụng Database Transactions với cơ chế Row Lock (`FOR UPDATE`) khi kiểm tra capacity.
    *   [ ] Hoặc: Thiết lập ràng buộc (Constraint) hoặc điều kiện trực tiếp tại câu lệnh INSERT để đảm bảo không chèn bản ghi mới nếu đã đạt giới hạn.

- [ ] **Cải thiện độ chính xác của hàm xác thực Email**
    *   [ ] Cập nhật hàm `isSchoolEmail` trong [auth.ts](file:///Users/huynhduyanh/Git/schedule_website_vincent/artifacts/api-server/src/lib/auth.ts) để tách phần domain đứng sau ký tự `@` trước khi kiểm tra hậu tố tên miền.
    *   [ ] Viết unit tests kiểm nghiệm với các trường hợp email hợp lệ/không hợp lệ (Ví dụ: `fake@edu.attacker.com` phải bị từ chối).

- [ ] **Tái cấu trúc mã nguồn (Refactoring Codebase)**
    *   [ ] Áp dụng mô hình **Controller Pattern** tách rời business logic ra khỏi file định tuyến Route.
    *   [ ] Tạo global error handling middleware để thống nhất cấu trúc phản hồi lỗi dạng JSON.

### 🟦 Tầng Giao Diện Người Dùng (`artifacts/summit`)

- [ ] **Xử lý trạng thái tải (Loading) & Race Conditions trên UI**
    *   [ ] Vô hiệu hóa (Disable) nút đăng ký ngay khi người dùng click để ngăn chặn gửi nhiều request trùng lặp.
    *   [ ] Hiển thị skeleton loader khi cập nhật lại danh sách session đăng ký.

- [ ] **Tối ưu hóa Cache của React Query**
    *   [ ] Cấu hình tối ưu `staleTime` và `gcTime` để hạn chế gọi lại API liên tục khi chuyển đổi qua lại giữa các tab trong màn hình Dashboard/Schedule.

---

## 3. Lộ Trình Phát Triển Tính Năng Mới (Feature Roadmap)

- [ ] **Tính năng Điểm danh thông minh (Smart Attendance)**
    *   [ ] Sinh mã QR động cho Faculty/Admin có thời gian hết hạn ngắn (tự làm mới mỗi 10 giây).
    *   [ ] Tích hợp quét mã QR trực tiếp bằng Camera điện thoại của sinh viên trên ứng dụng web.
- [ ] **Xuất báo cáo & Dữ liệu**
    *   [ ] Cho phép Admin/Faculty xuất kết quả phản hồi biểu mẫu (Feedback & Forms) ra định dạng file CSV/Excel.
- [ ] **Đồng bộ lịch cá nhân**
    *   [ ] Hỗ trợ xuất lịch biểu của sinh viên dưới dạng file `.ics` (iCal) để thêm vào Apple Calendar hoặc Google Calendar.
