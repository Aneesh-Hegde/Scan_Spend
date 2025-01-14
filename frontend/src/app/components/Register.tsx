
"use client";
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AuthServiceClient } from '../grpc_schema/AuthServiceClientPb';
import toast from 'react-hot-toast';
import { RegisterRequest } from '../grpc_schema/auth_pb';
const client = new AuthServiceClient("http://localhost:8080", null, null);

export default function Register() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const router = useRouter();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    const request = new RegisterRequest();
    request.setName(username);
    request.setPassword(password);
    request.setEmail(email);
    console.log(request)
    // gRPC call to register the user
    client.register(request, {}, (err: any | null, response: any) => {
      console.log(response)
      if (err) {
        // Error handling with a more detailed message
        toast.error(err.message || "An error occurred during registration");
      } else {
        // Success handling
        toast.success("Registration successful");
        console.log(response);
        router.push('/login');
      }
    });
  };

  return (
    <div>
      <h1>Register</h1>
      <form onSubmit={handleRegister}>
        <div>
          <label>Username</label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
        </div>
        <div>
          <label>Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
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
        <button type="submit">Register</button>
      </form>
    </div>
  );
}

