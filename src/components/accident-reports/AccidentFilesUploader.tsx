import { useState, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { ScannerDialog } from "@/components/shared/ScannerDialog";
import { Upload, Printer, X, FileImage, Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface UploadedFile {
  id: string;
  url: string;
  name: string;
  type: string;
}

interface AccidentFilesUploaderProps {
  files: UploadedFile[];
  onFilesChange: (files: UploadedFile[]) => void;
  uploading: boolean;
  setUploading: (uploading: boolean) => void;
  disabled?: boolean;
}

export function AccidentFilesUploader({
  files,
  onFilesChange,
  uploading,
  setUploading,
  disabled,
}: AccidentFilesUploaderProps) {
  const [scannerOpen, setScannerOpen] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadFile = async (file: File | Blob, fileName?: string): Promise<UploadedFile | null> => {
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", "accident-reports");
      if (fileName) {
        formData.append("filename", fileName);
      }

      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.access_token) {
        throw new Error("غير مصرح");
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/upload-media`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.session.access_token}`,
          },
          body: formData,
        }
      );

      if (!response.ok) {
        throw new Error("فشل في رفع الملف");
      }

      const result = await response.json();
      
      return {
        id: `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        url: result.url,
        name: fileName || (file instanceof File ? file.name : `scan_${Date.now()}.jpg`),
        type: file.type || "image/jpeg",
      };
    } catch (error) {
      console.error("Upload error:", error);
      return null;
    }
  };

  const handleFilesUpload = useCallback(async (selectedFiles: FileList | File[]) => {
    if (!selectedFiles.length) return;

    setUploading(true);
    const newFiles: UploadedFile[] = [];

    for (const file of Array.from(selectedFiles)) {
      const uploaded = await uploadFile(file, file.name);
      if (uploaded) {
        newFiles.push(uploaded);
      } else {
        toast.error(`فشل رفع: ${file.name}`);
      }
    }

    if (newFiles.length > 0) {
      onFilesChange([...files, ...newFiles]);
      toast.success(`تم رفع ${newFiles.length} ملف بنجاح`);
    }

    setUploading(false);
  }, [files, onFilesChange, setUploading]);

  const handleScannedImages = async (blobs: Blob[]) => {
    setUploading(true);
    const newFiles: UploadedFile[] = [];

    for (let i = 0; i < blobs.length; i++) {
      const fileName = `scan_${Date.now()}_${i + 1}.jpg`;
      const uploaded = await uploadFile(blobs[i], fileName);
      if (uploaded) {
        newFiles.push(uploaded);
      }
    }

    if (newFiles.length > 0) {
      onFilesChange([...files, ...newFiles]);
      toast.success(`تم حفظ ${newFiles.length} صورة ممسوحة`);
    }

    setUploading(false);
  };

  const handleRemoveFile = (id: string) => {
    onFilesChange(files.filter(f => f.id !== id));
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    if (e.dataTransfer.files?.length) {
      handleFilesUpload(e.dataTransfer.files);
    }
  };

  return (
    <div className="space-y-3">
      {/* Drop Zone */}
      <div
        className={cn(
          "border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer",
          isDragOver ? "border-primary bg-primary/5" : "border-muted-foreground/30 hover:border-primary/50",
          disabled && "opacity-50 pointer-events-none"
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,application/pdf"
          className="hidden"
          onChange={(e) => e.target.files && handleFilesUpload(e.target.files)}
          disabled={disabled}
        />
        
        {uploading ? (
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">جاري الرفع...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <Upload className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              اسحب الملفات هنا أو اضغط للاختيار
            </p>
            <p className="text-xs text-muted-foreground">
              صور أو PDF (متعدد)
            </p>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading || disabled}
          className="flex-1 gap-2"
        >
          <Upload className="h-4 w-4" />
          رفع ملفات
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setScannerOpen(true)}
          disabled={uploading || disabled}
          className="flex-1 gap-2"
        >
          <Printer className="h-4 w-4" />
          مسح ضوئي
        </Button>
      </div>

      {/* Uploaded Files Gallery */}
      {files.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {files.map((file) => (
            <div
              key={file.id}
              className="relative aspect-square rounded-lg overflow-hidden border bg-muted group"
            >
              {file.type.startsWith("image/") ? (
                <img
                  src={file.url}
                  alt={file.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <FileImage className="h-8 w-8 text-muted-foreground" />
                </div>
              )}
              
              <button
                type="button"
                onClick={() => handleRemoveFile(file.id)}
                className="absolute top-1 left-1 p-1 bg-destructive text-destructive-foreground rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                disabled={disabled}
              >
                <X className="h-3 w-3" />
              </button>
              
              <div className="absolute bottom-0 inset-x-0 bg-black/60 text-white text-[10px] p-1 truncate">
                {file.name}
              </div>
            </div>
          ))}
        </div>
      )}

      <ScannerDialog
        open={scannerOpen}
        onOpenChange={setScannerOpen}
        onSave={handleScannedImages}
        title="مسح مستندات البلاغ"
      />
    </div>
  );
}
