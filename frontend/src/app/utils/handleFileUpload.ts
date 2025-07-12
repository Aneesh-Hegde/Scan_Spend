import { toast } from "react-toastify";

// Define the FileData interface to match your main component
interface FileData {
  filename: string;
  imageUrl: string;
}

// Since you already have getAllFiles function in your main component,
// the best approach is to use a callback pattern
const HandleFileUpload = (
  uploadedFilename: string,
  refreshFilesCallback: () => Promise<void>
): void => {
  // After successful upload, refresh the file list from server
  refreshFilesCallback()
    .then(() => {
      toast.success(`File '${uploadedFilename}' uploaded successfully`);
    })
    .catch((error) => {
      console.error('Error refreshing file list:', error);
      toast.error('Error updating file list after upload');
    });
};

export default HandleFileUpload;
