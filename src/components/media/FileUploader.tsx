import { useState, useCallback } from 'react';
import { Upload, X, CheckCircle, AlertCircle, Loader2, RefreshCw, FileImage, FileVideo, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';

interface UploadFile {
  id: string;
  file: File;
  progress: number;
  status: 'pending' | 'uploading' | 'success' | 'error';
  error?: string;
  result?: any;
}

interface FileUploaderProps {
  entityType?: string;
  entityId?: string;
  onUploadComplete?: (files: any[]) => void;
  accept?: string;
  maxFiles?: number;
  className?: string;
}

const ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'pdf', 'doc', 'docx', 'mp4', 'webm'];

const getFileTypeIcon = (file: File) => {
  if (file.type.startsWith('image/')) return FileImage;
  if (file.type.startsWith('video/')) return FileVideo;
  return FileText;
};

export function FileUploader({
  entityType,
  entityId,
  onUploadComplete,
  accept = 'image/*,application/pdf,.doc,.docx,video/*',
  maxFiles = 10,
  className,
}: FileUploaderProps) {
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  const validateFile = (file: File): string | null => {
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!ext || !ALLOWED_EXTENSIONS.includes(ext)) {
      return 'نوع الملف غير مدعوم';
    }
    if (file.size > 50 * 1024 * 1024) {
      return 'حجم الملف يتجاوز 50MB';
    }
    return null;
  };

  const addFiles = useCallback((newFiles: FileList | File[]) => {
    const fileArray = Array.from(newFiles).slice(0, maxFiles - files.length);
    
    const uploadFiles: UploadFile[] = fileArray.map(file => {
      const error = validateFile(file);
      return {
        id: crypto.randomUUID(),
        file,
        progress: 0,
        status: error ? 'error' : 'pending',
        error,
      };
    });

    setFiles(prev => [...prev, ...uploadFiles]);
  }, [files.length, maxFiles]);

  const removeFile = (id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
  };

  const uploadFile = async (uploadFile: UploadFile): Promise<void> => {
    setFiles(prev => prev.map(f => 
      f.id === uploadFile.id ? { ...f, status: 'uploading', progress: 10 } : f
    ));

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('غير مصرح');
      }

      const formData = new FormData();
      formData.append('file', uploadFile.file);
      if (entityType) formData.append('entity_type', entityType);
      if (entityId) formData.append('entity_id', entityId);

      const progressInterval = setInterval(() => {
        setFiles(prev => prev.map(f => {
          if (f.id === uploadFile.id && f.status === 'uploading' && f.progress < 90) {
            return { ...f, progress: f.progress + 10 };
          }
          return f;
        }));
      }, 200);

      const response = await supabase.functions.invoke('upload-media', {
        body: formData,
      });

      clearInterval(progressInterval);

      if (response.error) {
        throw new Error(response.error.message || 'فشل الرفع');
      }

      setFiles(prev => prev.map(f => 
        f.id === uploadFile.id 
          ? { ...f, status: 'success', progress: 100, result: response.data.file } 
          : f
      ));

    } catch (error: any) {
      console.error('Upload error:', error);
      setFiles(prev => prev.map(f => 
        f.id === uploadFile.id 
          ? { ...f, status: 'error', error: error.message || 'فشل الرفع', progress: 0 } 
          : f
      ));
    }
  };

  const uploadAll = async () => {
    const pendingFiles = files.filter(f => f.status === 'pending');
    
    for (const file of pendingFiles) {
      await uploadFile(file);
    }

    const successFiles = files.filter(f => f.status === 'success').map(f => f.result);
    if (successFiles.length > 0 && onUploadComplete) {
      onUploadComplete(successFiles);
    }
  };

  const retryFile = (id: string) => {
    setFiles(prev => prev.map(f => 
      f.id === id ? { ...f, status: 'pending', error: undefined, progress: 0 } : f
    ));
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files.length > 0) {
      addFiles(e.dataTransfer.files);
    }
  }, [addFiles]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const pendingCount = files.filter(f => f.status === 'pending').length;
  const uploadingCount = files.filter(f => f.status === 'uploading').length;

  return (
    <div className={cn('space-y-4', className)}>
      {/* Drop Zone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={cn(
          'relative border-2 border-dashed rounded-xl p-10 text-center transition-all duration-300 cursor-pointer overflow-hidden',
          isDragging 
            ? 'border-primary bg-primary/10 scale-[1.02]' 
            : 'border-border/60 hover:border-primary/60 hover:bg-accent/30'
        )}
        onClick={() => document.getElementById('file-input')?.click()}
      >
        <div className={cn(
          'absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 transition-opacity',
          isDragging && 'opacity-100'
        )} />
        
        <div className="relative">
          <div className={cn(
            'mx-auto w-16 h-16 rounded-2xl flex items-center justify-center mb-4 transition-all',
            isDragging 
              ? 'bg-primary text-primary-foreground scale-110' 
              : 'bg-muted text-muted-foreground'
          )}>
            <Upload className="h-7 w-7" />
          </div>
          
          <p className="text-base font-medium mb-1">
            اسحب الملفات هنا أو انقر للاختيار
          </p>
          <p className="text-sm text-muted-foreground">
            صور، PDF، Word، فيديو • حد أقصى 50MB لكل ملف
          </p>
        </div>
        
        <input
          id="file-input"
          type="file"
          multiple
          accept={accept}
          className="hidden"
          onChange={(e) => e.target.files && addFiles(e.target.files)}
        />
      </div>

      {/* File List */}
      {files.length > 0 && (
        <div className="space-y-2 max-h-[300px] overflow-y-auto">
          {files.map(file => {
            const FileIcon = getFileTypeIcon(file.file);
            return (
              <div
                key={file.id}
                className={cn(
                  'flex items-center gap-3 p-3 rounded-xl border transition-all',
                  file.status === 'success' && 'bg-green-500/5 border-green-500/30',
                  file.status === 'error' && 'bg-destructive/5 border-destructive/30',
                  file.status === 'uploading' && 'bg-primary/5 border-primary/30',
                  file.status === 'pending' && 'bg-card border-border'
                )}
              >
                {/* File Icon */}
                <div className={cn(
                  'flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center',
                  file.status === 'success' && 'bg-green-500/10 text-green-600',
                  file.status === 'error' && 'bg-destructive/10 text-destructive',
                  file.status === 'uploading' && 'bg-primary/10 text-primary',
                  file.status === 'pending' && 'bg-muted text-muted-foreground'
                )}>
                  {file.status === 'success' ? (
                    <CheckCircle className="h-5 w-5" />
                  ) : file.status === 'uploading' ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : file.status === 'error' ? (
                    <AlertCircle className="h-5 w-5" />
                  ) : (
                    <FileIcon className="h-5 w-5" />
                  )}
                </div>

                {/* File Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{file.file.name}</p>
                  <div className="flex items-center gap-2">
                    <p className="text-xs text-muted-foreground">
                      {(file.file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                    {file.status === 'success' && (
                      <span className="text-xs text-green-600 font-medium">تم الرفع</span>
                    )}
                  </div>
                  {file.status === 'uploading' && (
                    <Progress value={file.progress} className="h-1.5 mt-2" />
                  )}
                  {file.error && (
                    <p className="text-xs text-destructive mt-1">{file.error}</p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex-shrink-0 flex gap-1">
                  {file.status === 'error' && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 hover:bg-destructive/10"
                      onClick={() => retryFile(file.id)}
                    >
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                  )}
                  {file.status !== 'uploading' && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => removeFile(file.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Upload Button */}
      {pendingCount > 0 && (
        <Button
          onClick={uploadAll}
          disabled={uploadingCount > 0}
          size="lg"
          className="w-full"
        >
          {uploadingCount > 0 ? (
            <>
              <Loader2 className="h-4 w-4 ml-2 animate-spin" />
              جاري الرفع...
            </>
          ) : (
            <>
              <Upload className="h-4 w-4 ml-2" />
              رفع {pendingCount} {pendingCount === 1 ? 'ملف' : 'ملفات'}
            </>
          )}
        </Button>
      )}
    </div>
  );
}
