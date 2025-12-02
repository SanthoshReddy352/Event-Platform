import { redirect } from 'next/navigation'

export default async function EventAdminPage({ params }) {
  const { id } = await params
  redirect(`/admin/events/${id}/dashboard`)
}