'use client'

import Link from 'next/link'
import GradientText from "@/components/GradientText";
import { Facebook, Twitter, Linkedin, Instagram, Mail } from 'lucide-react'
import { useAdminStatus } from '@/hooks/use-admin-status'
import LastWordGradientText from './LastWordGradientText';

export default function Footer() {
  const { user, isAdmin, loading: adminLoading } = useAdminStatus();

  // Show a loading/fallback footer if status is still loading
  if (adminLoading) {
    return (
        <footer className="bg-background text-white mt-20"> {/* CHANGED */}
            <div className="container mx-auto px-4 py-12">
                <div className="h-20 w-full bg-card rounded animate-pulse"></div> {/* CHANGED */}
            </div>
        </footer>
    )
  }

  return (
    <footer className="bg-background text-white mt-20 border-t border-border"> {/* CHANGED */}
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* About */}
          <div>
            <h3 className="font-bold text-lg mb-4"><GradientText>EventX</GradientText></h3> {/* CHANGED */}
            <p className="text-gray-400 text-sm">
              Your central hub for all college events. Discover, register, and manage
              hackathons, workshops, and more.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-bold text-lg mb-4"><LastWordGradientText>Quick Links</LastWordGradientText></h3>
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
              {/* CONDITIONAL RENDERING: Show Contact only if logged-in non-admin */}
              {user && !isAdmin && (
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
          {/* CONDITIONAL RENDERING: Show Contact Info only if logged-in non-admin */}
          {user && !isAdmin && (
            <div>
              <h3 className="font-bold text-lg mb-4">Contact</h3>
              <ul className="space-y-2 text-sm text-gray-400">
                <li className="flex items-center space-x-2">
                  <Mail size={16} />
                  <span>gsreddy1182006@gmail.com</span>
                </li>
                <li><GradientText>EventX</GradientText></li>
              </ul>
            </div>
          )}

          {/* Social Media */}
          <div>
            <h3 className="font-bold text-lg mb-4"><LastWordGradientText>Follow Us</LastWordGradientText></h3>
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
        <div className="border-t border-border mt-8 pt-8 text-center text-sm text-gray-400"> {/* CHANGED */}
          <p>&copy; {new Date().getFullYear()} EventX. All rights reserved.</p> {/* CHANGED */}
        </div>
      </div>
    </footer>
  )
}