 import { useState, useEffect } from "react";
 import { Button } from "@/components/ui/button";
 import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
 import { Badge } from "@/components/ui/badge";
 import { Skeleton } from "@/components/ui/skeleton";
 import {
   Dialog,
   DialogContent,
   DialogHeader,
   DialogTitle,
 } from "@/components/ui/dialog";
 import { supabase } from "@/integrations/supabase/client";
 import { useToast } from "@/hooks/use-toast";
 import { FileUploader } from "@/components/media/FileUploader";
 import { PdfJsViewer } from "@/components/policies/PdfJsViewer";
 import {
   Trash2,
   FileImage,
   FileText,
   Eye,
   Upload,
   Loader2,
   Download,
   X,
 } from "lucide-react";
 
 interface AccidentFile {
   id: string;
   file_url: string;
   file_name: string | null;
   file_type: string | null;
   created_at: string;
 }
 
 interface AccidentFilesSectionProps {
   accidentReportId: string;
   onFilesChange?: (count: number) => void;
 }
 
 export function AccidentFilesSection({ accidentReportId, onFilesChange }: AccidentFilesSectionProps) {
   const { toast } = useToast();
   const [files, setFiles] = useState<AccidentFile[]>([]);
   const [loading, setLoading] = useState(true);
   const [deletingId, setDeletingId] = useState<string | null>(null);
   const [previewUrl, setPreviewUrl] = useState<string | null>(null);
   const [previewType, setPreviewType] = useState<"image" | "pdf" | null>(null);
 
   const fetchFiles = async () => {
     setLoading(true);
     try {
       const { data, error } = await supabase
         .from("accident_report_files")
         .select("*")
         .eq("accident_report_id", accidentReportId)
         .order("created_at", { ascending: false });
 
       if (error) throw error;
       setFiles(data || []);
       onFilesChange?.(data?.length || 0);
     } catch (error) {
       console.error("Error fetching files:", error);
       toast({ title: "خطأ", description: "فشل في تحميل الملفات", variant: "destructive" });
     } finally {
       setLoading(false);
     }
   };
 
   useEffect(() => {
     if (accidentReportId) {
       fetchFiles();
     }
   }, [accidentReportId]);
 
   const handleUploadComplete = async (uploadedFiles: any[]) => {
     try {
       // Insert into accident_report_files
       const inserts = uploadedFiles.map((file) => ({
         accident_report_id: accidentReportId,
         file_url: file.cdn_url,
         file_name: file.original_name,
         file_type: file.mime_type,
       }));
 
       const { error } = await supabase.from("accident_report_files").insert(inserts);
 
       if (error) throw error;
 
       toast({ title: "تم الرفع", description: `تم رفع ${uploadedFiles.length} ملف بنجاح` });
       fetchFiles();
     } catch (error: any) {
       console.error("Error saving files:", error);
       toast({ title: "خطأ", description: error.message || "فشل في حفظ الملفات", variant: "destructive" });
     }
   };
 
   const handleDelete = async (fileId: string) => {
     setDeletingId(fileId);
     try {
       const { error } = await supabase.from("accident_report_files").delete().eq("id", fileId);
       if (error) throw error;
 
       toast({ title: "تم الحذف", description: "تم حذف الملف بنجاح" });
       setFiles((prev) => prev.filter((f) => f.id !== fileId));
       onFilesChange?.(files.length - 1);
     } catch (error: any) {
       console.error("Error deleting file:", error);
       toast({ title: "خطأ", description: error.message || "فشل في حذف الملف", variant: "destructive" });
     } finally {
       setDeletingId(null);
     }
   };
 
   const openPreview = (file: AccidentFile) => {
     const isPdf = file.file_type?.includes("pdf") || file.file_url.toLowerCase().endsWith(".pdf");
     const isImage = file.file_type?.startsWith("image/") || 
       /\.(jpg|jpeg|png|webp|gif)$/i.test(file.file_url);
 
     if (isPdf) {
       setPreviewType("pdf");
       setPreviewUrl(file.file_url);
     } else if (isImage) {
       setPreviewType("image");
       setPreviewUrl(file.file_url);
     } else {
       // For other files, open in new tab
       window.open(file.file_url, "_blank");
     }
   };
 
   const getFileIcon = (file: AccidentFile) => {
     const isPdf = file.file_type?.includes("pdf") || file.file_url.toLowerCase().endsWith(".pdf");
     if (isPdf) return <FileText className="h-8 w-8 text-red-500" />;
     return <FileImage className="h-8 w-8 text-blue-500" />;
   };
 
   const isImage = (file: AccidentFile) => {
     return file.file_type?.startsWith("image/") || /\.(jpg|jpeg|png|webp|gif)$/i.test(file.file_url);
   };
 
   if (loading) {
     return (
       <Card>
         <CardHeader>
           <CardTitle className="text-lg flex items-center gap-2">
             <FileImage className="h-5 w-5" />
             ملفات وصور الحادث
           </CardTitle>
         </CardHeader>
         <CardContent>
           <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
             {[1, 2, 3, 4].map((i) => (
               <Skeleton key={i} className="h-32 w-full rounded-lg" />
             ))}
           </div>
         </CardContent>
       </Card>
     );
   }
 
   return (
     <>
       <Card>
         <CardHeader>
           <CardTitle className="text-lg flex items-center gap-2">
             <FileImage className="h-5 w-5" />
             ملفات وصور الحادث
             {files.length > 0 && (
               <Badge variant="secondary">{files.length}</Badge>
             )}
           </CardTitle>
         </CardHeader>
         <CardContent className="space-y-6">
           {/* File Uploader */}
           <FileUploader
             entityType="accident_report"
             entityId={accidentReportId}
             onUploadComplete={handleUploadComplete}
             accept="image/*,application/pdf"
             maxFiles={20}
           />
 
           {/* Files Grid */}
           {files.length > 0 && (
             <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
               {files.map((file) => (
                 <div
                   key={file.id}
                   className="group relative border rounded-lg overflow-hidden bg-muted/30 hover:bg-muted/50 transition-all"
                 >
                   {/* Thumbnail or Icon */}
                   <div className="aspect-square flex items-center justify-center p-2">
                     {isImage(file) ? (
                       <img
                         src={file.file_url}
                         alt={file.file_name || "صورة"}
                         className="w-full h-full object-cover rounded"
                       />
                     ) : (
                       getFileIcon(file)
                     )}
                   </div>
 
                   {/* File name */}
                   <div className="p-2 border-t bg-background/80">
                     <p className="text-xs truncate text-muted-foreground">
                       {file.file_name || "ملف"}
                     </p>
                   </div>
 
                   {/* Overlay actions */}
                   <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                     <Button
                       size="icon"
                       variant="secondary"
                       className="h-8 w-8"
                       onClick={() => openPreview(file)}
                     >
                       <Eye className="h-4 w-4" />
                     </Button>
                     <Button
                       size="icon"
                       variant="secondary"
                       className="h-8 w-8"
                       onClick={() => window.open(file.file_url, "_blank")}
                     >
                       <Download className="h-4 w-4" />
                     </Button>
                     <Button
                       size="icon"
                       variant="destructive"
                       className="h-8 w-8"
                       onClick={() => handleDelete(file.id)}
                       disabled={deletingId === file.id}
                     >
                       {deletingId === file.id ? (
                         <Loader2 className="h-4 w-4 animate-spin" />
                       ) : (
                         <Trash2 className="h-4 w-4" />
                       )}
                     </Button>
                   </div>
                 </div>
               ))}
             </div>
           )}
 
           {files.length === 0 && (
             <div className="text-center py-8 text-muted-foreground">
               <FileImage className="h-12 w-12 mx-auto mb-2 opacity-50" />
               <p>لا توجد ملفات مرفقة</p>
               <p className="text-sm">قم برفع صور السيارة، محاضر الشرطة، أو أي مستندات أخرى</p>
             </div>
           )}
         </CardContent>
       </Card>
 
       {/* Preview Dialog */}
       <Dialog open={!!previewUrl} onOpenChange={() => { setPreviewUrl(null); setPreviewType(null); }}>
         <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
           <DialogHeader>
             <DialogTitle className="flex items-center justify-between">
               معاينة الملف
               <Button
                 variant="ghost"
                 size="icon"
                 onClick={() => { setPreviewUrl(null); setPreviewType(null); }}
               >
                 <X className="h-4 w-4" />
               </Button>
             </DialogTitle>
           </DialogHeader>
           <div className="mt-4">
             {previewType === "image" && previewUrl && (
               <img
                 src={previewUrl}
                 alt="Preview"
                 className="max-w-full max-h-[70vh] mx-auto rounded-lg"
               />
             )}
             {previewType === "pdf" && previewUrl && (
               <div className="h-[70vh]">
                 <PdfJsViewer url={previewUrl} className="h-full" />
               </div>
             )}
           </div>
         </DialogContent>
       </Dialog>
     </>
   );
 }