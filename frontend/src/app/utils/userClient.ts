import { UserServiceClient } from '../grpc_schema/UserServiceClientPb'; // Path to generated client code

const client = new UserServiceClient('http://localhost:8080', null, null); // gRPC-Web server URL

export default client;
