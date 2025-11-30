import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save, ArrowLeft, Send } from "lucide-react";
import SignatureCanvas from "react-signature-canvas";
import apecLogo from "@/assets/apec-logo.png";

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

interface InvoiceData {
  inspector?: string;
  company?: string;
  services: Array<{ description: string; cost: string }>;
  startTime?: string;
  finishTime?: string;
  siteTime?: string;
  offsiteHours?: string;
  totalHours?: string;
  consumables?: string;
  contactName?: string;
  contactPhone?: string;
  signature?: string;
}

export default function InvoiceEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [invoiceData, setInvoiceData] = useState<InvoiceData>({
    services: Array(12).fill({ description: "", cost: "" })
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const signaturePadRef = useRef<SignatureCanvas>(null);

  useEffect(() => {
    if (id) {
      loadInvoice();
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

      // Load invoice blocks to get the data
      const { data: blocks } = await supabase
        .from("invoice_blocks")
        .select("*")
        .eq("invoice_id", id)
        .order("order_index");

      if (blocks && blocks.length > 0) {
        const dataBlock = blocks.find(b => b.type === "invoice_data");
        if (dataBlock && dataBlock.content) {
          const content = dataBlock.content as any;
          setInvoiceData(content);
          if (content.signature && signaturePadRef.current) {
            setTimeout(() => {
              signaturePadRef.current?.fromDataURL(content.signature);
            }, 100);
          }
        }
      }
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

  const saveInvoice = async () => {
    if (!invoice) return;
    setSaving(true);

    try {
      // Save invoice metadata
      const { error: invoiceError } = await supabase
        .from("invoices")
        .update({
          invoice_number: invoice.invoice_number,
          date: invoice.date,
          customer_name: invoiceData.contactName,
          customer_company: invoiceData.company,
          customer_phone: invoiceData.contactPhone,
          purchase_order: invoice.purchase_order,
          total: invoice.total,
          gst: invoice.gst,
          total_inc_gst: invoice.total_inc_gst,
        })
        .eq("id", id);

      if (invoiceError) throw invoiceError;

      // Save signature
      if (signaturePadRef.current && !signaturePadRef.current.isEmpty()) {
        invoiceData.signature = signaturePadRef.current.toDataURL();
      }

      // Save invoice data as a block
      const { data: existingBlocks } = await supabase
        .from("invoice_blocks")
        .select("*")
        .eq("invoice_id", id)
        .eq("type", "invoice_data");

      if (existingBlocks && existingBlocks.length > 0) {
        await supabase
          .from("invoice_blocks")
          .update({ content: invoiceData as any })
          .eq("id", existingBlocks[0].id);
      } else {
        await supabase
          .from("invoice_blocks")
          .insert([{
            invoice_id: id!,
            type: "invoice_data",
            content: invoiceData as any,
            order_index: 0,
          }]);
      }

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
    await saveInvoice();
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

  const updateService = (index: number, field: 'description' | 'cost', value: string) => {
    const newServices = [...invoiceData.services];
    newServices[index] = { ...newServices[index], [field]: value };
    setInvoiceData({ ...invoiceData, services: newServices });
  };

  const clearSignature = () => {
    signaturePadRef.current?.clear();
    setInvoiceData({ ...invoiceData, signature: undefined });
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
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-[900px] mx-auto">
        {/* Action Buttons */}
        <div className="flex items-center justify-between mb-4">
          <Button variant="ghost" onClick={() => navigate("/invoices")} size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div className="flex gap-2">
            <Button onClick={saveInvoice} disabled={saving} variant="outline" size="sm">
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              Save
            </Button>
            {invoice.status === "draft" && (
              <Button onClick={submitInvoice} size="sm">
                <Send className="h-4 w-4 mr-2" />
                Submit
              </Button>
            )}
          </div>
        </div>

        {/* Invoice Form */}
        <div className="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-950 dark:to-amber-900 p-8 rounded-lg shadow-lg border-2 border-amber-200 dark:border-amber-800">
          {/* Header */}
          <div className="flex justify-between items-start mb-6 pb-4 border-b-2 border-amber-900/20">
            <div className="space-y-3 flex-1">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm">DATE:</span>
                <Input
                  type="date"
                  value={invoice.date || ""}
                  onChange={(e) => setInvoice({ ...invoice, date: e.target.value })}
                  className="w-48 h-7 text-sm bg-white/50 border-amber-900/30"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm">INSPECTOR:</span>
                <Input
                  value={invoiceData.inspector || ""}
                  onChange={(e) => setInvoiceData({ ...invoiceData, inspector: e.target.value })}
                  className="flex-1 h-7 text-sm bg-white/50 border-amber-900/30"
                  placeholder="Inspector name"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm">COMPANY:</span>
                <Input
                  value={invoiceData.company || ""}
                  onChange={(e) => setInvoiceData({ ...invoiceData, company: e.target.value })}
                  className="flex-1 h-7 text-sm bg-white/50 border-amber-900/30"
                  placeholder="Company name"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm">PURCHASE ORDER#:</span>
                <Input
                  value={invoice.purchase_order || ""}
                  onChange={(e) => setInvoice({ ...invoice, purchase_order: e.target.value })}
                  className="w-48 h-7 text-sm bg-white/50 border-amber-900/30"
                  placeholder="PO number"
                />
              </div>
            </div>
            
            <div className="ml-8 text-right">
              <img src={apecLogo} alt="APEC Logo" className="h-16 mb-2 ml-auto" />
              <div className="text-xs space-y-0.5 text-muted-foreground mb-4">
                <p>☎ 0414 528 183</p>
                <p>✉ info@apecinspect.com.au</p>
                <p>🌐 www.apecinspect.com.au</p>
              </div>
              <h1 className="text-3xl font-bold text-red-700 mb-1">TAX INVOICE</h1>
              <Input
                value={invoice.invoice_number || ""}
                onChange={(e) => setInvoice({ ...invoice, invoice_number: e.target.value })}
                className="w-32 text-2xl font-bold text-red-700 text-center bg-white/50 border-amber-900/30 ml-auto"
                placeholder="####"
              />
            </div>
          </div>

          {/* Services and Time Tracking */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
            {/* Services Table */}
            <div className="lg:col-span-2">
              <div className="bg-white/40 border-2 border-amber-900/30 rounded">
                <div className="grid grid-cols-12 gap-0 border-b-2 border-amber-900/30 bg-amber-100/50">
                  <div className="col-span-9 p-2 font-semibold text-sm">SERVICES SUPPLIED</div>
                  <div className="col-span-3 p-2 font-semibold text-sm border-l-2 border-amber-900/30">COSTS</div>
                </div>
                {invoiceData.services.map((service, index) => (
                  <div key={index} className="grid grid-cols-12 gap-0 border-b border-amber-900/10">
                    <Textarea
                      value={service.description}
                      onChange={(e) => updateService(index, 'description', e.target.value)}
                      className="col-span-9 h-10 resize-none text-sm bg-transparent border-0 rounded-none focus-visible:ring-0 border-r-2 border-amber-900/30"
                      placeholder="..."
                    />
                    <Input
                      value={service.cost}
                      onChange={(e) => updateService(index, 'cost', e.target.value)}
                      className="col-span-3 h-10 text-sm bg-transparent border-0 rounded-none focus-visible:ring-0"
                      placeholder=""
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Time Tracking */}
            <div className="bg-amber-100/50 border-2 border-amber-900/30 rounded p-3 space-y-2">
              <div className="grid grid-cols-2 gap-2 items-center">
                <span className="text-sm font-semibold">START</span>
                <Input
                  type="time"
                  value={invoiceData.startTime || ""}
                  onChange={(e) => setInvoiceData({ ...invoiceData, startTime: e.target.value })}
                  className="h-7 text-sm bg-white/50 border-amber-900/30"
                />
              </div>
              <div className="grid grid-cols-2 gap-2 items-center">
                <span className="text-sm font-semibold">FINISH</span>
                <Input
                  type="time"
                  value={invoiceData.finishTime || ""}
                  onChange={(e) => setInvoiceData({ ...invoiceData, finishTime: e.target.value })}
                  className="h-7 text-sm bg-white/50 border-amber-900/30"
                />
              </div>
              <div className="grid grid-cols-2 gap-2 items-center">
                <span className="text-sm font-semibold">SITE TIME</span>
                <Input
                  value={invoiceData.siteTime || ""}
                  onChange={(e) => setInvoiceData({ ...invoiceData, siteTime: e.target.value })}
                  className="h-7 text-sm bg-white/50 border-amber-900/30"
                  placeholder="hrs"
                />
              </div>
              <div className="grid grid-cols-2 gap-2 items-center">
                <span className="text-sm font-semibold">OFFSITE HOURS</span>
                <Input
                  value={invoiceData.offsiteHours || ""}
                  onChange={(e) => setInvoiceData({ ...invoiceData, offsiteHours: e.target.value })}
                  className="h-7 text-sm bg-white/50 border-amber-900/30"
                  placeholder="hrs"
                />
              </div>
              <div className="grid grid-cols-2 gap-2 items-center">
                <span className="text-sm font-semibold">TOTAL Hrs</span>
                <Input
                  value={invoiceData.totalHours || ""}
                  onChange={(e) => setInvoiceData({ ...invoiceData, totalHours: e.target.value })}
                  className="h-7 text-sm bg-white/50 border-amber-900/30"
                  placeholder="hrs"
                />
              </div>
              <div className="pt-2 border-t border-amber-900/30">
                <span className="text-sm font-semibold block mb-1">CONSUMABLES:</span>
                <Input
                  value={invoiceData.consumables || ""}
                  onChange={(e) => setInvoiceData({ ...invoiceData, consumables: e.target.value })}
                  className="h-7 text-sm bg-white/50 border-amber-900/30"
                  placeholder="Amount"
                />
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Contact Info & Signature */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm">Contact Name:</span>
                <Input
                  value={invoiceData.contactName || ""}
                  onChange={(e) => setInvoiceData({ ...invoiceData, contactName: e.target.value })}
                  className="flex-1 h-7 text-sm bg-white/50 border-amber-900/30"
                  placeholder="Name"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm">Contact Phone:</span>
                <Input
                  value={invoiceData.contactPhone || ""}
                  onChange={(e) => setInvoiceData({ ...invoiceData, contactPhone: e.target.value })}
                  className="flex-1 h-7 text-sm bg-white/50 border-amber-900/30"
                  placeholder="Phone"
                />
              </div>
              <div className="pt-2">
                <span className="font-semibold text-sm block mb-1">Signed:</span>
                <div className="bg-white/50 border-2 border-amber-900/30 rounded">
                  <SignatureCanvas
                    ref={signaturePadRef}
                    canvasProps={{
                      className: 'w-full h-28 rounded',
                    }}
                  />
                </div>
                <Button onClick={clearSignature} variant="ghost" size="sm" className="mt-1">
                  Clear Signature
                </Button>
              </div>
            </div>

            {/* Totals */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-sm">TOTAL</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm">$</span>
                  <Input
                    type="number"
                    step="0.01"
                    value={invoice.total || ""}
                    onChange={(e) => setInvoice({ ...invoice, total: parseFloat(e.target.value) || null })}
                    className="w-32 h-7 text-sm text-right bg-white/50 border-amber-900/30"
                    placeholder="0.00"
                  />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-semibold text-sm">GST</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm">$</span>
                  <Input
                    type="number"
                    step="0.01"
                    value={invoice.gst || ""}
                    onChange={(e) => setInvoice({ ...invoice, gst: parseFloat(e.target.value) || null })}
                    className="w-32 h-7 text-sm text-right bg-white/50 border-amber-900/30"
                    placeholder="0.00"
                  />
                </div>
              </div>
              <div className="flex items-center justify-between pt-2 border-t-2 border-amber-900/30">
                <span className="font-bold text-base">Includes GST</span>
                <div className="flex items-center gap-2">
                  <span className="text-base font-bold">$</span>
                  <Input
                    type="number"
                    step="0.01"
                    value={invoice.total_inc_gst || ""}
                    onChange={(e) => setInvoice({ ...invoice, total_inc_gst: parseFloat(e.target.value) || null })}
                    className="w-32 h-8 text-base font-bold text-right bg-white/50 border-amber-900/30"
                    placeholder="0.00"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
