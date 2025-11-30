import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface NotesBlockProps {
  content: { title: string; text: string };
  onUpdate: (content: any) => void;
}

export function NotesBlock({ content, onUpdate }: NotesBlockProps) {
  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="notes-title">Notes Title</Label>
        <Input
          id="notes-title"
          value={content.title || ""}
          onChange={(e) => onUpdate({ ...content, title: e.target.value })}
          placeholder="e.g., Examination Notes"
          className="font-semibold"
        />
      </div>
      <div>
        <Label htmlFor="notes-text">Content</Label>
        <Textarea
          id="notes-text"
          value={content.text || ""}
          onChange={(e) => onUpdate({ ...content, text: e.target.value })}
          placeholder="Enter examination notes, findings, and observations..."
          className="min-h-[200px]"
        />
      </div>
    </div>
  );
}
