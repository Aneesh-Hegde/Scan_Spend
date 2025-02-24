"use client"
import React, { useEffect, useState } from 'react';
import { UserServiceClient } from '../grpc_schema/UserServiceClientPb';
import { GetUserProfileRequest, UserProfile } from '../grpc_schema/user_pb';
import { useRouter } from 'next/navigation';
import { Metadata } from 'grpc-web';
import api from '../utils/api';

const Dashboard = () => {
  const [message, setMessage] = useState('');
  const [userID, setUserID] = useState<number | null>(0);
  const router = useRouter();
  useEffect(() => {
    const getUserData = async () => {
      // if (typeof window !== undefined) {
      //   const token: string | null = localStorage.getItem("token");
      //   if (!token) {
      //     router.push('/login');
      //     return;
      //   }
      // }

      const client = new UserServiceClient("http://localhost:8080");
      const request = new GetUserProfileRequest();
      const token: string | null = localStorage.getItem("token");
      const response = await api.get('get-refresh-token', { withCredentials: true })
      const refreshToken: string = response.data.refresh_token
      let metadata: Metadata = { 'authentication': `Bearer ${token}`, "refresh_token": refreshToken }
      request.setUserId(token ? token : '');

      client.getUserProfile(request, metadata, (err, response: UserProfile) => {
        if (err) {
          alert(`Invalid session: ${err.message}`);
          router.push('/login');
        } else {
          setUserID(response.getUserId());
        }
      }).on("metadata", (metadata) => {
        const token = metadata['token']
        if (token) {
          localStorage.setItem("token", token)
          metadata = { 'authentication': `Bearer ${token}`, "refresh_token": refreshToken }
          client.getUserProfile(request, metadata, (err, response: UserProfile) => {
            if (err) {
              alert(`Invalid session: ${err.message}`);
              router.push('/login');
            } else {
              setUserID(response.getUserId());
            }
          })
        }
      });
    }
    getUserData()
  }, []);

  return (
    <div>
      <h1>Dashboard</h1>
      {message && <p>{message}</p>}
      {userID && <p>Your User ID: {userID}</p>}
    </div>
  );
};

export default Dashboard;
