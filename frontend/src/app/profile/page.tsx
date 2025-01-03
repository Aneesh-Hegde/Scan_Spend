"use client"
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import api from '../utils/api';

export default function Profile() {
  const [profile, setProfile] = useState<{ user_id: string; profile: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      const token = localStorage.getItem('authToken');
      if (!token) {
        toast.error('Please log in first.');
        setLoading(false);
        return;
      }

      try {
        const response = await api.get('/profile', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        setProfile(response.data);
      } catch (error: any) {
        toast.error(error.response?.data?.message || 'Failed to fetch profile');
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  if (loading) return <p>Loading...</p>;
  if (!profile) return <p>No profile data available</p>;

  return (
    <div>
      <h1>User Profile</h1>
      <p>User ID: {profile.user_id}</p>
      <p>Profile: {profile.profile}</p>
    </div>
  );
}
