import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Image as ImageIcon } from "lucide-react";

interface ImageBlockProps {
  content: { url: string; alt: string };
  onUpdate: (content: any) => void;
}

export function ImageBlock({ content, onUpdate }: ImageBlockProps) {
  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="image-url">Image URL</Label>
        <Input
          id="image-url"
          value={content.url || ""}
          onChange={(e) => onUpdate({ ...content, url: e.target.value })}
          placeholder="https://example.com/image.jpg"
        />
      </div>
      <div>
        <Label htmlFor="image-alt">Alt Text</Label>
        <Input
          id="image-alt"
          value={content.alt || ""}
          onChange={(e) => onUpdate({ ...content, alt: e.target.value })}
          placeholder="Description of the image"
        />
      </div>
      {content.url && (
        <div className="relative aspect-video w-full overflow-hidden rounded-lg border bg-muted">
          <img
            src={content.url}
            alt={content.alt || "Report image"}
            className="object-cover w-full h-full"
            onError={(e) => {
              e.currentTarget.src = "";
              e.currentTarget.style.display = "none";
            }}
          />
          {!content.url && (
            <div className="absolute inset-0 flex items-center justify-center">
              <ImageIcon className="h-12 w-12 text-muted-foreground" />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
