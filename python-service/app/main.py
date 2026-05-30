from __future__ import annotations

import os
import threading
import time
from dataclasses import dataclass, field
from typing import Any

import cv2
import numpy as np
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from tensorflow import keras
from tensorflow.keras import layers
from tensorflow.keras.models import load_model
from ultralytics import YOLO

YOLO_MODEL_PATH = os.getenv("YOLO_MODEL_PATH", "yolov8n-face.pt")
EMOTION_MODEL_PATH = os.getenv("EMOTION_MODEL_PATH", "emotion_model.h5")
INFER_SIZE = 640
TRACKER_TTL_SECONDS = int(os.getenv("TRACKER_TTL_SECONDS", "120"))
EMOTION_EMA_ALPHA = float(os.getenv("EMOTION_EMA_ALPHA", "0.45"))

# 7 emotions: anger, disgust, fear, happiness, neutral, sad, surprise
# Order must match the emotion_model.h5 output layer classes
EMOTION_LABELS = [
    item.strip().lower()
    for item in os.getenv(
        "EMOTION_LABELS",
        "anger,disgust,fear,happiness,sad,surprise,neutral",
    ).split(",")
    if item.strip()
]

app = FastAPI(title="YOLO + Emotion + Motion Detection Service", version="1.3.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

_yolo_model: YOLO | None = None
_emotion_model: Any | None = None


@dataclass
class TrackerState:
    prev_gray: np.ndarray | None = None
    prev_face_center: tuple[float, float] | None = None
    ema_probs: np.ndarray | None = None
    updated_at: float = field(default_factory=time.time)


_TRACKER_STATES: dict[str, TrackerState] = {}
_TRACKER_LOCK = threading.Lock()


def cleanup_trackers(now: float) -> None:
    stale = [
        tracker_id
        for tracker_id, state in _TRACKER_STATES.items()
        if now - state.updated_at > TRACKER_TTL_SECONDS
    ]
    for tracker_id in stale:
        _TRACKER_STATES.pop(tracker_id, None)


def get_tracker_state(tracker_id: str) -> TrackerState:
    now = time.time()
    with _TRACKER_LOCK:
        cleanup_trackers(now)
        state = _TRACKER_STATES.get(tracker_id)
        if state is None:
            state = TrackerState()
            _TRACKER_STATES[tracker_id] = state
        state.updated_at = now
        return state


def get_yolo_model() -> YOLO:
    global _yolo_model
    if _yolo_model is None:
        try:
            _yolo_model = YOLO(YOLO_MODEL_PATH)
        except Exception as exc:
            raise RuntimeError(
                f"Unable to load YOLO model from '{YOLO_MODEL_PATH}'. "
                "Set YOLO_MODEL_PATH or place model weights in this directory."
            ) from exc
    return _yolo_model


def get_emotion_model() -> Any:
    global _emotion_model
    if _emotion_model is None:
        try:
            _emotion_model = load_model(EMOTION_MODEL_PATH, compile=False)
        except Exception:
            try:
                legacy_model = build_legacy_emotion_cnn()
                legacy_model.load_weights(EMOTION_MODEL_PATH)
                _emotion_model = legacy_model
            except Exception as fallback_exc:
                raise RuntimeError(
                    f"Unable to load emotion model from '{EMOTION_MODEL_PATH}'. "
                    "Set EMOTION_MODEL_PATH or place emotion_model.h5 in this directory."
                ) from fallback_exc
    return _emotion_model


def build_legacy_emotion_cnn() -> Any:
    return keras.Sequential(
        [
            layers.Input(shape=(48, 48, 1)),
            layers.Conv2D(64, (3, 3), activation="relu", name="conv2d"),
            layers.Conv2D(64, (3, 3), activation="relu", name="conv2d_1"),
            layers.MaxPooling2D((2, 2), name="max_pooling2d"),
            layers.Dropout(0.2, name="dropout"),
            layers.Conv2D(128, (3, 3), activation="relu", name="conv2d_2"),
            layers.MaxPooling2D((2, 2), name="max_pooling2d_1"),
            layers.Conv2D(128, (3, 3), activation="relu", name="conv2d_3"),
            layers.MaxPooling2D((2, 2), name="max_pooling2d_2"),
            layers.Dropout(0.22, name="dropout_1"),
            layers.Flatten(name="flatten"),
            layers.Dense(512, activation="relu", name="dense"),
            layers.Dropout(0.5, name="dropout_2"),
            layers.Dense(256, activation="relu", name="dense_1"),
            layers.Dropout(0.5, name="dropout_3"),
            layers.Dense(7, activation="softmax", name="dense_2"),
        ],
        name="sequential",
    )


def decode_image(image_bytes: bytes) -> np.ndarray:
    arr = np.frombuffer(image_bytes, dtype=np.uint8)
    image = cv2.imdecode(arr, cv2.IMREAD_COLOR)
    if image is None:
        raise ValueError("Invalid image file or unsupported format")
    return image


def preprocess_face(face_bgr: np.ndarray) -> np.ndarray:
    gray = cv2.cvtColor(face_bgr, cv2.COLOR_BGR2GRAY)
    gray = cv2.equalizeHist(gray)
    resized = cv2.resize(gray, (48, 48), interpolation=cv2.INTER_AREA)
    normalized = resized.astype("float32") / 255.0
    return normalized.reshape(1, 48, 48, 1)


def predict_emotion(face_bgr: np.ndarray, tracker_id: str) -> dict[str, Any]:
    model = get_emotion_model()
    input_tensor = preprocess_face(face_bgr)
    probs = model.predict(input_tensor, verbose=0)[0]

    state = get_tracker_state(tracker_id)
    with _TRACKER_LOCK:
        if state.ema_probs is not None and len(state.ema_probs) == len(probs):
            smoothed = EMOTION_EMA_ALPHA * state.ema_probs + (1.0 - EMOTION_EMA_ALPHA) * probs
        else:
            smoothed = probs
        state.ema_probs = smoothed

    class_index = int(np.argmax(smoothed))
    confidence = float(smoothed[class_index])
    sorted_idx = np.argsort(smoothed)
    second_index = int(sorted_idx[-2]) if len(sorted_idx) > 1 else class_index
    second_best = float(smoothed[second_index]) if len(sorted_idx) > 1 else 0.0
    margin = confidence - second_best

    if class_index < len(EMOTION_LABELS):
        label = EMOTION_LABELS[class_index]
    else:
        label = f"class_{class_index}"

    if second_index < len(EMOTION_LABELS):
        alt_label = EMOTION_LABELS[second_index]
    else:
        alt_label = f"class_{second_index}"

    # Mark uncertain only when the model is both low-confidence and indecisive.
    final_label = label
    if confidence < 0.34 and margin < 0.08:
        final_label = "uncertain"

    top_k = []
    for idx in reversed(sorted_idx[-3:]):
        i = int(idx)
        top_k.append(
            {
                "label": EMOTION_LABELS[i] if i < len(EMOTION_LABELS) else f"class_{i}",
                "confidence": round(float(smoothed[i]), 4),
            }
        )

    return {
        "label": final_label,
        "confidence": confidence,
        "raw_label": label,
        "alt_label": alt_label,
        "alt_confidence": second_best,
        "margin": margin,
        "top_k": top_k,
    }


def remap_box_to_original(
    x1: float,
    y1: float,
    x2: float,
    y2: float,
    orig_w: int,
    orig_h: int,
    infer_w: int,
    infer_h: int,
) -> tuple[int, int, int, int]:
    x_scale = orig_w / float(infer_w)
    y_scale = orig_h / float(infer_h)

    ox1 = int(round(x1 * x_scale))
    oy1 = int(round(y1 * y_scale))
    ox2 = int(round(x2 * x_scale))
    oy2 = int(round(y2 * y_scale))

    ox1 = max(0, min(ox1, orig_w - 1))
    oy1 = max(0, min(oy1, orig_h - 1))
    ox2 = max(0, min(ox2, orig_w - 1))
    oy2 = max(0, min(oy2, orig_h - 1))

    return ox1, oy1, ox2, oy2


def compute_motion_metrics(
    tracker_id: str,
    frame_bgr: np.ndarray,
    primary_face_center: tuple[float, float] | None,
) -> dict[str, float | str]:
    gray = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2GRAY)
    state = get_tracker_state(tracker_id)

    avg_flow_magnitude = 0.0
    max_flow_magnitude = 0.0
    face_shift = 0.0

    with _TRACKER_LOCK:
        if state.prev_gray is not None and state.prev_gray.shape == gray.shape:
            flow = cv2.calcOpticalFlowFarneback(
                state.prev_gray,
                gray,
                None,
                0.5,
                3,
                15,
                3,
                5,
                1.2,
                0,
            )
            mag, _ang = cv2.cartToPolar(flow[..., 0], flow[..., 1])
            avg_flow_magnitude = float(np.mean(mag))
            max_flow_magnitude = float(np.max(mag))

        if state.prev_face_center is not None and primary_face_center is not None:
            dx = primary_face_center[0] - state.prev_face_center[0]
            dy = primary_face_center[1] - state.prev_face_center[1]
            face_shift = float(np.hypot(dx, dy))

        state.prev_gray = gray
        state.prev_face_center = primary_face_center
        state.updated_at = time.time()

    # More sensitive scaling so natural fidget/head movement contributes.
    motion_score = min(100.0, avg_flow_magnitude * 150.0 + max_flow_magnitude * 8.0 + face_shift * 2.0)

    if motion_score < 18:
        motion_level = "low"
    elif motion_score < 40:
        motion_level = "medium"
    else:
        motion_level = "high"

    return {
        "motion_score": round(float(motion_score), 2),
        "motion_level": motion_level,
        "avg_flow_magnitude": round(avg_flow_magnitude, 4),
        "max_flow_magnitude": round(max_flow_magnitude, 4),
        "face_shift": round(face_shift, 2),
    }


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/detect")
async def detect_faces(
    file: UploadFile = File(...),
    tracker_id: str = Form("default"),
) -> dict[str, Any]:
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Uploaded file must be an image")

    try:
        image_bytes = await file.read()
        original_image = decode_image(image_bytes)
        yolo_model = get_yolo_model()

        orig_h, orig_w = original_image.shape[:2]

        infer_image = cv2.resize(
            original_image,
            (INFER_SIZE, INFER_SIZE),
            interpolation=cv2.INTER_LINEAR,
        )

        results = yolo_model.predict(source=infer_image, verbose=False)

        detections: list[dict[str, float | int | str]] = []
        for result in results:
            boxes = result.boxes
            if boxes is None:
                continue

            for box in boxes:
                x1f, y1f, x2f, y2f = box.xyxy[0].tolist()

                x1, y1, x2, y2 = remap_box_to_original(
                    x1=x1f,
                    y1=y1f,
                    x2=x2f,
                    y2=y2f,
                    orig_w=orig_w,
                    orig_h=orig_h,
                    infer_w=INFER_SIZE,
                    infer_h=INFER_SIZE,
                )

                if x2 <= x1 or y2 <= y1:
                    continue

                face_crop = original_image[y1:y2, x1:x2]
                if face_crop.size == 0:
                    continue

                emotion_pred = predict_emotion(face_crop, tracker_id=tracker_id)

                yolo_conf = float(box.conf[0].item()) if box.conf is not None else 0.0
                class_id = int(box.cls[0].item()) if box.cls is not None else -1

                detections.append(
                    {
                        "x1": x1,
                        "y1": y1,
                        "x2": x2,
                        "y2": y2,
                        "confidence": round(yolo_conf, 4),
                        "class_id": class_id,
                        "emotion": emotion_pred["label"],
                        "emotion_confidence": round(float(emotion_pred["confidence"]), 4),
                        "emotion_raw": emotion_pred["raw_label"],
                        "emotion_alt": emotion_pred["alt_label"],
                        "emotion_alt_confidence": round(float(emotion_pred["alt_confidence"]), 4),
                        "emotion_margin": round(float(emotion_pred["margin"]), 4),
                        "emotion_top_k": emotion_pred["top_k"],
                    }
                )

        primary_face_center: tuple[float, float] | None = None
        if detections:
            top = max(detections, key=lambda item: float(item.get("confidence", 0)))
            primary_face_center = (
                (float(top["x1"]) + float(top["x2"])) / 2.0,
                (float(top["y1"]) + float(top["y2"])) / 2.0,
            )

        motion = compute_motion_metrics(
            tracker_id=tracker_id,
            frame_bgr=original_image,
            primary_face_center=primary_face_center,
        )

        return {
            "filename": file.filename,
            "count": len(detections),
            "detections": detections,
            "inference_size": [INFER_SIZE, INFER_SIZE],
            "tracker_id": tracker_id,
            "motion": motion,
        }
    except HTTPException:
        raise
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Detection failed: {exc}") from exc
