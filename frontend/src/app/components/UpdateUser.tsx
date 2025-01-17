"use client"
import { useState, FormEvent } from 'react';
import { UpdateUserRequest } from '../grpc_schema/user_pb'; // Path to generated Protobuf message
import grpcClient from '../utils/userClient';
import { toast } from 'react-toastify';

const UpdateUserProfile = () => {
  const [username, setUsername] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');

  const handleUpdate = async (e: FormEvent) => {
    e.preventDefault();

    const request = new UpdateUserRequest();
    request.setUserId(1); // Assume userId is 1 for this example
    request.setUsername(username);
    request.setEmail(email);
    request.setPassword(password);

    grpcClient.updateUser(request, {}, (err: any, response: any) => {
      if (err) {
        console.error('Error:', err);
        toast.error('Failed to update profile');
      } else {
        toast.success('Profile updated successfully!');
      }
    });
  };

  return (
    <div>
      <h2>Update Profile</h2>
      <form onSubmit={handleUpdate}>
        <div>
          <label htmlFor="username">Username</label>
          <input
            type="text"
            id="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
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
          />
        </div>

        <div>
          <label htmlFor="password">Password</label>
          <input
            type="password"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        <button type="submit">Update Profile</button>
      </form>
    </div>
  );
};

export default UpdateUserProfile;

