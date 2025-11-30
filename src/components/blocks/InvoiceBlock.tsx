import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import SignatureCanvas from "react-signature-canvas";

interface InvoiceContent {
  date?: string;
  inspector?: string;
  company?: string;
  purchaseOrder?: string;
  invoiceNumber?: string;
  servicesSupplied?: Array<{ description: string; cost: string }>;
  startTime?: string;
  finishTime?: string;
  siteTime?: string;
  offsiteHours?: string;
  totalHours?: string;
  consumables?: string;
  total?: string;
  gst?: string;
  includesGst?: string;
  contactName?: string;
  contactPhone?: string;
  signature?: string;
}

interface InvoiceBlockProps {
  content: InvoiceContent;
  onUpdate: (content: InvoiceContent) => void;
}

export function InvoiceBlock({ content, onUpdate }: InvoiceBlockProps) {
  const [localContent, setLocalContent] = useState<InvoiceContent>(content || {
    servicesSupplied: [{ description: "", cost: "" }]
  });
  const signaturePadRef = useRef<SignatureCanvas>(null);

  useEffect(() => {
    if (content?.signature && signaturePadRef.current) {
      signaturePadRef.current.fromDataURL(content.signature);
    }
  }, []);

  const handleChange = (field: keyof InvoiceContent, value: any) => {
    const updated = { ...localContent, [field]: value };
    setLocalContent(updated);
    onUpdate(updated);
  };

  const handleServiceChange = (index: number, field: 'description' | 'cost', value: string) => {
    const services = [...(localContent.servicesSupplied || [])];
    services[index] = { ...services[index], [field]: value };
    handleChange('servicesSupplied', services);
  };

  const addServiceLine = () => {
    const services = [...(localContent.servicesSupplied || []), { description: "", cost: "" }];
    handleChange('servicesSupplied', services);
  };

  const removeServiceLine = (index: number) => {
    const services = (localContent.servicesSupplied || []).filter((_, i) => i !== index);
    handleChange('servicesSupplied', services);
  };

  const clearSignature = () => {
    signaturePadRef.current?.clear();
    handleChange('signature', '');
  };

  const saveSignature = () => {
    if (signaturePadRef.current) {
      const signatureData = signaturePadRef.current.toDataURL();
      handleChange('signature', signatureData);
    }
  };

  return (
    <div className="space-y-6 border border-border rounded-lg p-6 bg-background">
      {/* Header */}
      <div className="flex justify-between items-start border-b border-border pb-4">
        <div className="space-y-4 flex-1">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Date</Label>
              <Input
                type="date"
                value={localContent.date || ''}
                onChange={(e) => handleChange('date', e.target.value)}
              />
            </div>
            <div>
              <Label>Invoice Number</Label>
              <Input
                value={localContent.invoiceNumber || ''}
                onChange={(e) => handleChange('invoiceNumber', e.target.value)}
                placeholder="e.g., 6918"
              />
            </div>
          </div>
          
          <div>
            <Label>Inspector</Label>
            <Input
              value={localContent.inspector || ''}
              onChange={(e) => handleChange('inspector', e.target.value)}
            />
          </div>
          
          <div>
            <Label>Company</Label>
            <Input
              value={localContent.company || ''}
              onChange={(e) => handleChange('company', e.target.value)}
            />
          </div>
          
          <div>
            <Label>Purchase Order #</Label>
            <Input
              value={localContent.purchaseOrder || ''}
              onChange={(e) => handleChange('purchaseOrder', e.target.value)}
            />
          </div>
        </div>
        
        <div className="ml-8">
          <h2 className="text-3xl font-bold text-destructive">TAX INVOICE</h2>
        </div>
      </div>

      {/* Services and Time Tracking */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Services Supplied */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex justify-between items-center">
            <Label className="text-lg font-semibold">Services Supplied</Label>
            <Button onClick={addServiceLine} size="sm" variant="outline">
              Add Line
            </Button>
          </div>
          <div className="space-y-2">
            {(localContent.servicesSupplied || []).map((service, index) => (
              <div key={index} className="grid grid-cols-12 gap-2 items-center">
                <Input
                  className="col-span-8"
                  value={service.description}
                  onChange={(e) => handleServiceChange(index, 'description', e.target.value)}
                  placeholder="Service description"
                />
                <Input
                  className="col-span-3"
                  value={service.cost}
                  onChange={(e) => handleServiceChange(index, 'cost', e.target.value)}
                  placeholder="Cost"
                />
                {(localContent.servicesSupplied?.length || 0) > 1 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="col-span-1"
                    onClick={() => removeServiceLine(index)}
                  >
                    ×
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Time Tracking */}
        <div className="space-y-3 border border-border p-4 rounded-lg bg-muted/30">
          <div>
            <Label className="text-sm">Start Time</Label>
            <Input
              type="time"
              value={localContent.startTime || ''}
              onChange={(e) => handleChange('startTime', e.target.value)}
            />
          </div>
          <div>
            <Label className="text-sm">Finish Time</Label>
            <Input
              type="time"
              value={localContent.finishTime || ''}
              onChange={(e) => handleChange('finishTime', e.target.value)}
            />
          </div>
          <div>
            <Label className="text-sm">Site Time</Label>
            <Input
              value={localContent.siteTime || ''}
              onChange={(e) => handleChange('siteTime', e.target.value)}
              placeholder="Hours"
            />
          </div>
          <div>
            <Label className="text-sm">Offsite Hours</Label>
            <Input
              value={localContent.offsiteHours || ''}
              onChange={(e) => handleChange('offsiteHours', e.target.value)}
            />
          </div>
          <div>
            <Label className="text-sm">Total Hours</Label>
            <Input
              value={localContent.totalHours || ''}
              onChange={(e) => handleChange('totalHours', e.target.value)}
            />
          </div>
          <div>
            <Label className="text-sm">Consumables</Label>
            <Input
              value={localContent.consumables || ''}
              onChange={(e) => handleChange('consumables', e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Totals and Contact */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 border-t border-border pt-6">
        <div className="space-y-3">
          <div>
            <Label>Contact Name</Label>
            <Input
              value={localContent.contactName || ''}
              onChange={(e) => handleChange('contactName', e.target.value)}
            />
          </div>
          <div>
            <Label>Contact Phone</Label>
            <Input
              value={localContent.contactPhone || ''}
              onChange={(e) => handleChange('contactPhone', e.target.value)}
            />
          </div>
        </div>
        
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2 items-center">
            <Label>Total</Label>
            <Input
              value={localContent.total || ''}
              onChange={(e) => handleChange('total', e.target.value)}
              placeholder="$"
            />
          </div>
          <div className="grid grid-cols-2 gap-2 items-center">
            <Label>GST</Label>
            <Input
              value={localContent.gst || ''}
              onChange={(e) => handleChange('gst', e.target.value)}
              placeholder="$"
            />
          </div>
          <div className="grid grid-cols-2 gap-2 items-center">
            <Label className="font-semibold">Includes GST</Label>
            <Input
              value={localContent.includesGst || ''}
              onChange={(e) => handleChange('includesGst', e.target.value)}
              placeholder="$"
              className="font-semibold"
            />
          </div>
        </div>
      </div>

      {/* Signature */}
      <div className="space-y-2">
        <Label>Customer Signature</Label>
        <div className="border border-border rounded-lg bg-background">
          <SignatureCanvas
            ref={signaturePadRef}
            canvasProps={{
              className: 'w-full h-40 rounded-lg',
            }}
            onEnd={saveSignature}
          />
        </div>
        <Button onClick={clearSignature} variant="outline" size="sm">
          Clear Signature
        </Button>
      </div>
    </div>
  );
}
