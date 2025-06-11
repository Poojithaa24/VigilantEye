from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import os
from werkzeug.utils import secure_filename
import subprocess
import logging
import json
import numpy as np
from datetime import datetime
import cv2
import uuid
import time
import base64
from main import run_detection, detect_violence, detect_weapons
from flask_socketio import SocketIO, emit
from twilio.rest import Client
from dotenv import load_dotenv


# Load environment variables
load_dotenv(dotenv_path=r"C:\Users\USER\OneDrive\Desktop\VigilantEye\Backend\variables.env")

# Initialize Flask app
app = Flask(__name__)
CORS(app)
socketio = SocketIO(app, 
                   cors_allowed_origins="*",
                   logger=False,
                   engineio_logger=False)

# Configuration
UPLOAD_FOLDER = 'uploads'
PROCESSED_FOLDER = 'processed'
ALLOWED_EXTENSIONS = {'mp4', 'mov', 'avi', 'mkv'}
MAX_FILE_SIZE = 100 * 1024 * 1024  # 100MB

# Create directories if they don't exist
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(PROCESSED_FOLDER, exist_ok=True)
os.makedirs('debug', exist_ok=True)

# Initialize Twilio client
twilio_client = Client(os.getenv('TWILIO_ACCOUNT_SID'), os.getenv('TWILIO_AUTH_TOKEN'))

# Logging configuration
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('app.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# Global camera capture object
camera_capture = None
detection_active = False

# Utility functions
def convert_numpy_types(obj):
    """Convert numpy types to native Python types for JSON serialization"""
    if isinstance(obj, np.generic):
        return obj.item()
    elif isinstance(obj, dict):
        return {k: convert_numpy_types(v) for k, v in obj.items()}
    elif isinstance(obj, (list, tuple)):
        return [convert_numpy_types(x) for x in obj]
    return obj

def allowed_file(filename):
    """Check if the file has an allowed extension"""
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def validate_video(file_path):
    """Validate that the video file can be opened and has valid dimensions"""
    try:
        cap = cv2.VideoCapture(file_path)
        if not cap.isOpened():
            return False
        width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        cap.release()
        return width > 0 and height > 0
    except Exception as e:
        logger.error(f"Video validation failed: {str(e)}")
        return False

def convert_to_web_format(input_path, output_path):
    try:
        logger.info(f"Starting conversion: {input_path} -> {output_path}")
        
        cmd = [
            'ffmpeg', '-y', '-i', input_path,
            '-c:v', 'libx264', '-profile:v', 'main',
            '-pix_fmt', 'yuv420p', '-movflags', '+faststart',
            '-preset', 'fast', '-crf', '23',
            '-c:a', 'aac', '-b:a', '128k',
            '-vf', 'scale=trunc(iw/2)*2:trunc(ih/2)*2',
            '-f', 'mp4', output_path
        ]
        
        result = subprocess.run(
            cmd,
            check=True,
            timeout=300,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
        )
        
        logger.info("Conversion successful")
        return True

    except subprocess.CalledProcessError as e:
        logger.error(f"FFmpeg failed: {e.stderr}")
        return False
    except Exception as e:
        logger.error(f"Conversion error: {str(e)}")
        return False

def preprocess_frame(frame):
    # Resize to expected input size (e.g., 640x480 for YOLO)
    resized = cv2.resize(frame, (640, 640))
    # Normalize if required (e.g., to [0,1] range)
    normalized = resized / 255.0
    return normalized.astype(np.float32)

def is_valid_frame(frame):
    """Check if frame is valid (not blank)"""
    if frame is None:
        return False
    if np.mean(frame) < 10:  # Very dark frame
        return False
    return True

# Socket.IO event handlers
@socketio.on('connect') 
def handle_connect():   
    """Handle new client connection"""
    emit('connection_status', {'status': 'connected'})
    logger.info(f"Client connected: {request.sid}")
    # Send initial status
    emit('camera_status', 'inactive')
    emit('detection_status', 'inactive')

@socketio.on('disconnect')
def handle_disconnect():
    """Handle client disconnection"""
    logger.info(f"Client disconnected: {request.sid}")
    emit('connection_status', {'status': 'disconnected'})
    global camera_capture, detection_active
    if camera_capture:
        camera_capture.release()
        camera_capture = None
    detection_active = False

@socketio.on('camera_control')
def handle_camera_control(status):
    """Handle camera start/stop control"""
    global camera_capture
    logger.info(f"Camera control: {status}")
    
    if status == 'active':
        try:
            camera_capture = cv2.VideoCapture(0, cv2.CAP_DSHOW)  # Use DirectShow for Windows compatibility
            
            # Set camera parameters
            camera_capture.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
            camera_capture.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
            camera_capture.set(cv2.CAP_PROP_FPS, 30)
            
            if not camera_capture.isOpened():
                emit('camera_status', 'error')
                logger.error("Failed to open camera")
                return
            
            # Warm-up camera
            for _ in range(5):
                camera_capture.read()
                
            emit('camera_status', 'active')
            logger.info("Camera activated")
        except Exception as e:
            emit('camera_status', 'error')
            logger.error(f"Camera activation error: {str(e)}")
    else:
        if camera_capture:
            camera_capture.release()
            camera_capture = None
        emit('camera_status', 'inactive')
        logger.info("Camera deactivated")

@socketio.on('detection_control')
def handle_detection_control(status):
    """Handle detection start/stop"""
    global detection_active, camera_capture
    logger.info(f"Detection control: {status}")
    
    if not camera_capture or not camera_capture.isOpened():
        emit('detection_status', 'error')
        logger.error("Cannot start detection without active camera")
        return
    
    detection_active = status == 'active'
    emit('detection_status', status)
    
    if detection_active:
        socketio.start_background_task(target=detection_loop)

def detection_loop():
    """Background task for detection processing"""
    global camera_capture, detection_active
    frame_count = 0
    last_alert_time = 0
    alert_cooldown = 60  # seconds between alerts
    
    logger.info("Detection loop started")
    
    while detection_active and camera_capture and camera_capture.isOpened():
        try:
            # Get frame with retry logic
            MAX_RETRIES = 3
            retry_count = 0
            frame = None
            
            while retry_count < MAX_RETRIES and detection_active:
                success, frame = camera_capture.read()
                if success and is_valid_frame(frame):
                    break
                retry_count += 1
                time.sleep(0.1)
            else:
                if detection_active:
                    socketio.emit('frame_error', {'error': 'Failed to get valid frame'})
                continue
            
            frame_count += 1
            debug_frame = frame.copy()
            
            # Run detection
            frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            frame_violence = preprocess_frame(frame_rgb)
            frame_weapon = cv2.resize(frame, (640, 640)) 
            violence_raw = detect_violence(frame_violence)
            weapons_raw = detect_weapons(frame_weapon)
            
            # Convert numpy types
            violence_raw = convert_numpy_types(violence_raw)
            weapons_raw = convert_numpy_types(weapons_raw)
            
            # Determine detection status
            violence_detected = bool(violence_raw[0]) if isinstance(violence_raw, list) and len(violence_raw) > 0 else False
            weapons_detected = len(weapons_raw) > 0 if isinstance(weapons_raw, list) else False
            
            # Get confidence score
            violence_confidence = violence_raw[1] if isinstance(violence_raw, list) and len(violence_raw) > 1 else 0
            current_time = time.time()
            
            # Create detection data
            detection_data = {
                'violence_detected': violence_detected,
                'weapons_detected': weapons_detected,
                'violence_confidence': violence_confidence,
                'weapon_confidence': 0.8 if weapons_detected else 0,
                'timestamp': datetime.now().isoformat()
            }
            
            # Emit detection data to client
            socketio.emit('detection_data', detection_data)

            # Check if we should send alert
            if (violence_detected or weapons_detected) and (current_time - last_alert_time > alert_cooldown):
                send_direct_alert(
                    phone_number=os.getenv('DEFAULT_ALERT_PHONE'),
                    detection_type="violence" if violence_detected else "weapon",
                    confidence=violence_confidence if violence_detected else 0.8
                )
                last_alert_time = current_time

            # Visual debugging for weapons
            if weapons_detected and isinstance(weapons_raw, list):
                for box in weapons_raw:
                    if isinstance(box, dict) and 'coordinates' in box:
                        x1, y1, x2, y2 = map(int, box['coordinates'])
                        cv2.rectangle(debug_frame, (x1, y1), (x2, y2), (0, 0, 255), 2)
                        cv2.putText(debug_frame, "Weapon", (x1, y1-10),
                                   cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 0, 255), 1)

            # Encode and send frame
            _, buffer = cv2.imencode('.jpg', frame)
            socketio.emit('video_frame', {
                'frame': base64.b64encode(buffer).decode('utf-8'),
                'detection': {
                    'violence_detected': violence_detected,
                    'weapons_detected': weapons_detected,
                    'boxes': weapons_raw if weapons_detected else []
                },
                'frame_num': frame_count
            })

            socketio.sleep(0.033)  # ~30fps
            
        except Exception as e:
            logger.error(f"Detection loop error: {str(e)}")
            if detection_active:
                socketio.emit('detection_status', 'error')
                detection_active = False
    
    logger.info("Detection loop ended")
    if detection_active:
        socketio.emit('detection_status', 'inactive')
        detection_active = False

@socketio.on('video_frame')
def handle_video_frame(data):
    global detection_active
    if not hasattr(handle_video_frame, "last_alert_time"):
        handle_video_frame.last_alert_time = 0
    alert_cooldown = 60  # seconds

    if not detection_active:
        return
    try:
        frame_data = data['frame'].split(',')[1]
        img_bytes = base64.b64decode(frame_data)
        nparr = np.frombuffer(img_bytes, np.uint8)
        frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if frame is None:
            return

        frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        frame_violence = preprocess_frame(frame_rgb)
        frame_weapon = cv2.resize(frame, (640, 640))
        violence_raw = detect_violence(frame_violence)
        weapons_raw = detect_weapons(frame_weapon)
        violence_raw = convert_numpy_types(violence_raw)
        weapons_raw = convert_numpy_types(weapons_raw)
        violence_detected = bool(violence_raw[0]) if isinstance(violence_raw, list) and len(violence_raw) > 0 else False
        weapons_detected = len(weapons_raw) > 0 if isinstance(weapons_raw, list) else False
        violence_confidence = violence_raw[1] if isinstance(violence_raw, list) and len(violence_raw) > 1 else 0

        detection_data = {
            'violence_detected': violence_detected,
            'weapons_detected': weapons_detected,
            'violence_confidence': violence_confidence,
            'weapon_confidence': 0.8 if weapons_detected else 0,
            'timestamp': datetime.now().isoformat()
        }
        socketio.emit('detection_data', detection_data)

        _, buffer = cv2.imencode('.jpg', frame)
        frame_b64 = base64.b64encode(buffer).decode('utf-8')
        socketio.emit('video_frame_processed', {'frame': frame_b64})

        current_time = time.time()
        if weapons_detected and (current_time - handle_video_frame.last_alert_time > alert_cooldown):
            send_direct_alert(
                phone_number=os.getenv('DEFAULT_ALERT_PHONE'),
                detection_type="weapon",
                confidence=0.8
            )
            handle_video_frame.last_alert_time = current_time

    except Exception as e:
        logger.error(f"Error processing video frame: {e}")

# API Routes

@app.route('/processed/<filename>')
def serve_video(filename):
    try:
        safe_filename = secure_filename(filename)
        file_path = os.path.join(PROCESSED_FOLDER, safe_filename)
        
        if not os.path.exists(file_path):
            logger.error(f"Video not found: {safe_filename}")
            return jsonify({'error': 'Video file not found'}), 404

        if not allowed_file(safe_filename):
            logger.error(f"Invalid file type: {safe_filename}")
            return jsonify({'error': 'Invalid file type'}), 400

        file_size = os.path.getsize(file_path)

        response = send_from_directory(
            PROCESSED_FOLDER,
            safe_filename,
            mimetype='video/mp4',
            conditional=True
        )

        response.headers['Content-Length'] = str(file_size)
        response.headers['Accept-Ranges'] = 'bytes'
        response.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate'
        response.headers['Pragma'] = 'no-cache'
        response.headers['Expires'] = '0'
        response.headers['Access-Control-Expose-Headers'] = 'Content-Length'

        return response

    except Exception as e:
        logger.error(f"Video serving error: {str(e)}")
        return jsonify({'error': str(e)}), 500
    
# Alert functions
@app.route('/test-alert')
def test_alert():
    logger.info("Test alert triggered manually.")
    result = send_direct_alert("+919390501063", "violence", 95, filename="test.mp4")
    return f"Test alert sent: {result}"

def send_direct_alert(phone_number, detection_type, confidence, filename=None):
    try:
        if not phone_number:
            logger.warning("No phone number provided for alert")
            return False

        message = f"""🚨 SECURITY ALERT 🚨
        Type: {detection_type.upper()}
        Time: {datetime.now().strftime("%Y-%m-%d %H:%M:%S")}"""
        if filename:
            message += f"\nFile: {filename}"

        logger.info(f"Attempting to send alert to {phone_number}")

        message = twilio_client.messages.create(
            body=message,
            from_=os.getenv('TWILIO_PHONE_NUMBER'),
            to=phone_number
        )

        logger.info(f"Twilio response: SID: {message.sid}, Status: {message.status}")

        return True
    except Exception as e:
        logger.error(f"Twilio API Error: {str(e)}")
        if hasattr(e, 'more_info'):
            logger.error(f"Twilio Error Details: {e.more_info}")
        return False

@app.route('/process-video', methods=['POST'])
def process_video():
    if 'video' not in request.files:
        return jsonify({'status': 'failed', 'error': 'No video file'}), 400

    file = request.files['video']
    if file.filename == '' or not allowed_file(file.filename):
        return jsonify({'status': 'failed', 'error': 'Invalid file'}), 400

    file.seek(0, os.SEEK_END)
    file_size = file.tell()
    file.seek(0)
    if file_size > MAX_FILE_SIZE:
        return jsonify({'status': 'failed', 'error': 'File too large'}), 400

    filename = secure_filename(file.filename)
    unique_id = str(uuid.uuid4())
    processed_filename = f"{unique_id}_{filename}"

    input_path = os.path.join(UPLOAD_FOLDER, filename)
    temp_output = os.path.join(PROCESSED_FOLDER, f"temp_{processed_filename}")
    processed_path = os.path.join(PROCESSED_FOLDER, processed_filename)

    try:
        file.save(input_path)
        logger.info(f"Saved input file to {input_path}")

        if not validate_video(input_path):
            raise RuntimeError("Invalid input video file")

        detection_results = run_detection(input_path, temp_output)
        detection_results = convert_numpy_types(detection_results)
        logger.info(f"Detection results: {detection_results}")

        violence_detected = False
        weapons_detected = False
        confidence = 0.0

        for result in detection_results:
            if isinstance(result, dict):
                if result.get('type') == 'violence':
                    violence_detected = True
                    confidence = max(confidence, result.get('confidence', 0))
                elif result.get('type') == 'weapon':
                    weapons_detected = True
                    confidence = max(confidence, result.get('confidence', 0))

        if violence_detected or weapons_detected:
            send_direct_alert(
                phone_number=request.form.get('contact_phone', os.getenv('DEFAULT_ALERT_PHONE')),
                detection_type="violence" if violence_detected else "weapon",
                confidence=confidence,
                filename=filename
            )

        if not convert_to_web_format(temp_output, processed_path):
            raise RuntimeError("Video format conversion failed")

        if not os.path.exists(processed_path):
            raise RuntimeError("Processed video not created")
        
        video_url = f"{request.host_url}processed/{processed_filename}"
        return jsonify({
            'status': 'completed',
            'video_url': video_url,
            'processed_file': processed_filename,
            'detection_results': detection_results
        })

    except Exception as e:
        logger.error(f"Processing failed: {str(e)}")
        return jsonify({
            'status': 'failed',
            'error': str(e),
            'message': 'Video processing failed'
        }), 500

    finally:
        for path in [input_path, temp_output]:
            try:
                if os.path.exists(path):
                    os.remove(path)
            except Exception as e:
                logger.warning(f"Could not remove {path}: {str(e)}")

if __name__ == '__main__':
    socketio.run(app, 
                host='0.0.0.0', 
                port=5000, 
                debug=True, 
                allow_unsafe_werkzeug=True)