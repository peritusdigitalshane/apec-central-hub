import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, X } from "lucide-react";

interface TableRow {
  label: string;
  value: string;
}

interface DataTableBlockProps {
  content: { title: string; rows: TableRow[] };
  onUpdate: (content: any) => void;
}

export function DataTableBlock({ content, onUpdate }: DataTableBlockProps) {
  const rows = content.rows || [];
  const title = content.title || "Technical Data";

  const addRow = () => {
    onUpdate({
      ...content,
      rows: [...rows, { label: "", value: "" }],
    });
  };

  const updateRow = (index: number, field: keyof TableRow, value: string) => {
    const newRows = [...rows];
    newRows[index] = { ...newRows[index], [field]: value };
    onUpdate({ ...content, rows: newRows });
  };

  const removeRow = (index: number) => {
    onUpdate({
      ...content,
      rows: rows.filter((_, i) => i !== index),
    });
  };

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="table-title">Table Title</Label>
        <Input
          id="table-title"
          value={title}
          onChange={(e) => onUpdate({ ...content, title: e.target.value })}
          placeholder="e.g., Technical Data Ultrasonic Inspection"
          className="font-semibold"
        />
      </div>

      <div className="border rounded-lg overflow-hidden">
        <div className="bg-muted px-4 py-2 grid grid-cols-[1fr,1fr,auto] gap-2 font-semibold text-sm">
          <div>Field</div>
          <div>Value</div>
          <div className="w-10"></div>
        </div>
        <div className="divide-y">
          {rows.map((row, index) => (
            <div key={index} className="px-4 py-2 grid grid-cols-[1fr,1fr,auto] gap-2 items-center">
              <Input
                value={row.label}
                onChange={(e) => updateRow(index, "label", e.target.value)}
                placeholder="Field name"
                className="h-9"
              />
              <Input
                value={row.value}
                onChange={(e) => updateRow(index, "value", e.target.value)}
                placeholder="Value"
                className="h-9"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => removeRow(index)}
                className="h-9 w-9"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      </div>

      <Button type="button" onClick={addRow} variant="outline" size="sm" className="gap-2">
        <Plus className="h-4 w-4" />
        Add Row
      </Button>
    </div>
  );
}
