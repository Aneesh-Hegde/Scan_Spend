"use client"
import { useState, useEffect } from 'react';
import grpcClient from '../utils/userClient';
import { GetUserProfileRequest } from '../grpc_schema/user_pb'; // Path to generated Protobuf message
import { toast } from 'react-toastify';

const UserProfile = () => {
  const [userProfile, setUserProfile] = useState<any>(null);

  useEffect(() => {
    const fetchUserProfile = () => {
      const request = new GetUserProfileRequest();
      request.setUserId(1); // Assume userId is 1 for this example

      grpcClient.getUserProfile(request, {}, (err: any, response: any) => {
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
