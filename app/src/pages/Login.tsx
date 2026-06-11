import { SignIn } from '@clerk/clerk-react'

export default function Login() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#f5f5f5',
    }}>
      <SignIn routing="path" path="/sign-in" />
    </div>
  )
}
