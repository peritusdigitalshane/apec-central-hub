import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { ArrowLeft, Save, Send, CheckCircle, Download, Sparkles, Loader2 } from "lucide-react";
import { DndContext, closestCenter, DragEndEvent } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, arrayMove } from "@dnd-kit/sortable";
import { ReportBlock } from "@/components/blocks/ReportBlock";
import { BlockTypeSelector } from "@/components/blocks/BlockTypeSelector";
import html2pdf from "html2pdf.js";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface Report {
  id: string;
  title: string;
  status: string;
  client_name: string | null;
  client_email: string | null;
  inspection_date: string | null;
  job_number: string | null;
  location: string | null;
  subject: string | null;
  order_number: string | null;
  technician: string | null;
  report_number: string | null;
  report_type_id: string | null;
  submitted_for_approval: boolean | null;
  approved_by: string | null;
  approved_at: string | null;
}

interface Block {
  id: string;
  type: string;
  content: any;
  order_index: number;
}

interface ReportType {
  id: string;
  name: string;
  description: string | null;
}

export default function ReportEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { role, isAdmin } = useUserRole();
  const [report, setReport] = useState<Report | null>(null);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [reportTypes, setReportTypes] = useState<ReportType[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [aiDialogOpen, setAiDialogOpen] = useState(false);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const [reviewData, setReviewData] = useState<any>(null);

  useEffect(() => {
    if (id) {
      loadReport();
      loadBlocks();
      loadReportTypes();
    }
  }, [id]);

  const loadReportTypes = async () => {
    try {
      const { data, error } = await supabase
        .from("report_types")
        .select("*")
        .order("name");

      if (error) throw error;
      setReportTypes(data || []);
    } catch (error: any) {
      console.error("Failed to load report types:", error);
    }
  };

  const loadReport = async () => {
    try {
      const { data, error } = await supabase
        .from("reports")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;
      setReport(data);
    } catch (error: any) {
      toast.error("Failed to load report");
      navigate("/reports");
    } finally {
      setLoading(false);
    }
  };

  const loadBlocks = async () => {
    try {
      const { data, error } = await supabase
        .from("report_blocks")
        .select("*")
        .eq("report_id", id)
        .order("order_index");

      if (error) throw error;
      setBlocks(data || []);
    } catch (error: any) {
      console.error("Failed to load blocks:", error);
    }
  };

  const saveReport = async () => {
    if (!report) return;
    setSaving(true);

    try {
      const { error } = await supabase
        .from("reports")
        .update({
          title: report.title,
          client_name: report.client_name,
          client_email: report.client_email,
          inspection_date: report.inspection_date,
          job_number: report.job_number,
          location: report.location,
          subject: report.subject,
          order_number: report.order_number,
          technician: report.technician,
          report_number: report.report_number,
          report_type_id: report.report_type_id,
        })
        .eq("id", id);

      if (error) throw error;

      // Save blocks
      for (const block of blocks) {
        const { error: blockError } = await supabase
          .from("report_blocks")
          .upsert({
            id: block.id,
            report_id: id!,
            type: block.type,
            content: block.content,
            order_index: block.order_index,
          });

        if (blockError) throw blockError;
      }

      toast.success("Report saved successfully");
    } catch (error: any) {
      toast.error("Failed to save report");
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  const generateWithAI = async () => {
    if (!report?.report_type_id) {
      toast.error("Please select a report type first");
      return;
    }

    setGenerating(true);
    setAiDialogOpen(false);

    try {
      const userInputs = {
        title: report.title || "",
        client_name: report.client_name || "",
        location: report.location || "",
        job_number: report.job_number || "",
        technician: report.technician || "",
        subject: report.subject || "",
      };

      const { data, error } = await supabase.functions.invoke("generate-report", {
        body: {
          reportTypeId: report.report_type_id,
          userInputs,
        },
      });

      if (error) throw error;

      if (data?.content) {
        // Add generated content as a text block
        const newBlock: Block = {
          id: crypto.randomUUID(),
          type: "text",
          content: { text: data.content },
          order_index: blocks.length,
        };

        setBlocks([...blocks, newBlock]);
        toast.success("Report content generated successfully!");
      } else {
        toast.error("No content was generated");
      }
    } catch (error: any) {
      console.error("AI generation error:", error);
      toast.error(error.message || "Failed to generate report with AI");
    } finally {
      setGenerating(false);
    }
  };

  const reviewReport = async () => {
    if (!report || !id) return;
    setReviewing(true);
    setReviewData(null);

    try {
      const { data, error } = await supabase.functions.invoke("review-report", {
        body: { reportId: id },
      });

      if (error) throw error;

      if (data?.review) {
        setReviewData(data.review);
        setReviewDialogOpen(true);
        toast.success("Report review completed!");
      } else {
        toast.error("No review data received");
      }
    } catch (error: any) {
      console.error("AI review error:", error);
      toast.error(error.message || "Failed to review report with AI");
    } finally {
      setReviewing(false);
    }
  };

  const submitForApproval = async () => {
    if (!report) return;
    setSubmitting(true);

    try {
      const { error } = await supabase
        .from("reports")
        .update({ submitted_for_approval: true, status: "in_progress" })
        .eq("id", id);

      if (error) throw error;
      toast.success("Report submitted for approval");
      navigate("/reports");
    } catch (error: any) {
      toast.error("Failed to submit report");
    } finally {
      setSubmitting(false);
    }
  };

  const approveReport = async () => {
    if (!report || !isAdmin) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("reports")
        .update({
          status: "completed",
          approved_by: user.id,
          approved_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (error) throw error;
      toast.success("Report approved");
      loadReport();
    } catch (error: any) {
      toast.error("Failed to approve report");
    }
  };

  const addBlock = async (type: string) => {
    try {
      const newOrderIndex = blocks.length;
      const defaultContent = type === "checklist" 
        ? { items: [{ text: "New item", checked: false }] }
        : type === "heading"
        ? { text: "New Heading", level: 2 }
        : type === "photo_upload"
        ? { photos: [] }
        : type === "data_table"
        ? { title: "Technical Data", rows: [{ label: "Field", value: "" }] }
        : type === "notes"
        ? { title: "Notes", text: "" }
        : { text: "" };

      const { data, error } = await supabase
        .from("report_blocks")
        .insert([{
          report_id: id,
          type,
          content: defaultContent,
          order_index: newOrderIndex,
        }])
        .select()
        .single();

      if (error) throw error;
      setBlocks([...blocks, data]);
      toast.success("Block added");
    } catch (error: any) {
      toast.error("Failed to add block");
    }
  };

  const updateBlock = async (blockId: string, content: any) => {
    try {
      const { error } = await supabase
        .from("report_blocks")
        .update({ content })
        .eq("id", blockId);

      if (error) throw error;
      
      setBlocks(blocks.map(b => b.id === blockId ? { ...b, content } : b));
    } catch (error: any) {
      toast.error("Failed to update block");
    }
  };

  const deleteBlock = async (blockId: string) => {
    try {
      const { error } = await supabase
        .from("report_blocks")
        .delete()
        .eq("id", blockId);

      if (error) throw error;
      
      const newBlocks = blocks.filter(b => b.id !== blockId);
      await reorderBlocks(newBlocks);
      toast.success("Block deleted");
    } catch (error: any) {
      toast.error("Failed to delete block");
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      const oldIndex = blocks.findIndex(b => b.id === active.id);
      const newIndex = blocks.findIndex(b => b.id === over.id);
      
      const newBlocks = arrayMove(blocks, oldIndex, newIndex);
      setBlocks(newBlocks);
      await reorderBlocks(newBlocks);
    }
  };

  const reorderBlocks = async (newBlocks: Block[]) => {
    try {
      const updates = newBlocks.map((block, index) => ({
        id: block.id,
        order_index: index,
      }));

      for (const update of updates) {
        await supabase
          .from("report_blocks")
          .update({ order_index: update.order_index })
          .eq("id", update.id);
      }
    } catch (error: any) {
      toast.error("Failed to reorder blocks");
    }
  };

  const exportToPDF = async () => {
    const element = document.getElementById('report-content');
    if (!element) return;

    const opt = {
      margin: 10,
      filename: `report-${report?.report_number || report?.title || 'draft'}.pdf`,
      image: { type: 'jpeg' as const, quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'mm' as const, format: 'a4' as const, orientation: 'portrait' as const }
    };

    try {
      await html2pdf().set(opt).from(element).save();
      toast.success("PDF exported successfully");
    } catch (error: any) {
      toast.error("Failed to export PDF");
    }
  };

  const canEdit = !report?.submitted_for_approval || isAdmin;
  
  if (loading || !report) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container py-8 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/reports")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold">Report Editor</h1>
              {report.submitted_for_approval && (
                <span className="text-sm text-muted-foreground">(Submitted for approval)</span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={exportToPDF} variant="outline" className="gap-2">
              <Download className="h-4 w-4" />
              Export PDF
            </Button>
            {canEdit && (
              <>
                <Dialog open={aiDialogOpen} onOpenChange={setAiDialogOpen}>
                  <DialogTrigger asChild>
                    <Button 
                      variant="outline" 
                      className="gap-2" 
                      disabled={!report.report_type_id || generating}
                    >
                      {generating ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-4 w-4" />
                          Generate with AI
                        </>
                      )}
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Generate Report with AI</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <p className="text-sm text-muted-foreground">
                        The AI will generate comprehensive report content based on the knowledge base for the selected report type and your provided information.
                      </p>
                      <p className="text-sm font-semibold">
                        Make sure you've filled in the report details (title, client, location, etc.) for best results.
                      </p>
                      <Button onClick={generateWithAI} className="w-full">
                        Generate Report Content
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
                <Button 
                  onClick={reviewReport} 
                  disabled={reviewing || blocks.length === 0} 
                  variant="outline" 
                  className="gap-2"
                >
                  <Sparkles className="h-4 w-4" />
                  {reviewing ? "Reviewing..." : "AI Review"}
                </Button>
                <Button onClick={saveReport} disabled={saving} variant="outline" className="gap-2">
                  <Save className="h-4 w-4" />
                  {saving ? "Saving..." : "Save"}
                </Button>
              </>
            )}
            {!report.submitted_for_approval && role === "staff" && canEdit && (
              <Button onClick={submitForApproval} disabled={submitting} className="gap-2">
                <Send className="h-4 w-4" />
                {submitting ? "Submitting..." : "Submit for Approval"}
              </Button>
            )}
            {isAdmin && report.submitted_for_approval && report.status !== "completed" && (
              <Button onClick={approveReport} className="gap-2">
                <CheckCircle className="h-4 w-4" />
                Approve Report
              </Button>
            )}
          </div>
        </div>
        <div id="report-content" className="space-y-6 mb-8">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label htmlFor="title">Report Title</Label>
              <Input
                id="title"
                value={report.title}
                onChange={(e) => setReport({ ...report, title: e.target.value })}
                className="text-2xl font-bold"
                placeholder="e.g., Fluorescent Magnetic Particle and Ultrasonic Inspection Report"
                disabled={!canEdit}
              />
            </div>
            <div>
              <Label htmlFor="report_type">Report Type</Label>
              <Select
                value={report.report_type_id || ""}
                onValueChange={(value) => setReport({ ...report, report_type_id: value })}
                disabled={!canEdit}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select report type for AI generation" />
                </SelectTrigger>
                <SelectContent>
                  {reportTypes.map((type) => (
                    <SelectItem key={type.id} value={type.id}>
                      {type.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {report.report_type_id && reportTypes.find(t => t.id === report.report_type_id)?.description && (
                <p className="text-xs text-muted-foreground mt-1">
                  {reportTypes.find(t => t.id === report.report_type_id)?.description}
                </p>
              )}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <Label htmlFor="job_number">Job Number</Label>
              <Input
                id="job_number"
                value={report.job_number || ""}
                onChange={(e) => setReport({ ...report, job_number: e.target.value })}
                placeholder="27W005597"
                disabled={!canEdit}
              />
            </div>
            <div>
              <Label htmlFor="report_number">Report Number</Label>
              <Input
                id="report_number"
                value={report.report_number || ""}
                onChange={(e) => setReport({ ...report, report_number: e.target.value })}
                placeholder="A2505-001"
                disabled={!canEdit}
              />
            </div>
            <div>
              <Label htmlFor="order_number">Order Number</Label>
              <Input
                id="order_number"
                value={report.order_number || ""}
                onChange={(e) => setReport({ ...report, order_number: e.target.value })}
                placeholder="TBC"
                disabled={!canEdit}
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label htmlFor="client_name">Client Name</Label>
              <Input
                id="client_name"
                value={report.client_name || ""}
                onChange={(e) => setReport({ ...report, client_name: e.target.value })}
                placeholder="Company Name"
                disabled={!canEdit}
              />
            </div>
            <div>
              <Label htmlFor="client_email">Client Email</Label>
              <Input
                id="client_email"
                type="email"
                value={report.client_email || ""}
                onChange={(e) => setReport({ ...report, client_email: e.target.value })}
                placeholder="contact@company.com"
                disabled={!canEdit}
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                value={report.location || ""}
                onChange={(e) => setReport({ ...report, location: e.target.value })}
                placeholder="Site location"
                disabled={!canEdit}
              />
            </div>
            <div>
              <Label htmlFor="subject">Subject</Label>
              <Input
                id="subject"
                value={report.subject || ""}
                onChange={(e) => setReport({ ...report, subject: e.target.value })}
                placeholder="Inspection subject"
                disabled={!canEdit}
              />
            </div>
            <div>
              <Label htmlFor="technician">Technician</Label>
              <Input
                id="technician"
                value={report.technician || ""}
                onChange={(e) => setReport({ ...report, technician: e.target.value })}
                placeholder="Technician name"
                disabled={!canEdit}
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label htmlFor="inspection_date">Inspection Date</Label>
              <Input
                id="inspection_date"
                type="date"
                value={report.inspection_date || ""}
                onChange={(e) => setReport({ ...report, inspection_date: e.target.value })}
                disabled={!canEdit}
              />
            </div>
            <div>
              <Label htmlFor="status">Status</Label>
              <Select
                value={report.status}
                onValueChange={(value) => setReport({ ...report, status: value })}
                disabled={!canEdit}
              >
                <SelectTrigger id="status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

          <div className="border-t pt-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Report Content</h2>
              {canEdit && <BlockTypeSelector onSelect={addBlock} />}
            </div>

          <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={blocks.map(b => b.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-4">
                {blocks.map((block) => (
                  <ReportBlock
                    key={block.id}
                    block={block}
                    onUpdate={(content) => updateBlock(block.id, content)}
                    onDelete={() => deleteBlock(block.id)}
                    canEdit={canEdit}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>

          {blocks.length === 0 && (
            <div className="text-center py-12 border-2 border-dashed rounded-lg">
              <p className="text-muted-foreground mb-4">No content blocks yet</p>
              <BlockTypeSelector onSelect={addBlock} />
            </div>
          )}
        </div>

        {/* AI Review Results Dialog */}
        <Dialog open={reviewDialogOpen} onOpenChange={setReviewDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>AI Report Review Results</DialogTitle>
            </DialogHeader>
            {reviewData && (
              <div className="space-y-6">
                {/* Quality Score */}
                <div className="flex items-center gap-4 p-4 bg-primary/10 rounded-lg">
                  <div className="text-4xl font-bold text-primary">
                    {reviewData.qualityScore}/10
                  </div>
                  <div>
                    <h3 className="font-semibold">Quality Score</h3>
                    <p className="text-sm text-muted-foreground">
                      Based on completeness, professionalism, and alignment
                    </p>
                  </div>
                </div>

                {/* Overall Feedback */}
                {reviewData.overallFeedback && (
                  <div>
                    <h3 className="font-semibold mb-2">Overall Feedback</h3>
                    <p className="text-sm text-muted-foreground p-4 bg-muted rounded-lg">
                      {reviewData.overallFeedback}
                    </p>
                  </div>
                )}

                {/* Completeness Issues */}
                {reviewData.completenessIssues && reviewData.completenessIssues.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-2 text-orange-600">
                      Completeness Issues ({reviewData.completenessIssues.length})
                    </h3>
                    <ul className="space-y-2">
                      {reviewData.completenessIssues.map((issue: string, idx: number) => (
                        <li key={idx} className="text-sm p-3 bg-orange-50 dark:bg-orange-950/20 rounded border-l-4 border-orange-500">
                          {issue}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Consistency Issues */}
                {reviewData.consistencyIssues && reviewData.consistencyIssues.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-2 text-yellow-600">
                      Consistency Issues ({reviewData.consistencyIssues.length})
                    </h3>
                    <ul className="space-y-2">
                      {reviewData.consistencyIssues.map((issue: string, idx: number) => (
                        <li key={idx} className="text-sm p-3 bg-yellow-50 dark:bg-yellow-950/20 rounded border-l-4 border-yellow-500">
                          {issue}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Enhancement Suggestions */}
                {reviewData.enhancements && reviewData.enhancements.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-2 text-blue-600">
                      Enhancement Suggestions ({reviewData.enhancements.length})
                    </h3>
                    <div className="space-y-4">
                      {reviewData.enhancements.map((enhancement: any, idx: number) => (
                        <div key={idx} className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded border-l-4 border-blue-500">
                          <h4 className="font-semibold mb-2">{enhancement.section}</h4>
                          <p className="text-sm mb-2">{enhancement.suggestion}</p>
                          {enhancement.revisedContent && (
                            <div className="mt-3 p-3 bg-background rounded">
                              <p className="text-xs font-semibold mb-1 text-muted-foreground">Suggested Revision:</p>
                              <p className="text-sm whitespace-pre-wrap">{enhancement.revisedContent}</p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
