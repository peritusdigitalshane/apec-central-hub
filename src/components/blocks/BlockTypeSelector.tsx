import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Plus, Type, Heading, CheckSquare, Image } from "lucide-react";

interface BlockTypeSelectorProps {
  onSelect: (type: string) => void;
}

export function BlockTypeSelector({ onSelect }: BlockTypeSelectorProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Add Block
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => onSelect("heading")} className="gap-2">
          <Heading className="h-4 w-4" />
          Heading
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onSelect("text")} className="gap-2">
          <Type className="h-4 w-4" />
          Text
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onSelect("checklist")} className="gap-2">
          <CheckSquare className="h-4 w-4" />
          Checklist
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onSelect("image")} className="gap-2">
          <Image className="h-4 w-4" />
          Image
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
