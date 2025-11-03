'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Menu, X } from 'lucide-react'
import { useState } from 'react'

export default function Navbar() {
  const pathname = usePathname()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const isActive = (path) => pathname === path

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
                isActive('/events') ? 'text-[#00629B] font-semibold' : 'text-gray-600'
              }`}
            >
              Events
            </Link>
            <Link
              href="/contact"
              className={`transition-colors hover:text-[#00629B] ${
                isActive('/contact') ? 'text-[#00629B] font-semibold' : 'text-gray-600'
              }`}
            >
              Contact
            </Link>
            <Link href="/admin">
              <Button variant="default" className="bg-[#00629B] hover:bg-[#004d7a]">
                Admin
              </Button>
            </Link>
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
            <Link
              href="/contact"
              className="block py-2 text-gray-600 hover:text-[#00629B]"
              onClick={() => setMobileMenuOpen(false)}
            >
              Contact
            </Link>
            <Link
              href="/admin"
              onClick={() => setMobileMenuOpen(false)}
            >
              <Button className="w-full bg-[#00629B] hover:bg-[#004d7a]">
                Admin
              </Button>
            </Link>
          </div>
        )}
      </div>
    </nav>
  )
}
