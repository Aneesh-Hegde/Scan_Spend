"use client"
import React from "react";
import RegisterUser from '../components/RegisterUser'
import { ToastContainer } from "react-toastify";
const RegisterUserPage = () => {
  return (
    <>
      <ToastContainer />
      <RegisterUser />
    </>
  )
}
export default RegisterUserPage;
