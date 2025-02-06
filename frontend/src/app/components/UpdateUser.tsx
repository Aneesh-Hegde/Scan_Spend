"use client";
import React, { useState, FormEvent, useEffect } from "react";
import { GetUserProfileRequest, UpdateUserRequest } from "../grpc_schema/user_pb"; // Ensure the correct path
import grpcClient from "../utils/userClient";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const UpdateUserProfile: React.FC = () => {
  const [username, setUsername] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  //get user data
  useEffect(() => {
    const token: string | null = localStorage.getItem("token")
    const getUserDataRequest = new GetUserProfileRequest()
    getUserDataRequest.setUserId(token ? token : '')
    grpcClient.getUserProfile(getUserDataRequest, {}, (err: Error | null, response: any) => {
      if (err) {
        console.log(err)
        toast.error("Some error occured")
      } else {
        setUsername(response.getUsername())
        setEmail(response.getEmail())
      }
    })
  }, [])
  const handleUpdate = async (e: FormEvent) => {
    e.preventDefault();
    const request = new UpdateUserRequest();
    const userId: string | null = localStorage.getItem("token");

    if (!userId) {
      toast.error("User is not authenticated!");
      return;
    }

    request.setUserId(userId);
    request.setUsername(username);
    request.setEmail(email);
    request.setPassword(password);

    grpcClient.updateUser(request, {}, (err: Error | null, response: any) => {
      if (err) {
        console.error("Error:", err);
        toast.error("Failed to update profile");
      } else {
        toast.success("Profile updated successfully!");
        console.log(response)
      }
    });
  };

  return (
    <div className="max-w-md mx-auto mt-10 p-6 bg-white shadow-md rounded-md">
      <h2 className="text-2xl font-semibold text-center mb-4">Update Profile</h2>
      <form onSubmit={handleUpdate} className="space-y-4">
        <div>
          <label htmlFor="username" className="block text-sm font-medium">
            Username
          </label>
          <input
            type="text"
            id="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full p-2 border rounded"
            required
          />
        </div>

        <div>
          <label htmlFor="email" className="block text-sm font-medium">
            Email
          </label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full p-2 border rounded"
            required
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium">
            Password
          </label>
          <input
            type="password"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full p-2 border rounded"
          />
        </div>

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

