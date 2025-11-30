import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Plus, FileText, Trash2, Copy, Edit } from "lucide-react";

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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadReports();
    loadTemplates();
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

      // Get the original report
      const { data: originalReport, error: reportError } = await supabase
        .from("reports")
        .select("*")
        .eq("id", id)
        .single();

      if (reportError) throw reportError;

      // Create new report with same metadata but reset status
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
          report_number: null, // Clear report number for new report
          subject: originalReport.subject,
          inspection_date: null, // Clear inspection date
          template_id: originalReport.template_id,
          status: "draft",
          submitted_for_approval: false,
        })
        .select()
        .single();

      if (newReportError) throw newReportError;

      // Get all blocks from the original report
      const { data: originalBlocks, error: blocksError } = await supabase
        .from("report_blocks")
        .select("*")
        .eq("report_id", id)
        .order("order_index");

      if (blocksError) throw blocksError;

      // Copy blocks to new report
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
    } catch (error: any) {
      toast.error("Failed to delete report");
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

      // Load template data
      const { data: template, error: templateError } = await supabase
        .from("report_templates")
        .select("*")
        .eq("id", templateId)
        .single();

      if (templateError) throw templateError;

      // Load template blocks
      const { data: templateBlocks, error: blocksError } = await supabase
        .from("template_blocks")
        .select("*")
        .eq("template_id", templateId)
        .order("order_index");

      if (blocksError) throw blocksError;

      // Create new report from template
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

      // Copy blocks to new report
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
            <p className="text-muted-foreground mt-1">Create and manage inspection reports</p>
          </div>
        </div>

        <Tabs defaultValue="my-reports" className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2 mb-6">
            <TabsTrigger value="my-reports">My Reports</TabsTrigger>
            <TabsTrigger value="templates">Templates</TabsTrigger>
          </TabsList>

          {/* My Reports Tab */}
          <TabsContent value="my-reports">
            {isAdmin && (
              <div className="flex justify-end mb-4">
                <Button onClick={createReport} className="gap-2">
                  <Plus className="h-4 w-4" />
                  New Report
                </Button>
              </div>
            )}

            {reports.length === 0 ? (
              <Card className="text-center py-12">
                <CardContent>
                  <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-xl font-semibold mb-2">No reports yet</h3>
                  <p className="text-muted-foreground mb-6">
                    {isAdmin 
                      ? "Get started by creating your first inspection report" 
                      : "Select a template from the Templates tab to create your first report"}
                  </p>
                  {isAdmin ? (
                    <Button onClick={createReport} className="gap-2">
                      <Plus className="h-4 w-4" />
                      Create Report
                    </Button>
                  ) : (
                    <Button onClick={() => document.querySelector('[value="templates"]')?.dispatchEvent(new MouseEvent('click', { bubbles: true }))} className="gap-2">
                      <FileText className="h-4 w-4" />
                      Browse Templates
                    </Button>
                  )}
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
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={(e) => {
                              e.stopPropagation();
                              cloneReport(report.id);
                            }}
                            title="Clone report"
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
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
                      </div>
                    </CardHeader>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Templates Tab */}
          <TabsContent value="templates">
            {isAdmin && (
              <div className="flex justify-end mb-4">
                <Button onClick={createTemplate} className="gap-2">
                  <Plus className="h-4 w-4" />
                  New Template
                </Button>
              </div>
            )}

            <Tabs defaultValue="published" className="w-full">
              <TabsList className="grid w-full max-w-md grid-cols-2 mb-4">
                <TabsTrigger value="published">Published</TabsTrigger>
                {isAdmin && <TabsTrigger value="drafts">Drafts</TabsTrigger>}
              </TabsList>

              <TabsContent value="published">
                {publishedTemplates.length === 0 ? (
                  <Card className="text-center py-12">
                    <CardContent>
                      <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <h3 className="text-xl font-semibold mb-2">No published templates yet</h3>
                      <p className="text-muted-foreground">
                        {isAdmin ? "Create and publish templates for your team to use" : "Check back later for templates"}
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {publishedTemplates.map((template) => (
                      <Card key={template.id} className="hover:shadow-lg transition-shadow">
                        <CardHeader>
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <CardTitle className="text-lg">{template.title}</CardTitle>
                              {template.description && (
                                <p className="text-sm text-muted-foreground mt-2">{template.description}</p>
                              )}
                              {template.category && (
                                <Badge variant="outline" className="mt-2">{template.category}</Badge>
                              )}
                            </div>
                          </div>
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
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => navigate(`/templates/${template.id}`)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => deleteTemplate(template.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>

              {isAdmin && (
                <TabsContent value="drafts">
                  {draftTemplates.length === 0 ? (
                    <Card className="text-center py-12">
                      <CardContent>
                        <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                        <h3 className="text-xl font-semibold mb-2">No draft templates</h3>
                        <p className="text-muted-foreground mb-6">
                          Create a new template to get started
                        </p>
                        <Button onClick={createTemplate} className="gap-2">
                          <Plus className="h-4 w-4" />
                          Create Template
                        </Button>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {draftTemplates.map((template) => (
                        <Card
                          key={template.id}
                          className="hover:shadow-lg transition-shadow cursor-pointer"
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
                                {template.category && (
                                  <Badge variant="outline" className="mt-2">{template.category}</Badge>
                                )}
                              </div>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteTemplate(template.id);
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
                </TabsContent>
              )}
            </Tabs>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
