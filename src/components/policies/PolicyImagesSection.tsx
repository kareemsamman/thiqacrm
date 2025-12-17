import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ImageIcon, Plus, Trash2, Download, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { DeleteConfirmDialog } from "@/components/shared/DeleteConfirmDialog";

interface MediaFile {
  id: string;
  original_name: string;
  cdn_url: string;
  mime_type: string;
  size: number;
  created_at: string;
}

interface PolicyImagesSectionProps {
  policyId: string;
}

export function PolicyImagesSection({ policyId }: PolicyImagesSectionProps) {
  const { toast } = useToast();
  const [images, setImages] = useState<MediaFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<MediaFile | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingImage, setDeletingImage] = useState<MediaFile | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchImages = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('media_files')
        .select('*')
        .eq('entity_type', 'policy')
        .eq('entity_id', policyId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setImages(data || []);
    } catch (error) {
      console.error('Error fetching images:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchImages();
  }, [policyId]);

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        // Upload via edge function
        const formData = new FormData();
        formData.append('file', file);
        formData.append('entity_type', 'policy');
        formData.append('entity_id', policyId);

        const { data: { session } } = await supabase.auth.getSession();
        
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/upload-media`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${session?.access_token}`,
            },
            body: formData,
          }
        );

        if (!response.ok) {
          const err = await response.json();
          throw new Error(err.error || 'Upload failed');
        }
      }

      toast({ title: "تم الرفع", description: "تم رفع الملفات بنجاح" });
      fetchImages();
    } catch (error: any) {
      console.error('Error uploading:', error);
      toast({ 
        title: "خطأ", 
        description: error.message || "فشل في رفع الملفات", 
        variant: "destructive" 
      });
    } finally {
      setUploading(false);
      // Reset the input
      event.target.value = '';
    }
  };

  const handleDelete = async () => {
    if (!deletingImage) return;

    setDeleting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/delete-media`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session?.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ mediaId: deletingImage.id }),
        }
      );

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Delete failed');
      }

      toast({ title: "تم الحذف", description: "تم حذف الملف بنجاح" });
      fetchImages();
    } catch (error: any) {
      console.error('Error deleting:', error);
      toast({ 
        title: "خطأ", 
        description: error.message || "فشل في حذف الملف", 
        variant: "destructive" 
      });
    } finally {
      setDeleting(false);
      setDeleteDialogOpen(false);
      setDeletingImage(null);
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const isImage = (mimeType: string) => mimeType.startsWith('image/');

  return (
    <>
      <Card className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-primary font-semibold">
            <ImageIcon className="h-4 w-4" />
            <span>الملفات والصور ({images.length})</span>
          </div>
          <div className="relative">
            <input
              type="file"
              multiple
              accept="image/*,.pdf"
              onChange={handleUpload}
              className="absolute inset-0 opacity-0 cursor-pointer"
              disabled={uploading}
            />
            <Button size="sm" variant="outline" disabled={uploading}>
              {uploading ? (
                <Loader2 className="h-4 w-4 ml-1 animate-spin" />
              ) : (
                <Plus className="h-4 w-4 ml-1" />
              )}
              رفع ملف
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-4 text-muted-foreground">جاري التحميل...</div>
        ) : images.length === 0 ? (
          <p className="text-center text-muted-foreground py-4">لا توجد ملفات مرفقة</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {images.map((image) => (
              <div
                key={image.id}
                className="relative group rounded-lg border overflow-hidden bg-muted/30 aspect-square"
              >
                {isImage(image.mime_type) ? (
                  <img
                    src={image.cdn_url}
                    alt={image.original_name}
                    className="w-full h-full object-cover cursor-pointer"
                    onClick={() => setSelectedImage(image)}
                  />
                ) : (
                  <div 
                    className="w-full h-full flex flex-col items-center justify-center cursor-pointer"
                    onClick={() => window.open(image.cdn_url, '_blank')}
                  >
                    <ImageIcon className="h-8 w-8 text-muted-foreground" />
                    <p className="text-xs text-muted-foreground mt-2 px-2 truncate w-full text-center">
                      {image.original_name}
                    </p>
                  </div>
                )}
                
                {/* Overlay actions */}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <Button
                    size="icon"
                    variant="secondary"
                    className="h-8 w-8"
                    onClick={() => window.open(image.cdn_url, '_blank')}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="destructive"
                    className="h-8 w-8"
                    onClick={() => {
                      setDeletingImage(image);
                      setDeleteDialogOpen(true);
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                
                {/* Size badge */}
                <div className="absolute bottom-1 right-1 text-xs bg-black/60 text-white px-1.5 py-0.5 rounded">
                  {formatSize(image.size)}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Image Preview Dialog */}
      {selectedImage && (
        <Dialog open={!!selectedImage} onOpenChange={() => setSelectedImage(null)}>
          <DialogContent className="sm:max-w-3xl p-2">
            <DialogHeader className="sr-only">
              <DialogTitle>معاينة الصورة</DialogTitle>
            </DialogHeader>
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-2 left-2 z-10"
              onClick={() => setSelectedImage(null)}
            >
              <X className="h-4 w-4" />
            </Button>
            <img
              src={selectedImage.cdn_url}
              alt={selectedImage.original_name}
              className="w-full h-auto rounded-lg"
            />
            <p className="text-center text-sm text-muted-foreground mt-2">
              {selectedImage.original_name}
            </p>
          </DialogContent>
        </Dialog>
      )}

      {/* Delete Confirm Dialog */}
      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDelete}
        title="حذف الملف"
        description={`هل أنت متأكد من حذف "${deletingImage?.original_name}"؟`}
        loading={deleting}
      />
    </>
  );
}
