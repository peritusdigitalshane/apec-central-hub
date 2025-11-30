import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Upload, X, Image as ImageIcon } from "lucide-react";

interface Photo {
  url: string;
  caption?: string;
  filename: string;
}

interface PhotoUploadBlockProps {
  content: { photos: Photo[] };
  onUpdate: (content: any) => void;
}

export function PhotoUploadBlock({ content, onUpdate }: PhotoUploadBlockProps) {
  const [uploading, setUploading] = useState(false);
  const photos = content.photos || [];

  const uploadPhoto = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);
      
      if (!event.target.files || event.target.files.length === 0) {
        return;
      }

      const file = event.target.files[0];
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('inspection-photos')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('inspection-photos')
        .getPublicUrl(filePath);

      const newPhotos = [
        ...photos,
        { url: publicUrl, filename: file.name, caption: "" }
      ];

      onUpdate({ photos: newPhotos });
      toast.success("Photo uploaded successfully");
    } catch (error: any) {
      toast.error("Error uploading photo: " + error.message);
    } finally {
      setUploading(false);
    }
  };

  const updateCaption = (index: number, caption: string) => {
    const newPhotos = [...photos];
    newPhotos[index] = { ...newPhotos[index], caption };
    onUpdate({ photos: newPhotos });
  };

  const removePhoto = async (index: number) => {
    try {
      const photo = photos[index];
      
      // Extract the file path from the URL
      const urlParts = photo.url.split('/');
      const filePath = urlParts[urlParts.length - 1];

      // Delete from storage
      const { error } = await supabase.storage
        .from('inspection-photos')
        .remove([filePath]);

      if (error) throw error;

      const newPhotos = photos.filter((_, i) => i !== index);
      onUpdate({ photos: newPhotos });
      toast.success("Photo removed");
    } catch (error: any) {
      toast.error("Error removing photo: " + error.message);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label>Inspection Photos</Label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={uploading}
          className="relative"
        >
          <Upload className="h-4 w-4 mr-2" />
          {uploading ? "Uploading..." : "Upload Photo"}
          <Input
            type="file"
            accept="image/*"
            onChange={uploadPhoto}
            disabled={uploading}
            className="absolute inset-0 opacity-0 cursor-pointer"
          />
        </Button>
      </div>

      {photos.length === 0 ? (
        <div className="border-2 border-dashed rounded-lg p-8 text-center">
          <ImageIcon className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">No photos uploaded yet</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {photos.map((photo, index) => (
            <div key={index} className="border rounded-lg overflow-hidden">
              <div className="relative aspect-video bg-muted">
                <img
                  src={photo.url}
                  alt={photo.caption || `Photo ${index + 1}`}
                  className="object-cover w-full h-full"
                />
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 right-2 h-8 w-8"
                  onClick={() => removePhoto(index)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <div className="p-3">
                <Input
                  placeholder="Add caption..."
                  value={photo.caption || ""}
                  onChange={(e) => updateCaption(index, e.target.value)}
                  className="text-sm"
                />
                <p className="text-xs text-muted-foreground mt-1">{photo.filename}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
