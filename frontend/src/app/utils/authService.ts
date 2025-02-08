import { auth } from './firebaseConfig'

import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
  signInWithPopup,
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  UserCredential
} from 'firebase/auth'

interface AuthResponse {
  success: boolean,
  message: string
}

export async function signUpWithEmail(email: string, password: string): Promise<AuthResponse> {
  try {
    const UserCredential: UserCredential = await createUserWithEmailAndPassword(auth, email, password)

    await sendEmailVerification(UserCredential.user, {
      url: "http://localhost:3000"
    })
    console.log("send")
    return { success: true, message: "Verification email send please check the inbox" }
  } catch (error: any) {
    return { success: false, message: error.message }
  }

}

export async function loginWithEmail(email: string, password: string): Promise<AuthResponse> {
  try {
    const userCredential: UserCredential = await signInWithEmailAndPassword(auth, email, password)
    if (!userCredential.user) {
      return { success: false, message: "user not found" }
    }
    return { success: true, message: "Login successful" }
  } catch (error: any) {
    return { success: false, message: error.message }
  }
}

export async function resendVerificationEmail(): Promise<AuthResponse> {
  if (auth.currentUser) {
    await sendEmailVerification(auth.currentUser)
    return { success: true, message: "Verification email send please check the inbox" }
  }

  return { success: false, message: "user not logged in" }
}

export async function loginWithGoogle(): Promise<AuthResponse> {
  try {
    const provider = new GoogleAuthProvider()
    const UserCredential = await signInWithPopup(auth, provider)
    if (!UserCredential) {
      return { success: false, message: "User does not exist" }
    }
    return { success: true, message: "Login successful" }
  } catch (error: any) {
    return { success: false, message: error.message }
  }
}
