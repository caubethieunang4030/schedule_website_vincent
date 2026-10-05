# KẾ HOẠCH TRIỂN KHAI VÀ SETUP HỆ THỐNG LEARNING SUMMIT
> **Dự án:** Learning Summit Web Application (Monorepo)
> **Mục tiêu:** Tái thiết lập quy trình Deploy tối ưu cho hệ thống quản lý sự kiện học thuật (~600+ người dùng đồng thời).
> **Ngày cập nhật:** 29/09/2026

---

## 1. TỔNG QUAN HẠ TẦNG VÀ PHƯƠNG ÁN TRIỂN KHAI (DEPLOYMENT OPTIONS)

Hệ thống **Learning Summit** là một **PNPM Monorepo** bao gồm:
1. **Frontend Client (`apps/summit`):** SPA React 19 + Vite + Tailwind v4 + Clerk Auth.
2. **Backend Services (`services/*`):** Express 5 API Gateway (Port 8080) và các Microservices (Users: 8081, Sessions: 8082, Feedback: 8083, Tasks: 8084, Notifications: 8085).
3. **Database Layer (`packages/db`):** PostgreSQL + Drizzle ORM.

---

### BẢNG SO SÁNH CÁC PHƯƠNG ÁN TRIỂN KHAI

| Tiêu chí | **Phương án 1: Single VPS + Docker Compose** <br>⭐ *(PHƯƠNG ÁN TỐI ƯU NHẤT)* | **Phương án 2: Hybrid Serverless (Vercel + Render + Managed DB)** | **Phương án 3: Self-hosted PaaS (Coolify / CapRover trên VPS)** |
| :--- | :--- | :--- | :--- |
| **Chi phí** | **Cố định & Rất rẻ:** $6 - $12 / tháng (~150k - 300k VNĐ). | Free-tier khi rảnh; **$20 - $50+** / tháng cao điểm Summit. | **Cố định:** $10 - $20 / tháng (tùy cấu hình VPS). |
| **Hiệu năng ngày Summit (600+ users)** | **Rất Cao & Tức Thì:** RAM 4GB/2 vCPU đáp ứng mượt mà, không bị cold-start hay timeout. | Phụ thuộc giới hạn Serverless (cold-start 15-30s & timeout request). | **Cao:** Quản lý tài nguyên linh hoạt qua Docker engine. |
| **Bảo mật & Quản lý dữ liệu** | **100% Chủ động:** Dữ liệu lưu trên VPS riêng, dễ dàng backup DB (`pg_dump`). | Phụ thuộc vào hạ tầng đám mây bên thứ 3 (Neon/Supabase/Render). | **Chủ động:** Lưu trên VPS riêng. |
| **Quy trình Deploy** | Đơn giản với 1 lệnh `docker compose up -d` hoặc CI/CD tự động qua SSH. | Tự động qua Git push (Vercel + Render). | Đơn giản qua Dashboard như Heroku. |
| **Đánh giá** | **Khuyên dùng số 1** cho môi trường nhà trường (tiết kiệm, ổn định, chịu tải tốt). | Phù hợp thử nghiệm / Demo ngắn hạn. | Phù hợp nếu muốn giao diện quản trị Web UI. |

---

## 2. CHUẨN BỊ MÔI TRƯỜNG & BIẾN MÔI TRƯỜNG (ENVIRONMENT VARIABLES)

### 2.1 Cấu hình phần cứng máy chủ VPS (Dành cho Phương án Tối ưu 1)
- **Hệ điều hành:** Ubuntu 22.04 LTS hoặc 24.04 LTS (64-bit).
- **Cấu hình đề xuất:** 2 vCPU, 4GB RAM, 40GB SSD (Ví dụ: Hetzner Cloud CX22, DigitalOcean, Linode hoặc VPS Việt Nam).
- **Phần mềm bắt buộc:** Docker (v24+), Docker Compose (v2+), Nginx, Git.

### 2.2 Danh sách Biến Môi Trường (`.env`)
Tạo file `.env` tại thư mục gốc của dự án trên máy chủ:

```env
# 1. Database Configuration
POSTGRES_USER=summit_user
POSTGRES_PASSWORD=SecurePassword123!
POSTGRES_DB=schedule_website_vincent
DATABASE_URL=postgresql://summit_user:SecurePassword123!@postgres:5432/schedule_website_vincent

# 2. Server & Session Configuration
PORT=8080
SESSION_SECRET=a_very_long_and_random_secret_string_32chars_min

# 3. Clerk Authentication (Lấy từ Clerk Dashboard)
CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...
```

---

## 3. CÁC BƯỚC SETUP TRIỂN KHAI CHI TIẾT (STEP-BY-STEP IMPLEMENTATION GUIDE)

### BƯỚC 1: Cấu hình Server VPS & Bảo mật ban đầu
```bash
# 1. Cập nhật hệ thống
sudo apt update && sudo apt upgrade -y

# 2. Cài đặt Docker & Docker Compose
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER

# 3. Thiết lập Firewall (UFW)
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw enable
```

### BƯỚC 2: Clone Repository & Khởi tạo Cấu hình
```bash
# Clone dự án từ GitHub
git clone https://github.com/caubethieunang4030/schedule_website_vincent.git
cd schedule_website_vincent

# Tạo file .env từ file mẫu và điền tham số thực tế
cp .env.example .env
nano .env
```

### BƯỚC 3: Triển khai bằng Docker Compose
Dự án đã tích hợp sẵn `Dockerfile` và `docker-compose.yml`.

```bash
# Khởi chạy toàn bộ hệ thống (PostgreSQL + API Monorepo Services)
docker compose up -d --build

# Kiểm tra trạng thái các Container
docker compose ps

# Xem log hoạt động
docker compose logs -f app
```

### BƯỚC 4: Chạy Database Migration & Seed Dữ liệu
```bash
# Chạy migration tạo bảng trong PostgreSQL
docker compose exec app pnpm db:push

# (Tùy chọn) Seed dữ liệu mẫu ban đầu cho sự kiện
docker compose exec app pnpm db:seed
```

### BƯỚC 5: Cấu hình Reverse Proxy Nginx & Cấp SSL Miễn Phí (HTTPS)
Cài đặt Nginx trên VPS để làm Reverse Proxy và quản lý chứng chỉ SSL:

```bash
# Cài đặt Nginx & Certbot
sudo apt install -y nginx certbot python3-certbot-nginx
```

Tạo file cấu hình Nginx tại `/etc/nginx/sites-available/summit`:
```nginx
server {
    server_name summit.truonghoc.edu.vn;

    location / {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Kích hoạt cấu hình và cấp chứng chỉ SSL tự động:
```bash
sudo ln -s /etc/nginx/sites-available/summit /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# Cấp HTTPS miễn phí qua Let's Encrypt
sudo certbot --nginx -d summit.truonghoc.edu.vn
```

---

## 4. QUY TRÌNH TỰ ĐỘNG HOÁ CI/CD VỚI GITHUB ACTIONS

Để mỗi khi bạn `git push` code mới lên nhánh `main`, server tự động pull và build lại:

Tạo tệp `.github/workflows/deploy.yml`:

```yaml
name: Deploy Learning Summit to VPS

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: SSH into VPS and redeploy
        uses: appleboy/ssh-action@v1.0.0
        with:
          host: ${{ secrets.VPS_IP }}
          username: ${{ secrets.VPS_USER }}
          key: ${{ secrets.VPS_SSH_KEY }}
          script: |
            cd /path/to/schedule_website_vincent
            git pull origin main
            docker compose up -d --build
            docker compose exec -T app pnpm db:push
```

---

## 5. QUY TRÌNH VẬN HÀNH & SAO LƯU DỮ LIỆU (MAINTENANCE & BACKUP)

### 5.1 Kịch bản Sao lưu Dữ liệu Tự động (Backup Postgres)
Thêm cron job sao lưu cơ sở dữ liệu hàng ngày vào `crontab -e`:

```bash
0 2 * * * docker exec summit_postgres pg_dump -U summit_user schedule_website_vincent | gzip > /var/backups/summit_db_$(date +\%Y\%m\%d).sql.gz
```

### 5.2 Checklist chuẩn bị trước Ngày Summit (Summit Day Readiness)
1. **Kiểm tra tài nguyên VPS:** Sử dụng `htop` đảm bảo RAM/CPU rảnh > 50%.
2. **Kiểm tra Clerk Auth Domain:** Đảm bảo Production Domain đã được whitelist trên Clerk Dashboard.
3. **Import danh sách học sinh:** Truy cập giao diện Admin -> Upload CSV/XLSX học sinh mới.
4. **Kiểm tra QR Scan:** Thử nghiệm quét QR code điểm danh từ 2-3 thiết bị di động thực tế.

---

## 7. PHƯƠNG PHÁP TRIỂN KHAI MIỄN PHÍ 100% TỒN TẠI VĨNH VIỄN (FREE-FOREVER OPTIONS)

Nếu bạn không muốn tốn chi phí duy trì hàng tháng và muốn ứng dụng chạy bền vững trong nhiều năm tới, dưới đây là **3 giải pháp miễn phí 100%** uy tín nhất:

### ⭐ GIẢI PHÁP A: Oracle Cloud Always Free VPS (Chi tiết Rủi ro & Giải pháp Khắc phục)
Oracle Cloud cung cấp gói **Always Free** vĩnh viễn:
- **Tài nguyên:** 4 OCPU ARM (Ampere A1), 24GB RAM, 200GB SSD, 10TB Băng thông/tháng.

⚠️ **CÁC RỦI RO THỰC TẾ CẦN LƯU Ý:**
1. **Thu hồi máy ảo do nhàn rỗi (Idle Resource Reclamation):** Nếu CPU dùng dưới 20% liên tục trong 7 ngày, Oracle có thể tự động thu hồi (terminate) VPS. Trang web trường học rảnh ban đêm/cuối tuần rất dễ dính bẫy này.
2. **Khó khăn khi đăng ký & Tạo máy (Out of Capacity):** Thẻ thanh toán quốc tế kiểm duyệt gắt gao, khu vực Singapore/Tokyo thường xuyên hết máy ARM rảnh.
3. **Tương thích Kiến trúc ARM64:** Docker container phải build và hỗ trợ `linux/arm64`. (Dự án `Learning Summit` hiện dùng `node:20-alpine` và `postgres:16-alpine` đều tương thích 100% với ARM64).

🛠️ **BIỆN PHÁP KHẮC PHỤC RỦI RO HOÀN HẢO:**
- **Nâng cấp tài khoản sang PAYG (Pay-As-You-Go):** Sau khi đăng ký thành công, hãy nâng cấp tài khoản lên PAYG. Khi nằm trong định mức Always Free (< 4 OCPU, 24GB RAM, 200GB SSD), **Oracle sẽ KHÔNG BAO GIỜ trừ tiền** nhưng tài khoản của bạn sẽ **KHÔNG BAO GIỜ bị quét thu hồi do nhàn rỗi**.
- **Sao lưu Dữ liệu Tự động Off-site:** Tạo Cron job dump PostgreSQL và tự động đẩy file nén lên Google Drive / GitHub Private Repo hàng ngày để bảo vệ dữ liệu điểm danh.

### ⭐ GIẢI PHÁP B: Tận dụng Máy tính cũ / Server của Trường + Cloudflare Tunnel (Bền vững nhất)
- **Cách hoạt động:** Dùng 1 máy tính cũ ở phòng máy / phòng IT nhà trường, cài Docker Compose.
- **Dùng Cloudflare Tunnel (Miễn phí 100%):**
  - Cài đặt `cloudflared` trên máy: `cloudflared tunnel run --url http://localhost:8080 summit-tunnel`
  - Cloudflare sẽ tự động cấp SSL HTTPS, tự động đưa trang web ra ngoài Internet mà **không cần mở Port router, không cần IP tĩnh**.
- **Ưu điểm:** Không sợ bất kỳ dịch vụ Cloud nào hủy gói Free, chạy ổn định suốt nhiều năm học.

### ⭐ GIẢI PHÁP C: Kết hợp Cloud Free Services (Cloudflare Pages + Render + Supabase + UptimeRobot)
1. **Frontend (Cloudflare Pages):**
   - Miễn phí 100% không giới hạn băng thông, tự cập nhật khi push code lên GitHub.
   - Build Command: `pnpm --filter @workspace/summit build`
   - Output Directory: `apps/summit/dist/public`
2. **Backend (Render Free Web Service):**
   - Tạo Web Service miễn phí trên Render cho `api-gateway`.
   - **Mẹo giữ Server luôn thức:** Đăng ký [UptimeRobot.com](https://uptimerobot.com) (Miễn phí), tạo HTTP Monitor ping đường dẫn `https://<ten-backend>.onrender.com/health` **5 phút/lần** để chống Render ngắt kết nối khi rảnh.
3. **Database (Supabase / Neon.tech Postgres Free):**
   - Supabase cấp **500MB PostgreSQL** miễn phí vĩnh viễn (dư thừa chứa dữ liệu cho nhiều năm).
4. **Authentication (Clerk Auth Free Tier):**
   - Miễn phí **10,000 người dùng hàng tháng (MAU)**.

---

## 8. TỔNG KẾT
- **Phương án sản xuất chuẩn:** Single VPS + Docker Compose.
- **Phương án miễn phí lâu dài nhất:** Oracle Cloud Always Free (Nâng cấp PAYG) HOẶC Server Trường + Cloudflare Tunnel.
- **Tệp kế hoạch chi tiết:** Đã lưu tại [`docs/DEPLOYMENT_IMPLEMENTATION_PLAN.md`](file:///Users/huynhduyanh/Git/schedule_website_vincent/docs/DEPLOYMENT_IMPLEMENTATION_PLAN.md).


