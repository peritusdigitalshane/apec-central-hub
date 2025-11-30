import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Plus, X } from "lucide-react";

interface ChecklistItem {
  text: string;
  checked: boolean;
}

interface ChecklistBlockProps {
  content: { items: ChecklistItem[] };
  onUpdate: (content: any) => void;
}

export function ChecklistBlock({ content, onUpdate }: ChecklistBlockProps) {
  const items = content.items || [];

  const addItem = () => {
    onUpdate({
      items: [...items, { text: "", checked: false }],
    });
  };

  const updateItem = (index: number, updates: Partial<ChecklistItem>) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], ...updates };
    onUpdate({ items: newItems });
  };

  const removeItem = (index: number) => {
    onUpdate({
      items: items.filter((_, i) => i !== index),
    });
  };

  return (
    <div className="space-y-2">
      {items.map((item, index) => (
        <div key={index} className="flex gap-2 items-center">
          <Checkbox
            checked={item.checked}
            onCheckedChange={(checked) => updateItem(index, { checked: !!checked })}
          />
          <Input
            value={item.text}
            onChange={(e) => updateItem(index, { text: e.target.value })}
            placeholder="Checklist item..."
            className="flex-1"
          />
          <Button
            variant="ghost"
            size="icon"
            onClick={() => removeItem(index)}
            className="h-8 w-8"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ))}
      <Button onClick={addItem} variant="outline" size="sm" className="gap-2">
        <Plus className="h-4 w-4" />
        Add Item
      </Button>
    </div>
  );
}
