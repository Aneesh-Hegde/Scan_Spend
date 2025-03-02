import toaster from "react-hot-toast"
import { FileProcessingServiceClient } from "../grpc_schema/UploadServiceClientPb"
import { GetProducts, DBMessage, Product, GetTextRequest, GetTextResponse } from "../grpc_schema/upload_pb"
import { Product as type_product } from "../types/types"
import api from "./api"
import { Metadata } from "grpc-web"
import * as grpcWeb from 'grpc-web'
import HandleFileClick from "./handleFileClick"

const HandleProductSave = async (products: type_product[], filename: string,
  setProducts: (data: type_product[]) => void
) => {
  const client = new FileProcessingServiceClient("http://localhost:8080")

  const grpc_products = products.map((product) => {
    const newProduct = new Product()
    newProduct.setId(product.ID)
    newProduct.setProductName(product.product_name)
    newProduct.setQuantity(product.quantity)
    newProduct.setAmount(product.amount)
    newProduct.setName(product.Name)
    newProduct.setCategory(product.category)
    newProduct.setDate(product.Date)
    return newProduct

  })
  const request = new GetProducts()
  request.setProductsList(grpc_products)
  request.setFilename(filename)
  const token = localStorage.getItem("token")
  const response = await api.get("get-refresh-token", { withCredentials: true })
  const refreshToken = response.data.refresh_token
  const metadata: Metadata = { 'authentication': `Bearer ${token}`, "refresh_token": refreshToken }
  client.saveToDB(request, metadata, async (err, res: DBMessage) => {
    if (err) {
      toaster.error("Error in saving product")
      return
    }
    const response = res.getMessage()
    if (response == 'Uploaded first time successfully') {

      const request = new GetTextRequest();
      request.setFilename(filename);
      const token: string | null = localStorage.getItem("token")
      const response = await api.get('get-refresh-token', { withCredentials: true })
      const refresh_token: string = response.data.refresh_token
      const metadata: Metadata = { 'authentication': `Bearer ${token}`, 'refresh_token': refresh_token }
      // Call gRPC method using the callback
      client.getText(request, metadata, (err: grpcWeb.RpcError, response: GetTextResponse) => {
        if (err) {
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
          console.log('Products extracted successfully');
        } else {
          console.log('Failed to extract products');
        }
      }).on("metadata", (metadata) => {
        const accessToken = metadata['accessToken']
        if (accessToken != null) {
          localStorage.setItem("token", accessToken)
        }
      });
    }
    console.log(response)
    toaster.success("Filed saved successfully")
    return

  }).on("metadata", (metadata) => {
    const token: string | null = metadata["token"]
    if (token) {
      localStorage.setItem("token", token)
    }
  })
}
export default HandleProductSave
