# Camera Monitor

A lightweight, real-time IP camera monitoring system built with Node.js and Express. Features a clean web interface that displays multiple RTSP camera feeds in a 2x2 grid layout, perfect for security monitoring or kiosk displays.

## ✨ Features

- **Real-time MJPEG streaming** from RTSP cameras
- **2x2 grid layout** optimized for fullscreen viewing  
- **Auto-reconnection** with progressive retry delays
- **Kiosk mode** with automatic fullscreen
- **Health monitoring** and stream management
- **Responsive design** adapting to different screen sizes
- **Conservative resource usage** with 8fps @ 640x480 for reliability
- **Manual reconnection controls** for individual cameras or all at once

## 🚀 Quick Start

### Prerequisites
- **Node.js** (v14 or higher)
- **FFmpeg** with RTSP support
- **IP cameras** with RTSP streaming capability

### Installation

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd camera-monitor
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure your cameras:**
   ```bash
   cp config.example.json config.json
   ```
   Edit `config.json` with your camera details (see Configuration section below)

4. **Start the server:**
   ```bash
   npm start
   ```

5. **Open in browser:**
   Navigate to `http://localhost:3000`

## 📝 Configuration

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

### RTSP URL Formats

Common RTSP URL patterns for different camera brands:

- **Hikvision:** `rtsp://username:password@ip:554/Streaming/Channels/101`
- **Dahua:** `rtsp://username:password@ip:554/cam/realmonitor?channel=1&subtype=0`
- **Axis:** `rtsp://username:password@ip:554/axis-media/media.amp`
- **Generic:** `rtsp://username:password@ip:port/stream`

## 🏢 Architecture

### Backend (Node.js/Express)
- **MJPEG streaming server** using FFmpeg to transcode RTSP streams
- **RESTful API** for camera configuration and health monitoring
- **Stream management** with automatic cleanup and memory leak prevention
- **Progressive reconnection** with backoff strategy

### Frontend (Vanilla JavaScript)
- **Responsive grid layout** with CSS Grid
- **Real-time stream display** using MJPEG over HTTP
- **Connection status indicators** and error handling
- **Manual control interface** for stream management

### RTSP Processing Pipeline
```
RTSP Source → FFmpeg → MJPEG → HTTP Stream → Browser Display
```

## 🔒 Security Considerations

### Credential Management
- **Never commit** `config.json` with real credentials to version control
- Use **strong passwords** for camera accounts  
- Consider **VPN access** for remote monitoring
- Enable **camera firmware updates** regularly

### Network Security
- **Isolate cameras** on separate VLAN if possible
- **Change default passwords** on all cameras
- **Disable unnecessary services** on cameras
- **Monitor network traffic** for anomalies

**Important**: The config file should have secure permissions (600) - only you can read/write it.

## 🔧 API Endpoints

### Camera Management
- `GET /api/cameras` - List configured cameras
- `GET /camera/:id/stream` - MJPEG stream for specific camera
- `POST /api/camera/:id/cleanup` - Force cleanup streams for camera

### Health & Monitoring
- `GET /api/health` - System health and active stream status

Example health response:
```json
{
  "status": "ok",
  "activeStreams": 4,
  "streamsByCamera": {
    "1": { "count": 1, "uptime": 3600 }
  },
  "uptime": 7200,
  "configuredCameras": 4
}
```

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

## 🐛 Troubleshooting

### Common Issues

#### 1. FFmpeg Not Found
```bash
# Install FFmpeg
# Ubuntu/Debian:
sudo apt update && sudo apt install ffmpeg

# macOS:
brew install ffmpeg

# Verify installation:
ffmpeg -version
```

#### 2. Camera Won't Connect
- **Check network connectivity:** `ping camera-ip`
- **Verify RTSP URL format** for your camera model
- **Test with VLC:** Open the RTSP URL in VLC Media Player
- **Check credentials:** Ensure username/password are correct
- **Firewall issues:** Check if port 554 (RTSP) is accessible

#### 3. High CPU Usage
- **Reduce resolution:** Lower the `-vf scale` parameter
- **Decrease frame rate:** Lower the `-r` parameter  
- **Increase quality value:** Higher `-q:v` number = lower quality/CPU usage
- **Limit concurrent streams:** Monitor `/api/health` endpoint

#### 4. Memory Leaks
The application includes automatic cleanup mechanisms:
- **30-minute stream timeout**
- **Periodic cleanup** every 20 minutes
- **Process monitoring** and restart capabilities

### Debug Mode
Enable verbose logging by modifying `server.js`:
```javascript
// Uncomment for detailed FFmpeg output
// console.log(`FFmpeg stderr: ${data.toString()}`);
```

### Service Management Issues
```bash
# Check service status
sudo systemctl status camera-monitor

# Check logs
sudo journalctl -u camera-monitor -n 50
```

### Browser Auto-Launch Issues
1. Ensure you're logged into the desktop environment
2. Check autostart file: `~/.config/autostart/camera-kiosk.desktop`
3. Test script manually: `~/launch-kiosk.sh`

## 📊 Performance Optimization

### Hardware Recommendations
- **CPU:** Multi-core processor (4+ cores recommended for 4 cameras)
- **RAM:** 4GB minimum, 8GB recommended
- **Network:** Gigabit Ethernet for multiple high-resolution streams
- **Storage:** SSD recommended for faster startup

### Scaling Considerations
- **Single camera:** ~50-100MB RAM, 10-20% CPU
- **Four cameras:** ~200-400MB RAM, 40-80% CPU
- **Network bandwidth:** ~2-5 Mbps per camera stream

### Stream Configuration
The application uses conservative settings for reliability:
- **Resolution:** 640x480
- **Frame Rate:** 8 FPS
- **Quality:** Level 8 (balanced)
- **Transport:** TCP (reliable)

### Customization
Modify FFmpeg parameters in `server.js`:
```javascript
const ffmpegArgs = [
  '-rtsp_transport', 'tcp',
  '-i', camera.rtsp_url,
  '-f', 'mjpeg',
  '-vf', 'scale=1280:720',  // Higher resolution
  '-r', '15',               // Higher frame rate
  '-q:v', '5',              // Higher quality
  // ... other options
];
```

## 🔧 Utility Scripts

### Camera Testing
```bash
# Test all camera endpoints
./test-cameras.sh
```

### Recovery & Maintenance
```bash
# Fix stuck processes and restart services
./fix-cameras.sh
```

## 🎆 Version History

- **v1.0.0** - Initial release with 2x2 grid layout and RTSP streaming
- Conservative settings for reliability
- Auto-reconnection with progressive backoff
- Kiosk mode support
- Health monitoring API

## 🤝 Contributing

1. **Fork the repository**
2. **Create a feature branch:** `git checkout -b feature-name`
3. **Make changes and test thoroughly**
4. **Commit with clear messages:** `git commit -m "Add feature description"`
5. **Push and create pull request**

## 📄 License

This project is licensed under the ISC License - see the package.json file for details.

---

**Note:** This application is designed for local network use. For internet-facing deployments, implement additional security measures including HTTPS, authentication, and access controls.

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
