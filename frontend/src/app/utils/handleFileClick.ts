import { GetTextRequest, GetTextResponse } from '../grpc_schema/upload_pb';
import { FileProcessingServiceClient } from '../grpc_schema/UploadServiceClientPb';
import { Product } from '../types/types';
import { toast } from 'react-toastify';
import * as grpcWeb from 'grpc-web'
interface FileClick {
  filename: string;
  filestate: (data: string) => void;
  productstate: (data: Product[]) => void;
}

const HandleFileClick = ({
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

  // Call gRPC method using the callback
  client.getText(request, {}, (err: grpcWeb.RpcError, response: GetTextResponse) => {
    if (err) {
      toast.error('Error fetching product data');
      console.error(err);
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
  });
};

export default HandleFileClick;
