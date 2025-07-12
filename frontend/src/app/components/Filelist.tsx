import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Image, Eye, X, FileText } from "lucide-react";

interface FileData {
  filename: string;
  imageUrl: string;
}

interface FileListsProps {
  files: FileData[];
  onFileClick: (file: FileData) => void;
}

const FileLists: React.FC<FileListsProps> = ({ files, onFileClick }) => {
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [previewFilename, setPreviewFilename] = useState<string>("");
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const handleImagePreview = (imageUrl: string, filename: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering the file click
    setPreviewImage(imageUrl);
    setPreviewFilename(filename);
    setIsPreviewOpen(true);
  };

  const handleFileItemClick = (file: FileData) => {
    // Process the file for expense extraction
    onFileClick(file);
  };

  return (
    <>
      <div className="space-y-3">
        {files && files.length > 0 ? (
          files.map((file, index) => (
            <div
              key={index}
              className="group p-3 bg-gray-50 rounded-lg border hover:bg-gray-100 hover:border-blue-200 transition-all duration-200 cursor-pointer"
              onClick={() => handleFileItemClick(file)}
            >
              {/* Mobile-first responsive layout */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                {/* File info section */}
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  {/* File icon */}
                  <div className="flex-shrink-0 p-2 bg-blue-100 rounded-lg">
                    <Image className="h-5 w-5 text-blue-600" />
                  </div>
                  
                  {/* File details */}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate text-sm sm:text-base">
                      {file.filename}
                    </p>
                    <p className="text-xs sm:text-sm text-gray-500">JPG • Image</p>
                  </div>
                  
                  {/* Thumbnail preview - hidden on very small screens */}
                  {file.imageUrl && (
                    <div className="hidden xs:block flex-shrink-0">
                      <div 
                        className="w-12 h-12 rounded-lg overflow-hidden border border-gray-200 hover:border-blue-300 transition-colors cursor-pointer"
                        onClick={(e) => handleImagePreview(file.imageUrl, file.filename, e)}
                        title="Click to preview image"
                      >
                        <img
                          src={file.imageUrl}
                          alt={`Preview of ${file.filename}`}
                          className="w-full h-full object-cover hover:scale-105 transition-transform"
                          onError={(e) => {
                            console.error("Thumbnail failed to load:", file.imageUrl);
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Action buttons section */}
                <div className="flex items-center justify-end gap-2 flex-shrink-0">
                  {file.imageUrl && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => handleImagePreview(file.imageUrl, file.filename, e)}
                      className="px-3 py-2 text-xs sm:text-sm"
                      title="Preview image"
                    >
                      <Eye className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                      <span className="hidden sm:inline">Preview</span>
                    </Button>
                  )}
                  <Button
                    variant="default"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleFileItemClick(file);
                    }}
                    className="px-3 py-2 text-xs sm:text-sm bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    <FileText className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                    Process File
                  </Button>
                </div>
              </div>
              
              {/* Mobile thumbnail preview - only shown on very small screens */}
              {file.imageUrl && (
                <div className="block xs:hidden mt-3">
                  <div 
                    className="w-full h-32 rounded-lg overflow-hidden border border-gray-200 hover:border-blue-300 transition-colors cursor-pointer"
                    onClick={(e) => handleImagePreview(file.imageUrl, file.filename, e)}
                    title="Tap to preview image"
                  >
                    <img
                      src={file.imageUrl}
                      alt={`Preview of ${file.filename}`}
                      className="w-full h-full object-cover hover:scale-105 transition-transform"
                      onError={(e) => {
                        console.error("Mobile thumbnail failed to load:", file.imageUrl);
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          ))
        ) : (
          <div className="text-center py-8 text-gray-500">
            <Image className="h-12 w-12 text-gray-300 mx-auto mb-2" />
            <p className="text-sm sm:text-base">No files available</p>
            <p className="text-xs sm:text-sm mt-1">Upload files to get started</p>
          </div>
        )}
      </div>

      {/* Image Preview Modal */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] p-0">
          <DialogHeader className="p-4 sm:p-6 pb-0">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <DialogTitle className="text-lg sm:text-xl">Image Preview</DialogTitle>
                <DialogDescription className="truncate text-sm sm:text-base">
                  {previewFilename}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <div className="p-4 sm:p-6 pt-0">
            {previewImage ? (
              <div className="relative">
                <img
                  src={previewImage}
                  alt={previewFilename}
                  className="w-full h-auto max-h-[60vh] sm:max-h-[70vh] object-contain rounded-lg"
                  onError={(e) => {
                    console.error("Preview image failed to load:", previewImage);
                    e.currentTarget.style.display = 'none';
                  }}
                />
              </div>
            ) : (
              <div className="flex items-center justify-center h-32 sm:h-64 bg-gray-100 rounded-lg">
                <div className="text-center">
                  <Image className="h-8 w-8 sm:h-12 sm:w-12 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-500 text-sm sm:text-base">No image available</p>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default FileLists;
