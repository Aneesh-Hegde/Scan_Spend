"use client";
import React, { useState } from "react";
import { toast } from "react-toastify";
import { FileProcessingServiceClient } from "../grpc_schema/UploadServiceClientPb"; // Generated client
import { UploadRequest, UploadResponse } from "../grpc_schema/upload_pb"; // Generated message classes
import { RpcError } from "grpc-web";

interface UploadProps {
  onFileUpload: (filename: string) => void;
}

const Upload: React.FC<UploadProps> = ({ onFileUpload }) => {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

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
      setUploadProgress(0);

      const chunkSize = 1024 * 1024; // 1MB chunks
      const client = new FileProcessingServiceClient("http://localhost:8080"); // Envoy proxy URL
      const filereader = new FileReader();
      let offset = 0;

      // Function to handle sending chunks and updating progress
      const uploadNextChunk = () => {
        if (offset >= file.size) {
          setLoading(false); // Done with upload
          toast.success("Upload complete");
          return;
        }

        const chunk = file.slice(offset, offset + chunkSize);
        filereader.readAsArrayBuffer(chunk);

        filereader.onload = () => {
          const fileContent = new Uint8Array(filereader.result as ArrayBuffer);
          const request = new UploadRequest();
          request.setFilename(file.name);
          request.setContent(fileContent);

          // Send chunk to server using rpcCall
          client.upload(request, {}, (error: RpcError | null, response: UploadResponse | undefined) => {
            if (error) {
              setLoading(false);
              toast.error(`Error: ${error.message}`);
              return;
            }

            // Handle successful upload response
            setUploadProgress(Math.min((offset / file.size) * 100, 100));



            // Move the offset and upload the next chunk
            offset += chunkSize;
            if (offset >= file.size) {
              console.log(response ? response.getFilename() : "")
              onFileUpload(response ? response.getFilename() : "");
            }
            uploadNextChunk();
          });
        };

        // Handle file reading errors
        filereader.onerror = () => {
          toast.error("Error reading file");
          setLoading(false);
        };
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
        {loading ? `Uploading (${uploadProgress}%)` : "Upload"}
      </button>
      {loading && <progress value={uploadProgress} max={100} />}
    </div>
  );
};

export default Upload;

