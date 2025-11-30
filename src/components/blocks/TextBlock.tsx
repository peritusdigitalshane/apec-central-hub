import { Textarea } from "@/components/ui/textarea";

interface TextBlockProps {
  content: { text: string };
  onUpdate: (content: any) => void;
}

export function TextBlock({ content, onUpdate }: TextBlockProps) {
  return (
    <Textarea
      value={content.text || ""}
      onChange={(e) => onUpdate({ text: e.target.value })}
      placeholder="Enter text..."
      className="min-h-[100px]"
    />
  );
}
