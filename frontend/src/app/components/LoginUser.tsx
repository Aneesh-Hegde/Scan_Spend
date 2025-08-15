"use client"
import React, { useState, FormEvent } from 'react';
import { LoginUserRequest, LoginResponse } from '../grpc_schema/user_pb';
import grpcClient from '../utils/userClient';
import { loginWithEmail, loginWithGoogle } from '../utils/authService';
import { toast } from "react-toastify";
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';
import api from '../utils/api';
import { Metadata } from 'grpc-web';

const LoginUser = () => {
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const router = useRouter();

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      //firebase email login
      const loginResponse = await loginWithEmail(email, password);
      if (loginResponse.success) {
        getUserToken(email);
      }
    } catch (error: any) {
      toast.error("Error:", error.message || error);
    } finally {
      setLoading(false);
    }
  };

  //get access and refresh token and checks the credentials from db for login
  const getUserToken = async (email: string | null) => {
    if (!email) return;
  console.log(email)
    const request = new LoginUserRequest();
    request.setEmail(email);

    try {
      const response = await new Promise<LoginResponse>(async (resolve, reject) => {
        let refresh_token: string | null = "";
        let token: string | null = "";
        //get the access token after login
        grpcClient.loginUser(request, {}, (err, response) => {
          if (err) reject(err);
          else {
            console.log("first")
            token = response.getToken();
            localStorage.setItem("token", token)
            Cookies.set("token", token)
            router.push("/");
            resolve(response);
          }
        }).on("metadata", async (metadata) => {
        // Listen for metadata i.e extract refresh_token
          console.log("second")
          refresh_token = metadata["refresh_token"] || null;
          if (refresh_token) {
            try {
              const res = await api.post("/refresh", {}, {
                headers: { Authorization: `Bearer ${refresh_token}` },
                withCredentials: true
              });
            } catch (error) {
              console.error("Failed to refresh token:", error);
            }
          }
        });
        // console.log(response)
      });

    } catch (error) {
      toast.error("Failed to retrieve user token.");
    }
  };

  const googleLogIn = async () => {
    try {
      const response = await loginWithGoogle();
      if (response.response) {
        console.log(response.response)
        const email: string | null = response.response.user.email
        getUserToken(email);
      }
    } catch (error) {
      toast.error("Google login failed.");
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

        <div className="flex items-center my-4">
          <hr className="flex-grow border-gray-300" />
          <span className="px-2 text-gray-500">or</span>
          <hr className="flex-grow border-gray-300" />
        </div>

        {/* Google Sign-In Button */}
        <button
          onClick={googleLogIn}
          className="w-full bg-red-500 text-white py-2 rounded-md hover:bg-red-600 transition flex items-center justify-center"
        >
          <svg className="w-5 h-5 mr-2" viewBox="0 0 48 48">
            <path fill="#EA4335" d="M24 9.5c3.9 0 7.3 1.4 9.9 3.7l7.3-7.3C36.6 2.2 30.7 0 24 0 14.7 0 6.6 5.4 2.3 13.3l8.4 6.5c2.1-5.9 7.6-10.3 13.3-10.3z"></path>
            <path fill="#34A853" d="M46.5 24c0-1.4-.1-2.8-.4-4H24v8.1h12.8c-.6 3-2.4 5.5-4.9 7.1l7.4 5.8c4.3-4 6.7-9.8 6.7-16z"></path>
            <path fill="#FBBC05" d="M9.8 28.7c-1.4-2-2.1-4.4-2.1-6.7s.7-4.7 2.1-6.7L2.3 13.3C.8 16.3 0 19.6 0 24s.8 7.7 2.3 10.7l7.5-6z"></path>
            <path fill="#4285F4" d="M24 48c6.5 0 12-2.1 16.1-5.7l-7.4-5.8c-2.1 1.4-4.8 2.3-8.2 2.3-5.7 0-11.1-4.3-13.3-10.3l-8.4 6.5c4.3 7.8 12.3 13.3 21.2 13.3z"></path>
          </svg>
          Sign in with Google
        </button>

        <p className="text-sm text-gray-500 text-center mt-4">
          Don&rsquo;t have an account?{" "}
          <a href="/signup" className="text-blue-500 hover:underline">
            Sign up
          </a>
        </p>
      </div>
    </div>
  );
};

export default LoginUser;

