class CameraMonitor {
    constructor() {
        this.cameras = [];
        this.reconnectAttempts = new Map();
        this.maxReconnectAttempts = 5;
        this.reconnectTimeouts = new Map();
        this.isReconnecting = new Map();
        
        this.init();
    }
    
    async init() {
        try {
            // Fetch camera configuration
            const response = await fetch('/api/cameras');
            this.cameras = await response.json();
            
            console.log('Loaded cameras:', this.cameras);
            
            // Initialize video streams for each camera
            this.cameras.forEach(camera => {
                this.setupCamera(camera.id, camera.name);
            });
            
            // Auto-fullscreen after 3 seconds (for kiosk mode)
            // Only if we're not already in fullscreen
            setTimeout(() => {
                if (!document.fullscreenElement && !document.webkitFullscreenElement) {
                    this.enterFullscreen();
                }
            }, 3000);
            
        } catch (error) {
            console.error('Failed to initialize camera monitor:', error);
        }
    }
    
    setupCamera(cameraId, cameraName) {
        const img = document.getElementById(`video-${cameraId}`);
        const status = document.getElementById(`status-${cameraId}`);
        const loading = document.getElementById(`loading-${cameraId}`);
        const label = document.querySelector(`#camera-${cameraId} .camera-label`);
        
        if (label) {
            label.textContent = cameraName;
        }
        
        // Initialize reconnection tracking
        this.isReconnecting.set(cameraId, false);
        
        this.connectCamera(cameraId);
    }
    
    connectCamera(cameraId) {
        // Prevent multiple simultaneous connection attempts
        if (this.isReconnecting.get(cameraId)) {
            console.log(`Camera ${cameraId} already reconnecting, skipping...`);
            return;
        }
        
        this.isReconnecting.set(cameraId, true);
        
        const img = document.getElementById(`video-${cameraId}`);
        const status = document.getElementById(`status-${cameraId}`);
        const loading = document.getElementById(`loading-${cameraId}`);
        
        // Show loading state
        if (loading) {
            loading.style.display = 'block';
            loading.textContent = 'Connecting...';
            loading.style.color = '#888';
        }
        if (status) status.classList.remove('connected');
        
        // Clear any existing image source first
        img.src = '';
        
        // Reset reconnection attempts for manual connections
        if (this.reconnectAttempts.get(cameraId) === undefined) {
            this.reconnectAttempts.set(cameraId, 0);
        }
        
        // Add a small delay before connecting to prevent overwhelming the server
        setTimeout(() => {
            // Set up the image source for MJPEG stream with cache-busting
            const streamUrl = `/camera/${cameraId}/stream?t=${Date.now()}&r=${Math.random()}`;
            console.log(`Connecting to camera ${cameraId} stream:`, streamUrl);
            
            // Set up event handlers before setting src
            img.onload = () => {
                console.log(`Camera ${cameraId} stream connected`);
                if (loading) loading.style.display = 'none';
                if (status) status.classList.add('connected');
                this.reconnectAttempts.set(cameraId, 0);
                this.isReconnecting.set(cameraId, false);
            };
            
            img.onerror = (event) => {
                console.error(`Camera ${cameraId} stream error:`, event);
                this.isReconnecting.set(cameraId, false);
                this.handleConnectionError(cameraId);
            };
            
            img.onabort = () => {
                console.log(`Camera ${cameraId} stream aborted`);
                this.isReconnecting.set(cameraId, false);
                // Don't treat abort as an error, it might be intentional
            };
            
            // Set the source to start the stream
            img.src = streamUrl;
        }, cameraId * 100); // Stagger connections by 100ms per camera
    }
    
    handleConnectionError(cameraId) {
        const status = document.getElementById(`status-${cameraId}`);
        const loading = document.getElementById(`loading-${cameraId}`);
        const img = document.getElementById(`video-${cameraId}`);
        
        if (status) status.classList.remove('connected');
        
        // Clear any existing timeouts
        const existingTimeout = this.reconnectTimeouts.get(cameraId);
        if (existingTimeout) {
            clearTimeout(existingTimeout);
        }
        
        const attempts = this.reconnectAttempts.get(cameraId) || 0;
        if (attempts < this.maxReconnectAttempts) {
            this.reconnectAttempts.set(cameraId, attempts + 1);
            const delay = 3000 + (attempts * 2000); // Longer delays: 3s, 5s, 7s, 9s, 11s
            
            if (loading) {
                loading.textContent = `Connection lost. Retrying in ${Math.ceil(delay/1000)}s... (${attempts + 1}/${this.maxReconnectAttempts})`;
                loading.style.display = 'block';
                loading.style.color = '#ffa500';
            }
            
            const timeout = setTimeout(() => {
                console.log(`Auto-reconnecting camera ${cameraId}, attempt ${attempts + 1}`);
                this.connectCamera(cameraId);
            }, delay);
            
            this.reconnectTimeouts.set(cameraId, timeout);
        } else {
            if (loading) {
                loading.textContent = 'Connection failed - check camera settings';
                loading.style.color = '#ff4444';
                loading.style.display = 'block';
            }
            // Clear the image source
            img.src = '';
            this.isReconnecting.set(cameraId, false);
        }
    }
    
    reconnectCamera(cameraId) {
        console.log(`Manual reconnect for camera ${cameraId}`);
        
        // Clear any existing timeouts
        const existingTimeout = this.reconnectTimeouts.get(cameraId);
        if (existingTimeout) {
            clearTimeout(existingTimeout);
            this.reconnectTimeouts.delete(cameraId);
        }
        
        // Reset reconnection attempts and flags
        this.reconnectAttempts.set(cameraId, 0);
        this.isReconnecting.set(cameraId, false);
        
        // Clear the current image
        const img = document.getElementById(`video-${cameraId}`);
        if (img) {
            img.src = '';
        }
        
        // Reconnect after a short delay
        setTimeout(() => {
            this.connectCamera(cameraId);
        }, 500);
    }
    
    reconnectAll() {
        console.log('Reconnecting all cameras with staggered timing...');
        
        // Update UI to show reconnection in progress
        this.cameras.forEach(camera => {
            const loading = document.getElementById(`loading-${camera.id}`);
            const status = document.getElementById(`status-${camera.id}`);
            if (loading) {
                loading.textContent = 'Reconnecting...';
                loading.style.display = 'block';
                loading.style.color = '#888';
            }
            if (status) {
                status.classList.remove('connected');
            }
        });
        
        // Reconnect cameras with staggered timing to prevent overwhelming the server
        this.cameras.forEach((camera, index) => {
            setTimeout(() => {
                this.reconnectCamera(camera.id);
            }, index * 1000); // 1 second delay between each camera
        });
    }
    
    enterFullscreen() {
        const element = document.documentElement;
        
        if (element.requestFullscreen) {
            element.requestFullscreen().catch(err => {
                console.log('Fullscreen request failed:', err);
            });
        } else if (element.webkitRequestFullscreen) {
            element.webkitRequestFullscreen();
        } else if (element.msRequestFullscreen) {
            element.msRequestFullscreen();
        }
    }
    
    exitFullscreen() {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        } else if (document.webkitExitFullscreen) {
            document.webkitExitFullscreen();
        } else if (document.msExitFullscreen) {
            document.msExitFullscreen();
        }
    }
    
    toggleFullscreen() {
        if (document.fullscreenElement || document.webkitFullscreenElement || document.msFullscreenElement) {
            this.exitFullscreen();
        } else {
            this.enterFullscreen();
        }
    }
}

// Global functions for HTML onclick handlers
function reconnectAll() {
    if (window.cameraMonitor) {
        window.cameraMonitor.reconnectAll();
    }
}

function toggleFullscreen() {
    if (window.cameraMonitor) {
        window.cameraMonitor.toggleFullscreen();
    }
}

// Individual camera reconnect function
function reconnectCamera(cameraId) {
    if (window.cameraMonitor) {
        window.cameraMonitor.reconnectCamera(cameraId);
    }
}

// Initialize the camera monitor when page loads
document.addEventListener('DOMContentLoaded', () => {
    console.log('Initializing camera monitor...');
    window.cameraMonitor = new CameraMonitor();
});

// Handle fullscreen changes
let controlsTimer;
function handleFullscreenChange() {
    const controls = document.querySelector('.controls');
    if (document.fullscreenElement || document.webkitFullscreenElement) {
        console.log('Entered fullscreen mode');
        // Hide controls after 5 seconds
        controlsTimer = setTimeout(() => {
            if (controls) {
                controls.style.opacity = '0';
                controls.style.pointerEvents = 'none';
            }
        }, 5000);
        
        // Show controls when mouse moves
        document.addEventListener('mousemove', showControls);
    } else {
        console.log('Exited fullscreen mode');
        clearTimeout(controlsTimer);
        if (controls) {
            controls.style.opacity = '1';
            controls.style.pointerEvents = 'auto';
        }
        document.removeEventListener('mousemove', showControls);
    }
}

function showControls() {
    const controls = document.querySelector('.controls');
    if (controls) {
        controls.style.opacity = '1';
        controls.style.pointerEvents = 'auto';
        
        // Clear existing timer
        clearTimeout(controlsTimer);
        
        // Set new timer to hide controls
        controlsTimer = setTimeout(() => {
            if (document.fullscreenElement || document.webkitFullscreenElement) {
                controls.style.opacity = '0';
                controls.style.pointerEvents = 'none';
            }
        }, 3000);
    }
}

// Listen for fullscreen events
document.addEventListener('fullscreenchange', handleFullscreenChange);
document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
document.addEventListener('msfullscreenchange', handleFullscreenChange);

// Enhanced reconnectAll function with better UI feedback
function reconnectAllWithFeedback() {
    const reconnectBtn = document.getElementById('reconnect-all-btn');
    const status = document.getElementById('reconnect-status');
    
    if (reconnectBtn) {
        reconnectBtn.disabled = true;
        reconnectBtn.textContent = 'Reconnecting...';
    }
    
    if (status) {
        status.style.display = 'block';
        status.textContent = 'Reconnecting all cameras...';
    }
    
    // Call the actual reconnect function
    if (window.cameraMonitor) {
        window.cameraMonitor.reconnectAll();
    }
    
    // Re-enable button and hide status after the staggered reconnect completes
    setTimeout(() => {
        if (reconnectBtn) {
            reconnectBtn.disabled = false;
            reconnectBtn.textContent = 'Reconnect All';
        }
        if (status) {
            status.style.display = 'none';
        }
    }, window.cameraMonitor ? (window.cameraMonitor.cameras.length * 1000 + 2000) : 6000);
}

// Override the global reconnectAll function
window.reconnectAll = reconnectAllWithFeedback;
