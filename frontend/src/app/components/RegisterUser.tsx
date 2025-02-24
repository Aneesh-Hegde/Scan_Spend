"use client";

import React, { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import {
  RegisterUserRequest,
  UserResponse,
  TokenRequest,
  TokenResponse,
} from "../grpc_schema/user_pb";
import grpcClient from "../utils/userClient";
import { loginWithGoogle, signUpWithEmail } from "../utils/authService";
import Cookies from "js-cookie";
import EmailVerification from "../utils/verify-email";
import { metadata } from "../layout";
import api from "../utils/api";

const RegisterUser = () => {
  const [username, setUsername] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const router = useRouter();

  const handleRegister = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const userToken = await registerUser(username, email);
      if (!userToken) return;

      const emailVerificationToken = await generateEmailVerificationToken(username, email);
      if (!emailVerificationToken) return;

      // Register the user with Firebase
      const userCredential = await signUpWithEmail(email, password, emailVerificationToken);
      if (userCredential.success) {
        toast.success("Registration successful! Please verify your email.");
        router.push("/verify-email");
      }
    } catch (error) {
      console.error("Registration Error:", error);
      toast.error("Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const registerUser = async (username: string, email: string): Promise<string | null> => {
    const request = new RegisterUserRequest();
    request.setUsername(username);
    request.setEmail(email);

    return new Promise((resolve, reject) => {
      grpcClient.registerUser(request, {}, (err: any, response: UserResponse) => {
        if (err) {
          console.error("gRPC Register Error:", err);
          toast.error("Failed to register.");
          reject(null);
          return;
        }

        const message = response.getMessage();
        const tokenMatch = message.match(/token:\s*(\S+)/);
        const token = tokenMatch ? tokenMatch[1] : null;

        if (!token) {
          toast.error("Invalid token received.");
          reject(null);
          return;
        }

        // localStorage.setItem("token", token);
        // Cookies.set("token", token);
        resolve(token);
      }).on("metadata", async (metadata) => {
        const refresh_token = metadata["refresh_token"]
        await api.post("/refresh", {}, {
          headers: { Authorization: `Bearer ${refresh_token}` },
          withCredentials: true
        });
      });
    });
  };

  const googleLogIn = async () => {
    try {
      const response = await loginWithGoogle();
      if (response.response) {
        const username: string | null = response.response.user.displayName;
        const email: string | null = response.response.user.email;
        if (username && email) {
          await registerUser(username, email);
          const emailVerificationToken = await generateEmailVerificationToken(username, email);
          if (!emailVerificationToken) return;
          EmailVerification(emailVerificationToken)
          router.push('/')

        }
      }
    } catch (error) {
      console.log(error)
      toast.error("Google sign-up failed.");
    }
  };

  const generateEmailVerificationToken = async (username: string, email: string): Promise<string | null> => {
    const userTokenRequest = new TokenRequest();
    userTokenRequest.setUsername(username);
    userTokenRequest.setEmail(email);

    return new Promise((resolve, reject) => {
      grpcClient.generateVerifyToken(userTokenRequest, {}, (err: any, verifyResponse: TokenResponse) => {
        if (err) {
          console.error("gRPC Token Generation Error:", err);
          toast.error("Failed to send verification email.");
          reject(null);
          return;
        }

        const verificationToken = verifyResponse.getToken();
        if (!verificationToken) {
          toast.error("Invalid verification token received.");
          reject(null);
          return;
        }

        resolve(verificationToken);
      });
    });
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-100">
      <div className="bg-white shadow-md rounded-lg p-8 w-96">
        <h2 className="text-2xl font-semibold text-center mb-6 text-black">Register</h2>

        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-gray-600">
              Username
            </label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              disabled={loading}
              className="w-full px-4 py-2 border rounded-md focus:ring focus:ring-blue-300 text-black"
            />
          </div>

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
              disabled={loading}
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
              disabled={loading}
              className="w-full px-4 py-2 border rounded-md focus:ring focus:ring-blue-300 text-black"
            />
          </div>

          <button
            type="submit"
            className="w-full bg-blue-500 text-white py-2 rounded-md hover:bg-blue-600 transition"
            disabled={loading}
          >
            {loading ? "Registering..." : "Register"}
          </button>
        </form>

        <div className="flex items-center my-4">
          <hr className="flex-grow border-gray-300" />
          <span className="px-2 text-gray-500">or</span>
          <hr className="flex-grow border-gray-300" />
        </div>

        {/* Google Sign-Up Button */}
        <button
          onClick={googleLogIn}
          className="w-full bg-red-500 text-white py-2 rounded-md hover:bg-red-600 transition flex items-center justify-center"
        >
          <svg className="w-5 h-5 mr-2" viewBox="0 0 48 48">
            <path fill="#EA4335" d="M24 9.5c3.9 0 7.3 1.4 9.9 3.7l7.3-7.3C36.6 2.2 30.7 0 24 0 14.7 0 6.6 5.4 2.3 13.3l8.4 6.5c2.1-5.9 7.6-10.3 13.3-10.3z"></path>
            <path fill="#34A853" d="M46.5 24c0-1.4-.1-2.8-.4-4H24v8.1h12.8c-.6 3-2.4 5.5-4.9 7.1l7.4 5.8c4.3-4 6.7-9.8 6.7-16z"></path>
          </svg>
          Sign up with Google
        </button>

        <p className="text-sm text-gray-500 text-center mt-4">
          Already have an account?{" "}
          <a href="/login" className="text-blue-500 hover:underline">
            Login
          </a>
        </p>
      </div>
    </div>
  );
};

export default RegisterUser;

