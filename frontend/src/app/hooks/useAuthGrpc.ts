import { useState, useEffect } from 'react';
import { Metadata } from 'grpc-web';
import api from '../utils/api'; // Your axios instance

interface AuthState {
  token: string | null;
  refreshToken: string | null;
  authError: string | null;
  isAuthLoading: boolean;
  getAuthMetadata: () => Promise<Metadata | null>; // Function to get fresh metadata
}

const useAuthGrpc = (): AuthState => {
  const [token, setToken] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(true);

  const fetchAuthTokens = async () => {
    try {
      setIsAuthLoading(true);
      setAuthError(null);
      const response = await api.get("/get-refresh-token", { withCredentials: true });
      if (!response.data || !response.data.refresh_token) {
        throw new Error("Failed to retrieve refresh token");
      }
      const newRefreshToken = response.data.refresh_token;
      const storedToken = localStorage.getItem("token");
      if (!storedToken) {
        throw new Error("Authentication token not found in localStorage");
      }
      setRefreshToken(newRefreshToken);
      setToken(storedToken);
    } catch (err: any) {
      setAuthError("Authentication failed: " + err.message);
      console.error("Auth Error:", err);
    } finally {
      setIsAuthLoading(false);
    }
  };

  useEffect(() => {
    fetchAuthTokens();
  }, []);

  const getAuthMetadata = async (): Promise<Metadata | null> => {
    if (!token || !refreshToken) {
      // Re-fetch if tokens are missing (e.g., after a refresh)
      await fetchAuthTokens();
      if (!token || !refreshToken) { // Check again after re-fetch attempt
          setAuthError("Tokens not available after re-fetch.");
          return null;
      }
    }
    return { authentication: `Bearer ${token}`, refresh_token: refreshToken };
  };

  return { token, refreshToken, authError, isAuthLoading, getAuthMetadata };
};

export default useAuthGrpc;
