# Tài liệu Yêu cầu Người dùng (User Requirements)
**Dự án:** Website Lịch trình Gap Learning Summit

---

## 1. User Stories (Câu chuyện người dùng)

Dưới đây là 3 User Stories tiêu biểu đại diện cho 3 nhóm đối tượng chính sử dụng hệ thống:

**User Story 1: Học sinh (Student)**
> "Là một **Học sinh**, tôi muốn có thể **lọc danh sách sự kiện theo khối học của mình** (Lower, Middle, Upper) để tôi **có thể dễ dàng tìm và đăng ký những lớp học phù hợp với độ tuổi thay vì phải xem toàn bộ lịch trình hỗn loạn**."

**User Story 2: Diễn giả (Speaker / Faculty)**
> "Là một **Diễn giả**, tôi muốn **xem thông tin chi tiết về phòng học được phân công** (Tên phòng, Vị trí, Thời gian bắt đầu/kết thúc) trên giao diện cá nhân để tôi **có thể đến đúng địa điểm và chuẩn bị máy chiếu/tài liệu trước khi buổi Workshop bắt đầu**."

**User Story 3: Người tổ chức (Organizer / Admin)**
> "Là một **Người tổ chức**, tôi muốn **có thể chỉnh sửa thông tin chi tiết của một sự kiện** (như đổi tên, dời giờ, đổi phòng) trực tiếp thông qua giao diện Quản trị (CMS) để tôi **có thể cập nhật lịch trình ngay lập tức cho toàn bộ học sinh khi có sự cố phát sinh (ví dụ: trời mưa phải đổi phòng học ngoài trời)**."

---

## 2. Use Cases Chi Tiết (Kịch bản sử dụng)

Được chiết xuất từ các User Story ở phần trên, dưới đây là chi tiết các bước tương tác giữa Người dùng (Actor) và Hệ thống.

### Use Case 1: Lọc sự kiện theo khối học (Filter Sessions by Track)
*(Ánh xạ từ User Story 1)*

- **Actor (Người thực hiện):** Học sinh (Student).
- **Pre-condition (Điều kiện tiên quyết):** 
  - Học sinh đã đăng nhập vào hệ thống thành công (qua Clerk).
  - Học sinh đang ở màn hình danh sách Lịch trình ("Schedule").

- **Main Flow (Luồng chính):**
  1. Học sinh truy cập trang "Schedule" trên ứng dụng Web.
  2. Hệ thống tải dữ liệu và hiển thị toàn bộ danh sách các sự kiện trong ngày Learning Summit.
  3. Học sinh nhấn vào menu thả xuống (Dropdown) để chọn bộ lọc "Track" trên giao diện.
  4. Học sinh chọn khối học của mình (Ví dụ: "Middle").
  5. Hệ thống (Frontend) nhận diện thay đổi và tự động lọc danh sách sự kiện (chỉ giữ lại các sự kiện có gắn thẻ `track: "middle"` hoặc `track: "all"`).
  6. Hệ thống làm mới giao diện ngay lập tức và hiển thị danh sách các sự kiện đã được lọc ra.

- **Alternative Flow (Luồng thay thế / Lỗi):**
  - **5a. Không có sự kiện nào phù hợp:** 
    1. Nếu sau khi lọc, danh sách trả về là rỗng.
    2. Hệ thống hiển thị giao diện rỗng (Empty State) với thông báo: *"Không có sự kiện nào phù hợp với bộ lọc hiện tại. Bạn đang có thời gian rảnh!"*
  - **5b. Mất kết nối mạng khi đang tải API (Nếu lọc từ Server):**
    1. Hệ thống báo lỗi Toast màu đỏ: *"Không thể tải danh sách sự kiện. Vui lòng kiểm tra lại kết nối mạng."*
    2. Giữ nguyên trạng thái danh sách trước khi lọc và hiện nút "Thử lại" (Retry).

---

### Use Case 2: Chỉnh sửa thông tin sự kiện (Update Session Information)
*(Ánh xạ từ User Story 3)*

- **Actor (Người thực hiện):** Người tổ chức (Organizer / Admin).
- **Pre-condition (Điều kiện tiên quyết):** 
  - Người dùng đã đăng nhập thành công và có quyền hạn Admin (role: "organizer" hoặc "admin").
  - Đang ở trong trang Quản lý Sự kiện (CMS/Admin Dashboard).

- **Main Flow (Luồng chính):**
  1. Organizer tìm và nhấn vào sự kiện muốn thay đổi thông tin (ví dụ: Workshop "Robotics Build Lab").
  2. Nhấn vào nút "Chỉnh sửa" (Edit Session).
  3. Hệ thống hiển thị một biểu mẫu (Form) Popup/Modal đã được điền sẵn các dữ liệu hiện tại của sự kiện (Tiêu đề, Mô tả, Phòng học, Sức chứa...).
  4. Organizer tiến hành xóa tên phòng cũ và nhập tên phòng mới (Ví dụ đổi từ "M-110" sang "M-115").
  5. Organizer nhấn nút "Lưu thay đổi" (Save/Update).
  6. Hệ thống (Frontend) gửi một yêu cầu cập nhật `PUT /api/sessions/:id` chứa dữ liệu mới lên Máy chủ (Backend).
  7. Backend API tiếp nhận, xác thực quyền Admin của người gửi, và chạy câu lệnh UPDATE vào Cơ sở dữ liệu Neon (PostgreSQL).
  8. Hệ thống trả về kết quả Thành công (200 OK). Frontend đóng Form, hiển thị thông báo Toast màu xanh *"Cập nhật sự kiện thành công"* và tải lại dữ liệu mới lên màn hình.

- **Alternative Flow (Luồng thay thế / Lỗi):**
  - **7a. Dữ liệu nhập vào không hợp lệ (Validation Error):**
    1. Nếu Organizer vô tình nhập Sức chứa (Capacity) là một số âm.
    2. Middleware Zod trên Backend (hoặc Frontend) từ chối yêu cầu.
    3. Hệ thống không lưu vào Database, trả về lỗi. Frontend bôi đỏ ô nhập liệu đó kèm dòng chữ cảnh báo *"Sức chứa phải là một số lớn hơn 0"*.
  - **7b. Hết phiên đăng nhập hoặc không đủ quyền:**
    1. Backend kiểm tra Token và phát hiện Token đã hết hạn, trả về mã lỗi `401 Unauthorized`.
    2. Hệ thống hủy thao tác lưu, hiện thông báo lỗi và yêu cầu Organizer đăng nhập lại.
