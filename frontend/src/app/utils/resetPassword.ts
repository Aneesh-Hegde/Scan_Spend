import { auth } from "./firebaseConfig";
import { sendPasswordResetEmail } from "firebase/auth";

interface ResetPasswordResponse {
  message?: string;
  error?: string;
  status: number;
}

export async function ResetPassword(email: string): Promise<ResetPasswordResponse> {
  if (!email) {
    return { error: "Email is required", status: 400 };
  }

  try {
    await sendPasswordResetEmail(auth, email);
    console.log("Email sent successfully");
    return { message: "Password reset email sent!", status: 200 };
  } catch (error: any) {
    console.error("Error sending email:", error.message);
    return { error: error.message, status: 500 };
  }
}

