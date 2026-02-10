import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  FolderOpen,
  Folder,
  FileText,
  ChevronRight,
  ChevronDown,
  Building2,
} from "lucide-react";

interface Report {
  id: string;
  title: string;
  status: string;
  client_name: string | null;
  job_number: string | null;
  location: string | null;
  inspection_date: string | null;
  created_at: string;
  approved_at: string | null;
}

interface CompanyFolder {
  name: string;
  reports: Report[];
}

export default function CompanyReports() {
  const navigate = useNavigate();
  const [folders, setFolders] = useState<CompanyFolder[]>([]);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadApprovedReports();
  }, []);

  const loadApprovedReports = async () => {
    try {
      const { data, error } = await supabase
        .from("reports")
        .select("*")
        .eq("status", "completed")
        .order("approved_at", { ascending: false });

      if (error) throw error;

      // Group by client_name
      const grouped: Record<string, Report[]> = {};
      (data || []).forEach((report) => {
        const company = report.client_name || "Unassigned";
        if (!grouped[company]) grouped[company] = [];
        grouped[company].push(report);
      });

      const folderList = Object.entries(grouped)
        .map(([name, reports]) => ({ name, reports }))
        .sort((a, b) => a.name.localeCompare(b.name));

      setFolders(folderList);
    } catch (error: any) {
      toast.error("Failed to load company reports");
    } finally {
      setLoading(false);
    }
  };

  const toggleFolder = (name: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (folders.length === 0) {
    return (
      <Card className="text-center py-12">
        <CardContent>
          <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-xl font-semibold mb-2">No approved reports yet</h3>
          <p className="text-muted-foreground">
            Approved reports will be organized here by company
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-1">
      <p className="text-sm text-muted-foreground mb-4">
        Approved reports organized by company. Click a folder to expand.
      </p>
      <div className="border border-border rounded-lg overflow-hidden bg-card">
        {folders.map((folder) => {
          const isExpanded = expandedFolders.has(folder.name);
          return (
            <div key={folder.name}>
              {/* Folder Row */}
              <button
                onClick={() => toggleFolder(folder.name)}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-accent/50 transition-colors text-left border-b border-border last:border-b-0"
              >
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                )}
                {isExpanded ? (
                  <FolderOpen className="h-5 w-5 text-primary shrink-0" />
                ) : (
                  <Folder className="h-5 w-5 text-primary shrink-0" />
                )}
                <span className="font-medium text-foreground flex-1">
                  {folder.name}
                </span>
                <Badge variant="secondary" className="text-xs">
                  {folder.reports.length} report{folder.reports.length !== 1 ? "s" : ""}
                </Badge>
              </button>

              {/* Report Rows */}
              {isExpanded && (
                <div className="bg-muted/30">
                  {folder.reports.map((report) => (
                    <button
                      key={report.id}
                      onClick={() => navigate(`/reports/${report.id}`)}
                      className="w-full flex items-center gap-3 pl-12 pr-4 py-2.5 hover:bg-accent/50 transition-colors text-left border-b border-border/50 last:border-b-0"
                    >
                      <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {report.title}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {report.job_number && `Job #${report.job_number} · `}
                          {report.location && `${report.location} · `}
                          {report.approved_at
                            ? `Approved ${new Date(report.approved_at).toLocaleDateString()}`
                            : new Date(report.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <Badge variant="outline" className="text-xs shrink-0">
                        Approved
                      </Badge>
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
