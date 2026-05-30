import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";

export default function Login() {
  const [, setLocation] = useLocation();
  const { login, isLoading: authLoading, isFirebaseReady } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      await login(email, password);
      setLocation("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setIsLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="flex h-screen items-center justify-center bg-linear-to-br from-slate-50 to-slate-100 p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl">Welcome Back</CardTitle>
          <CardDescription>Sign in to your Interview Coach account</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {!isFirebaseReady && (
              <Alert variant="destructive">
                <AlertDescription>
                  Firebase is not configured. Add VITE_FIREBASE_* values in your .env file.
                </AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                required
              />
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={isLoading || !isFirebaseReady}
            >
              {isLoading ? (
                <>
                  <Spinner className="mr-2 h-4 w-4" />
                  Signing in...
                </>
              ) : (
                "Sign In"
              )}
            </Button>

            <div className="text-center text-sm">
              <span className="text-slate-600">Don't have an account? </span>
              <button
                type="button"
                onClick={() => setLocation("/register")}
                className="font-semibold text-blue-600 hover:text-blue-700"
              >
                Create one
              </button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
