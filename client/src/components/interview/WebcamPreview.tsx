import React, { useRef, useEffect, useState } from 'react';
import Webcam from 'react-webcam';
import { motion } from 'framer-motion';
import { Smile, Eye, AlertTriangle } from 'lucide-react';
import type { EmotionSample } from '@/lib/interviewReport';

interface DetectionBox {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  confidence: number;
  class_id?: number;
  emotion?: string;
  emotion_raw?: string;
  emotion_alt?: string;
  emotion_alt_confidence?: number;
  emotion_margin?: number;
  emotion_top_k?: Array<{ label: string; confidence: number }>;
  emotion_confidence?: number;
}

interface WebcamPreviewProps {
  audio?: boolean;
  onEmotionSample?: (sample: EmotionSample) => void;
}

export function WebcamPreview({ audio = false, onEmotionSample }: WebcamPreviewProps) {
  const [isFaceDetected, setIsFaceDetected] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [faceConfidence, setFaceConfidence] = useState<number>(0);
  const [emotionLabel, setEmotionLabel] = useState<string>("N/A");
  const [emotionConfidence, setEmotionConfidence] = useState<number>(0);
  const [motionScore, setMotionScore] = useState<number>(0);
  const [motionLevel, setMotionLevel] = useState<string>("low");
  const [detections, setDetections] = useState<DetectionBox[]>([]);
  const webcamRef = useRef<Webcam>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const isAnalyzingRef = useRef(false);
  const emotionHistoryRef = useRef<Array<{
    timestamp: number;
    primary: string;
    primaryConfidence: number;
    secondary: string;
    secondaryConfidence: number;
    margin: number;
  }>>([]);
  const trackerIdRef = useRef<string>(
    `tracker-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
  );

  const smoothEmotion = (
    primary: string,
    primaryConfidence: number,
    secondary: string,
    secondaryConfidence: number,
    margin: number,
  ): { label: string; confidence: number } => {
    const now = Date.now();
    const next = [
      ...emotionHistoryRef.current,
      {
        timestamp: now,
        primary,
        primaryConfidence,
        secondary,
        secondaryConfidence,
        margin,
      },
    ].filter((item) => now - item.timestamp <= 7000);

    emotionHistoryRef.current = next;

    const scores = new Map<string, number>();
    let total = 0;

    next.forEach((item, index) => {
      const recencyWeight = 1 + index / Math.max(1, next.length - 1);
      const stabilityBoost = 1 + Math.max(0, item.margin) * 0.6;
      const primaryScore = item.primaryConfidence * recencyWeight * stabilityBoost;
      scores.set(item.primary, (scores.get(item.primary) ?? 0) + primaryScore);
      total += primaryScore;

      if (item.secondary && item.secondary !== item.primary && item.secondaryConfidence > 0.05) {
        const secondaryScore = item.secondaryConfidence * recencyWeight * 0.45;
        scores.set(item.secondary, (scores.get(item.secondary) ?? 0) + secondaryScore);
        total += secondaryScore;
      }
    });

    const best = Array.from(scores.entries()).sort((a, b) => b[1] - a[1])[0];
    if (!best || total <= 0) {
      return { label: primary, confidence: primaryConfidence };
    }

    return {
      label: best[0],
      confidence: Math.min(1, best[1] / total),
    };
  };

  useEffect(() => {
    const drawOverlay = () => {
      const canvas = overlayCanvasRef.current;
      const video = webcamRef.current?.video as HTMLVideoElement | undefined;
      if (!canvas || !video) return;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const canvasWidth = canvas.clientWidth;
      const canvasHeight = canvas.clientHeight;
      if (!canvasWidth || !canvasHeight) return;

      if (canvas.width !== canvasWidth || canvas.height !== canvasHeight) {
        canvas.width = canvasWidth;
        canvas.height = canvasHeight;
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (!detections.length || !video.videoWidth || !video.videoHeight) return;

      const scale = Math.max(canvas.width / video.videoWidth, canvas.height / video.videoHeight);
      const renderedWidth = video.videoWidth * scale;
      const renderedHeight = video.videoHeight * scale;
      const offsetX = (canvas.width - renderedWidth) / 2;
      const offsetY = (canvas.height - renderedHeight) / 2;

      detections.forEach((detection) => {
        const left = detection.x1 * scale + offsetX;
        const top = detection.y1 * scale + offsetY;
        const width = (detection.x2 - detection.x1) * scale;
        const height = (detection.y2 - detection.y1) * scale;

        if (width <= 0 || height <= 0) return;

        ctx.lineWidth = 2;
        ctx.strokeStyle = "rgba(129, 140, 248, 0.95)";
        ctx.strokeRect(left, top, width, height);

        const emotion = detection.emotion ?? "unknown";
        const emotionScore = Math.round((detection.emotion_confidence ?? 0) * 100);
        const label = `${emotion} ${emotionScore}%`;

        ctx.font = "12px sans-serif";
        const textWidth = ctx.measureText(label).width;
        const labelHeight = 20;
        const labelY = Math.max(0, top - labelHeight);

        ctx.fillStyle = "rgba(15, 23, 42, 0.9)";
        ctx.fillRect(left, labelY, textWidth + 12, labelHeight);

        ctx.fillStyle = "#93c5fd";
        ctx.fillText(label, left + 6, labelY + 14);
      });
    };

    drawOverlay();
    window.addEventListener("resize", drawOverlay);
    return () => window.removeEventListener("resize", drawOverlay);
  }, [detections]);

  // Capture a frame every 2s and send it to /analyze-frame
  useEffect(() => {
    const interval = setInterval(() => {
      if (isAnalyzingRef.current) return;

      const video = webcamRef.current?.video as HTMLVideoElement | undefined;
      if (!video || video.readyState < 2 || !video.videoWidth || !video.videoHeight) {
        return;
      }

      const canvas = canvasRef.current ?? document.createElement("canvas");
      canvasRef.current = canvas;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      const context = canvas.getContext("2d");
      if (!context) return;

      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      const imageBase64 = canvas.toDataURL("image/jpeg", 0.8);

      isAnalyzingRef.current = true;

      fetch("/analyze-frame", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          imageBase64,
          sessionId: trackerIdRef.current,
        }),
      })
        .then(async (response) => {
          if (!response.ok) {
            throw new Error(`Analyze frame failed (${response.status})`);
          }
          return response.json();
        })
        .then((data) => {
          const detections = Array.isArray(data?.detections) ? data.detections : [];
          const motion = data?.motion;
          const currentMotionScore = Number(motion?.motion_score ?? 0);
          const currentMotionLevel = String(motion?.motion_level ?? "low");
          setMotionScore(currentMotionScore);
          setMotionLevel(currentMotionLevel);

          if (!detections.length) {
            setDetections([]);
            setIsFaceDetected(false);
            setFaceConfidence(0);
            setEmotionLabel("N/A");
            setEmotionConfidence(0);
            setFeedback("No face detected. Keep your face in frame.");
            return;
          }

          const topDetection = detections.reduce((best: any, current: any) => {
            return (current?.confidence ?? 0) > (best?.confidence ?? 0) ? current : best;
          }, detections[0]);

          const confidence = Number(topDetection?.confidence ?? 0);
          const rawPrimary = String(topDetection?.emotion_raw ?? topDetection?.emotion ?? "unknown");
          const rawSecondary = String(topDetection?.emotion_alt ?? "unknown");
          const rawMargin = Number(topDetection?.emotion_margin ?? 0);
          const rawPrimaryConfidence = Number(topDetection?.emotion_confidence ?? 0);
          const rawSecondaryConfidence = Number(topDetection?.emotion_alt_confidence ?? 0);

          const smoothed = smoothEmotion(
            rawPrimary,
            rawPrimaryConfidence,
            rawSecondary,
            rawSecondaryConfidence,
            rawMargin,
          );

          const emoLabel = smoothed.label;
          const emoConfidence = smoothed.confidence;

          setDetections(detections as DetectionBox[]);
          setIsFaceDetected(true);
          setFaceConfidence(confidence);
          setEmotionLabel(emoLabel);
          setEmotionConfidence(emoConfidence);
          onEmotionSample?.({
            timestamp: Date.now(),
            emotion: emoLabel,
            emotionConfidence: emoConfidence,
            faceConfidence: confidence,
            motionScore: currentMotionScore,
            motionLevel: currentMotionLevel,
          });

          if (emoLabel === "sad" || emoLabel === "fear") {
            setFeedback("Take a breath and answer confidently.");
          } else if (emoLabel === "surprise") {
            setFeedback("You looked surprised. Pause for a second, then structure your answer in 3 points.");
          } else if (emoLabel === "anger") {
            setFeedback("Relax your expression and keep a calm tone.");
          } else if (emoLabel === "disgust") {
            setFeedback("Keep a neutral expression and steady eye contact.");
          } else if (emoLabel === "uncertain") {
            setFeedback("Expression uncertain. Keep your face centered and lighting consistent.");
          } else {
            setFeedback(null);
          }
        })
        .catch((error) => {
          console.error("Frame analysis error:", error);
          setDetections([]);
          setFeedback("AI analysis unavailable. Retrying...");
        })
        .finally(() => {
          isAnalyzingRef.current = false;
        });
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  const handleWebcamError = (error: any) => {
    console.error('Webcam error:', error);
    const errorMessage = error?.message || 'Cannot access camera';
    setCameraError(errorMessage);
  };

  if (cameraError) {
    return (
      <div className="relative rounded-2xl overflow-hidden border border-red-500/40 shadow-2xl bg-black aspect-video flex items-center justify-center">
        <div className="text-center space-y-2">
          <p className="text-white text-sm font-semibold">Camera Error</p>
          <p className="text-xs text-red-300 px-2">{cameraError}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative rounded-2xl overflow-hidden border border-white/10 shadow-2xl bg-black aspect-video group">
      <Webcam
        ref={webcamRef}
        videoConstraints={{
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user'
        }}
        audioConstraints={audio ? { echoCancellation: true, noiseSuppression: true } : false}
        className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
        mirrored={true}
        onUserMediaError={handleWebcamError}
      />

      <canvas
        ref={overlayCanvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none"
      />
      
      {/* Face Tracking Overlay Sim */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Scanning Line */}
        <div className="scanner-line"></div>

        {/* Metrics */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute top-3 right-3 space-y-2"
        >
          <div className="bg-black/60 backdrop-blur-md p-2 rounded text-[10px] text-green-400 border border-green-500/30 flex items-center gap-1">
             <Eye className="w-3 h-3" /> Face: {isFaceDetected ? `${Math.round(faceConfidence * 100)}%` : "N/A"}
          </div>
          <div className="bg-black/60 backdrop-blur-md p-2 rounded text-[10px] text-blue-400 border border-blue-500/30 flex items-center gap-1">
             <Smile className="w-3 h-3" /> Emotion: {emotionLabel} ({Math.round(emotionConfidence * 100)}%)
          </div>
          <div className="bg-black/60 backdrop-blur-md p-2 rounded text-[10px] text-yellow-300 border border-yellow-500/30 flex items-center gap-1">
             Motion: {motionLevel} ({Math.round(motionScore)}%)
          </div>
        </motion.div>

        {/* Real-time Feedback Toast */}
        {feedback && (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 20, opacity: 0 }}
            className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-red-500/20 backdrop-blur border border-red-500/50 text-red-200 px-3 py-1 rounded-full text-xs flex items-center gap-2"
          >
            <AlertTriangle className="w-3 h-3" />
            {feedback}
          </motion.div>
        )}
      </div>

      <div className="absolute top-4 right-4 flex gap-2">
        <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.5)]"></div>
        <span className="text-[10px] text-white/70 uppercase tracking-widest">Live Analysis</span>
      </div>
    </div>
  );
}
