# LEARNING SUMMIT DEPLOYMENT AND SETUP PLAN
> **Project:** Learning Summit Web Application (Monorepo)
> **Goal:** Rebuild a deployment process that can run the academic event system under load (~600+ concurrent users).
> **Updated:** 29/09/2026

---

## 1. INFRASTRUCTURE OVERVIEW AND DEPLOYMENT OPTIONS

**Learning Summit** is a **pnpm monorepo** with:
1. **Frontend client (`apps/summit`):** React 19 SPA + Vite + Tailwind v4 + Clerk Auth.
2. **Backend services (`services/*`):** Express 5 API gateway (port 8080) and microservices (Users: 8081, Sessions: 8082, Feedback: 8083, Tasks: 8084, Notifications: 8085).
3. **Database layer (`packages/db`):** PostgreSQL + Drizzle ORM.

---

### DEPLOYMENT OPTIONS COMPARED

| Criterion | **Option 1: Single VPS + Docker Compose** <br>⭐ *(BEST FIT)* | **Option 2: Hybrid serverless (Vercel + Render + managed DB)** | **Option 3: Self-hosted PaaS (Coolify / CapRover on a VPS)** |
| :--- | :--- | :--- | :--- |
| **Cost** | **Fixed and low:** $6–$12 / month. | Free tier while idle; **$20–$50+** / month at the Summit peak. | **Fixed:** $10–$20 / month (depends on the VPS size). |
| **Summit-day performance (600+ users)** | **High and immediate:** 4GB RAM / 2 vCPU stays smooth, with no cold start or timeout. | Limited by serverless constraints (15–30s cold start and request timeouts). | **High:** Docker manages resources flexibly. |
| **Security and data control** | **Fully under your control:** data lives on your VPS and is easy to back up (`pg_dump`). | Depends on a third-party cloud (Neon/Supabase/Render). | **Under your control:** data lives on your VPS. |
| **Deploy process** | One command, `docker compose up -d`, or automatic CI/CD over SSH. | Automatic on git push (Vercel + Render). | A dashboard, similar to Heroku. |
| **Assessment** | **First choice** for a school: cheaper, stable, and able to take the load. | Fine for a short trial or demo. | Fine if you want a web admin UI. |

---

## 2. ENVIRONMENT SETUP AND ENVIRONMENT VARIABLES

### 2.1 VPS hardware (for Option 1)
- **Operating system:** Ubuntu 22.04 LTS or 24.04 LTS (64-bit).
- **Suggested size:** 2 vCPU, 4GB RAM, 40GB SSD (for example Hetzner Cloud CX22, DigitalOcean, or Linode).
- **Required software:** Docker (v24+), Docker Compose (v2+), Nginx, Git.

### 2.2 Environment variables (`.env`)
Create a `.env` file in the project root on the server:

```env
# 1. Database configuration
POSTGRES_USER=summit_user
POSTGRES_PASSWORD=SecurePassword123!
POSTGRES_DB=schedule_website_vincent
DATABASE_URL=postgresql://summit_user:SecurePassword123!@postgres:5432/schedule_website_vincent

# 2. Server and session configuration
PORT=8080
SESSION_SECRET=a_very_long_and_random_secret_string_32chars_min

# 3. Clerk authentication (from the Clerk dashboard)
CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...
```

---

## 3. STEP-BY-STEP SETUP

### STEP 1: Configure the VPS and the initial firewall
```bash
# 1. Update the system
sudo apt update && sudo apt upgrade -y

# 2. Install Docker and Docker Compose
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER

# 3. Configure the firewall (UFW)
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw enable
```

### STEP 2: Clone the repository and create the config
```bash
# Clone the project from GitHub
git clone https://github.com/caubethieunang4030/schedule_website_vincent.git
cd schedule_website_vincent

# Create .env from the example and fill in real values
cp .env.example .env
nano .env
```

### STEP 3: Deploy with Docker Compose
The project already includes a `Dockerfile` and `docker-compose.yml`.

```bash
# Start the whole system (PostgreSQL + API monorepo services)
docker compose up -d --build

# Check container status
docker compose ps

# Follow the logs
docker compose logs -f app
```

### STEP 4: Run the database migration and seed data
```bash
# Create the PostgreSQL tables
docker compose exec app pnpm db:push

# (Optional) Seed sample event data
docker compose exec app pnpm db:seed
```

### STEP 5: Nginx reverse proxy and a free SSL certificate (HTTPS)
Install Nginx on the VPS as a reverse proxy and to manage the SSL certificate:

```bash
# Install Nginx and Certbot
sudo apt install -y nginx certbot python3-certbot-nginx
```

Create the Nginx config at `/etc/nginx/sites-available/summit`:
```nginx
server {
    server_name summit.school.edu;

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

Enable the config and issue the certificate:
```bash
sudo ln -s /etc/nginx/sites-available/summit /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# Free HTTPS through Let's Encrypt
sudo certbot --nginx -d summit.school.edu
```

---

## 4. AUTOMATIC CI/CD WITH GITHUB ACTIONS

So that every `git push` to `main` makes the server pull and rebuild:

Create `.github/workflows/deploy.yml`:

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

## 5. OPERATIONS AND BACKUPS

### 5.1 Automatic Postgres backup
Add a daily database backup to `crontab -e`:

```bash
0 2 * * * docker exec summit_postgres pg_dump -U summit_user schedule_website_vincent | gzip > /var/backups/summit_db_$(date +\%Y\%m\%d).sql.gz
```

### 5.2 Summit-day readiness checklist
1. **Check VPS resources:** use `htop` and keep RAM/CPU more than 50% free.
2. **Check the Clerk auth domain:** the production domain must be allowlisted in the Clerk dashboard.
3. **Import the student list:** Admin → upload a CSV/XLSX of new students.
4. **Check QR scanning:** try attendance QR codes from 2–3 real phones.

---

## 7. FREE DEPLOYMENT OPTIONS THAT CAN KEEP RUNNING

If you do not want a monthly bill and you want the app to keep running for years, these are the three most reliable free options:

### OPTION A: Oracle Cloud Always Free VPS (risks and how to handle them)
Oracle Cloud offers a permanent **Always Free** plan:
- **Resources:** 4 ARM OCPUs (Ampere A1), 24GB RAM, 200GB SSD, 10TB bandwidth / month.

**REAL RISKS TO WATCH:**
1. **Idle resource reclamation:** if CPU stays under 20% for 7 days in a row, Oracle can terminate the VPS. A school site that is quiet at night and on weekends can hit this.
2. **Signup and capacity:** international cards are reviewed strictly, and the Singapore/Tokyo regions often have no free ARM capacity.
3. **ARM64 compatibility:** Docker images must build for `linux/arm64`. This project uses `node:20-alpine` and `postgres:16-alpine`, which both support ARM64.

**HOW TO REMOVE THE RISK:**
- **Upgrade the account to Pay-As-You-Go:** after signup, switch the account to PAYG. While you stay inside the Always Free limits (< 4 OCPU, 24GB RAM, 200GB SSD), **Oracle does not charge you**, and the account is **not reclaimed for being idle**.
- **Off-site database backups:** a cron job dumps PostgreSQL and uploads the archive to Google Drive or a private GitHub repo every day, so attendance data is protected.

### OPTION B: An old school computer or the school server, plus a Cloudflare Tunnel
- **How it works:** use an old computer in the lab or the IT room and run Docker Compose on it.
- **Cloudflare Tunnel (free):**
  - Install `cloudflared` and run: `cloudflared tunnel run --url http://localhost:8080 summit-tunnel`
  - Cloudflare issues HTTPS and publishes the site **without opening router ports and without a static IP**.
- **Why it lasts:** it does not depend on a cloud vendor canceling a free plan, so it can run across many school years.

### OPTION C: Combined free cloud services (Cloudflare Pages + Render + Supabase + UptimeRobot)
1. **Frontend (Cloudflare Pages):**
   - Free, with no bandwidth cap, and it rebuilds when you push to GitHub.
   - Build command: `pnpm --filter @workspace/summit build`
   - Output directory: `apps/summit/dist/public`
2. **Backend (Render free web service):**
   - Create a free Render web service for `api-gateway`.
   - **Keep the server awake:** sign up at [UptimeRobot.com](https://uptimerobot.com) (free) and create an HTTP monitor that pings `https://<backend-name>.onrender.com/health` **every 5 minutes** so Render does not spin the service down while it is idle.
3. **Database (Supabase / Neon.tech free Postgres):**
   - Supabase includes **500MB of PostgreSQL** on the free plan, which is enough for several years of this data.
4. **Authentication (Clerk free tier):**
   - **10,000 monthly active users** are included.

---

## 8. SUMMARY
- **Standard production option:** single VPS + Docker Compose.
- **Longest-lasting free option:** Oracle Cloud Always Free (upgraded to PAYG), or the school server + a Cloudflare Tunnel.
- **This plan lives at** [`docs/DEPLOYMENT_IMPLEMENTATION_PLAN.md`](docs/DEPLOYMENT_IMPLEMENTATION_PLAN.md).
