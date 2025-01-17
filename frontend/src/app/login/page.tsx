import React from "react";
import LoginUser from "../components/LoginUser"; // Adjust path as needed
import { toast, ToastContainer } from 'react-toastify';  // Import ToastContainer

const LoginPage = () => {

  return (
    <div>
      <LoginUser />
      <ToastContainer />
    </div>
  )
};

export default LoginPage;
