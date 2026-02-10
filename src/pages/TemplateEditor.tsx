import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { ArrowLeft, Save, Eye } from "lucide-react";
import { DndContext, closestCenter, DragEndEvent } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, arrayMove } from "@dnd-kit/sortable";
import { ReportBlock } from "@/components/blocks/ReportBlock";
import { BlockTypeSelector } from "@/components/blocks/BlockTypeSelector";

interface Template {
  id: string;
  title: string;
  description: string | null;
  status: string;
  category: string | null;
  job_number: string | null;
  location: string | null;
  subject: string | null;
  order_number: string | null;
  technician: string | null;
  report_number: string | null;
}

interface Block {
  id: string;
  type: string;
  content: any;
  order_index: number;
}

export default function TemplateEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const [template, setTemplate] = useState<Template | null>(null);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isAdmin) {
      toast.error("Access denied. Admin privileges required.");
      navigate("/");
      return;
    }
    if (id) {
      loadTemplate();
      loadBlocks();
    }
  }, [id, isAdmin, navigate]);

  const loadTemplate = async () => {
    try {
      const { data, error } = await supabase
        .from("report_templates")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;
      setTemplate(data);
    } catch (error: any) {
      toast.error("Failed to load template");
      navigate("/templates");
    } finally {
      setLoading(false);
    }
  };

  const loadBlocks = async () => {
    try {
      const { data, error } = await supabase
        .from("template_blocks")
        .select("*")
        .eq("template_id", id)
        .order("order_index");

      if (error) throw error;
      setBlocks(data || []);
    } catch (error: any) {
      console.error("Failed to load blocks:", error);
    }
  };

  const saveTemplate = async () => {
    if (!template) return;
    setSaving(true);

    try {
      const { error } = await supabase
        .from("report_templates")
        .update({
          title: template.title,
          description: template.description,
          status: template.status,
          category: template.category,
          job_number: template.job_number,
          location: template.location,
          subject: template.subject,
          order_number: template.order_number,
          technician: template.technician,
          report_number: template.report_number,
        })
        .eq("id", id);

      if (error) throw error;
      toast.success("Template saved");
    } catch (error: any) {
      toast.error("Failed to save template");
    } finally {
      setSaving(false);
    }
  };

  const publishTemplate = async () => {
    if (!template) return;

    try {
      const { error } = await supabase
        .from("report_templates")
        .update({ status: "published" })
        .eq("id", id);

      if (error) throw error;
      toast.success("Template published");
      setTemplate({ ...template, status: "published" });
    } catch (error: any) {
      toast.error("Failed to publish template");
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
        .from("template_blocks")
        .insert([{
          template_id: id,
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
        .from("template_blocks")
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
        .from("template_blocks")
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
          .from("template_blocks")
          .update({ order_index: update.order_index })
          .eq("id", update.id);
      }
    } catch (error: any) {
      toast.error("Failed to reorder blocks");
    }
  };

  if (loading || !template) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-background sticky top-0 z-10">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/templates")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-xl font-bold">Template Editor</h1>
            {template.status === "draft" && (
              <span className="text-sm text-muted-foreground">(Draft)</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={saveTemplate} disabled={saving} variant="outline" className="gap-2">
              <Save className="h-4 w-4" />
              {saving ? "Saving..." : "Save"}
            </Button>
            {template.status === "draft" && (
              <Button onClick={publishTemplate} className="gap-2">
                <Eye className="h-4 w-4" />
                Publish
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="container max-w-4xl py-8">
        <div className="space-y-6 mb-8">
          <div>
            <Label htmlFor="title">Template Title</Label>
            <Input
              id="title"
              value={template.title}
              onChange={(e) => setTemplate({ ...template, title: e.target.value })}
              className="text-2xl font-bold"
              placeholder="e.g., Standard Inspection Report"
            />
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={template.description || ""}
              onChange={(e) => setTemplate({ ...template, description: e.target.value })}
              placeholder="Describe what this template is for..."
              rows={3}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label htmlFor="category">Category</Label>
              <Input
                id="category"
                value={template.category || ""}
                onChange={(e) => setTemplate({ ...template, category: e.target.value })}
                placeholder="e.g., Ultrasonic Inspection"
              />
            </div>
            <div>
              <Label htmlFor="status">Status</Label>
              <Select
                value={template.status}
                onValueChange={(value) => setTemplate({ ...template, status: value })}
              >
                <SelectTrigger id="status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="published">Published</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div className="border-t pt-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">Template Content</h2>
            <BlockTypeSelector onSelect={addBlock} />
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
                    canEdit={true}
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
      </main>
    </div>
  );
}
