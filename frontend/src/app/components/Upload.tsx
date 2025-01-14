"use client";
import React, { useState } from "react";
import { toast } from "react-toastify";
import axios from "axios";

interface UploadProps {
  onFileUpload: (filename: string) => void;
}

const Upload: React.FC<UploadProps> = ({ onFileUpload }) => {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  // Handle file selection
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      setFile(event.target.files[0]);
    }
  };

  // Handle file upload
  const handleFileUpload = async () => {
    if (!file) {
      toast.error("No file selected");
      return;
    }

    try {
      setLoading(true);

      const chunkSize = 1024 * 1024; // 1MB chunks
      const totalChunks = Math.ceil(file.size / chunkSize);

      let offset = 0;

      // Function to upload the next chunk
      const uploadNextChunk = async () => {
        if (offset >= file.size) {
          setLoading(false); // Done with upload
          toast.success("Upload complete");
          onFileUpload(file.name); // Notify parent component that upload is complete
          return;
        }

        // Get the next chunk of the file
        const chunk = file.slice(offset, offset + chunkSize);

        const formData = new FormData();
        formData.append("file", chunk, file.name); // Append the chunk as a Blob
        formData.append("chunk_number", (Math.floor(offset / chunkSize) + 1).toString()); // Chunk number (1-based)
        formData.append("total_chunks", totalChunks.toString()); // Total number of chunks
        formData.append("filename", file.name); // Send the original filename

        try {
          // Send the chunk to the server using Axios
          const response = await axios.post("/", formData, {
            headers: {
              "Content-Type": "multipart/form-data", // This will ensure that the server understands the request is file data
            },
          });

          console.log(response)
          // After a successful chunk upload, move to the next chunk
          offset += chunkSize;
          uploadNextChunk(); // Recursively upload the next chunk
        } catch (error: any) {
          toast.error(`Error uploading file: ${error.message}`);
          setLoading(false);
        }
      };

      // Start uploading the first chunk
      uploadNextChunk();
    } catch (error) {
      console.error("Unexpected error:", error);
      toast.error("Error uploading file");
      setLoading(false);
    }
  };

  return (
    <div>
      <input type="file" onChange={handleFileChange} />
      <button onClick={handleFileUpload} disabled={loading}>
        {loading ? "Uploading..." : "Upload"}
      </button>
    </div>
  );
};

export default Upload;

