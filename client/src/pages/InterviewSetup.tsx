import React, { useState } from 'react';
import { useLocation } from "wouter";
import { ROLES } from "@/lib/mockData";
import { ResumeUpload } from "@/components/interview/ResumeUpload";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Check, ArrowRight, Sparkles, Video, Mic, Type, Settings2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

interface ResumeQuestion {
  id: string;
  question: string;
  category: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

export default function InterviewSetup() {
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [customTopic, setCustomTopic] = useState("");
  const [resumeQuestions, setResumeQuestions] = useState<ResumeQuestion[] | null>(null);
  const [resumeName, setResumeName] = useState<string | null>(null);
  const [_, setLocation] = useLocation();

  const [permissions, setPermissions] = useState({
    camera: true,
    microphone: true,
    textOnly: false
  });

  const handleStart = () => {
    const params = new URLSearchParams();
    if (customTopic.trim()) {
      params.set('topic', customTopic);
    }
    params.set('camera', String(permissions.camera));
    params.set('mic', String(permissions.microphone));
    params.set('textOnly', String(permissions.textOnly));

    // Store resume questions in localStorage if they exist
    if (resumeQuestions && resumeQuestions.length > 0) {
      localStorage.setItem('resumeQuestions', JSON.stringify({
        questions: resumeQuestions,
        fileName: resumeName,
      }));
      params.set('resumeBased', 'true');
      setLocation(`/session/resume?${params.toString()}`);
    } else if (customTopic.trim()) {
      localStorage.removeItem('resumeQuestions');
      setLocation(`/session/custom?${params.toString()}`);
    } else if (selectedRole) {
      localStorage.removeItem('resumeQuestions');
      setLocation(`/session/${selectedRole}?${params.toString()}`);
    }
  };

  const handleResumeUpload = (fileName: string, questions: ResumeQuestion[]) => {
    setResumeName(fileName);
    setResumeQuestions(questions);
    setSelectedRole(null);
    setCustomTopic("");
  };

  return (
    <div className="min-h-screen pt-24 pb-12 container px-4 mx-auto max-w-5xl">
      <div className="text-center mb-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <h1 className="text-4xl font-display font-bold mb-4">Setup Your Session</h1>
        <p className="text-muted-foreground text-lg">Choose a role, enter a custom topic, or upload your resume.</p>
      </div>

      <div className="grid lg:grid-cols-[1fr_350px] gap-8 items-start">
        <div className="space-y-8">
          <Tabs defaultValue="role" className="w-full">
            <div className="flex justify-center mb-8">
              <TabsList className="grid w-full max-w-150 grid-cols-3 bg-secondary/50 p-1 rounded-full">
                <TabsTrigger value="role" className="rounded-full data-[state=active]:bg-primary data-[state=active]:text-white">Choose Role</TabsTrigger>
                <TabsTrigger value="topic" className="rounded-full data-[state=active]:bg-primary data-[state=active]:text-white">Custom Topic</TabsTrigger>
                <TabsTrigger value="resume" className="rounded-full data-[state=active]:bg-primary data-[state=active]:text-white">Upload Resume</TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="role" className="animate-in fade-in zoom-in-95 duration-300 outline-none">
              <div className="grid md:grid-cols-2 gap-4">
                {ROLES.map((role) => (
                  <Card 
                    key={role.id}
                    onClick={() => {
                      setSelectedRole(role.id);
                      setCustomTopic("");
                    }}
                    className={cn(
                      "cursor-pointer transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] border-2 bg-secondary/20",
                      selectedRole === role.id ? "border-primary bg-primary/10 shadow-[0_0_20px_hsl(var(--primary)/0.2)]" : "border-transparent hover:border-white/10"
                    )}
                  >
                    <div className="p-6 space-y-4">
                      <div className={cn(
                        "w-12 h-12 rounded-lg flex items-center justify-center transition-colors",
                        selectedRole === role.id ? "bg-primary text-white" : "bg-white/5 text-muted-foreground"
                      )}>
                        <role.icon className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="font-display font-bold text-lg mb-1">{role.title}</h3>
                        <p className="text-sm text-muted-foreground leading-snug">{role.description}</p>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="topic" className="animate-in fade-in zoom-in-95 duration-300 outline-none">
              <Card className="p-8 bg-secondary/20 border-white/10">
                <div className="space-y-6">
                  <div className="flex items-center gap-3 text-primary">
                    <Sparkles className="w-6 h-6" />
                    <h3 className="text-xl font-display font-bold">What do you want to practice?</h3>
                  </div>
                  <p className="text-muted-foreground">Enter any specific topic, technology, or domain.</p>
                  <div className="space-y-2">
                    <Input 
                      placeholder="e.g. Distributed Systems Architecture" 
                      value={customTopic}
                      onChange={(e) => {
                        setCustomTopic(e.target.value);
                        setSelectedRole(null);
                      }}
                      className="h-14 text-lg bg-black/20 border-white/10 focus-visible:ring-primary/50"
                    />
                  </div>
                </div>
              </Card>
            </TabsContent>

            <TabsContent value="resume" className="animate-in fade-in zoom-in-95 duration-300 outline-none">
              <Card className="p-8 bg-secondary/20 border-white/10">
                <ResumeUpload onUpload={handleResumeUpload} /> 
                {resumeName && (
                  <div className="mt-4 p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
                    <p className="text-green-400 text-sm font-medium">✓ Resume analyzed: {resumeName}</p>
                    <p className="text-green-400/70 text-xs mt-1">{resumeQuestions?.length || 0} questions generated</p>
                  </div>
                )}
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Permissions Sidebar */}
        <Card className="p-6 bg-card/50 border-white/10 sticky top-24">
          <div className="flex items-center gap-2 mb-6 text-white font-display font-bold uppercase tracking-wider text-xs">
            <Settings2 className="w-4 h-4 text-primary" />
            Interview Preferences
          </div>

          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="flex items-center gap-2 cursor-pointer">
                  <Video className="w-4 h-4 text-blue-400" />
                  Enable Camera
                </Label>
                <p className="text-xs text-muted-foreground">For confidence analysis</p>
              </div>
              <Switch 
                checked={permissions.camera}
                onCheckedChange={(checked) => setPermissions(p => ({ ...p, camera: checked }))}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="flex items-center gap-2 cursor-pointer">
                  <Mic className="w-4 h-4 text-purple-400" />
                  Enable Microphone
                </Label>
                <p className="text-xs text-muted-foreground">For voice interaction</p>
              </div>
              <Switch 
                checked={permissions.microphone}
                onCheckedChange={(checked) => setPermissions(p => ({ ...p, microphone: checked }))}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="flex items-center gap-2 cursor-pointer">
                  <Type className="w-4 h-4 text-green-400" />
                  Text-Only Mode
                </Label>
                <p className="text-xs text-muted-foreground">Disable voice responses</p>
              </div>
              <Switch 
                checked={permissions.textOnly}
                onCheckedChange={(checked) => setPermissions(p => ({ ...p, textOnly: checked }))}
              />
            </div>
          </div>

          <Button 
            size="lg" 
            disabled={!selectedRole && !customTopic.trim() && !resumeQuestions}
            onClick={handleStart}
            className="w-full h-14 rounded-xl shadow-2xl text-lg font-bold transition-all hover:scale-[1.02] mt-8"
          >
            Start Interview <ArrowRight className="ml-2" />
          </Button>
        </Card>
      </div>
    </div>
  );
}
