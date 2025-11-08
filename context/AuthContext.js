// context/AuthContext.js
'use client'

import { createContext, useContext } from 'react'
import { useAdminStatus } from '@/hooks/use-admin-status'

// Create the context
const AuthContext = createContext(null)

// Create the provider component
export function AuthProvider({ children }) {
  const auth = useAdminStatus()

  return (
    <AuthContext.Provider value={auth}>
      {/* FIX: We now ALWAYS render children.
        The child components (like ProtectedRoute) will 
        use the 'auth.loading' value to show their
        own loading spinners, without unmounting the whole layout.
      */}
      {children}
    </AuthContext.Provider>
  )
}

// Create a hook to use the context
export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}