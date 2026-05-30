import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import { Navbar } from "@/components/layout/Navbar";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import InterviewSetup from "@/pages/InterviewSetup";
import InterviewSession from "@/pages/InterviewSession";
import Dashboard from "@/pages/Dashboard";
import FeedbackDetails from "@/pages/FeedbackDetails";
import ResumeInterview from "@/pages/ResumeInterview";
import Login from "@/pages/Login";
import Register from "@/pages/Register";

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      <Route path="/" component={Home} />
      <Route path="/setup" component={InterviewSetup} />
      <Route path="/session/:roleId" component={InterviewSession} />
      <Route path="/resume-interview" component={ResumeInterview} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/feedback-details" component={FeedbackDetails} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <div className="min-h-screen bg-background text-foreground font-sans selection:bg-primary/30">
            <Navbar />
            <main>
              <Router />
            </main>
            <Toaster />
          </div>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
