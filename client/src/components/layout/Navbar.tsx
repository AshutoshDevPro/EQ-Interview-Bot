import { Link, useLocation } from "wouter";
import { BrainCircuit, LayoutDashboard, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export function Navbar() {
  const [location, setLocation] = useLocation();
  const { user, logout, isAuthenticated } = useAuth();

  const navItems = [
    { href: "/", label: "Home", icon: BrainCircuit },
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  ];

  const handleLogout = async () => {
    try {
      await logout();
      setLocation("/login");
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/10 bg-background/80 backdrop-blur-md">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 group cursor-pointer">
          <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center border border-primary/30 group-hover:bg-primary/30 transition-colors">
            <BrainCircuit className="w-5 h-5 text-primary" />
          </div>
          <span className="font-display font-bold text-xl tracking-tight">Interview.ai</span>
        </Link>

        <div className="flex items-center gap-6">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href} className={cn(
                "flex items-center gap-2 text-sm font-medium transition-colors hover:text-primary cursor-pointer",
                location === item.href ? "text-primary" : "text-muted-foreground"
              )}>
                <item.icon className="w-4 h-4" />
                {item.label}
            </Link>
          ))}
          
          {isAuthenticated && (
            <Link href="/setup" className="bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-lg shadow-primary/20 cursor-pointer">
              Start Interview
            </Link>
          )}

          {isAuthenticated ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback>
                      {user?.username?.[0]?.toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="px-2 py-1.5">
                  <p className="text-sm font-medium">{user?.username}</p>
                  {user?.email && (
                    <p className="text-xs text-muted-foreground">{user.email}</p>
                  )}
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setLocation("/dashboard")}>
                  <LayoutDashboard className="mr-2 h-4 w-4" />
                  <span>Dashboard</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Logout</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                className="text-sm"
                onClick={() => setLocation("/login")}
              >
                Sign In
              </Button>
              <Button
                className="text-sm"
                onClick={() => setLocation("/register")}
              >
                Sign Up
              </Button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
