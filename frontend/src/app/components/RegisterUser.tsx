"use client";

import React, { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import {
  RegisterUserRequest,
  UserResponse,
  TokenRequest,
  TokenResponse,
} from "../grpc_schema/user_pb"; // Path to generated Protobuf messages
import grpcClient from "../utils/userClient";
import { signUpWithEmail } from "../utils/authService";

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
      // Register user using the gRPC service
      const userToken = await registerUser(username, email, password);
      if (!userToken) return; // If registration fails, exit

      // Generate a verification token (optional, depending on your flow)
      const verificationToken = await generateVerificationToken(username, email);
      console.log(verificationToken)
      if (!verificationToken) return; // If verification token fails, exit

      // Register the user with Firebase
      const userCredential = await signUpWithEmail(email, password);
      console.log(userCredential)
      if (userCredential.success) {
        // Once registration and email verification are successful, redirect to verify email page
        router.push("/verify-email");
      }
    } catch (error) {
      console.error("Registration Error:", error);
      toast.error("Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // ✅ Register user via gRPC and get a token
  const registerUser = async (username: string, email: string, password: string): Promise<string | null> => {
    const request = new RegisterUserRequest();
    request.setUsername(username);
    request.setEmail(email);
    request.setPassword(password);

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

        localStorage.setItem("token", token);
        toast.success("Registration successful! Please verify your email.");
        resolve(token);
      });
    });
  };

  // ✅ Generate a verification token (optional)
  const generateVerificationToken = async (username: string, email: string): Promise<string | null> => {
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
            disabled={loading}
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
            disabled={loading}
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
            disabled={loading}
          />
        </div>

        <button type="submit" disabled={loading}>
          {loading ? "Registering..." : "Register"}
        </button>
      </form>
    </div>
  );
};

export default RegisterUser;

