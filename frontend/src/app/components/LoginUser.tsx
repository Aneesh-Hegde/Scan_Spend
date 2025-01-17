"use client"
import { useState, FormEvent } from 'react';
import { LoginUserRequest, LoginResponse } from '../grpc_schema/user_pb'; // Path to generated Protobuf message
import grpcClient from '../utils/userClient';
import { toast } from "react-toastify";
import { useRouter } from 'next/navigation';

const LoginUser = () => {
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const router = useRouter()
  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();

    const request = new LoginUserRequest();
    request.setEmail(email);
    request.setPassword(password);

    grpcClient.loginUser(request, {}, (err: any, response: LoginResponse) => {
      console.log(response.getToken())
      if (err) {
        console.error('Error:', err);
        toast.error('Failed to login');
      } else {
        toast.success('Login successful!');
        router.push('/')

      }
    });
  };

  return (
    <div>
      <h2>Login</h2>
      <form onSubmit={handleLogin}>
        <div>
          <label htmlFor="email">Email</label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <div>
          <label htmlFor="password">Password</label>
          <input
            type="password"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        <button type="submit">Login</button>
      </form>
    </div>
  );
};

export default LoginUser;

