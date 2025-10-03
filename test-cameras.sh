#!/bin/bash
echo "Testing camera RTSP streams..."

# Read camera config
cameras=$(node -p "JSON.parse(require('fs').readFileSync('config.json', 'utf8')).cameras")

for i in {1..4}; do
    echo "Testing Camera $i stream endpoint..."
    timeout 5s curl -s -I "http://localhost:3000/camera/$i/stream" | head -3
    echo ""
done

echo "Camera configuration:"
node -p "JSON.parse(require('fs').readFileSync('config.json', 'utf8')).cameras.map(c => \`\${c.id}: \${c.name}\`).join('\n')"
