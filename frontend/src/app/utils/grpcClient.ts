import { FileProcessingServiceClient } from "../grpc_schema/UploadServiceClientPb"; // Import the generated client
import { UploadRequest } from "../grpc_schema/upload_pb"; // Import the protobuf definition for the request

const client = new FileProcessingServiceClient("http://localhost:8080", null, null); // Adjust the URL to your backend's gRPC Web proxy

export const uploadFile = (request: UploadRequest) => {
  return new Promise<string>((resolve, reject) => {
    client.upload(request, {}, (err: any, response: any) => {
      if (err) {
        reject(err);
      } else {
        resolve(response?.getFilename() || ""); // Assuming your response contains the filename
      }
    });
  });
};
