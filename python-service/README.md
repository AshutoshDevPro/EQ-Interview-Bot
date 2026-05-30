# Python AI Service (YOLOv8 Face + Emotion Detection)

## Setup

```bash
cd python-service
python -m venv .venv
# Windows PowerShell
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

## Model Weights

Set these environment variables (or place files in `python-service/`):

- `YOLO_MODEL_PATH` (example: `yolov8n-face.pt`)
- `EMOTION_MODEL_PATH` (example: `emotion_model.h5`)
- `EMOTION_EMA_ALPHA` (optional, default `0.45`; lower = more responsive, higher = more stable)

PowerShell example:

```powershell
$env:YOLO_MODEL_PATH = "yolov8n-face.pt"
$env:EMOTION_MODEL_PATH = "emotion_model.h5"
```

## Run

```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

## API

### `POST /detect`

- Form field: `file` (image upload)
- Flow:
1. YOLO detects face bounding boxes.
2. Each face crop is converted to grayscale, resized to `48x48`, normalized to `[0, 1]`.
3. CNN predicts emotion label + confidence.

- Response:

```json
{
  "filename": "sample.jpg",
  "count": 1,
  "detections": [
    {
      "x1": 123,
      "y1": 56,
      "x2": 234,
      "y2": 189,
      "confidence": 0.9321,
      "class_id": 0,
      "emotion": "happiness",
      "emotion_confidence": 0.8842
    }
  ]
}
```
