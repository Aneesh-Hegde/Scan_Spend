"use client"
import { useEffect, useState } from 'react';
import { AuthServiceClient } from '../grpc_schema/AuthServiceClientPb';
import { ValidateTokenRequest } from '../grpc_schema/auth_pb';
import { useRouter } from 'next/router';

const Dashboard = () => {
  const [message, setMessage] = useState('');
  const [userID, setUserID] = useState<number | null>(null);
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }

    const client = new AuthServiceClient("http://localhost:8080");
    const request = new ValidateTokenRequest();
    request.setToken(token);

    client.validateToken(request, {}, (err, response) => {
      if (err) {
        alert(`Invalid session: ${err.message}`);
        router.push('/login');
      } else {
        setMessage(response.getMessage());
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
