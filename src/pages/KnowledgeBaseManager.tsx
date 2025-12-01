import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Plus, Trash2, Upload, FileText, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ReportType {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
}

interface KBDocument {
  id: string;
  report_type_id: string;
  file_name: string;
  file_type: string;
  created_at: string;
}

export default function KnowledgeBaseManager() {
  const { isAdmin } = useUserRole();
  const [reportTypes, setReportTypes] = useState<ReportType[]>([]);
  const [kbDocuments, setKBDocuments] = useState<KBDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  
  // New report type form
  const [newTypeName, setNewTypeName] = useState("");
  const [newTypeDesc, setNewTypeDesc] = useState("");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  
  // Upload document form
  const [selectedReportType, setSelectedReportType] = useState("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);

  useEffect(() => {
    if (isAdmin) {
      loadReportTypes();
      loadKBDocuments();
    }
  }, [isAdmin]);

  const loadReportTypes = async () => {
    try {
      const { data, error } = await supabase
        .from("report_types")
        .select("*")
        .order("name");

      if (error) throw error;
      setReportTypes(data || []);
    } catch (error: any) {
      toast.error("Failed to load report types");
    } finally {
      setLoading(false);
    }
  };

  const loadKBDocuments = async () => {
    try {
      const { data, error } = await supabase
        .from("knowledge_base_documents")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setKBDocuments(data || []);
    } catch (error: any) {
      toast.error("Failed to load knowledge base documents");
    }
  };

  const createReportType = async () => {
    if (!newTypeName.trim()) {
      toast.error("Report type name is required");
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("report_types")
        .insert({
          name: newTypeName,
          description: newTypeDesc || null,
          created_by: user.id,
        });

      if (error) throw error;
      
      toast.success("Report type created");
      setNewTypeName("");
      setNewTypeDesc("");
      setCreateDialogOpen(false);
      loadReportTypes();
    } catch (error: any) {
      toast.error("Failed to create report type");
    }
  };

  const deleteReportType = async (id: string) => {
    if (!confirm("Are you sure? This will also delete all associated knowledge base documents.")) return;

    try {
      const { error } = await supabase
        .from("report_types")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast.success("Report type deleted");
      loadReportTypes();
      loadKBDocuments();
    } catch (error: any) {
      toast.error("Failed to delete report type");
    }
  };

  const uploadDocument = async () => {
    if (!selectedReportType || !uploadFile) {
      toast.error("Please select a report type and file");
      return;
    }

    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Upload file to storage
      const fileExt = uploadFile.name.split('.').pop();
      const fileName = `${Date.now()}-${uploadFile.name}`;
      const filePath = `${selectedReportType}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("knowledge-base")
        .upload(filePath, uploadFile);

      if (uploadError) throw uploadError;

      // Extract content using edge function
      let content = "";
      
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const { data: parseData, error: parseError } = await supabase.functions.invoke(
          'parse-kb-document',
          {
            body: {
              filePath,
              reportTypeId: selectedReportType,
              fileName: uploadFile.name,
              fileType: fileExt,
            },
            headers: {
              Authorization: `Bearer ${session?.access_token}`,
            },
          }
        );

        if (parseError) {
          console.error('Parse error:', parseError);
          content = `Document uploaded: ${uploadFile.name}. Content extraction failed.`;
        } else {
          content = parseData.content || `Document uploaded: ${uploadFile.name}`;
        }
      } catch (parseErr) {
        console.error('Content extraction error:', parseErr);
        content = `Document uploaded: ${uploadFile.name}. Content extraction failed.`;
      }

      // Save document metadata
      const { error: dbError } = await supabase
        .from("knowledge_base_documents")
        .insert({
          report_type_id: selectedReportType,
          file_name: uploadFile.name,
          file_path: filePath,
          content: content,
          file_type: fileExt || "unknown",
          created_by: user.id,
        });

      if (dbError) throw dbError;

      toast.success("Document uploaded successfully");
      setUploadFile(null);
      setSelectedReportType("");
      setUploadDialogOpen(false);
      loadKBDocuments();
    } catch (error: any) {
      toast.error("Failed to upload document");
      console.error(error);
    } finally {
      setUploading(false);
    }
  };

  const deleteDocument = async (id: string, filePath: string) => {
    if (!confirm("Are you sure you want to delete this document?")) return;

    try {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from("knowledge-base")
        .remove([filePath]);

      if (storageError) throw storageError;

      // Delete from database
      const { error: dbError } = await supabase
        .from("knowledge_base_documents")
        .delete()
        .eq("id", id);

      if (dbError) throw dbError;

      toast.success("Document deleted");
      loadKBDocuments();
    } catch (error: any) {
      toast.error("Failed to delete document");
    }
  };

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Access denied. Admin only.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const getDocsForType = (typeId: string) => 
    kbDocuments.filter(doc => doc.report_type_id === typeId);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <div className="container py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-3xl font-bold">AI Knowledge Base</h2>
            <p className="text-muted-foreground mt-1">
              Manage report types and upload reference documents for AI generation
            </p>
          </div>
          <div className="flex gap-2">
            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="h-4 w-4" />
                  New Report Type
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Report Type</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="type-name">Name</Label>
                    <Input
                      id="type-name"
                      value={newTypeName}
                      onChange={(e) => setNewTypeName(e.target.value)}
                      placeholder="e.g., Electrical Inspection"
                    />
                  </div>
                  <div>
                    <Label htmlFor="type-desc">Description</Label>
                    <Textarea
                      id="type-desc"
                      value={newTypeDesc}
                      onChange={(e) => setNewTypeDesc(e.target.value)}
                      placeholder="Optional description"
                    />
                  </div>
                  <Button onClick={createReportType} className="w-full">
                    Create Report Type
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <Upload className="h-4 w-4" />
                  Upload Document
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Upload Knowledge Base Document</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="report-type">Report Type</Label>
                    <Select value={selectedReportType} onValueChange={setSelectedReportType}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select report type" />
                      </SelectTrigger>
                      <SelectContent>
                        {reportTypes.map((type) => (
                          <SelectItem key={type.id} value={type.id}>
                            {type.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="file">File</Label>
                    <Input
                      id="file"
                      type="file"
                      accept=".pdf,.docx,.txt,.md"
                      onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Supported: PDF, DOCX, TXT, MD
                    </p>
                  </div>
                  <Button 
                    onClick={uploadDocument} 
                    className="w-full"
                    disabled={uploading}
                  >
                    {uploading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      "Upload Document"
                    )}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="space-y-6">
          {reportTypes.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold mb-2">No report types yet</h3>
                <p className="text-muted-foreground mb-4">
                  Create your first report type to start building your AI knowledge base
                </p>
              </CardContent>
            </Card>
          ) : (
            reportTypes.map((type) => {
              const docs = getDocsForType(type.id);
              return (
                <Card key={type.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-xl">{type.name}</CardTitle>
                        {type.description && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {type.description}
                          </p>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteReportType(type.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <h4 className="font-semibold mb-2">
                      Knowledge Base Documents ({docs.length})
                    </h4>
                    {docs.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        No documents uploaded yet
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {docs.map((doc) => (
                          <div
                            key={doc.id}
                            className="flex items-center justify-between p-2 border rounded"
                          >
                            <div className="flex items-center gap-2">
                              <FileText className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm">{doc.file_name}</span>
                              <span className="text-xs text-muted-foreground">
                                ({doc.file_type})
                              </span>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => deleteDocument(doc.id, doc.file_name)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}