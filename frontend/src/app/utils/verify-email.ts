import { VerifyRequest, VerifyResponse } from '../grpc_schema/user_pb';
import client from './userClient';
import { toast } from 'react-toastify';
export default function EmailVerification(token: string | null) {
  if (token) {
    const request = new VerifyRequest()
    request.setToken(token)
    client.verifyUser(request, {}, (err: any, response: VerifyResponse) => {
      if (err) {
        console.log(err);
        toast.error("Cannot verify email.Please Register again.")
      } else {

        const isVerified: boolean = response.getValidation()
        if (isVerified) {
          console.log(true)
          toast.success("Verification successful")
        } else {
          console.log(err);
          toast.error("Email verification failed")
        }
      }
    })
  }
}
