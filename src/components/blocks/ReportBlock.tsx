import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { GripVertical, Trash2 } from "lucide-react";
import { TextBlock } from "./TextBlock";
import { HeadingBlock } from "./HeadingBlock";
import { ChecklistBlock } from "./ChecklistBlock";
import { ImageBlock } from "./ImageBlock";
import { PhotoUploadBlock } from "./PhotoUploadBlock";
import { DataTableBlock } from "./DataTableBlock";
import { NotesBlock } from "./NotesBlock";

interface Block {
  id: string;
  type: string;
  content: any;
  order_index: number;
}

interface ReportBlockProps {
  block: Block;
  onUpdate: (content: any) => void;
  onDelete: () => void;
}

export function ReportBlock({ block, onUpdate, onDelete }: ReportBlockProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: block.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const renderBlockContent = () => {
    switch (block.type) {
      case "text":
        return <TextBlock content={block.content} onUpdate={onUpdate} />;
      case "heading":
        return <HeadingBlock content={block.content} onUpdate={onUpdate} />;
      case "checklist":
        return <ChecklistBlock content={block.content} onUpdate={onUpdate} />;
      case "image":
        return <ImageBlock content={block.content} onUpdate={onUpdate} />;
      case "photo_upload":
        return <PhotoUploadBlock content={block.content} onUpdate={onUpdate} />;
      case "data_table":
        return <DataTableBlock content={block.content} onUpdate={onUpdate} />;
      case "notes":
        return <NotesBlock content={block.content} onUpdate={onUpdate} />;
      default:
        return <div>Unknown block type: {block.type}</div>;
    }
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <Card className="p-4 relative group">
        <div className="flex gap-2">
          <div
            {...listeners}
            className="cursor-grab active:cursor-grabbing opacity-50 hover:opacity-100 transition-opacity"
          >
            <GripVertical className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="flex-1">{renderBlockContent()}</div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onDelete}
            className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </Card>
    </div>
  );
}
