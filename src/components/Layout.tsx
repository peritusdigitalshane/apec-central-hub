import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import { Button } from "@/components/ui/button";
import logo from "@/assets/apec-logo.png";
import { cn } from "@/lib/utils";

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { role, isSuperAdmin, isAdmin } = useUserRole();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  const isActive = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(path + "/");
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card sticky top-0 z-50 backdrop-blur-sm bg-card/95">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate("/")}>
              <img src={logo} alt="APEC Inspection" className="h-12 w-auto" />
              <div className="border-l border-border pl-3">
                <h1 className="text-xl font-semibold text-foreground">APEC Central</h1>
                <p className="text-xs text-muted-foreground">Inspection Management</p>
              </div>
            </div>
            <nav className="hidden md:flex items-center gap-6">
              <Button
                variant="ghost"
                className={cn(
                  "text-muted-foreground hover:text-primary",
                  isActive("/") && !isActive("/reports") && !isActive("/invoices") && !isActive("/users") && !isActive("/super-admin") && "text-primary"
                )}
                onClick={() => navigate("/")}
              >
                Dashboard
              </Button>
              <Button
                variant="ghost"
                className={cn(
                  "text-muted-foreground hover:text-primary",
                  (isActive("/reports") || isActive("/templates")) && "text-primary"
                )}
                onClick={() => navigate("/reports")}
              >
                Reports
              </Button>
              <Button
                variant="ghost"
                className={cn(
                  "text-muted-foreground hover:text-primary",
                  isActive("/invoices") && "text-primary"
                )}
                onClick={() => navigate("/invoices")}
              >
                Invoices
              </Button>
              {isAdmin && (
                <Button
                  variant="ghost"
                  className={cn(
                    "text-muted-foreground hover:text-primary",
                    isActive("/users") && "text-primary"
                  )}
                  onClick={() => navigate("/users")}
                >
                  Users
                </Button>
              )}
              {isAdmin && (
                <Button
                  variant="ghost"
                  className={cn(
                    "text-muted-foreground hover:text-primary",
                    isActive("/knowledge-base") && "text-primary"
                  )}
                  onClick={() => navigate("/knowledge-base")}
                >
                  AI Knowledge Base
                </Button>
              )}
              {isSuperAdmin && (
                <Button
                  variant="ghost"
                  className={cn(
                    "text-muted-foreground hover:text-primary",
                    isActive("/super-admin") && "text-primary"
                  )}
                  onClick={() => navigate("/super-admin")}
                >
                  Settings
                </Button>
              )}
              <Button variant="ghost" className="text-muted-foreground hover:text-primary" onClick={handleLogout}>
                Logout
              </Button>
            </nav>
          </div>
        </div>
      </header>

      {/* Page Content */}
      <main>{children}</main>
    </div>
  );
}
