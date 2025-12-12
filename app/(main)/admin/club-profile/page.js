import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import LastWordGradientText from '@/components/LastWordGradientText'
import ClubProfileForm from '@/components/admin/ClubProfileForm'

export const metadata = {
  title: 'Club Profile & Payment | EventX',
  description: 'Manage your club identity and payment settings',
}

export default async function ClubProfilePage() {
  const supabase = createClient()
  
  // 1. Auth Check
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  // 2. Fetch Admin Profile
  const { data: adminProfile } = await supabase
    .from('admin_users')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle()
    
  // Check if admin (optional, as the Layout/Middleware might handle this, but safe to double check)
  // If no admin profile exists, they shouldn't be here or need to be initialized?
  // Existing logic implies if they are here, they are at least an admin-in-training or regular user?
  // But typically /admin is protected. Let's assume if they are here, they have access, 
  // or at least we let them create their profile if the logic supports it.
  
  return (
    <div className="container mx-auto px-4 py-12 max-w-3xl min-h-screen">
      <div className="mb-12">
        <h1 className="text-4xl font-bold mb-4">
          <LastWordGradientText>Club Profile</LastWordGradientText> & <LastWordGradientText>Payment Setup</LastWordGradientText>
        </h1>
        <p className="text-gray-400 text-lg">
           Manage how your club appears to students and where your event revenue goes.
        </p>
      </div>

      <ClubProfileForm user={user} initialData={adminProfile} />
    </div>
  )
}