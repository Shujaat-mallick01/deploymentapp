import { useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { toast } from 'sonner'

const AuthCallback = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { loginWithToken } = useAuth()

  useEffect(() => {
    const handleCallback = async () => {
      const token = searchParams.get('token')
      const refreshToken = searchParams.get('refresh')
      const error = searchParams.get('error')

      if (error) {
        toast.error(`Authentication failed: ${error}`)
        navigate('/login')
        return
      }

      if (token && refreshToken) {
        try {
          localStorage.setItem('refreshToken', refreshToken)
          
          await loginWithToken(token)
          
          navigate('/dashboard')
        } catch (err) {
          console.error('Auth callback error:', err)
          navigate('/login')
        }
      } else {
        toast.error('Missing authentication tokens')
        navigate('/login')
      }
    }

    handleCallback()
  }, [searchParams, loginWithToken, navigate])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <h2 className="text-2xl font-semibold mb-2">Processing authentication...</h2>
        <p className="text-gray-600">Please wait while we log you in.</p>
      </div>
    </div>
  )
}

export default AuthCallback