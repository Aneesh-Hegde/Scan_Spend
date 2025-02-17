import { FileServiceClient } from "../grpc_schema/FileServiceClientPb";

const fileclient = new FileServiceClient("http://localhost:8080",null,{withCredential:true})
export default fileclient;
