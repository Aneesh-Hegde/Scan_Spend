import { FileProcessingServiceClient } from "../grpc_schema/UploadServiceClientPb"; // Generated gRPC client
import { UploadRequest, UploadResponse } from "../grpc_schema/upload_pb"; // Generated message classes
import { grpcWeb } from "grpc-web"; // Import grpc-web types for type safety

// gRPC Client setup for file upload
export const uploadFile = (
  file: File,
  onUploadSuccess: (filename: string) => void,
  onUploadError: (errorMessage: string) => void
) => {
  const client = new FileProcessingServiceClient("http://localhost:8080"); // gRPC-web proxy URL

  const filereader = new FileReader();

  filereader.onload = () => {
    const fileContent = new Uint8Array(filereader.result as ArrayBuffer);
    const request = new UploadRequest();
    request.setFilename(file.name);
    request.setContent(fileContent);

    // Call the gRPC service
    client.upload(request, {}, (err: grpcWeb.RpcError, response: UploadResponse) => {
      if (err) {
        onUploadError(`Error uploading file: ${err.message}`);
        return;
      }

      if (response.getStatus() === "success") {
        onUploadSuccess(response.getFilename());
      } else {
        onUploadError(`Upload failed: ${response.getMessage()}`);
      }
    });
  };

  filereader.readAsArrayBuffer(file);
};
