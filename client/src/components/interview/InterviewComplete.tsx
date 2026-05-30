import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, TrendingUp, AlertCircle, Smile, Mic } from "lucide-react";
import type { InterviewSessionReport, NervousMetrics } from "@/lib/interviewReport";

interface InterviewCompleteProps {
  report: InterviewSessionReport;
  onViewFeedback: () => void;
}

function getDisplayState(emotionalState: NervousMetrics): { state: string; color: string } {
  if (emotionalState.primaryState) {
    const stateColorMap: Record<string, string> = {
      confident: "bg-emerald-500/20 border-emerald-500/30 text-emerald-300",
      calm: "bg-green-500/20 border-green-500/30 text-green-300",
      surprised: "bg-blue-500/20 border-blue-500/30 text-blue-300",
      nervous: "bg-amber-500/20 border-amber-500/30 text-amber-300",
      tense: "bg-red-500/20 border-red-500/30 text-red-300",
      uncertain: "bg-gray-500/20 border-gray-500/30 text-gray-300",
    };
    return {
      state: emotionalState.primaryState,
      color: stateColorMap[emotionalState.primaryState] || stateColorMap.uncertain,
    };
  }
  return { state: "unknown", color: "bg-gray-500/20 border-gray-500/30 text-gray-300" };
}

export function InterviewComplete({ report, onViewFeedback }: InterviewCompleteProps) {
  const avgScorePercent = Math.round((report.avgScore / 10) * 100);
  const totalNervousMoments = report.nervousMoments;
  const totalStammerMoments = report.stammerMoments;

  // Get the dominant emotion from first question for display
  const firstQuestionEmotionalState = report.questions[0]?.emotionalState;
  const { state: emotionalState, color: emotionalColor } = firstQuestionEmotionalState
    ? getDisplayState(firstQuestionEmotionalState)
    : { state: "unknown", color: "bg-gray-500/20 border-gray-500/30 text-gray-300" };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 bg-[radial-gradient(ellipse_at_top,var(--tw-gradient-stops))] from-primary/10 via-background to-background">
      <Card className="w-full max-w-2xl border-white/10 bg-card/50 backdrop-blur">
        <CardHeader className="text-center pb-8">
          <div className="flex justify-center mb-4">
            <div className="relative">
              <div className="absolute inset-0 bg-primary/20 rounded-full blur-2xl"></div>
              <CheckCircle2 className="w-16 h-16 text-primary relative" />
            </div>
          </div>
          <CardTitle className="text-3xl font-display">Interview Complete!</CardTitle>
          <CardDescription className="text-lg mt-2">
            Thank you for completing the {report.roleTitle} interview
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Quick Stats */}
          <div className="grid grid-cols-3 gap-4">
            {/* Score Card */}
            <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 text-center">
<div className="text-3xl font-bold text-primary mb-1">{avgScorePercent}%</div>
            <div className="text-sm text-muted-foreground">Overall Score</div>
            <div className="text-xs text-muted-foreground mt-1">{report.avgScore.toFixed(1)}/10 average</div>
            </div>

            {/* Emotional State Card */}
            <div className="bg-background/50 border border-white/10 rounded-lg p-4 text-center">
              <Badge className={`${emotionalColor} border mb-2 w-full justify-center capitalize text-xs`}>
                <Smile className="w-3 h-3 mr-1" />
                {emotionalState}
              </Badge>
              <div className="text-sm text-muted-foreground">Emotional State</div>
            </div>

            {/* Nervous Moments Card */}
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-amber-300 mb-1">{totalNervousMoments}</div>
              <div className="text-xs text-muted-foreground">Nervous Moments</div>
            </div>
          </div>

          {/* Performance Highlights */}
          <div className="bg-background/50 border border-white/10 rounded-lg p-4">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              Performance Highlights
            </h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex gap-2">
                <span className="text-primary">•</span>
                <span>Answered <strong>{report.totalQuestions}</strong> questions</span>
              </li>
              <li className="flex gap-2">
                <span className="text-primary">•</span>
                <span>
                  <strong>{totalStammerMoments}</strong> stammer/filler moments detected
                </span>
              </li>
              {report.priorityTopics.length > 0 && (
                <li className="flex gap-2">
                  <span className="text-primary">•</span>
                  <span>
                    <strong>Priority topics to improve:</strong> {report.priorityTopics.join(", ")}
                  </span>
                </li>
              )}
            </ul>
          </div>

          {/* CTA Buttons */}
          <div className="flex gap-3 pt-4">
            <Button
              onClick={onViewFeedback}
              size="lg"
              className="flex-1 bg-primary hover:bg-primary/80 text-primary-foreground"
            >
              View Detailed Feedback
            </Button>
          </div>

          {/* Info text */}
          <p className="text-xs text-muted-foreground text-center">
            Your feedback has been saved and you can review it anytime from your dashboard.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
