#!/bin/bash
echo "Testing kiosk launcher..."

echo "1. Checking camera monitor service:"
sudo systemctl status camera-monitor | grep "Active:"

echo "2. Testing camera monitor API:"
curl -s http://localhost:3000/api/health | head -20

echo "3. Checking if X server is running:"
if xset q &>/dev/null; then
    echo "X server is running"
else
    echo "X server is NOT running"
fi

echo "4. Checking existing browser processes:"
ps aux | grep chromium | grep -v grep | wc -l

echo "5. Launching kiosk in test mode (will exit after 10 seconds)..."
timeout 10s /home/james/launch-kiosk.sh &
KIOSK_PID=$!

echo "Kiosk launcher PID: $KIOSK_PID"
echo "Waiting 10 seconds..."
sleep 10

echo "6. Checking if browser launched:"
ps aux | grep chromium | grep -v grep

echo "Test complete. Check the log at: /home/james/kiosk-launch.log"
