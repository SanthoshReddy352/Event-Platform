'use client'

import { useParams } from 'next/navigation'
import FormBuilder from '@/components/FormBuilder'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function SubmissionFormBuilderPage() {
  const params = useParams()

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-6">
        <Link href={`/admin/events/${params.id}`}>
          <Button variant="ghost" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Submission Form Builder</CardTitle>
          <CardDescription>
            Design the form that participants will fill out to submit their final project.
            <br/>
            <span className="text-brand-red font-medium">Note:</span> This form will only be visible to participants during the "Submission Window" you configured.
          </CardDescription>
        </CardHeader>
        <CardContent>
            {/* We reuse the FormBuilder component but target the 'submission_form_fields' column */}
            <FormBuilder 
                eventId={params.id} 
                dbColumn="submission_form_fields"
            />
        </CardContent>
      </Card>
    </div>
  )
}