"use client";
import React, { useState, useEffect, useRef, FormEvent } from "react";
import { GetUserProfileRequest, UpdateUserRequest } from "../grpc_schema/user_pb";
import grpcClient from "../utils/userClient";
import { toast } from "react-toastify";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import "react-toastify/dist/ReactToastify.css";
import { ResetPassword } from "../utils/resetPassword";
import { UpdateAndVerifyEmail } from "../utils/updateEmail";
import { Metadata } from 'grpc-web';
import api from "../utils/api";

const UpdateUserProfile: React.FC = () => {
  const [username, setUsername] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [isEditingPassword, setIsEditingPassword] = useState<boolean>(false);
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [showEmailPasswordField, setShowEmailPasswordField] = useState<boolean>(false); // Show password field for email change
  const currEmailRef = useRef<string>("");

  useEffect(() => {
    updateUserRequest()
  }, []);

  const updateUserRequest = async () => {

    const token = localStorage.getItem("token");
    if (!token) {
      toast.error("User is not authenticated!");
      return;
    }

    const getUserDataRequest = new GetUserProfileRequest();
    const response = await api.get("/get-refresh-token", { withCredentials: true, })
    const refresh_token: string = response.data.refresh_token

    const requestmetadata: Metadata = { 'authentication': `Bearer ${token}`, "refresh_token": refresh_token }

    grpcClient.getUserProfile(getUserDataRequest, requestmetadata, (err, response) => {
      if (err) {
        console.error(err);
        toast.error("Failed to fetch user profile.");
      } else {
        setUsername(response.getUsername());
        setEmail(response.getEmail());
        currEmailRef.current = response.getEmail();
      }
    });
  }

  const handleUpdate = async (e: FormEvent) => {
    e.preventDefault();
    const userId = localStorage.getItem("token");

    if (!userId) {
      toast.error("User is not authenticated!");
      return;
    }

    try {
      // Handle email update
      if (email !== currEmailRef.current) {
        if (!password) {
          toast.error("Please enter your password to update your email.");
          setShowEmailPasswordField(true); // Show password field when trying to change email
          return;
        }
        const emailUpdateResponse = await UpdateAndVerifyEmail(email, password);
        if (!emailUpdateResponse.success) {
          toast.error("Failed to update email.");
          return;
        }
      }

      // Handle profile update
      updateUser(userId, email, username)
    } catch (error) {
      console.error("Profile update error:", error);
      toast.error("An unexpected error occurred.");
    }
  };
  const updateUser = async (userId: string, email: string, username: string) => {
    const request = new UpdateUserRequest()
    const token = localStorage.getItem("token")
    request.setUserId(userId);
    request.setUsername(username);
    request.setEmail(email);
    const response = await api.get("/get-refresh-token", { withCredentials: true, })
    const refresh_token: string = response.data.refresh_token

    const requestmetadata: Metadata = { 'authentication': `Bearer ${token}`, "refresh_token": refresh_token }

    grpcClient.updateUser(request, requestmetadata, async (err, response) => {
      if (err) {
        console.error("Error updating profile:", err);
        toast.error("Failed to update profile.");
        return;
      }

      toast.success("Profile updated successfully!");
      setIsEditingPassword(false);
      setPassword("");

      if (isEditingPassword) {
        await handlePasswordReset();
      }
    }).on("metadata", async (metadata) => {
      const token: string | null = metadata["token"]
      console.log(token)
      if (token) {
        localStorage.setItem("token", token)
      }
    });
  }

  const handlePasswordReset = async () => {
    try {
      const resetResponse = await ResetPassword(email);
      if (resetResponse.message) {
        toast.success("Password reset email sent! Check your inbox.");
      } else {
        toast.error("Failed to send password reset email.");
      }
    } catch (error) {
      console.error("Password reset error:", error);
      toast.error("An unexpected error occurred.");
    }
  };

  return (
    <div className="max-w-md mx-auto mt-10 p-6 bg-white shadow-md rounded-md text-black">
      <h2 className="text-2xl font-semibold text-center mb-4">Update Profile</h2>
      <form onSubmit={handleUpdate} className="space-y-4">

        {/* Username Field */}
        <div>
          <label htmlFor="username" className="block text-sm font-medium">Username</label>
          <input
            type="text"
            id="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full p-2 border rounded"
            required
          />
        </div>

        {/* Email Field */}
        <div>
          <label htmlFor="email" className="block text-sm font-medium">Email</label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (e.target.value !== currEmailRef.current) {
                setShowEmailPasswordField(true); // Show password field only if email is changed
              } else {
                setShowEmailPasswordField(false);
              }
            }}
            className="w-full p-2 border rounded"
            required
          />
        </div>

        {/* Password Field for Email Change */}
        {showEmailPasswordField && (
          <div>
            <label htmlFor="email-password" className="block text-sm font-medium">Enter Password to Change Email</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                id="email-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full p-2 border rounded pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-2 flex items-center text-gray-600"
              >
                {showPassword ? <FaEye /> : <FaEyeSlash />}
              </button>
            </div>
          </div>
        )}

        {/* Change Password Button */}
        {!isEditingPassword && (
          <button
            type="button"
            onClick={handlePasswordReset}
            className="text-blue-500 hover:underline"
          >
            Change Password
          </button>
        )}

        {/* Password Input Field (if editing password) */}
        {isEditingPassword && (
          <div>
            <label htmlFor="password" className="block text-sm font-medium">New Password</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full p-2 border rounded pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-2 flex items-center text-gray-600"
              >
                {showPassword ? <FaEye /> : <FaEyeSlash />}
              </button>
            </div>
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          className="w-full bg-blue-500 text-white py-2 rounded hover:bg-blue-600"
        >
          Update Profile
        </button>
      </form>
    </div>
  );
};

export default UpdateUserProfile;

