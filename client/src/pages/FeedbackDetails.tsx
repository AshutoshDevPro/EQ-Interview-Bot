import { useMemo } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertTriangle,
  ArrowLeft,
  Brain,
  CheckCircle2,
  Lightbulb,
  Mic,
  TrendingDown,
  TrendingUp,
  Volume2,
  Clock,
  Zap,
} from "lucide-react";
import type { InterviewSessionReport, NervousMetrics, QuestionPerformance, StammerMetrics } from "@/lib/interviewReport";
import { LATEST_REPORT_STORAGE_KEY } from "@/lib/interviewReport";

function loadReport(): InterviewSessionReport | null {
  try {
    const raw = localStorage.getItem(LATEST_REPORT_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as InterviewSessionReport;
  } catch (_error) {
    return null;
  }
}

function badgeClassForState(state: string): string {
  if (state === "confident") return "bg-emerald-500/15 text-emerald-300 border-emerald-500/30";
  if (state === "calm") return "bg-green-500/15 text-green-300 border-green-500/30";
  if (state === "surprised") return "bg-blue-500/15 text-blue-300 border-blue-500/30";
  if (state === "nervous") return "bg-amber-500/15 text-amber-300 border-amber-500/30";
  if (state === "tense") return "bg-red-500/15 text-red-300 border-red-500/30";
  return "bg-gray-500/15 text-gray-300 border-gray-500/30";
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

function getSpeakingTips(emotionalState: NervousMetrics, stammer: StammerMetrics, score: number): string[] {
  const tips: string[] = [];

  if (stammer.fillerWordCount > 5) {
    tips.push("🎙️ Eliminate filler words: Record yourself daily. Count fillers (goal: <2 per answer). When you catch yourself, pause and breathe instead.");
  }

  if ((stammer.wordsPerMinute ?? 0) > 150) {
    tips.push("⏱️ Slow your pace (120 WPM ideal): Practice reading your answer aloud every 2-3 words. Time 1-minute answers (should be 2-3 minutes naturally).");
  } else if ((stammer.wordsPerMinute ?? 0) < 100 && (stammer.wordsPerMinute ?? 0) > 0) {
    tips.push("⚡ Speak more confidently: Practice this answer 3 more times. Speak 25% louder. Add emphasis to key points like you're teaching someone.");
  }

  if (stammer.longPauseCount ?? 0 > 3) {
    tips.push("⏸️ Replace silence with structure: When stuck, say 'That's a great question' or 'Let me think about that for a second.' Avoid dead air.");
  }

  if (emotionalState.isNervous) {
    tips.push("😌 Build confidence: Do 2 mock interviews this week with a friend. Record one and watch it. You'll realize you sound better than you think.");
  }

  if (stammer.repeatedWordCount > 3) {
    tips.push("🔄 Vary your language: Rewrite this answer using synonyms. Practice the new version 5 times. This trains your brain to use different phrases.");
  }

  if (score < 5) {
    tips.push("📚 Content prep needed: Look up 3 resources on this topic. Write down 2-3 key facts. Practice answering this question with the STAR method.");
  } else if (score >= 8) {
    tips.push("⭐ Keep this answer: This structure works! Practice similar questions using the same framework. You've found a winning formula.");
  }

  return tips.slice(0, 4);
}

interface QuestionCardProps {
  question: QuestionPerformance;
  index: number;
}

function QuestionDetailCard({ question }: QuestionCardProps) {
  const state = getDisplayState(question.emotionalState);
  const tips = getSpeakingTips(question.emotionalState, question.stammerMetrics, question.score);

  return (
    <div className="bg-card/50 border border-white/10 rounded-lg p-6 space-y-5">
      {/* Question Header */}
      <div className="space-y-2">
        <h3 className="font-display font-bold text-lg text-white">
          Question {question.questionIndex + 1}
        </h3>
        <p className="text-muted-foreground text-sm">{question.question}</p>
      </div>

      {/* Score Overview */}
      <div className="grid grid-cols-4 gap-3">
        <div className="bg-primary/10 border border-primary/20 rounded p-3 text-center">
          <div className="text-2xl font-bold text-primary">{question.score.toFixed(1)}</div>
          <div className="text-xs text-muted-foreground">Score</div>
        </div>
        <div className={`rounded p-3 text-center ${badgeClassForState(state.state).replace("border", "border")}`}>
          <div className="text-2xl font-bold">{state.confidence}%</div>
          <div className="text-xs text-muted-foreground capitalize">{state.state}</div>
        </div>
        <div className={`rounded p-3 text-center ${question.stammerMetrics.isStammering ? "bg-amber-500/10 border border-amber-500/20" : "bg-green-500/10 border border-green-500/20"}`}>
          <div className={`text-2xl font-bold ${question.stammerMetrics.isStammering ? "text-amber-400" : "text-green-400"}`}>
            {question.stammerMetrics.stammerScore}%
          </div>
          <div className="text-xs text-muted-foreground">Stammer</div>
        </div>
        <div className={`rounded p-3 text-center ${question.emotionalState.isNervous ? "bg-red-500/10 border border-red-500/20" : "bg-emerald-500/10 border border-emerald-500/20"}`}>
          <div className={`text-2xl font-bold ${question.emotionalState.isNervous ? "text-red-400" : "text-emerald-400"}`}>
            {question.emotionalState.nervousScore}%
          </div>
          <div className="text-xs text-muted-foreground">Nervous</div>
        </div>
      </div>

      {/* Speaking Pattern Analysis */}
      <div className="bg-background/30 border border-white/5 rounded p-4 space-y-3">
        <h4 className="font-semibold text-sm flex items-center gap-2">
          <Volume2 className="w-4 h-4 text-blue-400" />
          Speaking Pattern Analysis
        </h4>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Speaking Speed</span>
            <span className="text-white font-medium">{question.stammerMetrics.wordsPerMinute ?? 0} WPM</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Filler Words</span>
            <span className={question.stammerMetrics.fillerWordCount > 5 ? "text-amber-400 font-medium" : "text-white"}>
              {question.stammerMetrics.fillerWordCount}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Word Repetitions</span>
            <span className="text-white font-medium">{question.stammerMetrics.repeatedWordCount}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Long Pauses</span>
            <span className="text-white font-medium">{question.stammerMetrics.longPauseCount ?? 0}</span>
          </div>
        </div>
      </div>

      {/* Emotional Analysis */}
      <div className="bg-background/30 border border-white/5 rounded p-4 space-y-3">
        <h4 className="font-semibold text-sm flex items-center gap-2">
          <Brain className="w-4 h-4 text-purple-400" />
          Emotional State Breakdown
        </h4>
        {question.emotionalState.deliveryStates && (
          <div className="space-y-2 text-sm">
            {Object.entries(question.emotionalState.deliveryStates).map(([state, value]) => (
              <div key={state} className="flex items-center justify-between">
                <span className="text-muted-foreground capitalize">{state}</span>
                <div className="flex items-center gap-2 w-32">
                  <div className="h-2 flex-1 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        state === "confident" || state === "calm"
                          ? "bg-emerald-500"
                          : state === "nervous"
                            ? "bg-amber-500"
                            : "bg-red-500"
                      }`}
                      style={{ width: `${value}%` }}
                    />
                  </div>
                  <span className="text-xs font-medium w-10 text-right">{value}%</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Answer Text */}
      <div className="bg-background/30 border border-white/5 rounded p-4 space-y-2">
        <h4 className="font-semibold text-sm">Your Answer</h4>
        <p className="text-sm text-muted-foreground leading-relaxed">{question.answer}</p>
      </div>

      {/* Correctness & Feedback */}
      <div className="bg-background/30 border border-white/5 rounded p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="font-semibold text-sm">Answer Accuracy</h4>
          <Badge
            className={
              question.correctness === "correct"
                ? "bg-green-500/15 text-green-300 border-green-500/30"
                : question.correctness === "partially-correct"
                  ? "bg-yellow-500/15 text-yellow-300 border-yellow-500/30"
                  : question.correctness === "incorrect"
                    ? "bg-red-500/15 text-red-300 border-red-500/30"
                    : "bg-slate-500/15 text-slate-300 border-slate-500/30"
            }
          >
            {question.correctness}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">{question.correctnessReason}</p>
        <p className="text-sm text-white bg-white/5 border border-white/10 rounded p-2 italic">{question.feedback}</p>
      </div>

      {/* Speaking Tips */}
      {tips.length > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded p-4 space-y-2">
          <h4 className="font-semibold text-sm flex items-center gap-2 text-amber-300">
            <Lightbulb className="w-4 h-4" />
            Personalized Tips
          </h4>
          <ul className="space-y-1 text-sm text-muted-foreground">
            {tips.map((tip, i) => (
              <li key={i} className="flex gap-2">
                <span className="text-amber-400">→</span>
                <span>{tip}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default function FeedbackDetails() {
  const [, setLocation] = useLocation();
  const report = useMemo(() => loadReport(), []);

  if (!report) {
    return (
      <div className="min-h-screen pt-24 pb-12 container px-4 mx-auto max-w-6xl">
        <Card className="glass-panel border-white/10 bg-card/50">
          <CardHeader>
            <CardTitle>No Interview Data</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-6">No interview report found. Complete an interview first.</p>
            <Button onClick={() => setLocation("/setup")}>Start Interview</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const answeredQuestions = report.questions.length;

  if (answeredQuestions === 0) {
    return (
      <div className="min-h-screen pt-24 pb-12 px-4 bg-[radial-gradient(ellipse_at_top,var(--tw-gradient-stops))] from-primary/10 via-background to-background">
        <div className="container mx-auto max-w-6xl">
          <Card className="glass-panel border-white/10 bg-card/50">
            <CardHeader>
              <CardTitle>No questions answered</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-6">
                Your interview report contains no answered questions yet. Please complete the interview session to generate detailed feedback.
              </p>
              <Button onClick={() => setLocation("/setup")}>Start Interview</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const avgScorePercent = Math.round((report.avgScore / 10) * 100);
  const bestQuestion = report.questions.reduce((prev, current) => (current.score > prev.score ? current : prev), report.questions[0]);
  const worstQuestion = report.questions.reduce((prev, current) => (current.score < prev.score ? current : prev), report.questions[0]);
  const bestQuestionScore = Math.round((bestQuestion.score / 10) * 100);
  const worstQuestionScore = Math.round((worstQuestion.score / 10) * 100);
  
  const strongAnswers = report.questions.filter((q) => q.score >= 7).length;
  const weakAnswers = report.questions.filter((q) => q.score <= 4).length;

  return (
    <div className="min-h-screen pt-24 pb-12 px-4 bg-[radial-gradient(ellipse_at_top,var(--tw-gradient-stops))] from-primary/10 via-background to-background">
      <div className="container mx-auto max-w-6xl space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-display font-bold mb-2">Detailed Interview Feedback</h1>
            <p className="text-muted-foreground">{report.roleTitle} • {answeredQuestions} answered question{answeredQuestions === 1 ? "" : "s"}</p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setLocation("/dashboard")} className="gap-2">
            <ArrowLeft className="w-4 h-4" /> Back to Dashboard
          </Button>
        </div>

        {/* Overall Performance */}
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-4 bg-white/5 border border-white/10">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="questions">Questions</TabsTrigger>
            <TabsTrigger value="speaking">Speaking Patterns</TabsTrigger>
            <TabsTrigger value="tips">Improvement Tips</TabsTrigger>
          </TabsList>

          {/* OVERVIEW TAB */}
          <TabsContent value="overview" className="space-y-6 mt-6">
            {/* Top Metrics */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="glass-panel border-white/10">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs text-muted-foreground uppercase">Overall Score</p>
                    <TrendingUp className="w-4 h-4 text-primary" />
                  </div>
                  <p className="text-3xl font-bold text-primary">{avgScorePercent}%</p>
                </CardContent>
              </Card>

              <Card className="glass-panel border-white/10">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs text-muted-foreground uppercase">Best Answer</p>
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  </div>
                  <p className="text-3xl font-bold text-emerald-400">{bestQuestionScore}%</p>
                  <p className="text-xs text-muted-foreground mt-1">Q{bestQuestion.questionIndex + 1}</p>
                </CardContent>
              </Card>

              <Card className="glass-panel border-white/10">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs text-muted-foreground uppercase">Needs Work</p>
                    <AlertTriangle className="w-4 h-4 text-amber-400" />
                  </div>
                  <p className="text-3xl font-bold text-amber-400">{worstQuestionScore}%</p>
                  <p className="text-xs text-muted-foreground mt-1">Q{worstQuestion.questionIndex + 1}</p>
                </CardContent>
              </Card>

              <Card className="glass-panel border-white/10">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs text-muted-foreground uppercase">Total Issues</p>
                    <Zap className="w-4 h-4 text-red-400" />
                  </div>
                  <p className="text-3xl font-bold text-red-400">{report.nervousMoments + report.stammerMoments}</p>
                  <p className="text-xs text-muted-foreground mt-1">nervous + stammer</p>
                </CardContent>
              </Card>
            </div>

            {/* Key Insights */}
            <Card className="glass-panel border-white/10">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="w-5 h-5 text-primary" />
                  Key Insights
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded text-sm text-emerald-200">
                  ✓ <strong>{strongAnswers}</strong> questions answered well (score ≥ 7) vs <strong>{weakAnswers}</strong> that need improvement (score ≤ 4)
                </div>
                {report.stammerMoments > 0 && (
                  <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded text-sm text-amber-200">
                    ⚠ <strong>{report.stammerMoments}</strong> moments with stammer/filler words detected
                  </div>
                )}
                {report.nervousMoments > 0 && (
                  <div className="p-3 bg-red-500/10 border border-red-500/20 rounded text-sm text-red-200">
                    ⚠ <strong>{report.nervousMoments}</strong> moments where you seemed nervous
                  </div>
                )}
                {report.priorityTopics.length > 0 && (
                  <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded text-sm text-blue-200">
                    📚 Focus on these topics: <strong>{report.priorityTopics.join(", ")}</strong>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* QUESTIONS TAB */}
          <TabsContent value="questions" className="space-y-6 mt-6">
            {report.questions.map((q, idx) => (
              <QuestionDetailCard key={idx} question={q} index={idx} />
            ))}
          </TabsContent>

          {/* SPEAKING PATTERNS TAB */}
          <TabsContent value="speaking" className="space-y-6 mt-6">
            <Card className="glass-panel border-white/10">
              <CardHeader>
                <CardTitle>Speaking Speed Analysis</CardTitle>
                <CardDescription>Words per minute throughout your interview</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  {report.questions.map((q) => (
                    <div key={q.questionIndex} className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Q{q.questionIndex + 1}</span>
                      <div className="flex items-center gap-2 w-56">
                        <div className="h-2 flex-1 bg-white/10 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              (q.stammerMetrics.wordsPerMinute ?? 0) > 150
                                ? "bg-red-500"
                                : (q.stammerMetrics.wordsPerMinute ?? 0) < 100 && (q.stammerMetrics.wordsPerMinute ?? 0) > 0
                                  ? "bg-amber-500"
                                  : "bg-emerald-500"
                            }`}
                            style={{ width: `${Math.min(100, ((q.stammerMetrics.wordsPerMinute ?? 60) / 160) * 100)}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium w-12 text-right">{q.stammerMetrics.wordsPerMinute ?? 0} WPM</span>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded text-sm text-muted-foreground">
                  <strong>Ideal pace:</strong> 110-130 WPM for professional interviews. Slower = uncertain, Faster = panic.
                </div>
              </CardContent>
            </Card>

            <Card className="glass-panel border-white/10">
              <CardHeader>
                <CardTitle>Filler Words Breakdown</CardTitle>
                <CardDescription>Reduce these for more polished delivery</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  {report.questions.map((q) => (
                    <div key={q.questionIndex} className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Q{q.questionIndex + 1}</span>
                      <div className="flex gap-4 items-center">
                        <div className="text-sm">
                          <span className="text-white font-medium">{q.stammerMetrics.fillerWordCount}</span>
                          <span className="text-muted-foreground"> fillers</span>
                        </div>
                        <div className="text-sm">
                          <span className="text-white font-medium">{q.stammerMetrics.repeatedWordCount}</span>
                          <span className="text-muted-foreground"> repeats</span>
                        </div>
                        <div className="text-sm">
                          <span className="text-white font-medium">{q.stammerMetrics.longPauseCount ?? 0}</span>
                          <span className="text-muted-foreground"> pauses</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="glass-panel border-white/10">
              <CardHeader>
                <CardTitle>Emotional Stability</CardTitle>
                <CardDescription>How your confidence varied across questions</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {report.questions.map((q) => {
                  const state = getDisplayState(q.emotionalState);
                  return (
                    <div key={q.questionIndex} className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Q{q.questionIndex + 1}</span>
                      <div className="flex items-center gap-2 w-96">
                        <Badge className={badgeClassForState(state.state)}>
                          {state.state}
                        </Badge>
                        <div className="h-1 flex-1 bg-white/10 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary rounded-full"
                            style={{ width: `${state.confidence}%` }}
                          />
                        </div>
                        <span className="text-xs w-10 text-right">{state.confidence}%</span>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </TabsContent>

          {/* TIPS TAB */}
          <TabsContent value="tips" className="space-y-6 mt-6">
            <Card className="glass-panel border-white/10 bg-linear-to-br from-primary/20 to-primary/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lightbulb className="w-5 h-5 text-primary" />
                  Key Areas to Improve
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Speaking Speed */}
                {report.questions.some((q) => (q.stammerMetrics.wordsPerMinute ?? 0) > 150) && (
                  <div className="p-4 bg-white/5 border border-white/10 rounded space-y-2">
                    <h4 className="font-semibold text-sm flex items-center gap-2">
                      <Clock className="w-4 h-4 text-blue-400" />
                      Reduce Speaking Speed (You're too fast)
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      <strong>Why it matters:</strong> Fast speech signals nervousness and makes interviewers miss key points. Target: 120 WPM
                    </p>
                    <div className="bg-primary/10 border border-primary/20 rounded p-3 my-2 text-xs">
                      <p className="font-semibold mb-1">7-Day Challenge:</p>
                      <p>Day 1-2: Record yourself speaking. Count seconds (30-sec answers should take ~45-60 seconds). Days 3-5: Rerecord the same answer slower each time. Day 6-7: Practice with a friend who counts your WPM.</p>
                    </div>
                    <ul className="text-sm space-y-1 text-muted-foreground ml-4">
                      <li>✓ Use Audacity (free) or Voice Memos to record yourself</li>
                      <li>✓ Put one finger up per word - you'll feel the speed</li>
                      <li>✓ Read interview answers like you're explaining to your grandparent</li>
                      <li>✓ Add a 1-2 second pause after each complete sentence</li>
                    </ul>
                  </div>
                )}

                {/* Fillers */}
                {report.questions.some((q) => q.stammerMetrics.fillerWordCount > 5) && (
                  <div className="p-4 bg-white/5 border border-white/10 rounded space-y-2">
                    <h4 className="font-semibold text-sm flex items-center gap-2">
                      <Volume2 className="w-4 h-4 text-amber-400" />
                      Eliminate Filler Words (um, uh, like, you know)
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      <strong>Why it matters:</strong> Each filler word makes you sound less confident. Interviewers notice. Goal: 0-2 fillers per 3-minute answer.
                    </p>
                    <div className="bg-yellow-500/10 border border-yellow-500/20 rounded p-3 my-2 text-xs">
                      <p className="font-semibold mb-1">Stop Fillers in 3 Steps:</p>
                      <p>1) Record yourself answering 10 questions. Count fillers. 2) Rerecord the same 10, but PAUSE instead of saying "um". 3) Do it daily until pauses become automatic.</p>
                    </div>
                    <ul className="text-sm space-y-1 text-muted-foreground ml-4">
                      <li>✓ When you feel an "um" coming, take a 1-second breath instead</li>
                      <li>✓ Practice out loud (not in your head) - this is crucial</li>
                      <li>✓ If you need thinking time in an interview, say: "Let me think about that for a moment" (professional, not filler)</li>
                      <li>✓ Keep water nearby to use as a natural pause trigger</li>
                    </ul>
                  </div>
                )}

                {/* Nervousness */}
                {report.nervousMoments > 0 && (
                  <div className="p-4 bg-white/5 border border-white/10 rounded space-y-2">
                    <h4 className="font-semibold text-sm flex items-center gap-2">
                      <Brain className="w-4 h-4 text-red-400" />
                      Combat Nervousness (Detected {report.nervousMoments} moments)
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      <strong>Why it happens:</strong> Lack of preparation and unfamiliar questions. Nervousness fades with practice.
                    </p>
                    <div className="bg-red-500/10 border border-red-500/20 rounded p-3 my-2 text-xs">
                      <p className="font-semibold mb-1">Confidence Building Plan:</p>
                      <p>Week 1: Do 3 mock interviews. Week 2: Do 5 more. By Week 3, nervous moments should drop by 50%. Most importantly: <strong>Practice out loud</strong>, not in your head.</p>
                    </div>
                    <ul className="text-sm space-y-1 text-muted-foreground ml-4">
                      <li>✓ Before interview: 5-min breathing exercise (4-count in, hold 4, 6-count out)</li>
                      <li>✓ Sit up straight, shoulders back - posture affects confidence levels</li>
                      <li>✓ Video call? Smile at the camera. You'll feel more confident, they'll see it</li>
                      <li>✓ Prepare your own tough questions. If you ask yourself hard questions, real ones won't surprise you</li>
                      <li>✓ Remember: Interviewers want you to succeed. They're not your enemy.</li>
                    </ul>
                  </div>
                )}

                {/* Content Gaps */}
                {report.questions.some((q) => q.score < 5) && (
                  <div className="p-4 bg-white/5 border border-white/10 rounded space-y-2">
                    <h4 className="font-semibold text-sm flex items-center gap-2">
                      <Brain className="w-4 h-4 text-purple-400" />
                      Knowledge Gaps Detected (Scores &lt;5)
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      <strong>Action required:</strong> You need deeper knowledge on these topics. Prepare before next attempt.
                    </p>
                    <div className="bg-purple-500/10 border border-purple-500/20 rounded p-3 my-2 text-xs">
                      <p className="font-semibold mb-1">2-Week Prep Strategy:</p>
                      <p>Days 1-3: Research + take notes. Days 4-7: Write out full answers (500 words each). Days 8-14: Practice speaking answers daily. Use STAR method for any example-based questions.</p>
                    </div>
                    <ul className="text-sm space-y-1 text-muted-foreground ml-4">
                      <li>✓ Find 3 credible sources per topic (blogs, books, YouTube, company website)</li>
                      <li>✓ Write one 2-minute answer per topic. Then practice it 10 times</li>
                      <li>✓ Use STAR method: Situation → Task → Action → Result (makes answers complete)</li>
                      <li>✓ For technical topics: Build a small project or solve a problem to gain real experience</li>
                      <li>✓ Join online communities related to your role to see what real professionals discuss</li>
                    </ul>
                  </div>
                )}

                {/* General Tips */}
                <div className="p-4 bg-white/5 border border-white/10 rounded space-y-2">
                  <h4 className="font-semibold text-sm flex items-center gap-2">
                    <Zap className="w-4 h-4 text-yellow-400" />
                    Your Interview Prep Checklist
                  </h4>
                  <ul className="text-sm space-y-2 text-muted-foreground">
                    <li>✓ <strong>Daily practice:</strong> Spend 30 minutes daily practicing answers out loud (not reading)</li>
                    <li>✓ <strong>Record yourself:</strong> Review 1 recording per week. You'll hear things you miss when speaking</li>
                    <li>✓ <strong>Mock interviews:</strong> Do one interview with a friend per week until interview day</li>
                    <li>✓ <strong>Answer the question asked:</strong> Listen to the full question before responding. Don't interrupt</li>
                    <li>✓ <strong>Use the 2-minute rule:</strong> Most answers should be 1.5-2.5 minutes. Longer feels like rambling</li>
                    <li>✓ <strong>Research the company:</strong> Know their recent news, culture, products. Reference them in answers</li>
                    <li>✓ <strong>Before interview day:</strong> Good sleep, breakfast, test tech (camera/mic), arrive 5 min early</li>
                    <li>✓ <strong>Have a notebook:</strong> Write down questions you want to ask the interviewer (shows interest)</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Footer CTA */}
        <div className="flex gap-3">
          <Button onClick={() => setLocation("/dashboard")} className="flex-1">
            Back to Dashboard
          </Button>
          <Button onClick={() => setLocation("/setup")} variant="secondary" className="flex-1">
            Take Another Interview
          </Button>
        </div>
      </div>
    </div>
  );
}
