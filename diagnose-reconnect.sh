#!/bin/bash
echo "=== Camera Monitor Diagnostic ==="
echo ""

echo "1. Testing API health:"
curl -s http://localhost:3000/api/health | jq -r '.' 2>/dev/null || curl -s http://localhost:3000/api/health
echo ""

echo "2. Active FFmpeg processes before test:"
ps aux | grep ffmpeg | grep -v grep | wc -l
echo ""

echo "3. Testing individual camera streams (5 second timeout each):"
for i in {1..4}; do
    echo -n "Camera $i: "
    timeout 5s curl -s -I "http://localhost:3000/camera/$i/stream" | head -1 | cut -d' ' -f2-
done
echo ""

echo "4. Active FFmpeg processes after stream test:"
ps aux | grep ffmpeg | grep -v grep | wc -l
echo ""

echo "5. Server logs (last 10 lines):"
sudo journalctl -u camera-monitor -n 10 --no-pager | tail -10
echo ""

echo "=== Test complete ==="
echo "Now test 'Reconnect All' in the browser and monitor with:"
echo "sudo journalctl -u camera-monitor -f"
