import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface HeadingBlockProps {
  content: { text: string; level: number };
  onUpdate: (content: any) => void;
}

export function HeadingBlock({ content, onUpdate }: HeadingBlockProps) {
  const level = content.level || 2;
  const fontSize = level === 1 ? "text-3xl" : level === 2 ? "text-2xl" : "text-xl";

  return (
    <div className="space-y-2">
      <div className="flex gap-2 items-center">
        <Select
          value={String(level)}
          onValueChange={(value) => onUpdate({ ...content, level: Number(value) })}
        >
          <SelectTrigger className="w-24">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1">H1</SelectItem>
            <SelectItem value="2">H2</SelectItem>
            <SelectItem value="3">H3</SelectItem>
          </SelectContent>
        </Select>
        <Input
          value={content.text || ""}
          onChange={(e) => onUpdate({ ...content, text: e.target.value })}
          placeholder="Enter heading..."
          className={`font-bold ${fontSize}`}
        />
      </div>
    </div>
  );
}
