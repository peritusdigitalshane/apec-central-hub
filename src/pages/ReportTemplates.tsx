import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, FileText, Trash2, ArrowLeft, Eye, Edit } from "lucide-react";

interface Template {
  id: string;
  title: string;
  description: string | null;
  status: string;
  category: string | null;
  created_at: string;
}

export default function ReportTemplates() {
  const navigate = useNavigate();
  const { isAdmin, loading: roleLoading } = useUserRole();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTemplates();
  }, []);

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
    } finally {
      setLoading(false);
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

      // Get the "Apec Test Reports" report type
      const { data: reportTypes } = await supabase
        .from("report_types")
        .select("id")
        .eq("name", "Apec Test Reports")
        .maybeSingle();

      // Create the Default template
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

      // Create comprehensive NDT report structure matching Excel forms
      const blocks = [
        // Header Section
        {
          template_id: template.id,
          type: "heading",
          content: { text: "NDT INSPECTION REPORT", level: "h1" },
          order_index: 0
        },
        {
          template_id: template.id,
          type: "text",
          content: { text: "Report Number:\nJob/Work Order Number:\nClient/Company:\nPart Description:" },
          order_index: 1
        },
        
        // Test Details
        {
          template_id: template.id,
          type: "heading",
          content: { text: "Test Information", level: "h2" },
          order_index: 2
        },
        {
          template_id: template.id,
          type: "text",
          content: { text: "Test Date:\nTest Method (MT/PT/UT/RT):\nTest Standard/Procedure:\nAcceptance Criteria:\nSurface Condition:" },
          order_index: 3
        },

        // Part/Component Details
        {
          template_id: template.id,
          type: "heading",
          content: { text: "Component/Part Details", level: "h2" },
          order_index: 4
        },
        {
          template_id: template.id,
          type: "data-table",
          content: {
            headers: ["Item No.", "Part Number", "Description", "Quantity", "Serial/ID"],
            rows: [
              ["1", "", "", "", ""],
              ["2", "", "", "", ""],
              ["3", "", "", "", ""],
              ["4", "", "", "", ""],
              ["5", "", "", "", ""]
            ]
          },
          order_index: 5
        },

        // Equipment & Materials
        {
          template_id: template.id,
          type: "heading",
          content: { text: "Equipment & Materials Used", level: "h2" },
          order_index: 6
        },
        {
          template_id: template.id,
          type: "data-table",
          content: {
            headers: ["Equipment/Material", "Model/Type", "Serial No.", "Calibration Due"],
            rows: [
              ["", "", "", ""],
              ["", "", "", ""],
              ["", "", "", ""]
            ]
          },
          order_index: 7
        },

        // Test Results
        {
          template_id: template.id,
          type: "heading",
          content: { text: "Inspection Results", level: "h2" },
          order_index: 8
        },
        {
          template_id: template.id,
          type: "data-table",
          content: {
            headers: ["Item", "Test Area/Location", "Findings/Indications", "Size/Extent", "Result (Pass/Fail)", "Remarks"],
            rows: [
              ["1", "", "", "", "", ""],
              ["2", "", "", "", "", ""],
              ["3", "", "", "", "", ""],
              ["4", "", "", "", "", ""],
              ["5", "", "", "", "", ""]
            ]
          },
          order_index: 9
        },

        // Photos
        {
          template_id: template.id,
          type: "heading",
          content: { text: "Photographic Evidence", level: "h2" },
          order_index: 10
        },
        {
          template_id: template.id,
          type: "photo-upload",
          content: { photos: [] },
          order_index: 11
        },

        // Observations/Notes
        {
          template_id: template.id,
          type: "heading",
          content: { text: "Additional Observations", level: "h2" },
          order_index: 12
        },
        {
          template_id: template.id,
          type: "notes",
          content: { text: "" },
          order_index: 13
        },

        // Summary/Conclusion
        {
          template_id: template.id,
          type: "heading",
          content: { text: "Summary & Recommendations", level: "h2" },
          order_index: 14
        },
        {
          template_id: template.id,
          type: "text",
          content: { text: "Overall Result: ☐ ACCEPT  ☐ REJECT  ☐ ACCEPT WITH REPAIR\n\nSummary:\n\nRecommendations:" },
          order_index: 15
        },

        // Certification
        {
          template_id: template.id,
          type: "heading",
          content: { text: "Inspector Certification", level: "h2" },
          order_index: 16
        },
        {
          template_id: template.id,
          type: "text",
          content: { text: "Inspector Name:\nQualification/Certification Level:\nCertificate Number:\nSignature:\nDate:" },
          order_index: 17
        },

        // Review (if applicable)
        {
          template_id: template.id,
          type: "heading",
          content: { text: "Review & Approval", level: "h2" },
          order_index: 18
        },
        {
          template_id: template.id,
          type: "text",
          content: { text: "Reviewed By:\nPosition:\nSignature:\nDate:" },
          order_index: 19
        }
      ];

      const { error: blocksError } = await supabase
        .from("template_blocks")
        .insert(blocks);

      if (blocksError) throw blocksError;

      toast.success("Default NDT Inspection Report template created successfully!");
      loadTemplates();
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

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
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
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-xl font-bold">Report Templates</h1>
          </div>
          <div className="flex items-center gap-4">
            {isAdmin && (
              <>
                <Button onClick={createDefaultTemplate} variant="secondary" className="gap-2">
                  <FileText className="h-4 w-4" />
                  Create Default Template
                </Button>
                <Button onClick={createTemplate} className="gap-2">
                  <Plus className="h-4 w-4" />
                  New Template
                </Button>
              </>
            )}
            <Button variant="outline" onClick={() => navigate("/reports")}>
              My Reports
            </Button>
            <Button variant="ghost" onClick={handleLogout}>
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="container py-8">
        <Tabs defaultValue="published" className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="published">Published</TabsTrigger>
            {isAdmin && <TabsTrigger value="drafts">Drafts</TabsTrigger>}
          </TabsList>

          <TabsContent value="published" className="mt-6">
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
                  <Card
                    key={template.id}
                    className="hover:shadow-lg transition-shadow"
                  >
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
            <TabsContent value="drafts" className="mt-6">
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
      </main>
    </div>
  );
}
