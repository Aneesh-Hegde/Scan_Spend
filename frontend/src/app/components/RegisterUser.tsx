"use client"
import React, { useState, FormEvent } from 'react';
import { RegisterUserRequest, UserResponse } from '../grpc_schema/user_pb'; // Path to generated Protobuf message
import grpcClient from '../utils/userClient';
import { toast } from 'react-toastify';
import { useRouter } from 'next/navigation';

const RegisterUser = () => {
  const [username, setUsername] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const router = useRouter()

  const handleRegister = async (e: FormEvent) => {
    e.preventDefault();

    const request = new RegisterUserRequest();
    request.setUsername(username);
    request.setEmail(email);
    request.setPassword(password);

    grpcClient.registerUser(request, {}, (err: any, response: UserResponse) => {
      console.log(response.getMessage())
      const getToken = response.getMessage().split('token:')
      console.log(getToken)
      localStorage.setItem("token", getToken[1])
      if (err) {
        console.error('Error:', err);
        toast.error('Failed to register');
      } else {
        toast.success('Registration successful!');
        router.push('/')
      }
    });
  };

  return (
    <div>
      <h2>Register</h2>
      <form onSubmit={handleRegister}>
        <div>
          <label htmlFor="username">Username</label>
          <input
            type="text"
            id="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
        </div>

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

        <button type="submit">Register</button>
      </form>
    </div>
  );
};

export default RegisterUser;

