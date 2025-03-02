import { ProductServiceClient } from "../grpc_schema/ProductServiceClientPb";

const productclient= new ProductServiceClient("http://localhost:8080",null,{withCredential:true})
export default productclient;
