// components/Navbar.js
'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Menu, X, LogIn, LogOut, User, Building, Ticket } from 'lucide-react' // Added Ticket icon
import { useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/context/AuthContext' 

export default function Navbar() {
  const pathname = usePathname()
  const router = useRouter() 
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  
  const { user, isAdmin, isSuperAdmin } = useAuth() 

  const isActive = (path) => pathname === path

  const handleLogout = async () => {
    setMobileMenuOpen(false); 
    try {
      const { error } = await supabase.auth.signOut();
      if (error && error.message !== "Session from session_id claim in JWT does not exist") {
        console.error('Error logging out:', error.message);
      }
    } catch (error) {
      console.error('Error in signOut process:', error);
    } finally {
      if (typeof window !== 'undefined' && window.localStorage) {
        const keysToRemove = [];
        for (let i = 0; i < window.localStorage.length; i++) {
          const key = window.localStorage.key(i);
          if (key && key.startsWith('sb-')) { 
            keysToRemove.push(key);
          }
        }
        keysToRemove.forEach(key => window.localStorage.removeItem(key));
      }
      
      router.replace('/');
      router.refresh();
    }
  }
  
  return (
    <nav className="bg-background border-b border-border shadow-sm sticky top-0 z-50"> 
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-20"> 
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2">
            <img src="/logo.jpg" alt="EventX Logo" className="h-14 w-auto" /> 
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-6">
            <Link
              href="/"
              className={`transition-colors hover:text-brand-orange ${ 
                isActive('/') ? 'text-brand-orange font-semibold' : 'text-gray-300'
              }`}
            >
              Home
            </Link>
            <Link
              href="/events"
              className={`transition-colors hover:text-brand-orange ${ 
                isActive('/events') ? 'text-brand-orange font-semibold' : 'text-gray-300'
              }`}
            >
              Events
            </Link>
            
            {user && !isAdmin && (
                <Link
                  href="/contact"
                  className={`transition-colors hover:text-brand-orange ${ 
                    isActive('/contact') ? 'text-brand-orange font-semibold' : 'text-gray-300'
                  }`}
                >
                  Contact
                </Link>
            )}

            {user ? (
              <>
                {/* User is logged in */}
                <Link href="/registered-events">
                  <Button 
                    variant="ghost" 
                    className={`text-gray-300 hover:text-brand-orange ${isActive('/registered-events') ? 'font-semibold' : ''}`}
                  >
                    <Ticket size={16} className="mr-2" />
                    My Events
                  </Button>
                </Link>

                <Link href="/profile">
                  <Button 
                    variant="ghost" 
                    className={`text-gray-300 hover:text-brand-orange ${isActive('/profile') ? 'font-semibold' : ''}`}
                  >
                    <User size={16} className="mr-2" />
                    Profile
                  </Button>
                </Link>
                
                {isAdmin && !isSuperAdmin && (
                    <Link href="/admin/club-profile">
                      <Button 
                        variant="ghost" 
                        className={`text-gray-300 hover:text-brand-orange ${isActive('/admin/club-profile') ? 'font-semibold' : ''}`}
                      >
                        <Building size={16} className="mr-2" />
                        Club Profile
                      </Button>
                    </Link>
                )}
                
                {isAdmin && (
                    <Link href="/admin">
                      <Button variant="ghost" className="text-gray-300 hover:text-brand-orange">
                        {isSuperAdmin ? 'Super Admin Portal' : 'Admin Portal'}
                      </Button>
                    </Link>
                )}
                
                <Button variant="destructive" onClick={handleLogout}>
                  <LogOut size={16} className="mr-2" />
                  Logout
                </Button>
              </>
            ) : (
              <>
                {/* User is logged out */}
                <Link href="/admin/login">
                  <Button variant="ghost" className="text-gray-300 hover:text-brand-orange">
                    Admin Login
                  </Button>
                </Link>
                <Link href="/auth">
                  <Button variant="default" className="bg-brand-gradient text-white font-semibold hover:opacity-90 transition-opacity">
                    <LogIn size={16} className="mr-2" />
                    Login/Register
                  </Button>
                </Link>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2 text-gray-300"
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
              className="block py-2 text-gray-300 hover:text-brand-orange"
              onClick={() => setMobileMenuOpen(false)}
            >
              Home
            </Link>
            <Link
              href="/events"
              className="block py-2 text-gray-300 hover:text-brand-orange"
              onClick={() => setMobileMenuOpen(false)}
            >
              Events
            </Link>
            
            {user && !isAdmin && (
                <Link
                  href="/contact"
                  className="block py-2 text-gray-300 hover:text-brand-orange"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Contact
                </Link>
            )}

            {user ? (
              <>
                <Link
                  href="/registered-events"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block py-2 text-gray-300 hover:text-brand-orange"
                >
                  My Events
                </Link>

                <Link
                  href="/profile"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block py-2 text-gray-300 hover:text-brand-orange"
                >
                  Profile
                </Link>

                {isAdmin && !isSuperAdmin && (
                    <Link
                      href="/admin/club-profile"
                      onClick={() => setMobileMenuOpen(false)}
                      className="block py-2 text-gray-300 hover:text-brand-orange"
                    >
                      Club Profile
                    </Link>
                )}
              
                {isAdmin && (
                    <Link
                      href="/admin"
                      onClick={() => setMobileMenuOpen(false)}
                      className="block py-2 text-gray-300 hover:text-brand-orange"
                    >
                      {isSuperAdmin ? 'Super Admin Portal' : 'Admin Portal'}
                    </Link>
                )}
                
                <Button 
                  onClick={handleLogout}
                  className="w-full bg-brand-red hover:bg-brand-red/90"
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
                  <Button className="w-full bg-brand-gradient text-white font-semibold hover:opacity-90 transition-opacity">
                    <LogIn size={16} className="mr-2" />
                    Login/Register
                  </Button>
                </Link>
                <Link
                  href="/admin/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block pt-2 text-sm text-center text-gray-500 hover:text-brand-orange"
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