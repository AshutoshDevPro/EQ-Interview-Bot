import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertTriangle,
  Brain,
  CheckCircle2,
  CircleHelp,
  Mic,
  Smile,
  TrendingUp,
  Trash2,
} from "lucide-react";
import {
  LATEST_REPORT_STORAGE_KEY,
  type NervousMetrics,
  type InterviewSessionReport,
  type StammerMetrics,
} from "@/lib/interviewReport";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { getInterviewReports, deleteInterviewReport, type StoredInterviewReport } from "@/lib/interviewStore";

function loadReport(): InterviewSessionReport | null {
  try {
    const raw = localStorage.getItem(LATEST_REPORT_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as InterviewSessionReport;
  } catch (_error) {
    return null;
  }
}

function formatDate(value: number): string {
  return new Date(value).toLocaleString();
}

function badgeClassForState(state: string): string {
  if (state === "confident") return "bg-emerald-500/15 text-emerald-300 border-emerald-500/30";
  if (state === "calm") return "bg-green-500/15 text-green-300 border-green-500/30";
  if (state === "surprised") return "bg-blue-500/15 text-blue-300 border-blue-500/30";
  if (state === "nervous") return "bg-amber-500/15 text-amber-300 border-amber-500/30";
  if (state === "tense") return "bg-red-500/15 text-red-300 border-red-500/30";
  return "bg-red-500/15 text-red-300 border-red-500/30";
}

function getDisplayState(emotionalState: NervousMetrics): { state: string; confidence: number } {
  if (emotionalState.primaryState) {
    return {
      state: emotionalState.primaryState,
      confidence: Number(emotionalState.stateConfidence ?? 0),
    };
  }

  const legacy = emotionalState.dominantEmotion;
  if (legacy === "happiness") return { state: "confident", confidence: Math.round(emotionalState.emotionConfidence * 100) };
  if (legacy === "neutral") return { state: "calm", confidence: Math.round(emotionalState.emotionConfidence * 100) };
  if (legacy === "surprise") return { state: "surprised", confidence: Math.round(emotionalState.emotionConfidence * 100) };
  if (legacy === "fear" || legacy === "sad") return { state: "nervous", confidence: Math.round(emotionalState.emotionConfidence * 100) };
  if (legacy === "anger" || legacy === "disgust") return { state: "tense", confidence: Math.round(emotionalState.emotionConfidence * 100) };
  return { state: "uncertain", confidence: Math.round(emotionalState.emotionConfidence * 100) };
}

function generateCoachingNote(
  score: number,
  state: { state: string; confidence: number },
  stammer: StammerMetrics,
  emotionalState: NervousMetrics,
  correctness: string,
): string {
  // Score < 5: Content gaps are the priority
  if (score < 5) {
    if (stammer.fillerWordCount > 8) {
      return "Content knowledge is weak AND delivery has many fillers. First: Study this topic deeply. Second: Practice speaking it out loud (not in your head).";
    }
    if (emotionalState.isNervous) {
      return "You knew less about this topic and got nervous. Research this area thoroughly before your next attempt. Write out a full answer first.";
    }
    return "You need deeper knowledge on this topic. Review resources, take notes, and practice a structured 2-minute answer using the STAR method.";
  }

  // Score 5-7: Mixed performance
  if (score < 7) {
    if (stammer.wordsPerMinute ?? 0 > 140) {
      return "Answer was decent but you spoke too fast. Slow down to 120 WPM. Practice this question daily until speed feels natural.";
    }
    if (stammer.fillerWordCount > 5) {
      return "Good content but delivery weakened by fillers (um, uh, like). Record yourself. Each time you hear a filler, redo that sentence.";
    }
    if (emotionalState.nervousScore > 50) {
      return "You had the right ideas but nervousness showed. Do 2 mock interviews this week with this exact question to build confidence.";
    }
    return "Solid answer but room to improve. Practice it 3 more times and focus on adding one specific example or metric.";
  }

  // Score >= 7: Good performance
  if (state.state === "confident" || state.state === "calm") {
    return "Excellent delivery! You were clear and confident. Save this answer structure - use it as a template for similar questions in future interviews.";
  }

  if (stammer.stammerScore < 30) {
    return "Great answer with smooth delivery. This is interview-ready! Practice similar topics using the same framework you built here.";
  }

  if (emotionalState.nervousScore < 30) {
    return "Strong performance despite minor nervousness. You handled this well. In your next interview, take a deep breath before questions like this.";
  }

  return "Solid answer! You covered the key points clearly. Practice this structure with other similar questions to reinforce your approach.";
}

function getStateReasonLines(emotionalState: NervousMetrics, stammer: StammerMetrics): string[] {
  const reasons: Array<{ label: string; value: number }> = [];

  if (emotionalState.deliveryStates) {
    const levels = emotionalState.deliveryStates;
    reasons.push({ label: "confident signal", value: levels.confident });
    reasons.push({ label: "calm signal", value: levels.calm });
    reasons.push({ label: "nervous signal", value: levels.nervous });
    reasons.push({ label: "surprised signal", value: levels.surprised });
    reasons.push({ label: "tense signal", value: levels.tense });
    reasons.push({ label: "uncertain signal", value: levels.uncertain });
  }

  reasons.push({ label: "nervous score", value: emotionalState.nervousScore });
  reasons.push({ label: "stammer score", value: stammer.stammerScore });
  reasons.push({ label: "filler words", value: stammer.fillerWordCount * 8 });
  reasons.push({ label: "repeated words", value: stammer.repeatedWordCount * 12 });
  reasons.push({ label: "long pauses", value: (stammer.longPauseCount ?? 0) * 15 });

  if ((stammer.wordsPerMinute ?? 0) > 0) {
    const wpm = stammer.wordsPerMinute ?? 0;
    const paceDeviation = Math.abs(120 - wpm);
    reasons.push({ label: "pace instability", value: Math.min(100, Math.round(paceDeviation)) });
  }

  return reasons
    .sort((a, b) => b.value - a.value)
    .slice(0, 3)
    .map((item) => `${item.label}: ${item.value}%`);
}

export default function Dashboard() {
  const { user, isAuthenticated, isFirebaseReady } = useAuth();
  const [, setLocation] = useLocation();

  const [localReport] = useState<InterviewSessionReport | null>(() => loadReport());
  const [reports, setReports] = useState<StoredInterviewReport[]>([]);
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  const [historyError, setHistoryError] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  useEffect(() => {
    if (!isAuthenticated || !isFirebaseReady || !user?.id) return;

    setIsLoadingHistory(true);
    setHistoryError(null);

    void getInterviewReports(user.id)
      .then((rows) => {
        setReports(rows);
        if (rows.length > 0) {
          setSelectedReportId((prev) => prev ?? rows[0].id);
        }
      })
      .catch((error) => {
        console.error("Failed to load interview history:", error);
        setHistoryError("Unable to load interview history from Firebase.");
      })
      .finally(() => {
        setIsLoadingHistory(false);
      });
  }, [isAuthenticated, isFirebaseReady, user?.id]);

  const selectedReport = useMemo<InterviewSessionReport | null>(() => {
    if (reports.length > 0) {
      const match = reports.find((report) => report.id === selectedReportId);
      return match ?? reports[0];
    }
    return localReport;
  }, [reports, selectedReportId, localReport]);

  const openFeedback = (report: InterviewSessionReport) => {
    localStorage.setItem(LATEST_REPORT_STORAGE_KEY, JSON.stringify(report));
    setLocation("/feedback-details");
  };

const handleDeleteReport = async (reportId: string) => {
  if (!user?.id) return;
  
  setIsDeleting(true);
  try {
    const success = await deleteInterviewReport(user.id, reportId);
    if (success) {
      setReports((prev) => prev.filter((r) => r.id !== reportId));
      if (selectedReportId === reportId) {
        setSelectedReportId(reports.length > 1 ? reports[0]?.id ?? null : null);
      }
    } else {
      setHistoryError("Failed to delete interview. Please try again.");
    }
  } catch (error) {
    console.error("Error deleting interview:", error);
    setHistoryError("An error occurred while deleting the interview.");
  } finally {
    setIsDeleting(false);
    setDeleteConfirmId(null);
  }
};

if (!selectedReport) {
    return (
      <div className="min-h-screen pt-24 pb-12 container px-4 mx-auto max-w-6xl space-y-4">
        <Card className="glass-panel border-white/10 bg-transparent">
          <CardHeader>
            <CardTitle>No Interview Data Yet</CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground">
            Complete an interview session first. Your per-question delivery state, nervous moments, stammer analysis, and history will appear here.
          </CardContent>
        </Card>
        {!isFirebaseReady && (
          <Card className="glass-panel border-white/10 bg-transparent">
            <CardContent className="pt-6 text-sm text-muted-foreground">
              Firebase is not configured. Add VITE_FIREBASE_* variables to enable cloud history.
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  const strongAnswers = selectedReport.questions.filter((q) => q.score >= 7).length;
  const weakAnswers = selectedReport.questions.filter((q) => q.score <= 4).length;

  return (
    <div className="min-h-screen pt-24 pb-12 container px-4 mx-auto max-w-7xl space-y-8">
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
        <h1 className="text-4xl font-display font-bold mb-2">Interview Performance Dashboard</h1>
        <p className="text-muted-foreground">
          Session for <span className="text-white">{selectedReport.roleTitle}</span> started {formatDate(selectedReport.startedAt)}.
        </p>
      </div>

      <Card className="glass-panel border-white/10 bg-transparent">
        <CardHeader>
          <CardTitle>Previous Interviews</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {isLoadingHistory && <p className="text-sm text-muted-foreground">Loading interview history...</p>}
          {historyError && <p className="text-sm text-red-300">{historyError}</p>}

          {!isLoadingHistory && reports.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No cloud history yet. Your latest completed interview is still available locally.
            </p>
          )}

          {reports.length > 0 && (
            <div className="space-y-2">
              {reports.map((report) => (
                <div
                  key={report.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/5 p-3"
                >
                  <div>
                    <p className="font-medium text-sm text-white">{report.roleTitle}</p>
                    <p className="text-xs text-muted-foreground">{formatDate(report.endedAt)}</p>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <Badge variant="secondary">Score {report.avgScore.toFixed(1)}/10</Badge>
                    <Badge variant="secondary">Nervous {report.nervousMoments}</Badge>
                    <Badge variant="secondary">Stammer {report.stammerMoments}</Badge>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant={selectedReportId === report.id ? "default" : "outline"}
                      onClick={() => setSelectedReportId(report.id)}
                    >
                      View on Dashboard
                    </Button>
                    <Button size="sm" onClick={() => openFeedback(report)}>
                      Detailed Feedback
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                      onClick={() => setDeleteConfirmId(report.id)}
                      disabled={isDeleting}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <StatsCard title="Avg Score" value={selectedReport.avgScore.toFixed(2)} icon={<TrendingUp className="w-4 h-4 text-green-300" />} />
        <StatsCard title="Nervous Moments" value={String(selectedReport.nervousMoments)} icon={<AlertTriangle className="w-4 h-4 text-red-300" />} />
        <StatsCard title="Stammer Moments" value={String(selectedReport.stammerMoments)} icon={<Mic className="w-4 h-4 text-yellow-300" />} />
        <StatsCard title="Strong Answers" value={String(strongAnswers)} icon={<CheckCircle2 className="w-4 h-4 text-emerald-300" />} />
        <StatsCard title="Needs Work" value={String(weakAnswers)} icon={<Brain className="w-4 h-4 text-orange-300" />} />
      </div>

      <Card className="glass-panel border-white/10 bg-transparent">
        <CardHeader>
          <CardTitle>Priority Topics To Prepare</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {selectedReport.priorityTopics.length ? (
            selectedReport.priorityTopics.map((topic, index) => (
              <div key={topic} className="p-3 rounded-lg border border-white/10 bg-white/5 text-sm">
                <span className="text-primary font-semibold mr-2">#{index + 1}</span>
                {topic}
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">No high-risk topic detected in this session.</p>
          )}
        </CardContent>
      </Card>

      <Card className="glass-panel border-white/10 bg-transparent">
        <CardHeader>
          <CardTitle>Question-wise Delivery and Fluency Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Question</TableHead>
                <TableHead>Score</TableHead>
                <TableHead>Delivery State</TableHead>
                <TableHead>Nervous</TableHead>
                <TableHead>Stammer</TableHead>
                <TableHead>Answer Correctness</TableHead>
                <TableHead>Coaching Note</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {selectedReport.questions.map((item) => {
                const state = getDisplayState(item.emotionalState);
                const reasonLines = getStateReasonLines(item.emotionalState, item.stammerMetrics);
                return (
                  <TableRow key={item.questionIndex}>
                    <TableCell className="max-w-70">
                      <p className="text-xs text-muted-foreground mb-1">Q{item.questionIndex + 1}</p>
                      <p className="text-sm leading-snug">{item.question}</p>
                    </TableCell>
                    <TableCell>
                      <span className="font-semibold">{item.score}/10</span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Badge className={badgeClassForState(state.state)}>
                          <Smile className="w-3 h-3 mr-1" />
                          {state.state} ({state.confidence}%)
                        </Badge>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              type="button"
                              className="inline-flex h-5 w-5 items-center justify-center rounded-full text-muted-foreground hover:text-white"
                              aria-label="Why this state"
                            >
                              <CircleHelp className="h-3.5 w-3.5" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="max-w-64">
                            <p className="font-medium mb-1">Why this state</p>
                            <p className="text-[11px] leading-relaxed">{reasonLines.join(" | ")}</p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={item.emotionalState.isNervous ? "destructive" : "secondary"}>
                        {item.emotionalState.nervousScore}%
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={item.stammerMetrics.isStammering ? "destructive" : "secondary"}>
                        {item.stammerMetrics.stammerScore}%
                      </Badge>
                      <p className="text-[11px] text-muted-foreground mt-1">
                        fillers {item.stammerMetrics.fillerWordCount}, repeats {item.stammerMetrics.repeatedWordCount}, long pauses {item.stammerMetrics.longPauseCount ?? 0}
                      </p>
                      <p className="text-[11px] text-muted-foreground">pace {item.stammerMetrics.wordsPerMinute ?? 0} wpm</p>
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={
                          item.correctness === "correct"
                            ? "bg-green-500/15 text-green-300 border-green-500/30"
                            : item.correctness === "partially-correct"
                              ? "bg-yellow-500/15 text-yellow-300 border-yellow-500/30"
                              : item.correctness === "incorrect"
                                ? "bg-red-500/15 text-red-300 border-red-500/30"
                                : "bg-slate-500/15 text-slate-300 border-slate-500/30"
                        }
                      >
                        {item.correctness}
                      </Badge>
                      <p className="text-[11px] text-muted-foreground mt-1">{item.correctnessReason}</p>
                    </TableCell>
                    <TableCell className="max-w-65 text-sm text-muted-foreground">
                      {generateCoachingNote(item.score, state, item.stammerMetrics, item.emotionalState, item.correctness)}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <AlertDialog open={deleteConfirmId !== null} onOpenChange={(open) => !open && setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Interview</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this interview? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex gap-3">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteConfirmId && handleDeleteReport(deleteConfirmId)}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function StatsCard({
  title,
  value,
  icon,
}: {
  title: string;
  value: string;
  icon: ReactNode;
}) {
  return (
    <Card className="glass-panel border-white/10 bg-transparent">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">{title}</p>
          <span>{icon}</span>
        </div>
        <p className="text-2xl font-bold font-display">{value}</p>
      </CardContent>
    </Card>
  );
}
