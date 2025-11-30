import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { ArrowLeft, Save, Plus } from "lucide-react";
import { DndContext, closestCenter, DragEndEvent } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, arrayMove } from "@dnd-kit/sortable";
import { ReportBlock } from "@/components/blocks/ReportBlock";
import { BlockTypeSelector } from "@/components/blocks/BlockTypeSelector";

interface Report {
  id: string;
  title: string;
  status: string;
  client_name: string | null;
  client_email: string | null;
  inspection_date: string | null;
}

interface Block {
  id: string;
  type: string;
  content: any;
  order_index: number;
}

export default function ReportEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [report, setReport] = useState<Report | null>(null);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (id) {
      loadReport();
      loadBlocks();
    }
  }, [id]);

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
          status: report.status,
          client_name: report.client_name,
          client_email: report.client_email,
          inspection_date: report.inspection_date,
        })
        .eq("id", id);

      if (error) throw error;
      toast.success("Report saved");
    } catch (error: any) {
      toast.error("Failed to save report");
    } finally {
      setSaving(false);
    }
  };

  const addBlock = async (type: string) => {
    try {
      const newOrderIndex = blocks.length;
      const defaultContent = type === "checklist" 
        ? { items: [{ text: "New item", checked: false }] }
        : type === "heading"
        ? { text: "New Heading", level: 2 }
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

  if (loading || !report) {
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
            <Button variant="ghost" size="icon" onClick={() => navigate("/reports")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-xl font-bold">Report Editor</h1>
          </div>
          <Button onClick={saveReport} disabled={saving} className="gap-2">
            <Save className="h-4 w-4" />
            {saving ? "Saving..." : "Save"}
          </Button>
        </div>
      </header>

      <main className="container max-w-4xl py-8">
        <div className="space-y-6 mb-8">
          <div>
            <Label htmlFor="title">Report Title</Label>
            <Input
              id="title"
              value={report.title}
              onChange={(e) => setReport({ ...report, title: e.target.value })}
              className="text-2xl font-bold"
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label htmlFor="client_name">Client Name</Label>
              <Input
                id="client_name"
                value={report.client_name || ""}
                onChange={(e) => setReport({ ...report, client_name: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="client_email">Client Email</Label>
              <Input
                id="client_email"
                type="email"
                value={report.client_email || ""}
                onChange={(e) => setReport({ ...report, client_email: e.target.value })}
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
              />
            </div>
            <div>
              <Label htmlFor="status">Status</Label>
              <Select
                value={report.status}
                onValueChange={(value) => setReport({ ...report, status: value })}
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
