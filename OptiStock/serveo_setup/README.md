# Serveo Tunnel Setup — M1 Inventory Frontend

## What it does
Creates a public URL for `localhost:5173` (Inventory frontend) so other modules can access it via the internet.

## How to use
1. Start all M1 services (Django backend + Vite frontend + Ngrok backend tunnel)
2. **Open a NEW terminal** and run:
   ```bash
   ssh -o ServerAliveInterval=60 -R 80:localhost:5173 serveo.net
   ```
3. You'll see output like:
   ```
   Forwarding HTTP traffic from https://RANDOM.serveo.net
   ```
4. **Copy that URL** (e.g. `https://abc123.serveo.net`)
5. Update `../.env`:
   ```
   VITE_POS_URL=https://M2_FRONTEND.serveo.net  ← Classmate A's M2 URL
   VITE_DASHBOARD_URL=https://M3_FRONTEND.serveo.net ← Classmate B's M3 URL
   ```

## Windows
Run `start_serveo_tunnel.bat` (requires SSH).

## Important
- Each restart = new random URL → update `.env` again
- Keep the terminal with serveo open while presenting
- M1 also needs Ngrok (separate) for backend API: `ngrok http 8000`
