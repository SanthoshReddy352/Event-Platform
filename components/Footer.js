'use client'

import Link from 'next/link'
import { Facebook, Twitter, Linkedin, Instagram, Mail } from 'lucide-react'
import { useAdminStatus } from '@/hooks/use-admin-status'

export default function Footer() {
  const { isAdmin, loading: adminLoading } = useAdminStatus();

  // Show a loading/fallback footer if status is still loading
  if (adminLoading) {
    return (
        <footer className="bg-gray-900 text-white mt-20">
            <div className="container mx-auto px-4 py-12">
                <div className="h-20 w-full bg-gray-800 rounded animate-pulse"></div>
            </div>
        </footer>
    )
  }

  return (
    <footer className="bg-gray-900 text-white mt-20">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* About */}
          <div>
            <h3 className="font-bold text-lg mb-4">IEEE Club</h3>
            <p className="text-gray-400 text-sm">
              Advancing technology for humanity. Join us in organizing world-class hackathons and tech events.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-bold text-lg mb-4">Quick Links</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/" className="text-gray-400 hover:text-white transition-colors">
                  Home
                </Link>
              </li>
              <li>
                <Link href="/events" className="text-gray-400 hover:text-white transition-colors">
                  Events
                </Link>
              </li>
              {/* CONDITIONAL RENDERING: Hide Contact link if Admin */}
              {!isAdmin && (
                <li>
                  <Link href="/contact" className="text-gray-400 hover:text-white transition-colors">
                    Contact Us
                  </Link>
                </li>
              )}
              <li>
                <Link href="/admin" className="text-gray-400 hover:text-white transition-colors">
                  Admin Portal
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact Info */}
          {/* CONDITIONAL RENDERING: Hide Contact Info section if Admin */}
          {!isAdmin && (
            <div>
              <h3 className="font-bold text-lg mb-4">Contact</h3>
              <ul className="space-y-2 text-sm text-gray-400">
                <li className="flex items-center space-x-2">
                  <Mail size={16} />
                  <span>kareieeewiesba@gmail.com</span>
                </li>
                <li>KL University</li>
                <li>Vijayawada, Andhra Pradesh</li>
              </ul>
            </div>
          )}

          {/* Social Media */}
          <div>
            <h3 className="font-bold text-lg mb-4">Follow Us</h3>
            <div className="flex space-x-4">
              <a href="#" className="text-gray-400 hover:text-white transition-colors">
                <Facebook size={24} />
              </a>
              <a href="#" className="text-gray-400 hover:text-white transition-colors">
                <Twitter size={24} />
              </a>
              <a href="#" className="text-gray-400 hover:text-white transition-colors">
                <Linkedin size={24} />
              </a>
              <a href="#" className="text-gray-400 hover:text-white transition-colors">
                <Instagram size={24} />
              </a>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-gray-800 mt-8 pt-8 text-center text-sm text-gray-400">
          <p>&copy; {new Date().getFullYear()} IEEE Club. All rights reserved.</p>
        </div>
      </div>
    </footer>
  )
}