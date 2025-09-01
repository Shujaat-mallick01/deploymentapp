import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import axios from 'axios'
import { toast } from 'sonner'
import { config } from '../config'

interface User {
  id: string
  email: string
  username: string
  role: string
}

interface AuthContextType {
  user: User | null
  token: string | null
  login: (email: string, password: string) => Promise<void>
  loginWithToken: (token: string) => Promise<void>
  register: (email: string, password: string, username?: string) => Promise<void>
  logout: () => void
  loading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}

interface AuthProviderProps {
  children: ReactNode
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'))
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
      verifyToken()
    } else {
      setLoading(false)
    }
  }, [token])

  const verifyToken = async () => {
    try {
      const response = await axios.get(`${config.apiUrl}/api/auth/verify`)
      setUser(response.data.user)
    } catch (error) {
      localStorage.removeItem('token')
      setToken(null)
      delete axios.defaults.headers.common['Authorization']
    } finally {
      setLoading(false)
    }
  }

  const login = async (email: string, password: string) => {
    try {
      const response = await axios.post(`${config.apiUrl}/api/auth/login`, { email, password })
      const { accessToken, user } = response.data
      
      localStorage.setItem('token', accessToken)
      setToken(accessToken)
      setUser(user)
      axios.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`
      
      toast.success('Login successful!')
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Login failed')
      throw error
    }
  }

  const register = async (email: string, password: string, username?: string) => {
    try {
      const response = await axios.post(`${config.apiUrl}/api/auth/register`, { email, password, username })
      const { accessToken, user } = response.data
      
      localStorage.setItem('token', accessToken)
      setToken(accessToken)
      setUser(user)
      axios.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`
      
      toast.success('Registration successful!')
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Registration failed')
      throw error
    }
  }

  const loginWithToken = async (accessToken: string) => {
    try {
      localStorage.setItem('token', accessToken)
      setToken(accessToken)
      axios.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`
      
      const response = await axios.get(`${config.apiUrl}/api/auth/verify`)
      setUser(response.data.user)
      
      toast.success('Login successful!')
    } catch (error: any) {
      localStorage.removeItem('token')
      setToken(null)
      delete axios.defaults.headers.common['Authorization']
      toast.error(error.response?.data?.error || 'Token validation failed')
      throw error
    }
  }

  const logout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('refreshToken')
    setToken(null)
    setUser(null)
    delete axios.defaults.headers.common['Authorization']
    toast.success('Logged out successfully')
  }

  return (
    <AuthContext.Provider value={{ user, token, login, loginWithToken, register, logout, loading }}>
      {children}
    </AuthContext.Provider>
  )
}