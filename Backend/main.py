import cv2
import numpy as np
import tensorflow as tf
from tensorflow.keras.models import load_model
from ultralytics import YOLO
import time
import queue

# =====================
# Violence Detection (LSTM + MobileNet)
# =====================
violence_model = None
SEQUENCE_LENGTH = 10
IMG_SIZE = 224
frame_buffer = queue.Queue(maxsize=SEQUENCE_LENGTH)

def load_violence_model():
    global violence_model
    try:
        violence_model = load_model("best_lstm_mobilenet_model.h5")
    except Exception as e:
        raise RuntimeError(f"Failed to load LSTM+MobileNet model: {e}")

def preprocess_violence_frame(frame):
    resized = cv2.resize(frame, (IMG_SIZE, IMG_SIZE))
    normalized = resized.astype('float32') / 255.0
    return normalized

def detect_violence(frame, current_time=None):
    global violence_model
    frame_buffer_local = frame_buffer
    if violence_model is None:
        return False, 0

    try:
        processed_frame = preprocess_violence_frame(frame)
        if frame_buffer_local.full():
            frame_buffer_local.get()
        frame_buffer_local.put(processed_frame)

        if frame_buffer_local.qsize() == SEQUENCE_LENGTH:
            sequence = np.expand_dims(np.array(list(frame_buffer_local.queue)), axis=0)
            pred = violence_model.predict(sequence, verbose=0)[0]
            is_fight = np.argmax(pred)
            confidence = pred[is_fight]
            return is_fight == 0 and confidence > 0.7, confidence

        return False, 0
    except Exception as e:
        raise RuntimeError(f"Violence detection error: {e}")

# =====================
# Weapon Detection (YOLOv11)
# =====================
weapon_model = None

def load_weapon_model():
    global weapon_model
    try:
        weapon_model = YOLO("best.pt")
    except Exception as e:
        raise RuntimeError(f"Failed to load YOLO model: {e}")

def detect_weapons(frame, current_time=None):
    if weapon_model is None:
        return []
    try:
        rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        results = weapon_model(rgb_frame)[0]
        boxes = []
        for box, conf, cls in zip(results.boxes.xyxy.cpu().numpy(),
                                results.boxes.conf.cpu().numpy(),
                                results.boxes.cls.cpu().numpy()):
            if int(cls) == 1 and conf > 0.5:
                timestamp = current_time if current_time is not None else time.time()
                boxes.append({
                    'coordinates': tuple(map(int, box)),
                    'confidence': float(conf),
                    'timestamp': timestamp,
                })
        return boxes
    except Exception as e:
        raise RuntimeError(f"Weapon detection error: {e}")

# =====================
# Load models at startup
# =====================
load_violence_model()
load_weapon_model()

# =====================
# Main Detection Logic
# =====================
def run_detection(video_path, output_path):
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        raise RuntimeError("Could not open video file")

    fps = cap.get(cv2.CAP_PROP_FPS)
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))

    fourcc = cv2.VideoWriter_fourcc(*'mp4v')
    out = cv2.VideoWriter(output_path, fourcc, fps, (width, height))

    detection_results = []
    frame_count = 0

    while cap.isOpened():
        ret, frame = cap.read()
        if not ret:
            break

        display_frame = frame.copy()
        frame_time = cap.get(cv2.CAP_PROP_POS_MSEC) / 1000

        violence_detected, violence_confidence = detect_violence(display_frame, frame_time)
        weapon_boxes = detect_weapons(display_frame, frame_time)

        if violence_detected:
            detection_results.append({
                'type': 'violence',
                'timestamp': f"{frame_time:.2f}s",
                'frame': frame_count,
                'confidence': violence_confidence
            })
            cv2.putText(display_frame, f"VIOLENCE DETECTED ({violence_confidence * 100:.2f}%)",
                        (50, 50), cv2.FONT_HERSHEY_SIMPLEX, 1.2, (0, 0, 255), 3)
            cv2.rectangle(display_frame, (0, 0), (width, height), (0, 0, 255), 5)

        for box in weapon_boxes:
            detection_results.append({
                'type': 'weapon',
                'timestamp': f"{frame_time:.2f}s",
                'frame': frame_count,
                'confidence': box['confidence'],
                'coordinates': box['coordinates']
            })
            x1, y1, x2, y2 = box['coordinates']
            cv2.rectangle(display_frame, (x1, y1), (x2, y2), (255, 0, 0), 3)
            cv2.putText(display_frame, "WEAPON", (x1, y1 - 10),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.9, (255, 0, 0), 2)

        out.write(display_frame)
        frame_count += 1

    cap.release()
    out.release()
    cv2.destroyAllWindows()
    return detection_results