import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, Send, StopCircle, User, Bot, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { ROLES } from '@/lib/mockData';
import avatarImage from '@/assets/ai-avatar.png';
import type {
  EmotionSample,
  InterviewSessionReport,
  NervousMetrics,
  QuestionPerformance,
  StammerMetrics,
} from '@/lib/interviewReport';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  feedback?: {
    score: number;
    text: string;
    correctness?: "correct" | "partially-correct" | "incorrect" | "unknown";
    reason?: string;
  };
}

interface ChatInterfaceProps {
  roleId: string;
  roleTitle: string;
  initialQuestions: string[];
  onComplete: (report: InterviewSessionReport) => void;
  micEnabled?: boolean;
  textOnly?: boolean;
  getEmotionSamples?: (startAt: number, endAt: number) => EmotionSample[];
}

const FILLER_PATTERNS = [
  /\bum\b/gi,
  /\buh\b/gi,
  /\ber\b/gi,
  /\bah\b/gi,
  /\bhmm\b/gi,
  /\bmmm\b/gi,
  /\blike\b/gi,
  /\byou know\b/gi,
  /\bi mean\b/gi,
  /\bkind of\b/gi,
  /\bsort of\b/gi,
  /\bactually\b/gi,
  /\bbasically\b/gi,
  /\bliterally\b/gi,
  /\bright\b/gi,
];

const NERVOUS_EMOTIONS = new Set(["fear", "sad", "anger", "disgust"]);
const HIGH_ALERT_EMOTIONS = new Set(["fear", "surprise"]);

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

export function ChatInterface({
  roleId,
  roleTitle,
  initialQuestions,
  onComplete,
  micEnabled = true,
  textOnly = false,
  getEmotionSamples,
}: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: `Hello! I'm your AI interviewer for the ${roleTitle} position. Are you ready to begin?`,
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [micArmed, setMicArmed] = useState(false);
  const [micError, setMicError] = useState<string | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(-1);
  const [hasFollowup, setHasFollowup] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const sessionStartRef = useRef<number>(Date.now());
  const questionAskedAtRef = useRef<Record<number, number>>({});
  const questionReportsRef = useRef<QuestionPerformance[]>([]);
  const consecutiveSkipsRef = useRef<number>(0);
  const speechFinalRef = useRef<string>("");
  const speechEventTimelineRef = useRef<number[]>([]);
  const isSpeakingRef = useRef(false);
  const micEnabledRef = useRef(micEnabled);
  const micArmedRef = useRef(false);
  const isUnmountedRef = useRef(false);

  const getQAData = () => {
    const role = ROLES.find((r) => r.id === roleId);
    if (!role || !role.qa) return [];
    return role.qa;
  };

  const scoreAnswer = (userAnswer: string, questionIndex: number): { score: number; text: string } => {
    const qaData = getQAData();
    if (questionIndex < 0 || questionIndex >= qaData.length) {
      return { score: 0, text: 'Unable to evaluate.' };
    }

    const qa = qaData[questionIndex];
    const keywords = qa.keywords || [];

    let matchCount = 0;
    keywords.forEach((keyword) => {
      const regex = new RegExp(`\\b${keyword.toLowerCase()}\\b`, 'g');
      const matches = userAnswer.toLowerCase().match(regex);
      if (matches) matchCount += matches.length;
    });

    const maxKeywords = keywords.length;
    const matchPercentage = maxKeywords > 0 ? Math.min(matchCount / maxKeywords, 1) : 0;
    let score = Math.round(matchPercentage * 10);

    if (userAnswer.trim().length > 20 && score === 0) {
      score = 2;
    }

    score = Math.min(score, 10);

    let feedbackText = '';
    if (score >= 8) {
      feedbackText = `Excellent! You covered key aspects like ${keywords.slice(0, 2).join(', ')}.`;
    } else if (score >= 6) {
      feedbackText = `Good answer. Next time, try to mention ${keywords.slice(0, 2).join(', ')}.`;
    } else if (score >= 4) {
      feedbackText = `Fair attempt. Consider including more details about ${keywords.slice(0, 1)[0]}.`;
    } else {
      feedbackText = `Your answer didn't cover the key points. Focus on: ${keywords.slice(0, 3).join(', ')}.`;
    }

    return { score, text: feedbackText };
  };

  const analyzeStammer = (
    answer: string,
    context?: {
      startedAt?: number;
      endedAt?: number;
      speechEventTimes?: number[];
    },
  ): StammerMetrics => {
    const normalized = answer.toLowerCase();
    const words = normalized.match(/\b[a-z']+\b/g) ?? [];
    const wordCount = words.length;

    const fillerWordCount = FILLER_PATTERNS.reduce((count, pattern) => {
      const matches = normalized.match(pattern);
      return count + (matches?.length ?? 0);
    }, 0);

    const repeatedWordCount = (normalized.match(/\b(\w+)\s+\1\b/g) ?? []).length;
    const repeatedFragmentCount = (normalized.match(/\b(\w{1,3})-\1(?:-\1)?\b/g) ?? []).length;
    const pauseMarkerCount = (answer.match(/\.{2,}|--|,\s*,/g) ?? []).length;

    const speechEventTimes = (context?.speechEventTimes ?? []).slice().sort((a, b) => a - b);
    const hasSpeechData = speechEventTimes.length > 1;
    const wordsPerMinute = hasSpeechData
      ? Number((wordCount / Math.max(0.001, (speechEventTimes[speechEventTimes.length - 1] - speechEventTimes[0]) / 60000)).toFixed(1))
      : 0;

    const longPauseCount = hasSpeechData
      ? speechEventTimes.reduce((count, current, index, arr) => {
          if (index === 0) return count;
          const delta = current - arr[index - 1];
          return count + (delta >= 1800 ? 1 : 0);
        }, 0)
      : 0;

    const lowPacePenalty = wordsPerMinute > 0 && wordsPerMinute < 75 ? Math.min(12, Math.round((75 - wordsPerMinute) / 5)) : 0;
    const highPacePenalty = wordsPerMinute > 185 ? Math.min(10, Math.round((wordsPerMinute - 185) / 8)) : 0;
    const rhythmPenalty = longPauseCount * 8 + lowPacePenalty + highPacePenalty;

    const rawScore =
      fillerWordCount * 12 +
      repeatedWordCount * 20 +
      repeatedFragmentCount * 22 +
      pauseMarkerCount * 8 +
      rhythmPenalty;
    const stammerScore = Math.min(100, rawScore);

    return {
      fillerWordCount,
      repeatedWordCount: repeatedWordCount + repeatedFragmentCount,
      pauseMarkerCount,
      longPauseCount,
      wordCount,
      wordsPerMinute: Number(wordsPerMinute.toFixed(1)),
      stammerScore,
      isStammering:
        stammerScore >= 35 ||
        repeatedWordCount + repeatedFragmentCount >= 2 ||
        longPauseCount >= 3,
    };
  };

  const analyzeEmotions = (samples: EmotionSample[]): NervousMetrics => {
    if (!samples.length) {
      return {
        dominantEmotion: 'neutral',
        emotionConfidence: 0,
        primaryState: 'uncertain',
        stateConfidence: 0,
        deliveryStates: {
          confident: 0,
          calm: 0,
          nervous: 0,
          surprised: 0,
          tense: 0,
          uncertain: 100,
        },
        nervousScore: 0,
        isNervous: false,
        samplesCaptured: 0,
      };
    }

    const emotionCounts = new Map<string, number>();
    let confidenceSum = 0;
    let nervousWeightedSum = 0;
    let highAlertCount = 0;
    let motionSum = 0;
    let faceConfidenceSum = 0;
    let fearWeight = 0;
    let sadWeight = 0;
    let angerWeight = 0;
    let disgustWeight = 0;
    let surpriseWeight = 0;
    let happinessWeight = 0;
    let neutralWeight = 0;

    samples.forEach((sample) => {
      const key = sample.emotion || 'unknown';
      emotionCounts.set(key, (emotionCounts.get(key) ?? 0) + 1);
      confidenceSum += sample.emotionConfidence;
      motionSum += Number(sample.motionScore ?? 0);
      faceConfidenceSum += Number(sample.faceConfidence ?? 0);

      if (key === "fear") fearWeight += sample.emotionConfidence;
      if (key === "sad") sadWeight += sample.emotionConfidence;
      if (key === "anger") angerWeight += sample.emotionConfidence;
      if (key === "disgust") disgustWeight += sample.emotionConfidence;
      if (key === "surprise") surpriseWeight += sample.emotionConfidence;
      if (key === "happiness") happinessWeight += sample.emotionConfidence;
      if (key === "neutral") neutralWeight += sample.emotionConfidence;

      if (NERVOUS_EMOTIONS.has(key)) {
        nervousWeightedSum += sample.emotionConfidence;
      }
      if (HIGH_ALERT_EMOTIONS.has(key) && sample.emotionConfidence > 0.65) {
        highAlertCount += 1;
      }
    });

    const dominantEmotion = Array.from(emotionCounts.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'neutral';
    const avgConfidence = confidenceSum / samples.length;
    const nervousRatio = nervousWeightedSum / Math.max(samples.length, 1);
    const highAlertRatio = highAlertCount / Math.max(samples.length, 1);
    const avgMotion = motionSum / Math.max(samples.length, 1);
    const avgFaceConfidence = faceConfidenceSum / Math.max(samples.length, 1);
    const motionNorm = clamp01(avgMotion / 100);

    const fearRatio = fearWeight / Math.max(samples.length, 1);
    const sadRatio = sadWeight / Math.max(samples.length, 1);
    const angerRatio = angerWeight / Math.max(samples.length, 1);
    const disgustRatio = disgustWeight / Math.max(samples.length, 1);
    const surpriseRatio = surpriseWeight / Math.max(samples.length, 1);
    const happinessRatio = happinessWeight / Math.max(samples.length, 1);
    const neutralRatio = neutralWeight / Math.max(samples.length, 1);

    const nervousLevel = clamp01(fearRatio * 0.55 + sadRatio * 0.25 + surpriseRatio * 0.2 + motionNorm * 0.2);
    const tenseLevel = clamp01(angerRatio * 0.55 + disgustRatio * 0.3 + motionNorm * 0.2);
    const surprisedLevel = clamp01(surpriseRatio * 0.8 + highAlertRatio * 0.2);
    const calmLevel = clamp01(neutralRatio * 0.6 + (1 - motionNorm) * 0.25 + (1 - nervousLevel) * 0.15);
    const confidentLevel = clamp01(
      happinessRatio * 0.4 + neutralRatio * 0.3 + avgFaceConfidence * 0.3 - nervousLevel * 0.25 - surprisedLevel * 0.15,
    );
    const uncertainLevel = clamp01(
      (1 - avgFaceConfidence) * 0.4 + surprisedLevel * 0.25 + motionNorm * 0.2 + (1 - (happinessRatio + neutralRatio)) * 0.15,
    );

    const stateLevels = {
      confident: confidentLevel,
      calm: calmLevel,
      nervous: nervousLevel,
      surprised: surprisedLevel,
      tense: tenseLevel,
      uncertain: uncertainLevel,
    } as const;

    const primaryState = (Object.entries(stateLevels).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "uncertain") as
      | "confident"
      | "calm"
      | "nervous"
      | "surprised"
      | "tense"
      | "uncertain";

    const stateConfidence = Math.round((stateLevels[primaryState] ?? 0) * 100);

    const nervousScore = Math.min(
      100,
      Math.round(nervousRatio * 45 + highAlertRatio * 30 + avgMotion * 0.35),
    );

    return {
      dominantEmotion,
      emotionConfidence: Number(avgConfidence.toFixed(3)),
      primaryState,
      stateConfidence,
      deliveryStates: {
        confident: Math.round(confidentLevel * 100),
        calm: Math.round(calmLevel * 100),
        nervous: Math.round(nervousLevel * 100),
        surprised: Math.round(surprisedLevel * 100),
        tense: Math.round(tenseLevel * 100),
        uncertain: Math.round(uncertainLevel * 100),
      },
      nervousScore,
      isNervous: nervousScore >= 18 || highAlertRatio >= 0.3 || avgMotion >= 18,
      samplesCaptured: samples.length,
    };
  };

  const evaluateWithAI = async (
    question: string,
    answer: string,
  ): Promise<{
    score: number;
    text: string;
    correctness: "correct" | "partially-correct" | "incorrect" | "unknown";
    reason: string;
  } | null> => {
    try {
      const res = await fetch("/api/evaluate-answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roleTitle,
          question,
          answer,
        }),
      });

      if (!res.ok) return null;
      const data = await res.json();

      return {
        score: Number(data?.score ?? 0),
        text: String(data?.feedback ?? "AI evaluation unavailable."),
        correctness: (["correct", "partially-correct", "incorrect", "unknown"].includes(
          String(data?.correctness),
        )
          ? data.correctness
          : "unknown") as "correct" | "partially-correct" | "incorrect" | "unknown",
        reason: `${data?.source ? `[${String(data.source)}] ` : ""}${String(
          String(data?.reason ?? "").trim() || "Reason unavailable from evaluator.",
        )}`,
      };
    } catch {
      return null;
    }
  };

  const generateFollowupWithAI = async (
    originalQuestion: string,
    userAnswer: string,
    score: number,
  ): Promise<string | null> => {
    try {
      const res = await fetch("/api/generate-followup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roleTitle,
          originalQuestion,
          userAnswer,
          answerScore: score,
        }),
      });

      if (!res.ok) return null;
      const data = await res.json();

      return String(data?.followupQuestion ?? "").trim() || null;
    } catch {
      return null;
    }
  };

  const deriveCorrectnessFromScore = (
    score: number,
  ): "correct" | "partially-correct" | "incorrect" => {
    if (score >= 7) return "correct";
    if (score >= 4) return "partially-correct";
    return "incorrect";
  };

  const buildPriorityTopics = (entries: QuestionPerformance[]): string[] => {
    return entries
      .map((entry) => {
        const weakness =
          (10 - entry.score) * 5 +
          entry.stammerMetrics.stammerScore * 0.4 +
          entry.emotionalState.nervousScore * 0.5;
        return { question: entry.question, weakness };
      })
      .sort((a, b) => b.weakness - a.weakness)
      .slice(0, 3)
      .map((item) => item.question);
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    isSpeakingRef.current = isSpeaking;
  }, [isSpeaking]);

  useEffect(() => {
    micArmedRef.current = micArmed;
  }, [micArmed]);

  useEffect(() => {
    micEnabledRef.current = micEnabled;
    if (!micEnabled) {
      micArmedRef.current = false;
      setMicArmed(false);
      setMicError(null);
      try {
        recognitionRef.current?.stop();
      } catch (_e) {
        // noop
      }
      setIsListening(false);
    }
  }, [micEnabled]);

  const buildRecognition = () => {
    const SpeechRecognitionCtor =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognitionCtor) return null;

    const recognition = new SpeechRecognitionCtor();
    recognition.lang = 'en-US';
    recognition.interimResults = true;
    recognition.continuous = true;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event: any) => {
      let finalTranscript = "";
      let interimTranscript = "";

      for (let i = 0; i < event.results.length; i += 1) {
        const result = event.results[i];
        const chunk = result[0]?.transcript ?? "";
        if (result.isFinal) {
          finalTranscript += ` ${chunk}`;
        } else {
          interimTranscript += ` ${chunk}`;
        }
      }

      const normalizedFinal = finalTranscript.trim();
      if (normalizedFinal) {
        speechFinalRef.current = normalizedFinal;
      }

      const combined = `${speechFinalRef.current} ${interimTranscript.trim()}`.trim();
      if (combined) {
        const now = Date.now();
        const events = speechEventTimelineRef.current;
        const last = events[events.length - 1] ?? 0;
        if (now - last > 350) {
          speechEventTimelineRef.current = [...events, now].slice(-800);
        }
      }
      setInputValue(combined);
    };

    recognition.onstart = () => {
      setIsListening(true);
      setMicError(null);
    };

    recognition.onend = () => {
      setIsListening(false);
      // Browsers can end recognition after pauses. Re-arm automatically unless bot is talking.
      if (
        !isUnmountedRef.current &&
        micArmedRef.current &&
        micEnabledRef.current &&
        !isSpeakingRef.current
      ) {
        window.setTimeout(() => {
          try {
            recognition.start();
          } catch (_e) {
            // noop
          }
        }, 250);
      }
    };

    recognition.onerror = (e: any) => {
      console.error('Speech recognition error', e);
      setIsListening(false);

      const code = String(e?.error ?? '');
      if (code === 'not-allowed' || code === 'service-not-allowed') {
        setMicArmed(false);
        setMicError('Microphone permission denied. Please allow mic access in browser settings.');
      } else if (code === 'no-speech') {
        setMicError('No speech detected. Try speaking louder and closer to the mic.');
      } else if (code === 'audio-capture') {
        setMicArmed(false);
        setMicError('No microphone was found by the browser. Check system input device.');
      } else {
        setMicError('Speech recognition error. Please retry the microphone.');
      }
    };

    recognitionRef.current = recognition;
    return recognition;
  };

  const startMicCapture = () => {
    const recognition = recognitionRef.current ?? buildRecognition();
    if (!recognition) return false;

    try {
      recognition.start();
      return true;
    } catch (_e) {
      return false;
    }
  };

  const stopMicCapture = () => {
    const recognition = recognitionRef.current;
    if (!recognition) return;

    try {
      recognition.stop();
    } catch (_e) {
      // noop
    }

    if (typeof recognition.abort === "function") {
      try {
        recognition.abort();
      } catch (_e) {
        // noop
      }
    }
  };

  const ensureMicPermission = async (): Promise<boolean> => {
    if (!navigator?.mediaDevices?.getUserMedia) {
      return true;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      stream.getTracks().forEach((track) => track.stop());
      return true;
    } catch (_e) {
      setMicError('Microphone permission blocked. Allow microphone access and retry.');
      setMicArmed(false);
      return false;
    }
  };

  const speak = (text: string) => {
    if (textOnly) return;
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      window.speechSynthesis.speak(utterance);
    }
  };

  const handleSendMessage = async () => {
    const answerText = inputValue.trim();
    if (!answerText) return;

    const sentAt = Date.now();

    const newUserMsg: Message = {
      id: sentAt.toString(),
      role: 'user',
      content: answerText,
    };

    setMessages((prev) => [...prev, newUserMsg]);
    setInputValue('');

    setTimeout(async () => {
      let feedback = undefined;
      let followupQuestion: string | null = null;

      if (currentQuestionIndex >= 0 && !hasFollowup) {
        const localFeedback = scoreAnswer(answerText, currentQuestionIndex);
        const aiFeedback = await evaluateWithAI(
          initialQuestions[currentQuestionIndex],
          answerText,
        );
        feedback = {
          score:
            aiFeedback && aiFeedback.score > 0
              ? aiFeedback.score
              : localFeedback.score,
          text:
            aiFeedback?.text && aiFeedback.text !== "AI evaluator unavailable. Using local scoring fallback."
              ? aiFeedback.text
              : localFeedback.text,
          correctness:
            aiFeedback?.correctness && aiFeedback.correctness !== "unknown"
              ? aiFeedback.correctness
              : deriveCorrectnessFromScore(localFeedback.score),
          reason: aiFeedback?.reason || "[fallback] Local keyword evaluator used.",
        };

        const questionStartedAt = questionAskedAtRef.current[currentQuestionIndex] ?? sentAt - 60000;
        const emotionWindow = getEmotionSamples?.(questionStartedAt, sentAt) ?? [];
        const speechWindow = speechEventTimelineRef.current.filter(
          (timestamp) => timestamp >= questionStartedAt && timestamp <= sentAt,
        );

        const performance: QuestionPerformance = {
          questionIndex: currentQuestionIndex,
          question: initialQuestions[currentQuestionIndex],
          answer: answerText,
          score: feedback.score,
          feedback: feedback.text,
          correctness: feedback.correctness,
          correctnessReason: feedback.reason,
          startedAt: questionStartedAt,
          answeredAt: sentAt,
          emotionalState: analyzeEmotions(emotionWindow),
          stammerMetrics: analyzeStammer(answerText, {
            startedAt: questionStartedAt,
            endedAt: sentAt,
            speechEventTimes: speechWindow,
          }),
        };

        questionReportsRef.current = [...questionReportsRef.current, performance];
        consecutiveSkipsRef.current = 0; // Reset skip counter on successful answer
        // This makes the interview adaptive and conversational
        if (feedback.score >= 4 && feedback.score < 8) {
          const generated = await generateFollowupWithAI(
            initialQuestions[currentQuestionIndex],
            answerText,
            feedback.score,
          );
          if (generated) {
            followupQuestion = generated;
          }
        }
      }

      let nextContent = '';

      if (currentQuestionIndex === -1) {
        questionAskedAtRef.current[0] = Date.now();
        nextContent = `Great. Let's start. ${initialQuestions[0]}`;
        setCurrentQuestionIndex(0);
        setHasFollowup(false);
      } else if (hasFollowup && followupQuestion) {
        // Show the generated follow-up question
        nextContent = followupQuestion;
        setHasFollowup(false);
      } else if (hasFollowup) {
        // No follow-up generated, move to next question
        const nextIndex = currentQuestionIndex + 1;
        if (nextIndex < initialQuestions.length) {
          questionAskedAtRef.current[nextIndex] = Date.now();
          nextContent = `Thank you. Next question: ${initialQuestions[nextIndex]}`;
          setCurrentQuestionIndex(nextIndex);
        } else {
          nextContent = "That concludes our interview session. Let's review your performance.";

          const entries = questionReportsRef.current;
          const avgScore = entries.length
            ? Number((entries.reduce((sum, item) => sum + item.score, 0) / entries.length).toFixed(2))
            : 0;

          const report: InterviewSessionReport = {
            sessionId: `session-${Date.now()}`,
            roleId,
            roleTitle,
            startedAt: sessionStartRef.current,
            endedAt: Date.now(),
            totalQuestions: initialQuestions.length,
            avgScore,
            nervousMoments: entries.filter((item) => item.emotionalState.isNervous).length,
            stammerMoments: entries.filter((item) => item.stammerMetrics.isStammering).length,
            questions: entries,
            priorityTopics: buildPriorityTopics(entries),
          };

          setTimeout(() => onComplete(report), 1500);
        }
        setHasFollowup(false);
      } else if (followupQuestion) {
        // Have a follow-up question to ask
        nextContent = followupQuestion;
        setHasFollowup(true);
      } else {
        // No follow-up, move to next question
        const nextIndex = currentQuestionIndex + 1;
        if (nextIndex < initialQuestions.length) {
          questionAskedAtRef.current[nextIndex] = Date.now();
          nextContent = `Thank you. Next question: ${initialQuestions[nextIndex]}`;
          setCurrentQuestionIndex(nextIndex);
        } else {
          nextContent = "That concludes our interview session. Let's review your performance.";

          const entries = questionReportsRef.current;
          const avgScore = entries.length
            ? Number((entries.reduce((sum, item) => sum + item.score, 0) / entries.length).toFixed(2))
            : 0;

          const report: InterviewSessionReport = {
            sessionId: `session-${Date.now()}`,
            roleId,
            roleTitle,
            startedAt: sessionStartRef.current,
            endedAt: Date.now(),
            totalQuestions: initialQuestions.length,
            avgScore,
            nervousMoments: entries.filter((item) => item.emotionalState.isNervous).length,
            stammerMoments: entries.filter((item) => item.stammerMetrics.isStammering).length,
            questions: entries,
            priorityTopics: buildPriorityTopics(entries),
          };

          setTimeout(() => onComplete(report), 1500);
        }
      }

      const botMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: nextContent,
        feedback,
      };

      setMessages((prev) => [...prev, botMsg]);
      speak(nextContent);
    }, 1200);
  };

  const handleSkip = async () => {
    const sentAt = Date.now();

    // If interview hasn't started yet, start with first question
    if (currentQuestionIndex === -1) {
      questionAskedAtRef.current[0] = Date.now();
      const nextContent = `Okay. Let's start. ${initialQuestions[0]}`;
      setCurrentQuestionIndex(0);
      const botMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: nextContent,
      };
      setMessages((prev) => [...prev, botMsg]);
      speak(nextContent);
      return;
    }

    // Build a skipped performance entry for current question
    const questionStartedAt = questionAskedAtRef.current[currentQuestionIndex] ?? sentAt;
    const emotionWindow = getEmotionSamples?.(questionStartedAt, sentAt) ?? [];

    const performance = {
      questionIndex: currentQuestionIndex,
      question: initialQuestions[currentQuestionIndex],
      answer: '',
      score: 0,
      feedback: 'Skipped by user.',
      correctness: 'unknown',
      correctnessReason: 'Skipped by user.',
      startedAt: questionStartedAt,
      answeredAt: sentAt,
      emotionalState: analyzeEmotions(emotionWindow),
      stammerMetrics: analyzeStammer('', { startedAt: questionStartedAt, endedAt: sentAt, speechEventTimes: [] }),
    } as any;

    questionReportsRef.current = [...questionReportsRef.current, performance];

    // Increment consecutive skips
    consecutiveSkipsRef.current += 1;

    // Check if 7 consecutive skips reached - end interview due to zero preparation
    const SKIP_LIMIT = 7;
    if (consecutiveSkipsRef.current >= SKIP_LIMIT) {
      const entries = questionReportsRef.current;
      const avgScore = entries.length
        ? Number((entries.reduce((sum, item) => sum + item.score, 0) / entries.length).toFixed(2))
        : 0;

      const endMsg: Message = {
        id: (Date.now() + 2).toString(),
        role: 'assistant',
        content: "You have skipped 7 consecutive questions. This indicates insufficient preparation. Interview ended.",
      };

      setMessages((prev) => [...prev, endMsg]);
      speak("You have skipped 7 consecutive questions. This indicates insufficient preparation. Interview ended.");

      const report: InterviewSessionReport = {
        sessionId: `session-${Date.now()}`,
        roleId,
        roleTitle,
        startedAt: sessionStartRef.current,
        endedAt: Date.now(),
        totalQuestions: initialQuestions.length,
        avgScore,
        nervousMoments: entries.filter((item) => item.emotionalState.isNervous).length,
        stammerMoments: entries.filter((item) => item.stammerMetrics.isStammering).length,
        questions: entries,
        priorityTopics: buildPriorityTopics(entries),
      };

      setTimeout(() => onComplete(report), 2000);
      return;
    }

    const nextIndex = currentQuestionIndex + 1;
    let nextContent = '';

    if (nextIndex < initialQuestions.length) {
      questionAskedAtRef.current[nextIndex] = Date.now();
      nextContent = `Skipped. Next question: ${initialQuestions[nextIndex]}`;
      setCurrentQuestionIndex(nextIndex);
      setHasFollowup(false);
    } else {
      nextContent = "That concludes our interview session. Let's review your performance.";

      const entries = questionReportsRef.current;
      const avgScore = entries.length
        ? Number((entries.reduce((sum, item) => sum + item.score, 0) / entries.length).toFixed(2))
        : 0;

      const report: InterviewSessionReport = {
        sessionId: `session-${Date.now()}`,
        roleId,
        roleTitle,
        startedAt: sessionStartRef.current,
        endedAt: Date.now(),
        totalQuestions: initialQuestions.length,
        avgScore,
        nervousMoments: entries.filter((item) => item.emotionalState.isNervous).length,
        stammerMoments: entries.filter((item) => item.stammerMetrics.isStammering).length,
        questions: entries,
        priorityTopics: buildPriorityTopics(entries),
      };

      setTimeout(() => onComplete(report), 1200);
    }

    const botMsg: Message = {
      id: (Date.now() + 2).toString(),
      role: 'assistant',
      content: nextContent,
    };

    setMessages((prev) => [...prev, botMsg]);
    speak(nextContent);
  };

  const toggleMic = async () => {
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      alert('Speech recognition is not supported in this browser.');
      return;
    }

    if (micArmed || isListening) {
      micArmedRef.current = false;
      setMicArmed(false);
      setMicError(null);
      setIsListening(false);
      stopMicCapture();
    } else {
      const allowed = await ensureMicPermission();
      if (!allowed) return;

      micArmedRef.current = true;
      setMicArmed(true);
      setMicError(null);
      speechFinalRef.current = "";
      speechEventTimelineRef.current = [];
      if (!isSpeaking) {
        const started = startMicCapture();
        if (!started) {
          micArmedRef.current = false;
          setMicArmed(false);
          setMicError('Unable to start microphone. Check browser mic permission and try again.');
        }
      }
    }
  };

  useEffect(() => {
    if (!micArmed || !micEnabled) return;

    if (isSpeaking) {
      // Mute recognition while bot speaks to avoid self-transcription and echo loops.
      try {
        recognitionRef.current?.stop();
      } catch (_e) {
        // noop
      }
      return;
    }

    if (!isListening) {
      const started = startMicCapture();
      if (!started) {
        setMicError('Unable to restart microphone automatically. Tap mic once to retry.');
      }
    }
  }, [isSpeaking, micArmed, isListening, micEnabled]);

  useEffect(() => {
    return () => {
      isUnmountedRef.current = true;
      micArmedRef.current = false;
      stopMicCapture();
      if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    };
  }, []);

  return (
    <div className="flex flex-col h-150 w-full max-w-4xl mx-auto bg-card/50 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
      <div className="p-4 border-b border-white/10 flex items-center justify-between bg-white/5">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div
              className={cn(
                'w-2 h-2 rounded-full absolute -top-0.5 -right-0.5',
                isSpeaking ? 'bg-green-500 animate-ping' : 'bg-gray-500',
              )}
            />
            <Bot className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="font-medium text-sm">AI Interviewer</h3>
            <p className="text-xs text-muted-foreground">{roleTitle}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-muted-foreground">
            {Math.max(currentQuestionIndex + 1, 0)} / {initialQuestions.length}
          </span>
          <div className="h-1 w-20 bg-secondary rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-500"
              style={{ width: `${Math.max(((currentQuestionIndex + 1) / initialQuestions.length) * 100, 0)}%` }}
            />
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6" ref={scrollRef}>
        <AnimatePresence initial={false}>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn('flex gap-4 max-w-[85%]', msg.role === 'user' ? 'ml-auto flex-row-reverse' : '')}
            >
              <div
                className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center shrink-0 border shadow-sm mt-1',
                  msg.role === 'assistant'
                    ? 'bg-primary/20 border-primary/30'
                    : 'bg-secondary border-white/10',
                )}
              >
                {msg.role === 'assistant' ? (
                  <img src={avatarImage} className="w-full h-full object-cover rounded-full" />
                ) : (
                  <User className="w-4 h-4" />
                )}
              </div>

              <div className="space-y-2">
                <div
                  className={cn(
                    'p-3 rounded-2xl text-sm leading-relaxed shadow-sm',
                    msg.role === 'assistant'
                      ? 'bg-secondary/50 border border-white/5 text-foreground rounded-tl-none'
                      : 'bg-primary text-primary-foreground rounded-tr-none',
                  )}
                >
                  {msg.content}
                </div>

                {msg.feedback && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="bg-accent/30 border border-accent/50 rounded-xl p-3 text-xs space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1 text-primary font-medium">
                        <Sparkles className="w-3 h-3" /> AI Analysis
                      </span>
                      <span className="bg-primary/20 text-primary px-1.5 py-0.5 rounded text-[10px] font-mono">
                        Score: {msg.feedback.score}/10
                      </span>
                    </div>
                    <p className="text-muted-foreground">{msg.feedback.text}</p>
                    <p className="text-[10px] text-muted-foreground/80">
                      Correctness: {msg.feedback.correctness ?? "unknown"}{msg.feedback.reason ? ` - ${msg.feedback.reason}` : ""}
                    </p>
                  </motion.div>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {isSpeaking && (
          <div className="flex gap-1 ml-12">
            <span className="w-1.5 h-1.5 bg-primary/50 rounded-full animate-bounce delay-0"></span>
            <span className="w-1.5 h-1.5 bg-primary/50 rounded-full animate-bounce delay-150"></span>
            <span className="w-1.5 h-1.5 bg-primary/50 rounded-full animate-bounce delay-300"></span>
          </div>
        )}
      </div>

      <div className="p-4 bg-white/5 border-t border-white/10">
        <div className="flex gap-2">
          <Button
            variant={isListening ? 'destructive' : 'secondary'}
            size="icon"
            onClick={toggleMic}
            className="shrink-0 rounded-full w-10 h-10"
            disabled={!micEnabled}
          >
            {isListening ? <StopCircle className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </Button>

          <form
            className="flex-1 flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
          >
            <Input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Type your answer or use microphone..."
              className="bg-black/20 border-white/10 focus-visible:ring-primary/50"
              autoFocus
            />
            <div className="flex items-center gap-2">
              <Button type="button" variant="ghost" size="sm" onClick={handleSkip} className="rounded-full">
                Skip
              </Button>
              <Button type="submit" size="icon" disabled={!inputValue.trim()} className="rounded-full w-10 h-10 shrink-0">
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </form>
        </div>
        <div className="text-[10px] text-center mt-2 text-muted-foreground">
          {micError
            ? micError
            : isSpeaking && micArmed
              ? 'Microphone paused while interviewer is speaking.'
              : isListening
                ? 'Listening... (Speak clearly)'
                : 'Pro tip: Give one concrete example in every answer.'}
        </div>
      </div>
    </div>
  );
}
