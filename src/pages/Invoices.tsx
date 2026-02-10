import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, Settings, Copy, Trash2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface Invoice {
  id: string;
  invoice_number: string | null;
  date: string | null;
  customer_name: string | null;
  customer_company: string | null;
  status: string;
  total_inc_gst: number | null;
  created_at: string;
}

export default function Invoices() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { role } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadInvoices();
  }, []);

  const loadInvoices = async () => {
    try {
      const { data, error } = await supabase
        .from("invoices")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setInvoices(data || []);
    } catch (error: any) {
      toast({
        title: "Error loading invoices",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const createInvoice = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: invoice, error } = await supabase
        .from("invoices")
        .insert({
          user_id: user.id,
          status: "draft",
        })
        .select()
        .single();

      if (error) throw error;

      // Copy template blocks to the new invoice
      const { data: templateBlocks } = await supabase
        .from("invoice_template_blocks")
        .select("*")
        .order("order_index");

      if (templateBlocks && templateBlocks.length > 0) {
        const invoiceBlocks = templateBlocks.map(block => ({
          invoice_id: invoice.id,
          type: block.type,
          content: block.content,
          order_index: block.order_index,
        }));

        await supabase.from("invoice_blocks").insert(invoiceBlocks);
      }

      navigate(`/invoices/${invoice.id}`);
    } catch (error: any) {
      toast({
        title: "Error creating invoice",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const cloneInvoice = async (id: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Get the original invoice
      const { data: originalInvoice, error: invoiceError } = await supabase
        .from("invoices")
        .select("*")
        .eq("id", id)
        .single();

      if (invoiceError) throw invoiceError;

      // Create new invoice with same metadata but reset status
      const { data: newInvoice, error: newInvoiceError } = await supabase
        .from("invoices")
        .insert({
          user_id: user.id,
          customer_name: originalInvoice.customer_name,
          customer_company: originalInvoice.customer_company,
          customer_email: originalInvoice.customer_email,
          customer_phone: originalInvoice.customer_phone,
          purchase_order: originalInvoice.purchase_order,
          status: "draft",
          invoice_number: null, // Clear invoice number
          date: null, // Clear date
        })
        .select()
        .single();

      if (newInvoiceError) throw newInvoiceError;

      // Get all blocks from the original invoice
      const { data: originalBlocks, error: blocksError } = await supabase
        .from("invoice_blocks")
        .select("*")
        .eq("invoice_id", id)
        .order("order_index");

      if (blocksError) throw blocksError;

      // Copy blocks to new invoice
      if (originalBlocks && originalBlocks.length > 0) {
        const newBlocks = originalBlocks.map((block) => ({
          invoice_id: newInvoice.id,
          type: block.type,
          content: block.content,
          order_index: block.order_index,
        }));

        const { error: insertBlocksError } = await supabase
          .from("invoice_blocks")
          .insert(newBlocks);

        if (insertBlocksError) throw insertBlocksError;
      }

      toast({ title: "Invoice cloned successfully" });
      navigate(`/invoices/${newInvoice.id}`);
    } catch (error: any) {
      toast({
        title: "Error cloning invoice",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const deleteInvoice = async (id: string) => {
    if (!confirm("Are you sure you want to delete this invoice?")) return;

    try {
      const { error } = await supabase.from("invoices").delete().eq("id", id);
      if (error) throw error;

      toast({ title: "Invoice deleted successfully" });
      loadInvoices();
    } catch (error: any) {
      toast({
        title: "Error deleting invoice",
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

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-4xl font-bold">Invoices</h1>
        <div className="flex gap-2">
          {(role === "admin" || role === "super_admin") && (
            <Button
              variant="outline"
              onClick={() => navigate("/invoices/template")}
              className="gap-2"
            >
              <Settings className="h-4 w-4" />
              Customize Template
            </Button>
          )}
          <Button onClick={createInvoice} className="gap-2">
            <Plus className="h-4 w-4" />
            New Invoice
          </Button>
        </div>
      </div>

      {invoices.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground mb-4">No invoices yet</p>
          <Button onClick={createInvoice}>Create your first invoice</Button>
        </Card>
      ) : (
        <div className="grid gap-4">
          {invoices.map((invoice) => (
            <Card
              key={invoice.id}
              className="p-6 hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => navigate(`/invoices/${invoice.id}`)}
            >
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <div className="flex items-center gap-3">
                    <h3 className="text-xl font-semibold">
                      Invoice {invoice.invoice_number || "Draft"}
                    </h3>
                    <span
                      className={`text-xs px-2 py-1 rounded-full ${
                        invoice.status === "submitted"
                          ? "bg-green-100 text-green-800"
                          : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {invoice.status}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {invoice.customer_company || invoice.customer_name || "No customer"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {invoice.date ? new Date(invoice.date).toLocaleDateString() : "No date"}
                  </p>
                </div>
                <div className="text-right">
                  {invoice.total_inc_gst && (
                    <p className="text-xl font-bold">
                      ${invoice.total_inc_gst.toFixed(2)}
                    </p>
                  )}
                  <div className="flex gap-1 mt-2 justify-end">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        cloneInvoice(invoice.id);
                      }}
                      title="Clone invoice"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    {invoice.status === "draft" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteInvoice(invoice.id);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
