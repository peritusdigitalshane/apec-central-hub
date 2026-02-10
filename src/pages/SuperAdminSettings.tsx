import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import OpenAISettings from "@/components/OpenAISettings";
import { toast } from "sonner";
import { ArrowLeft, Shield, Database, Settings, Users } from "lucide-react";

export default function SuperAdminSettings() {
  const navigate = useNavigate();
  const { isSuperAdmin, loading } = useAuth();

  useEffect(() => {
    if (!loading && !isSuperAdmin) {
      toast.error("Access denied. Super Admin privileges required.");
      navigate("/");
    }
  }, [isSuperAdmin, loading, navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              Super Admin Settings
            </h1>
          </div>
          <Button variant="ghost" onClick={handleLogout}>
            Logout
          </Button>
        </div>
      </header>

      <main className="container py-8">
        <div className="max-w-4xl mx-auto space-y-6">
          <OpenAISettings />

          <div className="grid gap-6 md:grid-cols-2">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate("/users")}>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-lg bg-primary/10">
                    <Users className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <CardTitle>User Management</CardTitle>
                    <CardDescription>Manage all users and their roles</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  View, edit, and manage user accounts and role assignments
                </p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-lg bg-primary/10">
                    <Database className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <CardTitle>Database Access</CardTitle>
                    <CardDescription>Direct database management</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Access the Supabase dashboard for advanced database operations
                </p>
                <Button
                  variant="outline"
                  onClick={() => window.open("https://supabase.com/dashboard/project/zbiuxfglgyapypislkhv", "_blank")}
                >
                  Open Dashboard
                </Button>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-lg bg-primary/10">
                    <Settings className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <CardTitle>System Settings</CardTitle>
                    <CardDescription>Configure application settings</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Coming soon: Global settings, email templates, and more
                </p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-lg bg-primary/10">
                    <Shield className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <CardTitle>Security & Audit</CardTitle>
                    <CardDescription>View security logs and audit trails</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Coming soon: Activity logs, security events, and audit reports
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
