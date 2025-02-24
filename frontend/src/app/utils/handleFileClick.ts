import { GetTextRequest, GetTextResponse } from '../grpc_schema/upload_pb';
import { FileProcessingServiceClient } from '../grpc_schema/UploadServiceClientPb';
import { Product } from '../types/types';
import { toast } from 'react-toastify';
import * as grpcWeb from 'grpc-web'
import api from './api';
import { Metadata } from 'grpc-web';
interface FileClick {
  filename: string;
  filestate: (data: string) => void;
  productstate: (data: Product[]) => void;
}

const HandleFileClick = async ({
  filename,
  filestate: setFilename,
  productstate: setProducts,
}: FileClick) => {
  setFilename(filename);

  // Set up gRPC Client
  const client = new FileProcessingServiceClient('http://localhost:8080'); // Your server's gRPC endpoint

  // Prepare gRPC request
  const request = new GetTextRequest();
  request.setFilename(filename);
  const token: string | null = localStorage.getItem("token")
  request.setToken(token ? token : "")
  const response = await api.get('get-refresh-token', { withCredentials: true })
  const refresh_token: string = response.data.refresh_token
  const metadata: Metadata = { 'authentication': `Bearer ${token}`, 'refresh_token': refresh_token }
  // Call gRPC method using the callback
  client.getText(request, metadata, (err: grpcWeb.RpcError, response: GetTextResponse) => {
    if (err) {
      toast.error('Error fetching product data');
      console.error(err);

      if (err.code === 16) {
        window.location.href = '/login'
      }
      return;
    }

    // Handle the gRPC response
    const products = response.getProductsList();
    console.log(response)
    if (products && products.length > 0) {
      // Map gRPC response products to your Product type
      setProducts(
        products.map((product) => ({
          ID: product.getId(),
          product_name: product.getProductName(),
          quantity: product.getQuantity(),
          amount: product.getAmount(),
          Name: product.getName(),
          category: product.getCategory(),
          Date: product.getDate()
        }))
      );
      toast.success('Products extracted successfully');
    } else {
      toast.error('Failed to extract products');
    }
  }).on("metadata", (metadata) => {
    const accessToken = metadata['accessToken']
    if (accessToken != null) {
      localStorage.setItem("token", accessToken)
    }
  });
};

export default HandleFileClick;
