// components/Navbar.js
'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Menu, X, LogIn, LogOut, User, Building } from 'lucide-react'
import { useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/context/AuthContext' 

export default function Navbar() {
  const pathname = usePathname()
  const router = useRouter()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  
  // --- START OF FIX: Destructure isSuperAdmin ---
  const { user, isAdmin, isSuperAdmin } = useAuth() 
  // --- END OF FIX ---

  const isActive = (path) => pathname === path

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setMobileMenuOpen(false)
    router.push('/')
  }
  
  return (
    <nav className="bg-white border-b shadow-sm sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2">
            <div className="w-10 h-10 bg-[#00629B] rounded-full flex items-center justify-center">
              <span className="text-white font-bold text-lg">IEEE</span>
            </div>
            <span className="font-bold text-xl text-[#00629B] hidden sm:block">IEEE Club</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-6">
            <Link
              href="/"
              className={`transition-colors hover:text-[#00629B] ${
                isActive('/') ? 'text-[#00629B] font-semibold' : 'text-gray-600'
              }`}
            >
              Home
            </Link>
            <Link
              href="/events"
              className={`transition-colors hover:text-[#00629B] ${
                isActive('/events') ? 'text-[#0629B] font-semibold' : 'text-gray-600'
              }`}
            >
              Events
            </Link>
            
            {user && !isAdmin && (
                <Link
                  href="/contact"
                  className={`transition-colors hover:text-[#00629B] ${
                    isActive('/contact') ? 'text-[#00629B] font-semibold' : 'text-gray-600'
                  }`}
                >
                  Contact
                </Link>
            )}

            {user ? (
              <>
                {/* User is logged in */}
                <Link href="/profile">
                  <Button 
                    variant="ghost" 
                    className={`text-gray-600 hover:text-[#00629B] ${isActive('/profile') ? 'font-semibold' : ''}`}
                  >
                    <User size={16} className="mr-2" />
                    Profile
                  </Button>
                </Link>
                
                {/* --- START OF FIX: Show Club Profile only for regular admins --- */}
                {isAdmin && !isSuperAdmin && (
                    <Link href="/admin/club-profile">
                      <Button 
                        variant="ghost" 
                        className={`text-gray-600 hover:text-[#00629B] ${isActive('/admin/club-profile') ? 'font-semibold' : ''}`}
                      >
                        <Building size={16} className="mr-2" />
                        Club Profile
                      </Button>
                    </Link>
                )}
                {/* --- END OF FIX --- */}
                
                {isAdmin && (
                    <Link href="/admin">
                      <Button variant="ghost" className="text-gray-600 hover:text-[#00629B]">
                        Admin Portal
                      </Button>
                    </Link>
                )}
                
                <Button variant="default" onClick={handleLogout} className="bg-red-500 hover:bg-red-600">
                  <LogOut size={16} className="mr-2" />
                  Logout
                </Button>
              </>
            ) : (
              <>
                {/* User is logged out */}
                <Link href="/admin/login">
                  <Button variant="ghost" className="text-gray-600 hover:text-[#00629B]">
                    Admin Login
                  </Button>
                </Link>
                <Link href="/auth">
                  <Button variant="default" className="bg-[#00629B] hover:bg-[#004d7a]">
                    <LogIn size={16} className="mr-2" />
                    Login/Register
                  </Button>
                </Link>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 space-y-3">
            <Link
              href="/"
              className="block py-2 text-gray-600 hover:text-[#00629B]"
              onClick={() => setMobileMenuOpen(false)}
            >
              Home
            </Link>
            <Link
              href="/events"
              className="block py-2 text-gray-600 hover:text-[#00629B]"
              onClick={() => setMobileMenuOpen(false)}
            >
              Events
            </Link>
            
            {user && !isAdmin && (
                <Link
                  href="/contact"
                  className="block py-2 text-gray-600 hover:text-[#00629B]"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Contact
                </Link>
            )}

            {user ? (
              <>
                <Link
                  href="/profile"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block py-2 text-gray-600 hover:text-[#00629B]"
                >
                  Profile
                </Link>

                {/* --- START OF FIX: Show Club Profile only for regular admins --- */}
                {isAdmin && !isSuperAdmin && (
                    <Link
                      href="/admin/club-profile"
                      onClick={() => setMobileMenuOpen(false)}
                      className="block py-2 text-gray-600 hover:text-[#00629B]"
                    >
                      Club Profile
                    </Link>
                )}
                {/* --- END OF FIX --- */}
              
                {isAdmin && (
                    <Link
                      href="/admin"
                      onClick={() => setMobileMenuOpen(false)}
                      className="block py-2 text-gray-600 hover:text-[#00629B]"
                    >
                      Admin Portal
                    </Link>
                )}
                
                <Button 
                  onClick={handleLogout}
                  className="w-full bg-red-500 hover:bg-red-600"
                >
                  <LogOut size={16} className="mr-2" />
                  Logout
                </Button>
              </>
            ) : (
              <>
                <Link
                  href="/auth"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <Button className="w-full bg-[#00629B] hover:bg-[#004d7a]">
                    <LogIn size={16} className="mr-2" />
                    Login/Register
                  </Button>
                </Link>
                <Link
                  href="/admin/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block pt-2 text-sm text-center text-gray-500 hover:text-[#00629B]"
                >
                  Admin Login
                </Link>
              </>
            )}
          </div>
        )}
      </div>
    </nav>
  )
}