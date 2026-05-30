import React, { useState } from 'react';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Download, Copy, Check } from "lucide-react";
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface GeneratedQuestion {
  id: string;
  question: string;
  category: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

interface GeneratedQuestionsProps {
  questions: GeneratedQuestion[];
  resumeName: string;
}

export function GeneratedQuestions({ questions, resumeName }: GeneratedQuestionsProps) {
  const [userAnswers, setUserAnswers] = useState<Record<string, string>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [skipped, setSkipped] = useState<Record<string, boolean>>({});

  const handleAnswerChange = (questionId: string, answer: string) => {
    setUserAnswers(prev => ({
      ...prev,
      [questionId]: answer
    }));
  };

  const downloadPDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    let yPosition = 20;

    // Title
    doc.setFontSize(16);
    doc.text('Interview Questions & Answers', pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 10;

    // Resume Info
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`Based on Resume: ${resumeName}`, pageWidth / 2, yPosition, { align: 'center' });
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, pageWidth / 2, yPosition + 5, { align: 'center' });
    
    yPosition += 15;
    doc.setTextColor(0, 0, 0);

    // Questions and Answers
    questions.forEach((q, index) => {
      const margin = 15;
      const maxWidth = pageWidth - 2 * margin;

      // Check if we need a new page
      if (yPosition > pageHeight - 40) {
        doc.addPage();
        yPosition = 20;
      }

      // Question Number and Category
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text(`Q${index + 1}. [${q.category.toUpperCase()}] ${q.difficulty.toUpperCase()}`, margin, yPosition);
      yPosition += 8;

      // Question Text
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      const questionLines = doc.splitTextToSize(q.question, maxWidth);
      doc.text(questionLines, margin, yPosition);
      yPosition += questionLines.length * 5 + 5;

      // Answer
      const answer = userAnswers[q.id] || '[No answer provided]';
      const answerLines = doc.splitTextToSize(`Answer: ${answer}`, maxWidth);
      doc.setTextColor(50, 100, 200);
      doc.text(answerLines, margin, yPosition);
      yPosition += answerLines.length * 5 + 10;
      doc.setTextColor(0, 0, 0);
    });

    // Save the PDF
    doc.save(`interview-questions-${Date.now()}.pdf`);
  };

  const copyToClipboard = (text: string, questionId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(questionId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const toggleSkip = (questionId: string) => {
    setSkipped(prev => {
      const isSkipped = !!prev[questionId];
      const next = { ...prev };
      if (isSkipped) {
        delete next[questionId];
      } else {
        next[questionId] = true;
      }
      return next;
    });

    // If skipping, clear any existing answer for clarity
    setUserAnswers(prev => {
      if (prev[questionId]) {
        const copy = { ...prev };
        delete copy[questionId];
        return copy;
      }
      return prev;
    });
  };

  return (
    <div className="space-y-6">
      {/* PDF Download Button */}
      <div className="flex justify-end gap-3">
        <Button
          onClick={downloadPDF}
          className="gap-2 bg-primary hover:bg-primary/90"
        >
          <Download className="w-4 h-4" />
          Download as PDF
        </Button>
      </div>

      {/* Questions List */}
      <div className="space-y-4">
        {questions.map((q, index) => (
          <Card key={q.id} className="p-6 bg-white/5 border-white/10 hover:border-primary/50 transition-all">
            <div className="space-y-4">
              {/* Question Header */}
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className="w-8 h-8 rounded-full bg-primary text-white text-sm font-bold flex items-center justify-center">
                    {index + 1}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs px-2 py-1 rounded-full bg-primary/20 text-primary capitalize font-medium">
                      {q.category}
                    </span>
                    <span className={`text-xs px-2 py-1 rounded-full capitalize font-medium ${
                      q.difficulty === 'easy' ? 'bg-green-500/20 text-green-400' :
                      q.difficulty === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                      'bg-red-500/20 text-red-400'
                    }`}>
                      {q.difficulty}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(q.question, q.id)}
                    className="text-muted-foreground hover:text-white"
                  >
                    {copiedId === q.id ? (
                      <Check className="w-4 h-4" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </Button>

                  <Button
                    variant={skipped[q.id] ? "secondary" : "ghost"}
                    size="sm"
                    onClick={() => toggleSkip(q.id)}
                    className="text-muted-foreground hover:text-white"
                  >
                    {skipped[q.id] ? 'Undo Skip' : 'Skip'}
                  </Button>
                </div>
              </div>

              {/* Question Text */}
              <p className="text-white font-medium leading-relaxed">{q.question}</p>

              {/* Answer Input */}
              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">Your Answer</label>
                <Textarea
                  placeholder="Type your answer here... (optional for PDF)"
                  value={userAnswers[q.id] || ""}
                  onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                  disabled={!!skipped[q.id]}
                  className="min-h-25 bg-black/20 border-white/10 focus-visible:ring-primary/50 resize-none"
                />
              </div>

              {skipped[q.id] && (
                <div className="text-sm text-amber-400">Question skipped. You can undo skip to answer.</div>
              )}

              {/* Stats */}
              {userAnswers[q.id] && (
                <div className="text-xs text-muted-foreground">
                  {userAnswers[q.id].split(/\s+/).filter(w => w.length > 0).length} words
                </div>
              )}
            </div>
          </Card>
        ))}
      </div>

      {/* Summary Footer */}
      <Card className="p-6 bg-secondary/20 border-white/10">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Questions Answered</p>
            <p className="text-2xl font-bold text-white">
              {Object.keys(userAnswers).filter(id => userAnswers[id]?.trim()).length} / {questions.length}
            </p>
          </div>
          <Button
            onClick={downloadPDF}
            className="gap-2 bg-primary hover:bg-primary/90"
          >
            <Download className="w-4 h-4" />
            Download PDF
          </Button>
        </div>
      </Card>
    </div>
  );
}
