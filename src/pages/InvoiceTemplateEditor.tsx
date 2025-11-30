import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save, ArrowLeft } from "lucide-react";
import { ReportBlock } from "@/components/blocks/ReportBlock";
import { BlockTypeSelector } from "@/components/blocks/BlockTypeSelector";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";

interface Block {
  id: string;
  type: string;
  content: any;
  order_index: number;
}

export default function InvoiceTemplateEditor() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    loadBlocks();
  }, []);

  const loadBlocks = async () => {
    try {
      const { data, error } = await supabase
        .from("invoice_template_blocks")
        .select("*")
        .order("order_index");

      if (error) throw error;
      setBlocks(data || []);
    } catch (error: any) {
      toast({
        title: "Error loading template",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const addBlock = async (type: string) => {
    try {
      const maxOrder = blocks.reduce((max, b) => Math.max(max, b.order_index), -1);
      const { data, error } = await supabase
        .from("invoice_template_blocks")
        .insert({
          type,
          content: {},
          order_index: maxOrder + 1,
        })
        .select()
        .single();

      if (error) throw error;
      setBlocks([...blocks, data]);
      toast({ title: "Block added to template" });
    } catch (error: any) {
      toast({
        title: "Error adding block",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const updateBlock = async (blockId: string, content: any) => {
    try {
      const { error } = await supabase
        .from("invoice_template_blocks")
        .update({ content })
        .eq("id", blockId);

      if (error) throw error;

      setBlocks(blocks.map((b) => (b.id === blockId ? { ...b, content } : b)));
    } catch (error: any) {
      toast({
        title: "Error updating block",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const deleteBlock = async (blockId: string) => {
    try {
      const { error } = await supabase
        .from("invoice_template_blocks")
        .delete()
        .eq("id", blockId);

      if (error) throw error;
      setBlocks(blocks.filter((b) => b.id !== blockId));
      toast({ title: "Block removed from template" });
    } catch (error: any) {
      toast({
        title: "Error deleting block",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    setBlocks((items) => {
      const oldIndex = items.findIndex((item) => item.id === active.id);
      const newIndex = items.findIndex((item) => item.id === over.id);
      const reordered = arrayMove(items, oldIndex, newIndex);
      reorderBlocks(reordered);
      return reordered;
    });
  };

  const reorderBlocks = async (reorderedBlocks: Block[]) => {
    setSaving(true);
    try {
      const updates = reorderedBlocks.map((block, index) => ({
        id: block.id,
        order_index: index,
      }));

      for (const update of updates) {
        await supabase
          .from("invoice_template_blocks")
          .update({ order_index: update.order_index })
          .eq("id", update.id);
      }

      toast({ title: "Template structure updated" });
    } catch (error: any) {
      toast({
        title: "Error reordering blocks",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate("/invoices")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Invoices
          </Button>
          <h1 className="text-4xl font-bold">Customize Invoice Template</h1>
        </div>
      </div>

      <Card className="p-6 mb-6 bg-muted/30">
        <p className="text-sm text-muted-foreground">
          This template defines the structure for all new invoices. Add, remove, or reorder
          blocks to customize what staff members will see when creating invoices.
        </p>
      </Card>

      <div className="space-y-4 mb-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-semibold">Template Structure</h2>
          <BlockTypeSelector onSelect={addBlock} />
        </div>

        {blocks.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-muted-foreground mb-4">
              No blocks in template yet. Add blocks to define your invoice structure.
            </p>
            <BlockTypeSelector onSelect={addBlock} />
          </Card>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={blocks.map((b) => b.id)}
              strategy={verticalListSortingStrategy}
            >
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
        )}
      </div>

      {saving && (
        <div className="fixed bottom-4 right-4 bg-background border rounded-lg p-4 shadow-lg">
          <div className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm">Saving changes...</span>
          </div>
        </div>
      )}
    </div>
  );
}
