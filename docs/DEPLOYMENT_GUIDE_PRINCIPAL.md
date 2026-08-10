# TÀI LIỆU HƯỚNG DẪN TRIỂN KHAI VÀ QUẢN TRỊ DỰ ÁN LEARNING SUMMIT (DÀNH CHO BAN GIÁM HIỆU & BỘ PHẬN CNTT)

---

## 1. TỔNG QUAN HỆ THỐNG LEARNING SUMMIT

Hệ thống **Learning Summit** được thiết kế dưới dạng nền tảng quản lý sự kiện học thuật đa năng dành riêng cho nhà trường. Hệ thống đáp ứng 2 giai đoạn chính:

1. **Giai đoạn Chuẩn bị (Trước sự kiện vài tuần):**
   * **Bỏ việc cuối ngày (Daily Task Dump):** Cho phép các ban chuyên trách/học sinh chốt nhanh danh sách việc cần chuẩn bị cuối mỗi ngày.
   * **Checklist cá nhân & Hạn chót:** Học sinh tự tạo các việc con, thiết lập hạn hoàn thành và đánh dấu tiến độ công việc.
   * **Lịch trình & Đăng ký:** Tổ chức các phiên hội thảo (Session), phân bổ phòng học, giới hạn sức chứa.

2. **Ngày diễn ra sự kiện (Summit Day - 1 ngày duy nhất):**
   * Cho phép khoảng **600+ học sinh và giáo viên** truy cập đồng thời.
   * **Điểm danh tự động (QR Code & Pi 5 Sync):** Quét mã QR tại cửa phòng học để ghi nhận tham dự thực tế.
   * **Khảo sát & Phản hồi (Feedback & Custom Forms):** Thu thập đánh giá tức thì sau mỗi phiên hội thảo.

---

## 2. SO SÁNH CÁC PHƯƠNG ÁN TRIỂN KHAI LÂU DÀI

Để nhà trường có thể vận hành ổn định qua nhiều năm học, chúng tôi đề xuất 2 mô hình triển khai:

| Tiêu chí | **Phương án A: VPS Riêng (Docker Compose + Nginx)** <br> *(KHUYÊN DÙNG CHO NHÀ TRƯỜNG)* | **Phương án B: Nền tảng PaaS (Render / Vercel)** |
| :--- | :--- | :--- |
| **Chi phí cố định** | **Rất rẻ & Cố định:** ~$5 - $10 / tháng (~120k - 250k VNĐ/tháng). | Miễn phí khi rảnh; tăng lên $20 - $50+ / tháng trong tháng cao điểm Summit. |
| **Tải cao điểm ngày Summit** | Đảm bảo xử lý mượt mà cho 600+ người dùng đồng thời, không bị giới hạn thời gian thực thi (Serverless Timeout). | Có nguy cơ bị chạm trần giới hạn băng thông/request của gói miễn phí. |
| **Bảo mật dữ liệu** | Toàn bộ dữ liệu nằm trên máy chủ riêng của nhà trường, có thể chủ động sao lưu (Backup) hàng tuần. | Phụ thuộc vào hạ tầng đám mây của bên thứ 3. |
| **Quản trị lâu dài** | Cần IT nhà trường giữ SSH Key và kích hoạt script tự động. | Không cần quản trị server, tự động hóa qua GitHub. |

---

## 3. QUY TRÌNH VẬN HÀNH THUẬN TIỆN THEO NĂM HỌC (SEASONAL WORKFLOW)

1. **Đầu năm học mới:**
   * Quản trị viên chọn tạo Season mới (ví dụ `2025-2026`).
   * Import danh sách học sinh toàn trường qua file Excel/CSV (`AdminStudents.tsx`).
2. **2 - 3 tuần trước Summit:**
   * Ban tổ chức tạo danh sách các Session (phòng, diễn giả, số lượng chỗ).
   * Học sinh vào đăng ký các phiên học theo nguyện vọng.
   * Học sinh và các nhóm ban tổ chức sử dụng mục **To-Do List / Bỏ việc cuối ngày** để chuẩn bị trang thiết bị.
3. **Trong ngày Summit:**
   * Ban tổ chức dùng tính năng quét mã QR / Pi 5 để điểm danh tại từng phòng.
   * Xem báo cáo tham dự thời gian thực trên màn hình Admin.
4. **Sau sự kiện:**
   * Xuất báo cáo tổng kết toàn bộ dữ liệu ra file Excel (`summit-tasks-export.xlsx`) để lưu trữ cho Ban Giám Hiệu.

---

## 4. HƯỚNG DẪN TRIỂN KHAI TRÊN VPS (MÁY CHỦ RIÊNG)

### Bước 1: Tạo tài khoản VPS & Cấu hình SSH Key
* Khởi tạo máy chủ Ubuntu 22.04 LTS (RAM 2GB+, 1 vCPU).
* Đưa SSH Public Key vào `~/.ssh/authorized_keys`.

### Bước 2: Chạy hệ thống bằng Docker Compose
Dự án được đóng gói dạng **Monorepo chuẩn**, sẵn sàng chạy chỉ với 1 lệnh:
```bash
# Clone dự án từ GitHub
git clone https://github.com/caubethieunang4030/schedule_website_vincent.git
cd schedule_website_vincent

# Chạy toàn bộ hệ thống (Frontend + API Gateway + Microservices + Postgres DB)
docker compose up -d --build
```

### Bước 3: Cấu hình Tên Miền & SSL (HTTPS)
* Trỏ tên miền trường (ví dụ: `summit.truonghoc.edu.vn`) về IP của VPS.
* Cài đặt Nginx Reverse Proxy và cấp chứng chỉ bảo mật miễn phí Certbot SSL:
```bash
sudo apt install nginx certbot python3-certbot-nginx
sudo certbot --nginx -d summit.truonghoc.edu.vn
```

---

## 5. KẾT LUẬN

Hệ thống **Learning Summit** đã được tái cấu trúc theo chuẩn Monorepo hiện đại, tích hợp đầy đủ tính năng chuẩn bị công việc cho học sinh và hạ tầng sẵn sàng bàn giao cho Ban Giám Hiệu cũng như Bộ phận CNTT nhà trường quản lý lâu dài.
