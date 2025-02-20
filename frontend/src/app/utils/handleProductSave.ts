import toaster from "react-hot-toast"
import { FileProcessingServiceClient } from "../grpc_schema/UploadServiceClientPb"
import { GetProducts, DBMessage, Product } from "../grpc_schema/upload_pb"
import { Product as type_product } from "../types/types"
import api from "./api"
import { Metadata } from "grpc-web"
const HandleProductSave = async (products: type_product[], filename: string) => {
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
  const userid: string | null = localStorage.getItem("token")
  request.setProductsList(grpc_products)
  request.setFilename(filename)
  request.setUserid(userid ? userid : '')
  const token=localStorage.getItem("token")
  const response=await api.get("get-refresh-token",{withCredentials:true})
  const refreshToken=response.data.refresh_token
      const metadata:Metadata= { 'authentication': `Bearer ${token}`, "refresh_token": refreshToken }
  client.saveToDB(request,metadata ,(err, res: DBMessage) => {
    if (err) {
      toaster.error("Error in saving product")
      return
    }
    const response = res.getMessage()
    console.log(response)
    toaster.success("Filed saved successfully")
    return

  })
}
export default HandleProductSave
