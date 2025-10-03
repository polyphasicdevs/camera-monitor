#!/bin/bash
echo "Launching camera monitor in browser now..."

# Kill any existing chromium processes
pkill -f chromium || true
sleep 2

# Launch in kiosk mode
DISPLAY=:0 chromium \
    --no-sandbox \
    --disable-web-security \
    --disable-infobars \
    --disable-session-crashed-bubble \
    --disable-restore-session-state \
    --kiosk \
    --start-fullscreen \
    --app=http://localhost:3000 \
    --user-data-dir=/tmp/chromium-kiosk-test \
    > /home/james/chromium-manual.log 2>&1 &

echo "Browser launched! Check /home/james/chromium-manual.log for any errors."
echo "The camera monitor should now be visible in fullscreen."
