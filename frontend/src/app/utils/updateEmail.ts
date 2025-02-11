import { updateEmail, reauthenticateWithCredential, EmailAuthProvider, sendEmailVerification, User } from "firebase/auth";
import { auth } from './firebaseConfig';
import { toast } from 'react-toastify';

export async function UpdateAndVerifyEmail(newEmail: string, password: string) {
  const currUser: User | null = auth.currentUser;

  if (!currUser || !currUser.email) {
    toast.error("No user is signed in.");
    return { success: false, message: "User not authenticated." };
  }

  try {
    const credential = EmailAuthProvider.credential(currUser.email!, password);
    await reauthenticateWithCredential(currUser, credential);

    await updateEmail(currUser, newEmail);
    toast.success("Email updated successfully!");

    await sendEmailVerification(currUser);
    toast.info("A verification email has been sent to your new email address. Please verify it.");

    return { success: true, message: "Email updated and verification sent." };

  } catch (error: any) {
    console.error("Error updating email:", error);
    toast.error(error.message);
    return { success: false, message: error.message };
  }
}

