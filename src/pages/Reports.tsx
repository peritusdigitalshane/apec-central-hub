import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, FileText, Trash2 } from "lucide-react";

interface Report {
  id: string;
  title: string;
  status: string;
  client_name: string | null;
  inspection_date: string | null;
  created_at: string;
  job_number: string | null;
  location: string | null;
  submitted_for_approval: boolean | null;
}

export default function Reports() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = async () => {
    try {
      const { data, error } = await supabase
        .from("reports")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setReports(data || []);
    } catch (error: any) {
      toast.error("Failed to load reports");
    } finally {
      setLoading(false);
    }
  };

  const createReport = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("reports")
        .insert([{ user_id: user.id }])
        .select()
        .single();

      if (error) throw error;
      toast.success("Report created");
      navigate(`/reports/${data.id}`);
    } catch (error: any) {
      toast.error("Failed to create report");
    }
  };

  const deleteReport = async (id: string) => {
    if (!confirm("Are you sure you want to delete this report?")) return;

    try {
      const { error } = await supabase
        .from("reports")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast.success("Report deleted");
      loadReports();
    } catch (error: any) {
      toast.error("Failed to delete report");
    }
  };

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
            <img src="/src/assets/apec-logo.png" alt="APEC Logo" className="h-10" />
            <h1 className="text-xl font-bold">APEC Central</h1>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={() => navigate("/")}>
              Dashboard
            </Button>
            <Button variant="ghost" onClick={handleLogout}>
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="container py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-3xl font-bold">Reports</h2>
            <p className="text-muted-foreground mt-1">Create and manage inspection reports</p>
          </div>
          <Button onClick={createReport} className="gap-2">
            <Plus className="h-4 w-4" />
            New Report
          </Button>
        </div>

        {reports.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold mb-2">No reports yet</h3>
              <p className="text-muted-foreground mb-6">
                Get started by creating your first inspection report
              </p>
              <Button onClick={createReport} className="gap-2">
                <Plus className="h-4 w-4" />
                Create Report
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {reports.map((report) => (
              <Card
                key={report.id}
                className="hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => navigate(`/reports/${report.id}`)}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg flex items-center gap-2">
                      {report.title}
                      {report.submitted_for_approval && (
                        <Badge variant="secondary">Pending Approval</Badge>
                      )}
                    </CardTitle>
                    <div className="mt-2 space-y-1 text-sm text-muted-foreground">
                      {report.job_number && <p>Job #: {report.job_number}</p>}
                      {report.client_name && <p>Client: {report.client_name}</p>}
                      {report.location && <p>Location: {report.location}</p>}
                      {report.inspection_date && (
                        <p>Date: {new Date(report.inspection_date).toLocaleDateString()}</p>
                      )}
                      <p className="capitalize">Status: {report.status.replace('_', ' ')}</p>
                    </div>
                  </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteReport(report.id);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
