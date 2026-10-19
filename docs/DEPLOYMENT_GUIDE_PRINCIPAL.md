# LEARNING SUMMIT DEPLOYMENT AND OPERATIONS GUIDE (FOR SCHOOL LEADERSHIP AND IT)

---

## 1. LEARNING SUMMIT OVERVIEW

**Learning Summit** is an academic event platform built for the school. It covers two phases:

1. **Preparation (the weeks before the event):**
   * **End-of-day task dump:** Committees and students can lock the day's preparation list quickly.
   * **Personal checklist and deadlines:** Students create subtasks, set due dates, and mark progress.
   * **Schedule and registration:** Organizers create sessions, assign rooms, and set capacity.

2. **Event day (Summit Day, a single day):**
   * About **600+ students and teachers** can use the system at the same time.
   * **QR attendance:** Scanning a QR code at the classroom door records who actually attended.
   * **Feedback and custom forms:** Collect ratings immediately after each session.

---

## 2. LONG-TERM DEPLOYMENT OPTIONS

Two models can keep the system stable across school years:

| Criterion | **Option A: Dedicated VPS (Docker Compose + Nginx)** <br> *(RECOMMENDED FOR THE SCHOOL)* | **Option B: PaaS (Render / Vercel)** |
| :--- | :--- | :--- |
| **Fixed cost** | **Low and predictable:** about $5–$10 / month. | Free while idle; $20–$50+ / month during the Summit peak. |
| **Summit-day load** | Handles 600+ concurrent users smoothly, with no serverless execution timeout. | Can hit the bandwidth or request ceiling of the free plan. |
| **Data control** | All data stays on the school's own server and can be backed up every week. | Depends on a third-party cloud. |
| **Long-term operations** | School IT keeps the SSH key and turns on the automation script. | No server to administer; deploys through GitHub. |

---

## 3. SCHOOL-YEAR OPERATING CYCLE

1. **Start of the school year:**
   * An admin creates a new season (for example `2025-2026`).
   * Import the full student roster from Excel/CSV (`AdminStudents.tsx`).
2. **2–3 weeks before Summit:**
   * Organizers create sessions (room, speaker, number of seats).
   * Students register for the sessions they want.
   * Students and organizing teams use the **to-do list / end-of-day task dump** to prepare equipment.
3. **On Summit day:**
   * Organizers scan QR codes to take attendance in each room.
   * Live attendance shows on the admin screen.
4. **After the event:**
   * Export a full summary to Excel (`summit-tasks-export.xlsx`) for school leadership to archive.

---

## 4. DEPLOYING ON A VPS (YOUR OWN SERVER)

### Step 1: Create the VPS account and set up an SSH key
* Start an Ubuntu 22.04 LTS server (2GB+ RAM, 1 vCPU).
* Put the SSH public key in `~/.ssh/authorized_keys`.

### Step 2: Start the system with Docker Compose
The project is packaged as a monorepo and starts with one command:
```bash
# Clone the project from GitHub
git clone https://github.com/caubethieunang4030/schedule_website_vincent.git
cd schedule_website_vincent

# Start everything (frontend + API gateway + microservices + Postgres)
docker compose up -d --build
```

### Step 3: Domain name and SSL (HTTPS)
* Point the school domain (for example `summit.school.edu`) at the VPS IP address.
* Install an Nginx reverse proxy and a free Certbot certificate:
```bash
sudo apt install nginx certbot python3-certbot-nginx
sudo certbot --nginx -d summit.school.edu
```

---

## 5. CONCLUSION

**Learning Summit** has been rebuilt as a modern monorepo. It includes student preparation tools and an infrastructure setup that school leadership and the IT team can operate for the long term.
