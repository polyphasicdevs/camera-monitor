#!/bin/bash
echo "Setting up Raspberry Pi for kiosk mode..."

# Disable screen blanking and power management
echo "Disabling screen blanking..."
if ! grep -q "xset s off" /home/james/.bashrc; then
    echo 'xset s off 2>/dev/null' >> /home/james/.bashrc
    echo 'xset -dpms 2>/dev/null' >> /home/james/.bashrc
    echo 'xset s noblank 2>/dev/null' >> /home/james/.bashrc
fi

# Create or update LXDE autostart if it exists
LXDE_AUTOSTART="/home/james/.config/lxsession/LXDE-pi/autostart"
if [ -d "/home/james/.config/lxsession/LXDE-pi/" ]; then
    echo "Updating LXDE autostart..."
    mkdir -p /home/james/.config/lxsession/LXDE-pi/
    cat > "$LXDE_AUTOSTART" << 'LXDE_EOF'
@lxpanel --profile LXDE-pi
@pcmanfm --desktop --profile LXDE-pi
@xscreensaver -no-splash
@xset s off
@xset -dpms
@xset s noblank
@/home/james/launch-kiosk.sh
LXDE_EOF
fi

# Create openbox autostart if needed
OPENBOX_AUTOSTART="/home/james/.config/openbox/autostart"
if command -v openbox >/dev/null 2>&1; then
    echo "Setting up OpenBox autostart..."
    mkdir -p /home/james/.config/openbox/
    cat > "$OPENBOX_AUTOSTART" << 'OPENBOX_EOF'
# Disable screen blanking
xset s off &
xset -dpms &
xset s noblank &

# Launch camera monitor kiosk
/home/james/launch-kiosk.sh &
OPENBOX_EOF
    chmod +x "$OPENBOX_AUTOSTART"
fi

echo "Kiosk boot setup complete!"
echo ""
echo "The system will now:"
echo "1. Disable screen blanking/power management"
echo "2. Auto-launch the camera monitor at login"
echo "3. Start in fullscreen kiosk mode"
echo ""
echo "To test without rebooting, run: ./test-kiosk.sh"
echo "To check logs after reboot: tail -f /home/james/kiosk-launch.log"
