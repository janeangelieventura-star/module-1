#!/bin/bash
# Serveo Tunnel for M1 Inventory Frontend
# Exposes localhost:5173 via a public URL
# URL format: https://RANDOM.serveo.net
# Copy the URL and update ../.env VITE_POS_URL and VITE_DASHBOARD_URL
echo "Starting Serveo tunnel to port 5173..."
echo "Wait for the 'Forwarding' message, then copy the https URL."
echo ""
ssh -o ServerAliveInterval=60 -R 80:localhost:5173 serveo.net
echo ""
echo "Tunnel closed."
