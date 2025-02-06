"use client"
import { useEffect, useState } from 'react';
import { UserServiceClient } from '../grpc_schema/UserServiceClientPb';
import { GetUserProfileRequest } from '../grpc_schema/user_pb';
import { useRouter } from 'next/navigation';

const Dashboard = () => {
  const [message, setMessage] = useState('');
  const [userID, setUserID] = useState<string | null>('');
  const router = useRouter();

  useEffect(() => {
    // const token = localStorage.getItem('token');
    const token: string | null = localStorage.getItem("token");
    if (!token) {
      router.push('/login');
      return;
    }

    const client = new UserServiceClient("http://localhost:8080");
    const request = new GetUserProfileRequest();
    request.setUserId(token);

    client.getUserProfile(request, {}, (err, response) => {
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
