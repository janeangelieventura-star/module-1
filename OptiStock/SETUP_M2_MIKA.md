# M2 Setup - Laptop ni Mika

## 1. Install MySQL 8
- Download: https://dev.mysql.com/downloads/installer/
- Tandaan ang MySQL password na ginamit

## 2. Create Database
```
mysql -u root -p
CREATE DATABASE pos_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
exit;
```

## 3. Get M2 code
**Kung bagong install:**
```
git clone https://github.com/cinnamika/POS-Management-System.git
cd POS-Management-System
```
**Kung na-clone na dati:**
```
cd POS-Management-System
git pull
```

## 4. Install dependencies
```
npm install
```

## 5. Setup .env (backend)
```
copy src\backend\.env.example src\backend\.env
```
Edit `src/backend/.env`:
```
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=[MySQL password ni Mika]
DB_NAME=pos_db
INVENTORY_API_URL=http://[IP NI JANE]:8000/api
EMAIL_USER=mikaellaa739@gmail.com
EMAIL_PASS=rtjbwbqsqxnkgdii
```

## 6. Setup .env (frontend)
```
copy .env.example .env
```
Edit `.env`:
```
VITE_INVENTORY_URL=http://[IP NI JANE]:5173
VITE_DASHBOARD_URL=http://[IP NI JANE]:5175
VITE_API_BASE_URL=
```

## 7. Import schema + seed data
```
mysql -u root -p pos_db < src\backend\schema.sql
```

## 8. Install Tailscale
- Download: https://tailscale.com/download
- Sign in (send invite from Jane's admin console)
- Run: `tailscale ip -4` → ibigay IP kay Jane

## 9. Build frontend & run
```
npm run build
node src/backend/server.js
```

## Access
- Local: http://localhost:8002
- Via Tailscale: http://[IP NI MIKA]:8002
- Login: admin@optistock.com / optistock
