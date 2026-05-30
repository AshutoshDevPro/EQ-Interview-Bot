import { UploadCloud, FileText, CheckCircle2 } from "lucide-react";
import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { motion } from 'framer-motion';

interface GeneratedQuestion {
  id: string;
  question: string;
  category: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

export function ResumeUpload({ onUpload }: { onUpload: (fileName: string, questions: GeneratedQuestion[]) => void }) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadComplete, setUploadComplete] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const generateFallbackQuestions = (): GeneratedQuestion[] => [
    {
      id: '1',
      question: "Walk me through your most impactful project from your resume and the measurable business outcome.",
      category: 'Projects',
      difficulty: 'medium',
    },
    {
      id: '2',
      question: "Which listed skill are you strongest at, and where did you apply it in production?",
      category: 'Skills',
      difficulty: 'easy',
    },
    {
      id: '3',
      question: "Describe one technical trade-off you made in a past project and why you chose that direction.",
      category: 'System Design',
      difficulty: 'hard',
    },
  ];

  const fileToBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const raw = String(reader.result ?? '');
        const base64 = raw.includes(',') ? raw.split(',')[1] : raw;
        resolve(base64);
      };
      reader.onerror = () => reject(new Error('Failed to read resume file.'));
      reader.readAsDataURL(file);
    });

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      setIsUploading(true);
      setUploadComplete(false);
      setUploadError(null);

      try {
        const resumeBase64 = await fileToBase64(file);
        const response = await fetch('/api/resume-questions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fileName: file.name,
            mimeType: file.type || 'application/pdf',
            resumeBase64,
            questionCount: 10,
          }),
        });

        if (!response.ok) {
          throw new Error('Server rejected resume processing request.');
        }

        const data = await response.json();
        const generated = Array.isArray(data?.questions)
          ? data.questions
              .map((item: any, index: number) => ({
                id: String(item?.id ?? index + 1),
                question: String(item?.question ?? '').trim(),
                category: String(item?.category ?? 'General').trim() || 'General',
                difficulty: (['easy', 'medium', 'hard'].includes(String(item?.difficulty))
                  ? String(item.difficulty)
                  : 'medium') as 'easy' | 'medium' | 'hard',
              }))
              .filter((item: GeneratedQuestion) => Boolean(item.question))
          : [];

        const questions = generated.length ? generated : generateFallbackQuestions();
        const reason = String(data?.reason ?? '').trim();

        if (!generated.length && reason) {
          setUploadError(reason);
        }

        setIsUploading(false);
        setUploadComplete(true);

        setTimeout(() => {
          onUpload(file.name, questions);
        }, 1001);
      } catch (_error) {
        setIsUploading(false);
        setUploadComplete(false);
        setUploadError('Gemini resume analysis failed. Using smart fallback questions.');
        onUpload(file.name, generateFallbackQuestions());
      }
    }
  }, [onUpload]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ 
    onDrop, 
    accept: {'application/pdf': ['.pdf']}
  });

  return (
    <div className="w-full">
       <div 
         {...getRootProps()} 
         className={`
           border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer group
           ${isDragActive ? 'border-primary bg-primary/10' : 'border-white/10 hover:border-primary/50 hover:bg-white/5'}
           ${uploadComplete ? 'border-green-500 bg-green-500/10' : ''}
         `}
       >
         <input {...getInputProps()} />
         
         <div className="flex flex-col items-center gap-4">
           <div className={`
             w-16 h-16 rounded-full flex items-center justify-center transition-colors
             ${uploadComplete ? 'bg-green-500/20 text-green-500' : 'bg-secondary text-primary'}
           `}>
             {uploadComplete ? <CheckCircle2 className="w-8 h-8" /> : <UploadCloud className="w-8 h-8" />}
           </div>
           
           <div className="space-y-1">
             <h4 className="font-medium text-lg">
               {isUploading ? "Analyzing Resume..." : uploadComplete ? "Resume Processed!" : "Upload Resume"}
             </h4>
             <p className="text-sm text-muted-foreground max-w-xs mx-auto">
               {isUploading 
                 ? "AI is extracting your skills and generating tailored questions..." 
                 : uploadComplete 
                   ? "Interview questions generated! Ready to practice." 
                   : "Drag & drop your PDF resume or click to browse. We'll generate custom interview questions based on your experience."}
             </p>
                 {uploadError && <p className="text-xs text-amber-400">{uploadError}</p>}
           </div>
           
           {isUploading && (
             <div className="w-full max-w-50 h-1 bg-secondary rounded-full overflow-hidden mt-2">
               <motion.div 
                 className="h-full bg-primary"
                 initial={{ width: 0 }}
                 animate={{ width: "100%" }}
                 transition={{ duration: 1.5 }}
               />
             </div>
           )}
         </div>
       </div>
    </div>
  );
}
