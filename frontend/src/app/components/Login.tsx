"use client"
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AuthServiceClient } from '../grpc_schema/AuthServiceClientPb';
import toast from 'react-hot-toast';
import { LoginRegister } from '../grpc_schema/auth_pb';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const client = new AuthServiceClient("http://localhost:8080")
    const request = new LoginRegister()
    request.setPassword(password)
    request.setEmail(email)
    client.login(request, {}, (err: any, response) => {
      if (err) {
        toast.error(err)
      } else {
        toast.success(response)
        localStorage.setItem("token", response.getToken())
        router.push('/')
      }
    })
  };

  return (
    <div>
      <h1>Login</h1>
      <form onSubmit={handleLogin}>
        <div>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div>
          <label>Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <button type="submit">Login</button>
      </form>
    </div>
  );
}

