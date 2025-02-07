"use client"
import React from "react";
import UpdateUserProfile from '../components/UpdateUser'
import { ToastContainer } from 'react-toastify';  // Import ToastContainer
const UpdateUserUserPage = () => {
  return (
    <>
      <ToastContainer />
      <UpdateUserProfile />
    </>
  )
}
export default UpdateUserUserPage;
