import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { createDefaultNdtTemplateBlocks } from "@/lib/defaultNdtTemplate";
import { useUserRole } from "@/hooks/useUserRole";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Plus, FileText, Trash2, Copy, Edit, CheckCircle, XCircle, FolderTree } from "lucide-react";
import CompanyReports from "@/components/reports/CompanyReports";

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

interface Template {
  id: string;
  title: string;
  description: string | null;
  status: string;
  category: string | null;
  created_at: string;
}

export default function Reports() {
  const navigate = useNavigate();
  const { isAdmin, loading: roleLoading } = useUserRole();
  const [reports, setReports] = useState<Report[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [pendingReports, setPendingReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadReports();
    loadTemplates();
    if (isAdmin) {
      loadPendingReports();
    }
  }, [isAdmin]);

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

  const loadTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from("report_templates")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setTemplates(data || []);
    } catch (error: any) {
      toast.error("Failed to load templates");
    }
  };

  const loadPendingReports = async () => {
    try {
      const { data, error } = await supabase
        .from("reports")
        .select("*")
        .eq("submitted_for_approval", true)
        .neq("status", "completed")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setPendingReports(data || []);
    } catch (error: any) {
      toast.error("Failed to load pending reports");
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

  const cloneReport = async (id: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: originalReport, error: reportError } = await supabase
        .from("reports")
        .select("*")
        .eq("id", id)
        .single();

      if (reportError) throw reportError;

      const { data: newReport, error: newReportError } = await supabase
        .from("reports")
        .insert({
          user_id: user.id,
          title: `${originalReport.title} (Copy)`,
          client_name: originalReport.client_name,
          client_email: originalReport.client_email,
          job_number: originalReport.job_number,
          location: originalReport.location,
          order_number: originalReport.order_number,
          technician: originalReport.technician,
          report_number: null,
          subject: originalReport.subject,
          inspection_date: null,
          template_id: originalReport.template_id,
          status: "draft",
          submitted_for_approval: false,
        })
        .select()
        .single();

      if (newReportError) throw newReportError;

      const { data: originalBlocks, error: blocksError } = await supabase
        .from("report_blocks")
        .select("*")
        .eq("report_id", id)
        .order("order_index");

      if (blocksError) throw blocksError;

      if (originalBlocks && originalBlocks.length > 0) {
        const newBlocks = originalBlocks.map((block) => ({
          report_id: newReport.id,
          type: block.type,
          content: block.content,
          order_index: block.order_index,
        }));

        const { error: insertBlocksError } = await supabase
          .from("report_blocks")
          .insert(newBlocks);

        if (insertBlocksError) throw insertBlocksError;
      }

      toast.success("Report cloned successfully");
      navigate(`/reports/${newReport.id}`);
    } catch (error: any) {
      toast.error("Failed to clone report");
      console.error(error);
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
      if (isAdmin) loadPendingReports();
    } catch (error: any) {
      toast.error("Failed to delete report");
    }
  };

  const approveReport = async (id: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("reports")
        .update({
          status: "completed",
          approved_by: user.id,
          approved_at: new Date().toISOString(),
          submitted_for_approval: false,
        })
        .eq("id", id);

      if (error) throw error;
      toast.success("Report approved");
      loadPendingReports();
      loadReports();
    } catch (error: any) {
      toast.error("Failed to approve report");
    }
  };

  const rejectReport = async (id: string) => {
    if (!confirm("Are you sure you want to reject this report? It will be sent back to the staff member.")) return;

    try {
      const { error } = await supabase
        .from("reports")
        .update({
          submitted_for_approval: false,
          status: "draft",
        })
        .eq("id", id);

      if (error) throw error;
      toast.success("Report rejected and sent back for revision");
      loadPendingReports();
      loadReports();
    } catch (error: any) {
      toast.error("Failed to reject report");
    }
  };

  const createTemplate = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("report_templates")
        .insert([{ 
          created_by: user.id,
          title: "New Template",
          status: "draft"
        }])
        .select()
        .single();

      if (error) throw error;
      toast.success("Template created");
      navigate(`/templates/${data.id}`);
    } catch (error: any) {
      toast.error("Failed to create template");
    }
  };

  const createDefaultTemplate = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: existingTemplates } = await supabase
        .from("report_templates")
        .select("id")
        .eq("title", "Default NDT Inspection Report");

      if (existingTemplates && existingTemplates.length > 0) {
        const { error: deleteError } = await supabase
          .from("report_templates")
          .delete()
          .eq("title", "Default NDT Inspection Report");
        
        if (deleteError) console.error("Error deleting existing templates:", deleteError);
        toast("Replacing existing Default template...");
      }

      const { data: template, error: templateError } = await supabase
        .from("report_templates")
        .insert([{
          created_by: user.id,
          title: "Default NDT Inspection Report",
          description: "Standard NDT inspection report template - replaces Excel forms",
          status: "published",
          category: "NDT Inspection"
        }])
        .select()
        .single();

      if (templateError) throw templateError;

      const blocks = createDefaultNdtTemplateBlocks(template.id);

      const { data: insertedBlocks, error: blocksError } = await supabase
        .from("template_blocks")
        .insert(blocks)
        .select();

      if (blocksError) throw new Error(`Failed to insert template blocks: ${blocksError.message}`);
      if (!insertedBlocks || insertedBlocks.length === 0) throw new Error("No blocks were inserted");

      toast.success("Default NDT Inspection Report template created!");
      await loadTemplates();
    } catch (error: any) {
      console.error("Error creating default template:", error);
      toast.error("Failed to create default template");
    }
  };

  const deleteTemplate = async (id: string) => {
    if (!confirm("Are you sure you want to delete this template?")) return;

    try {
      const { error } = await supabase
        .from("report_templates")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast.success("Template deleted");
      loadTemplates();
    } catch (error: any) {
      toast.error("Failed to delete template");
    }
  };

  const useTemplate = async (templateId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: template, error: templateError } = await supabase
        .from("report_templates")
        .select("*")
        .eq("id", templateId)
        .single();

      if (templateError) throw templateError;

      const { data: templateBlocks, error: blocksError } = await supabase
        .from("template_blocks")
        .select("*")
        .eq("template_id", templateId)
        .order("order_index");

      if (blocksError) throw blocksError;

      const { data: newReport, error: reportError } = await supabase
        .from("reports")
        .insert([{
          user_id: user.id,
          template_id: templateId,
          title: template.title,
          job_number: template.job_number,
          location: template.location,
          subject: template.subject,
          order_number: template.order_number,
          technician: template.technician,
          report_number: template.report_number,
        }])
        .select()
        .single();

      if (reportError) throw reportError;

      if (templateBlocks && templateBlocks.length > 0) {
        const blocks = templateBlocks.map(block => ({
          report_id: newReport.id,
          type: block.type,
          content: block.content,
          order_index: block.order_index,
        }));

        const { error: copyError } = await supabase
          .from("report_blocks")
          .insert(blocks);

        if (copyError) throw copyError;
      }

      toast.success("Report created from template");
      navigate(`/reports/${newReport.id}`);
    } catch (error: any) {
      toast.error("Failed to create report from template");
    }
  };

  const publishedTemplates = templates.filter(t => t.status === 'published');
  const draftTemplates = templates.filter(t => t.status === 'draft');
  const myDraftReports = reports.filter(r => r.status === 'draft' || r.submitted_for_approval);

  if (roleLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <div className="container py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-3xl font-bold">Reports</h2>
            <p className="text-muted-foreground mt-1">Create, manage, and review inspection reports</p>
          </div>
        </div>

        <Tabs defaultValue="templates" className="w-full">
          <TabsList className={`grid w-full max-w-3xl mb-6 ${isAdmin ? 'grid-cols-4' : 'grid-cols-3'}`}>
            <TabsTrigger value="templates" className="gap-2">
              <FileText className="h-4 w-4" />
              Templates
            </TabsTrigger>
            <TabsTrigger value="my-reports" className="gap-2">
              <Edit className="h-4 w-4" />
              My Reports
            </TabsTrigger>
            {isAdmin && (
              <TabsTrigger value="pending-approval" className="gap-2">
                <CheckCircle className="h-4 w-4" />
                Pending Approval
                {pendingReports.length > 0 && (
                  <Badge variant="destructive" className="ml-1 h-5 w-5 p-0 flex items-center justify-center text-xs">
                    {pendingReports.length}
                  </Badge>
                )}
              </TabsTrigger>
            )}
            <TabsTrigger value="company-reports" className="gap-2">
              <FolderTree className="h-4 w-4" />
              Company Reports
            </TabsTrigger>
          </TabsList>

          {/* ============ TEMPLATES TAB ============ */}
          <TabsContent value="templates">
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-1">Report Templates</h3>
              <p className="text-sm text-muted-foreground">
                Select a template to create a new report. The report will start as a draft.
              </p>
            </div>

            {isAdmin && (
              <div className="flex justify-end gap-2 mb-4">
                <Button onClick={createDefaultTemplate} variant="secondary" className="gap-2">
                  <FileText className="h-4 w-4" />
                  Create Default Template
                </Button>
                <Button onClick={createTemplate} className="gap-2">
                  <Plus className="h-4 w-4" />
                  New Template
                </Button>
              </div>
            )}

            {publishedTemplates.length === 0 ? (
              <Card className="text-center py-12">
                <CardContent>
                  <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-xl font-semibold mb-2">No templates available</h3>
                  <p className="text-muted-foreground">
                    {isAdmin ? "Create and publish templates for your team" : "Check back later for templates"}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {publishedTemplates.map((template) => (
                  <Card key={template.id} className="hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <CardTitle className="text-lg">{template.title}</CardTitle>
                      {template.description && (
                        <p className="text-sm text-muted-foreground mt-1">{template.description}</p>
                      )}
                      {template.category && (
                        <Badge variant="outline" className="mt-2 w-fit">{template.category}</Badge>
                      )}
                    </CardHeader>
                    <CardContent className="flex gap-2">
                      <Button
                        variant="default"
                        size="sm"
                        className="flex-1 gap-2"
                        onClick={() => useTemplate(template.id)}
                      >
                        <FileText className="h-4 w-4" />
                        Use Template
                      </Button>
                      {isAdmin && (
                        <>
                          <Button variant="outline" size="sm" onClick={() => navigate(`/templates/${template.id}`)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => deleteTemplate(template.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* Draft templates for admins */}
            {isAdmin && draftTemplates.length > 0 && (
              <div className="mt-8">
                <h4 className="text-md font-semibold mb-3 text-muted-foreground">Draft Templates</h4>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {draftTemplates.map((template) => (
                    <Card
                      key={template.id}
                      className="hover:shadow-lg transition-shadow cursor-pointer opacity-75 hover:opacity-100"
                      onClick={() => navigate(`/templates/${template.id}`)}
                    >
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <CardTitle className="text-lg flex items-center gap-2">
                              {template.title}
                              <Badge variant="secondary">Draft</Badge>
                            </CardTitle>
                            {template.description && (
                              <p className="text-sm text-muted-foreground mt-2">{template.description}</p>
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={(e) => { e.stopPropagation(); deleteTemplate(template.id); }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardHeader>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>

          {/* ============ MY REPORTS TAB ============ */}
          <TabsContent value="my-reports">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold mb-1">My Reports</h3>
                <p className="text-sm text-muted-foreground">
                  Your draft and in-progress reports. Submit for approval when ready.
                </p>
              </div>
              {isAdmin && (
                <Button onClick={createReport} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Blank Report
                </Button>
              )}
            </div>

            {reports.length === 0 ? (
              <Card className="text-center py-12">
                <CardContent>
                  <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-xl font-semibold mb-2">No reports yet</h3>
                  <p className="text-muted-foreground mb-6">
                    Go to Templates to create your first report
                  </p>
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
                            {report.status === "completed" && (
                              <Badge variant="outline" className="border-primary text-primary">Approved</Badge>
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
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={(e) => { e.stopPropagation(); cloneReport(report.id); }}
                            title="Clone report"
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={(e) => { e.stopPropagation(); deleteReport(report.id); }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* ============ PENDING APPROVAL TAB ============ */}
          {isAdmin && (
            <TabsContent value="pending-approval">
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-1">Pending Approval</h3>
                <p className="text-sm text-muted-foreground">
                  Reports submitted by staff for your review. Approve to move them to Company Reports.
                </p>
              </div>

              {pendingReports.length === 0 ? (
                <Card className="text-center py-12">
                  <CardContent>
                    <CheckCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-xl font-semibold mb-2">All caught up!</h3>
                    <p className="text-muted-foreground">
                      No reports pending approval
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {pendingReports.map((report) => (
                    <Card key={report.id} className="hover:shadow-lg transition-shadow">
                      <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                          {report.title}
                          <Badge variant="secondary">Pending</Badge>
                        </CardTitle>
                        <div className="mt-2 space-y-1 text-sm text-muted-foreground">
                          {report.job_number && <p>Job #: {report.job_number}</p>}
                          {report.client_name && <p>Client: {report.client_name}</p>}
                          {report.location && <p>Location: {report.location}</p>}
                          {report.inspection_date && (
                            <p>Date: {new Date(report.inspection_date).toLocaleDateString()}</p>
                          )}
                          <p className="text-xs mt-2">
                            Submitted: {new Date(report.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </CardHeader>
                      <CardContent className="flex gap-2">
                        <Button
                          variant="default"
                          size="sm"
                          className="flex-1 gap-2"
                          onClick={() => navigate(`/reports/${report.id}`)}
                        >
                          <Edit className="h-4 w-4" />
                          Review
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-2"
                          onClick={() => approveReport(report.id)}
                        >
                          <CheckCircle className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-2"
                          onClick={() => rejectReport(report.id)}
                        >
                          <XCircle className="h-4 w-4" />
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          )}

          {/* ============ COMPANY REPORTS TAB ============ */}
          <TabsContent value="company-reports">
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-1">Company Reports</h3>
              <p className="text-sm text-muted-foreground">
                Approved reports organized by company. Browse completed work.
              </p>
            </div>
            <CompanyReports />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
