"use client"; import { useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import EmailVerification from '../utils/verify-email';
const VerifyEmail = () => {
  const VerifyEmailComponent = () => {

    const searchParams = useSearchParams()
    const router = useRouter()
    const token: string | null = searchParams.get("token")
    useEffect(() => {
      if (token) {
        EmailVerification(token)
        router.push('/')
      }

    }, [token, router])
    return (
      <div style={{ textAlign: "center", padding: "2rem" }}>
        <h2>Verify Your Email</h2>
        <p>We’ve sent you a verification email. Please check your inbox and click the link to verify your email.</p>
      </div>
    )
  }
  return (
    <Suspense>
      <VerifyEmailComponent />
    </Suspense>
  );
};

export default VerifyEmail;
