import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save, ArrowLeft, Send } from "lucide-react";
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

interface Invoice {
  id: string;
  invoice_number: string | null;
  date: string | null;
  customer_name: string | null;
  customer_company: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  purchase_order: string | null;
  status: string;
  total: number | null;
  gst: number | null;
  total_inc_gst: number | null;
}

interface Block {
  id: string;
  type: string;
  content: any;
  order_index: number;
}

export default function InvoiceEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
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
    if (id) {
      loadInvoice();
      loadBlocks();
    }
  }, [id]);

  const loadInvoice = async () => {
    try {
      const { data, error } = await supabase
        .from("invoices")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;
      setInvoice(data);
    } catch (error: any) {
      toast({
        title: "Error loading invoice",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadBlocks = async () => {
    try {
      const { data, error } = await supabase
        .from("invoice_blocks")
        .select("*")
        .eq("invoice_id", id)
        .order("order_index");

      if (error) throw error;
      setBlocks(data || []);
    } catch (error: any) {
      toast({
        title: "Error loading blocks",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const saveInvoice = async () => {
    if (!invoice) return;
    setSaving(true);

    try {
      const { error } = await supabase
        .from("invoices")
        .update({
          invoice_number: invoice.invoice_number,
          date: invoice.date,
          customer_name: invoice.customer_name,
          customer_company: invoice.customer_company,
          customer_email: invoice.customer_email,
          customer_phone: invoice.customer_phone,
          purchase_order: invoice.purchase_order,
          total: invoice.total,
          gst: invoice.gst,
          total_inc_gst: invoice.total_inc_gst,
        })
        .eq("id", id);

      if (error) throw error;

      toast({ title: "Invoice saved successfully" });
    } catch (error: any) {
      toast({
        title: "Error saving invoice",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const submitInvoice = async () => {
    if (!invoice) return;

    try {
      const { error } = await supabase
        .from("invoices")
        .update({
          status: "submitted",
          submitted_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (error) throw error;

      toast({ title: "Invoice submitted successfully" });
      navigate("/invoices");
    } catch (error: any) {
      toast({
        title: "Error submitting invoice",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const addBlock = async (type: string) => {
    try {
      const maxOrder = blocks.reduce((max, b) => Math.max(max, b.order_index), -1);
      const { data, error } = await supabase
        .from("invoice_blocks")
        .insert({
          invoice_id: id,
          type,
          content: {},
          order_index: maxOrder + 1,
        })
        .select()
        .single();

      if (error) throw error;
      setBlocks([...blocks, data]);
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
        .from("invoice_blocks")
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
        .from("invoice_blocks")
        .delete()
        .eq("id", blockId);

      if (error) throw error;
      setBlocks(blocks.filter((b) => b.id !== blockId));
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
    try {
      const updates = reorderedBlocks.map((block, index) => ({
        id: block.id,
        order_index: index,
      }));

      for (const update of updates) {
        await supabase
          .from("invoice_blocks")
          .update({ order_index: update.order_index })
          .eq("id", update.id);
      }
    } catch (error: any) {
      toast({
        title: "Error reordering blocks",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!invoice) {
    return <div>Invoice not found</div>;
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate("/invoices")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <h1 className="text-4xl font-bold">
            Invoice {invoice.invoice_number || "Draft"}
          </h1>
        </div>
        <div className="flex gap-2">
          <Button onClick={saveInvoice} disabled={saving} variant="outline">
            {saving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Save
          </Button>
          {invoice.status === "draft" && (
            <Button onClick={submitInvoice}>
              <Send className="h-4 w-4 mr-2" />
              Submit
            </Button>
          )}
        </div>
      </div>

      <Card className="p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>Invoice Number</Label>
            <Input
              value={invoice.invoice_number || ""}
              onChange={(e) =>
                setInvoice({ ...invoice, invoice_number: e.target.value })
              }
            />
          </div>
          <div>
            <Label>Date</Label>
            <Input
              type="date"
              value={invoice.date || ""}
              onChange={(e) => setInvoice({ ...invoice, date: e.target.value })}
            />
          </div>
          <div>
            <Label>Customer Name</Label>
            <Input
              value={invoice.customer_name || ""}
              onChange={(e) =>
                setInvoice({ ...invoice, customer_name: e.target.value })
              }
            />
          </div>
          <div>
            <Label>Customer Company</Label>
            <Input
              value={invoice.customer_company || ""}
              onChange={(e) =>
                setInvoice({ ...invoice, customer_company: e.target.value })
              }
            />
          </div>
          <div>
            <Label>Customer Email</Label>
            <Input
              type="email"
              value={invoice.customer_email || ""}
              onChange={(e) =>
                setInvoice({ ...invoice, customer_email: e.target.value })
              }
            />
          </div>
          <div>
            <Label>Customer Phone</Label>
            <Input
              value={invoice.customer_phone || ""}
              onChange={(e) =>
                setInvoice({ ...invoice, customer_phone: e.target.value })
              }
            />
          </div>
          <div>
            <Label>Purchase Order</Label>
            <Input
              value={invoice.purchase_order || ""}
              onChange={(e) =>
                setInvoice({ ...invoice, purchase_order: e.target.value })
              }
            />
          </div>
          <div>
            <Label>Total (ex GST)</Label>
            <Input
              type="number"
              step="0.01"
              value={invoice.total || ""}
              onChange={(e) =>
                setInvoice({ ...invoice, total: parseFloat(e.target.value) || null })
              }
            />
          </div>
          <div>
            <Label>GST</Label>
            <Input
              type="number"
              step="0.01"
              value={invoice.gst || ""}
              onChange={(e) =>
                setInvoice({ ...invoice, gst: parseFloat(e.target.value) || null })
              }
            />
          </div>
          <div>
            <Label>Total (inc GST)</Label>
            <Input
              type="number"
              step="0.01"
              value={invoice.total_inc_gst || ""}
              onChange={(e) =>
                setInvoice({
                  ...invoice,
                  total_inc_gst: parseFloat(e.target.value) || null,
                })
              }
            />
          </div>
        </div>
      </Card>

      <div className="space-y-4 mb-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-semibold">Invoice Content</h2>
          <BlockTypeSelector onSelect={addBlock} />
        </div>

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
                  canEdit={invoice.status === "draft"}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      </div>
    </div>
  );
}
