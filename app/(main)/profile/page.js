
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ProfileClient from '@/components/profile/ProfileClient'

export const metadata = {
  title: 'Profile | Event Platform',
  description: 'Manage your profile and account settings',
}

export default async function ProfilePage() {
  const supabase = createClient()

  const { data: { user }, error: userError } = await supabase.auth.getUser()

  if (userError || !user) {
    redirect('/auth')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('name, phone_number')
    .eq('id', user.id)
    .single()

  return (
    <ProfileClient 
      initialProfile={profile} 
      user={user} 
    />
  )
}