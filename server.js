const express = require('express');
const http = require('http');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// Load configuration
const config = JSON.parse(fs.readFileSync('config.json', 'utf8'));

const app = express();
const server = http.createServer(app);

// Serve static files
app.use(express.static('public'));

// Store active streams with improved management
const activeStreams = new Map();
const streamCleanupTimers = new Map();

// MJPEG stream endpoint for each camera
app.get('/camera/:id/stream', (req, res) => {
    const cameraId = parseInt(req.params.id);
    const camera = config.cameras.find(c => c.id === cameraId);
    
    if (!camera) {
        return res.status(404).send('Camera not found');
    }
    
    console.log(`Starting MJPEG stream for camera ${cameraId}: ${camera.name}`);
    
    // Clean up any existing stream for this camera first
    cleanupExistingStream(cameraId);
    
    // Set headers for MJPEG stream
    res.writeHead(200, {
        'Content-Type': 'multipart/x-mixed-replace; boundary=--myboundary',
        'Cache-Control': 'no-cache',
        'Connection': 'close',
        'Pragma': 'no-cache',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
        'Access-Control-Allow-Headers': 'Content-Type'
    });
    
    // Reverted to conservative FFmpeg settings for reliability
    const ffmpegArgs = [
        '-rtsp_transport', 'tcp',
        '-i', camera.rtsp_url,
        '-f', 'mjpeg',
        '-vf', 'scale=640:480', // Back to reliable resolution
        '-r', '8', // Conservative frame rate
        '-q:v', '8', // Conservative quality
        '-avoid_negative_ts', 'make_zero',
        '-fflags', '+genpts',
        '-threads', '1', // Single thread to reduce load
        '-'
    ];
    
    const ffmpeg = spawn('ffmpeg', ffmpegArgs, {
        stdio: ['ignore', 'pipe', 'pipe']
    });
    
    // Store reference to cleanup later
    const streamInfo = {
        process: ffmpeg,
        response: res,
        startTime: Date.now(),
        cameraId: cameraId
    };
    
    const streamKey = `${cameraId}_${Date.now()}`;
    activeStreams.set(streamKey, streamInfo);
    
    // Clear any existing cleanup timer for this camera
    if (streamCleanupTimers.has(cameraId)) {
        clearTimeout(streamCleanupTimers.get(cameraId));
        streamCleanupTimers.delete(cameraId);
    }
    
    let boundary = Buffer.from('\r\n--myboundary\r\nContent-Type: image/jpeg\r\nContent-Length: ');
    let footer = Buffer.from('\r\n');
    let frameCount = 0;
    
    ffmpeg.stdout.on('data', (data) => {
        if (res.writable && !res.destroyed) {
            // Find JPEG boundaries
            let start = 0;
            let end = 0;
            
            while ((start = data.indexOf(Buffer.from([0xFF, 0xD8]), end)) !== -1) {
                end = data.indexOf(Buffer.from([0xFF, 0xD9]), start);
                if (end !== -1) {
                    end += 2;
                    const jpegFrame = data.slice(start, end);
                    frameCount++;
                    
                    try {
                        res.write(boundary);
                        res.write(jpegFrame.length.toString());
                        res.write('\r\n\r\n');
                        res.write(jpegFrame);
                        res.write(footer);
                        
                        // Log frame rate every 80 frames (about every 10 seconds at 8fps)
                        if (frameCount % 80 === 0) {
                            console.log(`Camera ${cameraId}: ${frameCount} frames processed`);
                        }
                    } catch (error) {
                        console.log(`Error writing frame for camera ${cameraId}:`, error.message);
                        break;
                    }
                } else {
                    break;
                }
            }
        }
    });
    
    ffmpeg.stderr.on('data', (data) => {
        const errorMsg = data.toString();
        // Only log significant errors
        if (errorMsg.includes('error') || errorMsg.includes('failed') || errorMsg.includes('Invalid')) {
            console.log(`FFmpeg stderr (Camera ${cameraId}):`, errorMsg);
        }
    });
    
    ffmpeg.on('close', (code) => {
        console.log(`FFmpeg process for camera ${cameraId} closed with code ${code} (${frameCount} frames processed)`);
        activeStreams.delete(streamKey);
        if (res.writable && !res.destroyed) {
            res.end();
        }
    });
    
    ffmpeg.on('error', (error) => {
        console.error(`FFmpeg error for camera ${cameraId}:`, error);
        activeStreams.delete(streamKey);
        if (res.writable && !res.destroyed) {
            res.status(500).end();
        }
    });
    
    // Clean up when client disconnects
    req.on('close', () => {
        console.log(`Client disconnected from camera ${cameraId} stream`);
        cleanupStream(streamKey, ffmpeg);
    });
    
    res.on('close', () => {
        console.log(`Response closed for camera ${cameraId} stream`);
        cleanupStream(streamKey, ffmpeg);
    });
    
    // Timeout cleanup after 30 minutes
    const cleanupTimer = setTimeout(() => {
        console.log(`Cleaning up inactive stream for camera ${cameraId}`);
        cleanupStream(streamKey, ffmpeg);
    }, 30 * 60 * 1000);
    
    streamCleanupTimers.set(cameraId, cleanupTimer);
});

function cleanupExistingStream(cameraId) {
    for (let [streamKey, streamInfo] of activeStreams) {
        if (streamInfo.cameraId === cameraId) {
            console.log(`Cleaning up existing stream for camera ${cameraId}`);
            streamInfo.process.kill('SIGTERM');
            activeStreams.delete(streamKey);
        }
    }
    
    if (streamCleanupTimers.has(cameraId)) {
        clearTimeout(streamCleanupTimers.get(cameraId));
        streamCleanupTimers.delete(cameraId);
    }
}

function cleanupStream(streamKey, ffmpeg) {
    if (ffmpeg && !ffmpeg.killed) {
        ffmpeg.kill('SIGTERM');
    }
    activeStreams.delete(streamKey);
}

// API endpoint to get camera list
app.get('/api/cameras', (req, res) => {
    const cameras = config.cameras.map(camera => ({
        id: camera.id,
        name: camera.name
    }));
    res.json(cameras);
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    const streamsByCamera = {};
    
    for (let [streamKey, streamInfo] of activeStreams) {
        const cameraId = streamInfo.cameraId;
        if (!streamsByCamera[cameraId]) {
            streamsByCamera[cameraId] = {
                count: 0,
                uptime: 0
            };
        }
        streamsByCamera[cameraId].count++;
        streamsByCamera[cameraId].uptime = Math.round((Date.now() - streamInfo.startTime) / 1000);
    }
    
    res.json({
        status: 'ok',
        activeStreams: activeStreams.size,
        streamsByCamera: streamsByCamera,
        uptime: Math.round(process.uptime()),
        configuredCameras: config.cameras.length
    });
});

// Endpoint to cleanup streams for a specific camera
app.post('/api/camera/:id/cleanup', (req, res) => {
    const cameraId = parseInt(req.params.id);
    cleanupExistingStream(cameraId);
    res.json({ message: `Cleaned up streams for camera ${cameraId}` });
});

// Favicon endpoint to prevent 404 errors
app.get('/favicon.ico', (req, res) => {
    res.status(204).send();
});

// Start server
server.listen(config.server.port, config.server.host, () => {
    console.log(`Camera monitor server running on http://${config.server.host}:${config.server.port}`);
    console.log(`Configured cameras: ${config.cameras.length}`);
    console.log(`Conservative settings: 640x480 @ 8fps for reliability`);
});

// Graceful shutdown
process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);

function gracefulShutdown() {
    console.log('Shutting down server...');
    
    for (let timer of streamCleanupTimers.values()) {
        clearTimeout(timer);
    }
    streamCleanupTimers.clear();
    
    for (let [streamKey, streamInfo] of activeStreams) {
        streamInfo.process.kill('SIGTERM');
    }
    activeStreams.clear();
    
    server.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
}

// Periodic cleanup - less frequent
setInterval(() => {
    const now = Date.now();
    let cleaned = 0;
    
    for (let [streamKey, streamInfo] of activeStreams) {
        if (now - streamInfo.startTime > 60 * 60 * 1000) { // 1 hour
            console.log(`Cleaning up old stream for camera ${streamInfo.cameraId}`);
            cleanupStream(streamKey, streamInfo.process);
            cleaned++;
        }
    }
    
    if (cleaned > 0) {
        console.log(`Periodic cleanup: removed ${cleaned} old streams`);
    }
}, 20 * 60 * 1000); // Check every 20 minutes
