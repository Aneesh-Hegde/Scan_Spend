"use client"
import React, { useState, FormEvent } from 'react';
import { LoginUserRequest, LoginResponse } from '../grpc_schema/user_pb'; // Path to generated Protobuf message
import grpcClient from '../utils/userClient';
import { loginWithEmail } from '../utils/authService';
import { toast } from "react-toastify";
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie'
import { set } from 'mongoose';

const LoginUser = () => {
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false)
  const router = useRouter()
  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true)
    const loginResponse = await loginWithEmail(email, password)
    try {
      if (loginResponse.success) {

        const request = new LoginUserRequest();
        request.setEmail(email);
        // request.setPassword(password);

        grpcClient.loginUser(request, {}, (err: any, response: LoginResponse) => {
          console.log(response.getToken())
          if (err) {
            console.error('Error:', err);
            toast.error('Failed to login');
          } else {
            localStorage.setItem("token", response.getToken())
            Cookies.set("token", response.getToken())
            toast.success('Login successful!');
            router.push('/')

          }
        });
      } else {
        toast.error("User not registered.Please register")
      }
    }
    catch (error: any) {
      toast.error("Error:", error)
    } finally {
      setLoading(false)
    }

  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-100">
      <div className="bg-white shadow-md rounded-lg p-8 w-96">
        <h2 className="text-2xl font-semibold text-center mb-6 text-black">Login</h2>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-600">
              Email
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-2 border rounded-md focus:ring focus:ring-blue-300 text-black"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-600">
              Password
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-2 border rounded-md focus:ring focus:ring-blue-300 text-black"
            />
          </div>

          <button
            type="submit"
            className="w-full bg-blue-500 text-white py-2 rounded-md hover:bg-blue-600 transition"
            disabled={loading}
          >
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>

        <p className="text-sm text-gray-500 text-center mt-4">
          Don't have an account?{" "}
          <a href="/signup" className="text-blue-500 hover:underline">
            Sign up
          </a>
        </p>
      </div>
    </div>
  );
};

export default LoginUser;

