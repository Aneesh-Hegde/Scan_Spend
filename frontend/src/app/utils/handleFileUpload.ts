import api from "./api"; // Assuming you have an axios instance set up
import { toast } from "react-toastify";
interface FileUpload {
  state: (data: string[]) => void
}
const HandleFileUpload = async (setFiles: FileUpload["state"]): Promise<void> => {
  try {
    // Triggering the file list refresh after upload
    const response = await api.get('http://localhost:1323/');
    const data = response.data;
    setFiles(data.files); // Updating the files list with the latest data from the backend
    toast.success('File uploaded successfully');
  } catch (error) {
    toast.error('Error updating file list');
  }
};
export default HandleFileUpload
