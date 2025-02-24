"use client"
import { useState, useEffect } from 'react';
import grpcClient from '../utils/userClient';
import { GetUserProfileRequest } from '../grpc_schema/user_pb'; // Path to generated Protobuf message
import { toast } from 'react-toastify';
import { Metadata } from 'grpc-web';
import api from '../utils/api';

const UserProfile = () => {
  const [userProfile, setUserProfile] = useState<any>(null);

  useEffect(() => {
    const fetchUserProfile = async () => {
      const request = new GetUserProfileRequest();
      const token: string | null = localStorage.getItem("token")
      request.setUserId(token ? token : '') // Assume userId is 1 for this example
      const response = await api.get('get-refresh-token', { withCredentials: true })
      const refreshToken: string = response.data.refresh_token
      const metadata: Metadata = { 'authentication': `Bearer ${token}`, "refresh_token": refreshToken }

      grpcClient.getUserProfile(request, metadata, (err: any, response: any) => {
        if (err) {
          console.error('Error:', err);
          toast.error('Failed to load user profile');
        } else {
          setUserProfile(response.toObject());
          toast.success('User profile loaded successfully!');
        }
      });
    };

    fetchUserProfile();
  }, []);

  if (!userProfile) return <div>Loading...</div>;

  return (
    <div>
      <h2>User Profile</h2>
      <p>Username: {userProfile.username}</p>
      <p>Email: {userProfile.email}</p>
    </div>
  );
};

export default UserProfile;
