"use client"
import React, { useEffect, useState } from 'react';
import { UserServiceClient } from '../grpc_schema/UserServiceClientPb';
import { GetUserProfileRequest, UserProfile } from '../grpc_schema/user_pb';
import { useRouter } from 'next/navigation';

const Dashboard = () => {
  const [message, setMessage] = useState('');
  const [userID, setUserID] = useState<number | null>(0);
  const router = useRouter();
  useEffect(() => {
    if (typeof window !== undefined) {
      const token: string | null = localStorage.getItem("token");
      if (!token) {
        router.push('/login');
        return;
      }
    }

    const client = new UserServiceClient("http://localhost:8080");
    const request = new GetUserProfileRequest();
    const token: string | null = localStorage.getItem("token");
    request.setUserId(token ? token : '');

    client.getUserProfile(request, {}, (err, response: UserProfile) => {
      if (err) {
        alert(`Invalid session: ${err.message}`);
        router.push('/login');
      } else {
        setUserID(response.getUserId());
      }
    });
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
