import { Link } from "wouter";
import { ArrowRight, FileText, Sparkles, Download } from "lucide-react";
import heroBg from "@/assets/hero-bg.png";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";

export default function Home() {
  const { user, isAuthenticated } = useAuth();

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden">
        {/* Background Image & Overlay */}
        <div className="absolute inset-0 z-0">
          <img 
            src={heroBg} 
            alt="Hero Background" 
            className="w-full h-full object-cover opacity-40"
          />
          <div className="absolute inset-0 bg-linear-to-b from-background/10 via-background/80 to-background" />
        </div>

        <div className="container relative z-10 px-4 pt-20 text-center">
          <div className="animate-in fade-in slide-in-from-bottom-8 duration-700">
             <span className="inline-block py-1 px-3 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium mb-6 backdrop-blur-sm">
               AI-Powered Resume Coach
             </span>
             <h1 className="text-5xl md:text-7xl font-display font-bold mb-6 tracking-tight">
               {isAuthenticated ? (
                 <>
                   Welcome back, <br />
                   <span className="text-gradient">{user?.username}</span>
                 </>
               ) : (
                 <>
                   Master Your <br />
                   <span className="text-gradient">Next Interview</span>
                 </>
               )}
             </h1>
             <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
               {isAuthenticated ? (
                 <>
                   Ready to ace your next interview? Upload your resume and get personalized interview questions. 
                   Practice smart, get instant feedback, and download questions as PDF.
                 </>
               ) : (
                 <>
                   Upload your resume and get personalized interview questions. Practice smart, get instant feedback, 
                   and download questions as PDF to study anytime.
                 </>
               )}
             </p>
             
             <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
               {isAuthenticated ? (
                 <>
                   <Button asChild size="lg" className="h-14 px-8 text-lg rounded-full shadow-[0_0_20px_hsl(var(--primary)/0.3)] hover:shadow-[0_0_30px_hsl(var(--primary)/0.5)] transition-shadow">
                     <Link href="/resume-interview">
                       Upload Resume & Practice <ArrowRight className="ml-2 w-5 h-5" />
                     </Link>
                   </Button>
                   
                   <Button asChild variant="outline" size="lg" className="h-14 px-8 text-lg rounded-full bg-white/5 border-white/10 hover:bg-white/10 backdrop-blur-sm">
                     <Link href="/setup">
                       Start Practice Interview
                     </Link>
                   </Button>
                 </>
               ) : (
                 <>
                   <Button asChild size="lg" className="h-14 px-8 text-lg rounded-full shadow-[0_0_20px_hsl(var(--primary)/0.3)] hover:shadow-[0_0_30px_hsl(var(--primary)/0.5)] transition-shadow">
                     <Link href="/register">
                       Sign Up <ArrowRight className="ml-2 w-5 h-5" />
                     </Link>
                   </Button>
                   
                   <Button asChild variant="outline" size="lg" className="h-14 px-8 text-lg rounded-full bg-white/5 border-white/10 hover:bg-white/10 backdrop-blur-sm">
                     <Link href="/login">
                       Sign In
                     </Link>
                   </Button>
                 </>
               )}
             </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-24 relative z-10 bg-background/50 backdrop-blur-xl border-t border-white/5">
        <div className="container px-4 mx-auto">
          <div className="grid md:grid-cols-3 gap-8">
            <FeatureCard 
              icon={<FileText className="w-8 h-8 text-blue-400" />}
              title="Resume-Based Questions"
              description="Upload your resume and AI generates customized interview questions based on your skills, experience, and background."
              href="/resume-interview"
            />
            <FeatureCard 
              icon={<Sparkles className="w-8 h-8 text-purple-400" />}
              title="Smart Evaluation"
              description="Get detailed feedback on your answers with scoring, improvement suggestions, and AI-powered insights."
            />
            <FeatureCard 
              icon={<Download className="w-8 h-8 text-green-400" />}
              title="Download as PDF"
              description="Save and download your interview questions and answers as a PDF for offline study and preparation."
            />
          </div>
        </div>
      </section>
    </div>
  );
}

function FeatureCard({ icon, title, description, href }: { icon: React.ReactNode, title: string, description: string, href?: string }) {
  const content = (
    <>
      <div className="mb-6 p-3 bg-white/5 w-fit rounded-xl group-hover:scale-110 transition-transform duration-300">
        {icon}
      </div>
      <h3 className="text-xl font-display font-semibold mb-3">{title}</h3>
      <p className="text-muted-foreground leading-relaxed">{description}</p>
    </>
  );

  if (href) {
    return (
      <Link href={href}>
        <div className="p-8 rounded-2xl bg-white/5 border border-white/10 hover:border-primary/50 transition-colors group cursor-pointer hover:bg-white/10">
          {content}
        </div>
      </Link>
    );
  }

  return (
    <div className="p-8 rounded-2xl bg-white/5 border border-white/10 hover:border-primary/50 transition-colors group">
      {content}
    </div>
  );
}
