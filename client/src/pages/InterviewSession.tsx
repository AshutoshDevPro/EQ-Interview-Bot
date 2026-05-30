import { useParams, useLocation } from "wouter";
import { ROLES } from "@/lib/mockData";
import { WebcamPreview } from "@/components/interview/WebcamPreview";
import { ChatInterface } from "@/components/interview/ChatInterface";
import { InterviewComplete } from "@/components/interview/InterviewComplete";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Timer, Video, Mic, Type } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import type { EmotionSample, InterviewSessionReport } from "@/lib/interviewReport";
import { LATEST_REPORT_STORAGE_KEY } from "@/lib/interviewReport";
import { saveInterviewReport } from "@/lib/interviewStore";
import { useAuth } from "@/hooks/useAuth";

export default function InterviewSession() {
  const { roleId } = useParams();
  const [location, setLocation] = useLocation();
  const { user, isAuthenticated, isFirebaseReady } = useAuth();
  
  // Use browser's native window.location.search instead of wouter location
  const queryParams = new URLSearchParams(window.location.search);
  const customTopic = queryParams.get('topic');
  
  const config = {
    camera: queryParams.get('camera') === 'true',
    mic: queryParams.get('mic') === 'true',
    textOnly: queryParams.get('textOnly') === 'true'
  };

  const role = customTopic 
    ? { 
        id: 'custom', 
        title: customTopic, 
        questions: [
          `Can you give me an overview of your experience with ${customTopic}?`,
          `What are some of the biggest challenges you've faced when working with ${customTopic}?`,
          `How do you stay up to date with the latest developments in ${customTopic}?`
        ] 
      }
    : (ROLES.find(r => r.id === roleId) || ROLES[0]);

  // Limit questions to max 10
  const limitedQuestions = role.questions.slice(0, 10);
  const roleWithLimitedQuestions = { ...role, questions: limitedQuestions };

  const [timeLeft, setTimeLeft] = useState(60);
  const [isInterviewComplete, setIsInterviewComplete] = useState(false);
  const [completedReport, setCompletedReport] = useState<InterviewSessionReport | null>(null);
  const emotionSamplesRef = useRef<EmotionSample[]>([]);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => prev > 0 ? prev - 1 : 60);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Request media permissions up-front so the browser prompts the user
  useEffect(() => {
    if (typeof navigator !== 'undefined' && (config.camera || config.mic)) {
      const constraints: MediaStreamConstraints = {
        video: !!config.camera,
        audio: !!config.mic,
      };
      navigator.mediaDevices.getUserMedia(constraints).then((stream) => {
        // immediately stop tracks - we just prompt for permissions here
        stream.getTracks().forEach(t => t.stop());
      }).catch((err) => {
        console.warn('Media permissions error:', err);
      });
    }
  }, [config.camera, config.mic]);

  const handleEmotionSample = (sample: EmotionSample) => {
    const tenMinutesAgo = Date.now() - 10 * 60 * 1000;
    const next = [...emotionSamplesRef.current, sample].filter(
      (item) => item.timestamp >= tenMinutesAgo,
    );
    emotionSamplesRef.current = next;
  };

  const getEmotionSamples = (startAt: number, endAt: number): EmotionSample[] => {
    return emotionSamplesRef.current.filter(
      (sample) => sample.timestamp >= startAt && sample.timestamp <= endAt,
    );
  };

  const handleComplete = (report: InterviewSessionReport) => {
    localStorage.setItem(LATEST_REPORT_STORAGE_KEY, JSON.stringify(report));
    setCompletedReport(report);
    setIsInterviewComplete(true);

    if (isAuthenticated && isFirebaseReady && user?.id) {
      void saveInterviewReport(user.id, report).catch((error) => {
        console.error("Failed to save interview report to Firestore:", error);
      });
    }
  };

  const handleViewFeedback = () => {
    setLocation("/feedback-details");
  };

  return (
    <>
      {isInterviewComplete && completedReport ? (
        <InterviewComplete report={completedReport} onViewFeedback={handleViewFeedback} />
      ) : (
        <div className="min-h-screen pt-20 pb-8 px-4 flex flex-col items-center gap-6 bg-[radial-gradient(ellipse_at_top,var(--tw-gradient-stops))] from-primary/10 via-background to-background">
          
          {/* Top Bar */}
          <div className="w-full max-w-6xl flex items-center justify-between mb-2">
            <div className="flex items-center gap-4">
              <Button variant="ghost" className="gap-2 text-muted-foreground hover:text-white" onClick={() => setLocation("/setup")}>
                <ArrowLeft className="w-4 h-4" /> Exit
              </Button>
              <div className="flex items-center gap-2">
                {config.camera && <Badge variant="secondary" className="gap-1 bg-blue-500/10 text-blue-400 border-blue-500/20"><Video className="w-3 h-3" /> Video</Badge>}
                {config.mic && <Badge variant="secondary" className="gap-1 bg-purple-500/10 text-purple-400 border-purple-500/20"><Mic className="w-3 h-3" /> Voice</Badge>}
                {config.textOnly && <Badge variant="secondary" className="gap-1 bg-green-500/10 text-green-400 border-green-500/20"><Type className="w-3 h-3" /> Text</Badge>}
              </div>
            </div>
            <div className="flex items-center gap-2 bg-secondary/50 px-4 py-2 rounded-full border border-white/5">
               <Timer className="w-4 h-4 text-primary" />
               <span className="font-mono font-medium text-lg">{timeLeft}s</span>
               <span className="text-xs text-muted-foreground ml-2">answer limit</span>
            </div>
          </div>

          <div className="w-full max-w-6xl grid lg:grid-cols-[1.5fr_1fr] gap-6 h-[calc(100vh-180px)]">
            {/* Main Chat Area */}
            <div className="h-full flex flex-col">
              <ChatInterface 
                roleId={roleWithLimitedQuestions.id} 
                roleTitle={roleWithLimitedQuestions.title} 
                initialQuestions={roleWithLimitedQuestions.questions}
                onComplete={handleComplete}
                micEnabled={config.mic}
                textOnly={config.textOnly}
                getEmotionSamples={getEmotionSamples}
              />
            </div>

            {/* Sidebar: Webcam & Info */}
            <div className="flex flex-col gap-6">
              {config.camera && (
                <div className="bg-card/50 backdrop-blur border border-white/10 rounded-2xl p-1 shadow-2xl">
                  <WebcamPreview
                    audio={config.mic}
                    onEmotionSample={handleEmotionSample}
                  />
                </div>
              )}
              
              <div className="flex-1 bg-card/50 backdrop-blur border border-white/10 rounded-2xl p-6 overflow-y-auto">
                <h3 className="font-display font-bold text-lg mb-4 text-white">Focus Areas</h3>
                <ul className="space-y-4">
                   <li className="flex gap-3 text-sm text-muted-foreground">
                     <div className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center shrink-0">1</div>
                     Speak clearly and maintain a steady pace.
                   </li>
                   <li className="flex gap-3 text-sm text-muted-foreground">
                     <div className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center shrink-0">2</div>
                     Use the "STAR" method (Situation, Task, Action, Result) for behavioral questions.
                   </li>
                   <li className="flex gap-3 text-sm text-muted-foreground">
                     <div className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center shrink-0">3</div>
                     Keep answers concise (under 60s).
                   </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
