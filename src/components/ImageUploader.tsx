import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { X, Upload, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface ImagePreview {
  url: string;
  file?: File;
}

interface ImageUploaderProps {
  images: string[];
  onImagesChange: (images: string[]) => void;
  maxImages?: number;
  onUpload?: (files: File[]) => Promise<string[]>;
  isLoading?: boolean;
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({
  images,
  onImagesChange,
  maxImages = 10,
  onUpload,
  isLoading = false,
}) => {
  const [previews, setPreviews] = useState<ImagePreview[]>(
    images.map(url => ({ url }))
  );
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleFileSelect = async (files: FileList | null) => {
    if (!files) return;

    const fileArray = Array.from(files);
    
    if (previews.length + fileArray.length > maxImages) {
      toast.error(`Maximum ${maxImages} images allowed`);
      return;
    }

    const newPreviews: ImagePreview[] = [];
    
    for (const file of fileArray) {
      if (!file.type.startsWith('image/')) {
        toast.error(`${file.name} is not an image`);
        continue;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        newPreviews.push({
          url: e.target?.result as string,
          file,
        });

        if (newPreviews.length === fileArray.length) {
          const updatedPreviews = [...previews, ...newPreviews];
          setPreviews(updatedPreviews);

          if (onUpload) {
            uploadFiles(fileArray, updatedPreviews);
          } else {
            const urls = updatedPreviews.map(p => p.url);
            onImagesChange(urls);
          }
        }
      };
      reader.onerror = () => {
        toast.error(`Failed to read ${file.name}`);
      };
      reader.readAsDataURL(file);
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const uploadFiles = async (files: File[], updatedPreviews: ImagePreview[]) => {
    if (!onUpload) return;

    try {
      const uploadedUrls = await onUpload(files);
      const finalPreviews = updatedPreviews.slice(0, updatedPreviews.length - files.length)
        .concat(uploadedUrls.map(url => ({ url })));
      
      setPreviews(finalPreviews);
      onImagesChange(finalPreviews.map(p => p.url));
      toast.success(`${files.length} image(s) uploaded`);
    } catch (error: any) {
      const errorMsg = error?.message || 'Upload failed';
      toast.error(errorMsg);
      
      // Remove failed uploads from previews
      const successCount = updatedPreviews.length - files.length;
      setPreviews(updatedPreviews.slice(0, successCount));
      onImagesChange(updatedPreviews.slice(0, successCount).map(p => p.url));
    }
  };

  const removeImage = (index: number) => {
    const updated = previews.filter((_, i) => i !== index);
    setPreviews(updated);
    onImagesChange(updated.map(p => p.url));
  };

  const moveImage = (fromIndex: number, toIndex: number) => {
    const updated = [...previews];
    const [moved] = updated.splice(fromIndex, 1);
    updated.splice(toIndex, 0, moved);
    setPreviews(updated);
    onImagesChange(updated.map(p => p.url));
  };

  const setPrimaryImage = (index: number) => {
    if (index === 0) return;
    moveImage(index, 0);
    toast.success('Primary image updated');
  };

  return (
    <div className="space-y-4">
      <div>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*"
          onChange={(e) => handleFileSelect(e.target.files)}
          className="hidden"
          disabled={isLoading || previews.length >= maxImages}
        />
        <Button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isLoading || previews.length >= maxImages}
          variant="outline"
          className="w-full"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Uploading...
            </>
          ) : (
            <>
              <Upload className="mr-2 h-4 w-4" />
              Select Images ({previews.length}/{maxImages})
            </>
          )}
        </Button>
      </div>

      {previews.length > 0 && (
        <div>
          <label className="text-sm font-medium mb-2 block">
            Preview Images
            {previews.length > 0 && (
              <span className="text-xs text-muted-foreground ml-2">
                First image will be primary
              </span>
            )}
          </label>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {previews.map((preview, idx) => (
              <div
                key={idx}
                className={`relative group rounded-lg overflow-hidden border-2 ${
                  idx === 0
                    ? 'border-primary shadow-lg'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <img
                  src={preview.url}
                  alt={`Preview ${idx + 1}`}
                  className="w-full aspect-square object-cover"
                />
                
                {idx === 0 && (
                  <Badge className="absolute top-2 left-2 bg-primary">
                    Primary
                  </Badge>
                )}

                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  {idx !== 0 && (
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      onClick={() => setPrimaryImage(idx)}
                      className="text-xs"
                    >
                      Set Primary
                    </Button>
                  )}
                  <Button
                    type="button"
                    size="sm"
                    variant="destructive"
                    onClick={() => removeImage(idx)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {previews.length === 0 && (
        <div className="border-2 border-dashed rounded-lg p-8 text-center text-muted-foreground">
          <Upload className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No images selected. Click "Select Images" to add them.</p>
        </div>
      )}
    </div>
  );
};
