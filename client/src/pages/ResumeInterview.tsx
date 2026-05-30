import React, { useState } from 'react';
import { useLocation } from "wouter";
import { ResumeUpload } from "@/components/interview/ResumeUpload";
import { GeneratedQuestions } from "@/components/interview/GeneratedQuestions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

interface GeneratedQuestion {
  id: string;
  question: string;
  category: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

export default function ResumeInterview() {
  const [location, setLocation] = useLocation();
  const [resumeUploaded, setResumeUploaded] = useState(false);
  const [generatedQuestions, setGeneratedQuestions] = useState<GeneratedQuestion[]>([]);
  const [resumeName, setResumeName] = useState<string>("");

  const handleResumeUpload = (fileName: string, questions: GeneratedQuestion[]) => {
    setResumeName(fileName);
    setGeneratedQuestions(questions);
    setResumeUploaded(true);
  };

  const handleBackToUpload = () => {
    setResumeUploaded(false);
    setGeneratedQuestions([]);
    setResumeName("");
  };

  return (
    <div className="min-h-screen pt-20 pb-12 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Button 
            variant="ghost" 
            className="gap-2 text-muted-foreground hover:text-white mb-4" 
            onClick={() => setLocation("/")}
          >
            <ArrowLeft className="w-4 h-4" /> Back to Home
          </Button>
          
          <div className="text-center mb-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h1 className="text-4xl font-display font-bold mb-4">
              {resumeUploaded ? "Interview Questions" : "Resume-Based Interview Practice"}
            </h1>
            <p className="text-muted-foreground text-lg">
              {resumeUploaded 
                ? "Answer these questions, download your responses as PDF, and track your progress." 
                : "Upload your resume and get AI-generated interview questions tailored to your profile."}
            </p>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid lg:grid-cols-[1fr_350px] gap-8 items-start">
          <div>
            {!resumeUploaded ? (
              // Upload Tab
              <Card className="p-8 bg-secondary/20 border-white/10">
                <ResumeUpload 
                  onUpload={handleResumeUpload}
                />
              </Card>
            ) : (
              // Questions Tab
              <GeneratedQuestions 
                questions={generatedQuestions}
                resumeName={resumeName}
              />
            )}
          </div>

          {/* Sidebar */}
          {resumeUploaded && (
            <div className="sticky top-24">
              <Card className="p-6 bg-card/50 border-white/10 space-y-6">
                <div>
                  <h3 className="font-display font-bold text-sm uppercase tracking-wider text-primary mb-2">Current Resume</h3>
                  <p className="text-white text-sm truncate">{resumeName}</p>
                </div>

                <div>
                  <h3 className="font-display font-bold text-sm uppercase tracking-wider text-primary mb-3">Statistics</h3>
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <p>Total Questions: <span className="text-white font-semibold">{generatedQuestions.length}</span></p>
                    <p>Easy: <span className="text-green-400">{generatedQuestions.filter(q => q.difficulty === 'easy').length}</span></p>
                    <p>Medium: <span className="text-yellow-400">{generatedQuestions.filter(q => q.difficulty === 'medium').length}</span></p>
                    <p>Hard: <span className="text-red-400">{generatedQuestions.filter(q => q.difficulty === 'hard').length}</span></p>
                  </div>
                </div>

                <Button 
                  onClick={handleBackToUpload}
                  variant="outline"
                  className="w-full text-sm"
                >
                  Upload New Resume
                </Button>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
