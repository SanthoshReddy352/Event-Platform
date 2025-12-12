'use client'

import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { LogOut } from 'lucide-react'

export default function ClientLogoutButton() {
  const router = useRouter()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  return (
    <Button 
      onClick={handleLogout} 
      variant="outline" 
      data-testid="logout-button"
      className="border-gray-700 hover:bg-white/10 hover:text-white transition-colors"
    >
      <LogOut size={20} className="mr-2" />
      Logout
    </Button>
  )
}
