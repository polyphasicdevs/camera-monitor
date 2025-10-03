# Camera Monitor System

A web-based RTSP camera monitoring system designed for Raspberry Pi with auto-launch at boot and fullscreen display.

## Features

- 4-camera grid layout optimized for fullscreen viewing
- Secure credential management via configuration file
- Auto-launch at boot with kiosk mode
- Real-time RTSP streaming via WebSocket and FFmpeg
- Connection status indicators and automatic reconnection
- Responsive design with fullscreen controls

## Setup Complete ✅

The system has been installed and configured to run automatically at boot.

## Configuration

### Camera Credentials

Edit the camera credentials in the secure configuration file:

```bash
nano /home/james/camera-monitor/config.json
```

Update the RTSP URLs for your cameras. Example:
```json
{
  "cameras": [
    {
      "id": 1,
      "name": "Front Door",
      "rtsp_url": "rtsp://admin:password@192.168.0.85:554/Streaming/Channels/101"
    },
    {
      "id": 2,
      "name": "Back Yard", 
      "rtsp_url": "rtsp://user:pass@192.168.0.86:554/stream"
    }
  ]
}
```

**Important**: The config file has secure permissions (600) - only you can read/write it.

### Service Management

```bash
# Check service status
sudo systemctl status camera-monitor

# Restart after config changes
sudo systemctl restart camera-monitor

# View logs
sudo journalctl -u camera-monitor -f

# Stop service
sudo systemctl stop camera-monitor

# Start service
sudo systemctl start camera-monitor
```

## Manual Testing

You can test the system manually before reboot:

```bash
cd /home/james/camera-monitor

# Start server manually
npm start
# or
./start.sh

# Then open browser to http://localhost:3000
```

## Auto-Launch Setup

The system is configured to:

1. **Start server at boot**: systemd service `camera-monitor.service`
2. **Launch browser in kiosk**: Desktop autostart launches Chromium in fullscreen

## File Structure

```
/home/james/camera-monitor/
├── server.js           # Express server with WebSocket streaming
├── config.json         # Secure camera credentials (chmod 600)
├── package.json        # Node.js dependencies
├── start.sh           # Manual start script
├── public/
│   ├── index.html     # Frontend interface
│   └── app.js         # Client-side JavaScript
└── README.md          # This file

/home/james/.config/autostart/
└── camera-kiosk.desktop  # Auto-launch browser at login

/home/james/launch-kiosk.sh  # Kiosk launcher script

/etc/systemd/system/
└── camera-monitor.service   # System service configuration
```

## Accessing the Interface

- **Local**: http://localhost:3000
- **Network**: http://[raspberry-pi-ip]:3000
- **Auto-launch**: Automatically opens in fullscreen at boot

## Controls

- **Fullscreen Toggle**: Click "Fullscreen" button or press F11
- **Reconnect**: Click "Reconnect All" to restart all camera streams
- **Status Indicators**: Green = connected, Red = disconnected

## Troubleshooting

### Camera Connection Issues
1. Verify RTSP URLs are correct in `config.json`
2. Test RTSP streams manually with VLC or ffmpeg
3. Check network connectivity to cameras
4. Review service logs: `sudo journalctl -u camera-monitor -f`

### Service Not Starting
```bash
# Check service status
sudo systemctl status camera-monitor

# Check logs
sudo journalctl -u camera-monitor -n 50
```

### Browser Not Auto-Launching
1. Ensure you're logged into the desktop environment
2. Check autostart file: `~/.config/autostart/camera-kiosk.desktop`
3. Test script manually: `~/launch-kiosk.sh`

## Security Notes

- Camera credentials are stored in `config.json` with 600 permissions
- Server binds to all interfaces (0.0.0.0) - restrict network access as needed
- Consider VPN or firewall rules for remote access

## Performance Optimization

For better performance on Raspberry Pi:
- Reduce video bitrate in `config.json` under `ffmpeg` settings
- Use hardware-accelerated codecs if available
- Limit concurrent streams if experiencing lag

## Recent Updates ✨

### Fixed Multiple Camera Issues
- **Replaced complex WebSocket/MP4 streaming** with reliable MJPEG streaming
- **Fixed JavaScript errors** that occurred with multiple cameras
- **Improved error handling** and connection stability
- **Added favicon endpoint** to prevent 404 errors
- **Enhanced reconnection logic** with visual feedback

### New Features
- **Better loading indicators** with connection attempt counters
- **Improved fullscreen controls** that auto-hide in kiosk mode
- **Mouse-activated controls** in fullscreen mode
- **Responsive design** for different screen sizes
- **Health check endpoint** at `/api/health`

### Testing Tools
```bash
# Test all camera streams
./test-cameras.sh

# Check server health
curl http://localhost:3000/api/health
```

## Technical Details

### Streaming Method
The system now uses **Motion JPEG (MJPEG)** streaming instead of MP4 fragments:
- More reliable for multiple concurrent streams
- Lower latency and better compatibility
- Simpler client-side implementation using `<img>` elements
- Better error recovery and reconnection

### Performance Notes
- MJPEG streams are set to 15 FPS to reduce Raspberry Pi load
- Each camera stream is independent and can fail/recover individually
- FFmpeg processes are automatically cleaned up when clients disconnect
- Memory usage is optimized for continuous operation

## Troubleshooting Updates

### New Error Patterns to Watch For
```bash
# Check if camera streams are accessible
./test-cameras.sh

# Monitor FFmpeg processes
ps aux | grep ffmpeg

# Check detailed service logs
sudo journalctl -u camera-monitor -f --no-pager
```

### Common Issues and Solutions
1. **"Connection failed" on specific camera**: Check RTSP URL in `config.json`
2. **High CPU usage**: Reduce FPS or resolution in server.js
3. **Memory leaks**: Restart service with `sudo systemctl restart camera-monitor`


## Display Optimization Update 🖥️

### Enhanced Full-Screen Experience
- **Expanded camera feeds**: Changed from `object-fit: contain` to `object-fit: cover` for maximum screen usage
- **Minimal gaps**: Reduced grid gaps to 1px for seamless display
- **No borders in fullscreen**: Clean, professional monitoring display
- **Higher resolution streams**: Upgraded to 960x720 @ 12fps for crisp image quality

### Visual Improvements
- **Modern UI elements**: Enhanced with backdrop filters and subtle shadows
- **Better status indicators**: Improved connection status with glowing effects
- **Responsive labels**: Cleaner camera name display with better contrast
- **Optimized controls**: Refined control buttons with better visibility

### Smart Layout Features
- **Ultra-wide support**: Automatically switches to 4-column layout on ultra-wide screens
- **Portrait mode**: Stacks cameras vertically on portrait displays
- **High DPI optimization**: Larger text on high-resolution displays
- **Fullscreen perfection**: Zero gaps and borders when in fullscreen mode

### Performance Enhancements
- **Multi-threaded encoding**: FFmpeg now uses 2 threads for better performance
- **Enhanced monitoring**: Detailed performance metrics in health endpoint
- **Smarter cleanup**: Improved memory management and stream cleanup

### Current Configuration
- **Resolution**: 960x720 per camera feed
- **Frame Rate**: 12 FPS (balanced quality/performance)
- **Quality**: Higher quality JPEG encoding (q:v=6)
- **Layout**: 2x2 grid optimized for full-screen viewing

The camera feeds now utilize the full screen real estate while maintaining excellent image quality! Perfect for dedicated monitoring displays.
