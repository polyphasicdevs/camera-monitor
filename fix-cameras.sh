#!/bin/bash
echo "=== Camera Monitor Recovery ==="

echo "1. Stopping any stuck processes..."
sudo pkill -f ffmpeg || true
sudo pkill -f chromium || true

echo "2. Clearing browser cache..."
rm -rf /tmp/chromium-kiosk* || true

echo "3. Restarting camera monitor service..."
sudo systemctl restart camera-monitor
sleep 3

echo "4. Checking service status..."
sudo systemctl status camera-monitor | grep "Active:"

echo "5. Testing API health..."
curl -s http://localhost:3000/api/health | head -20

echo "6. Testing camera endpoints (quick test)..."
for i in {1..4}; do
    echo -n "Camera $i: "
    timeout 3s curl -s -I "http://localhost:3000/camera/$i/stream" | head -1 | cut -d' ' -f2- || echo "TIMEOUT"
done

echo ""
echo "=== Recovery Complete ==="
echo "Now refresh your browser or run: ./launch-browser-now.sh"
echo "Monitor logs with: sudo journalctl -u camera-monitor -f"
