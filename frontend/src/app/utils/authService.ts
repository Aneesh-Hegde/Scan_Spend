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
interface GoogleAuthResponse {
  success: boolean,
  response: UserCredential | null
}

export async function signUpWithEmail(email: string, password: string, verifyToken:string): Promise<AuthResponse> {
  try {
    const UserCredential: UserCredential = await createUserWithEmailAndPassword(auth, email, password)

    await sendEmailVerification(UserCredential.user, {
      url: `http://localhost:3000/verify-email?token=${verifyToken}`
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

export async function loginWithGoogle(): Promise<GoogleAuthResponse> {
  try {
    const provider = new GoogleAuthProvider()
    const UserCredential = await signInWithPopup(auth, provider)
    if (!UserCredential) {
      return { success: false, response: null }
    }
    return { success: true, response: UserCredential }
  } catch (error: any) {
    return { success: false, response: error.message }
  }
}
